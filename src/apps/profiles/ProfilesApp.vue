<template>
  <section class="pc-profiles-app">
    <ProfilesCatalogPage
      v-if="route.page === 'root'"
      v-model:query="query"
      v-model:table-id="selectedTableId"
      v-model:view-mode="profileViewMode"
      :columns="visibleTableColumns"
      :entry-field="profiles.getEntryField"
      :entry-preview="entryListPreview"
      :failed-draft-context="failedDraftSourceLabel"
      :failed-drafts="failedDrafts"
      :failed-draft-title="failedDraftTitle"
      :filtered-entries="filteredEntries"
      :grid-template="profileTableGridTemplate"
      :is-status-column="isStatusColumn"
      :kind-icon="profileKindIcon"
      :preview-draft="profilesPreviewDraft"
      :selected-table="selectedTable"
      :table-entries="tableEntries"
      :table-min-width="profileTableMinWidth"
      :table-options="profileTableOptions"
      @create="openEditor()"
      @discard-preview="discardProfilesPreviewDraft"
      @generate="openGenerate"
      @open-entry="openEntry"
      @open-failed="openFailedDraft"
      @open-preview="openProfilesPreviewDraft"
      @open-tables="openTableManager"
      @remove-failed="removeFailedDraft"
    />

    <ProfilesTableManagerPage
      v-else-if="route.page === 'tables'"
      :entry-count="tableEntryCount"
      :kind-icon="profileKindIcon"
      :tables="tables"
      @create="createTable"
      @open="openTableEditor"
    />

    <ProfilesTableEditorPage
      v-else-if="route.page === 'table-editor' && editingTable"
      v-model:display-format="tableDraft.displayFormat"
      v-model:kind="tableDraft.kind"
      v-model:name="tableDraft.name"
      v-model:render-mode="tableDraft.renderMode"
      :columns="tableDraft.columns"
      :drag="tableColumnDrag"
      :is-protected="isProtectedColumn"
      :kind-options="profileKindOptions"
      :table="editingTable"
      @add-column="openNewTableColumn"
      @back="phone.goBack()"
      @drag-cancel="cancelTableColumnDrag"
      @drag-end="finishTableColumnDrag"
      @drag-move="moveTableColumnDrag"
      @drag-start="startTableColumnDrag"
      @open-column="openTableColumn"
      @remove="removeTable(editingTable.id)"
      @reset-format="resetTableDisplayFormat"
      @save="saveTableDraft"
    />

    <ProfileFieldEditorPage
      v-else-if="route.page === 'table-column-editor' && editingTable"
      :column="editingTableColumn"
      :new-field="route.params?.columnId === newTableColumnRouteId"
      :protected-field="Boolean(editingTableColumn && isProtectedColumn(editingTableColumn.id))"
      @cancel="phone.goBack()"
      @remove="removeEditingTableColumn"
      @save="saveEditingTableColumn"
    />

    <ProfilesEntryDetailPage
      v-else-if="route.page === 'entry' && activeEntry"
      :bagu-content="profileBaguContent"
      :entry="activeEntry"
      :frontend-content="profileFrontend.content"
      :frontend-errors="profileFrontend.errors"
      :kind-icon="profileKindIcon(activeEntry.kind)"
      :markdown-html="renderMarkdown(profileMarkdownContent)"
      :next-entry-id="nextEntryId"
      :previous-entry-id="previousEntryId"
      :render-mode="activeEntryTable?.renderMode || 'markdown'"
      :table-name="entryTableName(activeEntry)"
      :theme="settings.theme"
      @bagu="openProfilesBaguScan"
      @catalog="phone.replacePage('root', '资料表')"
      @edit="openEditor(activeEntry.id)"
      @favorite="profiles.toggleFavorite(activeEntry.id)"
      @open-entry="openEntry"
      @remove="removeEntry(activeEntry.id)"
    />

    <BaguDetailPage
      v-else-if="route.page === 'bagu-scan' && activeEntry"
      :apply-handler="applyProfilesBaguContent"
      :content="profileBaguContent"
      :meta="getProfileKindLabel(activeEntry.kind)"
      :title="activeEntry.title"
    />

    <ProfilesEntryEditorPage
      v-else-if="route.page === 'editor'"
      v-model:fields="draft.fields"
      v-model:summary="draft.summary"
      v-model:table-id="draft.tableId"
      v-model:tags-text="draft.tagsText"
      v-model:title="draft.title"
      :boolean-options="booleanOptions"
      :columns="editableDraftColumns"
      :current-title="editingEntry?.title || ''"
      :editing="Boolean(editingEntry)"
      :summary-enabled="isDraftColumnEnabled('summary')"
      :tables="tables"
      :tags-enabled="isDraftColumnEnabled('tags')"
      @back="phone.goBack()"
      @change-table="syncDraftTable"
      @save="saveDraft"
    />

    <GenerationFormPage
      v-else-if="route.page === 'generate'"
      v-model:from-start-end="generationDraft.fromStartEnd"
      v-model:range-text="generationDraft.rangeText"
      v-model:recent-count="generationDraft.recentCount"
      v-model:references="selectedReferences"
      v-model:single-message-id="generationDraft.singleMessageId"
      v-model:source-mode="settings.generation.sourceMode"
      v-model:user-requirement="generationDraft.userRequirement"
      :capture="captureProfilePrompt"
      :capture-reset-key="profilePromptPreview"
      :error="generationError"
      kicker="AI 资料"
      :raw-output="generationRawOutput"
      requirement-placeholder="例如：整理沐辞的人物资料，只保留已发生和已确认的信息。"
      :running="generationRunning"
      title="生成资料卡片"
      @cancel="phone.goBack()"
      @generate="runGeneration"
      @stop="stopGeneration"
    >
      <template #before-fields>
        <label class="pc-field-group">
          <span>目标资料表</span>
          <SearchableCombobox
            input-label="选择目标资料表"
            :model-value="generationDraft.tableId"
            :options="profileTableOptions"
            placeholder="选择目标资料表"
            @update:model-value="setGenerationTable"
          />
        </label>
        <input v-model="generationDraft.titleHint" class="pc-field" type="text" placeholder="标题或对象名，可留空" />
      </template>
    </GenerationFormPage>
    <GenerationPreviewPage
      v-else-if="route.page === 'preview' && generationState.preview"
      v-model:content="generationState.preview.content"
      v-model:raw="generationState.preview.raw"
      :reparse-handler="reparsePreviewRaw"
      save-label="保存资料"
      :scan-enabled="false"
      :source-label="generationState.preview.source.label"
      :text-provider-summary="textProviderSummary"
      :title="generationState.preview.title"
      :warnings="generationState.preview.warnings"
      @back="returnToGenerate"
      @reparse="reparsePreviewRaw"
      @save="savePreview"
    />

    <FailedDraftRepairPage
      v-else-if="route.page === 'failed-draft' && activeFailedDraft"
      v-model:raw-output="failedDraftRawOutput"
      raw-label="原始输出"
      :source-label="activeFailedDraft.source.label"
      title="修复解析失败草稿"
      @delete="removeFailedDraft(activeFailedDraft.id)"
      @reparse="reparseFailedDraft"
    >
      <template v-if="activeFailedDraft.warnings.length" #before-editor>
        <div class="pc-status-card warning">
          <strong>上次解析提示</strong>
          <p>{{ activeFailedDraft.warnings.join('；') }}</p>
        </div>
      </template>
    </FailedDraftRepairPage>
  </section>
