import { useChatScopedDomain } from '@/store/chatScoped';
import { useRegexDisplayStore } from '@/apps/regex-display/store';
import { createFailedDraftCollection } from '@/store/failedDrafts';
import { SummaryScopeDataSchema, type SummaryBook, type SummaryEntry, type SummaryEntryVersion } from '@/type/summary';
import { captureContentCleanupSnapshot } from '@/util/contentCleanup';
import {
  activateContentVersion,
  appendContentVersion,
  deleteContentVersion,
  updateContentVersion,
} from '@/util/contentVersionStore';
import { createContentVersion, ensureContentVersions, resolveContentVersion } from '@/util/contentVersions';
import { validateInplace } from '@/util/zod';

export const summaryField = 'sillytavern_phone_summaries';

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useSummaryStore = defineStore('summary', () => {
  const { data, flushCurrentScope, rehydrateFromSettings, resetCurrentScope, scopeKey, switchScope } =
    useChatScopedDomain({
    field: summaryField,
    schema: SummaryScopeDataSchema,
    createDefault: () => validateInplace(SummaryScopeDataSchema, {}),
  });

  const books = computed(() => data.value.books);
  const { createFailedDraft, deleteFailedDraft, failedDrafts, getFailedDraft, updateFailedDraft } =
    createFailedDraftCollection(data, 'summary_failed');

  function getBook(bookId: string) {
    return books.value.find(book => book.id === bookId) ?? null;
  }

  function getEntry(bookId: string, entryId: string) {
    return getBook(bookId)?.entries.find(entry => entry.id === entryId) ?? null;
  }

  function normalizeDirectoryOrders() {
    for (const book of data.value.books) {
      const ordered = [...book.entries].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
      let nextOrder = ordered.reduce(
        (maximum, entry) => Math.max(maximum, entry.directoryOrder ?? entry.sourceFloorEnd ?? 0),
        0,
      );
      for (const entry of ordered) {
        if (typeof entry.directoryOrder === 'number') continue;
        if (typeof entry.sourceFloorEnd === 'number') {
          entry.directoryOrder = entry.sourceFloorEnd;
          continue;
        }
        nextOrder += 1;
        entry.directoryOrder = nextOrder;
      }
    }
  }

  function applyEntryVersion(entry: SummaryEntry) {
    const version = resolveContentVersion(entry.versions, entry.activeVersionId);
    if (!version) return;
    entry.title = version.title;
    entry.content = version.content;
    entry.generationRecord = version.generationRecord;
    entry.updatedAt = nowIso();
  }

  function normalizeEntryVersions() {
    for (const book of data.value.books) {
      for (const entry of book.entries) {
        if (entry.versions.some(version => version.id === entry.activeVersionId)) continue;
        const normalized = ensureContentVersions<SummaryEntryVersion>(
          entry.versions,
          entry.activeVersionId,
          () => ({
            cleanup: captureContentCleanupSnapshot(),
            content: entry.content,
            generationRecord: entry.generationRecord,
            title: entry.title,
          }),
          'summary_version',
        );
        entry.versions = normalized.versions;
        entry.activeVersionId = normalized.activeVersionId;
        applyEntryVersion(entry);
      }
    }
  }

  watch(
    data,
    () => {
      normalizeDirectoryOrders();
      normalizeEntryVersions();
    },
    { deep: true, immediate: true },
  );

  function getNextDirectoryOrder(book: SummaryBook) {
    return book.entries.reduce((maximum, entry) => Math.max(maximum, entry.directoryOrder ?? 0), 0) + 1;
  }

  function createBook(title: string) {
    const timestamp = nowIso();
    const book: SummaryBook = {
      id: createId('summary_book'),
      title: title.trim() || '未命名总结集',
      entries: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.value.books = [book, ...data.value.books];
    return book;
  }

  function renameBook(bookId: string, title: string) {
    const book = getBook(bookId);
    if (!book) return null;
    book.title = title.trim() || book.title;
    book.updatedAt = nowIso();
    return book;
  }

  function deleteBook(bookId: string) {
    getBook(bookId)?.entries.forEach(entry => useRegexDisplayStore().deleteContentUsages('summary', [entry.id]));
    data.value.books = data.value.books.filter(book => book.id !== bookId);
  }

  function createEntry(
    bookId: string,
    input: Pick<SummaryEntry, 'title' | 'content' | 'rangeLabel'> & {
      directoryOrder?: number;
      generationRecord?: SummaryEntry['generationRecord'];
      sourceFloorEnd?: number;
    },
  ) {
    const book = getBook(bookId);
    if (!book) return null;
    const timestamp = nowIso();
    const version = createContentVersion<SummaryEntryVersion>('summary_version', {
      cleanup: captureContentCleanupSnapshot(),
      content: input.content.trim(),
      generationRecord: input.generationRecord,
      origin: 'original',
      title: input.title.trim() || '未命名总结',
    });
    const entry: SummaryEntry = {
      id: createId('summary_entry'),
      title: version.title,
      content: version.content,
      rangeLabel: input.rangeLabel.trim() || '未标注范围',
      favorite: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      directoryOrder: input.directoryOrder ?? input.sourceFloorEnd ?? getNextDirectoryOrder(book),
      sourceFloorEnd: input.sourceFloorEnd,
      generationRecord: version.generationRecord,
      activeVersionId: version.id,
      versions: [version],
    };
    book.entries = [entry, ...book.entries];
    book.updatedAt = timestamp;
    return entry;
  }

  function updateEntry(
    bookId: string,
    entryId: string,
    input: Pick<SummaryEntry, 'title' | 'content' | 'rangeLabel'> & { directoryOrder?: number },
  ) {
    const book = getBook(bookId);
    const entry = getEntry(bookId, entryId);
    if (!book || !entry) return null;
    const timestamp = nowIso();
    entry.title = input.title.trim() || entry.title;
    entry.content = input.content.trim();
    entry.rangeLabel = input.rangeLabel.trim() || entry.rangeLabel;
    if (typeof input.directoryOrder === 'number') entry.directoryOrder = Math.max(0, Math.round(input.directoryOrder));
    const activeVersion = resolveContentVersion(entry.versions, entry.activeVersionId);
    if (activeVersion) {
      activeVersion.title = entry.title;
      activeVersion.content = entry.content;
    }
    entry.updatedAt = timestamp;
    book.updatedAt = timestamp;
    return entry;
  }

  function appendEntryVersion(
    bookId: string,
    entryId: string,
    input: Pick<SummaryEntryVersion, 'title' | 'content'> & {
      cleanup?: SummaryEntryVersion['cleanup'];
      generationRecord?: SummaryEntryVersion['generationRecord'];
      rangeLabel?: string;
    },
  ) {
    const book = getBook(bookId);
    const entry = getEntry(bookId, entryId);
    if (!book || !entry) return null;
    const version = appendContentVersion<SummaryEntryVersion>(entry, 'summary_version', {
      createOriginal: () => ({
        content: entry.content,
        createdAt: entry.createdAt,
        generationRecord: entry.generationRecord,
        title: entry.title,
      }),
      buildVersion: () => ({
        cleanup: input.cleanup ?? captureContentCleanupSnapshot(),
        content: input.content.trim(),
        generationRecord: input.generationRecord,
        title: input.title.trim() || entry.title,
      }),
      onVersionsChanged: versions => useRegexDisplayStore().migrateOriginalUsage('summary', entry.id, versions),
      syncFromVersion: () => applyEntryVersion(entry),
    });
    if (!version) return null;
    entry.rangeLabel = input.rangeLabel?.trim() || entry.rangeLabel;
    book.updatedAt = nowIso();
    return { entry, version };
  }

  function activateEntryVersion(bookId: string, entryId: string, versionId: string) {
    const book = getBook(bookId);
    const entry = getEntry(bookId, entryId);
    if (!book || !entry) return null;
    const version = activateContentVersion(entry, versionId, () => applyEntryVersion(entry));
    return version ? entry : null;
  }

  function updateEntryVersion(
    bookId: string,
    entryId: string,
    versionId: string,
    input: Pick<SummaryEntryVersion, 'title' | 'content'>,
  ) {
    const book = getBook(bookId);
    const entry = getEntry(bookId, entryId);
    const current = entry?.versions.find(version => version.id === versionId);
    if (!book || !entry || !current) return null;
    const version = updateContentVersion(
      entry,
      versionId,
      { content: input.content.trim(), title: input.title.trim() || current.title },
      () => applyEntryVersion(entry),
    );
    return version ? entry : null;
  }

  function deleteEntryVersion(bookId: string, entryId: string, versionId: string) {
    const book = getBook(bookId);
    const entry = getEntry(bookId, entryId);
    if (!book || !entry) return null;
    const activeVersion = deleteContentVersion(entry, versionId, () => applyEntryVersion(entry), {
      onVersionRemoved: removedId => useRegexDisplayStore().deleteContentUsages('summary', [entryId, removedId]),
    });
    return activeVersion ? { activeVersion, entry } : null;
  }

  function deleteEntry(bookId: string, entryId: string) {
    const book = getBook(bookId);
    if (!book) return;
    const entry = getEntry(bookId, entryId);
    entry?.versions.forEach(version => useRegexDisplayStore().deleteContentUsages('summary', [entryId, version.id]));
    useRegexDisplayStore().deleteContentUsages('summary', [entryId]);
    book.entries = book.entries.filter(entry => entry.id !== entryId);
    book.updatedAt = nowIso();
  }

  function toggleFavorite(bookId: string, entryId: string) {
    const book = getBook(bookId);
    const entry = getEntry(bookId, entryId);
    if (!book || !entry) return;
    const timestamp = nowIso();
    entry.favorite = !entry.favorite;
    entry.updatedAt = timestamp;
    book.updatedAt = timestamp;
  }

  return {
    activateEntryVersion,
    appendEntryVersion,
    books,
    createFailedDraft,
    createBook,
    createEntry,
    data,
    deleteEntryVersion,
    deleteFailedDraft,
    deleteBook,
    deleteEntry,
    failedDrafts,
    flushCurrentScope,
    getBook,
    getEntry,
    getFailedDraft,
    renameBook,
    rehydrateFromSettings,
    resetCurrentScope,
    scopeKey,
    switchScope,
    toggleFavorite,
    updateEntryVersion,
    updateFailedDraft,
    updateEntry,
  };
});
