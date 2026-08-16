<template>
  <section class="pc-archive-app">
    <section v-if="route.page === 'root'" class="pc-archive-page">
      <div v-if="activeTab !== 'current'" class="pc-compact-toolbar pc-archive-search-row">
        <label class="pc-search-field">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="ownerQuery" type="search" :placeholder="t`搜索角色卡`" />
        </label>
        <button
          class="pc-icon-btn"
          type="button"
          :aria-label="t`刷新`"
          :disabled="loadingCharacters"
          :title="t`刷新`"
          @click="loadCharacters(true)"
        >
          <i :class="['fa-solid fa-rotate-right', { spinning: loadingCharacters }]"></i>
        </button>
      </div>

      <div class="pc-segment pc-tab-row">
        <button
          :class="['pc-segment-btn', { active: activeTab === 'current' }]"
          type="button"
          @click="activeTab = 'current'"
        >
          {{ t`当前聊天` }}
        </button>
        <button :class="['pc-segment-btn', { active: activeTab === 'used' }]" type="button" @click="activeTab = 'used'">
          {{ t`已用过` }}
        </button>
        <button
          :class="['pc-segment-btn', { active: activeTab === 'unused' }]"
          type="button"
          @click="activeTab = 'unused'"
        >
          {{ t`未使用` }}
        </button>
      </div>

      <div v-if="error" class="pc-status-card danger">
        <strong>{{ t`读取失败` }}</strong>
        <p>{{ error }}</p>
      </div>
      <div v-if="floorBackupError" class="pc-status-card">
        <strong>{{ t`楼层备份暂不可用` }}</strong>
        <p>{{ floorBackupError }}</p>
      </div>

      <article
        v-if="activeTab === 'current' && currentChatRow && currentOwner"
        class="pc-page-section pc-current-chat-card"
      >
        <div class="pc-current-chat-heading">
          <span class="pc-owner-avatar">
            <img
              v-if="currentOwner.avatarUrl && !failedAvatars.has(currentOwner.key)"
              :src="currentOwner.avatarUrl"
              :alt="currentOwner.name"
              @error="markAvatarFailed(currentOwner.key)"
            />
            <span v-else>{{ currentOwner.initial }}</span>
          </span>
          <span class="pc-owner-main">
            <strong>{{ currentOwner.name }}</strong>
            <small>{{ currentChatRow.title }}</small>
          </span>
        </div>
        <div :class="['pc-status-card', { danger: currentBackupIsLonger }]">
          <strong>{{
            currentFloorBackup ? `已备份 ${currentFloorBackup.messages.length} 层` : t`尚无楼层备份`
          }}</strong>
          <p v-if="currentBackupIsLonger">
            {{ t`本地备份比当前聊天更长。保存时会再次要求确认，导出不会覆盖旧备份。` }}
          </p>
          <p v-else>
            {{
              currentFloorBackup ? formatBackupTime(currentFloorBackup.updatedAt) : t`可立即保存当前用户与 AI 楼层。`
            }}
          </p>
        </div>
        <div class="pc-archive-backup-actions">
          <button
            class="pc-primary-btn"
            type="button"
            :disabled="savingFloorBackup"
            @click="saveCurrentFloorBackupFromRoot"
          >
            {{ savingFloorBackup ? t`保存中…` : t`立即备份` }}
          </button>
          <button class="pc-soft-btn" type="button" :disabled="!currentFloorBackup" @click="openCurrentFloorBackup">
            {{ t`阅读备份` }}
          </button>
          <button class="pc-soft-btn" type="button" :disabled="!currentFloorBackup" @click="exportCurrentFloorBackup">
            {{ t`导出备份` }}
          </button>
          <button class="pc-soft-btn" type="button" @click="currentFloorBackupInputEl?.click()">
            {{ t`导入备份` }}
          </button>
          <button
            v-if="currentFloorBackup"
            class="pc-soft-btn"
            type="button"
            :disabled="restoringFloorBackup"
            @click="restoreCurrentFloorBackup"
          >
            {{ restoringFloorBackup ? t`插入中…` : t`插入空聊天` }}
          </button>
        </div>
        <input
          ref="currentFloorBackupInputEl"
          class="pc-hidden-input"
          type="file"
          accept="application/json,.json"
          @change="onCurrentFloorBackupSelected"
        />
      </article>

      <EmptyState
        v-if="activeTab === 'current' && !currentChatRow && !loadingCharacters"
        :title="t`酒馆当前没有打开角色聊天`"
      />

      <EmptyState
        v-if="activeTab !== 'current' && !visibleOwners.length && !loadingCharacters"
        :title="activeTab === 'used' ? t`还没有用过手机创作的角色` : t`没有未使用角色`"
      />

      <div v-else-if="activeTab !== 'current'" class="pc-directory-list pc-owner-list">
        <button
          v-for="owner in visibleOwners"
          :key="owner.key"
          class="pc-list-row pc-owner-row"
          type="button"
          @click="openOwner(owner)"
        >
          <span class="pc-owner-avatar">
            <img
              v-if="owner.avatarUrl && !failedAvatars.has(owner.key)"
              :src="owner.avatarUrl"
              :alt="owner.name"
              @error="markAvatarFailed(owner.key)"
            />
            <span v-else>{{ owner.initial }}</span>
          </span>
          <span class="pc-owner-main">
            <strong>{{ owner.name }}</strong>
            <small>{{ formatOwnerSummary(owner) }}</small>
          </span>
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    </section>

    <section v-else-if="route.page === 'chats' && activeOwner" class="pc-archive-page">
      <div class="pc-compact-toolbar pc-directory-toolbar pc-archive-toolbar">
        <span class="pc-directory-count">{{ chatRows.length }} {{ t`个聊天` }}</span>
        <button
          class="pc-icon-btn"
          type="button"
          :aria-label="t`刷新聊天`"
          :disabled="loadingChats"
          :title="t`刷新聊天`"
          @click="loadChatsForActiveOwner(true)"
        >
          <i :class="['fa-solid fa-rotate-right', { spinning: loadingChats }]"></i>
        </button>
      </div>

      <EmptyState v-if="!chatRows.length && !loadingChats" :title="t`暂无聊天`" />

      <div v-else class="pc-directory-list pc-chat-list">
        <button
          v-for="chat in chatRows"
          :key="chat.key"
          class="pc-list-row pc-chat-row"
          type="button"
          @click="openChat(chat)"
        >
          <span class="pc-chat-main">
            <strong>{{ chat.title }}</strong>
            <small>
              {{ chat.isUsed ? '有手机内容' : '无手机内容'
              }}{{ chat.floorBackup ? ` · 已备份 ${chat.floorBackup.messages.length} 层` : ''
              }}{{ chat.isCurrent ? ' · 当前聊天' : '' }}
            </small>
          </span>
          <span v-if="chat.isUsed" class="pc-count-pill">{{ chat.contentCount }}</span>
        </button>
      </div>
    </section>

    <section v-else-if="route.page === 'detail' && activeOwner && selectedChat" class="pc-archive-page">
      <article class="pc-page-section pc-floor-backup-card">
        <div class="pc-domain-head">
          <div>
            <strong>{{ t`聊天楼层备份` }}</strong>
            <small>{{ floorBackupSummary }}</small>
          </div>
          <i class="fa-solid fa-shield-halved"></i>
        </div>
        <div class="pc-archive-backup-actions">
          <button class="pc-soft-btn" type="button" :disabled="!selectedFloorBackup" @click="openFloorBackup">
            {{ t`阅读备份` }}
          </button>
          <button class="pc-soft-btn" type="button" :disabled="!selectedFloorBackup" @click="exportSelectedFloorBackup">
            {{ t`导出备份` }}
          </button>
          <button class="pc-soft-btn" type="button" @click="floorBackupInputEl?.click()">
            {{ t`导入备份` }}
          </button>
          <button
            class="pc-primary-btn"
            type="button"
            :disabled="!isSelectedCurrentChat || savingFloorBackup"
            @click="saveCurrentFloorBackup"
          >
            {{ savingFloorBackup ? t`保存中…` : t`立即备份` }}
          </button>
          <button class="pc-soft-btn" type="button" :disabled="!canRenameSelectedChat" @click="renameSelectedChat">
            {{ t`聊天改名` }}
          </button>
          <button class="pc-soft-btn" type="button" :disabled="!selectedFloorBackup" @click="deleteSelectedFloorBackup">
            {{ t`删除备份` }}
          </button>
        </div>
        <input
          ref="floorBackupInputEl"
          class="pc-hidden-input"
          type="file"
          accept="application/json,.json"
          @change="onFloorBackupSelected"
        />
      </article>

      <div v-if="!isSelectedCurrentChat" class="pc-page-section pc-readonly-card">
        <div class="pc-readonly-copy">
          <strong>{{ t`历史聊天只读` }}</strong>
          <p>{{ t`第一版不会切换酒馆当前聊天，因此此处禁用生成，只用于查看已保存内容。` }}</p>
        </div>
        <div class="pc-readonly-actions">
          <button
            v-if="canMigrateSelectedChat"
            class="pc-icon-btn"
            type="button"
            :aria-label="t`迁移到当前聊天`"
            :disabled="migratingChat"
            :title="t`迁移到当前聊天`"
            @click="migrateSelectedChatToCurrent"
          >
            <i :class="['fa-solid', migratingChat ? 'fa-spinner spinning' : 'fa-right-left']"></i>
          </button>
          <button
            class="pc-icon-btn"
            type="button"
            :aria-label="t`跳转酒馆聊天`"
            :disabled="!canJumpSelectedChat"
            :title="t`跳转酒馆聊天`"
            @click="jumpSelectedChatToTavern"
          >
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </button>
        </div>
      </div>

      <EmptyState v-if="!selectedDomains.length" :title="t`这个聊天还没有手机内容`" />

      <article v-for="domain in selectedDomains" :key="domain.appId" class="pc-page-section pc-domain-card">
        <div class="pc-domain-head">
          <strong>{{ domain.label }}</strong>
          <span>{{ formatDomainCount(domain) }}</span>
        </div>
        <div class="pc-directory-list pc-domain-items">
          <div v-for="item in domain.entries.slice(0, 8)" :key="item.id" class="pc-list-row pc-domain-item">
            <strong>{{ item.title }}</strong>
            <small>{{ item.subtitle }}</small>
          </div>
          <EmptyState v-if="domain.entries.length > 8" compact :title="`还有 ${domain.entries.length - 8} 项未展开`" />
        </div>
      </article>
    </section>

    <ChatArchiveFloorBackupPage
      v-else-if="route.page === 'floor-backup' && selectedFloorBackup"
      :backup="selectedFloorBackup"
      :export-backup="exportSelectedFloorBackup"
      :format-backup-time="formatBackupTime"
      :is-current-chat="isSelectedCurrentChat"
      :restore-backup="restoreSelectedFloorBackup"
      :restoring="restoringFloorBackup"
    />
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import ChatArchiveFloorBackupPage from '@/components/archive/ChatArchiveFloorBackupPage.vue';
import {
  useChatArchiveCatalogSession,
  type ArchiveOwner,
  type ArchiveChatRow,
} from '@/components/archive/useChatArchiveCatalogSession';
import { areChatScopeKeysEquivalent } from '@/store/chatScoped';
import { useGenerationTaskStore } from '@/store/generationTasks';
import { usePhoneStore } from '@/store/phone';
import { getChatScopeMigrationSourceKeys, migratePhoneChatScopes } from '@/util/chatScopeRename';
import {
  createChatArchiveDomainReader,
  normalizeChatArchiveId,
} from '@/util/chatArchive';
import { jumpToTavernChat } from '@/util/tavernNavigation';
import {
  captureCurrentChatFloorBackup,
  deleteChatFloorBackup,
  downloadChatFloorBackup,
  getCurrentChatFloorMessageCount,
  isChatFloorBackupForTarget,
  parseChatFloorBackupFile,
  restoreChatFloorBackupToCurrent,
  saveChatFloorBackup,
  type ChatFloorBackup,
} from '@/util/chatFloorBackup';
import { renameTavernCharacterChat } from '@/util/tavernChatRename';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const generationTasks = useGenerationTaskStore();
const { currentRoute: route, currentTavernScopeKey } = storeToRefs(phone);
const {
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
  refreshSelectedChatRow,
  selectedChat,
  selectedDomains,
  visibleOwners,
} = useChatArchiveCatalogSession();
const migratingChat = ref(false);
const restoringFloorBackup = ref(false);
const savingFloorBackup = ref(false);
const floorBackupInputEl = ref<HTMLInputElement | null>(null);
const currentFloorBackupInputEl = ref<HTMLInputElement | null>(null);
const currentFloorBackup = computed(() => currentChatRow.value?.floorBackup ?? null);
const currentBackupIsLonger = computed(() =>
  Boolean(currentFloorBackup.value && currentFloorBackup.value.messages.length > getCurrentChatFloorMessageCount()),
);
const selectedFloorBackup = computed(() => selectedChat.value?.floorBackup ?? null);
const floorBackupSummary = computed(() => {
  const backup = selectedFloorBackup.value;
  if (!backup)
    return isSelectedCurrentChat.value ? '尚无备份，可立即保存当前楼层' : '尚无备份；需先在酒馆打开该聊天才能建立';
  return `${backup.messages.length} 层 · ${formatBackupTime(backup.updatedAt)}`;
});
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
const canRenameSelectedChat = computed(() =>
  Boolean(
    selectedChat.value?.key &&
    selectedChat.value.key !== '__no_chat__' &&
    activeOwner.value?.kind === 'char' &&
    activeOwner.value.characterId !== null,
  ),
);
const canMigrateSelectedChat = computed(() => {
  if (!selectedChat.value?.isUsed || selectedChat.value.isCurrent || !activeOwner.value) return false;
  const target = currentScope.value;
  if (target.kind !== activeOwner.value.kind) return false;
  return activeOwner.value.aliases.has(target.ownerId);
});

