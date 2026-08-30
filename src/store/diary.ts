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
  const { data, flushCurrentScope, rehydrateFromSettings, resetCurrentScope, scopeKey, switchScope } =
    useChatScopedDomain({
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

  watch(data, normalizeDirectoryOrders, { deep: true, immediate: true });

  function getNextDirectoryOrder(book: DiaryBook) {
    return book.entries.reduce((maximum, entry) => Math.max(maximum, entry.directoryOrder ?? 0), 0) + 1;
  }

  function findBookByPerspective(perspective: CharacterRef) {
    const key = perspectiveKey(perspective);
    return books.value.find(book => perspectiveKey(book.perspective) === key) ?? null;
  }

  function resolvePerspectiveAliases(resolveName: (name: string) => string) {
    let repaired = 0;
    let skipped = 0;

    for (const book of data.value.books) {
      const sourceName = book.perspective.name.trim();
      const resolvedName = resolveName(sourceName).trim();
      if (!resolvedName || resolvedName === sourceName) continue;

      const duplicate = data.value.books.some(
        candidate =>
          candidate.id !== book.id &&
          candidate.perspective.name.trim().toLocaleLowerCase() === resolvedName.toLocaleLowerCase(),
      );
      if (duplicate) {
        skipped += 1;
        continue;
      }

      book.perspective = { ...book.perspective, name: resolvedName };
      if (book.title.trim() === `${sourceName}的日记`) book.title = `${resolvedName}的日记`;
      book.entries.forEach(entry => {
        entry.perspective = { ...entry.perspective, name: resolveName(entry.perspective.name).trim() };
        if (entry.readers) {
          entry.readers = entry.readers.map(reader => ({ ...reader, name: resolveName(reader.name).trim() }));
        }
      });
      book.updatedAt = nowIso();
      repaired += 1;
    }

    return { repaired, skipped };
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
      directoryOrder?: number;
      generationRecord?: DiaryEntry['generationRecord'];
      sourceFloorEnd?: number;
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
      directoryOrder: input.directoryOrder ?? input.sourceFloorEnd ?? getNextDirectoryOrder(book),
      sourceFloorEnd: input.sourceFloorEnd,
      generationRecord: input.generationRecord,
    };
    book.entries = [entry, ...book.entries];
    book.updatedAt = timestamp;
    return { book, entry };
  }

  function updateEntry(
    bookId: string,
    entryId: string,
    input: Pick<DiaryEntry, 'title' | 'content' | 'occurredAt' | 'kind' | 'readers'> & {
      directoryOrder?: number;
    },
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
    if (typeof input.directoryOrder === 'number') entry.directoryOrder = Math.max(0, Math.round(input.directoryOrder));
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
    flushCurrentScope,
    getFailedDraft,
    getBook,
    getEntry,
    renameBook,
    rehydrateFromSettings,
    resolvePerspectiveAliases,
    resetCurrentScope,
    scopeKey,
    switchScope,
    toggleFavorite,
    updateFailedDraft,
    updateEntry,
  };
});
