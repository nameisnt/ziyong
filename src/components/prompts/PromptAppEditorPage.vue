<template>
  <section class="pc-prompts-page">
    <div class="pc-prompts-editor">
      <textarea
        ref="editorEl"
        v-model="draft"
        class="pc-area pc-area-long pc-app-prompt-editor-area"
        :placeholder="definition.placeholder"
      />
      <div v-if="definition.kind === 'task' && definition.variables.length" class="pc-field-group">
        <span class="pc-field-label">{{ t`可用占位符` }}</span>
        <div class="pc-chip-row">
          <button
            v-for="variable in definition.variables"
            :key="variable.key"
            class="pc-soft-btn compact"
            type="button"
            :title="variable.label"
            @click="insertVariable(variable.key)"
          >
            {{ formatVariable(variable.key) }}
          </button>
        </div>
      </div>
      <div class="pc-form-actions">
        <button class="pc-soft-btn" type="button" @click="$emit('back')">{{ t`取消` }}</button>
        <button class="pc-primary-btn" type="button" @click="save">{{ t`保存` }}</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { PhoneTaskTemplateVariable } from '@/core/appRegistry';
import { usePromptStore } from '@/store/prompts';

type EditablePromptDefinition = {
  key: string;
  kind: 'app' | 'special' | 'task';
  label: string;
  placeholder: string;
  value: string;
  variables: PhoneTaskTemplateVariable[];
};

const props = defineProps<{ definition: EditablePromptDefinition }>();
const emit = defineEmits<{ back: [] }>();
const prompts = usePromptStore();
const editorEl = ref<HTMLTextAreaElement | null>(null);
const draft = ref('');

function formatVariable(key: string) {
  return `{{${key}}}`;
}

function insertVariable(key: string) {
  const placeholder = formatVariable(key);
  const textarea = editorEl.value;
  if (!textarea) {
    draft.value += placeholder;
    return;
  }
  const start = textarea.selectionStart ?? draft.value.length;
  const end = textarea.selectionEnd ?? start;
  draft.value = `${draft.value.slice(0, start)}${placeholder}${draft.value.slice(end)}`;
  nextTick(() => {
    textarea.focus();
    textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
  });
}

function save() {
  if (props.definition.kind === 'app') prompts.updateAppPrompt(props.definition.key, draft.value);
  else if (props.definition.kind === 'task') prompts.updateTaskTemplate(props.definition.key, draft.value);
  else prompts.updateSpecialPrompt(props.definition.key, draft.value);
  toastr.success(props.definition.kind === 'task' ? '已保存任务模板' : '已保存 App 提示词');
  emit('back');
}

watch(
  () => props.definition,
  definition => {
    draft.value = definition.value;
  },
  { immediate: true },
);
</script>

<style scoped>
.pc-prompts-page {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 14px;
}

.pc-prompts-editor {
  display: grid;
  gap: 14px;
}

</style>
