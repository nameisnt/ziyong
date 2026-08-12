<template>
  <section class="pc-recovery-app">
    <section v-if="route.page === 'root'" class="pc-recovery-page">
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

    <section v-else-if="route.page === 'group' && activeGroup" class="pc-recovery-page">
      <div class="pc-compact-toolbar pc-directory-toolbar">
        <span class="pc-directory-count">{{ activeGroup.backups.length }} 份备份</span>
        <div class="pc-directory-actions">
          <button
            class="pc-icon-btn"
            type="button"
            :disabled="recovery.managementBusy"
            title="查找当前角色的重复备份"
            @click="openDuplicates(activeGroup.id)"
          >
            <i class="fa-solid fa-clone"></i>
          </button>
          <button
            class="pc-icon-btn"
            type="button"
            :disabled="recovery.managementBusy"
            title="清理当前角色的小备份"
            @click="openCleanup(activeGroup.id)"
          >
            <i class="fa-solid fa-broom"></i>
          </button>
          <button
            class="pc-icon-btn"
            type="button"
            :disabled="recovery.loading || recovery.managementBusy"
            title="刷新当前角色备份"
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

    <section v-else-if="route.page === 'duplicates'" class="pc-recovery-page">
      <article class="pc-section-card pc-recovery-duplicate-config">
        <div class="pc-section-head">
          <strong>完全一致查重</strong>
          <span>{{ duplicateScopeLabel }}</span>
        </div>
        <p class="pc-recovery-safety-note">
          <i class="fa-solid fa-shield-halved"></i>
          只匹配同一角色分组内原始 JSONL 字节长度和 SHA-256 都完全一致的文件。每组固定保留备份时间最新的一份。
        </p>
        <button
          class="pc-primary-btn"
          type="button"
          :disabled="recovery.duplicateScanning || recovery.duplicateDeleting"
          @click="scanDuplicates"
        >
          {{ duplicateScanButtonLabel }}
        </button>
      </article>

      <article v-if="recovery.duplicateScanResult" class="pc-section-card pc-recovery-duplicate-results">
        <div class="pc-section-head">
          <strong>重复候选</strong>
          <span>{{ duplicateSelectedNames.length }}/{{ duplicateCandidateCount }} 份已选</span>
        </div>
        <EmptyState v-if="!recovery.duplicateScanResult.groups.length" compact title="没有完全相同的重复备份">
          <p>相似、前缀包含或 metadata 不同的备份不会被列入。</p>
        </EmptyState>
        <div v-else class="pc-recovery-duplicate-list">
          <section v-for="group in recovery.duplicateScanResult.groups" :key="group.id" class="pc-recovery-duplicate-group">
            <div class="pc-section-head">
              <strong>{{ duplicateGroupLabel(group) }}</strong>
              <span>可释放 {{ formatBytes(group.reclaimBytes) }}</span>
            </div>
            <div class="pc-recovery-duplicate-keeper">
              <i class="fa-solid fa-shield"></i>
              <span class="pc-list-row-copy">
                <strong>保留 · {{ formatBackupCreatedAt(group.keeper.summary) }}</strong>
                <small>{{ group.keeper.summary.fileName }}</small>
              </span>
            </div>
            <label v-for="item in group.duplicates" :key="item.summary.fileName" class="pc-recovery-cleanup-item">
              <input
                type="checkbox"
                :checked="duplicateSelectedNames.includes(item.summary.fileName)"
                @change="toggleDuplicateCandidate(item.summary.fileName)"
              />
              <span class="pc-list-row-copy">
                <strong>删除 · {{ formatBackupCreatedAt(item.summary) }}</strong>
                <small>{{ item.summary.fileName }} · {{ item.actualChatItems }} 层</small>
              </span>
            </label>
          </section>
        </div>
        <p v-if="recovery.duplicateScanResult.rejected.length" class="pc-recovery-warning">
          已安全排除 {{ recovery.duplicateScanResult.rejected.length }} 份无法下载、解析或计数不一致的备份。
        </p>
        <button
          v-if="duplicateCandidateCount"
          class="pc-soft-btn danger"
          type="button"
          :disabled="!duplicateSelectedNames.length || recovery.duplicateDeleting"
          @click="confirmDuplicateDelete"
        >
          {{ recovery.duplicateDeleting ? '正在逐份复核并删除…' : `删除选中的 ${duplicateSelectedNames.length} 份旧副本` }}
        </button>
      </article>

      <article v-if="recovery.duplicateDeleteResult" class="pc-section-card pc-recovery-cleanup-summary">
        <strong>查重删除完成</strong>
        <p>
          成功 {{ recovery.duplicateDeleteResult.deleted.length }} 份，释放
          {{ formatBytes(recovery.duplicateDeleteResult.reclaimedBytes) }}；失败或跳过
          {{ recovery.duplicateDeleteResult.failed.length }} 份。
        </p>
        <p v-if="recovery.duplicateDeleteResult.failed.length" class="pc-recovery-warning">
          失败或复核变化的文件仍保留，可重新扫描后检查。
        </p>
      </article>
    </section>

    <section v-else-if="route.page === 'cleanup'" class="pc-recovery-page">
      <article class="pc-section-card pc-recovery-cleanup-config">
        <div class="pc-section-head">
          <strong>快速清理小备份</strong>
          <span>{{ cleanupScopeLabel }}</span>
        </div>
        <label class="pc-field-group">
          <span>删除实际楼层数小于或等于</span>
          <input v-model.number="cleanupThreshold" class="pc-field" min="0" step="1" type="number" />
        </label>
        <p class="pc-recovery-safety-note">
          <i class="fa-solid fa-shield-halved"></i>
          输入 0 只清理通过解析确认的 metadata-only。空文件、损坏文件和楼层计数不一致文件会自动排除。
        </p>
        <button
          class="pc-primary-btn"
          type="button"
          :disabled="recovery.cleanupScanning || recovery.cleanupDeleting"
          @click="scanCleanup"
        >
          {{ recovery.cleanupScanning ? '正在逐份安全检查…' : '扫描可清理备份' }}
        </button>
      </article>

      <article v-if="recovery.cleanupScanResult" class="pc-section-card pc-recovery-cleanup-results">
        <div class="pc-section-head">
          <strong>确认候选</strong>
          <span>{{ cleanupSelectedNames.length }}/{{ recovery.cleanupScanResult.candidates.length }} 份已选</span>
        </div>
        <EmptyState v-if="!recovery.cleanupScanResult.candidates.length" compact title="没有符合条件的安全候选" />
        <div v-else class="pc-recovery-cleanup-list">
          <section v-for="group in cleanupCandidateGroups" :key="group.id" class="pc-recovery-cleanup-group">
            <div class="pc-section-head">
              <strong>{{ group.label }}</strong>
              <span>{{ group.candidates.length }} 份</span>
            </div>
            <label
              v-for="candidate in group.candidates"
              :key="candidate.summary.fileName"
              class="pc-recovery-cleanup-item"
            >
              <input
                type="checkbox"
                :checked="cleanupSelectedNames.includes(candidate.summary.fileName)"
                @change="toggleCleanupCandidate(candidate.summary.fileName)"
              />
              <span class="pc-list-row-copy">
                <strong>{{ candidate.summary.fileName }}</strong>
                <small>{{ candidate.actualChatItems }} 层 · {{ formatDate(candidate.summary.lastMessageAt) }}</small>
              </span>
            </label>
          </section>
        </div>
        <p v-if="recovery.cleanupScanResult.rejected.length" class="pc-recovery-warning">
          已安全排除 {{ recovery.cleanupScanResult.rejected.length }} 份无法确认或计数不一致的备份。
        </p>
        <button
          v-if="recovery.cleanupScanResult.candidates.length"
          class="pc-soft-btn danger"
          type="button"
          :disabled="!cleanupSelectedNames.length || recovery.cleanupDeleting"
          @click="confirmCleanupDelete"
        >
          {{ recovery.cleanupDeleting ? '正在逐份删除…' : `永久删除选中的 ${cleanupSelectedNames.length} 份` }}
        </button>
      </article>

      <article v-if="recovery.cleanupDeleteResult" class="pc-section-card pc-recovery-cleanup-summary">
        <strong>清理完成</strong>
        <p>
          成功 {{ recovery.cleanupDeleteResult.deleted.length }} 份，失败
          {{ recovery.cleanupDeleteResult.failed.length }} 份。
        </p>
        <p v-if="recovery.cleanupDeleteResult.failed.length" class="pc-recovery-warning">
          失败项仍保留在备份书架中，可刷新后逐份检查。
        </p>
      </article>
    </section>

    <section v-else-if="route.page === 'reader' && loaded" class="pc-recovery-page pc-recovery-reader-page">
      <ReaderDetailShell
        v-if="activeMessage"
        :bagu-enabled="false"
        :content="activeMessage.content"
        content-formatted
        :edit-enabled="false"
        :favorite-enabled="false"
        footer-always-visible
        :next-disabled="messageIndex >= loaded.parsed.messages.length - 1"
        next-label="下一层"
        :previous-disabled="messageIndex <= 0"
        previous-label="上一层"
        :title="activeMessage.title"
        @bottom="scrollReader('bottom')"
        @catalog="catalogOpen = true"
        @next="openMessage(messageIndex + 1)"
        @previous="openMessage(messageIndex - 1)"
        @top="scrollReader('top')"
      >
        <template #kicker>
          <div class="pc-recovery-readonly-banner">
            <strong><i class="fa-solid fa-lock"></i> 备份只读视图</strong>
            <small>{{ loaded.summary.fileName }}</small>
            <small>
              {{ loaded.summary.fileSize }} · {{ loaded.parsed.messages.length }} 层 ·
              {{ formatDate(loaded.summary.lastMessageAt) }}
            </small>
            <small v-if="loaded.messageCountMismatch" class="pc-recovery-count-warning">
              {{ loaded.messageCountMismatch }}
            </small>
          </div>
        </template>
        <template #meta>
          <span class="pc-hidden-pill">{{ activeMessage.isUser ? '用户' : activeMessage.name }}</span>
          <span v-if="activeMessage.isHidden" class="pc-hidden-pill">隐藏</span>
        </template>
        <template #actions>
          <button
            class="pc-soft-btn danger"
            type="button"
            :disabled="recovery.managementBusy"
            title="永久删除此备份"
            @click="deleteLoadedBackup"
          >
            <i class="fa-solid fa-trash-can"></i>
          </button>
          <button class="pc-primary-btn" type="button" title="导入此备份" @click="openImportConfirm">
            <i class="fa-solid fa-file-import"></i>
          </button>
        </template>
        <template #overlays>
          <CatalogModal
            :active-id="activeMessage.id"
            :items="catalogItems"
            :open="catalogOpen"
            title="备份楼层"
            @close="catalogOpen = false"
            @select="selectCatalogMessage"
          />
        </template>
      </ReaderDetailShell>
      <EmptyState v-else title="这份备份只有 metadata，没有聊天楼层">
        <p>它不能作为正常恢复点导入，可使用顶栏返回后删除或查看其他备份。</p>
      </EmptyState>
    </section>

    <section v-else-if="route.page === 'confirm' && loaded" class="pc-recovery-page">
      <article class="pc-section-card pc-recovery-confirm-card">
        <strong>确认原生导入</strong>
        <dl class="pc-recovery-details">
          <div>
            <dt>来源</dt>
            <dd>{{ loaded.summary.fileName }}</dd>
          </div>
          <div>
            <dt>备份</dt>
            <dd>{{ loaded.parsed.messages.length }} 层 · {{ formatDate(loaded.summary.lastMessageAt) }}</dd>
          </div>
          <div>
            <dt>识别角色</dt>
            <dd>{{ loaded.parsed.characterName || 'metadata 未记录' }}</dd>
          </div>
        </dl>
        <label class="pc-field-group">
          <span class="pc-field-label">目标角色卡</span>
          <SearchableCombobox
            v-model="selectedTargetId"
            input-label="选择导入目标角色卡"
            :options="targetOptions"
            placeholder="必须选择角色卡"
          />
        </label>
        <p class="pc-recovery-safety-note">
          <i class="fa-solid fa-shield-halved"></i> 将作为一份新聊天导入，不覆盖当前聊天，不删除原备份，也不复制插件
          scope 数据。
        </p>
        <p v-if="loaded.messageCountMismatch" class="pc-recovery-warning">{{ loaded.messageCountMismatch }}</p>
      </article>
      <div class="pc-form-actions pc-recovery-single-action">
        <button
          class="pc-primary-btn"
          type="button"
          :disabled="!selectedTargetId || Boolean(loaded.messageCountMismatch) || recovery.importing"
          @click="confirmImport"
        >
          {{ recovery.importing ? '正在导入…' : '确认导入为新聊天' }}
        </button>
      </div>
    </section>

    <section v-else-if="route.page === 'result' && recovery.importResult" class="pc-recovery-page">
      <article class="pc-section-card pc-recovery-result-card">
        <i class="fa-solid fa-circle-check"></i>
        <strong>酒馆已创建新的导入聊天</strong>
        <p>{{ recovery.importResult.fileName }}</p>
        <small>目标角色：{{ recovery.importResult.target.name }}</small>
        <p v-if="!recovery.importResult.verified" class="pc-recovery-warning">
          聊天列表暂未确认到新文件，请勿重复导入；可返回书架刷新后检查。
        </p>
      </article>
      <div class="pc-form-actions pc-recovery-single-action">
        <button
          class="pc-primary-btn"
          type="button"
          :disabled="!recovery.importResult.verified"
          @click="openImportedChat"
        >
          打开导入后的聊天
        </button>
      </div>
    </section>

    <EmptyState v-else title="备份管理页面状态已失效" />
  </section>
