import { useChatScopedDomain } from '@/store/chatScoped';
import { useRegexDisplayStore } from '@/apps/regex-display/store';
import { createFailedDraftCollection } from '@/store/failedDrafts';
import { TheaterScopeDataSchema, type TheaterEntry, type TheaterEntryVersion } from '@/type/theater';
import { createContentVersion, removeContentVersion, resolveContentVersion } from '@/util/contentVersions';
import {
  activateContentVersion,
  appendContentVersion,
  deleteContentVersion,
  updateContentVersion,
} from '@/util/contentVersionStore';
import { validateInplace } from '@/util/zod';
import { wrapLegacyTheaterFrontend } from '@/util/theaterMixedContent';
import { captureContentCleanupSnapshot } from '@/util/contentCleanup';

export const theaterField = 'sillytavern_phone_theater';

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useTheaterStore = defineStore('theater', () => {
  const {
    data,
    flushCurrentScope,
    rehydrateFromSettings: rehydrateScopeFromSettings,
    resetCurrentScope,
    scopeKey,
    switchScope: switchChatScope,
  } = useChatScopedDomain({
    field: theaterField,
    schema: TheaterScopeDataSchema,
    createDefault: () => validateInplace(TheaterScopeDataSchema, {}),
  });

  function migrateLegacyFrontendEntries() {
    data.value.entries.forEach(entry => {
      if (entry.renderMode === 'frontend') {
        entry.content = wrapLegacyTheaterFrontend(entry.content);
        entry.renderMode = 'markdown';
      }
      entry.versions.forEach(version => {
        if (version.renderMode !== 'frontend') return;
        version.content = wrapLegacyTheaterFrontend(version.content);
        version.renderMode = 'markdown';
      });
    });
  }

  function rehydrateFromSettings() {
    rehydrateScopeFromSettings();
    migrateLegacyFrontendEntries();
  }

  async function switchScope(nextScopeKey: string) {
    await switchChatScope(nextScopeKey);
    migrateLegacyFrontendEntries();
  }

  migrateLegacyFrontendEntries();

  const entries = computed(() =>
    [...data.value.entries].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
  );
  const { createFailedDraft, deleteFailedDraft, failedDrafts, getFailedDraft, updateFailedDraft } =
    createFailedDraftCollection(data, 'theater_failed');

  function getEntry(entryId: string) {
    return data.value.entries.find(entry => entry.id === entryId) ?? null;
  }

  function createEntry(
    input: Pick<TheaterEntry, 'title' | 'content' | 'renderMode' | 'typeName'> &
      Partial<Pick<TheaterEntry, 'generationRecord' | 'generationReplay' | 'typeId'>>,
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
      renderMode: input.renderMode,
      generationRecord: input.generationRecord,
      generationReplay: input.generationReplay,
      activeVersionId: '',
      versions: [],
    };
    const version = createContentVersion<TheaterEntryVersion>('theater_version', {
      cleanup: captureContentCleanupSnapshot(),
      content: entry.content,
      generationRecord: entry.generationRecord,
      generationReplay: entry.generationReplay,
      origin: 'original',
      renderMode: entry.renderMode,
      title: entry.title,
    });
    entry.versions = [version];
    entry.activeVersionId = version.id;
    data.value.entries = [entry, ...data.value.entries];
    return entry;
  }

  function updateEntry(
    entryId: string,
    input: Pick<TheaterEntry, 'title' | 'content' | 'renderMode' | 'typeName'> & Partial<Pick<TheaterEntry, 'typeId'>>,
  ) {
    const entry = getEntry(entryId);
    if (!entry) return null;
    entry.title = input.title.trim() || entry.title;
    entry.content = input.content.trim();
    entry.typeId = input.typeId?.trim() || undefined;
    entry.typeName = input.typeName.trim() || entry.typeName;
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

  function applyEntryVersion(entry: TheaterEntry) {
    const version = resolveContentVersion(entry.versions, entry.activeVersionId);
    if (version) {
      entry.title = version.title;
      entry.content = version.content;
      entry.renderMode = version.renderMode;
      entry.generationRecord = version.generationRecord;
      entry.generationReplay = version.generationReplay;
    }
    entry.updatedAt = nowIso();
  }

  function appendEntryVersion(
    entryId: string,
    input: Pick<TheaterEntryVersion, 'title' | 'content' | 'renderMode' | 'cleanup'> &
      Partial<Pick<TheaterEntryVersion, 'generationRecord' | 'generationReplay'>>,
  ) {
    const entry = getEntry(entryId);
    if (!entry) return null;
    const version = appendContentVersion<TheaterEntryVersion>(entry, 'theater_version', {
      createOriginal: () => ({
        content: entry.content,
        createdAt: entry.createdAt,
        generationRecord: entry.generationRecord,
        generationReplay: entry.generationReplay,
        renderMode: entry.renderMode,
        title: entry.title,
      }),
      buildVersion: () => ({
        cleanup: input.cleanup ?? captureContentCleanupSnapshot(),
        content: input.content.trim(),
        generationRecord: input.generationRecord,
        generationReplay: input.generationReplay,
        renderMode: input.renderMode,
        title: input.title.trim() || entry.title,
      }),
      onVersionsChanged: versions => useRegexDisplayStore().migrateOriginalUsage('theater', entry.id, versions),
      syncFromVersion: () => applyEntryVersion(entry),
    });
    return { entry, version };
  }

  function activateEntryVersion(entryId: string, versionId: string) {
    const entry = getEntry(entryId);
    if (!entry) return null;
    const version = activateContentVersion(entry, versionId, () => applyEntryVersion(entry));
    return version ? entry : null;
  }

  function updateEntryVersion(
    entryId: string,
    versionId: string,
    input: Pick<TheaterEntryVersion, 'title' | 'content' | 'renderMode'>,
  ) {
    const entry = getEntry(entryId);
    const current = entry?.versions.find(item => item.id === versionId);
    if (!entry || !current) return null;
    const version = updateContentVersion(
      entry,
      versionId,
      { content: input.content.trim(), renderMode: input.renderMode, title: input.title.trim() || current.title },
      () => applyEntryVersion(entry),
    );
    return version ? entry : null;
  }

  function deleteEntryVersion(entryId: string, versionId: string) {
    const entry = getEntry(entryId);
    if (!entry) return null;
    const activeVersion = deleteContentVersion(entry, versionId, () => applyEntryVersion(entry), {
      onVersionRemoved: removedId => useRegexDisplayStore().deleteContentUsages('theater', [entryId, removedId]),
    });
    return activeVersion ? { activeVersion, entry } : null;
  }

  function splitEntryVersion(entryId: string, versionId: string) {
    const entry = getEntry(entryId);
    const version = entry?.versions.find(item => item.id === versionId);
    if (!entry || !version || entry.versions.length <= 1) return null;
    const remaining = removeContentVersion(entry.versions, entry.activeVersionId, versionId);
    if (!remaining) return null;
    useRegexDisplayStore().deleteContentUsages('theater', [entryId, versionId]);
    const timestamp = nowIso();
    const splitEntry: TheaterEntry = {
      id: createId('theater_entry'),
      title: version.title,
      content: version.content,
      favorite: false,
      createdAt: version.createdAt,
      updatedAt: timestamp,
      typeId: entry.typeId,
      typeName: entry.typeName,
      renderMode: version.renderMode,
      generationRecord: version.generationRecord,
      generationReplay: version.generationReplay,
      activeVersionId: version.id,
      versions: [{ ...version }],
    };
    entry.versions = remaining.versions;
    entry.activeVersionId = remaining.activeVersionId;
    entry.title = remaining.activeVersion.title;
    entry.content = remaining.activeVersion.content;
    entry.renderMode = remaining.activeVersion.renderMode;
    entry.generationRecord = remaining.activeVersion.generationRecord;
    entry.generationReplay = remaining.activeVersion.generationReplay;
    entry.updatedAt = timestamp;
    data.value.entries = [splitEntry, ...data.value.entries];
    return { sourceEntry: entry, splitEntry };
  }

  function updateEntryMetadata(
    entryId: string,
    input: Pick<TheaterEntry, 'typeName'> & Partial<Pick<TheaterEntry, 'typeId'>>,
  ) {
    const entry = getEntry(entryId);
    if (!entry) return null;
    entry.typeId = input.typeId?.trim() || undefined;
    entry.typeName = input.typeName.trim() || entry.typeName;
    entry.updatedAt = nowIso();
    return entry;
  }

  function deleteEntry(entryId: string) {
    data.value.entries = data.value.entries.filter(entry => entry.id !== entryId);
    useRegexDisplayStore().deleteContentUsages('theater', [entryId]);
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
    flushCurrentScope,
    getEntry,
    getFailedDraft,
    rehydrateFromSettings,
    resetCurrentScope,
    splitEntryVersion,
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
