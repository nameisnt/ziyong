export const PendingVisibilityRecoveryMessageSchema = z.object({
  messageId: z.number().int().nonnegative(),
  isHidden: z.boolean().default(false),
  role: z.enum(['system', 'assistant', 'user']),
  name: z.string(),
  contentHash: z.string(),
});
export type PendingVisibilityRecoveryMessage = z.infer<typeof PendingVisibilityRecoveryMessageSchema>;

export const PendingVisibilityRecoverySchema = z.object({
  scopeId: z.string(),
  generationId: z.string(),
  createdAt: z.string(),
  messages: z.array(PendingVisibilityRecoveryMessageSchema).default([]),
});
export type PendingVisibilityRecovery = z.infer<typeof PendingVisibilityRecoverySchema>;

export const PendingVisibilityRecoveryMapSchema = z.record(z.string(), PendingVisibilityRecoverySchema).default({});
export type PendingVisibilityRecoveryMap = z.infer<typeof PendingVisibilityRecoveryMapSchema>;