</template>

<script setup lang="ts">
import CatalogModal from '@/components/CatalogModal.vue';
import EmptyState from '@/components/EmptyState.vue';
import ReaderDetailShell from '@/components/ReaderDetailShell.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import type { ChatBackupGroup, ChatBackupSummary, DuplicateBackupGroup } from '@/apps/recovery/model';
import { useChatRecoveryStore } from '@/apps/recovery/store';
import { usePhoneStore } from '@/store/phone';
import { jumpToTavernChat } from '@/util/tavernNavigation';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const recovery = useChatRecoveryStore();
const { activeBackup: loaded } = storeToRefs(recovery);
const route = computed(() => phone.currentRoute);
const query = ref('');
const sortMode = ref<'character' | 'recent'>('recent');
const messageIndex = ref(0);
const catalogOpen = ref(false);
const selectedTargetId = ref('');
const cleanupThreshold = ref(0);
const cleanupSelectedNames = ref<string[]>([]);
const duplicateSelectedNames = ref<string[]>([]);

const activeGroup = computed(() => recovery.groups.find(group => group.id === route.value.params?.groupId) ?? null);
const activeMessage = computed(() => loaded.value?.parsed.messages[messageIndex.value] ?? null);
const catalogItems = computed(
  () =>
    loaded.value?.parsed.messages.map(message => ({ id: message.id, meta: message.name, title: message.title })) ?? [],
);
const targetOptions = computed(() =>
  recovery.characters.map(character => ({ label: character.name, value: String(character.id) })),
);
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
const cleanupScopeGroup = computed(
  () => recovery.groups.find(group => group.id === route.value.params?.groupId) ?? null,
);
const cleanupScopeLabel = computed(() => cleanupScopeGroup.value?.label ?? '全部角色');
const duplicateScopeGroup = computed(
  () => recovery.groups.find(group => group.id === route.value.params?.groupId) ?? null,
);
const duplicateScopeLabel = computed(() => duplicateScopeGroup.value?.label ?? '全部角色');
const duplicateCandidateCount = computed(() =>
  (recovery.duplicateScanResult?.groups ?? []).reduce((total, group) => total + group.duplicates.length, 0),
);
const duplicateScanButtonLabel = computed(() => {
  if (!recovery.duplicateScanning) return '扫描完全相同的备份';
  if (!recovery.duplicateScanTotal) return '正在准备扫描…';
  return `正在校验 ${recovery.duplicateScanCompleted}/${recovery.duplicateScanTotal}`;
});
const cleanupCandidateGroups = computed(() => {
  const candidates = recovery.cleanupScanResult?.candidates ?? [];
  const grouped = new Map<string, { candidates: typeof candidates; id: string; label: string }>();
  candidates.forEach(candidate => {
    const owner = recovery.groups.find(group =>
      group.backups.some(backup => backup.fileName === candidate.summary.fileName),
    );
    const id = owner?.id ?? `unknown:${candidate.summary.ownerKey}`;
    const group = grouped.get(id) ?? { candidates: [], id, label: owner?.label ?? '未识别角色' };
    group.candidates.push(candidate);
    grouped.set(id, group);
  });
  return [...grouped.values()];
});
const emptyTitle = computed(() =>
  recovery.status === 'unsupported'
    ? '当前版本不支持备份书架'
    : query.value.trim()
      ? '没有匹配的聊天备份'
      : '还没有聊天备份',
);

