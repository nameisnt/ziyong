<template>
  <section class="pc-external-profiles-app">
    <section v-if="route.page === 'root'" class="pc-external-profiles-page">
      <div class="pc-compact-toolbar pc-directory-toolbar pc-external-profiles-toolbar">
        <span class="pc-directory-count">{{ tableCountLabel }}</span>
        <div class="pc-external-profiles-actions">
          <button class="pc-icon-btn" type="button" title="资料映射" aria-label="资料映射" @click="openMappings">
            <i class="fa-solid fa-link"></i>
          </button>
          <button
            class="pc-icon-btn"
            type="button"
            :disabled="state.status === 'loading'"
            title="重新读取外部数据库"
            aria-label="重新读取外部数据库"
            @click="refresh"
          >
            <i :class="['fa-solid fa-rotate', { 'fa-spin': state.status === 'loading' }]"></i>
          </button>
          <button v-if="state.canOpenVisualizer" class="pc-soft-btn compact" type="button" @click="openVisualizer">
            <i class="fa-solid fa-up-right-from-square"></i><span>完整数据库</span>
          </button>
        </div>
      </div>

      <div v-if="state.subscriptionWarning" class="pc-status-card warning">
        <strong>更新监听不可用</strong>
        <p>{{ state.subscriptionWarning }}</p>
      </div>

      <label v-if="state.status === 'ready' && state.tables.length" class="pc-search-field">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="catalogQuery" type="search" placeholder="搜索外部资料表" />
      </label>

      <FailedDraftList
        :drafts="externalFailedDrafts"
        :get-context="getFailedDraftContext"
        :get-title="getFailedDraftTitle"
        title="外部资料生成失败草稿"
        @open="openFailedDraft"
        @remove="removeFailedDraft"
      />

      <div v-if="state.status === 'ready' && filteredTables.length" class="pc-directory-list">
        <button
          v-for="table in filteredTables"
          :key="table.key"
          class="pc-list-row pc-external-profile-table-row"
          type="button"
          @click="openTable(table)"
        >
          <span class="pc-external-profile-table-icon"><i class="fa-solid fa-table"></i></span>
          <span class="pc-external-profile-table-main">
            <strong>{{ table.name }}</strong>
            <small>{{ table.rows.length }} 行 · {{ table.columns.length }} 列</small>
          </span>
          <i class="fa-solid fa-chevron-right pc-external-profile-chevron"></i>
        </button>
      </div>

      <EmptyState v-else-if="state.status === 'loading'" title="正在读取外部数据库…">
        <p>请稍候，正在获取当前聊天的表格。</p>
      </EmptyState>
      <EmptyState v-else-if="state.status === 'missing'" title="未检测到外部数据库">
        <p>{{ state.message }}</p>
        <button class="pc-soft-btn compact pc-external-profile-empty-action" type="button" @click="refresh">
          重新检测
        </button>
      </EmptyState>
      <EmptyState v-else-if="state.status === 'error'" title="外部数据库读取失败">
        <p>{{ state.message }}</p>
        <button class="pc-soft-btn compact pc-external-profile-empty-action" type="button" @click="refresh">
          重新读取
        </button>
      </EmptyState>
      <EmptyState v-else-if="state.status === 'ready' && !state.tables.length" title="外部数据库还没有表格">
        <button
          v-if="state.canOpenVisualizer"
          class="pc-primary-btn compact pc-external-profile-empty-action"
          type="button"
          @click="openVisualizer"
        >
          打开完整数据库
        </button>
      </EmptyState>
      <EmptyState v-else-if="state.status === 'ready' && !filteredTables.length" title="没有匹配的资料表">
        <button class="pc-soft-btn compact pc-external-profile-empty-action" type="button" @click="catalogQuery = ''">
          清除搜索
        </button>
      </EmptyState>
    </section>

    <ProfileMappingsPage
      v-else-if="route.page === 'mappings' || route.page === 'mapping-editor'"
      :tables="state.tables"
    />

    <section v-else-if="route.page === 'table'" class="pc-external-profiles-page pc-external-profile-detail">
      <div class="pc-compact-toolbar pc-directory-toolbar pc-external-profiles-toolbar">
        <span class="pc-directory-count">{{ activeTableCountLabel }}</span>
        <div class="pc-external-profiles-actions">
          <button
            class="pc-icon-btn"
            type="button"
            :disabled="state.status === 'loading'"
            title="重新读取当前表"
            aria-label="重新读取当前表"
            @click="refresh"
          >
            <i :class="['fa-solid fa-rotate', { 'fa-spin': state.status === 'loading' }]"></i>
          </button>
          <button
            v-if="state.canOpenVisualizer"
            class="pc-icon-btn"
            type="button"
            title="在完整数据库中打开"
            aria-label="在完整数据库中打开"
            @click="openVisualizer"
          >
            <i class="fa-solid fa-up-right-from-square"></i>
          </button>
        </div>
      </div>

      <div v-if="activeTableMappings.length" class="pc-external-profile-mapping-row">
        <label class="pc-field-group">
          <span class="pc-field-label">当前资料映射</span>
          <select v-model="selectedTableMappingId" class="pc-select" aria-label="当前资料映射">
            <option v-for="mapping in activeTableMappings" :key="mapping.id" :value="mapping.id">
              {{ mapping.name }}
            </option>
          </select>
        </label>
        <ItemTransferImportAction
          v-if="activeTableMapping"
          app-id="profiles"
          button-class="pc-icon-btn"
          icon-only
          label="导入单行资料"
          :params="{ mappingId: activeTableMapping.id }"
          @imported="refresh"
        />
      </div>
      <div v-else-if="activeTable" class="pc-status-card warning pc-external-profile-mapping-warning">
        <div>
          <strong>当前表还没有资料映射</strong>
          <p>先设置身份列、显示列和业务字段，才能导入、打开或导出单行资料。</p>
        </div>
        <button class="pc-soft-btn compact" type="button" @click="openMappings">设置映射</button>
      </div>

      <label v-if="activeTable?.rows.length" class="pc-search-field">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="rowQuery" type="search" placeholder="搜索当前表格" />
      </label>

      <div
        v-if="activeTable && filteredRows.length && activeTable.columns.length"
        class="pc-external-profile-grid-wrap"
      >
        <div
          class="pc-external-profile-grid"
          :style="{
            '--pc-external-profile-grid': externalGridTemplate,
            '--pc-external-profile-min-width': `${externalTableMinWidth}px`,
          }"
        >
          <div class="pc-external-profile-grid-header" role="row">
            <span v-for="column in activeTable.columns" :key="column.index" role="columnheader">
              {{ column.label }}
            </span>
          </div>
          <button
            v-for="row in filteredRows"
            :key="row.id"
            class="pc-external-profile-grid-row"
            type="button"
            :disabled="!activeTableMapping"
            @click="openMappedRow(row)"
          >
            <span
              v-for="column in activeTable.columns"
              :key="column.index"
              class="pc-external-profile-grid-cell"
              role="cell"
              :title="row.cells[column.index]"
            >
              {{ row.cells[column.index] || '—' }}
            </span>
          </button>
        </div>
      </div>

      <EmptyState v-else-if="state.status === 'loading'" title="正在刷新当前表…" />
      <EmptyState v-else-if="state.status === 'error'" title="外部数据库读取失败">
        <p>{{ state.message }}</p>
        <button class="pc-soft-btn compact pc-external-profile-empty-action" type="button" @click="refresh">
          重新读取
        </button>
      </EmptyState>
      <EmptyState v-else-if="state.status === 'missing'" title="未检测到外部数据库">
        <p>{{ state.message }}</p>
        <button class="pc-soft-btn compact pc-external-profile-empty-action" type="button" @click="refresh">
          重新检测
        </button>
      </EmptyState>
      <EmptyState v-else-if="!activeTable" title="当前资料表已不存在">
        <button class="pc-soft-btn compact pc-external-profile-empty-action" type="button" @click="returnToCatalog">
          返回资料表
        </button>
      </EmptyState>
      <EmptyState v-else-if="!activeTable.rows.length" title="当前表格还没有数据行">
        <button
          v-if="state.canOpenVisualizer"
          class="pc-primary-btn compact pc-external-profile-empty-action"
          type="button"
          @click="openVisualizer"
        >
          打开完整数据库
        </button>
      </EmptyState>
      <EmptyState v-else-if="!filteredRows.length" title="没有匹配的数据行">
        <button class="pc-soft-btn compact pc-external-profile-empty-action" type="button" @click="rowQuery = ''">
          清除搜索
        </button>
      </EmptyState>
    </section>

    <section v-else-if="route.page === 'row' && activeMappedRow" class="pc-external-profile-row-detail">
      <ReaderDetailShell
        :bagu-enabled="false"
        catalog-label="表格"
        custom-content
        display-app-id="profiles"
        :edit-enabled="false"
        :favorite-enabled="false"
        next-label="下一行"
        previous-label="上一行"
        :next-disabled="!nextMappedRowIdentity"
        :previous-disabled="!previousMappedRowIdentity"
        :title="activeMappedRow.displayValue || activeMappedRow.identityValue"
        @catalog="returnToActiveTable"
        @next="openMappedIdentity(nextMappedRowIdentity)"
        @previous="openMappedIdentity(previousMappedRowIdentity)"
      >
        <template #kicker>
          <span class="pc-kicker"><i class="fa-solid fa-table"></i>{{ activeRowMapping?.name }}</span>
        </template>
        <template #meta>
          <span class="pc-reader-source-label">身份：{{ activeMappedRow.identityValue }}</span>
        </template>
        <template #content>
          <dl class="pc-external-profile-row-fields">
            <template v-for="field in activeMappedFields" :key="field.key">
              <dt>{{ field.label }}</dt>
              <dd>{{ field.value || '—' }}</dd>
            </template>
          </dl>
        </template>
      </ReaderDetailShell>
    </section>

    <FailedDraftRepairPage
      v-else-if="route.page === 'failed-draft' && activeFailedDraft"
      v-model:raw-output="failedDraftRawOutput"
      :raw-output-semantics="activeFailedDraft.rawOutputSemantics"
      :reasoning="activeFailedDraft.generationRecord?.reasoning || ''"
      :reparse-disabled="!selectedRepairMappingId"
      :source-label="activeFailedDraft.source.label"
      title="修复资料生成草稿"
      :warnings="activeFailedDraft.warnings"
      @delete="removeFailedDraft(activeFailedDraft.id)"
      @reparse="reparseFailedDraft"
    >
      <template #before-editor>
        <label class="pc-field-group">
          <span class="pc-field-label">保存到外部资料映射</span>
          <SearchableCombobox
            v-model="selectedRepairMappingId"
            input-label="选择外部资料映射"
            :options="repairMappingOptions"
            placeholder="请选择外部资料映射"
          />
        </label>
        <article v-if="repairPreview" class="pc-section-card pc-external-profile-repair-preview">
          <strong>{{ repairPreview.title }}</strong>
          <p v-if="repairPreview.summary">{{ repairPreview.summary }}</p>
          <p v-if="repairPreview.tags.length">{{ repairPreview.tags.join('、') }}</p>
          <dl v-if="repairPreviewFields.length">
            <template v-for="field in repairPreviewFields" :key="field.key">
              <dt>{{ field.label }}</dt>
              <dd>{{ field.value }}</dd>
            </template>
          </dl>
          <button class="pc-primary-btn compact" type="button" @click="saveRepairedDraft">保存到外部资料表</button>
        </article>
      </template>
    </FailedDraftRepairPage>

    <EmptyState v-else title="这条资料记录无法打开">
      <button class="pc-soft-btn" type="button" @click="returnToCatalog">返回资料表</button>
    </EmptyState>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import FailedDraftList from '@/components/FailedDraftList.vue';
