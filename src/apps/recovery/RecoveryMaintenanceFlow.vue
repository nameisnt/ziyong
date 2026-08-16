<template>
  <section class="pc-recovery-maintenance-flow">
    <section v-if="route.page === 'duplicates'" class="pc-recovery-page">
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

      <article v-if="recovery.duplicateScanning" class="pc-section-card pc-recovery-scan-status" aria-live="polite">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>{{ duplicateScanButtonLabel }}</span>
        <progress
          v-if="recovery.duplicateScanTotal"
          :max="recovery.duplicateScanTotal"
          :value="recovery.duplicateScanCompleted"
        ></progress>
      </article>

      <article v-if="recovery.duplicateScanResult" class="pc-section-card pc-recovery-duplicate-results">
        <div class="pc-section-head">
          <strong>重复候选</strong>
          <span>{{ duplicateSelectedNames.length }}/{{ duplicateCandidateCount }} 份已选</span>
        </div>
        <div
          v-if="duplicateCandidateCount + containedCandidateCount"
          class="pc-form-actions pc-recovery-selection-actions"
        >
          <button class="pc-soft-btn" type="button" @click="selectAllDuplicateCandidates">全选非保护项</button>
          <button class="pc-soft-btn" type="button" @click="clearDuplicateCandidates">清空选择</button>
        </div>
        <EmptyState v-if="!recovery.duplicateScanResult.groups.length" compact title="没有完全相同的重复备份">
          <p>原始文件没有完全一致的副本；严格续长包含候选会单独显示在下方。</p>
        </EmptyState>
        <div v-else class="pc-recovery-duplicate-list">
          <section
            v-for="group in recovery.duplicateScanResult.groups"
            :key="group.id"
            class="pc-recovery-duplicate-group"
          >
            <div class="pc-section-head">
              <strong>{{ duplicateGroupLabel(group) }}</strong>
              <span>可释放 {{ props.formatBytes(group.reclaimBytes) }}</span>
            </div>
            <button
              class="pc-recovery-duplicate-keeper"
              type="button"
              :disabled="recovery.managementBusy"
              @click="props.openBackup(group.keeper.summary)"
            >
              <i class="fa-solid fa-shield"></i>
              <span class="pc-list-row-copy">
                <strong>保留 · {{ props.formatBackupCreatedAt(group.keeper.summary) }}</strong>
                <small>{{ group.keeper.summary.fileName }}</small>
              </span>
              <i class="fa-solid fa-chevron-right"></i>
            </button>
            <div v-for="item in group.duplicates" :key="item.summary.fileName" class="pc-recovery-cleanup-item">
              <input
                type="checkbox"
                :checked="duplicateSelectedNames.includes(item.summary.fileName)"
                @change="toggleDuplicateCandidate(item.summary.fileName)"
              />
              <button
                class="pc-list-row-copy pc-recovery-candidate-open"
                type="button"
                :disabled="recovery.managementBusy"
                @click.stop="props.openBackup(item.summary)"
              >
                <strong>删除 · {{ props.formatBackupCreatedAt(item.summary) }}</strong>
                <small>{{ item.summary.fileName }} · {{ item.actualChatItems }} 层</small>
              </button>
              <i class="fa-solid fa-chevron-right"></i>
            </div>
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
          {{
            recovery.duplicateDeleting ? '正在逐份复核并删除…' : `删除选中的 ${duplicateSelectedNames.length} 份旧副本`
          }}
        </button>
      </article>

      <article v-if="recovery.duplicateDeleteResult" class="pc-section-card pc-recovery-cleanup-summary">
        <strong>查重删除完成</strong>
        <p>
          成功 {{ recovery.duplicateDeleteResult.deleted.length }} 份，释放
          {{ props.formatBytes(recovery.duplicateDeleteResult.reclaimedBytes) }}；失败或跳过
          {{ recovery.duplicateDeleteResult.failed.length }} 份。
        </p>
        <p v-if="recovery.duplicateDeleteResult.failed.length" class="pc-recovery-warning">
          失败或复核变化的文件仍保留，可重新扫描后检查。
        </p>
      </article>

      <article
        v-if="recovery.duplicateScanResult?.containedGroups.length"
        class="pc-section-card pc-recovery-duplicate-results"
      >
        <div class="pc-section-head">
          <strong>续长包含候选</strong>
          <span>{{ containedSelectedNames.length }}/{{ containedCandidateCount }} 份已选</span>
        </div>
        <p class="pc-recovery-safety-note">
          <i class="fa-solid fa-code-branch"></i>
          较长备份的开头逐条完整等于较短备份，并在末尾新增了楼层。较长分支受保护，较短候选默认选中；可分别阅读后取消。
        </p>
        <div class="pc-recovery-duplicate-list">
          <section
            v-for="group in recovery.duplicateScanResult.containedGroups"
            :key="group.id"
            class="pc-recovery-duplicate-group"
          >
            <div class="pc-section-head">
              <strong>保留 {{ group.keeper.actualChatItems }} 层续长版</strong>
              <span>可释放 {{ props.formatBytes(group.reclaimBytes) }}</span>
            </div>
            <button
              class="pc-recovery-duplicate-keeper"
              type="button"
              :disabled="recovery.managementBusy"
              @click="props.openBackup(group.keeper.summary)"
            >
              <i class="fa-solid fa-shield"></i>
              <span class="pc-list-row-copy">
                <strong>保留 · {{ props.formatBackupCreatedAt(group.keeper.summary) }}</strong>
                <small>{{ group.keeper.summary.fileName }} · {{ group.keeper.actualChatItems }} 层</small>
              </span>
              <i class="fa-solid fa-chevron-right"></i>
            </button>
            <div v-for="item in group.contained" :key="item.summary.fileName" class="pc-recovery-cleanup-item">
              <input
                type="checkbox"
                :checked="containedSelectedNames.includes(item.summary.fileName)"
                @change="toggleContainedCandidate(item.summary.fileName)"
              />
              <button
                class="pc-list-row-copy pc-recovery-candidate-open"
                type="button"
                :disabled="recovery.managementBusy"
                @click.stop="props.openBackup(item.summary)"
              >
                <strong>较短版 · {{ item.actualChatItems }} 层</strong>
                <small>
                  {{ item.summary.fileName }} · 续长版新增 {{ group.keeper.actualChatItems - item.actualChatItems }} 层
                </small>
              </button>
              <i class="fa-solid fa-chevron-right"></i>
            </div>
          </section>
        </div>
        <button
          class="pc-soft-btn danger"
          type="button"
          :disabled="!containedSelectedNames.length || recovery.duplicateDeleting"
          @click="confirmContainedDelete"
        >
          {{
            recovery.duplicateDeleting
              ? '正在逐份复核并删除…'
              : `删除选中的 ${containedSelectedNames.length} 份较短备份`
          }}
        </button>
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
          {{ cleanupScanButtonLabel }}
        </button>
      </article>

      <article v-if="recovery.cleanupScanning" class="pc-section-card pc-recovery-scan-status" aria-live="polite">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>{{ cleanupScanButtonLabel }}</span>
        <progress
          v-if="recovery.cleanupScanTotal"
          :max="recovery.cleanupScanTotal"
          :value="recovery.cleanupScanCompleted"
        ></progress>
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
            <div
              v-for="candidate in group.candidates"
              :key="candidate.summary.fileName"
              class="pc-recovery-cleanup-item"
            >
              <input
                type="checkbox"
                :checked="cleanupSelectedNames.includes(candidate.summary.fileName)"
                @change="toggleCleanupCandidate(candidate.summary.fileName)"
              />
              <button
                class="pc-list-row-copy pc-recovery-candidate-open"
                type="button"
                :disabled="recovery.managementBusy"
                @click.stop="props.openBackup(candidate.summary)"
              >
                <strong>{{ candidate.summary.fileName }}</strong>
                <small>{{ candidate.actualChatItems }} 层 · {{ props.formatDate(candidate.summary.lastMessageAt) }}</small>
              </button>
              <i class="fa-solid fa-chevron-right"></i>
            </div>
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
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import type { ChatBackupSummary, DuplicateBackupGroup } from '@/apps/recovery/model';
import { useChatRecoveryStore } from '@/apps/recovery/store';
import { usePhoneStore } from '@/store/phone';

