<template>
  <section class="pc-file-repository">
    <template v-if="route.page === 'root'">
      <article class="pc-section-card pc-repository-settings">
        <div class="pc-repository-setting-row">
          <span>
            <strong>自动文件快照</strong>
            <small>有变化时每两分钟保存一次</small>
          </span>
          <label class="pc-toggle" title="启用或关闭自动文件快照">
            <input :checked="repository.settings.autoEnabled" type="checkbox" @change="changeAutoEnabled" />
            <span aria-hidden="true"></span>
          </label>
        </div>
        <label class="pc-field-group">
          <span class="pc-field-label">保留最近版本</span>
          <input
            class="pc-field"
            type="number"
            min="3"
            max="50"
            :value="repository.settings.retention"
            @change="changeRetention"
          />
        </label>
        <div class="pc-form-actions pc-repository-actions">
          <button class="pc-soft-btn" type="button" :disabled="repository.busy" @click="fileInput?.click()">
            <i class="fa-solid fa-file-import"></i><span>导入快照</span>
          </button>
          <button class="pc-primary-btn" type="button" :disabled="repository.busy" @click="createSnapshot">
            <i :class="repository.busy ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-camera'"></i>
            <span>立即快照</span>
          </button>
          <input ref="fileInput" hidden type="file" accept="application/json,.json" @change="importSnapshot" />
        </div>
      </article>

      <div v-if="repository.lastError" class="pc-status-card danger">
        <strong>文件仓库操作失败</strong>
        <p>{{ repository.lastError }}</p>
      </div>

      <div class="pc-compact-toolbar pc-directory-toolbar">
        <span class="pc-directory-count">{{ repository.snapshots.length }} 个快照</span>
        <button class="pc-icon-btn" type="button" :disabled="repository.busy" title="刷新仓库清单" @click="refresh">
          <i :class="repository.busy ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-rotate'"></i>
        </button>
      </div>

      <div v-if="repository.snapshots.length" class="pc-directory-list pc-repository-list">
        <article v-for="snapshot in repository.snapshots" :key="snapshot.id" class="pc-list-row pc-repository-row">
          <button type="button" @click="openSnapshot(snapshot.id)">
            <span>
              <strong>{{ formatDate(snapshot.createdAt) }}</strong>
              <small>{{ snapshot.reason }} · {{ formatBytes(snapshot.size) }}</small>
            </span>
            <i :class="snapshot.protected ? 'fa-solid fa-shield-halved' : 'fa-solid fa-chevron-right'"></i>
          </button>
        </article>
      </div>
      <EmptyState v-else title="还没有文件快照" description="点击“立即快照”建立第一份可恢复版本。" />
    </template>

    <template v-else-if="route.page === 'detail'">
      <EmptyState v-if="detailLoading" title="正在读取快照" />
      <EmptyState v-else-if="!activeSnapshot" title="这个快照已经不存在" />
      <template v-else>
        <article class="pc-section-card pc-repository-detail">
          <div class="pc-repository-detail-head">
            <span>
              <strong>{{ formatDate(activeSnapshot.createdAt) }}</strong>
              <small>{{ activeSnapshot.reason }}</small>
            </span>
            <i v-if="activeSnapshot.protected" class="fa-solid fa-shield-halved" title="受保护"></i>
          </div>
          <dl v-if="detailPayload" class="pc-repository-metrics">
            <div><dt>数据域</dt><dd>{{ detailDomainCount }}</dd></div>
            <div><dt>私有预设</dt><dd>{{ detailPayload.pluginPresets.length }}</dd></div>
            <div><dt>文件大小</dt><dd>{{ formatBytes(activeSnapshot.size) }}</dd></div>
            <div><dt>校验摘要</dt><dd :title="activeSnapshot.checksum">{{ activeSnapshot.checksum.slice(0, 10) }}</dd></div>
          </dl>
        </article>

        <div class="pc-form-actions pc-repository-detail-actions">
          <button class="pc-soft-btn" type="button" :disabled="repository.busy" @click="toggleProtection">
            <i :class="activeSnapshot.protected ? 'fa-solid fa-shield' : 'fa-solid fa-shield-halved'"></i>
            <span>{{ activeSnapshot.protected ? '取消保护' : '保护版本' }}</span>
          </button>
          <button class="pc-soft-btn" type="button" :disabled="repository.busy" @click="exportActive">
            <i class="fa-solid fa-file-export"></i><span>导出</span>
          </button>
          <button
            class="pc-soft-btn danger"
            type="button"
            :disabled="repository.busy || activeSnapshot.protected"
            @click="removeActive"
          >
            <i class="fa-solid fa-trash"></i><span>删除</span>
          </button>
          <button class="pc-primary-btn" type="button" :disabled="repository.busy || !detailPayload" @click="restoreActive">
            <i class="fa-solid fa-clock-rotate-left"></i><span>恢复此版本</span>
          </button>
        </div>
      </template>
    </template>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import { usePhoneStore } from '@/store/phone';
