import { useChatScopedDomain } from '@/store/chatScoped';
import { createFailedDraftCollection } from '@/store/failedDrafts';
import { TheaterScopeDataSchema, type TheaterEntry, type TheaterEntryVersion } from '@/type/theater';
import {
  createContentVersion,
  ensureContentVersions,
  removeContentVersion,
  resolveContentVersion,
} from '@/util/contentVersions';
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
      Partial<Pick<TheaterEntry, 'generationReplay' | 'typeId'>>,
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
      generationReplay: input.generationReplay,
      activeVersionId: '',
      versions: [],
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
    const activeVersion = resolveContentVersion(entry.versions, entry.activeVersionId);
    if (activeVersion) {
      activeVersion.title = entry.title;
      activeVersion.content = entry.content;
      activeVersion.renderMode = entry.renderMode;
    }
    entry.updatedAt = nowIso();
    return entry;
  }

  function appendEntryVersion(
    entryId: string,
    input: Pick<TheaterEntryVersion, 'title' | 'content' | 'renderMode'> &
      Partial<Pick<TheaterEntryVersion, 'generationReplay'>>,
  ) {
    const entry = getEntry(entryId);
    if (!entry) return null;
    const state = ensureContentVersions<TheaterEntryVersion>(
      entry.versions,
      entry.activeVersionId,
      () => ({
        content: entry.content,
        createdAt: entry.createdAt,
        generationReplay: entry.generationReplay,
        renderMode: entry.renderMode,
        title: entry.title,
      }),
      'theater_version',
    );
    const version = createContentVersion<TheaterEntryVersion>('theater_version', {
      content: input.content.trim(),
      generationReplay: input.generationReplay,
      renderMode: input.renderMode,
      title: input.title.trim() || entry.title,
    });
    entry.versions = [...state.versions, version];
    entry.activeVersionId = state.activeVersionId;
    return { entry, version };
  }

  function activateEntryVersion(entryId: string, versionId: string) {
    const entry = getEntry(entryId);
    const version = entry?.versions.find(item => item.id === versionId);
    if (!entry || !version) return null;
    entry.activeVersionId = version.id;
    entry.title = version.title;
    entry.content = version.content;
    entry.renderMode = version.renderMode;
    entry.generationReplay = version.generationReplay;
    entry.updatedAt = nowIso();
    return entry;
  }

  function updateEntryVersion(
    entryId: string,
    versionId: string,
    input: Pick<TheaterEntryVersion, 'title' | 'content' | 'renderMode'>,
  ) {
    const entry = getEntry(entryId);
    const version = entry?.versions.find(item => item.id === versionId);
    if (!entry || !version) return null;
    version.title = input.title.trim() || version.title;
    version.content = input.content.trim();
    version.renderMode = input.renderMode;
    if (entry.activeVersionId === version.id) {
      entry.title = version.title;
      entry.content = version.content;
      entry.renderMode = version.renderMode;
      entry.updatedAt = nowIso();
    }
    return entry;
  }

  function deleteEntryVersion(entryId: string, versionId: string) {
    const entry = getEntry(entryId);
    if (!entry) return null;
    const state = removeContentVersion(entry.versions, entry.activeVersionId, versionId);
    if (!state) return null;
    entry.versions = state.versions;
    entry.activeVersionId = state.activeVersionId;
    entry.title = state.activeVersion.title;
    entry.content = state.activeVersion.content;
    entry.renderMode = state.activeVersion.renderMode;
    entry.generationReplay = state.activeVersion.generationReplay;
    entry.updatedAt = nowIso();
    return { activeVersion: state.activeVersion, entry };
  }

  function updateEntryMetadata(
    entryId: string,
    input: Pick<TheaterEntry, 'participants' | 'typeName'> & Partial<Pick<TheaterEntry, 'typeId'>>,
  ) {
    const entry = getEntry(entryId);
    if (!entry) return null;
    entry.typeId = input.typeId?.trim() || undefined;
    entry.typeName = input.typeName.trim() || entry.typeName;
    entry.participants = [...input.participants];
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
    activateEntryVersion,
    appendEntryVersion,
    createEntry,
    createFailedDraft,
    data,
    deleteEntry,
    deleteEntryVersion,
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
    updateEntryMetadata,
    updateEntryVersion,
    updateFailedDraft,
    updateFailedDraftRenderMode,
  };
});
