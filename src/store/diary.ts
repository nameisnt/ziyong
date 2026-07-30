import { useChatScopedDomain } from '@/store/chatScoped';
import { createFailedDraftCollection } from '@/store/failedDrafts';
import { DiaryScopeDataSchema, type CharacterRef, type DiaryBook, type DiaryEntry } from '@/type/diary';
import { validateInplace } from '@/util/zod';

export const diaryField = 'sillytavern_phone_diaries';

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function perspectiveKey(ref: CharacterRef) {
  return (ref.id || ref.name).trim().toLowerCase();
}

export const useDiaryStore = defineStore('diary', () => {
  const { data, rehydrateFromSettings, resetCurrentScope, scopeKey, switchScope } = useChatScopedDomain({
    field: diaryField,
    schema: DiaryScopeDataSchema,
    createDefault: () => validateInplace(DiaryScopeDataSchema, {}),
  });

  const books = computed(() => data.value.books);
  const { createFailedDraft, deleteFailedDraft, failedDrafts, getFailedDraft, updateFailedDraft } =
    createFailedDraftCollection(data, 'diary_failed');

  function getBook(bookId: string) {
    return books.value.find(book => book.id === bookId) ?? null;
  }

  function getEntry(bookId: string, entryId: string) {
    return getBook(bookId)?.entries.find(entry => entry.id === entryId) ?? null;
  }

  function findBookByPerspective(perspective: CharacterRef) {
    const key = perspectiveKey(perspective);
    return books.value.find(book => perspectiveKey(book.perspective) === key) ?? null;
  }

  function ensureBook(perspective: CharacterRef, title?: string) {
    const existing = findBookByPerspective(perspective);
    if (existing) return existing;

    const timestamp = nowIso();
    const book: DiaryBook = {
      id: createId('diary_book'),
      perspective,
      title: title?.trim() || `${perspective.name}的日记`,
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

  function createEntry(
    input: Pick<DiaryEntry, 'title' | 'content' | 'occurredAt' | 'kind' | 'readers'> & {
      perspective: CharacterRef;
      bookId?: string;
      bookTitle?: string;
    },
  ) {
    const book = input.bookId ? getBook(input.bookId) : ensureBook(input.perspective, input.bookTitle);
    if (!book) return null;
    const timestamp = nowIso();
    const entry: DiaryEntry = {
      id: createId('diary_entry'),
      title: input.title.trim() || '未命名日记',
      content: input.content.trim(),
      favorite: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      perspective: book.perspective,
      occurredAt: input.occurredAt?.trim() || undefined,
      kind: input.kind,
      readers: input.readers?.length ? input.readers : undefined,
    };
    book.entries = [entry, ...book.entries];
    book.updatedAt = timestamp;
    return { book, entry };
  }

  function updateEntry(
    bookId: string,
    entryId: string,
    input: Pick<DiaryEntry, 'title' | 'content' | 'occurredAt' | 'kind' | 'readers'>,
  ) {
    const book = getBook(bookId);
    const entry = getEntry(bookId, entryId);
    if (!book || !entry) return null;
    const timestamp = nowIso();
    entry.title = input.title.trim() || entry.title;
    entry.content = input.content.trim();
    entry.occurredAt = input.occurredAt?.trim() || undefined;
    entry.kind = input.kind;
    entry.readers = input.readers?.length ? input.readers : undefined;
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
    book.updatedAt = timestamp;
  }

  return {
    books,
    createFailedDraft,
    createEntry,
    data,
    deleteFailedDraft,
    deleteBook,
    deleteEntry,
    ensureBook,
    failedDrafts,
    findBookByPerspective,
    getFailedDraft,
    getBook,
    getEntry,
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
