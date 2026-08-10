<template>
  <section class="pc-generation-form-page">
    <article class="pc-editor-card">
      <span class="pc-kicker">{{ kicker }}</span>
      <h2 v-if="title">{{ title }}</h2>
      <GenerationPanel
        :capture="capture"
        :capture-reset-key="captureResetKey"
        :error="error"
        :from-start-end="fromStartEnd"
        :range-text="rangeText"
        :raw-output="rawOutput"
        :recent-count="recentCount"
        :references="references"
        :requirement-placeholder="requirementPlaceholder"
        :running="running"
        :single-message-id="singleMessageId"
        :source-mode="sourceMode"
        :user-requirement="userRequirement"
        @cancel="$emit('cancel')"
        @generate="$emit('generate')"
        @stop="$emit('stop')"
        @update:from-start-end="fromStartEnd = $event"
        @update:range-text="rangeText = $event"
        @update:recent-count="recentCount = $event"
        @update:references="references = $event"
        @update:single-message-id="singleMessageId = $event"
        @update:source-mode="sourceMode = $event"
        @update:user-requirement="userRequirement = $event"
      >
        <template v-if="$slots['before-fields']" #before-fields>
          <slot name="before-fields"></slot>
        </template>
      </GenerationPanel>
    </article>
  </section>
</template>

<script setup lang="ts">
import GenerationPanel from '@/components/GenerationPanel.vue';
import type { SummaryGenerationSourceMode } from '@/util/generationSource';
import type { GenerationReferenceItem } from '@/util/references';
import type { CapturedTavernPromptPreview } from '@/util/runtime';

withDefaults(
  defineProps<{
    capture: () => Promise<CapturedTavernPromptPreview>;
    captureResetKey: unknown;
    error: string;
    kicker?: string;
    rawOutput: string;
    requirementPlaceholder?: string;
    running: boolean;
    title?: string;
  }>(),
  {
    kicker: 'AI 生成',
    requirementPlaceholder: '',
    title: '',
  },
);

defineEmits<{ cancel: []; generate: []; stop: [] }>();

const fromStartEnd = defineModel<number>('fromStartEnd', { required: true });
const rangeText = defineModel<string>('rangeText', { required: true });
const recentCount = defineModel<number>('recentCount', { required: true });
const references = defineModel<GenerationReferenceItem[]>('references', { required: true });
const singleMessageId = defineModel<number>('singleMessageId', { required: true });
const sourceMode = defineModel<SummaryGenerationSourceMode>('sourceMode', { required: true });
const userRequirement = defineModel<string>('userRequirement', { required: true });
</script>

<style scoped>
.pc-generation-form-page {
  min-height: 100%;
}

.pc-editor-card h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
}
</style>
