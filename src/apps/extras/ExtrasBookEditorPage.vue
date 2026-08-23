<template>
  <section class="pc-extras-page">
    <div class="pc-page-section pc-extras-editor-section">
      <label class="pc-field-group">
        <span>{{ t`番外标题` }}</span>
        <input v-model="bookTitle" class="pc-field" type="text" :placeholder="t`输入番外标题`" />
      </label>

      <GenerationPanel
        v-if="!editing"
        :capture="capture"
        :capture-reset-key="captureResetKey"
        :error="generationState.error"
        :from-start-end="chapterDraft.fromStartEnd"
        :range-text="chapterDraft.rangeText"
        :raw-output="generationState.rawOutput"
        :recent-count="chapterDraft.recentCount"
        :references="references"
        requirement-placeholder="例如：加强情绪推进，少写说明，多写现场。"
        :running="generationState.running"
        :single-message-id="chapterDraft.singleMessageId"
        :source-mode="sourceMode"
        :user-requirement="chapterDraft.userRequirement"
        @update:from-start-end="chapterDraft.fromStartEnd = $event"
        @update:range-text="chapterDraft.rangeText = $event"
        @update:recent-count="chapterDraft.recentCount = $event"
        @update:references="references = $event"
        @update:single-message-id="chapterDraft.singleMessageId = $event"
        @update:source-mode="sourceMode = $event"
        @update:user-requirement="chapterDraft.userRequirement = $event"
      >
        <template #before-fields>
          <div class="pc-number-field">
            <label class="pc-field-label">
              {{ t`生成模式` }}
            </label>
            <select
              v-model="chapterDraft.mode"
              class="pc-select pc-select-compact pc-extras-mode-select"
              :disabled="generationState.running"
            >
              <option value="新开一本书">{{ t`新开一本书` }}</option>
              <option value="续写上一章">{{ t`续写上一章` }}</option>
            </select>
          </div>

          <section class="pc-type-prompt-card">
            <div class="pc-section-head">
              <strong>{{ t`本次类型提示词` }}</strong>
            </div>
            <SearchableCombobox
              :disabled="generationState.running"
              :empty-label="t`没有匹配的类型`"
              :input-label="t`选择番外类型`"
              :model-value="selectedTypeValue"
              :options="typeOptions"
              :placeholder="t`选择番外类型`"
              :toggle-title="t`展开番外类型`"
              @update:model-value="emit('selectType', $event)"
            />
            <input
              v-if="showCustomTypeField"
              v-model="chapterDraft.typeName"
              class="pc-field"
              type="text"
              :placeholder="t`自定义类型名称`"
            />
            <textarea
              v-model="chapterDraft.typePrompt"
              class="pc-area compact"
              :disabled="generationState.running"
              :placeholder="t`本次生成使用的番外类型提示词`"
            ></textarea>
          </section>
        </template>

        <template #actions>
          <div class="pc-form-actions pc-extras-generate-actions">
            <button v-if="generationState.running" class="pc-soft-btn danger" type="button" @click="emit('stop')">
              {{ t`停止` }}
            </button>
            <button v-else class="pc-soft-btn" type="button" @click="emit('cancel')">{{ t`取消` }}</button>
            <button class="pc-primary-btn" type="button" :disabled="generationState.running" @click="emit('generate')">
              <i class="fa-solid fa-sparkles"></i>
              <span>{{ generationState.running ? t`生成中` : t`开始生成` }}</span>
            </button>
          </div>
        </template>
      </GenerationPanel>

      <div v-else class="pc-form-actions">
        <button class="pc-soft-btn" type="button" :disabled="generationState.running" @click="emit('cancel')">
          {{ t`取消` }}
        </button>
        <button class="pc-primary-btn" type="button" @click="emit('save')">{{ t`保存` }}</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import GenerationPanel from '@/components/GenerationPanel.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import type { ExtraChapterGenerationIntent, ExtraChapterGenerationMode } from '@/core/extrasGeneration';
import type { GenerationReferenceItem } from '@/util/references';
import type { SummaryGenerationSourceMode } from '@/util/generationSource';
import type { CapturedTavernPromptPreview } from '@/util/runtime';

const bookTitle = defineModel<string>('bookTitle', { required: true });
const chapterDraft = defineModel<{
  fromStartEnd: number;
  generationIntent: ExtraChapterGenerationIntent;
  mode: ExtraChapterGenerationMode;
  rangeText: string;
  recentCount: number;
  singleMessageId: number;
  typeId: string;
  typeName: string;
  typePrompt: string;
  userRequirement: string;
}>('chapterDraft', { required: true });
const references = defineModel<GenerationReferenceItem[]>('references', { required: true });
const sourceMode = defineModel<SummaryGenerationSourceMode>('sourceMode', { required: true });

defineProps<{
  capture: () => Promise<CapturedTavernPromptPreview>;
  captureResetKey: unknown;
  editing: boolean;
  generationState: { error: string; rawOutput: string; running: boolean };
  selectedTypeValue: string;
  showCustomTypeField: boolean;
  typeOptions: Array<{ label: string; value: string }>;
}>();

const emit = defineEmits<{
  cancel: [];
  generate: [];
  save: [];
  selectType: [value: string];
  stop: [];
}>();
</script>

<style scoped>
/* App-only layout: preserve the Extras generation form's established vertical rhythm. */
.pc-extras-mode-select {
  margin-top: 14px;
}
</style>
