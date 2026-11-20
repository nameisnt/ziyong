import { useChatScopedDomain } from '@/store/chatScoped';
import { useRegexDisplayStore } from '@/apps/regex-display/store';
import { createFailedDraftCollection } from '@/store/failedDrafts';
import {
  ExtraScopeDataSchema,
  type ExtraBook,
  type ExtraChapter,
  type ExtraChapterGenerationRecord,
  type ExtraChapterVersion,
  type ExtraSummary,
} from '@/type/extra';
import { resolveContentVersion } from '@/util/contentVersions';
import {
  activateContentVersion,
  appendContentVersion,
  deleteContentVersion,
  updateContentVersion,
} from '@/util/contentVersionStore';
import {
  resolveExtraChapterGenerationRecords,
  synchronizeExtraChapterGenerationRecords,
} from '@/util/extraGenerationRecords';
import { validateInplace } from '@/util/zod';

export const extrasField = 'sillytavern_phone_extras';

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeChapterNumbers(chapters: ExtraChapter[]) {
  return chapters.map((chapter, index) => ({
    ...chapter,
    chapterNumber: index + 1,
  }));
}

export const useExtrasStore = defineStore('extras', () => {
  const { data, flushCurrentScope, rehydrateFromSettings, resetCurrentScope, scopeKey, switchScope } =
    useChatScopedDomain({
      field: extrasField,
      schema: ExtraScopeDataSchema,
      createDefault: () => validateInplace(ExtraScopeDataSchema, {}),
    });

  const books = computed(() => data.value.books);
  const { createFailedDraft, deleteFailedDraft, failedDrafts, getFailedDraft, updateFailedDraft } =
    createFailedDraftCollection(data, 'extra_failed');

  function synchronizeGenerationRecords() {
    data.value.books.forEach(book => {
      book.chapters.forEach(chapter => synchronizeExtraChapterGenerationRecords(chapter));
    });
  }

  synchronizeGenerationRecords();
  watch(data, synchronizeGenerationRecords, { deep: false, flush: 'sync' });

  function getBook(bookId: string) {
    return books.value.find(book => book.id === bookId) ?? null;
  }

  function getChapter(bookId: string, chapterId: string) {
    return getBook(bookId)?.chapters.find(chapter => chapter.id === chapterId) ?? null;
  }

  function getSummary(bookId: string, summaryId: string) {
    return getBook(bookId)?.summaries.find(summary => summary.id === summaryId) ?? null;
  }

  function createBook(
    input: Pick<ExtraBook, 'title' | 'typeName'> & Partial<Pick<ExtraBook, 'typeId' | 'typePrompt'>>,
  ) {
    const timestamp = nowIso();
    const book: ExtraBook = {
      id: createId('extra_book'),
      typeId: input.typeId?.trim() || undefined,
      typeName: input.typeName.trim() || '未分类番外',
      typePrompt: input.typePrompt?.trim() || '',
      title: input.title.trim() || '未命名番外',
      chapters: [],
      summaries: [],
      summarySkipRecentChapters: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.value.books = [book, ...data.value.books];
    return book;
  }

  function updateBook(
    bookId: string,
    input: Pick<ExtraBook, 'title' | 'typeName'> & Partial<Pick<ExtraBook, 'typeId' | 'typePrompt'>>,
  ) {
    const book = getBook(bookId);
    if (!book) return null;
    book.typeId = input.typeId?.trim() || undefined;
    book.typeName = input.typeName.trim() || book.typeName;
    if (input.typePrompt !== undefined) book.typePrompt = input.typePrompt.trim();
    book.title = input.title.trim() || book.title;
    book.updatedAt = nowIso();
    return book;
  }

  function setSummarySkipRecentChapters(bookId: string, count: number) {
    const book = getBook(bookId);
    if (!book) return null;
    const max = book.chapters.length;
    const next = Number.isFinite(count) ? Math.min(Math.max(0, Math.trunc(count)), max) : 0;
    if (book.summarySkipRecentChapters === next) return book;
    book.summarySkipRecentChapters = next;
    book.updatedAt = nowIso();
    return book;
  }

  function deleteBook(bookId: string) {
    getBook(bookId)?.chapters.forEach(chapter => useRegexDisplayStore().deleteContentUsages('extras', [chapter.id]));
    data.value.books = data.value.books.filter(book => book.id !== bookId);
  }

  function createChapter(
    bookId: string,
    input: Pick<ExtraChapter, 'title' | 'content'> & { generationRecord?: ExtraChapterGenerationRecord },
  ) {
    const book = getBook(bookId);
    if (!book) return null;
    const timestamp = nowIso();
    const chapter: ExtraChapter = {
      id: createId('extra_chapter'),
      title: input.title.trim() || `第 ${book.chapters.length + 1} 章`,
      content: input.content.trim(),
      favorite: false,
      chapterNumber: book.chapters.length + 1,
      activeVersionId: '',
      versions: [],
      generationRecords: input.generationRecord ? [input.generationRecord] : [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    book.chapters = [...book.chapters, chapter];
    book.updatedAt = timestamp;
    return chapter;
  }

  function updateChapter(
    bookId: string,
    chapterId: string,
    input: Pick<ExtraChapter, 'title' | 'content'> & { generationRecord?: ExtraChapterGenerationRecord },
  ) {
    const book = getBook(bookId);
    const chapter = getChapter(bookId, chapterId);
    if (!book || !chapter) return null;
    const timestamp = nowIso();
    chapter.title = input.title.trim() || chapter.title;
    chapter.content = input.content.trim();
    const activeVersion = resolveContentVersion(chapter.versions, chapter.activeVersionId);
    if (activeVersion) {
      activeVersion.title = chapter.title;
      activeVersion.content = chapter.content;
    }
    if (input.generationRecord) {
      chapter.generationRecords = [...chapter.generationRecords, input.generationRecord].slice(-10);
    }
    chapter.updatedAt = timestamp;
    book.updatedAt = timestamp;
    return chapter;
  }

  function applyChapterVersion(chapter: ExtraChapter, book: ExtraBook, withRecords = false) {
    const version = resolveContentVersion(chapter.versions, chapter.activeVersionId);
    if (version) {
      chapter.title = version.title;
      chapter.content = version.content;
    }
    if (withRecords) chapter.generationRecords = resolveExtraChapterGenerationRecords(chapter).slice(-10);
    chapter.updatedAt = nowIso();
    book.updatedAt = chapter.updatedAt;
  }

  function appendChapterVersion(
    bookId: string,
    chapterId: string,
    input: Pick<ExtraChapterVersion, 'title' | 'content'> & { generationRecord?: ExtraChapterGenerationRecord },
  ) {
    const book = getBook(bookId);
    const chapter = getChapter(bookId, chapterId);
    if (!book || !chapter) return null;
    const version = appendContentVersion<ExtraChapterVersion>(chapter, 'extra_version', {
      createOriginal: () => ({
        content: chapter.content,
        createdAt: chapter.createdAt,
        generationRecord: chapter.generationRecords.at(-1),
        title: chapter.title,
      }),
      buildVersion: () => ({
        content: input.content.trim(),
        generationRecord: input.generationRecord,
        title: input.title.trim() || chapter.title,
      }),
      onVersionsChanged: versions => useRegexDisplayStore().migrateOriginalUsage('extras', chapter.id, versions),
      syncFromVersion: () => applyChapterVersion(chapter, book, true),
    });
    return { chapter, version };
  }

  function activateChapterVersion(bookId: string, chapterId: string, versionId: string) {
    const book = getBook(bookId);
    const chapter = getChapter(bookId, chapterId);
    if (!book || !chapter) return null;
    const version = activateContentVersion(chapter, versionId, () => applyChapterVersion(chapter, book));
    return version ? chapter : null;
  }

  function updateChapterVersion(
    bookId: string,
    chapterId: string,
    versionId: string,
    input: Pick<ExtraChapterVersion, 'title' | 'content'>,
  ) {
    const book = getBook(bookId);
    const chapter = getChapter(bookId, chapterId);
    const current = chapter?.versions.find(item => item.id === versionId);
    if (!book || !chapter || !current) return null;
    const version = updateContentVersion(
      chapter,
      versionId,
      { content: input.content.trim(), title: input.title.trim() || current.title },
      () => applyChapterVersion(chapter, book),
    );
    return version ? chapter : null;
  }

  function deleteChapterVersion(bookId: string, chapterId: string, versionId: string) {
    const book = getBook(bookId);
    const chapter = getChapter(bookId, chapterId);
    if (!book || !chapter) return null;
    const activeVersion = deleteContentVersion(chapter, versionId, () => applyChapterVersion(chapter, book, true), {
      onVersionRemoved: removedId => useRegexDisplayStore().deleteContentUsages('extras', [chapterId, removedId]),
    });
    return activeVersion ? { activeVersion, chapter } : null;
  }

  function deleteChapter(bookId: string, chapterId: string) {
    const book = getBook(bookId);
    if (!book) return;
    useRegexDisplayStore().deleteContentUsages('extras', [chapterId]);
    book.chapters = normalizeChapterNumbers(book.chapters.filter(chapter => chapter.id !== chapterId));
    book.summaries = book.summaries
      .filter(summary => summary.autoChapterId !== chapterId)
      .map(summary => ({
        ...summary,
        coveredChapterIds: summary.coveredChapterIds.filter(id => id !== chapterId),
      }));
    book.updatedAt = nowIso();
  }

  function toggleFavorite(bookId: string, chapterId: string) {
    const book = getBook(bookId);
    const chapter = getChapter(bookId, chapterId);
    if (!book || !chapter) return;
    const timestamp = nowIso();
    chapter.favorite = !chapter.favorite;
    book.updatedAt = timestamp;
  }

  function createSummary(bookId: string, input: Pick<ExtraSummary, 'content' | 'coveredChapterIds' | 'enabled'>) {
    const book = getBook(bookId);
    if (!book) return null;
    const timestamp = nowIso();
    const summary: ExtraSummary = {
      id: createId('extra_summary'),
      content: input.content.trim(),
      coveredChapterIds: [...input.coveredChapterIds],
      enabled: input.enabled,
      autoChapterId: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    book.summaries = [summary, ...book.summaries];
    book.updatedAt = timestamp;
    return summary;
  }

  function upsertAutoChapterSummary(bookId: string, chapterId: string, content: string) {
    const book = getBook(bookId);
    const normalized = content.trim();
    if (!book || !normalized) return null;
    const timestamp = nowIso();
    const existing = book.summaries.find(summary => summary.autoChapterId === chapterId);
    if (existing) {
      existing.content = normalized;
      existing.coveredChapterIds = [chapterId];
      existing.enabled = true;
      existing.updatedAt = timestamp;
      book.updatedAt = timestamp;
      return existing;
    }
    const summary: ExtraSummary = {
      id: createId('extra_summary'),
      content: normalized,
      coveredChapterIds: [chapterId],
      enabled: true,
      autoChapterId: chapterId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    book.summaries = [summary, ...book.summaries];
    book.updatedAt = timestamp;
    return summary;
  }

  function updateSummary(
    bookId: string,
    summaryId: string,
    input: Pick<ExtraSummary, 'content' | 'coveredChapterIds' | 'enabled'>,
  ) {
    const book = getBook(bookId);
    const summary = getSummary(bookId, summaryId);
    if (!book || !summary) return null;
    const timestamp = nowIso();
    summary.content = input.content.trim();
    summary.coveredChapterIds = [...input.coveredChapterIds];
    summary.enabled = input.enabled;
    summary.updatedAt = timestamp;
    book.updatedAt = timestamp;
    return summary;
  }

  function deleteSummary(bookId: string, summaryId: string) {
    const book = getBook(bookId);
    if (!book) return;
    book.summaries = book.summaries.filter(summary => summary.id !== summaryId);
    book.updatedAt = nowIso();
  }

  function toggleSummary(bookId: string, summaryId: string) {
    const book = getBook(bookId);
    const summary = getSummary(bookId, summaryId);
    if (!book || !summary) return;
    summary.enabled = !summary.enabled;
    summary.updatedAt = nowIso();
    book.updatedAt = summary.updatedAt;
  }

  return {
    activateChapterVersion,
    appendChapterVersion,
    books,
    createBook,
    createChapter,
    createFailedDraft,
    createSummary,
    data,
    deleteFailedDraft,
    deleteBook,
    deleteChapter,
    deleteChapterVersion,
    deleteSummary,
    failedDrafts,
    flushCurrentScope,
    getFailedDraft,
    getBook,
    getChapter,
    getSummary,
    rehydrateFromSettings,
    resetCurrentScope,
    scopeKey,
    setSummarySkipRecentChapters,
    switchScope,
    toggleFavorite,
    toggleSummary,
    upsertAutoChapterSummary,
    updateFailedDraft,
    updateBook,
    updateChapter,
    updateChapterVersion,
    updateSummary,
  };
});
