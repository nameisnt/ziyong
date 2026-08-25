<template>
  <section class="pc-extension-transfer-app">
    <nav class="pc-segment pc-extension-tabs" aria-label="扩展迁移模式">
      <button
        class="pc-segment-btn"
        :class="{ active: activeTab === 'export' }"
        type="button"
        @click="activeTab = 'export'"
      >
        导出清单
      </button>
      <button
        class="pc-segment-btn"
        :class="{ active: activeTab === 'import' }"
        type="button"
        @click="activeTab = 'import'"
      >
        导入安装
      </button>
    </nav>

    <template v-if="activeTab === 'export'">
      <header class="pc-compact-toolbar pc-directory-toolbar">
        <span class="pc-directory-count">{{ installed.length }} 个第三方扩展</span>
        <button
          class="pc-icon-btn"
          type="button"
          title="刷新"
          aria-label="刷新"
          :disabled="loading"
          @click="refreshInstalled"
        >
          <i class="fa-solid fa-rotate" :class="{ 'fa-spin': loading }"></i>
        </button>
      </header>

      <label class="pc-search-field">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="query" type="search" placeholder="搜索扩展名称或仓库地址" />
      </label>

      <div class="pc-extension-selection-row">
        <span>可导出 {{ exportableInstalled.length }} 个，已选 {{ selectedInstalledKeys.length }} 个</span>
        <button
          class="pc-soft-btn compact"
          type="button"
          :disabled="!exportableInstalled.length"
          @click="toggleInstalledSelection"
        >
          {{ allInstalledSelected ? '取消全选' : '全选可导出' }}
        </button>
      </div>

      <EmptyState v-if="loadError" title="无法读取扩展列表"
        ><p>{{ loadError }}</p></EmptyState
      >
      <div v-else-if="visibleInstalled.length" class="pc-directory-list">
        <article v-for="item in visibleInstalled" :key="item.key" class="pc-list-row pc-extension-row">
          <BulkSelectionCheckbox
            v-if="item.url"
            :label="`选择扩展 ${item.name}`"
            :model-value="selectedInstalledKeys.includes(item.key)"
            @update:model-value="setInstalledSelected(item.key, $event)"
          />
          <span v-else class="pc-extension-check-spacer"></span>
          <span class="pc-list-row-copy pc-extension-copy">
            <strong>{{ item.name }}</strong>
            <small v-if="item.url">{{ item.url }}</small>
            <small v-else>{{ item.error || '没有可导出的仓库地址' }}</small>
          </span>
          <span class="pc-list-row-meta">{{ scopeLabel(item.scope) }}</span>
        </article>
      </div>
      <EmptyState v-else :title="loading ? '正在读取扩展列表' : query.trim() ? '没有匹配的扩展' : '没有第三方扩展'" />

      <div class="pc-form-actions">
        <button class="pc-primary-btn" type="button" :disabled="!selectedInstalledKeys.length" @click="exportManifest">
          <i class="fa-solid fa-download"></i><span>导出所选</span>
        </button>
      </div>
    </template>

    <template v-else>
      <section class="pc-page-section pc-extension-file-picker">
        <input
          ref="fileInput"
          class="pc-hidden-input"
          type="file"
          accept="application/json,.json"
          @change="readImportFile"
        />
        <button class="pc-soft-btn" type="button" :disabled="installing" @click="fileInput?.click()">
          <i class="fa-solid fa-file-import"></i><span>选择扩展清单</span>
        </button>
        <span>{{ importFilename || '尚未选择清单' }}</span>
      </section>

      <div v-if="importRows.length" class="pc-extension-selection-row">
        <span>共 {{ importRows.length }} 项，已选 {{ selectedImportRows.length }} 项</span>
        <button class="pc-soft-btn compact" type="button" :disabled="installing" @click="toggleImportSelection">
          {{ allImportSelected ? '取消全选' : '全选可安装' }}
        </button>
      </div>

      <EmptyState v-if="importError" title="清单无法读取"
        ><p>{{ importError }}</p></EmptyState
      >
      <div v-else-if="importRows.length" class="pc-directory-list">
        <article v-for="row in importRows" :key="row.key" class="pc-list-row pc-extension-import-row">
          <BulkSelectionCheckbox
            v-if="row.url && !installing"
            :label="`选择扩展 ${row.name}`"
            :model-value="row.selected"
            @update:model-value="row.selected = $event"
          />
          <span v-else class="pc-extension-check-spacer"></span>
          <span class="pc-list-row-copy pc-extension-copy">
            <strong>{{ row.name }}</strong>
            <small>{{ row.url || '清单中没有仓库地址' }}</small>
            <small v-if="row.branch">分支：{{ row.branch }}</small>
            <small v-if="row.message" :class="{ 'pc-extension-error': row.status === 'failed' }">{{
              row.message
            }}</small>
          </span>
          <select
            v-model="row.scope"
            class="pc-select pc-extension-scope"
            :disabled="installing"
            :aria-label="`${row.name} 安装范围`"
          >
            <option value="local">本地</option>
            <option value="global">全局</option>
          </select>
        </article>
      </div>
      <EmptyState v-else-if="!importError" title="选择清单后在这里预览扩展" />

      <div v-if="importRows.length" class="pc-form-actions">
        <button v-if="installedCount" class="pc-soft-btn" type="button" @click="reloadTavern">
          <i class="fa-solid fa-rotate"></i><span>刷新酒馆</span>
        </button>
        <button
          class="pc-primary-btn"
          type="button"
          :disabled="!selectedImportRows.length || installing"
          @click="installSelected"
        >
          <i class="fa-solid fa-download"></i><span>{{ installing ? '正在安装' : '安装所选' }}</span>
        </button>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import BulkSelectionCheckbox from '@/components/BulkSelectionCheckbox.vue';