</template>

<script setup lang="ts">
import BaguDetailPage from '@/components/BaguDetailPage.vue';
import FailedDraftRepairPage from '@/components/FailedDraftRepairPage.vue';
import GenerationFormPage from '@/components/GenerationFormPage.vue';
import GenerationPreviewPage from '@/components/GenerationPreviewPage.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import ProfileFieldEditorPage from './ProfileFieldEditorPage.vue';
import ProfilesCatalogPage from './pages/ProfilesCatalogPage.vue';
import ProfilesEntryDetailPage from './pages/ProfilesEntryDetailPage.vue';
import ProfilesEntryEditorPage from './pages/ProfilesEntryEditorPage.vue';
import ProfilesTableEditorPage from './pages/ProfilesTableEditorPage.vue';
import ProfilesTableManagerPage from './pages/ProfilesTableManagerPage.vue';
import { useSingleGenerationTaskSession } from '@/composables/useSingleGenerationTaskSession';
import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import { captureGenerationPrompt, generateContent } from '@/core/generationService';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import type { FailedGenerationDraft } from '@/type/generation';
import type { GenerationTask } from '@/type/generationTask';
import { canOpenBaguScan } from '@/util/baguScanGate';
import { renderMarkdown } from '@/util/markdown';
import { usePreviewDraftPersistence } from '@/util/previewDrafts';
import type { GenerationReferenceItem } from '@/util/references';
import { formatGenerationReferences } from '@/util/references';
import { useInvalidRouteFallback } from '@/util/routeFallback';
import { formatTextProviderSummary } from '@/util/textProvider';
import { regexDisplayProfilesTarget, useRegexDisplayStore } from '@/apps/regex-display/store';
import { getRegexRulesByIds } from '@/util/regexDisplay';
import {
  getProfileKindLabel,
  profileKindOptions,
  type ProfileTableColumn,
  type ProfileEntry,
  type ProfileKind,
  type ProfileRenderMode,
  useProfilesStore,
} from './store';
import { parseProfileXmlResult } from './generation';
import {
  createDefaultProfileDisplayFormat,
  formatProfileMarkdown,
  getProfileListPreview,
  renderProfileFrontend,
} from './rendering';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const profiles = useProfilesStore();
const regexDisplay = useRegexDisplayStore();
const prompts = usePromptStore();
const settingsStore = useSettingsStore();
const adapter = getRegisteredPhoneGenerationAdapter('profiles', 'generate');
const { entries, failedDrafts, tables } = storeToRefs(profiles);
const { rules: regexDisplayRules } = storeToRefs(regexDisplay);
const { settings } = storeToRefs(settingsStore);

