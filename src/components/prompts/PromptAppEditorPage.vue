<template>
  <section class="pc-prompts-page">
    <div class="pc-prompts-editor">
      <textarea
        ref="editorEl"
        v-model="draft"
        class="pc-area pc-area-long pc-app-prompt-editor-area"
        :placeholder="definition.placeholder"
      />
      <section
        v-if="definition.kind === 'task' && definition.variables.length"
        class="pc-section-card pc-task-template-help"
      >
        <span class="pc-field-label">{{ t`可用占位符` }}</span>
        <div class="pc-task-variable-list">
          <button
            v-for="variable in definition.variables"
            :key="variable.key"
            class="pc-soft-btn compact pc-task-variable-btn"
            type="button"
            :title="`插入${variable.label}`"
            :aria-label="`插入${variable.label}占位符 ${formatVariable(variable.key)}`"
            @click="insertVariable(variable.key)"
          >
            <span>{{ variable.label }}</span>
            <code>{{ formatVariable(variable.key) }}</code>
          </button>
        </div>
        <div class="pc-task-template-example">
          <span class="pc-field-label">{{ t`替换示意` }}</span>
          <p class="pc-prewrap">{{ placeholderPreview }}</p>
        </div>
        <div v-if="unknownVariables.length" class="pc-task-template-notice" role="status">
          <strong>{{ t`非本任务变量` }}</strong>
          <div>
            <code v-for="variable in unknownVariables" :key="variable">{{ formatVariable(variable) }}</code>
          </div>
          <p>{{ t`这些内容不会由任务模板系统替换；如果也不是酒馆宏或自定义宏，发送时会保留原文。` }}</p>
        </div>
      </section>
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
const placeholderPattern = /\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/g;

const variableLabelByKey = computed(() =>
  Object.fromEntries(props.definition.variables.map(variable => [variable.key, variable.label])),
);
const placeholderPreview = computed(() => {
  const preview = draft.value.replace(placeholderPattern, (placeholder, variableKey: string) => {
    const label = variableLabelByKey.value[variableKey];
    return label ? `【${label}】` : placeholder;
  });
  return preview.trim() || '当前模板为空。';
});
const unknownVariables = computed(() => {
  const knownKeys = new Set(props.definition.variables.map(variable => variable.key));
  const matches = draft.value.matchAll(placeholderPattern);
  return [...new Set([...matches].map(match => match[1]).filter(key => key && !knownKeys.has(key)))];
});

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

.pc-task-template-help {
  gap: 10px;
}

.pc-task-template-help > .pc-field-label,
.pc-task-template-example > .pc-field-label {
  margin-bottom: 0;
}

.pc-task-variable-list {
  display: grid;
  gap: 8px;
}

.pc-task-variable-btn {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  min-width: 0;
  height: auto;
  min-height: 36px;
  align-items: center;
  gap: 8px;
}

.pc-task-variable-btn span {
  min-width: 0;
  text-align: left;
  white-space: normal;
}

.pc-task-variable-btn code,
.pc-task-template-notice code {
  color: var(--pc-theme-accent);
  font-size: 11px;
}

.pc-task-template-example {
  display: grid;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px solid var(--pc-border);
}

.pc-task-template-example p,
.pc-task-template-notice p {
  margin: 0;
}

.pc-task-template-notice {
  display: grid;
  gap: 6px;
  color: var(--pc-danger);
  font-size: 12px;
  line-height: 1.5;
}

.pc-task-template-notice > div {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
