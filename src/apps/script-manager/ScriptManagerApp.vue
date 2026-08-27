<template>
  <section class="pc-script-manager-app">
    <header v-if="!selection.active.value" class="pc-compact-toolbar pc-directory-toolbar">
      <span class="pc-directory-count">{{ items.length }} 个助手脚本</span>
      <div class="pc-directory-actions">
        <button
          class="pc-icon-btn"
          type="button"
          title="导入全部"
          aria-label="导入全部"
          :disabled="loading"
          @click="fileInput?.click()"
        >
          <i class="fa-solid fa-upload"></i>
        </button>
        <button
          class="pc-icon-btn"
          type="button"
          title="导出全部"
          aria-label="导出全部"
          :disabled="loading"
          @click="exportAll"
        >
          <i class="fa-solid fa-download"></i>
        </button>
        <button
          class="pc-icon-btn"
          type="button"
          title="批量管理"
          aria-label="批量管理"
          :disabled="!visibleItems.length"
          @click="selection.start"
        >
          <i class="fa-solid fa-list-check"></i>
        </button>
        <button class="pc-icon-btn" type="button" title="刷新" aria-label="刷新" :disabled="loading" @click="refresh">
          <i class="fa-solid fa-rotate" :class="{ 'fa-spin': loading }"></i>
        </button>
      </div>
      <input ref="fileInput" hidden type="file" accept="application/json,.json" @change="importAll" />
    </header>

    <template v-else>
      <BulkSelectionBar
        :all-selected="selection.allSelected.value"
        :selected-count="selection.selectedIds.value.length"
        :total-count="visibleItems.length"
        @cancel="selection.cancel"
        @remove="removeSelected"
        @toggle-all="selection.toggleAll"
      />
      <div class="pc-script-selection-actions">
        <button class="pc-soft-btn compact" type="button" :disabled="!visibleItems.length" @click="invertVisible">
          反选
        </button>
        <button
          class="pc-soft-btn compact"
          type="button"
          :disabled="!selection.selectedIds.value.length"
          @click="groupSelected"
        >
          <i class="fa-solid fa-folder-plus"></i><span>分组</span>
        </button>
        <button
          class="pc-soft-btn compact"
          type="button"
          :disabled="!selection.selectedIds.value.length"
          @click="exportSelected"
        >
          <i class="fa-solid fa-download"></i><span>导出所选</span>
        </button>
      </div>
    </template>

    <nav class="pc-segment pc-script-scope-tabs" aria-label="脚本范围">
      <button
        v-for="scope in scopeOptions"
        :key="scope.id"
        class="pc-segment-btn compact"
        :class="{ active: scopeFilter === scope.id }"
        type="button"
        @click="scopeFilter = scope.id"
      >
        {{ scope.label }}
      </button>
    </nav>

    <label class="pc-search-field">
      <i class="fa-solid fa-magnifying-glass"></i>
      <input v-model="query" type="search" placeholder="搜索脚本名称或文件夹" />
    </label>

    <EmptyState v-if="errorMessage" title="无法读取助手脚本">
      <p>{{ errorMessage }}</p>
    </EmptyState>
    <div v-else-if="visibleItems.length" class="pc-directory-list pc-script-list">
      <article v-for="item in visibleItems" :key="item.key" class="pc-list-row pc-script-row">
        <BulkSelectionCheckbox
          v-if="selection.active.value"
          :label="`选择脚本 ${item.name}`"
          :model-value="selection.selectedIdSet.value.has(item.key)"
          @update:model-value="selection.setSelected(item.key, $event)"
        />
        <span class="pc-list-row-copy">
          <strong>{{ item.name }}</strong>
          <small>{{ item.folder || (item.script.enabled ? '已启用' : '未启用') }}</small>
        </span>
        <span class="pc-list-row-meta">{{ scriptScopeLabel(item.scope) }}</span>
      </article>
    </div>
    <EmptyState v-else :title="loading ? '正在读取助手脚本' : query.trim() ? '没有匹配的脚本' : '当前范围没有脚本'" />
  </section>
</template>

