import { FailedGenerationDraftSchema, SourceSelectionSchema } from '@/type/generation';
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

export const ForumThreadVersionSchema = ContentVersionBaseSchema.extend({
  author: z.string(),
});
export type ForumThreadVersion = z.infer<typeof ForumThreadVersionSchema>;

export const ForumThreadSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  title: z.string(),
  author: z.string(),
  content: z.string(),
  favorite: z.boolean().default(false),
  replies: z.array(ForumReplySchema).default([]),
  activeVersionId: z.string().default(''),
  versions: z.array(ForumThreadVersionSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ForumThread = z.infer<typeof ForumThreadSchema>;

export const ForumBoardSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Legacy field kept so existing saved boards can migrate their former type prompt. */
  description: z.string().optional(),
  typeId: z.string().default(''),
  typeName: z.string().default(''),
  typePrompt: z.string().default(''),
  threads: z.array(ForumThreadSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ForumBoard = z.infer<typeof ForumBoardSchema>;

export function resolveForumBoardTypePrompt(board: Pick<ForumBoard, 'description' | 'typePrompt'>) {
  return board.typePrompt.trim() || board.description?.trim() || '';
}

export function resolveForumBoardTypeName(board: Pick<ForumBoard, 'typeName'>) {
  return board.typeName.trim() || '自定义';
}

export const ForumScopeDataSchema = z.object({
  boards: z.array(ForumBoardSchema).default([]),
  failedDrafts: z.array(FailedGenerationDraftSchema).default([]),
});
export type ForumScopeData = z.infer<typeof ForumScopeDataSchema>;