function formatBackupTime(value: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return '时间未知';
  return new Date(timestamp).toLocaleString('zh-CN', { hour12: false });
}

function openFloorBackup() {
  if (!selectedChat.value || !selectedFloorBackup.value) return;
  phone.pushPage('floor-backup', '阅读楼层备份', {
    chatKey: selectedChat.value.key,
    ownerKey: activeOwner.value?.key || '',
  });
}

function exportSelectedFloorBackup() {
  const backup = selectedFloorBackup.value;
  if (!backup) return;
  downloadChatFloorBackup(backup);
  toastr.success('已开始导出聊天楼层备份');
}

async function captureCurrentFloorBackupWithConfirmation() {
  let result = await captureCurrentChatFloorBackup();
  if (result.status === 'protected-smaller') {
    const confirmed = await phone.confirmNotice(
      `现有备份有 ${result.backup.messages.length} 层，当前聊天只有 ${result.currentMessageCount} 层。要确认用较短的当前聊天替换备份吗？`,
      { confirmLabel: '替换备份', kind: 'warning' },
    );
    if (!confirmed) return null;
    result = await captureCurrentChatFloorBackup({ force: true });
  }
  if (result.status === 'empty' || result.status === 'unavailable') {
    toastr.warning(result.status === 'empty' ? '当前聊天没有可备份的用户或 AI 楼层' : '当前聊天身份无法识别');
    return null;
  }
  return result;
}

