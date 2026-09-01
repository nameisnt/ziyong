import { normalizeBrief, type ChatHistoryBriefItem } from '@/store/reader';
import { usePhoneStore } from '@/store/phone';
import { buildChatScopeKey, normalizeChatArchiveId, parseChatScopeKey } from '@/util/chatArchive';
import { getOptionalGlobalFunction, getOptionalGlobalValue } from '@/util/runtime';

export interface ReaderLibraryOwner {
  avatarUrl: string;
  characterId: number;
  id: string;
  initial: string;
  name: string;
}

export interface ReaderLibraryBook {
  chatId: string;
  isCurrent: boolean;
  messageCount: number | null;
  scopeKey: string;
  title: string;
  updatedAt: string;
}

export function useReaderLibrarySession(options: {
  getCharacterRecords: () => unknown[];
  getCharacters: () => Promise<unknown> | unknown;
  getPastCharacterChats: (characterId: number) => Promise<unknown[] | null | undefined>;
}) {
  const phone = usePhoneStore();
  const owners = ref<ReaderLibraryOwner[]>([]);
  const books = ref<ReaderLibraryBook[]>([]);
  const loadingOwners = ref(false);
  const loadingBooks = ref(false);
  const error = ref('');
  const loadedCharacterId = ref<number | null>(null);
  let ownerLoadSerial = 0;
  let bookLoadSerial = 0;

  const currentScope = computed(() => parseChatScopeKey(phone.currentTavernScopeKey));
  const currentTavernContext = computed(() => {
    const context = getOptionalGlobalValue<{
      getContext?: () => { characterId?: number | string | null; chatId?: number | string | null };
    }>('SillyTavern')?.getContext?.();
    return {
      characterId: context?.characterId,
      chatId: context?.chatId ?? currentScope.value.chatId,
    };
  });
  const currentCharacterId = computed(() => {
    const contextId = Number(currentTavernContext.value?.characterId);
    if (Number.isInteger(contextId) && contextId >= 0) return contextId;
    if (currentScope.value.kind !== 'char') return null;
    const scopeId = Number(currentScope.value.ownerId);
    return Number.isInteger(scopeId) && scopeId >= 0 ? scopeId : null;
  });
  const currentChatId = computed(() =>
    normalizeChatArchiveId(String(currentTavernContext.value.chatId ?? '')),
  );
  const currentOwner = computed(() => {
    if (currentCharacterId.value === null) return null;
    return owners.value.find(owner => owner.characterId === currentCharacterId.value) ?? null;
  });

  async function loadOwners(force = false) {
    if (owners.value.length && !force) return owners.value;
    const loadSerial = ++ownerLoadSerial;
    loadingOwners.value = true;
    error.value = '';
    try {
      await options.getCharacters();
      const records = options.getCharacterRecords();
      const nextOwners = (Array.isArray(records) ? records : []).map(createOwner);
      if (loadSerial !== ownerLoadSerial) return owners.value;
      const activeCharacterId = currentCharacterId.value ?? -1;
      owners.value = nextOwners.sort(
        (left, right) =>
          Number(right.characterId === activeCharacterId) - Number(left.characterId === activeCharacterId) ||
          left.name.localeCompare(right.name, 'zh-CN'),
      );
      return owners.value;
    } catch (caughtError) {
      if (loadSerial === ownerLoadSerial) {
        error.value = caughtError instanceof Error ? caughtError.message : '读取角色卡失败';
      }
      return [];
    } finally {
      if (loadSerial === ownerLoadSerial) loadingOwners.value = false;
    }
  }

  async function loadBooks(owner: ReaderLibraryOwner, force = false) {
    if (loadedCharacterId.value === owner.characterId && books.value.length && !force) return books.value;
    const loadSerial = ++bookLoadSerial;
    loadingBooks.value = true;
    error.value = '';
    try {
      const rawBriefs = await options.getPastCharacterChats(owner.characterId);
      const normalized = (rawBriefs || [])
        .map(normalizeBrief)
        .filter((brief): brief is ChatHistoryBriefItem => Boolean(brief));
      const nextBooks = new Map<string, ReaderLibraryBook>();
      normalized.forEach(brief => {
        const chatId = normalizeChatArchiveId(brief.fileName);
        if (!chatId) return;
        nextBooks.set(chatId, createBook(owner.characterId, chatId, brief));
      });

      if (currentCharacterId.value === owner.characterId && currentChatId.value && currentChatId.value !== '__no_chat__') {
        const existing = nextBooks.get(currentChatId.value);
        nextBooks.set(currentChatId.value, {
          chatId: currentChatId.value,
          isCurrent: true,
          messageCount: existing?.messageCount ?? null,
          scopeKey: phone.currentTavernScopeKey,
          title: existing?.title || currentChatId.value,
          updatedAt: existing?.updatedAt || '',
        });
      }

      if (loadSerial !== bookLoadSerial) return books.value;
      books.value = [...nextBooks.values()].sort(
        (left, right) =>
          Number(right.isCurrent) - Number(left.isCurrent) ||
          timestamp(right.updatedAt) - timestamp(left.updatedAt) ||
          left.title.localeCompare(right.title, 'zh-CN'),
      );
      loadedCharacterId.value = owner.characterId;
      return books.value;
    } catch (caughtError) {
      if (loadSerial === bookLoadSerial) {
        books.value = [];
        loadedCharacterId.value = owner.characterId;
        error.value = caughtError instanceof Error ? caughtError.message : '读取聊天列表失败';
      }
      return [];
    } finally {
      if (loadSerial === bookLoadSerial) loadingBooks.value = false;
    }
  }

  function resetBooks() {
    bookLoadSerial += 1;
    books.value = [];
    loadedCharacterId.value = null;
  }

  function createOwner(character: unknown, characterId: number): ReaderLibraryOwner {
    const record = character && typeof character === 'object' ? (character as Record<string, unknown>) : {};
    const name = typeof record.name === 'string' && record.name.trim() ? record.name.trim() : `角色 ${characterId + 1}`;
    const avatar = typeof record.avatar === 'string' ? record.avatar.trim() : '';
    return {
      avatarUrl: resolveAvatarUrl(avatar),
      characterId,
      id: `reader_owner_${characterId}`,
      initial: firstDisplayCharacter(name),
      name,
    };
  }

  function createBook(characterId: number, chatId: string, brief: ChatHistoryBriefItem): ReaderLibraryBook {
    const isCurrent = currentCharacterId.value === characterId && currentChatId.value === chatId;
    return {
      chatId,
      isCurrent,
      messageCount: brief.messageCount,
      scopeKey: isCurrent ? phone.currentTavernScopeKey : buildChatScopeKey('char', String(characterId), chatId),
      title: normalizeChatArchiveId(brief.title) || chatId,
      updatedAt: brief.updatedAt,
    };
  }

  return {
    books,
    currentChatId,
    currentOwner,
    error,
    loadBooks,
    loadOwners,
    loadingBooks,
    loadingOwners,
    owners,
    resetBooks,
  };
}

function resolveAvatarUrl(avatar: string) {
  const fileName = avatar.split(/[\\/]/).pop()?.toLowerCase() ?? '';
  if (!avatar || ['none', 'default', 'default.png', 'default_avatar.png', 'ai4.png'].includes(fileName)) return '';
  const getThumbnailUrl = getOptionalGlobalFunction<(type: string, file: string) => string>('getThumbnailUrl');
  try {
    const thumbnail = getThumbnailUrl?.('avatar', avatar);
    if (thumbnail) return thumbnail;
  } catch {
    // Use SillyTavern's character image route when the thumbnail helper rejects this avatar.
  }
  return `/characters/${avatar.split('/').map(encodeURIComponent).join('/')}`;
}

function firstDisplayCharacter(value: string) {
  if (typeof Intl.Segmenter === 'function') {
    const first = new Intl.Segmenter('zh-CN', { granularity: 'grapheme' }).segment(value)[Symbol.iterator]().next();
    if (!first.done) return first.value.segment;
  }
  return Array.from(value)[0] || '角';
}

function timestamp(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