import FailedDraftRepairPage from '@/components/FailedDraftRepairPage.vue';
import ItemTransferImportAction from '@/components/ItemTransferImportAction.vue';
import ReaderDetailShell from '@/components/ReaderDetailShell.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { usePhoneStore } from '@/store/phone';
import { onTavernEvent } from '@/util/runtime';
import type { FailedGenerationDraft } from '@/type/generation';
import ProfileMappingsPage from './ProfileMappingsPage.vue';
import { createExternalProfilesRepository } from './externalCrud';
import { readExternalMappedRows } from './profileConsumerBridge';
import { buildExternalProfileGenerationValues, parseProfileXmlResult, type ProfileXmlResult } from './generation';
import { useExternalProfileGenerationStore } from './generationDrafts';
import { useExternalProfileMappingsStore, type ExternalProfileMapping } from './profileMappings';
import {
  createExternalProfilesBridge,
  type ExternalProfileRow,
  type ExternalProfileTable,
  type ExternalProfilesViewState,
} from './externalBridge';

const phone = usePhoneStore();
const externalGeneration = useExternalProfileGenerationStore();
const mappingsStore = useExternalProfileMappingsStore();
const repository = createExternalProfilesRepository();
const route = computed(() => phone.currentRoute);
const bridge = createExternalProfilesBridge();
const state = ref<ExternalProfilesViewState>(bridge.getState());
const catalogQuery = ref('');
const rowQuery = ref('');
const selectedTableMappingId = ref('');
const failedDraftRawOutput = ref('');
const selectedRepairMappingId = ref('');
const repairPreview = ref<ProfileXmlResult | null>(null);
const { failedDrafts: externalFailedDrafts } = storeToRefs(externalGeneration);
const { mappings } = storeToRefs(mappingsStore);
let stopChatChanged: null | { stop: () => void } = null;
let stopBridge: null | { stop: () => void } = null;

