import { ContentVersionBaseSchema } from '@/type/contentVersion';
import { FailedGenerationDraftSchema, HiddenGenerationRecordSchema } from '@/type/generation';

export const CharacterRefSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
});
export type CharacterRef = z.infer<typeof CharacterRefSchema>;

export const DiaryEntryVersionSchema = ContentVersionBaseSchema.extend({
  generationRecord: HiddenGenerationRecordSchema.optional(),
});
export type DiaryEntryVersion = z.infer<typeof DiaryEntryVersionSchema>;

export const DiaryEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  activeVersionId: z.string().default(''),
  versions: z.array(DiaryEntryVersionSchema).default([]),
  favorite: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
  perspective: CharacterRefSchema,
  occurredAt: z.string().optional(),
  kind: z.enum(['normal', 'read-reaction']).default('normal'),
  readers: z.array(CharacterRefSchema).optional(),
  directoryOrder: z.number().int().nonnegative().optional(),
  sourceFloorEnd: z.number().int().nonnegative().optional(),
  generationRecord: HiddenGenerationRecordSchema.optional(),
});
export type DiaryEntry = z.infer<typeof DiaryEntrySchema>;

export const DiaryBookSchema = z.object({
  id: z.string(),
  perspective: CharacterRefSchema,
  title: z.string(),
  entries: z.array(DiaryEntrySchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DiaryBook = z.infer<typeof DiaryBookSchema>;

export const DiaryScopeDataSchema = z.object({
  books: z.array(DiaryBookSchema).default([]),
  failedDrafts: z.array(FailedGenerationDraftSchema).default([]),
});
export type DiaryScopeData = z.infer<typeof DiaryScopeDataSchema>;
