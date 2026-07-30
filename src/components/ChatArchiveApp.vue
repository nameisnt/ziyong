<template>
  <section class="pc-archive-app">
    <section v-if="route.page === 'root'" class="pc-archive-page">
      <div class="pc-archive-search-row">
        <label class="pc-search-field">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="ownerQuery" type="search" :placeholder="t`搜索角色卡`" />
        </label>
        <button
          class="pc-icon-btn"
          type="button"
          :disabled="loadingCharacters"
          :title="t`刷新`"
          @click="loadCharacters(true)"
        >
          <i :class="['fa-solid fa-rotate-right', { spinning: loadingCharacters }]"></i>
        </button>
      </div>

      <div class="pc-tab-row">
        <button :class="['pc-tab-btn', { active: activeTab === 'used' }]" type="button" @click="activeTab = 'used'">
          {{ t`已用过` }}
        </button>
        <button :class="['pc-tab-btn', { active: activeTab === 'unused' }]" type="button" @click="activeTab = 'unused'">
          {{ t`未使用` }}
        </button>
      </div>

      <div v-if="error" class="pc-status-card danger">
        <strong>{{ t`读取失败` }}</strong>
        <p>{{ error }}</p>
      </div>

      <EmptyState
        v-if="!visibleOwners.length && !loadingCharacters"
        :title="activeTab === 'used' ? t`还没有用过手机创作的角色` : t`没有未使用角色`"
      />

      <div v-else class="pc-owner-list">
        <button
          v-for="owner in visibleOwners"
          :key="owner.key"
          class="pc-owner-row"
          type="button"
          @click="openOwner(owner)"
        >
          <span class="pc-owner-avatar">{{ owner.initial }}</span>
          <span class="pc-owner-main">
            <strong>{{ owner.name }}</strong>
            <small>{{ owner.usedChatIds.size ? `${owner.usedChatIds.size} 个聊天有手机内容` : '暂无手机内容' }}</small>
          </span>
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    </section>

    <section v-else-if="route.page === 'chats' && activeOwner" class="pc-archive-page">
      <div class="pc-archive-hero">
        <div>
          <span class="pc-kicker">{{ activeOwner.usedChatIds.size ? t`已使用` : t`未使用` }}</span>
          <h2>{{ activeOwner.name }}</h2>
        </div>
        <button
          class="pc-icon-btn"
          type="button"
          :disabled="loadingChats"
          :title="t`刷新聊天`"
          @click="loadChatsForActiveOwner(true)"
        >
          <i :class="['fa-solid fa-rotate-right', { spinning: loadingChats }]"></i>
        </button>
      </div>

      <EmptyState v-if="!chatRows.length && !loadingChats" :title="t`暂无聊天`" />

      <div v-else class="pc-chat-list">
        <button v-for="chat in chatRows" :key="chat.key" class="pc-chat-row" type="button" @click="openChat(chat)">
          <span class="pc-chat-main">
            <strong>{{ chat.title }}</strong>
            <small>{{ chat.isUsed ? '有手机内容' : '无手机内容' }}{{ chat.isCurrent ? ' · 当前聊天' : '' }}</small>
          </span>
          <span v-if="chat.isUsed" class="pc-count-pill">{{ chat.contentCount }}</span>
        </button>
      </div>
    </section>

    <section v-else-if="route.page === 'detail' && activeOwner && selectedChat" class="pc-archive-page">
      <div v-if="!isSelectedCurrentChat" class="pc-readonly-card">
        <div class="pc-readonly-copy">
          <strong>{{ t`历史聊天只读` }}</strong>
          <p>{{ t`第一版不会切换酒馆当前聊天，因此此处禁用生成，只用于查看已保存内容。` }}</p>
        </div>
        <button
          class="pc-icon-btn"
          type="button"
          :disabled="!canJumpSelectedChat"
          :title="t`跳转酒馆聊天`"
          @click="jumpSelectedChatToTavern"
        >
          <i class="fa-solid fa-arrow-up-right-from-square"></i>
        </button>
      </div>

      <EmptyState v-if="!selectedDomains.length" :title="t`这个聊天还没有手机内容`" />

      <article v-for="domain in selectedDomains" :key="domain.appId" class="pc-domain-card">
        <div class="pc-domain-head">
          <strong>{{ domain.label }}</strong>
          <span>{{ formatDomainCount(domain) }}</span>
        </div>
        <div class="pc-domain-items">
          <div v-for="item in domain.entries.slice(0, 8)" :key="item.id" class="pc-domain-item">
            <strong>{{ item.title }}</strong>
            <small>{{ item.subtitle }}</small>
          </div>
          <EmptyState v-if="domain.entries.length > 8" compact :title="`还有 ${domain.entries.length - 8} 项未展开`" />
        </div>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import { areChatScopeKeysEquivalent } from '@/store/chatScoped';
