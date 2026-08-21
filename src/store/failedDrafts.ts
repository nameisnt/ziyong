import type { FailedGenerationDraft } from '@/type/generation';
import type { Ref } from 'vue';

export interface FailedDraftScopeData {
  failedDrafts: FailedGenerationDraft[];
}

type FailedDraftInput = Omit<FailedGenerationDraft, 'createdAt' | 'id' | 'rawOutputSemantics'> &
  Partial<Pick<FailedGenerationDraft, 'rawOutputSemantics'>>;

const MAX_FAILED_DRAFTS_PER_APP = 30;

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createFailedDraftCollection<TData extends FailedDraftScopeData>(data: Ref<TData>, idPrefix: string) {
  const failedDrafts = computed(() =>
    [...data.value.failedDrafts].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
  );

  function getFailedDraft(draftId: string) {
    return data.value.failedDrafts.find(item => item.id === draftId) ?? null;
  }

  function createFailedDraft(input: FailedDraftInput) {
    const draft: FailedGenerationDraft = {
      ...input,
      createdAt: nowIso(),
      id: createId(idPrefix),
      rawOutputSemantics: input.rawOutputSemantics ?? 'legacy-unknown',
    };
    data.value.failedDrafts = [draft, ...data.value.failedDrafts].slice(0, MAX_FAILED_DRAFTS_PER_APP);
    return draft;
  }

  function updateFailedDraft(draftId: string, input: Pick<FailedGenerationDraft, 'rawOutput' | 'warnings'>) {
    const draft = getFailedDraft(draftId);
    if (!draft) return null;
    draft.rawOutput = input.rawOutput;
    draft.warnings = [...input.warnings];
    return draft;
  }

  function deleteFailedDraft(draftId: string) {
    data.value.failedDrafts = data.value.failedDrafts.filter(item => item.id !== draftId);
  }

  return {
    createFailedDraft,
    deleteFailedDraft,
    failedDrafts,
    getFailedDraft,
    updateFailedDraft,
  };
}