async function saveCurrentFloorBackup() {
  if (!isSelectedCurrentChat.value || savingFloorBackup.value) return;
  savingFloorBackup.value = true;
  try {
    const result = await captureCurrentFloorBackupWithConfirmation();
    if (!result) return;
    await refreshSelectedChatRow();
    toastr.success(result.status === 'unchanged' ? '楼层备份已经是最新内容' : '已保存当前聊天楼层备份');
  } catch (caughtError) {
    toastr.error(caughtError instanceof Error ? caughtError.message : '保存聊天楼层备份失败');
  } finally {
    savingFloorBackup.value = false;
  }
}

async function saveCurrentFloorBackupFromRoot() {
  if (!currentChatRow.value || savingFloorBackup.value) return;
  savingFloorBackup.value = true;
  try {
    const result = await captureCurrentFloorBackupWithConfirmation();
    if (!result) return;
    await loadCharacters(true);
    toastr.success(result.status === 'unchanged' ? '楼层备份已经是最新内容' : '已保存当前聊天楼层备份');
  } catch (caughtError) {
    toastr.error(caughtError instanceof Error ? caughtError.message : '保存聊天楼层备份失败');
  } finally {
    savingFloorBackup.value = false;
  }
}

async function openCurrentChatDetail() {
  const owner = currentOwner.value;
  const chatId = currentChatRow.value?.key;
  if (!owner || !chatId) return false;
  selectedChat.value = null;
  selectedDomains.value = [];
  chatRows.value = [];
  phone.pushPage('chats', owner.name, { ownerKey: owner.key });
  await nextTick();
  await loadChatsForActiveOwner(true);
  const row = chatRows.value.find(chat => chat.key === chatId || chat.isCurrent);
  if (!row) {
    toastr.error('无法在角色聊天列表中定位当前聊天');
    return false;
  }
  await openChat(row);
  return true;
}