const activeTable = computed(() => {
  const sheetKey = route.value.params?.sheetKey || '';
  return state.value.tables.find(table => table.key === sheetKey) ?? null;
});
const activeTableMappings = computed(() => {
  const table = activeTable.value;
  if (!table) return [];
  return mappings.value.filter(mapping => mapping.sheetKey === table.key && mapping.tableName === table.name);
});
const activeTableMapping = computed(
  () => activeTableMappings.value.find(mapping => mapping.id === selectedTableMappingId.value) ?? null,
);
const activeRowMapping = computed(() => mappingsStore.getMapping(route.value.params?.mappingId || ''));
const activeMappedRows = computed(() => {
  const mapping = activeRowMapping.value;
  if (!mapping) return [];
  try {
    return readExternalMappedRows(mapping);
  } catch {
    return [];
  }
});
const activeMappedRow = computed(() => {
  const identityValue = (route.value.params?.identityValue || '').trim();
  return activeMappedRows.value.find(row => row.identityValue.trim() === identityValue) ?? null;
});
const activeMappedFields = computed(() => {
  const mapping = activeRowMapping.value;
  const row = activeMappedRow.value;
  if (!mapping || !row) return [];
  return mapping.fields.map(field => ({ key: field.key, label: field.label, value: row.fields[field.key] || '' }));
});
const activeMappedRowIndex = computed(() =>
  activeMappedRow.value
    ? activeMappedRows.value.findIndex(row => row.identityValue === activeMappedRow.value?.identityValue)
    : -1,
);
const previousMappedRowIdentity = computed(
  () => activeMappedRows.value[activeMappedRowIndex.value - 1]?.identityValue || '',
);
const nextMappedRowIdentity = computed(
  () => activeMappedRows.value[activeMappedRowIndex.value + 1]?.identityValue || '',
);
const activeFailedDraft = computed(() => {
  const draftId = route.value.params?.draftId || '';
  return externalGeneration.getFailedDraft(draftId);
});
const repairMappingOptions = computed(() => [
  { label: '请选择外部资料映射', value: '' },
  ...mappings.value.map(mapping => ({ label: `${mapping.name} · ${mapping.tableName}`, value: mapping.id })),
]);
const repairPreviewFields = computed(() => {
  const preview = repairPreview.value;
  const mapping = mappingsStore.getMapping(selectedRepairMappingId.value);
  if (!preview || !mapping) return [];
  return mapping.fields
    .map(field => ({ key: field.key, label: field.label, value: preview.fields[field.key] || '' }))
    .filter(field => field.value);
});
const normalizedCatalogQuery = computed(() => catalogQuery.value.trim().toLocaleLowerCase());
const normalizedRowQuery = computed(() => rowQuery.value.trim().toLocaleLowerCase());
const filteredTables = computed(() => {
  const query = normalizedCatalogQuery.value;
  if (!query) return state.value.tables;
  return state.value.tables.filter(table => `${table.name} ${table.uid}`.toLocaleLowerCase().includes(query));
});
const filteredRows = computed(() => {
  const rows = activeTable.value?.rows ?? [];
  const query = normalizedRowQuery.value;
  if (!query) return rows;
  return rows.filter(row => row.cells.join(' ').toLocaleLowerCase().includes(query));
});
const tableCountLabel = computed(() => {
  if (state.value.status === 'loading') return '读取中';
  if (state.value.status !== 'ready') return '外部资料表';
  return `${state.value.tables.length} 个表格`;
});
const activeTableCountLabel = computed(() =>
  activeTable.value ? `${activeTable.value.rows.length} 行 · ${activeTable.value.columns.length} 列` : '外部资料表',
);
const externalGridTemplate = computed(() =>
  activeTable.value?.columns.length
    ? `repeat(${activeTable.value.columns.length}, minmax(120px, 1fr))`
    : 'minmax(0, 1fr)',
);
const externalTableMinWidth = computed(() => Math.max(0, (activeTable.value?.columns.length ?? 0) * 120));

