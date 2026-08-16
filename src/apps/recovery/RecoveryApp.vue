<template>
  <section class="pc-recovery-app">
    <section v-if="route.page === 'root'" class="pc-recovery-page">
      <div class="pc-directory-list">
        <button class="pc-list-row pc-recovery-category-row" type="button" @click="openChatBackups">
          <span class="pc-recovery-category-icon"><i class="fa-solid fa-comments"></i></span>
          <span class="pc-list-row-copy">
            <strong>聊天备份</strong>
          </span>
          <i class="fa-solid fa-chevron-right"></i>
        </button>
        <button class="pc-list-row pc-recovery-category-row" type="button" @click="openSettingsSnapshots">
          <span class="pc-recovery-category-icon"><i class="fa-solid fa-sliders"></i></span>
          <span class="pc-list-row-copy">
            <strong>设置快照</strong>
          </span>
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    </section>

    <section v-else-if="route.page === 'chats'" class="pc-recovery-page">
      <div class="pc-compact-toolbar pc-recovery-toolbar">
        <label class="pc-search-field">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="query" type="search" placeholder="搜索角色或备份文件" />
        </label>
        <button
          class="pc-icon-btn"
          type="button"
          :disabled="recovery.loading || recovery.managementBusy"
          title="刷新备份书架"
          aria-label="刷新备份书架"
          @click="recovery.refresh"
        >
          <i :class="['fa-solid fa-rotate', { spinning: recovery.loading }]"></i>
        </button>
      </div>
      <div class="pc-recovery-management-actions">
        <button class="pc-soft-btn" type="button" :disabled="recovery.managementBusy" @click="openCleanup()">
          <i class="fa-solid fa-broom"></i><span>清理小备份</span>
        </button>
        <button class="pc-soft-btn" type="button" :disabled="recovery.managementBusy" @click="openDuplicates()">
          <i class="fa-solid fa-clone"></i><span>查找重复备份</span>
        </button>
      </div>
      <div class="pc-segment pc-recovery-sort" aria-label="角色卡排序">
        <button
          :class="['pc-segment-btn', { active: sortMode === 'recent' }]"
          type="button"
          @click="sortMode = 'recent'"
        >
          最近备份
        </button>
        <button
          :class="['pc-segment-btn', { active: sortMode === 'character' }]"
          type="button"
          @click="sortMode = 'character'"
        >
          角色名称
        </button>
      </div>

      <article v-if="recovery.loading" class="pc-section-card pc-recovery-scan-status" aria-live="polite">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>{{ recovery.groups.length ? '正在重新扫描聊天备份……' : '正在读取酒馆聊天备份……' }}</span>
      </article>

      <article v-if="recovery.error" class="pc-section-card pc-recovery-error">
        <strong>{{ recovery.status === 'unsupported' ? '版本不支持' : '读取失败' }}</strong>
        <p>{{ recovery.error }}</p>
      </article>
      <EmptyState v-if="!recovery.loading && !filteredGroups.length" :title="emptyTitle">
        <p v-if="recovery.status !== 'unsupported'">SillyTavern 生成聊天备份后会显示在这里。</p>
      </EmptyState>

      <div v-else class="pc-directory-list">
        <button
          v-for="group in filteredGroups"
          :key="group.id"
          class="pc-list-row pc-recovery-group-row"
          type="button"
          @click="openGroup(group)"
        >
          <span class="pc-recovery-avatar" aria-hidden="true">{{ groupInitial(group) }}</span>
          <span class="pc-list-row-copy">
            <strong>{{ group.label }}</strong>
            <small>{{ group.backups.length }} 份备份 · 最近 {{ formatDate(group.backups[0]?.lastMessageAt) }}</small>
            <small v-if="group.kind === 'conflict'">
              匹配到：{{ group.conflictCharacters.map(item => item.name).join('、') }}
            </small>
          </span>
          <span class="pc-recovery-count">{{ group.backups.length }}</span>
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    </section>

    <RecoverySettingsFlow
      v-else-if="['settings-snapshots', 'settings-duplicates'].includes(route.page)"
      :format-bytes="formatBytes"
      :format-date="formatDate"
    />

    <section v-else-if="route.page === 'group' && activeGroup" class="pc-recovery-page">
      <div class="pc-compact-toolbar pc-directory-toolbar">
        <span class="pc-directory-count">{{ activeGroup.backups.length }} 份备份</span>
        <div class="pc-directory-actions">
          <button
            class="pc-icon-btn"
            type="button"
            :disabled="recovery.managementBusy"
            title="查找当前角色的重复备份"
            aria-label="查找当前角色的重复备份"
            @click="openDuplicates(activeGroup.id)"
          >
            <i class="fa-solid fa-clone"></i>
          </button>
          <button
            class="pc-icon-btn"
            type="button"
            :disabled="recovery.managementBusy"
            title="清理当前角色的小备份"
            aria-label="清理当前角色的小备份"
            @click="openCleanup(activeGroup.id)"
          >
            <i class="fa-solid fa-broom"></i>
          </button>
          <button
            class="pc-icon-btn"
            type="button"
            :disabled="recovery.loading || recovery.managementBusy"
            title="刷新当前角色备份"
            aria-label="刷新当前角色备份"
            @click="recovery.refresh"
          >
            <i :class="['fa-solid fa-rotate', { spinning: recovery.loading }]"></i>
          </button>
        </div>
      </div>
      <p class="pc-recovery-group-note">
        {{ activeGroup.label }} · 最近 {{ formatDate(activeGroup.backups[0]?.lastMessageAt) }}
      </p>
      <EmptyState v-if="!activeGroup.backups.length" title="这个角色没有聊天备份" />
      <div v-else class="pc-directory-list">
        <div v-for="backup in activeGroup.backups" :key="backup.fileName" class="pc-recovery-backup-row">
          <button
            class="pc-list-row pc-recovery-backup-open"
            type="button"
            :disabled="recovery.reading || recovery.managementBusy"
            @click="openBackup(backup)"
          >
            <span class="pc-recovery-book-icon"><i class="fa-solid fa-book"></i></span>
            <span class="pc-list-row-copy">
              <strong>{{ formatDate(backup.lastMessageAt) }}</strong>
              <small>{{ backup.fileName }}</small>
              <small
                >{{ backup.fileSize }} · {{ backup.chatItems }} 层 · {{ backup.lastMessage || '没有消息摘要' }}</small
              >
            </span>
            <i class="fa-solid fa-chevron-right"></i>
          </button>
          <button
            class="pc-icon-btn danger"
            type="button"
            :disabled="recovery.managementBusy"
            :title="`永久删除 ${backup.fileName}`"
            :aria-label="`永久删除 ${backup.fileName}`"
            @click="confirmDeleteBackup(backup)"
          >
            <i
              :class="[
                'fa-solid',
                recovery.deletingFileName === backup.fileName ? 'fa-spinner spinning' : 'fa-trash-can',
              ]"
            ></i>
          </button>
        </div>
      </div>
    </section>

    <RecoveryReadImportFlow
      v-else-if="['reader', 'confirm', 'result'].includes(route.page)"
      :confirm-delete-backup="confirmDeleteBackup"
      :format-date="formatDate"
    />

    <EmptyState v-else-if="!['duplicates', 'cleanup'].includes(route.page)" title="备份管理页面状态已失效" />
    <RecoveryMaintenanceFlow
      v-show="['duplicates', 'cleanup'].includes(route.page)"
      :format-backup-created-at="formatBackupCreatedAt"
      :format-bytes="formatBytes"
      :format-date="formatDate"
      :open-backup="openBackup"
    />
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import RecoveryMaintenanceFlow from '@/apps/recovery/RecoveryMaintenanceFlow.vue';
import RecoveryReadImportFlow from '@/apps/recovery/RecoveryReadImportFlow.vue';
import RecoverySettingsFlow from '@/apps/recovery/RecoverySettingsFlow.vue';
import type { ChatBackupGroup, ChatBackupSummary } from '@/apps/recovery/model';
import { useChatRecoveryStore } from '@/apps/recovery/store';
import { usePhoneStore } from '@/store/phone';

