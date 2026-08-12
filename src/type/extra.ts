import { FailedGenerationDraftSchema, GenerationReplaySnapshotSchema } from '@/type/generation';
import { GenerationSourceModeSchema } from '@/type/settings';
import { ContentVersionBaseSchema } from '@/type/contentVersion';

export const ExtraChapterGenerationReferenceSchema = z.object({
  content: z.string(),
  id: z.string(),
  sourcePath: z.array(z.string()).default([]),
  timeLabel: z.string().optional(),
  title: z.string(),
  updatedAt: z.string().optional(),
});
export type ExtraChapterGenerationReference = z.infer<typeof ExtraChapterGenerationReferenceSchema>;

export const ExtraChapterGenerationRecordSchema = z.object({
  id: z.string(),
  chapterMode: z.enum(['续写上一章', '新开一本书', '重写当前章节']),
  generationIntent: z.enum(['续写上一章', '新开一本书']).optional(),
  createdAt: z.string(),
  fromStartEnd: z.number().int().nonnegative().default(20),
  rangeText: z.string().default(''),
  recentCount: z.number().int().positive().default(20),
  references: z.array(ExtraChapterGenerationReferenceSchema).default([]),
  singleMessageId: z.number().int().nonnegative().default(0),
  sourceLabel: z.string().default(''),
  sourceMessageIds: z.array(z.number().int().nonnegative()).default([]),
  sourceMode: GenerationSourceModeSchema.default('latest'),
  tavernPresetName: z.string().default(''),
  typeId: z.string().default(''),
  typeName: z.string().default(''),
  typePrompt: z.string().default(''),
  userRequirement: z.string().default(''),
  parseSummary: z.boolean().optional(),
  removeSummaryBlock: z.boolean().optional(),
  summaryFormatHint: z.string().optional(),
  summaryRuleFlags: z.string().optional(),
  summaryRuleId: z.string().optional(),
  summaryRuleName: z.string().optional(),
  summaryRulePattern: z.string().optional(),
  summaryRuleReplacement: z.string().optional(),
  replay: GenerationReplaySnapshotSchema.optional(),
});
export type ExtraChapterGenerationRecord = z.infer<typeof ExtraChapterGenerationRecordSchema>;

export const ExtraChapterVersionSchema = ContentVersionBaseSchema.extend({
  generationRecord: ExtraChapterGenerationRecordSchema.optional(),
});
export type ExtraChapterVersion = z.infer<typeof ExtraChapterVersionSchema>;

export const ExtraChapterSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  favorite: z.boolean().default(false),
  chapterNumber: z.number().int().positive(),
  activeVersionId: z.string().default(''),
  versions: z.array(ExtraChapterVersionSchema).default([]),
  generationRecords: z.array(ExtraChapterGenerationRecordSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ExtraChapter = z.infer<typeof ExtraChapterSchema>;

export const ExtraSummarySchema = z.object({
  id: z.string(),
  content: z.string(),
  coveredChapterIds: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
  autoChapterId: z.string().default(''),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ExtraSummary = z.infer<typeof ExtraSummarySchema>;

export const ExtraBookSchema = z.object({
  id: z.string(),
  typeId: z.string().optional(),
  typeName: z.string(),
  title: z.string(),
  outline: z.string().optional(),
  chapters: z.array(ExtraChapterSchema).default([]),
  summaries: z.array(ExtraSummarySchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ExtraBook = z.infer<typeof ExtraBookSchema>;

export const ExtraScopeDataSchema = z.object({
  books: z.array(ExtraBookSchema).default([]),
  failedDrafts: z.array(FailedGenerationDraftSchema).default([]),
});
export type ExtraScopeData = z.infer<typeof ExtraScopeDataSchema>;