import { usePhoneStore } from '@/store/phone';
import { normalizeBrief, type ChatHistoryBriefItem } from '@/store/reader';
import {
  buildChatScopeKey,
  createChatArchiveDomainReader,
  getUsedChatArchiveScopes,
  normalizeChatArchiveId,
  type ChatArchiveDomain,
  type ChatScopeRef,
} from '@/util/chatArchive';
import { jumpToTavernChat } from '@/util/tavernNavigation';
import { characters, getCharacters, getPastCharacterChats } from '@sillytavern/script';
import { storeToRefs } from 'pinia';

interface ArchiveOwner {
  aliases: Set<string>;
  avatar: string;
  characterId: number | null;
  initial: string;
  key: string;
  kind: 'char' | 'group';
  name: string;
  ownerId: string;
  usedChatIds: Set<string>;
}

interface ArchiveChatRow {
  contentCount: number;
  domains: ChatArchiveDomain[];
  isCurrent: boolean;
  isUsed: boolean;
  key: string;
  scopeKey: string;
  title: string;
}

const phone = usePhoneStore();
const { currentRoute: route, currentTavernScopeKey } = storeToRefs(phone);
const activeTab = ref<'used' | 'unused'>('used');
const owners = ref<ArchiveOwner[]>([]);
const chatRows = ref<ArchiveChatRow[]>([]);
const selectedChat = ref<ArchiveChatRow | null>(null);
const selectedDomains = ref<ChatArchiveDomain[]>([]);
const ownerQuery = ref('');
const loadingCharacters = ref(false);
const loadingChats = ref(false);
const error = ref('');
let characterLoadSequence = 0;
let chatLoadSequence = 0;