const phone = usePhoneStore();
const recovery = useChatRecoveryStore();
const route = computed(() => phone.currentRoute);
const query = ref('');
const sortMode = ref<'character' | 'recent'>('recent');

const activeGroup = computed(() => recovery.groups.find(group => group.id === route.value.params?.groupId) ?? null);
const filteredGroups = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase();
  const groups = recovery.groups.filter(
    group =>
      !needle ||
      `${group.label} ${group.backups.map(backup => `${backup.fileName} ${backup.lastMessage}`).join(' ')}`
        .toLocaleLowerCase()
        .includes(needle),
  );
  if (sortMode.value === 'character') return [...groups].sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
  return [...groups].sort((a, b) => (b.backups[0]?.lastMessageAt ?? 0) - (a.backups[0]?.lastMessageAt ?? 0));
});
const emptyTitle = computed(() =>
  recovery.status === 'unsupported'
    ? '当前版本不支持备份书架'
    : query.value.trim()
      ? '没有匹配的聊天备份'
      : '还没有聊天备份',
);

onBeforeUnmount(() => {
  recovery.releaseActiveBackup();
});
watch(
  () => route.value.page,
  page => {
    if (!['reader', 'confirm', 'result'].includes(page)) recovery.releaseActiveBackup();
  },
  { immediate: true },
);
function formatDate(value?: number) {
  if (!value) return '时间未知';
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value));
}

