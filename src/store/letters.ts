import { useChatScopedDomain } from '@/store/chatScoped';
import { createFailedDraftCollection } from '@/store/failedDrafts';
import type { CharacterRef } from '@/type/diary';
import { type LetterBook, type LetterEntry, type LetterEntryVersion, LettersScopeDataSchema } from '@/type/letter';
import {
  createContentVersion,
  ensureContentVersions,
  removeContentVersion,
  resolveContentVersion,
} from '@/util/contentVersions';
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
  const { data, flushCurrentScope, rehydrateFromSettings, resetCurrentScope, scopeKey, switchScope } =
    useChatScopedDomain({
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
    input: Pick<LetterEntry, 'title' | 'content' | 'format' | 'sender' | 'receiver'> &
      Partial<Pick<LetterEntry, 'formatName' | 'formatPrompt'>> & {
        bookId?: string;
        bookTitle?: string;
        generationRecord?: LetterEntry['generationRecord'];
        generationReplay?: LetterEntry['generationReplay'];
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
      formatName: input.formatName?.trim() || '',
      formatPrompt: input.formatPrompt?.trim() || '',
      generationRecord: input.generationRecord,
      generationReplay: input.generationReplay,
      activeVersionId: '',
      versions: [],
    };
    book.entries = [entry, ...book.entries];
    book.updatedAt = timestamp;
    return { book, entry };
  }

  function updateEntry(
    bookId: string,
    entryId: string,
    input: Pick<LetterEntry, 'title' | 'content' | 'format'> &
      Partial<Pick<LetterEntry, 'formatName' | 'formatPrompt'>>,
  ) {
    const book = getBook(bookId);
    const entry = getEntry(bookId, entryId);
    if (!book || !entry) return null;
    const timestamp = nowIso();
    entry.title = input.title.trim() || entry.title;
    entry.content = input.content.trim();
    entry.format = input.format;
    entry.formatName = input.formatName?.trim() || entry.formatName;
    entry.formatPrompt = input.formatPrompt?.trim() || entry.formatPrompt;
    const activeVersion = resolveContentVersion(entry.versions, entry.activeVersionId);
    if (activeVersion) {
      activeVersion.title = entry.title;
      activeVersion.content = entry.content;
      activeVersion.format = entry.format;
      activeVersion.formatName = entry.formatName;
      activeVersion.formatPrompt = entry.formatPrompt;
    }
    entry.updatedAt = timestamp;
    book.updatedAt = timestamp;
    return entry;
  }

  function appendEntryVersion(
    bookId: string,
    entryId: string,
    input: Pick<LetterEntryVersion, 'title' | 'content' | 'format'> &
      Partial<Pick<LetterEntryVersion, 'formatName' | 'formatPrompt'>> &
      Partial<Pick<LetterEntryVersion, 'generationRecord' | 'generationReplay'>>,
  ) {
    const book = getBook(bookId);
    const entry = getEntry(bookId, entryId);
    if (!book || !entry) return null;
    const state = ensureContentVersions<LetterEntryVersion>(
      entry.versions,
      entry.activeVersionId,
      () => ({
        content: entry.content,
        createdAt: entry.createdAt,
        format: entry.format,
        formatName: entry.formatName,
        formatPrompt: entry.formatPrompt,
        generationRecord: entry.generationRecord,
        generationReplay: entry.generationReplay,
        title: entry.title,
      }),
      'letter_version',
    );
    const version = createContentVersion<LetterEntryVersion>('letter_version', {
      content: input.content.trim(),
      format: input.format,
      formatName: input.formatName?.trim() || entry.formatName,
      formatPrompt: input.formatPrompt?.trim() || entry.formatPrompt,
      generationRecord: input.generationRecord,
      generationReplay: input.generationReplay,
      title: input.title.trim() || entry.title,
    });
    entry.versions = [...state.versions, version];
    const timestamp = nowIso();
    entry.activeVersionId = version.id;
    entry.title = version.title;
    entry.content = version.content;
    entry.format = version.format;
    entry.formatName = version.formatName;
    entry.formatPrompt = version.formatPrompt;
    entry.generationRecord = version.generationRecord;
    entry.generationReplay = version.generationReplay;
    entry.updatedAt = timestamp;
    book.updatedAt = timestamp;
    return { book, entry, version };
  }

  function activateEntryVersion(bookId: string, entryId: string, versionId: string) {
    const book = getBook(bookId);
    const entry = getEntry(bookId, entryId);
    const version = entry?.versions.find(item => item.id === versionId);
    if (!book || !entry || !version) return null;
    const timestamp = nowIso();
    entry.activeVersionId = version.id;
    entry.title = version.title;
    entry.content = version.content;
    entry.format = version.format;
    entry.formatName = version.formatName;
    entry.formatPrompt = version.formatPrompt;
    entry.generationRecord = version.generationRecord;
    entry.generationReplay = version.generationReplay;
    entry.updatedAt = timestamp;
    book.updatedAt = timestamp;
    return entry;
  }

  function updateEntryVersion(
    bookId: string,
    entryId: string,
    versionId: string,
    input: Pick<LetterEntryVersion, 'title' | 'content' | 'format'> &
      Partial<Pick<LetterEntryVersion, 'formatName' | 'formatPrompt'>>,
  ) {
    const book = getBook(bookId);
    const entry = getEntry(bookId, entryId);
    const version = entry?.versions.find(item => item.id === versionId);
    if (!book || !entry || !version) return null;
    const timestamp = nowIso();
    version.title = input.title.trim() || version.title;
    version.content = input.content.trim();
    version.format = input.format;
    version.formatName = input.formatName?.trim() || version.formatName;
    version.formatPrompt = input.formatPrompt?.trim() || version.formatPrompt;
    if (entry.activeVersionId === version.id) {
      entry.title = version.title;
      entry.content = version.content;
      entry.format = version.format;
      entry.formatName = version.formatName;
      entry.formatPrompt = version.formatPrompt;
      entry.updatedAt = timestamp;
      book.updatedAt = timestamp;
    }
    return entry;
  }

  function deleteEntryVersion(bookId: string, entryId: string, versionId: string) {
    const book = getBook(bookId);
    const entry = getEntry(bookId, entryId);
    if (!book || !entry) return null;
    const state = removeContentVersion(entry.versions, entry.activeVersionId, versionId);
    if (!state) return null;
    const timestamp = nowIso();
    entry.versions = state.versions;
    entry.activeVersionId = state.activeVersionId;
    entry.title = state.activeVersion.title;
    entry.content = state.activeVersion.content;
    entry.format = state.activeVersion.format;
    entry.generationRecord = state.activeVersion.generationRecord;
    entry.generationReplay = state.activeVersion.generationReplay;
    entry.updatedAt = timestamp;
    book.updatedAt = timestamp;
    return { activeVersion: state.activeVersion, entry };
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
    activateEntryVersion,
    appendEntryVersion,
    books,
    createEntry,
    createFailedDraft,
    data,
    deleteBook,
    deleteEntry,
    deleteEntryVersion,
    deleteFailedDraft,
    ensureBook,
    failedDrafts,
    findBookByParticipants,
    flushCurrentScope,
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
    updateEntryVersion,
    updateFailedDraft,
  };
});
