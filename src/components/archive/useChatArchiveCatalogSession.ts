import { areChatScopeKeysEquivalent } from '@/store/chatScoped';
import { usePhoneStore } from '@/store/phone';
import { normalizeBrief, type ChatHistoryBriefItem } from '@/store/reader';
import {
  buildChatScopeKey,
  createChatArchiveDomainReader,
  getUsedChatArchiveScopes,
  normalizeChatArchiveId,
  parseChatScopeKey as parseArchiveScopeKey,
  type ChatArchiveDomain,
  type ChatScopeRef,
} from '@/util/chatArchive';
import { listChatFloorBackups, type ChatFloorBackup } from '@/util/chatFloorBackup';
import { getOptionalGlobalFunction } from '@/util/runtime';
// eslint-disable-next-line import-x/no-nodejs-modules
import { characters, getCharacters, getPastCharacterChats } from '@sillytavern/script';
import { storeToRefs } from 'pinia';

export interface ArchiveOwner {
  aliases: Set<string>;
  avatar: string;
  avatarUrl: string;
  backupChatIds: Set<string>;
  characterId: number | null;
  initial: string;
  key: string;
  kind: 'char' | 'group';
  name: string;
  ownerId: string;
  usedChatIds: Set<string>;
}

export interface ArchiveChatRow {
  contentCount: number;
  domains: ChatArchiveDomain[];
  floorBackup: ChatFloorBackup | null;
  isCurrent: boolean;
  isUsed: boolean;
  key: string;
  scopeKey: string;
  title: string;
}

