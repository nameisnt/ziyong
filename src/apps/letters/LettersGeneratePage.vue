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

      <label class="pc-field-group">
        <span class="pc-field-label">书信类型</span>
        <SearchableCombobox
          v-model="format"
          allow-custom
          :disabled="running"
          input-label="选择或输入书信类型"
          :options="formatOptions"
          placeholder="选择类型或输入自定义名称"
        />
      </label>
      <label v-if="isCustomFormat" class="pc-field-group">
        <span class="pc-field-label">自定义类型提示词</span>
        <textarea
          v-model="formatPrompt"
          class="pc-area"
          rows="3"
          :disabled="running"
          placeholder="说明这种书信的结构、口吻和格式"
        ></textarea>
      </label>

      <label v-if="showRecentEntries" class="pc-reader-setting-row">
        <strong>参考本书信集旧信</strong>
        <span class="pc-toggle"
          ><input v-model="includeRecentEntries" type="checkbox" :disabled="running" /><span></span
        ></span>
      </label>
      <div v-if="showRecentEntries && includeRecentEntries" class="pc-field-group">
        <label class="pc-field-label">额外参考旧信数量</label>
        <input v-model.number="recentEntryCount" class="pc-field" type="number" min="0" max="20" :disabled="running" />
      </div>
    </template>
  </GenerationFormPage>
</template>

<script setup lang="ts">
import GenerationFormPage from '@/components/GenerationFormPage.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
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
  showRecentEntries: boolean;
  showBookField: boolean;
  title: string;
}>();

defineEmits<{ cancel: []; generate: []; stop: [] }>();

const bookTitle = defineModel<string>('bookTitle', { required: true });
const format = defineModel<LetterFormat>('format', { required: true });
const formatPrompt = defineModel<string>('formatPrompt', { required: true });
const fromStartEnd = defineModel<number>('fromStartEnd', { required: true });
const rangeText = defineModel<string>('rangeText', { required: true });
const receiverName = defineModel<string>('receiverName', { required: true });
const recentCount = defineModel<number>('recentCount', { required: true });
const recentEntryCount = defineModel<number>('recentEntryCount', { required: true });
const includeRecentEntries = defineModel<boolean>('includeRecentEntries', { required: true });
const references = defineModel<GenerationReferenceItem[]>('references', { required: true });
const senderName = defineModel<string>('senderName', { required: true });
const singleMessageId = defineModel<number>('singleMessageId', { required: true });
const sourceMode = defineModel<SummaryGenerationSourceMode>('sourceMode', { required: true });
const userRequirement = defineModel<string>('userRequirement', { required: true });
const isCustomFormat = computed(() => !['email', 'formal', 'note', 'sms'].includes(format.value));
</script>

<style scoped>
.pc-reader-setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
</style>