function refresh() {
  bridge.refresh();
}

function openTable(table: ExternalProfileTable) {
  rowQuery.value = '';
  phone.pushRoute('profiles', 'table', table.name, { sheetKey: table.key });
}

function rowIdentity(row: ExternalProfileRow, mapping: ExternalProfileMapping) {
  const identityColumn = activeTable.value?.columns.find(column => column.sourceLabel === mapping.identityColumn);
  return identityColumn ? (row.cells[identityColumn.index] || '').trim() : '';
}

function openMappedRow(row: ExternalProfileRow) {
  const mapping = activeTableMapping.value;
  if (!mapping) return;
  const identityValue = rowIdentity(row, mapping);
  if (!identityValue) return void toastr.warning('当前行没有有效身份值，无法打开');
  phone.pushRoute('profiles', 'row', row.cells.find(Boolean) || identityValue, {
    identityValue,
    mappingId: mapping.id,
    sheetKey: mapping.sheetKey,
  });
}

function openMappedIdentity(identityValue: string) {
  const mapping = activeRowMapping.value;
  if (!mapping || !identityValue) return;
  const row = activeMappedRows.value.find(candidate => candidate.identityValue === identityValue);
  phone.replacePage('row', row?.displayValue || identityValue, {
    identityValue,
    mappingId: mapping.id,
    sheetKey: mapping.sheetKey,
  });
}

