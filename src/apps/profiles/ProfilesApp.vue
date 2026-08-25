<template>
  <section class="pc-external-profiles-app">
    <section v-if="route.page === 'root'" class="pc-external-profiles-page">
      <div class="pc-compact-toolbar pc-directory-toolbar pc-external-profiles-toolbar">
        <span class="pc-directory-count">{{ tableCountLabel }}</span>
        <div class="pc-external-profiles-actions">
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

    <section v-else-if="route.page === 'table'" class="pc-external-profiles-page pc-external-profile-detail">
      <div class="pc-compact-toolbar pc-directory-toolbar pc-external-profiles-toolbar">
        <span class="pc-directory-count">{{ activeTableCountLabel }}</span>
        <div class="pc-external-profiles-actions">
          <div class="pc-segment pc-external-profile-layout-toggle" aria-label="资料卡片排列方式">
            <button
              :class="['pc-segment-btn', { active: externalProfilesLayout === 'horizontal' }]"
              type="button"
              title="横向卡片"
              aria-label="横向卡片"
              @click="settingsStore.setExternalProfilesLayout('horizontal')"
            >
              <i class="fa-solid fa-table-columns"></i>
            </button>
            <button
              :class="['pc-segment-btn', { active: externalProfilesLayout === 'vertical' }]"
              type="button"
              title="竖向卡片"
              aria-label="竖向卡片"
              @click="settingsStore.setExternalProfilesLayout('vertical')"
            >
              <i class="fa-solid fa-list"></i>
            </button>
          </div>
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

      <label v-if="activeTable?.rows.length" class="pc-search-field">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="rowQuery" type="search" placeholder="搜索当前表格" />
      </label>

      <div
        v-if="activeTable && filteredRows.length && activeTable.columns.length"
        :class="['pc-external-profile-card-track', `is-${externalProfilesLayout}`]"
      >
        <button
          v-for="row in filteredRows"
          :key="row.id"
          class="pc-section-card pc-external-profile-data-card"
          type="button"
          @click="openRow(row)"
        >
          <header>
            <span>#{{ row.index }}</span>
            <strong>{{ externalProfileRowIdentifier(activeTable, row) }}</strong>
            <i class="fa-solid fa-chevron-right"></i>
          </header>
          <dl>
            <div v-for="column in activeTableCardColumns" :key="column.index">
              <dt>{{ column.label }}</dt>
              <dd>
                <span :class="{ 'is-compact': isCompactExternalProfileValue(row.cells[column.index]) }">
                  {{ row.cells[column.index] || '—' }}
                </span>
              </dd>
            </div>
          </dl>
        </button>
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

    <section v-else-if="route.page === 'row' && activeRow" class="pc-external-profile-row-detail">
      <ReaderDetailShell
        :bagu-enabled="false"
        catalog-label="表格"
        custom-content
        display-app-id="profiles"
        :edit-enabled="false"
        :favorite-enabled="false"
        next-label="下一行"
        previous-label="上一行"
        :next-disabled="!nextRow"
        :previous-disabled="!previousRow"
        :title="activeRowTable ? getExternalProfileRowLabel(activeRowTable, activeRow) : `第 ${activeRow.index} 行`"
        @catalog="returnToActiveTable"
        @next="openRow(nextRow!)"
        @previous="openRow(previousRow!)"
      >
        <template #kicker>
          <span class="pc-kicker"><i class="fa-solid fa-table"></i>{{ activeRowTable?.name }}</span>
        </template>
        <template #meta>
          <span class="pc-reader-source-label">第 {{ activeRow.index }} 行</span>
        </template>
        <template #content>
          <dl class="pc-external-profile-row-fields">
            <template v-for="column in activeRowTable?.columns || []" :key="column.index">
              <dt>{{ column.label }}</dt>
              <dd>{{ activeRow.cells[column.index] || '—' }}</dd>
            </template>
          </dl>
        </template>
      </ReaderDetailShell>
    </section>

    <FailedDraftRepairPage
      v-else-if="route.page === 'failed-draft' && activeFailedDraft"
      v-model:raw-output="failedDraftRawOutput"
      :regenerate-handler="regenerateFailedDraft"
      :raw-output-semantics="activeFailedDraft.rawOutputSemantics"
      :reasoning="activeFailedDraft.generationRecord?.reasoning || ''"
      :reparse-disabled="!selectedRepairSheetKey || !selectedRepairTitleColumn"
      :source-label="activeFailedDraft.source.label"
      title="修复资料生成草稿"
      :warnings="activeFailedDraft.warnings"
      @delete="removeFailedDraft(activeFailedDraft.id)"
      @reparse="reparseFailedDraft"
      @update:reasoning="updateGenerationRecordReasoning(activeFailedDraft, $event)"
    >
      <template #before-editor>
        <label class="pc-field-group">
          <span class="pc-field-label">保存到外部资料表</span>
          <SearchableCombobox
            v-model="selectedRepairSheetKey"
            input-label="选择外部资料表"
            :options="repairTableOptions"
            placeholder="请选择外部资料表"
          />
        </label>
        <label class="pc-field-group">
          <span class="pc-field-label">标题列</span>
          <SearchableCombobox
            v-model="selectedRepairTitleColumn"
            input-label="选择标题列"
            :options="repairColumnOptions"
            placeholder="请选择标题列"
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
import ReaderDetailShell from '@/components/ReaderDetailShell.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { useFailedDraftRegeneration } from '@/composables/useFailedDraftRegeneration';
import { usePhoneStore } from '@/store/phone';
import { useSettingsStore } from '@/store/settings';
import { onTavernEvent } from '@/util/runtime';
import { updateGenerationRecordReasoning } from '@/util/generationReasoning';
import type { FailedGenerationDraft } from '@/type/generation';
import { createExternalProfilesRepository } from './externalCrud';
import { buildExternalProfileGenerationValues, parseProfileXmlResult, type ProfileXmlResult } from './generation';
import { useExternalProfileGenerationStore } from './generationDrafts';
import {
  createExternalProfilesBridge,
  getExternalProfileRowLabel,
  isExternalProfileIdentifierColumn,
  type ExternalProfileRow,
  type ExternalProfileTable,
  type ExternalProfilesViewState,
} from './externalBridge';