onMounted(() => {
  if (recovery.status === 'idle') void recovery.refresh();
});
onBeforeUnmount(recovery.releaseActiveBackup);
watch(
  () => route.value.page,
  page => {
    if (page === 'root' || page === 'group') recovery.releaseActiveBackup();
    if (page === 'confirm' && !selectedTargetId.value) selectedTargetId.value = suggestedTargetId();
  },
  { immediate: true },
);
watch(
  () => recovery.duplicateScanResult,
  result => {
    if (result && !recovery.duplicateDeleteResult) {
      duplicateSelectedNames.value = result.groups.flatMap(group =>
        group.duplicates.map(item => item.summary.fileName),
      );
    }
  },
  { immediate: true },
);
watch(
  () => recovery.cleanupScanResult,
  result => {
    if (result && !recovery.cleanupDeleteResult) {
      cleanupSelectedNames.value = result.candidates.map(candidate => candidate.summary.fileName);
    }
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

async function openBackup(summary: ChatBackupSummary) {
  try {
    await recovery.readBackup(summary);
    messageIndex.value = 0;
    phone.pushPage('reader', '阅读聊天备份', { fileName: summary.fileName, groupId: activeGroup.value?.id ?? '' });
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

async function deleteLoadedBackup() {
  const summary = loaded.value?.summary;
  if (!summary) return;
  const groupId = route.value.params?.groupId ?? '';
  if (!(await confirmDeleteBackup(summary, false))) return;
  if (groupId && recovery.groups.some(group => group.id === groupId)) phone.goBack({ skipConfirm: true });
  else phone.replacePage('root', '酒馆备份管理');
}

function openCleanup(groupId = '') {
  recovery.resetCleanup();
  cleanupThreshold.value = 0;
  cleanupSelectedNames.value = [];
  phone.pushPage('cleanup', groupId ? '清理角色备份' : '快速清理备份', groupId ? { groupId } : {});
}

function openDuplicates(groupId = '') {
  recovery.resetDuplicates();
  duplicateSelectedNames.value = [];
  phone.pushPage('duplicates', groupId ? '当前角色备份查重' : '重复备份查找', groupId ? { groupId } : {});
}

async function scanDuplicates() {
  try {
    const result = await recovery.scanDuplicateBackups(route.value.params?.groupId ?? '');
    duplicateSelectedNames.value = result.groups.flatMap(group =>
      group.duplicates.map(item => item.summary.fileName),
    );
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '扫描重复备份失败');
  }
}

function duplicateGroupLabel(group: DuplicateBackupGroup) {
  const owner = recovery.groups.find(item =>
    item.backups.some(backup => backup.fileName === group.keeper.summary.fileName),
  );
  return `${owner?.label ?? '未识别角色'} · ${group.duplicates.length + 1} 份完全相同`;
}

function toggleDuplicateCandidate(fileName: string) {
  duplicateSelectedNames.value = duplicateSelectedNames.value.includes(fileName)
    ? duplicateSelectedNames.value.filter(name => name !== fileName)
    : [...duplicateSelectedNames.value, fileName];
}

async function confirmDuplicateDelete() {
  if (!recovery.duplicateScanResult || !duplicateSelectedNames.value.length) return;
  const selectedBytes = recovery.duplicateScanResult.groups.reduce(
    (total, group) =>
      total +
      group.duplicates
        .filter(item => duplicateSelectedNames.value.includes(item.summary.fileName))
        .reduce((groupTotal, item) => groupTotal + item.byteLength, 0),
    0,
  );
  const confirmed = await phone.confirmNotice(
    `范围：${duplicateScopeLabel.value}\n将永久删除：${duplicateSelectedNames.value.length} 份完全相同的旧副本\n预计释放：${formatBytes(selectedBytes)}\n\n每组最新备份会保留；删除前还会再次下载并校验。此操作不会删除已有聊天。`,
    {
      confirmLabel: `删除 ${duplicateSelectedNames.value.length} 份旧副本`,
      kind: 'warning',
      title: '确认查重删除',
    },
  );
  if (!confirmed) return;
  try {
    const result = await recovery.deleteDuplicateBackups(duplicateSelectedNames.value);
    duplicateSelectedNames.value = result.failed.map(item => item.summary.fileName);
    if (result.failed.length) {
      toastr.warning(`已删除 ${result.deleted.length} 份，${result.failed.length} 份失败或跳过`);
    } else {
      toastr.success(`已删除 ${result.deleted.length} 份完全相同的旧备份`);
    }
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '查重删除失败');
  }
}

async function scanCleanup() {
  try {
    const result = await recovery.scanCleanup(Number(cleanupThreshold.value), route.value.params?.groupId ?? '');
    cleanupSelectedNames.value = result.candidates.map(candidate => candidate.summary.fileName);
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '扫描可清理备份失败');
  }
}

function toggleCleanupCandidate(fileName: string) {
  cleanupSelectedNames.value = cleanupSelectedNames.value.includes(fileName)
    ? cleanupSelectedNames.value.filter(name => name !== fileName)
    : [...cleanupSelectedNames.value, fileName];
}

async function confirmCleanupDelete() {
  const scan = recovery.cleanupScanResult;
  if (!scan || !cleanupSelectedNames.value.length) return;
  const confirmed = await phone.confirmNotice(
    `范围：${cleanupScopeLabel.value}\n阈值：${scan.maxChatItems} 层及以下\n将永久删除：${cleanupSelectedNames.value.length} 份备份\n\n批量删除无法撤销，但不会删除已有聊天。`,
    { confirmLabel: `永久删除 ${cleanupSelectedNames.value.length} 份`, kind: 'warning', title: '确认快速清理' },
  );
  if (!confirmed) return;
  try {
    const result = await recovery.deleteCleanupCandidates(cleanupSelectedNames.value);
    cleanupSelectedNames.value = result.failed.map(item => item.summary.fileName);
    if (result.failed.length) toastr.warning(`已删除 ${result.deleted.length} 份，${result.failed.length} 份失败`);
    else toastr.success(`已删除 ${result.deleted.length} 份聊天备份`);
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '快速清理失败');
  }
}