function returnToActiveTable() {
  const mapping = activeRowMapping.value;
  if (!mapping) return returnToCatalog();
  selectedTableMappingId.value = mapping.id;
  phone.replacePage('table', mapping.tableName, { sheetKey: mapping.sheetKey });
}

function openMappings() {
  phone.pushRoute('profiles', 'mappings', '资料映射');
}

function getFailedDraftTitle(draft: FailedGenerationDraft) {
  return typeof draft.context.titleHint === 'string' && draft.context.titleHint.trim()
    ? draft.context.titleHint.trim()
    : '待修复资料草稿';
}

function getFailedDraftContext(draft: FailedGenerationDraft) {
  const mappingId = typeof draft.context.mappingId === 'string' ? draft.context.mappingId : '';
  const mapping = mappingsStore.getMapping(mappingId);
  return mapping ? `${mapping.name} · ${mapping.tableName}` : '资料映射已失效，请重新选择';
}

function openFailedDraft(draftId: string) {
  phone.pushRoute('profiles', 'failed-draft', '修复资料生成草稿', { draftId, draftSource: 'external' });
}

async function removeFailedDraft(draftId: string) {
  const confirmed = await phone.confirmNotice('要删除这条资料生成失败草稿吗？原始输出也会一并移除。', {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!confirmed) return;
  externalGeneration.deleteFailedDraft(draftId);
  if (route.value.page === 'failed-draft') returnToCatalog();
  toastr.success('已删除失败草稿');
}

function reparseFailedDraft() {
  const draft = activeFailedDraft.value;
  if (!draft) return;
  if (!selectedRepairMappingId.value) return void toastr.warning('请先选择外部资料映射');
  const parsed = parseProfileXmlResult(failedDraftRawOutput.value);
  if (!parsed.ok) {
    externalGeneration.updateFailedDraft(draft.id, {
      rawOutput: failedDraftRawOutput.value,
      warnings: parsed.warnings,
    });
    repairPreview.value = null;
    toastr.warning(parsed.warnings.join('；') || '仍然无法解析');
    return;
  }
  externalGeneration.updateFailedDraft(draft.id, {
    rawOutput: failedDraftRawOutput.value,
    warnings: parsed.warnings,
  });
  repairPreview.value = parsed.data;
  toastr.success('重新解析成功，请确认后保存');
}

async function saveRepairedDraft() {
  const draft = activeFailedDraft.value;
  const preview = repairPreview.value;
  const mapping = mappingsStore.getMapping(selectedRepairMappingId.value);
  if (!draft || !preview || !mapping) return void toastr.warning('请先完成解析并选择有效映射');
  const identityRecordId = draft.generationRecord?.id || draft.id;
  try {
    await repository.insertMappedRow(mapping, {
      ...buildExternalProfileGenerationValues(preview, mapping),
      identityValue: `profile-generation:${identityRecordId}`,
    });
    externalGeneration.deleteFailedDraft(draft.id);
    refresh();
    toastr.success('已保存到外部资料表');
    phone.replacePage('table', mapping.tableName, { sheetKey: mapping.sheetKey });
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '外部资料保存失败');
  }
}

