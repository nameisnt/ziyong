<template>
  <details v-if="content.trim() || editing" class="pc-reasoning-disclosure">
    <summary :title="t`展开或折叠思维链`">
      <span aria-hidden="true">◇ ◇ ◇ ◇ ◇ ◇</span>
      <span class="pc-reasoning-label">{{ t`思维链` }}</span>
    </summary>
    <div v-if="editable" class="pc-reasoning-actions">
      <button v-if="!editing" class="pc-soft-btn compact" type="button" @click="beginEdit">
        {{ t`编辑` }}
      </button>
      <template v-else>
        <button class="pc-soft-btn compact" type="button" :disabled="!draft" @click="draft = ''">
          {{ t`清空` }}
        </button>
        <button class="pc-soft-btn compact" type="button" @click="cancelEdit">{{ t`取消` }}</button>
        <button class="pc-primary-btn compact" type="button" @click="applyEdit">{{ t`应用` }}</button>
      </template>
    </div>
    <textarea
      v-if="editing"
      ref="editorRef"
      v-model="draft"
      class="pc-area pc-area-multiline pc-reasoning-editor"
      :placeholder="t`可以修改或清空本次生成的思维链。`"
    ></textarea>
    <template v-else>
      <!-- renderMarkdown 会转义原始 HTML/XML，只保留安全的基础 Markdown 显示。 -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="pc-reasoning-body" v-html="renderedContent"></div>
    </template>
  </details>
</template>

<script setup lang="ts">
import { renderMarkdown } from '@/util/markdown';

const props = withDefaults(
  defineProps<{
    content: string;
    editable?: boolean;
  }>(),
  { editable: false },
);

const emit = defineEmits<{
  'update:content': [value: string];
}>();

const draft = ref(props.content);
const editing = ref(false);
const editorRef = ref<HTMLTextAreaElement | null>(null);

const renderedContent = computed(() => renderMarkdown(props.content));

watch(
  () => props.content,
  value => {
    if (!editing.value) draft.value = value;
  },
);

async function beginEdit() {
  draft.value = props.content;
  editing.value = true;
  await nextTick();
  editorRef.value?.focus();
}

function cancelEdit() {
  draft.value = props.content;
  editing.value = false;
}

function applyEdit() {
  emit('update:content', draft.value);
  editing.value = false;
}
</script>

<style scoped>
.pc-reasoning-disclosure {
  margin: 0 0 16px;
  color: var(--pc-reader-text, var(--pc-text));
}

.pc-reasoning-disclosure > summary {
  display: flex;
  width: max-content;
  max-width: 100%;
  align-items: center;
  gap: 8px;
  padding: 3px 2px;
  color: color-mix(in srgb, var(--pc-reader-text, var(--pc-text)) 62%, transparent 38%);
  cursor: pointer;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 1px;
  list-style: none;
  user-select: none;
}

.pc-reasoning-disclosure > summary::-webkit-details-marker {
  display: none;
}

.pc-reasoning-label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.pc-reasoning-body {
  margin: 8px 0 20px;
  color: color-mix(in srgb, var(--pc-reader-text, var(--pc-text)) 84%, transparent 16%);
  font-size: 0.94em;
  line-height: 1.68;
  overflow-wrap: anywhere;
}

.pc-reasoning-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin: 6px 0 8px;
}

.pc-reasoning-editor {
  width: 100%;
  margin-bottom: 12px;
}

.pc-reasoning-body :deep(:first-child) {
  margin-top: 0;
}

.pc-reasoning-body :deep(:last-child) {
  margin-bottom: 0;
}

.pc-reasoning-body :deep(p) {
  margin: 0 0 0.85em;
}

.pc-reasoning-body :deep(pre) {
  max-width: 100%;
  overflow: auto;
  white-space: pre-wrap;
}
</style>