import EmptyState from '@/components/EmptyState.vue';
import { usePhoneStore } from '@/store/phone';
import {
  ExtensionRequestError,
  installThirdPartyExtension,
  listInstalledThirdPartyExtensions,
  type InstalledExtension,
} from './api';
import { parseExtensionManifest, type ExtensionManifestItem, type ExtensionScope } from './model';

interface ImportRow extends ExtensionManifestItem {
  key: string;
  message: string;
  selected: boolean;
  status: 'pending' | 'running' | 'installed' | 'skipped' | 'failed';
}

const phone = usePhoneStore();
const activeTab = ref<'export' | 'import'>('export');
const installed = ref<InstalledExtension[]>([]);
const selectedInstalledKeys = ref<string[]>([]);
const loading = ref(false);
const loadError = ref('');
const query = ref('');
const fileInput = ref<HTMLInputElement | null>(null);
const importFilename = ref('');
const importError = ref('');
const importRows = ref<ImportRow[]>([]);
const installing = ref(false);

const visibleInstalled = computed(() => {
  const keyword = query.value.trim().toLocaleLowerCase();
  return installed.value.filter(item => !keyword || `${item.name}\n${item.url}`.toLocaleLowerCase().includes(keyword));
});
const exportableInstalled = computed(() => visibleInstalled.value.filter(item => item.url));
const allInstalledSelected = computed(
  () =>
    Boolean(exportableInstalled.value.length) &&
    exportableInstalled.value.every(item => selectedInstalledKeys.value.includes(item.key)),
);
const selectedImportRows = computed(() => importRows.value.filter(row => row.selected && row.url));
const allImportSelected = computed(
  () =>
    Boolean(importRows.value.some(row => row.url)) &&
    importRows.value.filter(row => row.url).every(row => row.selected),
);
const installedCount = computed(() => importRows.value.filter(row => row.status === 'installed').length);

function scopeLabel(scope: ExtensionScope) {
  return scope === 'global' ? '全局' : '本地';
}

async function refreshInstalled() {
  loading.value = true;
  loadError.value = '';
  try {
    installed.value = await listInstalledThirdPartyExtensions();
    selectedInstalledKeys.value = installed.value.filter(item => item.url).map(item => item.key);
  } catch (error) {
    installed.value = [];
    selectedInstalledKeys.value = [];
    loadError.value = error instanceof Error ? error.message : String(error);
  } finally {
    loading.value = false;
  }
}

function setInstalledSelected(key: string, selected: boolean) {
  selectedInstalledKeys.value = selected
    ? [...new Set([...selectedInstalledKeys.value, key])]
    : selectedInstalledKeys.value.filter(item => item !== key);
}

