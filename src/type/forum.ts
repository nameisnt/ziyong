import { FailedGenerationDraftSchema, SourceSelectionSchema } from '@/type/generation';

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

export const ForumThreadSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  title: z.string(),
  author: z.string(),
  content: z.string(),
  favorite: z.boolean().default(false),
  replies: z.array(ForumReplySchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ForumThread = z.infer<typeof ForumThreadSchema>;

export const ForumBoardSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  threads: z.array(ForumThreadSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ForumBoard = z.infer<typeof ForumBoardSchema>;

export const ForumScopeDataSchema = z.object({
  boards: z.array(ForumBoardSchema).default([]),
  failedDrafts: z.array(FailedGenerationDraftSchema).default([]),
});
export type ForumScopeData = z.infer<typeof ForumScopeDataSchema>;
