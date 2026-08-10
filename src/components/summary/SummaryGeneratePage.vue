<template>
  <GenerationFormPage
    v-model:from-start-end="fromStartEnd"
    v-model:range-text="rangeText"
    v-model:recent-count="recentCount"
    v-model:references="references"
    v-model:single-message-id="singleMessageId"
    v-model:source-mode="sourceMode"
    v-model:user-requirement="userRequirement"
    :capture="capture"
    :capture-reset-key="captureResetKey"
    :error="error"
    :raw-output="rawOutput"
    :running="running"
    title="生成一条新的总结"
    @cancel="$emit('cancel')"
    @generate="$emit('generate')"
    @stop="$emit('stop')"
  />
</template>

<script setup lang="ts">
import GenerationFormPage from '@/components/GenerationFormPage.vue';
import type { SummaryGenerationSourceMode } from '@/util/generationSource';
import type { GenerationReferenceItem } from '@/util/references';
import type { CapturedTavernPromptPreview } from '@/util/runtime';

defineProps<{
  capture: () => Promise<CapturedTavernPromptPreview>;
  captureResetKey: unknown;
  error: string;
  rawOutput: string;
  running: boolean;
}>();

defineEmits<{
  cancel: [];
  generate: [];
  stop: [];
}>();

const fromStartEnd = defineModel<number>('fromStartEnd', { required: true });
const rangeText = defineModel<string>('rangeText', { required: true });
const recentCount = defineModel<number>('recentCount', { required: true });
const references = defineModel<GenerationReferenceItem[]>('references', { required: true });
const singleMessageId = defineModel<number>('singleMessageId', { required: true });
const sourceMode = defineModel<SummaryGenerationSourceMode>('sourceMode', { required: true });
const userRequirement = defineModel<string>('userRequirement', { required: true });
</script>
