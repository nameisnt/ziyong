<template>
  <section class="pc-recovery-settings-flow">
    <section v-if="route.page === 'settings-snapshots'" class="pc-recovery-page">
      <div class="pc-compact-toolbar pc-recovery-settings-toolbar">
        <span class="pc-directory-count">{{ recovery.settingsSnapshots.length }} 份设置快照</span>
        <div class="pc-directory-actions">
          <button class="pc-soft-btn" type="button" :disabled="recovery.managementBusy" @click="openSettingsDuplicates">
            <i class="fa-solid fa-clone"></i><span>查重</span>
          </button>
          <button
            class="pc-soft-btn"
            type="button"
            :disabled="recovery.managementBusy"
            @click="confirmMakeSettingsSnapshot"
          >
            <i :class="['fa-solid', recovery.settingsMaking ? 'fa-spinner fa-spin' : 'fa-camera']"></i>
            <span>{{ recovery.settingsMaking ? '创建中' : '新建' }}</span>
          </button>
          <button
            class="pc-icon-btn"
            type="button"
            :disabled="recovery.managementBusy"
            title="刷新设置快照"
            aria-label="刷新设置快照"
            @click="refreshSettingsSnapshots"
          >
            <i :class="['fa-solid fa-rotate', { spinning: recovery.settingsLoading }]"></i>
          </button>
        </div>
      </div>
      <article v-if="recovery.settingsLoading" class="pc-section-card pc-recovery-scan-status" aria-live="polite">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>正在读取酒馆设置快照……</span>
      </article>
      <article v-if="recovery.settingsError" class="pc-section-card pc-recovery-error">
        <strong>读取失败</strong>
        <p>{{ recovery.settingsError }}</p>
      </article>
      <EmptyState v-if="!recovery.settingsLoading && !recovery.settingsSnapshots.length" title="还没有设置快照">
        <p>可以点击“新建”保存当前酒馆设置。</p>
      </EmptyState>
      <div v-else class="pc-directory-list">
        <article
          v-for="snapshot in recovery.settingsSnapshots"
          :key="snapshot.name"
          class="pc-list-row pc-recovery-settings-row"
        >
          <span class="pc-recovery-book-icon"><i class="fa-solid fa-file-code"></i></span>
          <span class="pc-list-row-copy">
            <strong>{{ props.formatDate(snapshot.date) }}</strong>
            <small>{{ snapshot.name }}</small>
            <small>{{ props.formatBytes(snapshot.size) }}</small>
          </span>
          <span class="pc-recovery-row-actions">
            <button
              class="pc-soft-btn"
              type="button"
              :disabled="recovery.managementBusy"
              @click="confirmRestoreSettingsSnapshot(snapshot)"
            >
              恢复
            </button>
            <button
              class="pc-soft-btn danger"
              type="button"
              :disabled="recovery.managementBusy"
              @click="confirmDeleteSettingsSnapshot(snapshot)"
            >
              删除
            </button>
          </span>
        </article>
      </div>
    </section>

    <section v-else-if="route.page === 'settings-duplicates'" class="pc-recovery-page">
      <article class="pc-section-card pc-recovery-duplicate-config">
        <div class="pc-section-head">
          <strong>设置快照完全查重</strong>
          <span>{{ recovery.settingsSnapshots.length }} 份</span>
        </div>
        <p class="pc-recovery-safety-note">
          <i class="fa-solid fa-shield-halved"></i>
          只把原始 JSON 内容 SHA-256 完全一致的快照归为一组，每组固定保留时间最新的一份。
        </p>
        <button
          class="pc-primary-btn"
          type="button"
          :disabled="recovery.settingsDuplicateScanning || recovery.settingsDeleting"
          @click="scanSettingsDuplicates"
        >
          {{ settingsDuplicateScanButtonLabel }}
        </button>
      </article>

      <article
        v-if="recovery.settingsDuplicateScanning"
        class="pc-section-card pc-recovery-scan-status"
        aria-live="polite"
      >
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>{{ settingsDuplicateScanButtonLabel }}</span>
        <progress
          v-if="recovery.settingsDuplicateScanTotal"
          :max="recovery.settingsDuplicateScanTotal"
          :value="recovery.settingsDuplicateScanCompleted"
        ></progress>
      </article>

      <article v-if="recovery.settingsDuplicateScanResult" class="pc-section-card pc-recovery-duplicate-results">
        <div class="pc-section-head">
          <strong>重复候选</strong>
          <span>{{ settingsDuplicateSelectedNames.length }}/{{ settingsDuplicateCandidateCount }} 份已选</span>
        </div>
        <EmptyState v-if="!recovery.settingsDuplicateScanResult.groups.length" compact title="没有完全相同的设置快照" />
        <div v-else class="pc-recovery-duplicate-list">
          <section
            v-for="group in recovery.settingsDuplicateScanResult.groups"
            :key="group.id"
            class="pc-recovery-duplicate-group"
          >
            <div class="pc-section-head">
              <strong>{{ group.duplicates.length + 1 }} 份完全相同</strong>
              <span>可释放 {{ props.formatBytes(group.reclaimBytes) }}</span>
            </div>
            <div class="pc-recovery-duplicate-keeper">
              <i class="fa-solid fa-shield"></i>
              <span class="pc-list-row-copy">
                <strong>保留 · {{ props.formatDate(group.keeper.summary.date) }}</strong>
                <small>{{ group.keeper.summary.name }}</small>
              </span>
            </div>
            <div v-for="item in group.duplicates" :key="item.summary.name" class="pc-recovery-cleanup-item">
              <input
                type="checkbox"
                :checked="settingsDuplicateSelectedNames.includes(item.summary.name)"
                @change="toggleSettingsDuplicateCandidate(item.summary.name)"
              />
              <span class="pc-list-row-copy">
                <strong>删除 · {{ props.formatDate(item.summary.date) }}</strong>
                <small>{{ item.summary.name }} · {{ props.formatBytes(item.summary.size) }}</small>
              </span>
            </div>
          </section>
        </div>
        <p v-if="recovery.settingsDuplicateScanResult.rejected.length" class="pc-recovery-warning">
          已安全排除 {{ recovery.settingsDuplicateScanResult.rejected.length }} 份无法读取或解析的设置快照。
        </p>
        <button
          v-if="settingsDuplicateCandidateCount"
          class="pc-soft-btn danger"
          type="button"
          :disabled="!settingsDuplicateSelectedNames.length || recovery.settingsDeleting"
          @click="confirmSettingsDuplicateDelete"
        >
          {{
            recovery.settingsDeleting
              ? '正在逐份复核并删除…'
              : `删除选中的 ${settingsDuplicateSelectedNames.length} 份旧副本`
          }}
        </button>
      </article>

      <article v-if="recovery.settingsDeleteResult" class="pc-section-card pc-recovery-cleanup-summary">
        <strong>设置快照查重完成</strong>
        <p>
          成功 {{ recovery.settingsDeleteResult.deleted.length }} 份，释放
          {{ props.formatBytes(recovery.settingsDeleteResult.reclaimedBytes) }}；失败或跳过
          {{ recovery.settingsDeleteResult.failed.length }} 份。
        </p>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import type { SettingsSnapshotSummary } from '@/apps/recovery/model';
