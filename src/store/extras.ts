import { useChatScopedDomain } from '@/store/chatScoped';
import { createFailedDraftCollection } from '@/store/failedDrafts';
import {
  ExtraScopeDataSchema,
  type ExtraBook,
  type ExtraChapter,
  type ExtraChapterGenerationRecord,
  type ExtraSummary,
} from '@/type/extra';
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
    if (input.generationRecord) {
      chapter.generationRecords = [...chapter.generationRecords, input.generationRecord].slice(-10);
    }
    chapter.updatedAt = timestamp;
    book.updatedAt = timestamp;
    return chapter;
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
    books,
    createBook,
    createChapter,
    createFailedDraft,
    createSummary,
    data,
    deleteFailedDraft,
    deleteBook,
    deleteChapter,
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
    updateSummary,
  };
});
