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
    requirement-placeholder="例如：语气更像压抑已久的回信，少解释，多留余味。"
    :running="running"
    :title="title"
    @cancel="$emit('cancel')"
    @generate="$emit('generate')"
    @stop="$emit('stop')"
  >
    <template #before-fields>
          <input v-model="senderName" class="pc-field" type="text" :disabled="running" placeholder="发信人" />
          <input v-model="receiverName" class="pc-field" type="text" :disabled="running" placeholder="收信人" />
          <input
            v-if="showBookField"
            v-model="bookTitle"
            class="pc-field"
            type="text"
            :disabled="running"
            placeholder="分册名称（可留空）"
          />

          <div class="pc-segment pc-letters-format-segment">
            <button
              v-for="option in formatOptions"
              :key="option.value"
              :class="['pc-segment-btn', { active: format === option.value }]"
              type="button"
              :disabled="running"
              @click="format = option.value"
            >
              {{ option.label }}
            </button>
          </div>

          <div class="pc-field-group">
            <label class="pc-field-label">附带最近 N 封相关书信</label>
            <input v-model.number="recentEntryCount" class="pc-field" type="number" min="0" max="20" :disabled="running" />
          </div>
    </template>
  </GenerationFormPage>
</template>

<script setup lang="ts">
import GenerationFormPage from '@/components/GenerationFormPage.vue';
import type { LetterFormat } from '@/type/letter';
import type { SummaryGenerationSourceMode } from '@/util/generationSource';
import type { GenerationReferenceItem } from '@/util/references';
import type { CapturedTavernPromptPreview } from '@/util/runtime';

defineProps<{
  capture: () => Promise<CapturedTavernPromptPreview>;
  captureResetKey: unknown;
  error: string;
  formatOptions: Array<{ label: string; value: LetterFormat }>;
  rawOutput: string;
  running: boolean;
  showBookField: boolean;
  title: string;
}>();

defineEmits<{ cancel: []; generate: []; stop: [] }>();

const bookTitle = defineModel<string>('bookTitle', { required: true });
const format = defineModel<LetterFormat>('format', { required: true });
const fromStartEnd = defineModel<number>('fromStartEnd', { required: true });
const rangeText = defineModel<string>('rangeText', { required: true });
const receiverName = defineModel<string>('receiverName', { required: true });
const recentCount = defineModel<number>('recentCount', { required: true });
const recentEntryCount = defineModel<number>('recentEntryCount', { required: true });
const references = defineModel<GenerationReferenceItem[]>('references', { required: true });
const senderName = defineModel<string>('senderName', { required: true });
const singleMessageId = defineModel<number>('singleMessageId', { required: true });
const sourceMode = defineModel<SummaryGenerationSourceMode>('sourceMode', { required: true });
const userRequirement = defineModel<string>('userRequirement', { required: true });
</script>

<style scoped>
.pc-letters-format-segment {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 14px;
}
</style>
