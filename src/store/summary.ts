import { useChatScopedDomain } from '@/store/chatScoped';
import { createFailedDraftCollection } from '@/store/failedDrafts';
import { SummaryScopeDataSchema, type SummaryBook, type SummaryEntry } from '@/type/summary';
import { validateInplace } from '@/util/zod';

export const summaryField = 'sillytavern_phone_summaries';

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useSummaryStore = defineStore('summary', () => {
  const { data, rehydrateFromSettings, resetCurrentScope, scopeKey, switchScope } = useChatScopedDomain({
    field: summaryField,
    schema: SummaryScopeDataSchema,
    createDefault: () => validateInplace(SummaryScopeDataSchema, {}),
  });

  const books = computed(() => data.value.books);
  const { createFailedDraft, deleteFailedDraft, failedDrafts, getFailedDraft, updateFailedDraft } = createFailedDraftCollection(data, 'summary_failed');

  function getBook(bookId: string) {
    return books.value.find(book => book.id === bookId) ?? null;
  }

  function getEntry(bookId: string, entryId: string) {
    return getBook(bookId)?.entries.find(entry => entry.id === entryId) ?? null;
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
    data.value.books = data.value.books.filter(book => book.id !== bookId);
  }

  function createEntry(bookId: string, input: Pick<SummaryEntry, 'title' | 'content' | 'rangeLabel'>) {
    const book = getBook(bookId);
    if (!book) return null;
    const timestamp = nowIso();
    const entry: SummaryEntry = {
      id: createId('summary_entry'),
      title: input.title.trim() || '未命名总结',
      content: input.content.trim(),
      rangeLabel: input.rangeLabel.trim() || '未标注范围',
      favorite: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    book.entries = [entry, ...book.entries];
    book.updatedAt = timestamp;
    return entry;
  }

  function updateEntry(bookId: string, entryId: string, input: Pick<SummaryEntry, 'title' | 'content' | 'rangeLabel'>) {
    const book = getBook(bookId);
    const entry = getEntry(bookId, entryId);
    if (!book || !entry) return null;
    const timestamp = nowIso();
    entry.title = input.title.trim() || entry.title;
    entry.content = input.content.trim();
    entry.rangeLabel = input.rangeLabel.trim() || entry.rangeLabel;
    entry.updatedAt = timestamp;
    book.updatedAt = timestamp;
    return entry;
  }

  function deleteEntry(bookId: string, entryId: string) {
    const book = getBook(bookId);
    if (!book) return;
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
    books,
    createFailedDraft,
    createBook,
    createEntry,
    data,
    deleteFailedDraft,
    deleteBook,
    deleteEntry,
    failedDrafts,
    getBook,
    getEntry,
    getFailedDraft,
    renameBook,
    rehydrateFromSettings,
    resetCurrentScope,
    scopeKey,
    switchScope,
    toggleFavorite,
    updateFailedDraft,
    updateEntry,
  };
});
