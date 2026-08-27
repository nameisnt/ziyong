<template>
  <section class="pc-script-manager-app">
    <header v-if="!selection.active.value" class="pc-compact-toolbar pc-directory-toolbar">
      <span class="pc-directory-count">{{ items.length }} 个助手脚本</span>
      <div class="pc-directory-actions">
        <button
          class="pc-icon-btn"
          type="button"
          :title="`导入到${scriptScopeLabel(writeScope)}`"
          :aria-label="`导入到${scriptScopeLabel(writeScope)}`"
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
          :title="`在${scriptScopeLabel(writeScope)}新建分组`"
          :aria-label="`在${scriptScopeLabel(writeScope)}新建分组`"
          :disabled="loading"
          @click="createGroup"
        >
          <i class="fa-solid fa-folder-plus"></i>
        </button>
        <button
          class="pc-icon-btn"
          type="button"
          title="批量管理"
          aria-label="批量管理"
          :disabled="!visibleItems.length"
          @click="startSelection"
        >
          <i class="fa-solid fa-list-check"></i>
        </button>
        <button class="pc-icon-btn" type="button" title="刷新" aria-label="刷新" :disabled="loading" @click="refresh">
          <i class="fa-solid fa-rotate" :class="{ 'fa-spin': loading }"></i>
        </button>
      </div>
      <input ref="fileInput" hidden type="file" accept="application/json,.json" @change="importFile" />
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
          <i class="fa-solid fa-folder-plus"></i><span>移入分组</span>
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
    <div v-else-if="visibleCatalog.length" class="pc-script-catalog">
      <section v-for="section in visibleCatalog" :key="section.scope" class="pc-script-scope-section">
        <strong v-if="scopeFilter === 'all'" class="pc-script-scope-title">{{ section.label }}</strong>
        <section v-for="group in section.groups" :key="group.key" class="pc-script-folder">
          <header class="pc-script-folder-head">
            <button
              class="pc-script-folder-toggle"
              type="button"
              :aria-expanded="isGroupOpen(group)"
              :title="isGroupOpen(group) ? '收起文件夹' : '展开文件夹'"
              @click="toggleGroup(group)"
            >
              <i class="fa-solid" :class="isGroupOpen(group) ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
              <i class="fa-solid" :class="group.folder ? 'fa-folder' : 'fa-file-lines'"></i>
              <strong :title="group.name">{{ group.name }}</strong>
              <span>{{ group.scripts.length }}</span>
            </button>
            <div v-if="group.folder && !selection.active.value" class="pc-directory-actions">
              <button class="pc-icon-btn" type="button" title="重命名分组" aria-label="重命名分组" @click="renameGroup(group)">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="pc-icon-btn" type="button" title="导出这个分组" aria-label="导出这个分组" @click="exportGroup(group)">
                <i class="fa-solid fa-download"></i>
              </button>
            </div>
          </header>
          <div v-if="isGroupOpen(group)" class="pc-directory-list pc-script-list">
            <article v-for="item in group.scripts" :key="item.key" class="pc-list-row pc-script-row">
              <BulkSelectionCheckbox
                v-if="selection.active.value"
                :label="`选择脚本 ${item.name}`"
                :model-value="selection.selectedIdSet.value.has(item.key)"
                @update:model-value="selection.setSelected(item.key, $event)"
              />
              <span class="pc-list-row-copy">
                <strong>{{ item.name }}</strong>
              </span>
            </article>
            <EmptyState v-if="!group.scripts.length" title="空文件夹" />
          </div>
        </section>
      </section>
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
  createAssistantScriptFolder,
  getAssistantScriptFolder,
  importAssistantScriptFile,
  listAssistantScriptCatalog,
  moveAssistantScriptsToFolder,
  removeAssistantScripts,
  renameAssistantScriptFolder,
} from './api';
import {
  SCRIPT_SCOPES,
  scriptScopeLabel,
  type ScriptFolderGroup,
  type ScriptListItem,
  type ScriptScope,
  type ScriptScopeCatalog,
} from './model';

const phone = usePhoneStore();
const catalog = ref<ScriptScopeCatalog[]>([]);
const loading = ref(false);
const errorMessage = ref('');
const query = ref('');
const scopeFilter = ref<'all' | ScriptScope>('all');
const expandedGroupKeys = ref(new Set<string>());
const fileInput = ref<HTMLInputElement | null>(null);
const scopeOptions: Array<{ id: 'all' | ScriptScope; label: string }> = [
  { id: 'all', label: '全部' },
  ...SCRIPT_SCOPES,
];
const writeScope = computed<ScriptScope>(() => (scopeFilter.value === 'all' ? 'global' : scopeFilter.value));
const items = computed(() => catalog.value.flatMap(section => section.groups.flatMap(group => group.scripts)));
const visibleCatalog = computed(() => {
  const keyword = query.value.trim().toLocaleLowerCase();
  return catalog.value
    .filter(section => scopeFilter.value === 'all' || section.scope === scopeFilter.value)
    .map(section => ({
      ...section,
      groups: section.groups.flatMap(group => {
        if (!keyword) return [group];
        const groupMatches = group.name.toLocaleLowerCase().includes(keyword);
        const scripts = groupMatches
          ? group.scripts
          : group.scripts.filter(item => item.name.toLocaleLowerCase().includes(keyword));
        return groupMatches || scripts.length ? [{ ...group, scripts }] : [];
      }),
    }))
    .filter(section => section.groups.length);
});
const visibleItems = computed(() => visibleCatalog.value.flatMap(section => section.groups.flatMap(group => group.scripts)));
const selection = useBulkSelection(computed(() => visibleItems.value.map(item => item.key)));
const selectedItems = computed(() => items.value.filter(item => selection.selectedIdSet.value.has(item.key)));

