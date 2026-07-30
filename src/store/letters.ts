import { useChatScopedDomain } from '@/store/chatScoped';
import { createFailedDraftCollection } from '@/store/failedDrafts';
import type { CharacterRef } from '@/type/diary';
import { type LetterBook, type LetterEntry, LettersScopeDataSchema } from '@/type/letter';
import { validateInplace } from '@/util/zod';

export const lettersField = 'sillytavern_phone_letters';

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeCharacterRef(ref: CharacterRef) {
  return {
    id: ref.id?.trim() || undefined,
    name: ref.name.trim(),
  } satisfies CharacterRef;
}

function participantToken(ref: CharacterRef) {
  return (ref.id || ref.name).trim().toLowerCase();
}

function uniqueParticipants(participants: CharacterRef[]) {
  const seen = new Set<string>();
  return participants
    .map(normalizeCharacterRef)
    .filter(item => item.name)
    .filter(item => {
      const key = participantToken(item);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => participantToken(left).localeCompare(participantToken(right)));
}

function buildParticipantKey(participants: CharacterRef[]) {
  return uniqueParticipants(participants).map(participantToken).join('::');
}

function buildDefaultBookTitle(participants: CharacterRef[]) {
  return `${participants.map(item => item.name).join(' 与 ')}的书信`;
}

export const useLettersStore = defineStore('letters', () => {
  const { data, rehydrateFromSettings, resetCurrentScope, scopeKey, switchScope } = useChatScopedDomain({
    field: lettersField,
    schema: LettersScopeDataSchema,
    createDefault: () => validateInplace(LettersScopeDataSchema, {}),
  });

  const books = computed(() => data.value.books);
  const { createFailedDraft, deleteFailedDraft, failedDrafts, getFailedDraft, updateFailedDraft } =
    createFailedDraftCollection(data, 'letters_failed');

  function getBook(bookId: string) {
    return books.value.find(book => book.id === bookId) ?? null;
  }

  function getEntry(bookId: string, entryId: string) {
    return getBook(bookId)?.entries.find(entry => entry.id === entryId) ?? null;
  }

  function findBookByParticipants(participants: CharacterRef[]) {
    const participantKey = buildParticipantKey(participants);
    return books.value.find(book => book.participantKey === participantKey) ?? null;
  }

  function ensureBook(participants: CharacterRef[], title?: string) {
    const normalizedParticipants = uniqueParticipants(participants);
    const participantKey = buildParticipantKey(normalizedParticipants);
    const existing = findBookByParticipants(normalizedParticipants);
    if (existing) return existing;

    const timestamp = nowIso();
    const book: LetterBook = {
      id: createId('letter_book'),
      participantKey,
      participants: normalizedParticipants,
      title: title?.trim() || buildDefaultBookTitle(normalizedParticipants),
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
    input: Pick<LetterEntry, 'title' | 'content' | 'format' | 'sender' | 'receiver'> & {
      bookId?: string;
      bookTitle?: string;
    },
  ) {
    const participants = [input.sender, input.receiver];
    const book = input.bookId ? getBook(input.bookId) : ensureBook(participants, input.bookTitle);
    if (!book) return null;

    const timestamp = nowIso();
    const entry: LetterEntry = {
      id: createId('letter_entry'),
      title: input.title.trim() || '未命名书信',
      content: input.content.trim(),
      favorite: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      sender: normalizeCharacterRef(input.sender),
      receiver: normalizeCharacterRef(input.receiver),
      format: input.format,
    };
    book.entries = [entry, ...book.entries];
    book.updatedAt = timestamp;
    return { book, entry };
  }

  function updateEntry(bookId: string, entryId: string, input: Pick<LetterEntry, 'title' | 'content' | 'format'>) {
    const book = getBook(bookId);
    const entry = getEntry(bookId, entryId);
    if (!book || !entry) return null;
    const timestamp = nowIso();
    entry.title = input.title.trim() || entry.title;
    entry.content = input.content.trim();
    entry.format = input.format;
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
    createEntry,
    createFailedDraft,
    data,
    deleteBook,
    deleteEntry,
    deleteFailedDraft,
    ensureBook,
    failedDrafts,
    findBookByParticipants,
    getBook,
    getEntry,
    getFailedDraft,
    rehydrateFromSettings,
    renameBook,
    resetCurrentScope,
    scopeKey,
    switchScope,
    toggleFavorite,
    updateEntry,
    updateFailedDraft,
  };
});