import { useFileRepositoryStore } from '@/store/fileRepository';

const phone = usePhoneStore();
const repository = useFileRepositoryStore();
const route = computed(() => phone.currentRoute);
const fileInput = ref<HTMLInputElement | null>(null);
const detailLoading = ref(false);
const detailPayload = ref<Awaited<ReturnType<typeof repository.readSnapshot>> | null>(null);
const activeSnapshotId = computed(() => route.value.params?.snapshotId || '');
const activeSnapshot = computed(() => repository.snapshots.find(snapshot => snapshot.id === activeSnapshotId.value) ?? null);
const detailDomainCount = computed(() => Object.keys(detailPayload.value?.backup.data.domains ?? {}).length);

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

async function refresh() {
  try {
    await repository.initialize(true);
    toastr.success('仓库清单已刷新');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  }
}

async function createSnapshot() {
  try {
    await repository.createSnapshot('手动快照', true);
    toastr.success('文件快照已保存');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  }
}

function openSnapshot(snapshotId: string) {
  phone.pushPage('detail', '文件快照', { snapshotId });
}

async function loadDetail() {
  detailPayload.value = null;
  if (route.value.page !== 'detail' || !activeSnapshotId.value) return;
  detailLoading.value = true;
  try {
    detailPayload.value = await repository.readSnapshot(activeSnapshotId.value);
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  } finally {
    detailLoading.value = false;
  }
}

async function changeAutoEnabled(event: Event) {
  try {
    await repository.setAutoEnabled((event.target as HTMLInputElement).checked);
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  }
}

async function changeRetention(event: Event) {
  try {
    await repository.setRetention(Number((event.target as HTMLInputElement).value));
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  }
}

async function importSnapshot(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    const snapshot = await repository.importSnapshot(file);
    toastr.success('快照已导入并自动保护');
    openSnapshot(snapshot.id);
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  }
}

async function toggleProtection() {
  if (!activeSnapshot.value) return;
  try {
    await repository.setProtected(activeSnapshot.value.id, !activeSnapshot.value.protected);
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  }
}

async function exportActive() {
  if (!activeSnapshot.value) return;
  try {
    await repository.exportSnapshot(activeSnapshot.value.id);
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  }
}

async function removeActive() {
  if (!activeSnapshot.value) return;
  const confirmed = await phone.confirmNotice('确认删除这份文件快照吗？删除后不能从仓库恢复。', {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!confirmed) return;
  try {
    await repository.removeSnapshot(activeSnapshot.value.id);
    await phone.goBack();
    toastr.success('文件快照已删除');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  }
}

async function restoreActive() {
  if (!activeSnapshot.value || !detailPayload.value) return;
  const confirmed = await phone.confirmNotice(
    `恢复到 ${formatDate(activeSnapshot.value.createdAt)} 的插件数据吗？当前资料、内容、设置和私有预设会被该版本替换。`,
    { confirmLabel: '恢复', kind: 'warning' },
  );
  if (!confirmed) return;
  try {
    await repository.restoreSnapshot(activeSnapshot.value.id);
    toastr.success('插件文件快照已恢复');
    phone.goHome();
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  }
}

watch([() => route.value.page, activeSnapshotId], loadDetail, { immediate: true });
onMounted(() => void repository.initialize());
</script>

<style scoped>
.pc-file-repository {
  display: grid;
  gap: 12px;
  min-height: 100%;
  align-content: start;
}

.pc-repository-settings,
.pc-repository-detail {
  display: grid;
  gap: 14px;
}

.pc-repository-setting-row,
.pc-repository-detail-head {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pc-repository-setting-row > span,
.pc-repository-detail-head > span {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.pc-repository-setting-row small,
.pc-repository-detail-head small,
.pc-repository-row small {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-repository-actions,
.pc-repository-detail-actions {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.pc-repository-row > button {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--pc-text);
  text-align: left;
  cursor: pointer;
}

.pc-repository-row > button > span {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.pc-repository-row > button > i,
.pc-repository-detail-head > i {
  flex: 0 0 auto;
  color: var(--pc-theme-accent);
}

.pc-repository-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.pc-repository-metrics > div {
  display: grid;
  gap: 3px;
  padding: 10px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
}

.pc-repository-metrics dt {
  color: var(--pc-muted);
  font-size: 11px;
}

.pc-repository-metrics dd {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-soft-btn.danger {
  color: var(--pc-danger);
}
</style>