const route = computed(() => phone.currentRoute);
const query = ref('');
const selectedTableId = ref('');
const profileViewMode = ref<'list' | 'table'>('list');
const selectedReferences = ref<GenerationReferenceItem[]>([]);
const failedDraftRawOutput = ref('');
const draft = reactive({
  fields: {} as Record<string, string>,
  kind: 'character' as ProfileKind,
  summary: '',
  tableId: '',
  tagsText: '',
  title: '',
});
const generationDraft = reactive({
  fromStartEnd: 20,
  kind: 'character' as ProfileKind,
  rangeText: '',
  recentCount: 20,
  singleMessageId: 0,
  tableId: '',
  titleHint: '',
  userRequirement: '',
});
const generationState = reactive({
  preview: null as null | {
    content: string;
    draftId: null | string;
    fields: Record<string, string>;
    kind: ProfileKind;
    raw: string;
    source: { label: string };
    summary: string;
    tags: string[];
    tableId: string;
    title: string;
    warnings: string[];
  },
});
const generationSession = useSingleGenerationTaskSession({
  actionId: 'generate',
  appId: 'profiles',
  sourcePage: 'generate',
  title: 'AI 资料 · 单次生成',
});
const { error: generationError, rawOutput: generationRawOutput, running: generationRunning } = generationSession;
type ProfilesPreview = NonNullable<typeof generationState.preview>;

const tableDraft = reactive({
  columns: [] as ProfileTableColumn[],
  displayFormat: '',
  kind: 'note' as ProfileKind,
  name: '',
  renderMode: 'markdown' as ProfileRenderMode,
});
const newTableColumnRouteId = '__new__';
const tableDraftTableId = ref('');
const tableColumnDrag = reactive({
  columnId: '',
  insertBeforeId: '',
  isDragging: false,
  pointerId: -1,
  startY: 0,
});
const booleanOptions = ['否', '是'];

const {
  clearPreviewDraft: clearProfilesPreviewDraft,
  discardPreviewDraft: discardProfilesPreviewDraft,
  draft: profilesPreviewDraft,
  openPreviewDraft: openProfilesPreviewDraft,
  persistPreviewDraft: persistProfilesPreviewDraft,
} = usePreviewDraftPersistence<ProfilesPreview>({
  appId: 'profiles',
  consumeFailedDraft: draftId => profiles.deleteFailedDraft(draftId),
  getPreview: () => generationState.preview,
  page: 'preview',
  route,
  setPreview: preview => {
    generationState.preview = preview;
  },
  title: '资料预览',
});

const activeEntry = computed(() =>
  route.value.params?.entryId ? profiles.getEntry(route.value.params.entryId) : null,
);
const editingEntry = computed(() =>
  route.value.params?.entryId ? profiles.getEntry(route.value.params.entryId) : null,
);
const editingTable = computed(() =>
  route.value.params?.tableId ? profiles.getTable(route.value.params.tableId) : null,
);
const editingTableColumn = computed(() => {
  const columnId = route.value.params?.columnId;
  if (!columnId || columnId === newTableColumnRouteId) return null;
  return tableDraft.columns.find(column => column.id === columnId) ?? null;
});
const activeFailedDraft = computed(() =>
  route.value.params?.draftId ? profiles.getFailedDraft(route.value.params.draftId) : null,
);
const activeEntryIndex = computed(() => entries.value.findIndex(entry => entry.id === activeEntry.value?.id));
const previousEntryId = computed(() =>
  activeEntryIndex.value > 0 ? entries.value[activeEntryIndex.value - 1]?.id || '' : '',
);
const nextEntryId = computed(() =>
  activeEntryIndex.value >= 0 ? entries.value[activeEntryIndex.value + 1]?.id || '' : '',
);
const normalizedQuery = computed(() => query.value.trim().toLowerCase());
const selectedTable = computed(() => profiles.getTable(selectedTableId.value) ?? tables.value[0] ?? null);
const tableEntries = computed(() => (selectedTable.value ? profiles.getEntriesForTable(selectedTable.value.id) : []));
const activeEntryTable = computed(() => (activeEntry.value ? profiles.getTable(activeEntry.value.tableId) : null));
const visibleTableColumns = computed(() => {
  const columns = selectedTable.value?.columns.filter(column => column.enabled) ?? [];
  return columns.length
    ? columns.slice(0, 3)
    : [
        {
          description: '',
          enabled: true,
          id: 'title',
          label: '名称',
          options: [],
          required: true,
          type: 'text' as const,
        },
      ];
});
const profileTableOptions = computed(() =>
  tables.value.map(table => ({
    group: table.builtIn ? '内置资料表' : '自定义资料表',
    label: `${table.name} · ${tableEntryCount(table.id)} 条`,
    value: table.id,
  })),
);
const profileTableGridTemplate = computed(() => {
  const trailingColumns = Math.max(0, visibleTableColumns.value.length - 1);
  return trailingColumns ? `minmax(128px, 1.25fr) repeat(${trailingColumns}, minmax(110px, 1fr))` : 'minmax(0, 1fr)';
});
const profileTableMinWidth = computed(() =>
  visibleTableColumns.value.length > 1 ? 128 + (visibleTableColumns.value.length - 1) * 110 : 0,
);
const editableDraftColumns = computed(() => {
  const table = profiles.getTable(draft.tableId);
  return table?.columns.filter(column => column.enabled && !isCoreColumn(column.id)) ?? [];
});
const filteredEntries = computed(() =>
  tableEntries.value.filter(entry => {
    const search = normalizedQuery.value;
    if (!search) return true;
    const enabledColumnIds = new Set(
      (selectedTable.value?.columns ?? []).filter(column => column.enabled).map(column => column.id),
    );
    return [
      entry.title,
      enabledColumnIds.has('summary') ? entry.summary : '',
      getProfileKindLabel(entry.kind),
      ...(enabledColumnIds.has('tags') ? entry.tags : []),
      ...Object.entries(entry.fields)
        .filter(([columnId]) => enabledColumnIds.has(columnId))
        .map(([, value]) => value),
    ]
      .join(' ')
      .toLowerCase()
      .includes(search);
  }),
);
const formattedReferences = computed(() => formatGenerationReferences(selectedReferences.value));
const profileBaguContent = computed(() => {
  const detailsEnabled = activeEntryTable.value?.columns.some(column => column.id === 'details' && column.enabled);
  return detailsEnabled ? activeEntry.value?.fields.details || '' : '';
});
const profilePromptPreview = computed(() => buildGenerationConfig());
const profileMarkdownContent = computed(() =>
  activeEntry.value && activeEntryTable.value ? formatProfileMarkdown(activeEntry.value, activeEntryTable.value) : '',
);
const profileFrontend = computed(() =>
  activeEntry.value && activeEntryTable.value
    ? renderProfileFrontend(
        activeEntry.value,
        activeEntryTable.value,
        getRegexRulesByIds(
          regexDisplayRules.value,
          regexDisplay.getUsage(regexDisplayProfilesTarget).displayRuleIds,
          'replace',
        ),
      )
    : { applied: [], content: '', errors: [], renderMode: 'html' as const },
);
const textProviderSummary = computed(() =>
  settings.value.textProvider.mode === 'external'
    ? formatTextProviderSummary(settings.value.textProvider)
    : `酒馆当前 API · ${settings.value.generation.tavernPresetName.trim() || '跟随当前预设'}`,
);

