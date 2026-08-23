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
    :default-preset-selection="defaultPresetSelection"
    :error="error"
    :raw-output="rawOutput"
    :requirement-placeholder="requirementPlaceholder"
    :running="running"
    :title="title"
    @cancel="$emit('cancel')"
    @generate="$emit('generate')"
    @stop="$emit('stop')"
  >
    <template v-if="extraFieldVisible" #before-fields>
      <input
        v-model="extraField"
        class="pc-field"
        type="text"
        :disabled="running"
        :placeholder="extraFieldPlaceholder"
      />
    </template>
  </GenerationFormPage>
</template>

<script setup lang="ts">
import GenerationFormPage from '@/components/GenerationFormPage.vue';
import type { SummaryGenerationSourceMode } from '@/util/generationSource';
import type { GenerationReferenceItem } from '@/util/references';
import type { CapturedTavernPromptPreview } from '@/util/runtime';

defineProps<{
  capture: () => Promise<CapturedTavernPromptPreview>;
  captureResetKey: unknown;
  defaultPresetSelection?: string;
  error: string;
  extraFieldPlaceholder: string;
  extraFieldVisible: boolean;
  rawOutput: string;
  requirementPlaceholder: string;
  running: boolean;
  title: string;
}>();

defineEmits<{ cancel: []; generate: []; stop: [] }>();

const extraField = defineModel<string>('extraField', { required: true });
const fromStartEnd = defineModel<number>('fromStartEnd', { required: true });
const rangeText = defineModel<string>('rangeText', { required: true });
const recentCount = defineModel<number>('recentCount', { required: true });
const references = defineModel<GenerationReferenceItem[]>('references', { required: true });
const singleMessageId = defineModel<number>('singleMessageId', { required: true });
const sourceMode = defineModel<SummaryGenerationSourceMode>('sourceMode', { required: true });
const userRequirement = defineModel<string>('userRequirement', { required: true });
</script>