import { useChatRecoveryStore } from '@/apps/recovery/store';
import EmptyState from '@/components/EmptyState.vue';
import { usePhoneStore } from '@/store/phone';

const props = defineProps<{
  formatBytes: (value: number) => string;
  formatDate: (value?: number) => string;
}>();

const phone = usePhoneStore();
const recovery = useChatRecoveryStore();
const route = computed(() => phone.currentRoute);
const settingsDuplicateSelectedNames = ref<string[]>([]);

const settingsDuplicateCandidateCount = computed(() =>
  (recovery.settingsDuplicateScanResult?.groups ?? []).reduce((total, group) => total + group.duplicates.length, 0),
);
const settingsDuplicateScanButtonLabel = computed(() => {
  if (!recovery.settingsDuplicateScanning) return '扫描完全相同的设置快照';
  if (!recovery.settingsDuplicateScanTotal) return '正在准备扫描…';
  return `正在校验 ${recovery.settingsDuplicateScanCompleted}/${recovery.settingsDuplicateScanTotal}`;
});

watch(
  () => route.value.page,
  page => {
    if (page === 'settings-snapshots' && !recovery.settingsSnapshots.length) void refreshSettingsSnapshots();
  },
  { immediate: true },
);
watch(
  () => recovery.settingsDuplicateScanResult,
  result => {
    if (result && !recovery.settingsDeleteResult) {
      settingsDuplicateSelectedNames.value = result.groups.flatMap(group =>
        group.duplicates.map(item => item.summary.name),
      );
    }
  },
  { immediate: true },
);

async function refreshSettingsSnapshots() {
  try {
    await recovery.refreshSettingsSnapshots();
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '读取设置快照失败');
  }
}

async function confirmMakeSettingsSnapshot() {
  const confirmed = await phone.confirmNotice('立即复制当前酒馆 settings.json，创建一份新的设置快照？', {
    confirmLabel: '创建设置快照',
    title: '新建设置快照',
  });
  if (!confirmed) return;
  try {
    await recovery.makeSettingsSnapshot();
    toastr.success('设置快照已创建');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '创建设置快照失败');
  }
}

async function confirmRestoreSettingsSnapshot(snapshot: SettingsSnapshotSummary) {
  const confirmed = await phone.confirmNotice(
    `文件：${snapshot.name}\n时间：${props.formatDate(snapshot.date)}\n\n恢复会用这份快照覆盖酒馆当前 settings.json。聊天、角色卡和世界书文件不会被覆盖；恢复后需要刷新酒馆页面才能完整生效。若要保留当前设置，请先返回列表点击“新建”。`,
    { confirmLabel: '覆盖当前设置', kind: 'warning', title: '确认恢复设置快照' },
  );
  if (!confirmed) return;
  try {
    await recovery.restoreSettingsSnapshot(snapshot);
    phone.noticeInfo('设置快照已经恢复。请刷新整个 SillyTavern 页面，让酒馆和扩展重新读取 settings.json。', {
      timeoutMs: 0,
      title: '设置恢复完成',
    });
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '恢复设置快照失败');
  }
}