watch(
  () => [route.value.appId, route.value.page, route.value.params?.entryId] as const,
  ([appId, page]) => {
    if (appId !== 'profiles' || page !== 'editor') return;
    fillDraft(editingEntry.value);
  },
  { immediate: true },
);

watch(
  tables,
  currentTables => {
    if (!currentTables.length) return;
    if (!currentTables.some(table => table.id === selectedTableId.value)) {
      selectedTableId.value = currentTables[0].id;
    }
    if (!currentTables.some(table => table.id === generationDraft.tableId)) {
      generationDraft.tableId = selectedTableId.value;
      syncGenerationTable();
    }
  },
  { immediate: true },
);

watch(selectedTableId, (nextTableId, previousTableId) => {
  if (previousTableId && nextTableId !== previousTableId) query.value = '';
});

watch(
  () => [route.value.appId, route.value.page, route.value.params?.tableId] as const,
  ([appId, page, tableId]) => {
    if (appId !== 'profiles' || page !== 'table-editor') return;
    if (!tableId || tableDraftTableId.value === tableId) return;
    fillTableDraft(editingTable.value);
  },
  { immediate: true },
);

watch(
  () => [route.value.appId, route.value.page, route.value.params?.draftId] as const,
  ([appId, page]) => {
    if (appId !== 'profiles' || page !== 'failed-draft') return;
    failedDraftRawOutput.value = activeFailedDraft.value?.rawOutput || '';
  },
  { immediate: true },
);

useInvalidRouteFallback({
  source: () => ({
    appId: route.value.appId,
    hasEntry: Boolean(activeEntry.value),
    hasFailedDraft: Boolean(activeFailedDraft.value),
    hasPreview: Boolean(generationState.preview),
    page: route.value.page,
  }),
  isInvalid: current =>
    current.appId === 'profiles' &&
    ((current.page === 'preview' && !current.hasPreview) ||
      (['entry', 'bagu-scan'].includes(current.page) && !current.hasEntry) ||
      (current.page === 'failed-draft' && !current.hasFailedDraft)),
  fallback: () => {
    if (route.value.appId !== 'profiles') return;
    phone.replacePage('root', '资料表');
  },
});

function splitTags(text: string) {
  return text
    .split(/[,，、\n]/g)
    .map(tag => tag.trim())
    .filter(Boolean);
}

function fillDraft(entry: ProfileEntry | null) {
  draft.title = entry?.title || '';
  draft.kind = entry?.kind || selectedTable.value?.kind || 'character';
  draft.tableId = entry?.tableId || selectedTable.value?.id || profiles.getDefaultTable(draft.kind)?.id || '';
  draft.summary = entry?.summary || '';
  draft.tagsText = entry?.tags.join('、') || '';
  draft.fields = { ...(entry?.fields ?? {}) };
}

function fillTableDraft(table: ReturnType<typeof profiles.getTable>) {
  tableDraft.displayFormat = table?.displayFormat || (table ? createDefaultProfileDisplayFormat(table) : '');
  tableDraft.name = table?.name || '';
  tableDraft.kind = table?.kind || 'note';
  tableDraft.renderMode = table?.renderMode || 'markdown';
  tableDraft.columns = (table?.columns ?? []).map(column => ({
    ...column,
    options: [...column.options],
  }));
  tableDraftTableId.value = table?.id || '';
}

function isCoreColumn(columnId: string) {
  return ['title', 'summary', 'tags'].includes(columnId);
}

function isProtectedColumn(columnId: string) {
  return [
    'title',
    'summary',
    'tags',
    'details',
    'birthDate',
    'calendarName',
    'calendarEraName',
    'calendarMonthsPerYear',
    'calendarMonthDays',
  ].includes(columnId);
}