function refresh() {
  loading.value = true;
  errorMessage.value = '';
  try {
    catalog.value = listAssistantScriptCatalog();
    expandedGroupKeys.value = new Set(catalog.value.flatMap(section => section.groups.map(group => group.key)));
    selection.cancel();
  } catch (error) {
    catalog.value = [];
    errorMessage.value = error instanceof Error ? error.message : String(error);
  } finally {
    loading.value = false;
  }
}

function isGroupOpen(group: ScriptFolderGroup) {
  return Boolean(query.value.trim()) || expandedGroupKeys.value.has(group.key);
}

function toggleGroup(group: ScriptFolderGroup) {
  const next = new Set(expandedGroupKeys.value);
  if (next.has(group.key)) next.delete(group.key);
  else next.add(group.key);
  expandedGroupKeys.value = next;
}

function startSelection() {
  expandedGroupKeys.value = new Set(visibleCatalog.value.flatMap(section => section.groups.map(group => group.key)));
  selection.start();
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

function exportGroup(group: ScriptFolderGroup) {
  if (!group.folder) return;
  try {
    const folder = getAssistantScriptFolder(group.scope, group.folder.id);
    const filename = folder.name.replace(/[\\/:*?"<>|]/gu, '_');
    downloadJson(`酒馆助手脚本文件夹-${filename}.json`, folder);
    toastr.success(`已导出分组“${folder.name}”`);
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  }
}

async function importFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    const value = JSON.parse((await file.text()).replace(/^\uFEFF/u, '')) as unknown;
    const result = importAssistantScriptFile(value, writeScope.value);
    refresh();
    toastr.success(
      result.kind === 'bundle' ? '已导入全部助手脚本' : `已导入到${scriptScopeLabel(result.scope)}`,
    );
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  }
}

async function createGroup() {
  const name = await phone.promptNotice(`输入分组名称。分组会同步到${scriptScopeLabel(writeScope.value)}助手脚本。`, {
    confirmLabel: '新建',
    title: '新建脚本分组',
  });
  if (!name?.trim()) return;
  try {
    createAssistantScriptFolder(writeScope.value, name);
    refresh();
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  }
}

async function renameGroup(group: ScriptFolderGroup) {
  if (!group.folder) return;
  const name = await phone.promptNotice('输入新的脚本分组名称。', {
    confirmLabel: '改名',
    initialValue: group.name,
    title: '重命名脚本分组',
  });
  if (!name?.trim() || name.trim() === group.name) return;
  try {
    renameAssistantScriptFolder(group.scope, group.folder.id, name);
    refresh();
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  }
}

async function groupSelected() {
  const name = await phone.promptNotice('输入已有或新的分组名称。所选脚本会在各自作用域内移入同名文件夹。', {
    confirmLabel: '移动',
    title: '移动脚本',
  });
  if (!name?.trim()) return;
  moveAssistantScriptsToFolder(selectedItems.value, name);
  refresh();
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
  gap: 10px;
  min-height: 100%;
}

.pc-script-scope-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  width: 100%;
}

.pc-script-selection-actions,
.pc-script-catalog,
.pc-script-scope-section {
  display: grid;
  gap: 8px;
}

.pc-script-selection-actions {
  grid-template-columns: auto auto;
  justify-content: end;
}

.pc-script-scope-title {
  padding: 2px 0;
  color: var(--pc-muted);
  font-size: 13px;
}

.pc-script-folder {
  min-width: 0;
  border-bottom: 1px solid var(--pc-border);
}

.pc-script-folder:last-child {
  border-bottom: 0;
}

.pc-script-folder-head {
  display: grid;
  min-height: 44px;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px;
}

.pc-script-folder-toggle {
  display: flex;
  min-width: 0;
  min-height: 44px;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  text-align: left;
}

.pc-script-folder-toggle strong {
  min-width: 0;
  overflow: hidden;
  flex: 1 1 auto;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-script-folder-toggle > span {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-script-list {
  padding-left: 20px;
}

.pc-script-row {
  grid-template-columns: minmax(0, 1fr);
  min-height: 44px;
  padding: 6px 0;
}

.pc-script-row:has(.pc-bulk-selection-checkbox) {
  grid-template-columns: auto minmax(0, 1fr);
}
</style>