function openMessage(index: number) {
  if (!loaded.value) return;
  messageIndex.value = Math.max(0, Math.min(index, loaded.value.parsed.messages.length - 1));
}

function selectCatalogMessage(messageId: string) {
  const index = loaded.value?.parsed.messages.findIndex(message => message.id === messageId) ?? -1;
  if (index >= 0) openMessage(index);
  catalogOpen.value = false;
}

function scrollReader(edge: 'bottom' | 'top') {
  document
    .querySelector('.pc-recovery-reader-page .pc-reader-content')
    ?.scrollTo({ behavior: 'smooth', top: edge === 'top' ? 0 : Number.MAX_SAFE_INTEGER });
}

function openImportConfirm() {
  if (!loaded.value?.parsed.messages.length || loaded.value.messageCountMismatch) return;
  selectedTargetId.value = suggestedTargetId();
  phone.pushPage('confirm', '确认导入备份');
}

function suggestedTargetId() {
  const fileName = loaded.value?.summary.fileName;
  const group = recovery.groups.find(item => item.backups.some(backup => backup.fileName === fileName));
  return group?.kind === 'character' && group.character ? String(group.character.id) : '';
}

async function confirmImport() {
  if (!selectedTargetId.value) return;
  const targetId = Number(selectedTargetId.value);
  if (!Number.isInteger(targetId) || targetId < 0) return;
  try {
    await recovery.importActiveBackup(targetId);
    phone.replacePage('result', '导入完成');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '聊天备份导入失败');
  }
}