function formatBackupCreatedAt(summary: ChatBackupSummary) {
  return summary.backupCreatedAt ? formatDate(summary.backupCreatedAt) : summary.fileName;
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / 1024 / 1024).toFixed(2)} MiB`;
}

function groupInitial(group: ChatBackupGroup) {
  return (group.character?.name || group.label).trim().slice(0, 1).toUpperCase() || '?';
}

function openGroup(group: ChatBackupGroup) {
  phone.pushPage('group', group.label, { groupId: group.id });
}

async function openChatBackups() {
  phone.pushPage('chats', '聊天备份');
  if (recovery.status === 'idle') {
    try {
      await recovery.refresh();
    } catch {
      // The page renders the store error with a retry action.
    }
  }
}

function openSettingsSnapshots() {
  phone.pushPage('settings-snapshots', '设置快照');
}

async function openBackup(summary: ChatBackupSummary) {
  try {
    await recovery.readBackup(summary);
    phone.pushPage('reader', '阅读聊天备份', {
      fileName: summary.fileName,
      groupId: activeGroup.value?.id ?? '',
      from: route.value.page,
    });
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '读取聊天备份失败');
  }
}

function backupGroupLabel(summary: ChatBackupSummary) {
  return (
    recovery.groups.find(group => group.backups.some(backup => backup.fileName === summary.fileName))?.label ??
    '未知角色'
  );
}

async function confirmDeleteBackup(summary: ChatBackupSummary, navigateWhenGroupEmpty = true) {
  const confirmed = await phone.confirmNotice(
    `角色分组：${backupGroupLabel(summary)}\n文件：${summary.fileName}\n时间：${formatDate(summary.lastMessageAt)}\n楼层：${summary.chatItems}\n\n此操作会永久删除备份，但不会删除已有聊天。`,
    { confirmLabel: '永久删除备份', kind: 'warning', title: '确认删除聊天备份' },
  );
  if (!confirmed) return false;
  try {
    await recovery.deleteBackup(summary);
    toastr.success('聊天备份已删除');
    if (navigateWhenGroupEmpty && !recovery.groups.some(group => group.id === route.value.params?.groupId)) {
      phone.replacePage('root', '酒馆备份管理');
    }
    return true;
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '删除聊天备份失败');
    return false;
  }
}

function openCleanup(groupId = '') {
  recovery.resetCleanup();
  phone.pushPage('cleanup', groupId ? '清理角色备份' : '快速清理备份', groupId ? { groupId } : {});
}

function openDuplicates(groupId = '') {
  recovery.resetDuplicates();
  phone.pushPage('duplicates', groupId ? '当前角色备份查重' : '重复备份查找', groupId ? { groupId } : {});
}

</script>

<style scoped>
.pc-recovery-app,
.pc-recovery-page {
  display: flex;
  min-height: 0;
  flex-direction: column;
}

.pc-recovery-app {
  height: 100%;
}

.pc-recovery-page {
  flex: 1 1 auto;
  gap: 10px;
}

.pc-recovery-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
}

.pc-recovery-category-row {
  grid-template-columns: 42px minmax(0, 1fr) 14px;
}

.pc-recovery-category-icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: var(--pc-control-radius);
  background: color-mix(in srgb, var(--pc-theme-accent) 15%, var(--pc-surface-strong) 85%);
  color: var(--pc-theme-accent);
}

.pc-recovery-scan-status {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  color: var(--pc-theme-accent);
}

.pc-recovery-scan-status progress {
  grid-column: 1 / -1;
  width: 100%;
  accent-color: var(--pc-theme-accent);
}

.pc-recovery-management-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.pc-recovery-management-actions .pc-soft-btn {
  min-width: 0;
}

.pc-recovery-sort {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.pc-recovery-group-row {
  grid-template-columns: 42px minmax(0, 1fr) auto 14px;
}

.pc-recovery-group-row,
.pc-recovery-backup-open {
  min-width: 0;
  overflow: hidden;
}

.pc-recovery-avatar,
.pc-recovery-book-icon {
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: color-mix(in srgb, var(--pc-theme-accent) 16%, var(--pc-surface) 84%);
  color: var(--pc-theme-accent);
}

.pc-recovery-avatar {
  width: 42px;
  height: 42px;
  font-weight: 800;
}

.pc-recovery-count {
  display: grid;
  min-width: 30px;
  height: 28px;
  place-items: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pc-theme-accent) 16%, var(--pc-surface) 84%);
  color: var(--pc-theme-accent);
  font-size: 12px;
  font-weight: 800;
}

.pc-recovery-group-row > i,
.pc-recovery-backup-open > i {
  color: var(--pc-muted);
}

.pc-recovery-backup-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--pc-border);
}

.pc-recovery-backup-row:last-child {
  border-bottom: 0;
}

.pc-recovery-backup-open {
  grid-template-columns: 38px minmax(0, 1fr) 14px;
  border-bottom: 0;
}

.pc-recovery-book-icon {
  width: 38px;
  height: 48px;
}

.pc-recovery-group-note,
.pc-recovery-error p {
  margin: 0;
}

.pc-recovery-group-note {
  color: var(--pc-muted);
}

.pc-recovery-error {
  display: grid;
  gap: 10px;
}

.pc-recovery-backup-open .pc-list-row-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

</style>