async function openCurrentFloorBackup() {
  if (!currentFloorBackup.value || !(await openCurrentChatDetail())) return;
  openFloorBackup();
}

function exportCurrentFloorBackup() {
  const backup = currentFloorBackup.value;
  if (!backup) return;
  downloadChatFloorBackup(backup);
  toastr.success('已开始导出聊天楼层备份，未覆盖现有备份');
}

async function importFloorBackupFor(file: File, owner: ArchiveOwner, chat: ArchiveChatRow) {
  const backup = await parseChatFloorBackupFile(file);
  if (
    !isChatFloorBackupForTarget(backup, {
      aliases: owner.aliases,
      avatar: owner.avatar,
      chatId: chat.key,
      kind: owner.kind,
    })
  ) {
    throw new Error('备份中的角色卡或聊天名与当前档案不一致，已停止导入');
  }
  const existing = chat.floorBackup;
  if (
    existing &&
    !(await phone.confirmNotice(
      `当前已有 ${existing.messages.length} 层的备份。要用导入文件中的 ${backup.messages.length} 层替换吗？`,
      { confirmLabel: '导入并替换', kind: 'warning' },
    ))
  ) {
    return false;
  }
  await saveChatFloorBackup(backup);
  return true;
}

async function onFloorBackupSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  const owner = activeOwner.value;
  const chat = selectedChat.value;
  if (!file || !owner || !chat) return;
  try {
    if (!(await importFloorBackupFor(file, owner, chat))) return;
    await refreshSelectedChatRow();
    toastr.success('已导入到本地备份库，尚未写入聊天');
  } catch (caughtError) {
    toastr.error(caughtError instanceof Error ? caughtError.message : '导入聊天楼层备份失败');
  }
}

