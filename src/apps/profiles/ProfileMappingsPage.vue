<template>
  <section v-if="route.page === 'mappings'" class="pc-profile-mappings-page">
    <div class="pc-compact-toolbar pc-directory-toolbar">
      <span class="pc-directory-count">{{ mappings.mappings.length }} 个映射</span>
      <button
        class="pc-icon-btn"
        type="button"
        title="新建资料映射"
        aria-label="新建资料映射"
        :disabled="!tables.length"
        @click="openNewMapping"
      >
        <i class="fa-solid fa-plus"></i>
      </button>
    </div>

    <div v-if="mappings.configError" class="pc-status-card error">
      <strong>映射设置读取失败</strong>
      <p>{{ mappings.configError }}</p>
    </div>

    <div v-if="mappings.mappings.length" class="pc-directory-list">
      <button
        v-for="mapping in mappings.mappings"
        :key="mapping.id"
        class="pc-list-row pc-profile-mapping-row"
        type="button"
        @click="openMapping(mapping.id, mapping.name)"
      >
        <span class="pc-profile-mapping-icon"><i class="fa-solid fa-link"></i></span>
        <span class="pc-profile-mapping-main">
          <strong>{{ mapping.name }}</strong>
          <small>{{ mapping.tableName }} · {{ mapping.identityColumn }} → {{ mapping.displayColumn }}</small>
          <small v-if="mappingError(mapping)" class="pc-profile-mapping-error">{{ mappingError(mapping) }}</small>
        </span>
        <i class="fa-solid fa-chevron-right pc-profile-mapping-chevron"></i>
      </button>
    </div>

    <EmptyState v-else-if="tables.length" title="还没有资料映射">
      <p>先明确选择外部表、稳定身份列和显示列；程序不会猜测字段。</p>
      <button class="pc-primary-btn compact pc-profile-mapping-empty-action" type="button" @click="openNewMapping">
        新建映射
      </button>
    </EmptyState>
    <EmptyState v-else title="当前没有可映射的外部表">
      <p>返回资料表刷新，或先在完整数据库中建立表格。</p>
    </EmptyState>
  </section>

  <section v-else class="pc-profile-mapping-editor pc-editor-card">
    <div class="pc-field-group">
      <span class="pc-field-label">映射名称</span>
      <input v-model="draft.name" class="pc-field" type="text" placeholder="例如：人物资料" />
    </div>

    <label class="pc-field-group">
      <span class="pc-field-label">外部资料表</span>
      <select class="pc-select" :value="draft.sheetKey" @change="selectTable(($event.target as HTMLSelectElement).value)">
        <option value="">请选择外部资料表</option>
        <option v-for="table in tables" :key="table.key" :value="table.key">{{ table.name }}</option>
      </select>
    </label>

    <div v-if="selectedTable" class="pc-status-card info pc-profile-mapping-safety-note">
      <strong>安全定位规则</strong>
      <p>身份列必须长期唯一且不会随人物改名；保存和写入都不会记录当前行号。</p>
    </div>

    <label class="pc-field-group">
      <span class="pc-field-label">稳定身份列</span>
      <select v-model="draft.identityColumn" class="pc-select" :disabled="!selectedTable">
        <option value="">请选择身份列</option>
        <option v-for="column in writableColumns" :key="column.index" :value="column.sourceLabel">
          {{ column.label }}
        </option>
      </select>
    </label>

    <label class="pc-field-group">
      <span class="pc-field-label">显示名称列</span>
      <select v-model="draft.displayColumn" class="pc-select" :disabled="!selectedTable">
        <option value="">请选择显示列</option>
        <option v-for="column in writableColumns" :key="column.index" :value="column.sourceLabel">
          {{ column.label }}
        </option>
      </select>
    </label>

    <section class="pc-section-card pc-profile-field-mappings">
      <div class="pc-compact-toolbar pc-profile-fields-toolbar">
        <div>
          <strong>业务字段</strong>
          <small>供后续时间确认、写卡等功能按标识取用</small>
        </div>
        <button
          class="pc-icon-btn"
          type="button"
          title="增加业务字段"
          aria-label="增加业务字段"
          :disabled="!selectedTable"
          @click="addField"
        >
          <i class="fa-solid fa-plus"></i>
        </button>
      </div>

      <div v-if="draft.fields.length" class="pc-profile-field-list">
        <div v-for="(field, index) in draft.fields" :key="field.localId" class="pc-profile-field-row">
          <input v-model="field.key" class="pc-field" type="text" placeholder="字段标识，如 birthDate" />
          <input v-model="field.label" class="pc-field" type="text" placeholder="显示名称" />
          <select v-model="field.column" class="pc-select">
            <option value="">选择外部列</option>
            <option v-for="column in writableColumns" :key="column.index" :value="column.sourceLabel">
              {{ column.label }}
            </option>
          </select>
          <button
            class="pc-icon-btn danger"
            type="button"
            title="移除业务字段"
            aria-label="移除业务字段"
            @click="removeField(index)"
          >
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
      <p v-else class="pc-profile-field-empty">当前没有业务字段；身份列和显示列仍会保存。</p>
    </section>

    <div v-if="validationMessage" class="pc-status-card warning">
      <strong>当前映射不可用</strong>
      <p>{{ validationMessage }}</p>
    </div>

    <div class="pc-form-actions">
      <button class="pc-soft-btn" type="button" @click="phone.goBack()">取消</button>
      <button v-if="editingMapping" class="pc-soft-btn danger" type="button" @click="removeCurrentMapping">删除</button>
      <button class="pc-primary-btn" type="button" @click="saveMapping">保存映射</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import { usePhoneStore } from '@/store/phone';