function toggleInstalledSelection() {
  const visibleKeys = exportableInstalled.value.map(item => item.key);
  if (allInstalledSelected.value) {
    selectedInstalledKeys.value = selectedInstalledKeys.value.filter(key => !visibleKeys.includes(key));
  } else {
    selectedInstalledKeys.value = [...new Set([...selectedInstalledKeys.value, ...visibleKeys])];
  }
}

function downloadJson(filename: string, payload: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function exportManifest() {
  const selected = installed.value.filter(item => item.url && selectedInstalledKeys.value.includes(item.key));
  downloadJson('sillytavern-extensions-backup.json', {
    exportedAt: new Date().toISOString(),
    extensions: selected.map(({ branch, name, scope, url }) => ({ branch, name, scope, url })),
    schemaVersion: 1,
  });
  toastr.success(`已导出 ${selected.length} 个扩展`);
}

async function readImportFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  importFilename.value = file.name;
  importError.value = '';
  try {
    const parsed = parseExtensionManifest(JSON.parse((await file.text()).replace(/^\uFEFF/u, '')));
    importRows.value = parsed.map((item, index) => ({
      ...item,
      key: `${item.scope}:${item.name}:${index}`,
      message: '',
      selected: Boolean(item.url),
      status: 'pending',
    }));
    toastr.success(`已读取 ${parsed.length} 条扩展记录`);
  } catch (error) {
    importRows.value = [];
    importError.value = error instanceof Error ? error.message : String(error);
  } finally {
    input.value = '';
  }
}

function toggleImportSelection() {
  const selected = !allImportSelected.value;
  importRows.value.forEach(row => {
    row.selected = selected && Boolean(row.url);
  });
}

function installErrorMessage(error: unknown) {
  if (error instanceof ExtensionRequestError && error.status === 403) return '没有全局安装权限，请改为本地后重试';
  return error instanceof Error ? error.message : String(error);
}

async function runInstallWorkers(rows: ImportRow[]) {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(3, rows.length) }, async () => {
    while (nextIndex < rows.length) {
      const index = nextIndex;
      nextIndex += 1;
      const row = rows[index]!;
      row.status = 'running';
      row.message = '安装中';
      try {
        const result = await installThirdPartyExtension(row);
        row.status = result;
        row.message = result === 'installed' ? '安装成功' : '扩展已存在或发生目录冲突';
        row.selected = false;
      } catch (error) {
        row.status = 'failed';
        row.message = installErrorMessage(error);
      }
    }
  });
  await Promise.all(workers);
}

async function installSelected() {
  const rows = selectedImportRows.value;
  if (!rows.length) return;
  const localCount = rows.filter(row => row.scope === 'local').length;
  const globalCount = rows.length - localCount;
  const confirmed = await phone.confirmNotice(
    `将从清单中的仓库安装 ${rows.length} 个第三方扩展（本地 ${localCount}，全局 ${globalCount}）。请确认这些来源可信。`,
    { confirmLabel: '开始安装', kind: 'warning', title: '安装第三方扩展' },
  );
  if (!confirmed) return;
  installing.value = true;
  try {
    await runInstallWorkers(rows);
    const failed = rows.filter(row => row.status === 'failed').length;
    const skipped = rows.filter(row => row.status === 'skipped').length;
    const message = `安装结束：成功 ${rows.length - failed - skipped}，跳过 ${skipped}，失败 ${failed}`;
    if (failed) toastr.warning(message);
    else toastr.success(message);
  } finally {
    installing.value = false;
  }
}

function reloadTavern() {
  location.reload();
}

onActivated(refreshInstalled);
</script>

<style scoped>
.pc-extension-transfer-app {
  display: grid;
  align-content: start;
  gap: 12px;
  min-height: 100%;
}

.pc-extension-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: 100%;
}

.pc-extension-selection-row,
.pc-extension-file-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-extension-selection-row > span,
.pc-extension-file-picker > span {
  min-width: 0;
  overflow: hidden;
  color: var(--pc-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-extension-row,
.pc-extension-import-row {
  grid-template-columns: auto minmax(0, 1fr) auto;
}

.pc-extension-check-spacer {
  width: 28px;
}

.pc-extension-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-extension-scope {
  width: 74px;
  padding-inline: 7px;
  font-size: 12px;
}

.pc-extension-error {
  color: var(--pc-danger) !important;
}

@media (max-width: 370px) {
  .pc-extension-import-row {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .pc-extension-import-row .pc-extension-scope {
    grid-column: 2;
  }
}
</style>