async function confirmDeleteSettingsSnapshot(snapshot: SettingsSnapshotSummary) {
  const confirmed = await phone.confirmNotice(
    `文件：${snapshot.name}\n时间：${props.formatDate(snapshot.date)}\n大小：${props.formatBytes(snapshot.size)}\n\n永久删除这份设置快照？列表不会读取或格式化快照正文。`,
    { confirmLabel: '删除快照', kind: 'warning', title: '确认删除设置快照' },
  );
  if (!confirmed) return;
  try {
    await recovery.deleteSettingsSnapshot(snapshot);
    toastr.success('设置快照已删除');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '删除设置快照失败');
  }
}

function openSettingsDuplicates() {
  recovery.resetSettingsDuplicates();
  settingsDuplicateSelectedNames.value = [];
  phone.pushPage('settings-duplicates', '设置快照查重');
}

async function scanSettingsDuplicates() {
  try {
    const result = await recovery.scanDuplicateSettingsSnapshots();
    settingsDuplicateSelectedNames.value = result.groups.flatMap(group =>
      group.duplicates.map(item => item.summary.name),
    );
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '扫描设置快照失败');
  }
}

function toggleSettingsDuplicateCandidate(name: string) {
  settingsDuplicateSelectedNames.value = settingsDuplicateSelectedNames.value.includes(name)
    ? settingsDuplicateSelectedNames.value.filter(item => item !== name)
    : [...settingsDuplicateSelectedNames.value, name];
}

async function confirmSettingsDuplicateDelete() {
  const scan = recovery.settingsDuplicateScanResult;
  if (!scan || !settingsDuplicateSelectedNames.value.length) return;
  const selectedBytes = scan.groups.reduce(
    (total, group) =>
      total +
      group.duplicates
        .filter(item => settingsDuplicateSelectedNames.value.includes(item.summary.name))
        .reduce((sum, item) => sum + item.summary.size, 0),
    0,
  );
  const confirmed = await phone.confirmNotice(
    `将永久删除：${settingsDuplicateSelectedNames.value.length} 份完全相同的旧设置快照\n预计释放：${props.formatBytes(selectedBytes)}\n\n每组最新快照会保留；删除前还会重新读取并复核 SHA-256。`,
    {
      confirmLabel: `删除 ${settingsDuplicateSelectedNames.value.length} 份旧副本`,
      kind: 'warning',
      title: '确认设置快照查重删除',
    },
  );
  if (!confirmed) return;
  try {
    const result = await recovery.deleteSettingsSnapshots(settingsDuplicateSelectedNames.value);
    settingsDuplicateSelectedNames.value = result.failed.map(item => item.name);
    if (result.failed.length) {
      toastr.warning(`已删除 ${result.deleted.length} 份，${result.failed.length} 份失败或跳过`);
    } else {
      toastr.success(`已删除 ${result.deleted.length} 份完全相同的旧设置快照`);
    }
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '删除重复设置快照失败');
  }
}
</script>

<style scoped>
.pc-recovery-settings-flow,
.pc-recovery-page {
  display: flex;
  min-height: 0;
  flex-direction: column;
}

.pc-recovery-settings-flow {
  height: 100%;
}

.pc-recovery-page {
  flex: 1 1 auto;
  gap: 10px;
}

.pc-recovery-settings-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pc-recovery-settings-toolbar .pc-directory-actions,
.pc-recovery-row-actions {
  display: flex;
  gap: 6px;
}

.pc-recovery-settings-row {
  grid-template-columns: 38px minmax(0, 1fr) auto;
}

.pc-recovery-book-icon {
  display: grid;
  width: 38px;
  height: 48px;
  place-items: center;
  border-radius: 12px;
  background: color-mix(in srgb, var(--pc-theme-accent) 16%, var(--pc-surface) 84%);
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

.pc-recovery-error p,
.pc-recovery-cleanup-summary p,
.pc-recovery-safety-note {
  margin: 0;
}

.pc-recovery-cleanup-summary,
.pc-recovery-duplicate-config,
.pc-recovery-duplicate-results,
.pc-recovery-error {
  display: grid;
  gap: 10px;
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

.pc-recovery-duplicate-keeper,
.pc-recovery-cleanup-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid var(--pc-border);
}

.pc-recovery-duplicate-keeper {
  color: var(--pc-theme-accent);
}

.pc-recovery-duplicate-keeper small,
.pc-recovery-cleanup-item small {
  overflow-wrap: anywhere;
}

.pc-recovery-cleanup-item:last-child {
  border-bottom: 0;
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
</style>