<script setup lang="ts">
import BulkSelectionBar from '@/components/BulkSelectionBar.vue';
import BulkSelectionCheckbox from '@/components/BulkSelectionCheckbox.vue';
import EmptyState from '@/components/EmptyState.vue';
import { useBulkSelection } from '@/composables/useBulkSelection';
import { usePhoneStore } from '@/store/phone';
import {
  createAssistantScriptBundle,
  importAssistantScriptBundle,
  listAssistantScripts,
  moveAssistantScriptsToFolder,
  removeAssistantScripts,
} from './api';
import { SCRIPT_SCOPES, scriptScopeLabel, type ScriptListItem, type ScriptScope } from './model';

const phone = usePhoneStore();
const items = ref<ScriptListItem[]>([]);
const loading = ref(false);
const errorMessage = ref('');
const query = ref('');
const scopeFilter = ref<'all' | ScriptScope>('all');
const fileInput = ref<HTMLInputElement | null>(null);
const scopeOptions: Array<{ id: 'all' | ScriptScope; label: string }> = [
  { id: 'all', label: '全部' },
  ...SCRIPT_SCOPES,
];
const visibleItems = computed(() => {
  const keyword = query.value.trim().toLocaleLowerCase();
  return items.value.filter(item => {
    if (scopeFilter.value !== 'all' && item.scope !== scopeFilter.value) return false;
    return (
      !keyword || item.name.toLocaleLowerCase().includes(keyword) || item.folder.toLocaleLowerCase().includes(keyword)
    );
  });
});
const selection = useBulkSelection(computed(() => visibleItems.value.map(item => item.key)));
const selectedItems = computed(() => items.value.filter(item => selection.selectedIdSet.value.has(item.key)));

function refresh() {
  loading.value = true;
  errorMessage.value = '';
  try {
    items.value = listAssistantScripts();
    selection.cancel();
  } catch (error) {
    items.value = [];
    errorMessage.value = error instanceof Error ? error.message : String(error);
  } finally {
    loading.value = false;
  }
}

function invertVisible() {
  for (const item of visibleItems.value) {
    selection.setSelected(item.key, !selection.selectedIdSet.value.has(item.key));
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

function dateTag() {
  return new Date().toISOString().replace(/[:.]/gu, '-');
}

function exportAll() {
  try {
    downloadJson(`助手脚本_全部_${dateTag()}.json`, createAssistantScriptBundle());
    toastr.success('已导出全部助手脚本');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  }
}

async function importAll(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    const value = JSON.parse((await file.text()).replace(/^\uFEFF/u, '')) as unknown;
    importAssistantScriptBundle(value);
    refresh();
    toastr.success('已导入全部助手脚本');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  }
}

async function groupSelected() {
  const name = await phone.promptNotice('输入脚本分组名称。所选脚本会在各自作用域内进入同名文件夹。', {
    confirmLabel: '分组',
    title: '脚本分组',
  });
  if (!name?.trim()) return;
  moveAssistantScriptsToFolder(selectedItems.value, name);
  refresh();
}

function exportSelected() {
  const selected = selectedItems.value;
  downloadJson(`助手脚本_所选_${selected.length}项_${dateTag()}.json`, {
    count: selected.length,
    exported_at: new Date().toISOString(),
    scripts: selected.map(item => ({
      folder: item.folder,
      id: item.id,
      name: item.name,
      scope: item.scope,
      scopeLabel: scriptScopeLabel(item.scope),
      script: item.script,
    })),
  });
  toastr.success(`已导出 ${selected.length} 个助手脚本`);
}

async function removeSelected() {
  const selected = selectedItems.value;
  if (!selected.length) return;
  const confirmed = await phone.confirmNotice(`确认删除选中的 ${selected.length} 个助手脚本吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
    title: '删除助手脚本',
  });
  if (!confirmed) return;
  try {
    removeAssistantScripts(selected);
    toastr.success(`已删除 ${selected.length} 个助手脚本`);
    refresh();
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
    refresh();
  }
}

onActivated(refresh);
</script>

<style scoped>
.pc-script-manager-app {
  display: grid;
  align-content: start;
  gap: 12px;
  min-height: 100%;
}

.pc-script-scope-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  width: 100%;
}

.pc-script-selection-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.pc-script-row {
  grid-template-columns: minmax(0, 1fr) auto;
}

.pc-script-row:has(.pc-bulk-selection-checkbox) {
  grid-template-columns: auto minmax(0, 1fr) auto;
}
</style>
