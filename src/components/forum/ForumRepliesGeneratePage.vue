<template>
  <GenerationFormPage
    v-model:from-start-end="draft.fromStartEnd"
    v-model:range-text="draft.rangeText"
    v-model:recent-count="draft.recentCount"
    v-model:references="references"
    v-model:single-message-id="draft.singleMessageId"
    v-model:source-mode="sourceMode"
    v-model:user-requirement="draft.userRequirement"
    :capture="capture"
    :capture-reset-key="captureResetKey"
    :error="generationState.error"
    kicker="AI 续回"
    :raw-output="generationState.rawOutput"
    requirement-placeholder="例如：让不同楼层意见更分裂。"
    :running="generationState.running"
    title="生成新的回复"
    @cancel="emit('cancel')"
    @generate="emit('generate')"
    @stop="emit('stop')"
  >
    <template #before-fields>
      <div class="pc-preview-card">
        <strong>{{ t`上下文` }}</strong>
        <p>{{ t`基于主楼和已有回复继续生成` }}</p>
      </div>
    </template>
  </GenerationFormPage>
</template>

<script setup lang="ts">
import GenerationFormPage from '@/components/GenerationFormPage.vue';
import type { SummaryGenerationSourceMode } from '@/util/generationSource';
import type { GenerationReferenceItem } from '@/util/references';
import type { CapturedTavernPromptPreview } from '@/util/runtime';

const draft = defineModel<{
  fromStartEnd: number;
  rangeText: string;
  recentCount: number;
  singleMessageId: number;
  userRequirement: string;
}>('draft', { required: true });
const references = defineModel<GenerationReferenceItem[]>('references', { required: true });
const sourceMode = defineModel<SummaryGenerationSourceMode>('sourceMode', { required: true });

defineProps<{
  capture: () => Promise<CapturedTavernPromptPreview>;
  captureResetKey: unknown;
  generationState: { error: string; rawOutput: string; running: boolean };
}>();

const emit = defineEmits<{
  cancel: [];
  generate: [];
  stop: [];
}>();
</script>

<style scoped>
.pc-preview-card {
  margin-top: 14px;
  padding: 14px;
  border: 1px solid var(--pc-border);
  border-radius: min(var(--pc-card-radius), 8px);
  background: color-mix(in srgb, var(--pc-surface) 72%, transparent 28%);
  backdrop-filter: blur(12px);
}

.pc-preview-card p {
  margin: 6px 0 0;
  color: var(--pc-muted);
}
</style>