const phone = usePhoneStore();
const settingsStore = useSettingsStore();
const externalGeneration = useExternalProfileGenerationStore();
const repository = createExternalProfilesRepository();
const route = computed(() => phone.currentRoute);
const bridge = createExternalProfilesBridge();
const state = ref<ExternalProfilesViewState>(bridge.getState());
const catalogQuery = ref('');
const rowQuery = ref('');
const failedDraftRawOutput = ref('');
const selectedRepairSheetKey = ref('');
const selectedRepairTitleColumn = ref('');
const repairPreview = ref<ProfileXmlResult | null>(null);
const { failedDrafts: externalFailedDrafts } = storeToRefs(externalGeneration);
let stopChatChanged: null | { stop: () => void } = null;
let stopBridge: null | { stop: () => void } = null;

const activeTable = computed(() => {
  const sheetKey = route.value.params?.sheetKey || '';
  return state.value.tables.find(table => table.key === sheetKey) ?? null;
});
const activeRowTable = computed(() => {
  const sheetKey = route.value.params?.sheetKey || '';
  return state.value.tables.find(table => table.key === sheetKey) ?? null;
});
const activeRow = computed(() => {
  const rowIndex = Number(route.value.params?.rowIndex || 0);
  return activeRowTable.value?.rows.find(row => row.index === rowIndex) ?? null;
});
const activeRowPosition = computed(
  () => activeRowTable.value?.rows.findIndex(row => row.index === activeRow.value?.index) ?? -1,
);
const previousRow = computed(() => activeRowTable.value?.rows[activeRowPosition.value - 1] ?? null);
const nextRow = computed(() => activeRowTable.value?.rows[activeRowPosition.value + 1] ?? null);
const activeFailedDraft = computed(() => {
  const draftId = route.value.params?.draftId || '';
  return externalGeneration.getFailedDraft(draftId);
});
const repairTable = computed(
  () => state.value.tables.find(table => table.key === selectedRepairSheetKey.value) ?? null,
);
const repairTableOptions = computed(() => state.value.tables.map(table => ({ label: table.name, value: table.key })));
const repairColumnOptions = computed(() =>
  (repairTable.value?.columns ?? []).map(column => ({ label: column.label, value: column.sourceLabel })),
);
const repairPreviewFields = computed(() => {
  const preview = repairPreview.value;
  const table = repairTable.value;
  if (!preview || !table) return [];
  return table.columns
    .map(column => ({ key: column.index, label: column.label, value: preview.fields[column.sourceLabel] || '' }))
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
const externalProfilesLayout = computed(() => settingsStore.settings.externalProfilesLayout);
const activeTableCardColumns = computed(() =>
  (activeTable.value?.columns ?? []).filter(column => !isExternalProfileIdentifierColumn(column)),
);
const tableCountLabel = computed(() => {
  if (state.value.status === 'loading') return '读取中';
  if (state.value.status !== 'ready') return '外部资料表';
  return `${state.value.tables.length} 个表格`;
});
const activeTableCountLabel = computed(() =>
  activeTable.value ? `${activeTable.value.rows.length} 行 · ${activeTable.value.columns.length} 列` : '外部资料表',
);

function externalProfileRowIdentifier(table: ExternalProfileTable, row: ExternalProfileRow) {
  const column = table.columns.find(isExternalProfileIdentifierColumn);
  return (column ? row.cells[column.index] : '') || getExternalProfileRowLabel(table, row);
}

function isCompactExternalProfileValue(value: string) {
  return Boolean(value) && value.length <= 18 && !value.includes('\n');
}

function refresh() {
  bridge.refresh();
}

function openTable(table: ExternalProfileTable) {
  rowQuery.value = '';
  phone.pushRoute('profiles', 'table', table.name, { sheetKey: table.key });
}

function openRow(row: ExternalProfileRow) {
  const table = activeTable.value ?? activeRowTable.value;
  if (!table) return;
  const params = {
    rowIndex: String(row.index),
    sheetKey: table.key,
  };
  if (route.value.page === 'row') {
    phone.replacePage('row', getExternalProfileRowLabel(table, row), params);
    return;
  }
  phone.pushRoute('profiles', 'row', getExternalProfileRowLabel(table, row), params);
}

function returnToActiveTable() {
  const table = activeRowTable.value;
  if (!table) return returnToCatalog();
  phone.replacePage('table', table.name, { sheetKey: table.key });
}

function getFailedDraftTitle(draft: FailedGenerationDraft) {
  return typeof draft.context.titleHint === 'string' && draft.context.titleHint.trim()
    ? draft.context.titleHint.trim()
    : '待修复资料草稿';
}

function getFailedDraftContext(draft: FailedGenerationDraft) {
  const sheetKey = typeof draft.context.sheetKey === 'string' ? draft.context.sheetKey : '';
  return state.value.tables.find(table => table.key === sheetKey)?.name || '请选择保存目标';
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
  if (!selectedRepairSheetKey.value || !selectedRepairTitleColumn.value)
    return void toastr.warning('请先选择目标表和标题列');
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
  const table = repairTable.value;
  if (!draft || !preview || !table || !selectedRepairTitleColumn.value)
    return void toastr.warning('请先完成解析并选择目标表和标题列');
  try {
    await repository.insertRow(
      table.key,
      buildExternalProfileGenerationValues(preview, table, selectedRepairTitleColumn.value),
    );
    externalGeneration.deleteFailedDraft(draft.id);
    refresh();
    toastr.success('已保存到外部资料表');
    phone.replacePage('table', table.name, { sheetKey: table.key });
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
    if (!['root', 'table', 'row', 'failed-draft'].includes(page)) {
      phone.replacePage('root', '资料表');
    }
  },
  { immediate: true },
);

watch(
  () => activeFailedDraft.value?.id,
  () => {
    const draft = activeFailedDraft.value;
    failedDraftRawOutput.value = draft?.rawOutput || '';
    const draftSheetKey = typeof draft?.context.sheetKey === 'string' ? draft.context.sheetKey : '';
    selectedRepairSheetKey.value = draftSheetKey;
    selectedRepairTitleColumn.value = typeof draft?.context.titleColumn === 'string' ? draft.context.titleColumn : '';
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
const regenerateFailedDraft = useFailedDraftRegeneration({
  draft: () => activeFailedDraft.value,
  rawOutput: failedDraftRawOutput,
  reparse: reparseFailedDraft,
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
.pc-external-profile-layout-toggle {
  flex: 0 0 auto;
}
.pc-external-profile-layout-toggle > button {
  width: 34px;
  min-width: 34px;
  padding-inline: 0;
}
.pc-external-profile-card-track {
  display: grid;
  min-width: 0;
  gap: 12px;
}
.pc-external-profile-card-track.is-horizontal {
  grid-auto-columns: clamp(270px, 82%, 360px);
  grid-auto-flow: column;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  padding: 2px 2px 10px;
  scroll-padding-inline: 2px;
  scroll-snap-type: inline proximity;
}
.pc-external-profile-card-track.is-vertical {
  grid-template-columns: minmax(0, 1fr);
}
.pc-external-profile-data-card {
  width: 100%;
  min-width: 0;
  align-content: start;
  /* ui-reuse-allow: PROFILECARD01 interactive section cards reset native button appearance. */
  appearance: none;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;
}
.pc-external-profile-card-track.is-horizontal .pc-external-profile-data-card {
  scroll-snap-align: start;
}
.pc-external-profile-data-card:hover,
.pc-external-profile-data-card:focus-visible {
  border-color: color-mix(in srgb, var(--pc-theme-accent) 50%, var(--pc-border) 50%);
  background: color-mix(in srgb, var(--pc-theme-accent) 7%, var(--pc-surface) 93%);
}
.pc-external-profile-data-card > header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  margin: -14px -14px 0;
  padding: 10px 14px;
  background: color-mix(in srgb, var(--pc-surface-strong) 88%, var(--pc-theme-accent) 12%);
}
.pc-external-profile-data-card > header span,
.pc-external-profile-data-card > header i {
  color: var(--pc-muted);
}
.pc-external-profile-data-card > header strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-external-profile-data-card dl {
  display: grid;
  gap: 11px;
  margin: 0;
}
.pc-external-profile-data-card dl > div {
  display: grid;
  grid-template-columns: minmax(68px, auto) minmax(0, 1fr);
  align-items: start;
  gap: 10px;
}
.pc-external-profile-data-card dt {
  color: var(--pc-muted);
}
.pc-external-profile-data-card dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.pc-external-profile-data-card dd > span.is-compact {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--pc-surface-strong);
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