export function useChatArchiveCatalogSession() {
  const phone = usePhoneStore();
  const { currentRoute: route, currentTavernScopeKey } = storeToRefs(phone);
  const activeTab = ref<'current' | 'used' | 'unused'>('current');
  const owners = ref<ArchiveOwner[]>([]);
  const chatRows = ref<ArchiveChatRow[]>([]);
  const selectedChat = ref<ArchiveChatRow | null>(null);
  const selectedDomains = ref<ChatArchiveDomain[]>([]);
  const floorBackups = ref<ChatFloorBackup[]>([]);
  const ownerQuery = ref('');
  const loadingCharacters = ref(false);
  const loadingChats = ref(false);
  const error = ref('');
  const floorBackupError = ref('');
  const failedAvatars = reactive(new Set<string>());
  let characterLoadSequence = 0;
  let chatLoadSequence = 0;

  const activeOwner = computed(() => owners.value.find(owner => owner.key === route.value.params?.ownerKey) ?? null);
  const currentScope = computed(() => parseArchiveScopeKey(currentTavernScopeKey.value));
  const currentOwner = computed(() => {
    const scope = currentScope.value;
    if (scope.kind !== 'char' && scope.kind !== 'group') return null;
    return (
      owners.value.find(owner => owner.kind === scope.kind && owner.aliases.has(scope.ownerId)) ??
      owners.value.find(owner => owner.kind === scope.kind && [...owner.aliases].some(alias => alias === scope.ownerId)) ??
      null
    );
  });
  const currentChatRow = computed(() => {
    const owner = currentOwner.value;
    const scope = currentScope.value;
    if (!owner || !scope.chatId || scope.chatId === '__no_chat__') return null;
    return createChatRow(owner, scope.chatId, scope.chatId, createChatArchiveDomainReader());
  });
  const visibleOwners = computed(() => {
    const keyword = ownerQuery.value.trim().toLowerCase();
    return owners.value.filter(owner => {
      const matchedTab = activeTab.value === 'used' ? owner.usedChatIds.size > 0 : owner.usedChatIds.size === 0;
      if (!matchedTab) return false;
      if (!keyword) return true;
      const haystacks = [owner.name, owner.ownerId, owner.avatar, ...owner.aliases].map(item => item.toLowerCase());
      return haystacks.some(item => item.includes(keyword));
    });
  });

  watch(
    () => route.value,
    async current => {
      if (current.appId !== 'archive') return;
      if (current.page === 'root') {
        await loadCharacters(true);
        return;
      }
      if (current.page === 'chats') {
        await loadChatsForActiveOwner(true);
        return;
      }
      if (current.page === 'detail' || current.page === 'floor-backup') {
        await loadChatsForActiveOwner();
        const chat = chatRows.value.find(item => item.key === current.params?.chatKey) ?? null;
        selectedChat.value = chat;
        selectedDomains.value = chat?.domains ?? [];
      }
    },
    { deep: true, immediate: true },
  );

  async function loadCharacters(force = false) {
    if (owners.value.length && !force) return;
    const requestSequence = ++characterLoadSequence;
    loadingCharacters.value = true;
    error.value = '';
    try {
      const [, loadedBackups] = await Promise.all([getCharacters(), loadFloorBackupsSafe()]);
      if (requestSequence !== characterLoadSequence) return;
      floorBackups.value = loadedBackups;
      const usedScopes = getUsedChatArchiveScopes();
      const usedByOwner = groupUsedScopesByOwner(usedScopes);
      const characterOwners = (Array.isArray(characters) ? characters : []).map((character, index) =>
        createCharacterOwner(character, index, usedByOwner),
      );
      characterOwners.forEach(owner => {
        floorBackups.value
          .filter(backup => isBackupOwnedBy(backup, owner))
          .forEach(backup => owner.backupChatIds.add(normalizeChatArchiveId(backup.chat.id)));
      });
      const matched = new Set(characterOwners.flatMap(owner => [...owner.aliases]));
      const orphanOwners = [...usedByOwner.entries()]
        .filter(([ownerId]) => !matched.has(ownerId))
        .map(([ownerId, scopes]) => createOrphanOwner(ownerId, scopes));
      const backupOrphans = new Map<string, ChatFloorBackup[]>();
      loadedBackups
        .filter(backup => !characterOwners.some(owner => isBackupOwnedBy(backup, owner)))
        .forEach(backup => {
          const key = `${backup.owner.kind}:${normalizeOwnerAlias(backup.owner.stableId)}`;
          const list = backupOrphans.get(key) ?? [];
          list.push(backup);
          backupOrphans.set(key, list);
        });
      const backupOnlyOwners = [...backupOrphans.entries()].flatMap(([key, backups]) => {
        const first = backups[0];
        if (!first || orphanOwners.some(owner => isBackupOwnedBy(first, owner))) return [];
        return [createBackupOrphanOwner(key, backups)];
      });
      if (requestSequence === characterLoadSequence) {
        owners.value = [...characterOwners, ...orphanOwners, ...backupOnlyOwners];
      }
    } catch (caughtError) {
      if (requestSequence === characterLoadSequence) {
        error.value = caughtError instanceof Error ? caughtError.message : '读取角色卡失败';
      }
    } finally {
      if (requestSequence === characterLoadSequence) loadingCharacters.value = false;
    }
  }

  async function loadFloorBackupsSafe() {
    try {
      const backups = await listChatFloorBackups();
      floorBackupError.value = '';
      return backups;
    } catch (caughtError) {
      floorBackupError.value = caughtError instanceof Error ? caughtError.message : '无法读取浏览器本地备份库';
      return [];
    }
  }

  function groupUsedScopesByOwner(scopes: ChatScopeRef[]) {
    const result = new Map<string, ChatScopeRef[]>();
    scopes.forEach(scope => {
      const list = result.get(scope.ownerId) ?? [];
      list.push(scope);
      result.set(scope.ownerId, list);
    });
    return result;
  }

  function firstDisplayCharacter(value: string, fallback: string) {
    const normalized = value.trim();
    if (!normalized) return fallback;
    if (typeof Intl.Segmenter === 'function') {
      const first = new Intl.Segmenter('zh-CN', { granularity: 'grapheme' })
        .segment(normalized)
        [Symbol.iterator]()
        .next();
      if (!first.done) return first.value.segment;
    }
    return Array.from(normalized)[0] || fallback;
  }

  function resolveCharacterAvatarUrl(avatar: string) {
    const normalized = avatar.trim();
    const fileName = normalized.split(/[\\/]/).pop()?.toLowerCase() ?? '';
    if (!normalized || ['none', 'default', 'default.png', 'default_avatar.png', 'ai4.png'].includes(fileName)) return '';
    const getThumbnailUrl = getOptionalGlobalFunction<(type: string, file: string) => string>('getThumbnailUrl');
    if (getThumbnailUrl) {
      try {
        const thumbnail = getThumbnailUrl('avatar', normalized);
        if (thumbnail) return thumbnail;
      } catch {
        // Fall through to SillyTavern's character image route.
      }
    }
    return `/characters/${normalized.split('/').map(encodeURIComponent).join('/')}`;
  }

  function markAvatarFailed(ownerKey: string) {
    failedAvatars.add(ownerKey);
  }

  function formatOwnerSummary(owner: ArchiveOwner) {
    const phoneChats = owner.usedChatIds.size;
    const backupChats = owner.backupChatIds.size;
    if (!phoneChats && !backupChats) return '暂无手机内容或楼层备份';
    const parts = [];
    if (phoneChats) parts.push(`${phoneChats} 个聊天有手机内容`);
    if (backupChats) parts.push(`${backupChats} 个聊天有楼层备份`);
    return parts.join(' · ');
  }

  function normalizeOwnerAlias(value: string) {
    return value.trim().toLowerCase().replace(/\.[^/.]+$/, '');
  }

  function isBackupOwnedBy(backup: ChatFloorBackup, owner: ArchiveOwner) {
    if (backup.owner.kind !== owner.kind) return false;
    const candidates = new Set(
      [...owner.aliases, owner.avatar]
        .filter(Boolean)
        .flatMap(alias => [alias.trim().toLowerCase(), normalizeOwnerAlias(alias)]),
    );
    const stableId = backup.owner.stableId.trim().toLowerCase();
    return candidates.has(stableId) || candidates.has(normalizeOwnerAlias(stableId));
  }

  function findFloorBackup(owner: ArchiveOwner, chatId: string) {
    const normalizedChatId = normalizeChatArchiveId(chatId).toLowerCase();
    return (
      floorBackups.value.find(
        backup =>
          isBackupOwnedBy(backup, owner) && normalizeChatArchiveId(backup.chat.id).toLowerCase() === normalizedChatId,
      ) ?? null
    );
  }

  function createCharacterOwner(
    character: unknown,
    index: number,
    usedByOwner: Map<string, ChatScopeRef[]>,
  ): ArchiveOwner {
    const record = character && typeof character === 'object' ? (character as Record<string, unknown>) : {};
    const name = typeof record.name === 'string' && record.name.trim() ? record.name.trim() : `角色 ${index + 1}`;
    const avatar = typeof record.avatar === 'string' ? record.avatar : '';
    const aliases = new Set([String(index), name, avatar, avatar.replace(/\.[^/.]+$/, '')].filter(Boolean));
    const usedChatIds = new Set<string>();
    aliases.forEach(alias => usedByOwner.get(alias)?.forEach(scope => usedChatIds.add(scope.chatId)));
    return {
      aliases,
      avatar,
      avatarUrl: resolveCharacterAvatarUrl(avatar),
      backupChatIds: new Set(),
      characterId: index,
      initial: firstDisplayCharacter(name, '角'),
      key: `char:${index}`,
      kind: 'char',
      name,
      ownerId: String(index),
      usedChatIds,
    };
  }

  function createOrphanOwner(ownerId: string, scopes: ChatScopeRef[]): ArchiveOwner {
    const name = formatArchiveOwnerName(ownerId);
    return {
      aliases: new Set([ownerId]),
      avatar: '',
      avatarUrl: '',
      backupChatIds: new Set(),
      characterId: null,
      initial: firstDisplayCharacter(name, '档'),
      key: `char:${ownerId}`,
      kind: 'char',
      name,
      ownerId,
      usedChatIds: new Set(scopes.map(scope => scope.chatId)),
    };
  }

  function createBackupOrphanOwner(key: string, backups: ChatFloorBackup[]): ArchiveOwner {
    const first = backups[0];
    const stableId = first?.owner.stableId || key;
    const name = first?.owner.displayName || formatArchiveOwnerName(stableId);
    const avatar = first?.owner.avatar || '';
    return {
      aliases: new Set([stableId, avatar, avatar.replace(/\.[^/.]+$/, '')].filter(Boolean)),
      avatar,
      avatarUrl: resolveCharacterAvatarUrl(avatar),
      backupChatIds: new Set(backups.map(backup => normalizeChatArchiveId(backup.chat.id))),
      characterId: null,
      initial: firstDisplayCharacter(name, '档'),
      key: `backup:${key}`,
      kind: first?.owner.kind ?? 'char',
      name: `${name}（孤立备份）`,
      ownerId: stableId,
      usedChatIds: new Set(),
    };
  }

  function formatArchiveOwnerName(ownerId: string) {
    if (ownerId === '__no_character__') return '未知角色';
    return ownerId || '未知角色';
  }

  function formatArchiveChatTitle(chatId: string) {
    if (chatId === '__no_chat__') return '未知聊天（旧数据）';
    return chatId || '未命名聊天';
  }

  function openOwner(owner: ArchiveOwner) {
    selectedChat.value = null;
    selectedDomains.value = [];
    chatRows.value = [];
    phone.pushPage('chats', owner.name, { ownerKey: owner.key });
  }

  async function loadChatsForActiveOwner(force = false) {
    const owner = activeOwner.value;
    if (!owner) return;
    if (chatRows.value.length && !force && route.value.params?.ownerKey === owner.key) return;
    const requestSequence = ++chatLoadSequence;
    loadingChats.value = true;
    error.value = '';
    try {
      const [briefs, loadedBackups] = await Promise.all([
        owner.characterId === null ? Promise.resolve([]) : getPastCharacterChats(owner.characterId),
        loadFloorBackupsSafe(),
      ]);
      floorBackups.value = loadedBackups;
      owner.backupChatIds = new Set(
        loadedBackups
          .filter(backup => isBackupOwnedBy(backup, owner))
          .map(backup => normalizeChatArchiveId(backup.chat.id)),
      );
      if (
        requestSequence !== chatLoadSequence ||
        route.value.appId !== 'archive' ||
        route.value.params?.ownerKey !== owner.key
      )
        return;

      const normalizedBriefs = (briefs || [])
        .map(normalizeBrief)
        .filter((item): item is ChatHistoryBriefItem => Boolean(item));
      const rows = new Map<string, ArchiveChatRow>();
      const domainReader = createChatArchiveDomainReader();
      normalizedBriefs.forEach(brief => {
        const chatId = normalizeChatArchiveId(brief.fileName);
        rows.set(chatId, createChatRow(owner, chatId, brief.title, domainReader));
      });
      owner.usedChatIds.forEach(chatId => {
        if (!rows.has(chatId)) rows.set(chatId, createChatRow(owner, chatId, formatArchiveChatTitle(chatId), domainReader));
      });
      owner.backupChatIds.forEach(chatId => {
        if (!rows.has(chatId)) {
          const backup = findFloorBackup(owner, chatId);
          rows.set(
            chatId,
            createChatRow(owner, chatId, backup?.chat.title || formatArchiveChatTitle(chatId), domainReader),
          );
        }
      });
      chatRows.value = [...rows.values()].sort(
        (left, right) => Number(right.isUsed) - Number(left.isUsed) || left.title.localeCompare(right.title, 'zh-CN'),
      );
    } catch (caughtError) {
      if (requestSequence === chatLoadSequence) {
        error.value = caughtError instanceof Error ? caughtError.message : '读取聊天列表失败';
      }
    } finally {
      if (requestSequence === chatLoadSequence) loadingChats.value = false;
    }
  }

  function createChatRow(
    owner: ArchiveOwner,
    chatId: string,
    title: string,
    domainReader: ReturnType<typeof createChatArchiveDomainReader>,
  ): ArchiveChatRow {
    const { domains, scopeKey } = findChatScope(owner, chatId, domainReader);
    return {
      contentCount: domains.reduce((sum, domain) => sum + domain.items, 0),
      domains,
      floorBackup: findFloorBackup(owner, chatId),
      isCurrent: areChatScopeKeysEquivalent(scopeKey, currentTavernScopeKey.value),
      isUsed: domains.length > 0,
      key: chatId,
      scopeKey,
      title: formatArchiveChatTitle(title),
    };
  }

  function findChatScope(
    owner: ArchiveOwner,
    chatId: string,
    domainReader: ReturnType<typeof createChatArchiveDomainReader>,
  ) {
    for (const alias of owner.aliases) {
      const scopeKey = buildChatScopeKey(owner.kind, alias, chatId);
      const domains = domainReader.getDomains(scopeKey);
      if (domains.length) return { domains, scopeKey };
    }
    const scopeKey = buildChatScopeKey(owner.kind, owner.ownerId, chatId);
    return { domains: domainReader.getDomains(scopeKey), scopeKey };
  }

  function formatDomainCount(domain: ChatArchiveDomain) {
    if (domain.appId === 'extras') return `${domain.collections}本`;
    if (domain.appId === 'forum') return `${domain.items}主题帖`;
    const labels: Record<string, string> = {
      diary: '篇',
      letters: '封',
      media: '个',
      profiles: '资料',
      relationship: '关系',
      summary: '篇',
      theater: '篇',
      'world-slots': '槽位',
    };
    return `${domain.items}${labels[domain.appId] || domain.itemLabel}`;
  }

  async function openChat(chat: ArchiveChatRow) {
    await phone.syncCurrentTavernScope();
    selectedChat.value = chat;
    selectedDomains.value = chat.domains;
    await phone.setViewingScope(chat.scopeKey, {
      chatTitle: chat.title,
      ownerName: activeOwner.value?.name || '',
    });
    phone.pushPage('detail', chat.title, {
      chatKey: chat.key,
      ownerKey: activeOwner.value?.key || '',
    });
  }

  async function refreshSelectedChatRow() {
    const chatKey = selectedChat.value?.key ?? route.value.params?.chatKey;
    await loadChatsForActiveOwner(true);
    const next = chatRows.value.find(chat => chat.key === chatKey) ?? null;
    selectedChat.value = next;
    selectedDomains.value = next?.domains ?? [];
  }

  return {
    activeOwner,
    activeTab,
    chatRows,
    currentChatRow,
    currentOwner,
    currentScope,
    error,
    failedAvatars,
    floorBackupError,
    floorBackups,
    formatDomainCount,
    formatOwnerSummary,
    loadCharacters,
    loadChatsForActiveOwner,
    loadFloorBackupsSafe,
    loadingCharacters,
    loadingChats,
    markAvatarFailed,
    openChat,
    openOwner,
    ownerQuery,
    owners,
    refreshSelectedChatRow,
    selectedChat,
    selectedDomains,
    visibleOwners,
  };
}