async function onCurrentFloorBackupSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  const owner = currentOwner.value;
  const chat = currentChatRow.value;
  if (!file || !owner || !chat) return;
  try {
    if (!(await importFloorBackupFor(file, owner, chat))) return;
    await loadCharacters(true);
    toastr.success('已导入到当前聊天的本地备份位置，尚未写入真实楼层');
  } catch (caughtError) {
    toastr.error(caughtError instanceof Error ? caughtError.message : '导入聊天楼层备份失败');
  }
}

async function restoreSelectedFloorBackup() {
  const backup = selectedFloorBackup.value;
  if (!backup || restoringFloorBackup.value) return;
  if (!isSelectedCurrentChat.value) {
    toastr.error('酒馆当前打开的不是这份档案对应的聊天，不能插入');
    return;
  }
  await restoreFloorBackup(backup);
}

async function restoreCurrentFloorBackup() {
  const backup = currentFloorBackup.value;
  if (!backup || restoringFloorBackup.value) return;
  await restoreFloorBackup(backup);
}

async function restoreFloorBackup(backup: ChatFloorBackup) {
  if (generationTasks.hasRunningTasks) {
    toastr.warning('请先暂停正在运行的生成任务，再插入聊天楼层');
    return;
  }
  await phone.syncCurrentTavernScope(true);
  const confirmed = await phone.confirmNotice(
    `确认把备份中的 ${backup.messages.length} 个用户/AI 楼层插入当前空聊天吗？程序会再次检查聊天确实为空。`,
    { confirmLabel: '插入空聊天', kind: 'warning' },
  );
  if (!confirmed) return;

  restoringFloorBackup.value = true;
  try {
    await restoreChatFloorBackupToCurrent(backup);
    await phone.syncCurrentTavernScope(true);
    toastr.success(`已插入 ${backup.messages.length} 个聊天楼层`);
  } catch (caughtError) {
    toastr.error(caughtError instanceof Error ? caughtError.message : '插入聊天楼层失败');
  } finally {
    restoringFloorBackup.value = false;
  }
}

