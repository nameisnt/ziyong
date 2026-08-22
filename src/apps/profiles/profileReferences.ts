export const ExternalProfileReferenceSchema = z.object({
  profileIdentityValue: z.string().trim().min(1),
  profileMappingId: z.string().trim().min(1),
});

export type ExternalProfileReference = z.infer<typeof ExternalProfileReferenceSchema>;
export type ExternalProfileReferenceDraft = {
  profileIdentityValue: string;
  profileMappingId: string;
};

export function externalProfileReferenceKey(reference: ExternalProfileReferenceDraft) {
  return `${reference.profileMappingId}\u0000${reference.profileIdentityValue}`;
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
