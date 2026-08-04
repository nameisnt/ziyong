import { useChatScopedDomain } from '@/store/chatScoped';
import { createFailedDraftCollection } from '@/store/failedDrafts';
import {
  ExtraScopeDataSchema,
  type ExtraBook,
  type ExtraChapter,
  type ExtraChapterGenerationRecord,
  type ExtraChapterVersion,
  type ExtraSummary,
} from '@/type/extra';
import {
  createContentVersion,
  ensureContentVersions,
  removeContentVersion,
  resolveContentVersion,
} from '@/util/contentVersions';
import { resolveExtraChapterGenerationRecords } from '@/util/extraGenerationRecords';
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
  const { data, rehydrateFromSettings, resetCurrentScope, scopeKey, switchScope } = useChatScopedDomain({
    field: extrasField,
    schema: ExtraScopeDataSchema,
    createDefault: () => validateInplace(ExtraScopeDataSchema, {}),
  });

  const books = computed(() => data.value.books);
  const { createFailedDraft, deleteFailedDraft, failedDrafts, getFailedDraft, updateFailedDraft } =
    createFailedDraftCollection(data, 'extra_failed');

  function getBook(bookId: string) {
    return books.value.find(book => book.id === bookId) ?? null;
  }

  function getChapter(bookId: string, chapterId: string) {
    return getBook(bookId)?.chapters.find(chapter => chapter.id === chapterId) ?? null;
  }

  function getSummary(bookId: string, summaryId: string) {
    return getBook(bookId)?.summaries.find(summary => summary.id === summaryId) ?? null;
  }

  function createBook(input: Pick<ExtraBook, 'title' | 'typeName'> & Partial<Pick<ExtraBook, 'typeId'>>) {
    const timestamp = nowIso();
    const book: ExtraBook = {
      id: createId('extra_book'),
      typeId: input.typeId?.trim() || undefined,
      typeName: input.typeName.trim() || '未分类番外',
      title: input.title.trim() || '未命名番外',
      chapters: [],
      summaries: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.value.books = [book, ...data.value.books];
    return book;
  }

  function updateBook(
    bookId: string,
    input: Pick<ExtraBook, 'title' | 'typeName'> & Partial<Pick<ExtraBook, 'typeId'>>,
  ) {
    const book = getBook(bookId);
    if (!book) return null;
    book.typeId = input.typeId?.trim() || undefined;
    book.typeName = input.typeName.trim() || book.typeName;
    book.title = input.title.trim() || book.title;
    book.updatedAt = nowIso();
    return book;
  }

  function deleteBook(bookId: string) {
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

  function appendChapterVersion(
    bookId: string,
    chapterId: string,
    input: Pick<ExtraChapterVersion, 'title' | 'content'> & { generationRecord?: ExtraChapterGenerationRecord },
  ) {
    const book = getBook(bookId);
    const chapter = getChapter(bookId, chapterId);
    if (!book || !chapter) return null;
    const state = ensureContentVersions<ExtraChapterVersion>(
      chapter.versions,
      chapter.activeVersionId,
      () => ({
        content: chapter.content,
        createdAt: chapter.createdAt,
        generationRecord: chapter.generationRecords.at(-1),
        title: chapter.title,
      }),
      'extra_version',
    );
    const version = createContentVersion<ExtraChapterVersion>('extra_version', {
      content: input.content.trim(),
      generationRecord: input.generationRecord,
      title: input.title.trim() || chapter.title,
    });
    chapter.versions = [...state.versions, version];
    chapter.activeVersionId = state.activeVersionId;
    chapter.generationRecords = resolveExtraChapterGenerationRecords(chapter).slice(-10);
    return { chapter, version };
  }

  function activateChapterVersion(bookId: string, chapterId: string, versionId: string) {
    const book = getBook(bookId);
    const chapter = getChapter(bookId, chapterId);
    const version = chapter?.versions.find(item => item.id === versionId);
    if (!book || !chapter || !version) return null;
    const timestamp = nowIso();
    chapter.activeVersionId = version.id;
    chapter.title = version.title;
    chapter.content = version.content;
    chapter.updatedAt = timestamp;
    book.updatedAt = timestamp;
    return chapter;
  }

  function updateChapterVersion(
    bookId: string,
    chapterId: string,
    versionId: string,
    input: Pick<ExtraChapterVersion, 'title' | 'content'>,
  ) {
    const book = getBook(bookId);
    const chapter = getChapter(bookId, chapterId);
    const version = chapter?.versions.find(item => item.id === versionId);
    if (!book || !chapter || !version) return null;
    const timestamp = nowIso();
    version.title = input.title.trim() || version.title;
    version.content = input.content.trim();
    if (chapter.activeVersionId === version.id) {
      chapter.title = version.title;
      chapter.content = version.content;
      chapter.updatedAt = timestamp;
      book.updatedAt = timestamp;
    }
    return chapter;
  }

  function deleteChapterVersion(bookId: string, chapterId: string, versionId: string) {
    const book = getBook(bookId);
    const chapter = getChapter(bookId, chapterId);
    if (!book || !chapter) return null;
    const state = removeContentVersion(chapter.versions, chapter.activeVersionId, versionId);
    if (!state) return null;
    const timestamp = nowIso();
    chapter.versions = state.versions;
    chapter.generationRecords = resolveExtraChapterGenerationRecords(chapter).slice(-10);
    chapter.activeVersionId = state.activeVersionId;
    chapter.title = state.activeVersion.title;
    chapter.content = state.activeVersion.content;
    chapter.updatedAt = timestamp;
    book.updatedAt = timestamp;
    return { activeVersion: state.activeVersion, chapter };
  }

  function deleteChapter(bookId: string, chapterId: string) {
    const book = getBook(bookId);
    if (!book) return;
    book.chapters = normalizeChapterNumbers(book.chapters.filter(chapter => chapter.id !== chapterId));
    book.summaries = book.summaries.map(summary => ({
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
    getFailedDraft,
    getBook,
    getChapter,
    getSummary,
    rehydrateFromSettings,
    resetCurrentScope,
    scopeKey,
    switchScope,
    toggleFavorite,
    toggleSummary,
    updateFailedDraft,
    updateBook,
    updateChapter,
    updateChapterVersion,
    updateSummary,
  };
});
