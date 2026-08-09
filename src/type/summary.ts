import { FailedGenerationDraftSchema } from '@/type/generation';

export const SummaryEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  rangeLabel: z.string(),
  favorite: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
  directoryOrder: z.number().int().nonnegative().optional(),
  sourceFloorEnd: z.number().int().nonnegative().optional(),
});
export type SummaryEntry = z.infer<typeof SummaryEntrySchema>;

export const SummaryBookSchema = z.object({
  id: z.string(),
  title: z.string(),
  entries: z.array(SummaryEntrySchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SummaryBook = z.infer<typeof SummaryBookSchema>;

export const SummaryScopeDataSchema = z.object({
  books: z.array(SummaryBookSchema).default([]),
  failedDrafts: z.array(FailedGenerationDraftSchema).default([]),
});
export type SummaryScopeData = z.infer<typeof SummaryScopeDataSchema>;