function isStatusColumn(column: ProfileTableColumn) {
  return column.type === 'boolean' || column.type === 'select' || /状态|status/i.test(column.label);
}

function profileKindIcon(kind: ProfileKind) {
  const icons: Record<ProfileKind, string> = {
    character: 'fa-user',
    event: 'fa-bolt',
    item: 'fa-cube',
    location: 'fa-location-dot',
    note: 'fa-note-sticky',
    organization: 'fa-people-group',
    rule: 'fa-scale-balanced',
    timeline: 'fa-timeline',
    world: 'fa-earth-asia',
  };
  return icons[kind];
}

function entryTableName(entry: ProfileEntry) {
  return profiles.getTable(entry.tableId)?.name || getProfileKindLabel(entry.kind);
}

function entryListPreview(entry: ProfileEntry) {
  return getProfileListPreview(entry, profiles.getTable(entry.tableId));
}

function tableEntryCount(tableId: string) {
  return profiles.getEntriesForTable(tableId).length;
}

function syncDraftTable() {
  const table = profiles.getTable(draft.tableId);
  if (!table) return;
  draft.kind = table.kind;
  const allowed = new Set(table.columns.map(column => column.id));
  draft.fields = Object.fromEntries(Object.entries(draft.fields).filter(([key]) => allowed.has(key)));
}

function isDraftColumnEnabled(columnId: string) {
  return Boolean(profiles.getTable(draft.tableId)?.columns.some(column => column.id === columnId && column.enabled));
}

function syncGenerationTable() {
  const table = profiles.getTable(generationDraft.tableId);
  if (table) generationDraft.kind = table.kind;
}

function setGenerationTable(tableId: string) {
  generationDraft.tableId = tableId;
  syncGenerationTable();
}

function openTableManager() {
  phone.pushPage('tables', '表格类型');
}

function openTableEditor(tableId: string) {
  const table = profiles.getTable(tableId);
  if (!table) return;
  tableDraftTableId.value = '';
  phone.pushPage('table-editor', table.name, { tableId });
}

function createTable() {
  const table = profiles.createTable({ kind: 'note', name: '新资料表' });
  openTableEditor(table.id);
}

function createTableColumnId() {
  const base = 'field';
  let index = tableDraft.columns.length + 1;
  let id = `${base}_${index}`;
  const used = new Set(tableDraft.columns.map(column => column.id));
  while (used.has(id)) {
    index += 1;
    id = `${base}_${index}`;
  }
  return id;
}

function openNewTableColumn() {
  const tableId = editingTable.value?.id;
  if (!tableId) return;
  phone.pushPage('table-column-editor', '新增字段', { columnId: newTableColumnRouteId, tableId });
}

function openTableColumn(columnId: string) {
  const tableId = editingTable.value?.id;
  const column = tableDraft.columns.find(item => item.id === columnId);
  if (!tableId || !column) return;
  phone.pushPage('table-column-editor', column.label, { columnId, tableId });
}

function saveEditingTableColumn(column: ProfileTableColumn) {
  const columnId = route.value.params?.columnId;
  if (columnId === newTableColumnRouteId) {
    tableDraft.columns.push({ ...column, id: createTableColumnId(), options: [...column.options] });
  } else {
    const index = tableDraft.columns.findIndex(item => item.id === columnId);
    if (index < 0) return;
    tableDraft.columns.splice(index, 1, {
      ...column,
      id: columnId || column.id,
      options: [...column.options],
    });
  }
  phone.goBack();
}

async function removeEditingTableColumn() {
  const columnId = route.value.params?.columnId;
  const column = tableDraft.columns.find(item => item.id === columnId);
  const table = editingTable.value;
  if (!column || !table || isProtectedColumn(column.id)) return;
  const valueCount = profiles
    .getEntriesForTable(table.id)
    .filter(entry => Boolean(entry.fields[column.id]?.trim())).length;
  const shouldDelete = await phone.confirmNotice(
    valueCount
      ? `要删除字段“${column.label}”吗？保存资料表后，${valueCount} 条资料中的已有字段值也会被删除。`
      : `要删除字段“${column.label}”吗？`,
    {
      confirmLabel: '删除字段',
      dedupeKey: `profiles-delete-column:${table.id}:${column.id}`,
      kind: 'warning',
    },
  );
  if (!shouldDelete) return;
  tableDraft.columns = tableDraft.columns.filter(item => item.id !== column.id);
  const escapedColumnId = column.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(`\\{\\{\\s*${escapedColumnId}\\s*\\}\\}`).test(tableDraft.displayFormat)) {
    toastr.warning(`资料展示格式仍包含 {{${column.id}}}，保存前可以在“资料展示”中调整`);
  }
  await phone.goBack();
}

function resetTableDisplayFormat() {
  const table = editingTable.value;
  if (!table) return;
  tableDraft.displayFormat = createDefaultProfileDisplayFormat({
    ...table,
    columns: tableDraft.columns,
    kind: tableDraft.kind,
  });
}

function resetTableColumnDrag() {
  tableColumnDrag.columnId = '';
  tableColumnDrag.insertBeforeId = '';
  tableColumnDrag.isDragging = false;
  tableColumnDrag.pointerId = -1;
  tableColumnDrag.startY = 0;
}

