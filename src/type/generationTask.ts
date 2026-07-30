export const GenerationTaskKindSchema = z.enum(['diary-batch', 'summary-batch', 'workbench']);
export type GenerationTaskKind = z.infer<typeof GenerationTaskKindSchema>;

export const GenerationTaskStatusSchema = z.enum([
  'queued',
  'running',
  'pause-requested',
  'paused',
  'interrupted',
  'completed',
  'cancelled',
]);
export type GenerationTaskStatus = z.infer<typeof GenerationTaskStatusSchema>;

export const GenerationTaskJobStatusSchema = z.enum(['pending', 'running', 'saved', 'draft']);
export type GenerationTaskJobStatus = z.infer<typeof GenerationTaskJobStatusSchema>;

export const GenerationTaskJobSchema = z.object({
  error: z.string().default(''),
  id: z.string(),
  label: z.string(),
  mode: z.enum(['single', 'range']).optional(),
  rangeText: z.string().default(''),
  singleMessageId: z.number().int().nonnegative().default(0),
  status: GenerationTaskJobStatusSchema.default('pending'),
});
export type GenerationTaskJob = z.infer<typeof GenerationTaskJobSchema>;

export const GenerationTaskSchema = z.object({
  activeGenerationId: z.string().default(''),
  appId: z.string(),
  automatic: z.boolean().default(false),
  config: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string(),
  currentJobIndex: z.number().int().nonnegative().default(0),
  currentLabel: z.string().default(''),
  draftCount: z.number().int().nonnegative().default(0),
  error: z.string().default(''),
  finishedAt: z.string().default(''),
  id: z.string(),
  jobs: z.array(GenerationTaskJobSchema).default([]),
  kind: GenerationTaskKindSchema,
  rawOutput: z.string().default(''),
  routePage: z.string().default('root'),
  routeParams: z.record(z.string(), z.string()).default({}),
  savedCount: z.number().int().nonnegative().default(0),
  scopeKey: z.string(),
  status: GenerationTaskStatusSchema.default('queued'),
  title: z.string(),
  total: z.number().int().nonnegative().default(0),
  updatedAt: z.string(),
});
export type GenerationTask = z.infer<typeof GenerationTaskSchema>;

export const GenerationTaskSettingsSchema = z.object({
  tasks: z.array(GenerationTaskSchema).default([]),
});
export type GenerationTaskSettings = z.infer<typeof GenerationTaskSettingsSchema>;
