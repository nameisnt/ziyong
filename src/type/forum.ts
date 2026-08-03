import { FailedGenerationDraftSchema, GenerationReplaySnapshotSchema, SourceSelectionSchema } from '@/type/generation';
import { ContentVersionBaseSchema } from '@/type/contentVersion';

export const ForumReplySchema = z.object({
  id: z.string(),
  author: z.string(),
  content: z.string(),
  parentReplyId: z.string().optional(),
  source: SourceSelectionSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ForumReply = z.infer<typeof ForumReplySchema>;

const ForumThreadVersionPersistedSchema = ContentVersionBaseSchema.extend({
  author: z.string(),
  generationReplay: GenerationReplaySnapshotSchema.optional(),
  replies: z.array(ForumReplySchema).optional(),
});
export const ForumThreadVersionSchema = ForumThreadVersionPersistedSchema.extend({
  replies: z.array(ForumReplySchema).default([]),
});
export type ForumThreadVersion = z.infer<typeof ForumThreadVersionSchema>;

const ForumThreadPersistedSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  title: z.string(),
  author: z.string(),
  content: z.string(),
  favorite: z.boolean().default(false),
  replies: z.array(ForumReplySchema).default([]),
  activeVersionId: z.string().default(''),
  generationReplay: GenerationReplaySnapshotSchema.optional(),
  versions: z.array(ForumThreadVersionPersistedSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const ForumThreadSchema = ForumThreadPersistedSchema.transform(thread => ({
  ...thread,
  versions: thread.versions.map(version => ({
    ...version,
    replies: (version.replies || thread.replies).map(reply => ({ ...reply })),
  })),
}));
export type ForumThread = z.infer<typeof ForumThreadSchema>;

const ForumBoardPersistedSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  typeId: z.string().default(''),
  typeName: z.string().default(''),
  typePrompt: z.string().default(''),
  threads: z.array(ForumThreadSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const ForumBoardSchema = ForumBoardPersistedSchema.transform(({ description, ...board }) => ({
  ...board,
  typeName: board.typeName.trim() || (board.typePrompt.trim() || description?.trim() ? '自定义' : ''),
  typePrompt: board.typePrompt.trim() || description?.trim() || '',
}));
export type ForumBoard = z.infer<typeof ForumBoardSchema>;

export function resolveForumBoardTypePrompt(board: Pick<ForumBoard, 'typePrompt'>) {
  return board.typePrompt.trim();
}

export function resolveForumBoardTypeName(board: Pick<ForumBoard, 'typeName'>) {
  return board.typeName.trim() || '自定义';
}

export const ForumScopeDataSchema = z.object({
  boards: z.array(ForumBoardSchema).default([]),
  failedDrafts: z.array(FailedGenerationDraftSchema).default([]),
});
export type ForumScopeData = z.infer<typeof ForumScopeDataSchema>;