function startTableColumnDrag(event: PointerEvent, columnId: string) {
  if (event.button !== 0) return;
  resetTableColumnDrag();
  tableColumnDrag.columnId = columnId;
  tableColumnDrag.pointerId = event.pointerId;
  tableColumnDrag.startY = event.clientY;
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
}

function updateTableColumnInsertion(clientY: number) {
  const rows = [...document.querySelectorAll<HTMLElement>('.pc-profile-column-row')].filter(
    row => row.dataset.profileColumnId !== tableColumnDrag.columnId,
  );
  const beforeRow = rows.find(row => {
    const rect = row.getBoundingClientRect();
    return clientY < rect.top + rect.height / 2;
  });
  tableColumnDrag.insertBeforeId = beforeRow?.dataset.profileColumnId || '';
}

function autoScrollTableColumnList(clientY: number) {
  const screen = document.querySelector<HTMLElement>('#tavern-phone-root .pc-screen');
  if (!screen) return;
  const rect = screen.getBoundingClientRect();
  const edge = 52;
  if (clientY < rect.top + edge) screen.scrollTop -= 14;
  else if (clientY > rect.bottom - edge) screen.scrollTop += 14;
}

function moveTableColumnDrag(event: PointerEvent) {
  if (event.pointerId !== tableColumnDrag.pointerId || !tableColumnDrag.columnId) return;
  if (!tableColumnDrag.isDragging && Math.abs(event.clientY - tableColumnDrag.startY) > 4) {
    tableColumnDrag.isDragging = true;
  }
  if (!tableColumnDrag.isDragging) return;
  event.preventDefault();
  autoScrollTableColumnList(event.clientY);
  updateTableColumnInsertion(event.clientY);
}

function finishTableColumnDrag(event: PointerEvent) {
  if (event.pointerId !== tableColumnDrag.pointerId) return;
  if (tableColumnDrag.isDragging && tableColumnDrag.columnId) {
    const dragged = tableDraft.columns.find(column => column.id === tableColumnDrag.columnId);
    if (dragged) {
      const next = tableDraft.columns.filter(column => column.id !== dragged.id);
      const beforeIndex = next.findIndex(column => column.id === tableColumnDrag.insertBeforeId);
      next.splice(beforeIndex < 0 ? next.length : beforeIndex, 0, dragged);
      tableDraft.columns = next;
    }
  }
  resetTableColumnDrag();
}

function cancelTableColumnDrag(event: PointerEvent) {
  if (event.pointerId !== tableColumnDrag.pointerId) return;
  resetTableColumnDrag();
}

function saveTableDraft() {
  const table = editingTable.value;
  if (!table) return;
  const name = tableDraft.name.trim();
  if (!name) {
    toastr.warning('请先填写表格名称');
    return;
  }
  const columns = tableDraft.columns.map(column => ({
    ...column,
    description: column.description.trim(),
    label: column.label.trim() || '未命名字段',
    options: column.type === 'select' ? [...column.options] : [],
  }));
  profiles.updateTable(table.id, {
    columns,
    displayFormat: tableDraft.displayFormat.trim(),
    kind: tableDraft.kind,
    name,
    renderMode: tableDraft.renderMode,
  });
  tableDraftTableId.value = '';
  toastr.success('已保存资料表');
  phone.goBack();
}

async function removeTable(tableId: string) {
  const table = profiles.getTable(tableId);
  if (!table || table.builtIn) return;
  const count = tableEntryCount(tableId);
  const shouldDelete = await phone.confirmNotice(`要删除资料表“${table.name}”吗？其中 ${count} 条资料会移到“其他”。`, {
    confirmLabel: '删除表格',
    kind: 'warning',
  });
  if (!shouldDelete) return;
  profiles.deleteTable(tableId);
  toastr.success('已删除资料表');
  phone.replacePage('tables', '表格类型');
}

function openEntry(entryId: string) {
  const entry = profiles.getEntry(entryId);
  if (!entry) return;
  phone.pushPage('entry', entry.title, { entryId });
}

function openEditor(entryId?: string) {
  phone.pushPage('editor', entryId ? '编辑资料' : '新增资料', entryId ? { entryId } : {});
}

function openProfilesBaguScan() {
  if (!activeEntry.value) return;
  if (!canOpenBaguScan(profileBaguContent.value)) return;
  phone.pushPage('bagu-scan', '八股检测', {
    entryId: activeEntry.value.id,
  });
}

function openGenerate() {
  if (selectedTable.value) {
    generationDraft.tableId = selectedTable.value.id;
    syncGenerationTable();
  }
  phone.pushPage('generate', 'AI 资料');
}

function openFailedDraft(draftId: string) {
  if (!profiles.getFailedDraft(draftId)) return;
  phone.pushPage('failed-draft', '解析失败草稿', { draftId });
}

function failedDraftTitle() {
  return '未解析资料';
}

function failedDraftSourceLabel(draft: FailedGenerationDraft) {
  return draft.source.label;
}

function saveDraft() {
  if (!draft.title.trim()) {
    toastr.warning('请先填写标题');
    return;
  }

  const input = {
    fields: draft.fields,
    kind: draft.kind,
    summary: draft.summary,
    tableId: draft.tableId,
    tags: splitTags(draft.tagsText),
    title: draft.title,
  };
  const entry = editingEntry.value ? profiles.updateEntry(editingEntry.value.id, input) : profiles.createEntry(input);
  if (!entry) return;
  phone.replacePage('entry', entry.title, { entryId: entry.id });
  toastr.success('已保存资料');
}

