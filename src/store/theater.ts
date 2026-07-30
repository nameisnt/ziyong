import { useChatScopedDomain } from '@/store/chatScoped';
import { createFailedDraftCollection } from '@/store/failedDrafts';
import { TheaterScopeDataSchema, type TheaterEntry } from '@/type/theater';
import { validateInplace } from '@/util/zod';

export const theaterField = 'sillytavern_phone_theater';

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useTheaterStore = defineStore('theater', () => {
  const { data, rehydrateFromSettings, resetCurrentScope, scopeKey, switchScope } = useChatScopedDomain({
    field: theaterField,
    schema: TheaterScopeDataSchema,
    createDefault: () => validateInplace(TheaterScopeDataSchema, {}),
  });

  const entries = computed(() =>
    [...data.value.entries].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
  );
  const { createFailedDraft, deleteFailedDraft, failedDrafts, getFailedDraft, updateFailedDraft } =
    createFailedDraftCollection(data, 'theater_failed');

  function getEntry(entryId: string) {
    return data.value.entries.find(entry => entry.id === entryId) ?? null;
  }

  function createEntry(
    input: Pick<TheaterEntry, 'title' | 'content' | 'participants' | 'renderMode' | 'typeName'> &
      Partial<Pick<TheaterEntry, 'typeId'>>,
  ) {
    const timestamp = nowIso();
    const entry: TheaterEntry = {
      id: createId('theater_entry'),
      title: input.title.trim() || '未命名小剧场',
      content: input.content.trim(),
      favorite: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      typeId: input.typeId?.trim() || undefined,
      typeName: input.typeName.trim() || '未分类小剧场',
      participants: [...input.participants],
      renderMode: input.renderMode,
    };
    data.value.entries = [entry, ...data.value.entries];
    return entry;
  }

  function updateEntry(
    entryId: string,
    input: Pick<TheaterEntry, 'title' | 'content' | 'participants' | 'renderMode' | 'typeName'> &
      Partial<Pick<TheaterEntry, 'typeId'>>,
  ) {
    const entry = getEntry(entryId);
    if (!entry) return null;
    entry.title = input.title.trim() || entry.title;
    entry.content = input.content.trim();
    entry.typeId = input.typeId?.trim() || undefined;
    entry.typeName = input.typeName.trim() || entry.typeName;
    entry.participants = [...input.participants];
    entry.renderMode = input.renderMode;
    entry.updatedAt = nowIso();
    return entry;
  }

  function deleteEntry(entryId: string) {
    data.value.entries = data.value.entries.filter(entry => entry.id !== entryId);
  }

  function toggleFavorite(entryId: string) {
    const entry = getEntry(entryId);
    if (!entry) return;
    entry.favorite = !entry.favorite;
  }

  function updateFailedDraftRenderMode(draftId: string, renderMode: TheaterEntry['renderMode']) {
    const draft = getFailedDraft(draftId);
    if (!draft) return null;
    draft.context = {
      ...draft.context,
      renderMode,
    };
    return draft;
  }

  return {
    createEntry,
    createFailedDraft,
    data,
    deleteEntry,
    deleteFailedDraft,
    entries,
    failedDrafts,
    getEntry,
    getFailedDraft,
    rehydrateFromSettings,
    resetCurrentScope,
    scopeKey,
    switchScope,
    toggleFavorite,
    updateEntry,
    updateFailedDraft,
    updateFailedDraftRenderMode,
  };
});
