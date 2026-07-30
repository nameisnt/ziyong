import { CharacterRefSchema } from '@/type/diary';
import { FailedGenerationDraftSchema } from '@/type/generation';

export const TheaterRenderModeSchema = z.enum(['markdown', 'frontend']);
export type TheaterRenderMode = z.infer<typeof TheaterRenderModeSchema>;

export const TheaterEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  favorite: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
  typeId: z.string().optional(),
  typeName: z.string(),
  participants: z.array(CharacterRefSchema).default([]),
  renderMode: TheaterRenderModeSchema.default('markdown'),
});
export type TheaterEntry = z.infer<typeof TheaterEntrySchema>;

export const TheaterScopeDataSchema = z.object({
  entries: z.array(TheaterEntrySchema).default([]),
  failedDrafts: z.array(FailedGenerationDraftSchema).default([]),
});
export type TheaterScopeData = z.infer<typeof TheaterScopeDataSchema>;
