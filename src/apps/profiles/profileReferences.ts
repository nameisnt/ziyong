export const ExternalProfileReferenceSchema = z.object({
  profileRowIndex: z.number().int().min(1),
  profileSheetKey: z.string().trim().min(1),
});

export type ExternalProfileReference = z.infer<typeof ExternalProfileReferenceSchema>;
export type ExternalProfileReferenceDraft = {
  profileRowIndex: number;
  profileSheetKey: string;
};

export function externalProfileReferenceKey(reference: ExternalProfileReferenceDraft) {
  return `${reference.profileSheetKey}\u0000${reference.profileRowIndex}`;
}

export function cleanExternalProfileReferences(references: ExternalProfileReferenceDraft[]) {
  const unique = new Map<string, ExternalProfileReference>();
  references.forEach(reference => {
    const parsed = ExternalProfileReferenceSchema.safeParse(reference);
    if (!parsed.success) return;
    unique.set(externalProfileReferenceKey(parsed.data), parsed.data);
  });
  return [...unique.values()];
}