import { validateExternalProfileMapping } from './externalCrud';
import type { ExternalProfileColumn, ExternalProfileTable } from './externalBridge';
import {
  ExternalProfileMappingSchema,
  useExternalProfileMappingsStore,
  type ExternalProfileMapping,
  type ExternalProfileMappingInput,
} from './profileMappings';

const props = defineProps<{ tables: ExternalProfileTable[] }>();
const phone = usePhoneStore();
const mappings = useExternalProfileMappingsStore();
const route = computed(() => phone.currentRoute);
let fieldSequence = 0;

type DraftField = {
  column: string;
  key: string;
  label: string;
  localId: string;
};

const draft = reactive({
  displayColumn: '',
  fields: [] as DraftField[],
  identityColumn: '',
  name: '',
  sheetKey: '',
  tableName: '',
});

const editingMapping = computed(() => {
  const mappingId = route.value.params?.mappingId || '';
  return mappingId && mappingId !== 'new' ? mappings.getMapping(mappingId) : null;
});
const selectedTable = computed(() => props.tables.find(table => table.key === draft.sheetKey) ?? null);
const writableColumns = computed(() => {
  const columns = selectedTable.value?.columns ?? [];
  const counts = new Map<string, number>();
  columns.forEach(column => {
    if (column.sourceLabel) counts.set(column.sourceLabel, (counts.get(column.sourceLabel) ?? 0) + 1);
  });
  return columns.filter(column => column.sourceLabel && counts.get(column.sourceLabel) === 1);
});

function nextFieldId() {
  fieldSequence += 1;
  return `mapping_field_${fieldSequence}`;
}

function clearDraft() {
  draft.name = '';
  draft.sheetKey = '';
  draft.tableName = '';
  draft.identityColumn = '';
  draft.displayColumn = '';
  draft.fields = [];
}

function loadDraft() {
  if (route.value.page !== 'mapping-editor') return;
  const mappingId = route.value.params?.mappingId || '';
  if (!mappingId || mappingId === 'new') {
    clearDraft();
    return;
  }
  const mapping = mappings.getMapping(mappingId);
  if (!mapping) {
    toastr.warning('这份资料映射已经不存在');
    phone.replacePage('mappings', '资料映射');
    return;
  }
  draft.name = mapping.name;
  draft.sheetKey = mapping.sheetKey;
  draft.tableName = mapping.tableName;
  draft.identityColumn = mapping.identityColumn;
  draft.displayColumn = mapping.displayColumn;
  draft.fields = mapping.fields.map(field => ({ ...field, localId: nextFieldId() }));
}

function selectTable(sheetKey: string) {
  const table = props.tables.find(candidate => candidate.key === sheetKey);
  draft.sheetKey = table?.key || '';
  draft.tableName = table?.name || '';
  draft.identityColumn = '';
  draft.displayColumn = '';
  draft.fields = [];
}

