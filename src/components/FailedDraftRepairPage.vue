<template>
  <section class="pc-failed-draft-page">
    <article class="pc-page-section pc-failed-draft-editor">
      <div class="pc-compact-toolbar">{{ sourceLabel }}</div>
      <slot name="before-editor"></slot>
      <ReasoningDisclosure :content="reasoning" editable @update:content="$emit('update:reasoning', $event)" />
      <div v-if="warnings.length" class="pc-status-card warning">
        <strong>解析提示</strong>
        <p>{{ warnings.join('；') }}</p>
      </div>
      <div class="pc-field-group">
        <label v-if="rawLabel" class="pc-field-label">{{ rawLabel }}</label>
        <RawOutputEditor
          v-model="rawOutput"
          :placeholder="placeholder"
          :raw-output-semantics="rawOutputSemantics"
          @reparse="$emit('reparse')"
        />
      </div>
      <div class="pc-form-actions">
        <button class="pc-soft-btn danger" type="button" @click="$emit('delete')">{{ deleteLabel }}</button>
        <button
          class="pc-soft-btn"
          type="button"
          :disabled="regenerateDisabled || regenerateRunning"
          @click="runRegenerate"
        >
          <i class="fa-solid fa-rotate"></i>
          <span>{{ regenerateRunning ? '生成中' : regenerateLabel }}</span>
        </button>
        <button class="pc-primary-btn" type="button" :disabled="reparseDisabled" @click="$emit('reparse')">
          {{ reparseLabel }}
        </button>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import RawOutputEditor from '@/components/RawOutputEditor.vue';
import ReasoningDisclosure from '@/components/ReasoningDisclosure.vue';
import type { RawOutputSemantics } from '@/type/generation';

const props = withDefaults(
  defineProps<{
    deleteLabel?: string;
    placeholder?: string;
    rawOutputSemantics?: RawOutputSemantics;
    rawLabel?: string;
    regenerateDisabled?: boolean;
    regenerateHandler?: () => Promise<void> | void;
    regenerateLabel?: string;
    reparseDisabled?: boolean;
    reparseLabel?: string;
    sourceLabel: string;
    title: string;
    reasoning?: string;
    warnings?: string[];
  }>(),
  {
    deleteLabel: '删除草稿',
    placeholder: '在这里修 XML 结构或补 title / content。',
    rawOutputSemantics: 'original-v1',
    rawLabel: '',
    regenerateDisabled: false,
    regenerateHandler: undefined,
    regenerateLabel: '重新生成',
    reparseDisabled: false,
    reparseLabel: '重新解析',
    reasoning: '',
    warnings: () => [],
  },
);

const emit = defineEmits<{
  delete: [];
  regenerate: [];
  reparse: [];
  'update:reasoning': [reasoning: string];
}>();
const rawOutput = defineModel<string>('rawOutput', { required: true });
const regenerateRunning = ref(false);

async function runRegenerate() {
  if (!props.regenerateHandler) {
    emit('regenerate');
    return;
  }
  regenerateRunning.value = true;
  try {
    await props.regenerateHandler();
  } finally {
    regenerateRunning.value = false;
  }
}
</script>

<style scoped>
.pc-failed-draft-page {
  min-height: 100%;
}

.pc-failed-draft-editor {
  display: grid;
  gap: 14px;
}
</style>
