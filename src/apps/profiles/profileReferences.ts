export type ExternalProfileReferenceDraft = {
  profileRowIndex: number;
  profileSheetKey: string;
};

export function externalProfileReferenceKey(reference: ExternalProfileReferenceDraft) {
  return `${reference.profileSheetKey}\u0000${reference.profileRowIndex}`;
}