function openNewMapping() {
  phone.pushRoute('profiles', 'mapping-editor', '新建资料映射', { mappingId: 'new' });
}

function openMapping(mappingId: string, title: string) {
  phone.pushRoute('profiles', 'mapping-editor', title, { mappingId });
}

function addField() {
  draft.fields.push({ column: '', key: '', label: '', localId: nextFieldId() });
}

function removeField(index: number) {
  draft.fields.splice(index, 1);
}

function mappingInput(): ExternalProfileMappingInput {
  return {
    displayColumn: draft.displayColumn,
    fields: draft.fields.map(({ column, key, label }) => ({ column, key, label })),
    identityColumn: draft.identityColumn,
    name: draft.name,
    sheetKey: draft.sheetKey,
    tableName: draft.tableName,
  };
}

function mappingCandidate() {
  return ExternalProfileMappingSchema.parse({
    ...mappingInput(),
    createdAt: editingMapping.value?.createdAt || new Date().toISOString(),
    id: editingMapping.value?.id || 'mapping_preview',
    updatedAt: new Date().toISOString(),
  });
}

const validationMessage = computed(() => {
  if (!draft.sheetKey) return '';
  try {
    validateExternalProfileMapping(mappingCandidate(), props.tables);
    return '';
  } catch (error) {
    return error instanceof Error ? error.message : '映射设置无效';
  }
});

function mappingError(mapping: ExternalProfileMapping) {
  try {
    validateExternalProfileMapping(mapping, props.tables);
    return '';
  } catch (error) {
    return error instanceof Error ? error.message : '映射已失效';
  }
}

function saveMapping() {
  try {
    const candidate = mappingCandidate();
    validateExternalProfileMapping(candidate, props.tables);
    if (editingMapping.value) mappings.updateMapping(editingMapping.value.id, mappingInput());
    else mappings.createMapping(mappingInput());
    toastr.success('资料映射已保存');
    phone.goBack();
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '资料映射保存失败');
  }
}

async function removeCurrentMapping() {
  const mapping = editingMapping.value;
  if (!mapping) return;
  if (
    !(await phone.confirmNotice(`删除资料映射“${mapping.name}”吗？不会删除外部表格数据。`, {
      confirmLabel: '删除映射',
      kind: 'warning',
    }))
  )
    return;
  mappings.removeMapping(mapping.id);
  toastr.success('资料映射已删除');
  phone.goBack();
}

watch(
  () => [route.value.page, route.value.params?.mappingId, mappings.scopeKey] as const,
  loadDraft,
  { immediate: true },
);
</script>

<style scoped>
.pc-profile-mappings-page,
.pc-profile-mapping-editor {
  display: grid;
  min-width: 0;
  gap: 12px;
}
.pc-profile-mapping-row {
  grid-template-columns: 38px minmax(0, 1fr) auto;
}
.pc-profile-mapping-icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 12px;
  background: color-mix(in srgb, var(--pc-theme-accent) 14%, var(--pc-surface) 86%);
  color: var(--pc-theme-accent);
}
.pc-profile-mapping-main {
  display: grid;
  min-width: 0;
  gap: 3px;
}
.pc-profile-mapping-main :is(strong, small) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-profile-mapping-main small,
.pc-profile-mapping-chevron,
.pc-profile-field-empty,
.pc-profile-fields-toolbar small {
  color: var(--pc-muted);
}
.pc-profile-mapping-main .pc-profile-mapping-error {
  color: var(--pc-danger);
}
.pc-profile-mapping-empty-action {
  margin-top: 12px;
}
.pc-profile-mapping-safety-note p {
  margin: 4px 0 0;
}
.pc-profile-field-mappings {
  display: grid;
  gap: 10px;
}
.pc-profile-fields-toolbar > div {
  display: grid;
  min-width: 0;
  gap: 2px;
}
.pc-profile-field-list {
  display: grid;
  gap: 8px;
}
.pc-profile-field-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 6px;
  align-items: center;
}
.pc-profile-field-row > :first-child {
  grid-column: 1 / -1;
}
.pc-profile-field-empty {
  margin: 0;
  font-size: 12px;
}
</style>
