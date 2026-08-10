<template>
  <section class="pc-profiles-page pc-profile-field-editor-page">
    <div class="pc-profile-field-editor">
      <label class="pc-field-group">
        <span>{{ t`字段名称` }}</span>
        <input
          v-model="form.label"
          class="pc-field"
          type="text"
          :readonly="protectedField"
          :placeholder="t`例如：身份`"
        />
      </label>

      <label class="pc-field-group">
        <span>{{ t`字段类型` }}</span>
        <SearchableCombobox
          v-model="form.type"
          :disabled="protectedField"
          input-label="字段类型"
          :options="typeOptions"
          placeholder="选择或搜索字段类型"
        />
      </label>

      <label class="pc-field-group">
        <span>{{ t`字段说明` }}</span>
        <textarea
          v-model="form.description"
          class="pc-area compact"
          :placeholder="t`说明字段应该填写什么，会发送给 AI`"
        ></textarea>
      </label>

      <label v-if="form.type === 'select'" class="pc-field-group">
        <span>{{ t`可选项` }}</span>
        <textarea
          v-model="form.optionsText"
          class="pc-area compact"
          :placeholder="t`每行一个选项，也可以用逗号分隔`"
        ></textarea>
      </label>

      <div class="pc-page-section pc-profile-field-toggle">
        <span class="pc-profile-field-toggle-label">
          <strong>{{ t`启用字段` }}</strong>
          <InfoHint :text="t`关闭后不参与编辑、AI 生成、展示和引用，但会保留已有值`" :label="t`启用字段说明`" />
        </span>
        <label class="pc-toggle" :title="form.enabled ? t`停用字段` : t`启用字段`">
          <input v-model="form.enabled" type="checkbox" :disabled="column?.id === 'title'" />
          <span></span>
        </label>
      </div>

      <div class="pc-form-actions">
        <button v-if="!newField && !protectedField" class="pc-soft-btn danger" type="button" @click="emit('remove')">
          <i class="fa-solid fa-trash"></i>{{ t`删除字段` }}
        </button>
        <button class="pc-soft-btn" type="button" @click="emit('cancel')">{{ t`取消` }}</button>
        <button class="pc-primary-btn" type="button" @click="save">{{ t`保存` }}</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import InfoHint from '@/components/InfoHint.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import type { ProfileColumnType, ProfileTableColumn } from './store';

const props = defineProps<{
  column: ProfileTableColumn | null;
  newField?: boolean;
  protectedField?: boolean;
}>();

const emit = defineEmits<{
  cancel: [];
  remove: [];
  save: [column: ProfileTableColumn];
}>();

const typeOptions = [
  { label: '短文本', value: 'text' },
  { label: '长文本', value: 'textarea' },
  { label: '单选', value: 'select' },
  { label: '标签', value: 'tags' },
  { label: '是或否', value: 'boolean' },
];

const form = reactive({
  description: '',
  enabled: true,
  label: '',
  optionsText: '',
  type: 'text' as ProfileColumnType,
});

watch(
  () => [props.column, props.newField] as const,
  () => {
    form.description = props.column?.description || '';
    form.enabled = props.column?.id === 'title' ? true : (props.column?.enabled ?? true);
    form.label = props.column?.label || '';
    form.optionsText = props.column?.options.join('\n') || '';
    form.type = props.column?.type || 'text';
  },
  { immediate: true },
);

function splitOptions(value: string) {
  return [
    ...new Set(
      value
        .split(/[\n,，、]+/)
        .map(item => item.trim())
        .filter(Boolean),
    ),
  ];
}

function save() {
  const label = form.label.trim();
  if (!label) {
    toastr.warning('请先填写字段名称');
    return;
  }
  emit('save', {
    description: form.description.trim(),
    enabled: props.column?.id === 'title' ? true : form.enabled,
    id: props.column?.id || '',
    label,
    options: form.type === 'select' ? splitOptions(form.optionsText) : [],
    required: props.column?.required ?? false,
    type: form.type,
  });
}
</script>

<style scoped>
.pc-profile-field-editor {
  display: grid;
  gap: 14px;
}

.pc-profile-field-toggle {
  display: flex;
  min-height: 56px;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding-inline: 0;
}

.pc-profile-field-toggle-label {
  display: inline-flex;
  min-width: 0;
  align-items: center;
}

.pc-profile-field-toggle .pc-toggle {
  flex: 0 0 auto;
}
</style>