function returnToCatalog() {
  phone.replacePage('root', '资料表');
}

async function openVisualizer() {
  try {
    if (await bridge.openVisualizer()) return;
    toastr.warning('当前外部数据库没有提供完整编辑器入口');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '打开完整数据库失败');
  }
}

watch(
  () => [route.value.appId, route.value.page] as const,
  ([appId, page]) => {
    if (appId !== 'profiles') return;
    if (!['root', 'table', 'row', 'mappings', 'mapping-editor', 'failed-draft'].includes(page)) {
      phone.replacePage('root', '资料表');
    }
  },
  { immediate: true },
);

watch(
  () => [activeTable.value?.key, activeTableMappings.value.map(mapping => mapping.id).join('|')] as const,
  () => {
    if (activeTableMappings.value.some(mapping => mapping.id === selectedTableMappingId.value)) return;
    selectedTableMappingId.value = activeTableMappings.value[0]?.id || '';
  },
  { immediate: true },
);

watch(
  () => activeFailedDraft.value?.id,
  () => {
    const draft = activeFailedDraft.value;
    failedDraftRawOutput.value = draft?.rawOutput || '';
    const draftMappingId = typeof draft?.context.mappingId === 'string' ? draft.context.mappingId : '';
    selectedRepairMappingId.value = mappingsStore.getMapping(draftMappingId) ? draftMappingId : '';
    repairPreview.value = null;
  },
  { immediate: true },
);

onMounted(() => {
  stopBridge = bridge.start(nextState => {
    state.value = nextState;
  });
  stopChatChanged = onTavernEvent('CHAT_CHANGED', refresh);
});

onUnmounted(() => {
  stopChatChanged?.stop();
  stopChatChanged = null;
  stopBridge?.stop();
  stopBridge = null;
});
</script>