async function deleteSelectedFloorBackup() {
  const backup = selectedFloorBackup.value;
  if (!backup) return;
  const confirmed = await phone.confirmNotice(
    `删除“${backup.chat.title || backup.chat.id}”的本地楼层备份？这不会删除酒馆聊天，但删除后只能重新导入或重新备份。`,
    { confirmLabel: '删除备份', kind: 'warning' },
  );
  if (!confirmed) return;
  try {
    await deleteChatFloorBackup(backup.key);
    await refreshSelectedChatRow();
    toastr.success('已删除本地楼层备份');
  } catch (caughtError) {
    toastr.error(caughtError instanceof Error ? caughtError.message : '删除本地楼层备份失败');
  }
}

async function renameSelectedChat() {
  const owner = activeOwner.value;
  const chat = selectedChat.value;
  if (!owner || !chat || owner.kind !== 'char' || owner.characterId === null) return;
  const requested = await phone.promptNotice('输入新的酒馆聊天名。改名成功后，手机内容与本地楼层备份会一起迁移。', {
    confirmLabel: '改名',
    initialValue: chat.title,
    placeholder: '聊天名',
    title: '聊天改名',
  });
  const newName = requested?.trim();
  if (!newName || newName === chat.title) return;
  const confirmed = await phone.confirmNotice(`确认把“${chat.title}”改名为“${newName}”吗？`, {
    confirmLabel: '确认改名',
    kind: 'warning',
  });
  if (!confirmed) return;

  try {
    const renamedName = await renameTavernCharacterChat({
      avatar: owner.avatar,
      characterId: owner.characterId,
      isCurrent: chat.isCurrent,
      newName,
      oldName: chat.key,
    });
    if (chat.isCurrent) await phone.syncCurrentTavernScope(true);
    await loadFloorBackupsSafe().then(backups => (floorBackups.value = backups));
    owner.usedChatIds.delete(normalizeChatArchiveId(chat.key));
    owner.usedChatIds.add(normalizeChatArchiveId(renamedName));
    await loadChatsForActiveOwner(true);
    const renamedChat = chatRows.value.find(item => item.key === normalizeChatArchiveId(renamedName)) ?? null;
    selectedChat.value = renamedChat;
    selectedDomains.value = renamedChat?.domains ?? [];
    if (renamedChat) {
      await phone.setViewingScope(renamedChat.scopeKey, { chatTitle: renamedChat.title, ownerName: owner.name }, true);
      phone.replacePage('detail', renamedChat.title, { chatKey: renamedChat.key, ownerKey: owner.key });
    }
    toastr.success(`聊天已改名为“${renamedName}”`);
  } catch (caughtError) {
    toastr.error(caughtError instanceof Error ? caughtError.message : '聊天改名失败');
  }
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

async function migrateSelectedChatToCurrent() {
  const sourceChat = selectedChat.value;
  const owner = activeOwner.value;
  if (!sourceChat || !owner || migratingChat.value) return;

  await phone.syncCurrentTavernScope();
  const targetScopeKey = currentTavernScopeKey.value;
  const targetDomains = createChatArchiveDomainReader().getDomains(targetScopeKey);
  if (targetDomains.length) {
    toastr.error('当前聊天已经有手机内容。为避免覆盖，请先整理或备份当前聊天后再迁移。');
    return;
  }

  const sourceScopeKeys = getChatScopeMigrationSourceKeys(sourceChat.scopeKey, targetScopeKey);
  if (!sourceScopeKeys.length) {
    toastr.error('旧档案与当前聊天不属于同一角色卡，无法迁移。');
    return;
  }
  const confirmed = await phone.confirmNotice(
    `把“${sourceChat.title}”的手机内容迁移到当前聊天吗？迁移后旧档案将不再保留。`,
    {
      confirmLabel: '迁移',
      kind: 'warning',
      title: '迁移手机内容？',
    },
  );
  if (!confirmed) return;

  migratingChat.value = true;
  try {
    const result = migratePhoneChatScopes(sourceScopeKeys, targetScopeKey);
    if (!result.migrated) {
      toastr.warning('没有找到可迁移的旧档案数据。');
      return;
    }

    await phone.setViewingScope(targetScopeKey, { chatTitle: '当前聊天', ownerName: owner.name }, true);
    await loadChatsForActiveOwner(true);
    const currentChat = chatRows.value.find(chat => chat.isCurrent);
    if (currentChat) {
      selectedChat.value = currentChat;
      selectedDomains.value = currentChat.domains;
      phone.replacePage('detail', currentChat.title, {
        chatKey: currentChat.key,
        ownerKey: owner.key,
      });
    }
    toastr.success('旧档案已迁移到当前聊天。');
  } finally {
    migratingChat.value = false;
  }
}
</script>

<style scoped>
.pc-archive-app,
.pc-archive-page {
  min-height: 100%;
}

.pc-archive-page,
.pc-domain-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pc-status-card {
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  background: var(--pc-surface);
}

.pc-archive-search-row,
.pc-archive-toolbar {
  min-width: 0;
}

.pc-archive-search-row,
.pc-domain-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pc-archive-search-row .pc-search-field {
  min-width: 0;
  flex: 1 1 auto;
}

.pc-status-card p,
.pc-owner-main small,
.pc-chat-main small,
.pc-readonly-card p,
.pc-domain-head span,
.pc-domain-item small {
  color: var(--pc-muted);
}

.pc-tab-row {
  width: 100%;
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
  min-height: 64px;
}

.pc-current-chat-card {
  display: grid;
  gap: 12px;
}

.pc-current-chat-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.pc-owner-row {
  grid-template-columns: 40px minmax(0, 1fr) 18px;
  min-height: 56px;
  gap: 10px;
  padding: 8px 0;
}

.pc-owner-avatar {
  width: 40px;
  height: 40px;
  border-radius: min(var(--pc-control-radius), 8px);
  display: grid;
  place-items: center;
  background: color-mix(in srgb, #2d9cdb 16%, var(--pc-surface) 84%);
  color: #2d9cdb;
  font-weight: 700;
  overflow: hidden;
}

.pc-owner-avatar img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.pc-owner-main,
.pc-chat-main {
  min-width: 0;
  flex: 1 1 auto;
}

.pc-owner-main {
  display: grid;
  gap: 2px;
}

.pc-owner-main strong {
  font-size: 15px;
  line-height: 1.35;
}

.pc-owner-main small {
  font-size: 12px;
  line-height: 1.3;
}

.pc-owner-row > i {
  justify-self: end;
  color: var(--pc-muted);
  font-size: 13px;
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom-color: color-mix(in srgb, #f5a623 55%, var(--pc-border) 45%);
}

.pc-readonly-copy {
  min-width: 0;
}

.pc-readonly-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}

.pc-domain-head {
  align-items: baseline;
}

.pc-domain-head > div {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.pc-domain-head small {
  color: var(--pc-muted);
}

.pc-floor-backup-card .pc-domain-head > i {
  color: var(--pc-theme-accent);
}

.pc-archive-backup-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.pc-archive-backup-actions > button {
  min-width: 0;
}

.pc-domain-item {
  display: block;
}
</style>