async function removeEntry(entryId: string) {
  const entry = profiles.getEntry(entryId);
  const shouldDelete = await phone.confirmNotice(`要删除资料“${entry?.title || '未命名资料'}”吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!shouldDelete) return;
  profiles.deleteEntry(entryId);
  phone.goBack();
  toastr.success('已删除资料');
}

function applyProfilesBaguContent(content: string) {
  if (!activeEntry.value) return false;
  const entry = profiles.updateEntry(activeEntry.value.id, {
    fields: { ...activeEntry.value.fields, details: content },
    kind: activeEntry.value.kind,
    summary: activeEntry.value.summary,
    tags: [...activeEntry.value.tags],
    title: activeEntry.value.title,
  });
  return Boolean(entry);
}

function buildGenerationConfig() {
  return {
    appPrompt: prompts.appPrompts.profiles,
    kind: generationDraft.kind,
    outputFormat: prompts.resolveOutputFormat('profiles.generate'),
    tableId: generationDraft.tableId,
    titleHint: generationDraft.titleHint,
    userRequirement: generationDraft.userRequirement,
  };
}

function getGenerationOptions() {
  return {
    generationDefaults: {
      resultMode: settings.value.generation.resultMode,
      stream: settings.value.generation.stream,
      tavernPresetName: settings.value.generation.tavernPresetName,
    },
    references: formattedReferences.value,
    source: {
      fromStartEnd: generationDraft.fromStartEnd,
      mode: settings.value.generation.sourceMode,
      rangeText: generationDraft.rangeText,
      recentCount: generationDraft.recentCount,
      singleMessageId: generationDraft.singleMessageId,
    },
    textProvider: settings.value.textProvider,
  };
}

function captureProfilePrompt() {
  return captureGenerationPrompt(adapter, buildGenerationConfig(), getGenerationOptions());
}

function formatGeneratedFieldsPreview(
  title: string,
  summary: string,
  tags: string[],
  fields: Record<string, string>,
  tableId: string,
) {
  const table = profiles.getTable(tableId);
  const enabledColumnIds = new Set((table?.columns ?? []).filter(column => column.enabled).map(column => column.id));
  const lines = [
    `# ${title}`,
    enabledColumnIds.has('summary') && summary ? `摘要：${summary}` : '',
    enabledColumnIds.has('tags') && tags.length ? `标签：${tags.join('、')}` : '',
    ...(table?.columns ?? [])
      .filter(column => column.enabled && !['title', 'summary', 'tags', 'content'].includes(column.id))
      .map(column => (fields[column.id]?.trim() ? `${column.label}：${fields[column.id]}` : '')),
  ].filter(Boolean);
  return lines.join('\n\n');
}

function fieldsForTable(fields: Record<string, string>, tableId: string) {
  const ids = new Set(
    (profiles.getTable(tableId)?.columns ?? [])
      .filter(column => column.enabled && !['title', 'summary', 'tags', 'content'].includes(column.id))
      .map(column => column.id),
  );
  return Object.fromEntries(Object.entries(fields).filter(([fieldId]) => ids.has(fieldId)));
}

async function runGeneration() {
  clearProfilesPreviewDraft();
  generationState.preview = null;
  let task: GenerationTask | null = null;
  try {
    task = generationSession.create({
      sourceParams: generationDraft.tableId ? { tableId: generationDraft.tableId } : {},
      title: profiles.getTable(generationDraft.tableId)
        ? `AI 资料 · ${profiles.getTable(generationDraft.tableId)?.name}`
        : 'AI 资料 · 单次生成',
    });
    const result = await generateContent(adapter, buildGenerationConfig(), {
      ...getGenerationOptions(),
      createFailedDraft: input => profiles.createFailedDraft(input),
      lifecycle: generationSession.lifecycle(task.id),
    });

    if (result.status === 'failed') {
      generationSession.complete(task.id, {
        currentLabel: '解析失败草稿已保留',
        resultPage: 'failed-draft',
        resultParams: { draftId: result.draft.id },
        resultState: 'failed-draft',
        resultTitle: '解析失败草稿',
      });
      toastr.warning('XML 解析失败，已保存失败草稿');
      void phone.presentGeneratedPage('profiles', 'failed-draft', '解析失败草稿', { draftId: result.draft.id });
      return;
    }

    if (result.status === 'saved') {
      generationSession.complete(task.id, {
        currentLabel: `已保存资料：${result.saved.entry.title}`,
        resultPage: 'entry',
        resultParams: { entryId: result.saved.entry.id },
        resultState: 'saved',
        resultTitle: result.saved.entry.title,
      });
      toastr.success('已生成并保存资料');
      void phone.presentGeneratedPage('profiles', 'entry', result.saved.entry.title, {
        entryId: result.saved.entry.id,
      });
      return;
    }

    generationState.preview = {
      content: formatGeneratedFieldsPreview(
        result.data.title,
        result.data.summary,
        result.data.tags,
        result.data.fields,
        generationDraft.tableId,
      ),
      draftId: null,
      fields: fieldsForTable(result.data.fields, generationDraft.tableId),
      kind: generationDraft.kind,
      raw: result.rawOutput,
      source: { label: result.source.label },
      summary: result.data.summary,
      tags: result.data.tags,
      tableId: generationDraft.tableId,
      title: result.data.title,
      warnings: result.warnings,
    };
    persistProfilesPreviewDraft();
    generationSession.complete(task.id, {
      currentLabel: '资料已生成，等待确认',
      resultPage: 'preview',
      resultState: 'preview',
      resultTitle: '资料预览',
    });
    void phone.presentGeneratedPage('profiles', 'preview', '资料预览');
  } catch (caughtError) {
    if (task) generationSession.fail(task.id, caughtError);
    else toastr.error(caughtError instanceof Error ? caughtError.message : '生成资料失败');
  }
}