<style scoped>
.pc-external-profiles-app,
.pc-external-profiles-page {
  width: 100%;
  min-height: 0;
  min-width: 0;
}
.pc-external-profiles-app {
  height: 100%;
  overflow-x: hidden;
}
.pc-external-profiles-page {
  display: grid;
  align-content: start;
  gap: 12px;
}
.pc-external-profiles-toolbar {
  min-width: 0;
}
.pc-external-profiles-actions {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}
.pc-external-profile-table-row {
  grid-template-columns: 38px minmax(0, 1fr) auto;
}
.pc-external-profile-table-icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 12px;
  background: color-mix(in srgb, var(--pc-theme-accent) 14%, var(--pc-surface) 86%);
  color: var(--pc-theme-accent);
}
.pc-external-profile-table-main {
  display: grid;
  min-width: 0;
  gap: 3px;
}
.pc-external-profile-table-main strong,
.pc-external-profile-table-main small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-external-profile-table-main small,
.pc-external-profile-chevron {
  color: var(--pc-muted);
}
.pc-external-profile-grid-wrap {
  min-width: 0;
  overflow-x: auto;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  background: var(--pc-surface);
}
.pc-external-profile-mapping-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 8px;
}
.pc-external-profile-mapping-row .pc-field-group {
  min-width: 0;
}
.pc-external-profile-mapping-warning {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}
.pc-external-profile-mapping-warning p {
  margin: 3px 0 0;
}
.pc-external-profile-grid {
  display: grid;
  width: max(100%, var(--pc-external-profile-min-width, 0px));
  min-width: var(--pc-external-profile-min-width, 0px);
}
.pc-external-profile-grid-header,
.pc-external-profile-grid-row {
  display: grid;
  grid-template-columns: var(--pc-external-profile-grid, minmax(0, 1fr));
}
.pc-external-profile-grid-header {
  position: sticky;
  z-index: 1;
  top: 0;
  border-bottom: 1px solid var(--pc-border);
  background: color-mix(in srgb, var(--pc-surface-strong) 88%, var(--pc-theme-accent) 12%);
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 800;
}
.pc-external-profile-grid-row {
  width: 100%;
  /* ui-reuse-allow: PROFILEBRIDGE02F semantic row button keeps the existing external-grid layout. */
  appearance: none;
  border: 0;
  border-bottom: 1px solid var(--pc-border);
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  padding: 0;
}
.pc-external-profile-grid-row:disabled {
  cursor: default;
}
.pc-external-profile-grid-row:not(:disabled):hover,
.pc-external-profile-grid-row:not(:disabled):focus-visible {
  background: color-mix(in srgb, var(--pc-theme-accent) 7%, transparent);
}
.pc-external-profile-grid-row:last-child {
  border-bottom: 0;
}
.pc-external-profile-grid-header span,
.pc-external-profile-grid-cell {
  min-width: 0;
  overflow: hidden;
  padding: 10px 12px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-external-profile-grid-cell:first-child {
  font-weight: 800;
}
.pc-external-profile-empty-action {
  margin-top: 12px;
}
.pc-external-profile-repair-preview {
  display: grid;
  gap: 10px;
}
.pc-external-profile-repair-preview p,
.pc-external-profile-repair-preview dl,
.pc-external-profile-repair-preview dd {
  margin: 0;
}
.pc-external-profile-row-detail {
  height: 100%;
  min-height: 0;
}
.pc-external-profile-row-detail .pc-kicker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.pc-external-profile-row-fields {
  display: grid;
  grid-template-columns: minmax(82px, auto) minmax(0, 1fr);
  margin: 0;
  gap: 10px 12px;
}
.pc-external-profile-row-fields dt {
  color: var(--pc-muted);
  font-weight: 750;
}
.pc-external-profile-row-fields dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.pc-external-profile-repair-preview dl {
  display: grid;
  grid-template-columns: minmax(72px, auto) minmax(0, 1fr);
  gap: 6px 10px;
}
.pc-external-profile-repair-preview dt {
  color: var(--pc-muted);
  font-weight: 700;
}
.pc-external-profile-repair-preview dd {
  min-width: 0;
  overflow-wrap: anywhere;
}
</style>
