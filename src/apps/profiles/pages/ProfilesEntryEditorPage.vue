<template>
  <section class="pc-profiles-page">
    <article class="pc-page-section">
      <input v-model="title" class="pc-field" type="text" placeholder="标题" />
      <SearchableCombobox
        input-label="选择资料表"
        :model-value="tableId"
        :options="tableOptions"
        placeholder="选择资料表"
        @update:model-value="setTableId"
      />
      <input v-if="summaryEnabled" v-model="summary" class="pc-field" type="text" placeholder="一句话摘要，可留空" />
      <input v-if="tagsEnabled" v-model="tagsText" class="pc-field" type="text" placeholder="标签，用逗号分隔" />
      <template v-for="column in columns" :key="column.id">
        <label class="pc-field-group">
          <span>{{ column.label }}</span>
          <textarea v-if="column.type === 'textarea'" v-model="fields[column.id]" class="pc-area compact" />
          <SearchableCombobox
            v-else-if="column.type === 'select' || column.type === 'boolean'"
            :input-label="`选择${column.label}`"
            :model-value="fields[column.id] || ''"
            :options="fieldOptions(column)"
            placeholder="未填写"
            @update:model-value="fields[column.id] = $event"
          />
          <input
            v-else
            v-model="fields[column.id]"
            class="pc-field"
            type="text"
            :placeholder="column.type === 'tags' ? '用逗号分隔' : '可留空'"
          />
        </label>
      </template>
      <div class="pc-form-actions">
        <button class="pc-soft-btn" type="button" @click="$emit('back')">取消</button>
        <button class="pc-primary-btn" type="button" @click="$emit('save')">保存</button>
      </div>
    </article>
  </section>
</template>
<script setup lang="ts">
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import type { ProfileTable, ProfileTableColumn } from '../store';
const props = defineProps<{
  booleanOptions: string[];
  columns: ProfileTableColumn[];
  currentTitle: string;
  editing: boolean;
  summaryEnabled: boolean;
  tables: ProfileTable[];
  tagsEnabled: boolean;
}>();
const fields = defineModel<Record<string, string>>('fields', { required: true });
const summary = defineModel<string>('summary', { required: true });
const tableId = defineModel<string>('tableId', { required: true });
const tagsText = defineModel<string>('tagsText', { required: true });
const title = defineModel<string>('title', { required: true });
const emit = defineEmits<{ back: []; 'change-table': []; save: [] }>();

const tableOptions = computed(() =>
  props.tables.map(table => ({
    group: table.builtIn ? '内置资料表' : '自定义资料表',
    label: table.name,
    value: table.id,
  })),
);

function fieldOptions(column: ProfileTableColumn) {
  const selected = fields.value[column.id] || '';
  const values = column.type === 'boolean' ? props.booleanOptions : column.options;
  const options = values.map(value => ({ label: value, value }));
  if (selected && !options.some(option => option.value === selected)) {
    options.unshift({ label: `当前值：${selected}`, value: selected });
  }
  return [{ label: '未填写', value: '' }, ...options];
}

function setTableId(nextTableId: string) {
  tableId.value = nextTableId;
  emit('change-table');
}
</script>
<style scoped>
.pc-profiles-page {
  display: grid;
  min-height: 100%;
  align-content: start;
  gap: 14px;
}
</style>
