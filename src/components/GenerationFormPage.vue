<template>
  <section class="pc-generation-form-page">
    <GenerationPanel
      :capture="capture"
      :capture-reset-key="captureResetKey"
      :default-preset-selection="defaultPresetSelection"
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
    defaultPresetSelection?: string;
    error: string;
    kicker?: string;
    rawOutput: string;
    requirementPlaceholder?: string;
    running: boolean;
    title?: string;
  }>(),
  {
    kicker: '',
    defaultPresetSelection: '',
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
  display: grid;
  gap: 14px;
  min-height: 100%;
}
</style>
