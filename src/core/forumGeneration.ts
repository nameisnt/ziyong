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
  boardTypePrompt: z.string().default(''),
  boardId: z.string().default(''),
  boardName: z.string().default(''),
  boardTypeId: z.string().default(''),
  boardTypeName: z.string().default(''),
  existingThreadContent: z.string().default(''),
  mode: z.enum(['create', 'rewrite']).default('create'),
  outputFormat: z.string(),
  threadId: z.string().default(''),
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
  versionId: z.string().default(''),
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

export function createForumReplySnapshots(parsedReplies: ForumXmlReply[], source?: SourceSelection) {
  const timestamp = new Date().toISOString();
  return parsedReplies.map((reply, index): ForumReply => ({
    author: reply.author.trim() || '匿名',
    content: reply.content.trim(),
    createdAt: timestamp,
    id: `forum_reply_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`,
    source,
    updatedAt: timestamp,
  }));
}

export function persistForumReplyDrafts(
  createReply: (
    boardId: string,
    threadId: string,
    input: ForumReplyDraftInput,
    versionId?: string,
  ) => ForumReply | null,
  boardId: string,
  threadId: string,
  replyInputs: ForumReplyDraftInput[],
  versionId = '',
) {
  const createdReplies: ForumReply[] = [];

  replyInputs.forEach(reply => {
    const created = createReply(
      boardId,
      threadId,
      {
        author: reply.author,
        content: reply.content,
        source: reply.source,
      },
      versionId,
    );
    if (created) createdReplies.push(created);
  });

  return createdReplies;
}

function buildThreadRequestContext(config: ForumThreadGenerateConfig) {
  return [config.boardTypePrompt.trim() ? `板块类型提示词：${config.boardTypePrompt.trim()}` : '']
    .filter(Boolean)
    .join('\n\n');
}

function buildThreadTaskInstruction(config: ForumThreadGenerateConfig) {
  const boardName = config.boardName.trim();
  if (config.mode === 'rewrite') {
    return `请根据相同来源重新生成一篇完整论坛主题及其回复，并在 <board> 中原样输出板块名称“${boardName}”。不要参考或复述旧版本。`;
  }
  if (boardName) {
    return `请为“${boardName}”板块生成一篇新帖，并在 <board> 中原样输出板块名称“${boardName}”。`;
  }
  return '请生成一篇新的论坛帖子，根据帖子主题拟定一个简短、自然、明确的论坛板块名称，并写入 <board>。';
}

export function createForumThreadGenerationAdapter(forumStore: {
  createThread: (
    boardId: string,
    input: Pick<ForumThread, 'title' | 'author' | 'content'> &
      Partial<Pick<ForumThread, 'generationReplay' | 'replies'>>,
  ) => { board: ForumBoard; thread: ForumThread } | null;
  createReply: (boardId: string, threadId: string, input: ForumReplyDraftInput) => ForumReply | null;
  ensureBoard: (
    name: string,
    typePrompt?: string,
    type?: Partial<Pick<ForumBoard, 'typeId' | 'typeName'>>,
  ) => ForumBoard;
  getBoard: (boardId: string) => ForumBoard | null;
  appendThreadVersion: (
    boardId: string,
    threadId: string,
    input: Pick<ForumThread, 'title' | 'author' | 'content' | 'replies'> &
      Partial<Pick<ForumThread, 'generationReplay'>>,
  ) => { board: ForumBoard; thread: ForumThread; version: { id: string } } | null;
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
      if (context.config.mode === 'rewrite' && context.config.boardId && context.config.threadId) {
        const replies = createForumReplySnapshots(result.replies, context.source);
        const saved = forumStore.appendThreadVersion(context.config.boardId, context.config.threadId, {
          author: result.author,
          content: result.content,
          generationReplay: context.replay,
          replies,
          title: result.title,
        });
        if (!saved) throw new Error('目标论坛主帖不存在，无法保存重写版本');
        return {
          board: saved.board,
          conversionWarnings: [],
          entityId: saved.thread.id,
          replies: [],
          thread: saved.thread,
          versionId: saved.version.id,
        };
      }
      const targetBoardName = context.config.boardName.trim() || result.board.trim();
      const boardType = {
        typeId: context.config.boardTypeId,
        typeName: context.config.boardTypeName,
      };
      const board = context.config.boardId
        ? forumStore.getBoard(context.config.boardId) ||
          forumStore.ensureBoard(targetBoardName, context.config.boardTypePrompt, boardType)
        : forumStore.ensureBoard(targetBoardName, context.config.boardTypePrompt, boardType);
      const created = forumStore.createThread(board.id, {
        author: result.author,
        content: result.content,
        generationReplay: context.replay,
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
        versionId: undefined,
      };
    },
  } satisfies GenerationAdapter<
    ForumThreadGenerateConfig,
    ForumXmlResult,
    {
      board: ForumBoard;
      conversionWarnings: string[];
      entityId: string;
      replies: ForumReply[];
      thread: ForumThread;
      versionId?: string;
    }
  >;
}

export function createForumReplyGenerationAdapter(forumStore: {
  createReply: (
    boardId: string,
    threadId: string,
    input: ForumReplyDraftInput,
    versionId?: string,
  ) => ForumReply | null;
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

      const targetReplies =
        thread.versions.find(version => version.id === context.config.versionId)?.replies || thread.replies;
      const materialized = materializeForumReplies(targetReplies, result.replies, context.source);
      const createdReplies = persistForumReplyDrafts(
        forumStore.createReply,
        context.config.boardId,
        context.config.threadId,
        materialized.replies,
        context.config.versionId,
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
