export interface PreviewSaveCompletion {
  clearDraft: () => void;
  closePreview: () => void;
  deleteFailedDraft: (draftId: string) => void;
  draftId?: null | string;
  navigate: () => void;
  notify: (message: string) => void;
  successMessage: string;
}

/**
 * Runs the shared tail of a preview save: drop the failed draft the preview came from,
 * clear the persisted preview draft, close the preview, tell the user, then navigate.
 * Call it only after the record itself was saved successfully.
 */
export function completePreviewSave(completion: PreviewSaveCompletion) {
  if (completion.draftId) completion.deleteFailedDraft(completion.draftId);
  completion.clearDraft();
  completion.closePreview();
  completion.notify(completion.successMessage);
  completion.navigate();
}