function returnToGenerate() {
  if (generationState.preview?.draftId) {
    phone.replacePage('failed-draft', '解析失败草稿', { draftId: generationState.preview.draftId });
    return;
  }
  phone.replacePage('generate', 'AI 资料');
}

function savePreview() {
  const preview = generationState.preview;
  if (!preview) return;
  const entry = profiles.createEntry({
    fields: fieldsForTable(preview.fields, preview.tableId),
    kind: preview.kind,
    summary: preview.summary,
    tableId: preview.tableId,
    tags: preview.tags,
    title: preview.title,
  });
  if (preview.draftId) profiles.deleteFailedDraft(preview.draftId);
  clearProfilesPreviewDraft();
  generationState.preview = null;
  toastr.success('已保存资料');
  phone.replacePage('entry', entry.title, { entryId: entry.id });
}

function reparsePreviewRaw() {
  const preview = generationState.preview;
  if (!preview) return false;
  const rawOutput = preview.raw.trim();
  if (!rawOutput) {
    toastr.warning('先补一点可解析的 XML 内容');
    return false;
  }

  const parsed = parseProfileXmlResult(rawOutput);
  if (!parsed.ok) {
    preview.raw = rawOutput;
    preview.warnings = parsed.warnings;
    toastr.warning(parsed.warnings.join('；') || '还是没能解析成功');
    return false;
  }

  preview.content = formatGeneratedFieldsPreview(
    parsed.data.title,
    parsed.data.summary,
    parsed.data.tags,
    parsed.data.fields,
    preview.tableId,
  );
  preview.fields = fieldsForTable(parsed.data.fields, preview.tableId);
  preview.raw = parsed.raw;
  preview.summary = parsed.data.summary;
  preview.tags = parsed.data.tags;
  preview.title = parsed.data.title;
  preview.warnings = parsed.warnings;
  toastr.success('已按原始输出重新解析');
  return true;
}

function profileKindFromFailedDraft(draft: FailedGenerationDraft) {
  const kind = draft.context.kind;
  return profileKindOptions.some(option => option.id === kind) ? (kind as ProfileKind) : generationDraft.kind;
}

function profileTableIdFromFailedDraft(draft: FailedGenerationDraft) {
  const tableId = typeof draft.context.tableId === 'string' ? draft.context.tableId : '';
  return profiles.getTable(tableId)?.id || profiles.getDefaultTable(profileKindFromFailedDraft(draft))?.id || '';
}

async function removeFailedDraft(draftId: string) {
  const shouldDelete = await phone.confirmNotice('要删除这条解析失败草稿吗？原始输出也会一并移除。', {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!shouldDelete) return;
  profiles.deleteFailedDraft(draftId);
  failedDraftRawOutput.value = '';
  if (route.value.page === 'failed-draft') phone.replacePage('root', '资料表');
  toastr.success('已删除失败草稿');
}

function reparseFailedDraft() {
  const draft = activeFailedDraft.value;
  if (!draft) return;
  const rawOutput = failedDraftRawOutput.value.trim();
  if (!rawOutput) {
    toastr.warning('先补一点可解析的 XML 内容');
    return;
  }

  const parsed = parseProfileXmlResult(rawOutput);
  if (!parsed.ok) {
    profiles.updateFailedDraft(draft.id, {
      rawOutput,
      warnings: parsed.warnings,
    });
    failedDraftRawOutput.value = rawOutput;
    toastr.warning(parsed.warnings.join('；') || '还是没能解析成功');
    return;
  }

  profiles.updateFailedDraft(draft.id, {
    rawOutput: parsed.raw,
    warnings: parsed.warnings,
  });
  generationState.preview = {
    content: formatGeneratedFieldsPreview(
      parsed.data.title,
      parsed.data.summary,
      parsed.data.tags,
      parsed.data.fields,
      profileTableIdFromFailedDraft(draft),
    ),
    draftId: null,
    fields: fieldsForTable(parsed.data.fields, profileTableIdFromFailedDraft(draft)),
    kind: profileKindFromFailedDraft(draft),
    raw: parsed.raw,
    source: { label: draft.source.label },
    summary: parsed.data.summary,
    tags: parsed.data.tags,
    tableId: profileTableIdFromFailedDraft(draft),
    title: parsed.data.title,
    warnings: parsed.warnings,
  };
  persistProfilesPreviewDraft();
  profiles.deleteFailedDraft(draft.id);
  failedDraftRawOutput.value = '';
  phone.replacePage('preview', '资料预览');
}

function stopGeneration() {
  generationSession.stop();
}
</script>

<style scoped>
.pc-profiles-app {
  height: 100%;
  min-height: 0;
}
</style>