const activeOwner = computed(() => owners.value.find(owner => owner.key === route.value.params?.ownerKey) ?? null);
const isSelectedCurrentChat = computed(() =>
  Boolean(selectedChat.value && areChatScopeKeysEquivalent(selectedChat.value.scopeKey, currentTavernScopeKey.value)),
);
const canJumpSelectedChat = computed(() =>
  Boolean(
    selectedChat.value?.key &&
    selectedChat.value.key !== '__no_chat__' &&
    activeOwner.value &&
    activeOwner.value.characterId !== null,
  ),
);
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
    if (current.page === 'detail') {
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
    await getCharacters();
    if (requestSequence !== characterLoadSequence) return;
    const usedScopes = getUsedChatArchiveScopes();
    const usedByOwner = groupUsedScopesByOwner(usedScopes);
    const characterOwners = (Array.isArray(characters) ? characters : []).map((character, index) =>
      createCharacterOwner(character, index, usedByOwner),
    );
    const matched = new Set(characterOwners.flatMap(owner => [...owner.aliases]));
    const orphanOwners = [...usedByOwner.entries()]
      .filter(([ownerId]) => !matched.has(ownerId))
      .map(([ownerId, scopes]) => createOrphanOwner(ownerId, scopes));
    if (requestSequence === characterLoadSequence) {
      owners.value = [...characterOwners, ...orphanOwners];
    }
  } catch (caughtError) {
    if (requestSequence === characterLoadSequence) {
      error.value = caughtError instanceof Error ? caughtError.message : '读取角色卡失败';
    }
  } finally {
    if (requestSequence === characterLoadSequence) {
      loadingCharacters.value = false;
    }
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
  aliases.forEach(alias => {
    usedByOwner.get(alias)?.forEach(scope => usedChatIds.add(scope.chatId));
  });
  return {
    aliases,
    avatar,
    characterId: index,
    initial: name.slice(0, 1) || '角',
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
    characterId: null,
    initial: name.slice(0, 1) || '档',
    key: `char:${ownerId}`,
    kind: 'char',
    name,
    ownerId,
    usedChatIds: new Set(scopes.map(scope => scope.chatId)),
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
    const briefs = owner.characterId === null ? [] : await getPastCharacterChats(owner.characterId);
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
      if (!rows.has(chatId)) {
        rows.set(chatId, createChatRow(owner, chatId, formatArchiveChatTitle(chatId), domainReader));
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
    if (requestSequence === chatLoadSequence) {
      loadingChats.value = false;
    }
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
  return {
    domains: domainReader.getDomains(scopeKey),
    scopeKey,
  };
}

function formatDomainCount(domain: ChatArchiveDomain) {
  if (domain.appId === 'extras') return `${domain.collections}本`;
  if (domain.appId === 'forum') return `${domain.collections}板块`;
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

async function jumpSelectedChatToTavern() {
  const owner = activeOwner.value;
  const chat = selectedChat.value;
  if (!owner || !chat) return;

  try {
    await jumpToTavernChat({
      avatar: owner.avatar,
      chatFile: chat.key,
      characterId: owner.characterId,
      ownerName: owner.name,
    });
    phone.closePhone();
    window.setTimeout(() => void phone.syncCurrentTavernScope(true), 2400);
    toastr.success('正在跳转到酒馆聊天');
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : '跳转酒馆聊天失败';
    toastr.error(message);
  }
}
</script>

<style scoped>
.pc-archive-app,
.pc-archive-page {
  min-height: 100%;
}

.pc-archive-page,
.pc-owner-list,
.pc-chat-list,
.pc-domain-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pc-archive-search-row,
.pc-archive-hero,
.pc-status-card,
.pc-owner-row,
.pc-chat-row,
.pc-readonly-card,
.pc-domain-card {
  border: 1px solid var(--pc-border);
  border-radius: 20px;
  background: color-mix(in srgb, var(--pc-surface) 72%, transparent 28%);
  backdrop-filter: blur(12px);
}

.pc-archive-search-row,
.pc-archive-hero,
.pc-status-card,
.pc-readonly-card,
.pc-domain-card {
  padding: 14px;
}

.pc-archive-search-row,
.pc-archive-hero,
.pc-owner-row,
.pc-chat-row,
.pc-domain-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pc-archive-hero h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
}

.pc-kicker,
.pc-status-card p,
.pc-owner-main small,
.pc-chat-main small,
.pc-readonly-card p,
.pc-domain-head span,
.pc-domain-item small {
  color: var(--pc-muted);
}

.pc-tab-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--pc-border);
  border-radius: 20px;
  background: color-mix(in srgb, var(--pc-surface) 70%, transparent 30%);
}

.pc-tab-btn,
.pc-owner-row,
.pc-chat-row {
  border: 0;
  color: var(--pc-text);
  cursor: pointer;
}

.pc-tab-btn {
  min-height: 38px;
  border-radius: 999px;
  padding: 8px 12px;
  background: var(--pc-surface-strong);
}

.pc-tab-btn.active {
  background: color-mix(in srgb, var(--pc-theme-accent) 18%, var(--pc-surface-strong) 82%);
}

.pc-icon-btn .spinning {
  animation: pc-archive-spin 0.9s linear infinite;
}

@keyframes pc-archive-spin {
  to {
    transform: rotate(360deg);
  }
}

.pc-owner-row,
.pc-chat-row {
  width: 100%;
  min-height: 64px;
  padding: 12px 14px;
  text-align: left;
}

.pc-owner-avatar {
  width: 42px;
  height: 42px;
  border-radius: 15px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, #2d9cdb 16%, var(--pc-surface) 84%);
  color: #2d9cdb;
  font-weight: 700;
}

.pc-owner-main,
.pc-chat-main {
  min-width: 0;
  flex: 1 1 auto;
}

.pc-owner-main strong,
.pc-owner-main small,
.pc-chat-main strong,
.pc-chat-main small,
.pc-domain-item strong,
.pc-domain-item small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-count-pill {
  min-width: 32px;
  height: 28px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, #2d9cdb 16%, var(--pc-surface) 84%);
  color: #2d9cdb;
}

.pc-readonly-card {
  border-color: color-mix(in srgb, #f5a623 40%, var(--pc-border) 60%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pc-readonly-copy {
  min-width: 0;
}

.pc-domain-head {
  align-items: baseline;
}

.pc-domain-item {
  padding: 10px 12px;
  border-radius: 14px;
  background: var(--pc-surface-strong);
}
</style>