const props = defineProps<{
  formatBackupCreatedAt: (summary: ChatBackupSummary) => string;
  formatBytes: (value: number) => string;
  formatDate: (value?: number) => string;
  openBackup: (summary: ChatBackupSummary) => Promise<void>;
}>();

const phone = usePhoneStore();
const recovery = useChatRecoveryStore();
const route = computed(() => phone.currentRoute);
const cleanupThreshold = ref(0);
const cleanupSelectedNames = ref<string[]>([]);
const duplicateSelectedNames = ref<string[]>([]);
const containedSelectedNames = ref<string[]>([]);
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
const containedCandidateCount = computed(() =>
  (recovery.duplicateScanResult?.containedGroups ?? []).reduce((total, group) => total + group.contained.length, 0),
);
const duplicateScanButtonLabel = computed(() => {
  if (!recovery.duplicateScanning) return '扫描完全相同的备份';
  if (!recovery.duplicateScanTotal) return '正在准备扫描…';
  return `正在校验 ${recovery.duplicateScanCompleted}/${recovery.duplicateScanTotal}`;
});
const cleanupScanButtonLabel = computed(() => {
  if (!recovery.cleanupScanning) return '扫描可清理备份';
  if (!recovery.cleanupScanTotal) return '正在准备扫描…';
  return `正在检查 ${recovery.cleanupScanCompleted}/${recovery.cleanupScanTotal}`;
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

watch(
  () => route.value.page,
  page => {
    if (page === 'duplicates' && !recovery.duplicateScanResult) {
      duplicateSelectedNames.value = [];
      containedSelectedNames.value = [];
    }
    if (page === 'cleanup' && !recovery.cleanupScanResult) {
      cleanupThreshold.value = 0;
      cleanupSelectedNames.value = [];
    }
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
      containedSelectedNames.value = result.containedGroups.flatMap(group =>
        group.contained.map(item => item.summary.fileName),
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

function toggleContainedCandidate(fileName: string) {
  containedSelectedNames.value = containedSelectedNames.value.includes(fileName)
    ? containedSelectedNames.value.filter(name => name !== fileName)
    : [...containedSelectedNames.value, fileName];
}

function selectAllDuplicateCandidates() {
  const scan = recovery.duplicateScanResult;
  if (!scan) return;
  duplicateSelectedNames.value = scan.groups.flatMap(group => group.duplicates.map(item => item.summary.fileName));
  containedSelectedNames.value = scan.containedGroups.flatMap(group =>
    group.contained.map(item => item.summary.fileName),
  );
}

function clearDuplicateCandidates() {
  duplicateSelectedNames.value = [];
  containedSelectedNames.value = [];
}

async function confirmContainedDelete() {
  if (!recovery.duplicateScanResult || !containedSelectedNames.value.length) return;
  const confirmed = await phone.confirmNotice(
    `将永久删除：${containedSelectedNames.value.length} 份较短聊天备份\n\n只有当较短备份的全部原始消息仍严格等于保留备份的开头时才会删除；删除前会重新下载双方复核。现有聊天不会被删除。`,
    {
      confirmLabel: `删除 ${containedSelectedNames.value.length} 份较短备份`,
      kind: 'warning',
      title: '确认删除续长包含备份',
    },
  );
  if (!confirmed) return;
  try {
    const result = await recovery.deleteContainedBackups(containedSelectedNames.value);
    containedSelectedNames.value = result.failed.map(item => item.summary.fileName);
    if (result.failed.length) {
      toastr.warning(`已删除 ${result.deleted.length} 份，${result.failed.length} 份失败或跳过`);
    } else {
      toastr.success(`已删除 ${result.deleted.length} 份较短聊天备份`);
    }
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '删除较短聊天备份失败');
  }
}

async function scanDuplicates() {
  try {
    const result = await recovery.scanDuplicateBackups(route.value.params?.groupId ?? '');
    duplicateSelectedNames.value = result.groups.flatMap(group => group.duplicates.map(item => item.summary.fileName));
    containedSelectedNames.value = result.containedGroups.flatMap(group =>
      group.contained.map(item => item.summary.fileName),
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
    `范围：${duplicateScopeLabel.value}\n将永久删除：${duplicateSelectedNames.value.length} 份完全相同的旧副本\n预计释放：${props.formatBytes(selectedBytes)}\n\n每组最新备份会保留；删除前还会再次下载并校验。此操作不会删除已有聊天。`,
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
</script>

<style scoped>
.pc-recovery-maintenance-flow,
.pc-recovery-page {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
}

.pc-recovery-page {
  gap: 10px;
}

.pc-recovery-selection-actions {
  margin: 0;
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

.pc-recovery-cleanup-results,
.pc-recovery-cleanup-summary,
.pc-recovery-duplicate-config,
.pc-recovery-duplicate-results {
  display: grid;
  gap: 10px;
}

.pc-recovery-cleanup-summary p,
.pc-recovery-safety-note {
  margin: 0;
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
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid var(--pc-border);
  color: var(--pc-theme-accent);
  /* ui-reuse-allow: row itself is a read-only preview trigger, not a general action button. */
  border-top: 0;
  border-right: 0;
  border-left: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
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

.pc-recovery-cleanup-group:last-child,
.pc-recovery-cleanup-item:last-child {
  border-bottom: 0;
}

.pc-recovery-cleanup-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid var(--pc-border);
}

.pc-recovery-candidate-open {
  /* ui-reuse-allow: nested row preview trigger keeps the checkbox as a separate destructive selection control. */
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

/* S03B: these Recovery-specific notices moved outside the parent's scoped-style boundary. */
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
