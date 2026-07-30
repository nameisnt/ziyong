import {
  ForumRepliesXmlResultSchema,
  ForumXmlResultSchema,
  type GenerationAdapter,
  GenerationRequestPartsSchema,
  type ForumRepliesXmlResult,
  type ForumXmlReply,
  type ForumXmlResult,
  type SourceSelection,
} from '@/type/generation';
import type { ForumBoard, ForumReply, ForumThread } from '@/type/forum';
import { parseForumRepliesXmlResult, parseForumXmlResult } from '@/util/generation';
import { parseConfiguredOutput } from '@/util/outputParsing';
import { parsePrettified } from '@/util/zod';

type ForumReplyDraftInput = Pick<ForumReply, 'author' | 'content'> & Partial<Pick<ForumReply, 'source'>>;

export const ForumThreadGenerateConfigSchema = z.object({
  appPrompt: z.string(),
  boardDescription: z.string().default(''),
  boardId: z.string().default(''),
  boardName: z.string().default(''),
  outputFormat: z.string(),
  userRequirement: z.string().default(''),
});
export type ForumThreadGenerateConfig = z.infer<typeof ForumThreadGenerateConfigSchema>;

export const ForumReplyGenerateConfigSchema = z.object({
  appPrompt: z.string(),
  boardId: z.string(),
  outputFormat: z.string(),
  threadContext: z.string(),
  threadId: z.string(),
  userRequirement: z.string().default(''),
});
export type ForumReplyGenerateConfig = z.infer<typeof ForumReplyGenerateConfigSchema>;

export function materializeForumReplies(
  _existingReplies: ForumReply[],
  parsedReplies: ForumXmlReply[],
  source?: SourceSelection,
) {
  const warnings: string[] = [];
  const createdInputs: ForumReplyDraftInput[] = [];

  parsedReplies.forEach(reply => {
    createdInputs.push({
      author: reply.author.trim() || '匿名',
      content: reply.content.trim(),
      source,
    });
  });

  return {
    replies: createdInputs,
    warnings,
  };
}

export function persistForumReplyDrafts(
  createReply: (boardId: string, threadId: string, input: ForumReplyDraftInput) => ForumReply | null,
  boardId: string,
  threadId: string,
  replyInputs: ForumReplyDraftInput[],
) {
  const createdReplies: ForumReply[] = [];

  replyInputs.forEach(reply => {
    const created = createReply(boardId, threadId, {
      author: reply.author,
      content: reply.content,
      source: reply.source,
    });
    if (created) createdReplies.push(created);
  });

  return createdReplies;
}

function buildThreadRequestContext(config: ForumThreadGenerateConfig) {
  return config.boardDescription.trim() ? `板块说明：${config.boardDescription.trim()}` : '';
}

function buildThreadTaskInstruction(config: ForumThreadGenerateConfig) {
  const boardName = config.boardName.trim();
  if (boardName) {
    return `请为“${boardName}”板块生成一篇新帖，并在 <board> 中原样输出板块名称“${boardName}”。`;
  }
  return '请生成一篇新的论坛帖子，根据帖子主题拟定一个简短、自然、明确的论坛板块名称，并写入 <board>。';
}

export function createForumThreadGenerationAdapter(forumStore: {
  createThread: (
    boardId: string,
    input: Pick<ForumThread, 'title' | 'author' | 'content'>,
  ) => { board: ForumBoard; thread: ForumThread } | null;
  createReply: (boardId: string, threadId: string, input: ForumReplyDraftInput) => ForumReply | null;
  ensureBoard: (name: string, description?: string) => ForumBoard;
  getBoard: (boardId: string) => ForumBoard | null;
}) {
  return {
    actionId: 'generate-thread',
    appId: 'forum',
    buildRequest(config) {
      return parsePrettified(GenerationRequestPartsSchema, {
        appPrompt: config.appPrompt,
        context: buildThreadRequestContext(config),
        outputFormat: config.outputFormat,
        taskInstruction: buildThreadTaskInstruction(config),
        userRequirement: config.userRequirement,
      });
    },
    configSchema: ForumThreadGenerateConfigSchema,
    parse(raw) {
      return parseConfiguredOutput('forum.thread', raw, ForumXmlResultSchema, () => parseForumXmlResult(raw));
    },
    async save(result, context) {
      const targetBoardName = context.config.boardName.trim() || result.board.trim();
      const board = context.config.boardId
        ? forumStore.getBoard(context.config.boardId) ||
          forumStore.ensureBoard(targetBoardName, context.config.boardDescription)
        : forumStore.ensureBoard(targetBoardName, context.config.boardDescription);
      const created = forumStore.createThread(board.id, {
        author: result.author,
        content: result.content,
        title: result.title,
      });
      if (!created) {
        throw new Error('目标板块不存在，无法保存论坛帖子');
      }
      const materialized = materializeForumReplies([], result.replies, context.source);
      const createdReplies = persistForumReplyDrafts(
        forumStore.createReply,
        board.id,
        created.thread.id,
        materialized.replies,
      );

      return {
        board,
        conversionWarnings: materialized.warnings,
        entityId: created.thread.id,
        replies: createdReplies,
        thread: created.thread,
      };
    },
  } satisfies GenerationAdapter<
    ForumThreadGenerateConfig,
    ForumXmlResult,
    { board: ForumBoard; conversionWarnings: string[]; entityId: string; replies: ForumReply[]; thread: ForumThread }
  >;
}

export function createForumReplyGenerationAdapter(forumStore: {
  createReply: (boardId: string, threadId: string, input: ForumReplyDraftInput) => ForumReply | null;
  getThread: (boardId: string, threadId: string) => ForumThread | null;
}) {
  return {
    actionId: 'generate-replies',
    appId: 'forum',
    buildRequest(config) {
      return parsePrettified(GenerationRequestPartsSchema, {
        appPrompt: config.appPrompt,
        context: config.threadContext,
        outputFormat: config.outputFormat,
        taskInstruction: '请根据上述主楼和已有回复继续生成新的论坛回复，不要重写主楼或重复已有回复。',
        userRequirement: config.userRequirement,
      });
    },
    configSchema: ForumReplyGenerateConfigSchema,
    parse(raw) {
      return parseConfiguredOutput('forum.replies', raw, ForumRepliesXmlResultSchema, () =>
        parseForumRepliesXmlResult(raw),
      );
    },
    async save(result, context) {
      const thread = forumStore.getThread(context.config.boardId, context.config.threadId);
      if (!thread) {
        throw new Error('目标帖子不存在，无法保存论坛回复');
      }

      const materialized = materializeForumReplies(thread.replies, result.replies, context.source);
      const createdReplies = persistForumReplyDrafts(
        forumStore.createReply,
        context.config.boardId,
        context.config.threadId,
        materialized.replies,
      );

      return {
        conversionWarnings: materialized.warnings,
        createdReplies,
        entityId: createdReplies[0]?.id || context.config.threadId,
      };
    },
  } satisfies GenerationAdapter<
    ForumReplyGenerateConfig,
    ForumRepliesXmlResult,
    { conversionWarnings: string[]; createdReplies: ForumReply[]; entityId: string }
  >;
}
