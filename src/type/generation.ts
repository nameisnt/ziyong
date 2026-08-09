export const GenerationRangeSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
});
export type GenerationRange = z.infer<typeof GenerationRangeSchema>;

export const SourceSelectionSchema = z.object({
  scopeId: z.string(),
  chatIdAtGeneration: z.string(),
  mode: z.enum(['none', 'latest', 'fromStart', 'all', 'single', 'recent', 'range']),
  ranges: z.array(GenerationRangeSchema).default([]),
  messageIds: z.array(z.number().int().nonnegative()).default([]),
  label: z.string(),
  sortKey: z.number().int().nonnegative(),
});
export type SourceSelection = z.infer<typeof SourceSelectionSchema>;

export const GenerationRequestPartsSchema = z.object({
  context: z.string().optional(),
  references: z.string().optional(),
  taskInstruction: z.string().optional(),
  appPrompt: z.string().optional(),
  typePrompt: z.string().optional(),
  userRequirement: z.string().optional(),
  outputFormat: z.string(),
});
export type GenerationRequestParts = z.infer<typeof GenerationRequestPartsSchema>;

export const GenerationReplayReferenceSchema = z.object({
  content: z.string(),
  id: z.string(),
  sourcePath: z.array(z.string()).default([]),
  timeLabel: z.string().optional(),
  title: z.string(),
  updatedAt: z.string().optional(),
});

export const GenerationReplaySnapshotSchema = z.object({
  config: z.record(z.string(), z.unknown()).default({}),
  connectionSelection: z
    .string()
    .refine(value => value === 'inherit' || value === 'tavern' || value.startsWith('external:'))
    .default('inherit'),
  references: z.array(GenerationReplayReferenceSchema).default([]),
  request: GenerationRequestPartsSchema,
  source: SourceSelectionSchema,
  sourceInput: z
    .object({
      fromStartEnd: z.number().int().nonnegative().optional(),
      rangeText: z.string().optional(),
      recentCount: z.number().int().positive().optional(),
      singleMessageId: z.number().int().nonnegative().optional(),
    })
    .optional(),
  tavernPresetName: z.string().default(''),
});
export type GenerationReplaySnapshot = z.infer<typeof GenerationReplaySnapshotSchema>;

export const HiddenGenerationRecordSchema = z.object({
  id: z.string(),
  actionId: z.string(),
  createdAt: z.string(),
  replay: GenerationReplaySnapshotSchema,
});
export type HiddenGenerationRecord = z.infer<typeof HiddenGenerationRecordSchema>;

export type GenerationAdapter<TConfig, TResult, TSaveResult = { entityId: string }> = {
  actionId: string;
  appId: string;
  buildRequest: (config: TConfig) => GenerationRequestParts;
  configSchema: z.ZodType<TConfig>;
  parse: (raw: string, config: TConfig) => XmlParseResult<TResult>;
  save: (result: TResult, context: GenerationSaveContext<TConfig>) => Promise<TSaveResult> | TSaveResult;
};

export type GenerationSaveContext<TConfig = unknown> = {
  config: TConfig;
  generationRecord: HiddenGenerationRecord;
  rawOutput: string;
  replay: GenerationReplaySnapshot;
  scopeId: string;
  source: SourceSelection;
  warnings: string[];
};

export const FailedGenerationDraftSchema = z.object({
  id: z.string(),
  appId: z.string(),
  actionId: z.string(),
  context: z.record(z.string(), z.unknown()).default({}),
  generationRecord: HiddenGenerationRecordSchema.optional(),
  rawOutput: z.string(),
  warnings: z.array(z.string()).default([]),
  createdAt: z.string(),
  source: SourceSelectionSchema,
});
export type FailedGenerationDraft = z.infer<typeof FailedGenerationDraftSchema>;

export const ContentXmlResultSchema = z.object({
  content: z.string(),
});
export type ContentXmlResult = z.infer<typeof ContentXmlResultSchema>;

export const SimpleXmlResultSchema = z.object({
  title: z.string(),
  content: z.string(),
});
export type SimpleXmlResult = z.infer<typeof SimpleXmlResultSchema>;

export const ForumXmlReplySchema = z.object({
  author: z.string(),
  content: z.string(),
});
export type ForumXmlReply = z.infer<typeof ForumXmlReplySchema>;

export const ForumXmlResultSchema = z.object({
  board: z.string().min(1),
  title: z.string(),
  author: z.string(),
  content: z.string(),
  replies: z.array(ForumXmlReplySchema).default([]),
});
export type ForumXmlResult = z.infer<typeof ForumXmlResultSchema>;

export const ForumRepliesXmlResultSchema = z.object({
  replies: z.array(ForumXmlReplySchema).default([]),
});
export type ForumRepliesXmlResult = z.infer<typeof ForumRepliesXmlResultSchema>;

export type XmlParseSuccess<T> = {
  data: T;
  ok: true;
  raw: string;
  warnings: string[];
};

export type XmlParseFailure = {
  ok: false;
  raw: string;
  warnings: string[];
};

export type XmlParseResult<T> = XmlParseSuccess<T> | XmlParseFailure;

export type GenerationExecutionFailure = {
  draft: FailedGenerationDraft;
  rawOutput: string;
  source: SourceSelection;
  status: 'failed';
  warnings: string[];
};

export type GenerationExecutionPreview<TResult> = {
  data: TResult;
  generationRecord: HiddenGenerationRecord;
  rawOutput: string;
  replay: GenerationReplaySnapshot;
  source: SourceSelection;
  status: 'preview';
  warnings: string[];
};

export type GenerationExecutionSaved<TResult, TSaveResult> = {
  data: TResult;
  generationRecord: HiddenGenerationRecord;
  rawOutput: string;
  replay: GenerationReplaySnapshot;
  saved: TSaveResult;
  source: SourceSelection;
  status: 'saved';
  warnings: string[];
};

export type GenerationExecutionResult<TResult, TSaveResult = { entityId: string }> =
  GenerationExecutionFailure | GenerationExecutionPreview<TResult> | GenerationExecutionSaved<TResult, TSaveResult>;
