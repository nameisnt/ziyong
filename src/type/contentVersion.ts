export const ContentVersionOriginSchema = z.enum(['original', 'rewrite', 'manual']);
export type ContentVersionOrigin = z.infer<typeof ContentVersionOriginSchema>;

export const ContentVersionBaseSchema = z.object({
  content: z.string(),
  createdAt: z.string(),
  id: z.string(),
  origin: ContentVersionOriginSchema.default('rewrite'),
  title: z.string(),
});

export type ContentVersionBase = z.infer<typeof ContentVersionBaseSchema>;
