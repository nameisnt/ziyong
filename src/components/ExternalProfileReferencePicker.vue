<template>
  <div class="pc-external-profile-picker">
    <div class="pc-external-profile-table-row">
      <SearchableCombobox
        :model-value="sheetKey"
        :disabled="disabled"
        empty-label="没有可用的外部资料表"
        input-label="选择外部资料表"
        :options="tableOptions"
        placeholder="选择外部资料表"
        toggle-title="展开外部资料表"
        @update:model-value="selectTable"
      />
      <button
        class="pc-icon-btn"
        type="button"
        :disabled="disabled || loading"
        aria-label="刷新外部资料"
        title="刷新外部资料"
        @click="refresh"
      >
        <i :class="['fa-solid', loading ? 'fa-spinner fa-spin' : 'fa-rotate']"></i>
      </button>
    </div>
    <SearchableCombobox
      :model-value="String(rowIndex || '')"
      :disabled="disabled || !sheetKey || loading || Boolean(error)"
      empty-label="没有可选择的外部资料"
      input-label="选择外部资料"
      :options="rowOptions"
      :placeholder="sheetKey ? '选择外部资料' : '请先选择外部资料表'"
      toggle-title="展开外部资料"
      @update:model-value="selectRow"
    />
    <p v-if="error" class="pc-external-profile-error" role="alert">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { externalProfileReferenceKey } from '@/apps/profiles/profileReferences';
import {
  getExternalProfileRowLabel,
  readExternalProfileTables,
  type ExternalProfileTable,
} from '@/apps/profiles/externalBridge';
import SearchableCombobox from '@/components/SearchableCombobox.vue';

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    disabledReferenceKeys?: string[];
    rowIndex: number;
    sheetKey: string;
  }>(),
  { disabled: false, disabledReferenceKeys: () => [] },
);

const emit = defineEmits<{
  resolved: [value: { displayValue: string; profileRowIndex: number; profileSheetKey: string }];
  'update:rowIndex': [value: number];
  'update:sheetKey': [value: string];
}>();

const tables = ref<ExternalProfileTable[]>([]);
const error = ref('');
const loading = ref(false);
const activeTable = computed(() => tables.value.find(table => table.key === props.sheetKey) ?? null);
const tableOptions = computed(() => tables.value.map(table => ({ label: table.name, value: table.key })));
const rowOptions = computed(() =>
  (activeTable.value?.rows ?? []).map(row => ({
    disabled: props.disabledReferenceKeys.includes(
      externalProfileReferenceKey({ profileRowIndex: row.index, profileSheetKey: props.sheetKey }),
    ),
    label: getExternalProfileRowLabel(activeTable.value!, row),
    value: String(row.index),
  })),
);

function refresh() {
  loading.value = true;
  error.value = '';
  try {
    tables.value = readExternalProfileTables();
  } catch (cause) {
    tables.value = [];
    error.value = cause instanceof Error ? cause.message : '读取外部资料失败';
  } finally {
    loading.value = false;
  }
}

function selectTable(value: string) {
  emit('update:sheetKey', value);
  emit('update:rowIndex', 0);
}

function selectRow(value: string) {
  const rowIndex = Number(value) || 0;
  emit('update:rowIndex', rowIndex);
  const row = activeTable.value?.rows.find(candidate => candidate.index === rowIndex);
  if (!row) return;
  emit('resolved', {
    displayValue: getExternalProfileRowLabel(activeTable.value!, row),
    profileRowIndex: row.index,
    profileSheetKey: props.sheetKey,
  });
}

watch(() => props.sheetKey, refresh, { immediate: true });
</script>

<style scoped>
.pc-external-profile-picker {
  display: grid;
  gap: 8px;
}
.pc-external-profile-table-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 8px;
}
.pc-external-profile-error {
  margin: 0;
  color: var(--pc-danger);
  font-size: 12px;
}
</style>