async function openImportedChat() {
  const result = recovery.importResult;
  if (!result?.verified) return;
  try {
    await jumpToTavernChat({
      avatar: result.target.avatar,
      characterId: result.target.id,
      chatFile: result.fileName,
      ownerName: result.target.name,
    });
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '无法打开导入后的聊天');
  }
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
.pc-recovery-error p,
.pc-recovery-result-card p,
.pc-recovery-cleanup-summary p,
.pc-recovery-safety-note {
  margin: 0;
}

.pc-recovery-group-note,
.pc-recovery-result-card small {
  color: var(--pc-muted);
}

.pc-recovery-reader-page {
  height: 100%;
}

.pc-recovery-reader-page :deep(.pc-detail-content.pc-reader-content) {
  height: auto;
  min-height: 0;
  flex: 1 1 0;
}

.pc-recovery-readonly-banner {
  display: grid;
  gap: 2px;
  padding: 8px 10px;
  border: 1px solid var(--pc-border);
  border-radius: min(var(--pc-control-radius), 8px);
  background: var(--pc-surface);
}

.pc-recovery-readonly-banner small {
  overflow: hidden;
  color: var(--pc-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-recovery-readonly-banner .pc-recovery-count-warning {
  color: var(--pc-danger);
  white-space: normal;
}

.pc-recovery-cleanup-results,
.pc-recovery-cleanup-summary,
.pc-recovery-duplicate-config,
.pc-recovery-duplicate-results,
.pc-recovery-error,
.pc-recovery-confirm-card,
.pc-recovery-result-card {
  display: grid;
  gap: 10px;
}

.pc-recovery-cleanup-list {
  display: grid;
  max-height: 280px;
  gap: 0;
  overflow: auto;
}

.pc-recovery-duplicate-list {
  display: grid;
  max-height: 380px;
  gap: 8px;
  overflow: auto;
}

.pc-recovery-duplicate-group {
  display: grid;
  gap: 4px;
  padding: 10px;
  border: 1px solid var(--pc-border);
  border-radius: min(var(--pc-control-radius), 10px);
  background: var(--pc-surface);
}

.pc-recovery-duplicate-keeper {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid var(--pc-border);
  color: var(--pc-theme-accent);
}

.pc-recovery-duplicate-keeper small,
.pc-recovery-cleanup-item small {
  overflow-wrap: anywhere;
}

.pc-recovery-cleanup-group {
  display: grid;
  gap: 4px;
  padding: 8px 0;
  border-bottom: 1px solid var(--pc-border);
}

.pc-recovery-cleanup-group:last-child {
  border-bottom: 0;
}

.pc-recovery-cleanup-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid var(--pc-border);
}

.pc-recovery-cleanup-item:last-child {
  border-bottom: 0;
}

.pc-recovery-backup-open .pc-list-row-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-recovery-details {
  display: grid;
  gap: 8px;
  margin: 0;
}

.pc-recovery-details div {
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr);
  gap: 8px;
}

.pc-recovery-details dt {
  color: var(--pc-muted);
}

.pc-recovery-details dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}

.pc-recovery-safety-note,
.pc-recovery-warning {
  padding: 10px;
  border-radius: min(var(--pc-control-radius), 8px);
  background: color-mix(in srgb, var(--pc-theme-accent) 10%, var(--pc-surface) 90%);
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-recovery-warning {
  color: var(--pc-danger);
}

.pc-recovery-result-card {
  place-items: center;
  text-align: center;
}

.pc-recovery-result-card > i {
  color: var(--pc-theme-accent);
  font-size: 34px;
}

.pc-recovery-single-action {
  grid-template-columns: minmax(0, 1fr);
}
</style>
