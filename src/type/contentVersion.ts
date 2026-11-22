export const ContentVersionOriginSchema = z.enum(['original', 'rewrite', 'manual']);
export type ContentVersionOrigin = z.infer<typeof ContentVersionOriginSchema>;

/** 保存内容时固化的「正文清理」规则；之后改规则不影响旧内容。 */
export const ContentCleanupRuleSchema = z.object({
  find: z.string().default(''),
  flags: z.string().default(''),
  renderMode: z.enum(['text', 'html']).default('text'),
  replace: z.string().default(''),
});
export type ContentCleanupRule = z.infer<typeof ContentCleanupRuleSchema>;

export const ContentCleanupSnapshotSchema = z.object({
  enabled: z.boolean().default(true),
  rules: z.array(ContentCleanupRuleSchema).default([]),
});
export type ContentCleanupSnapshot = z.infer<typeof ContentCleanupSnapshotSchema>;

export const ContentVersionBaseSchema = z.object({
  cleanup: ContentCleanupSnapshotSchema.optional(),
  content: z.string(),
  createdAt: z.string(),
  id: z.string(),
  origin: ContentVersionOriginSchema.default('rewrite'),
  title: z.string(),
});

export type ContentVersionBase = z.infer<typeof ContentVersionBaseSchema>;
