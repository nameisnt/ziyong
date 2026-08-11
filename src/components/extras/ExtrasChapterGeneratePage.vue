<template>
  <section class="pc-extras-page">
    <div class="pc-page-section pc-extras-editor-section">
      <GenerationPanel
        class="pc-extras-generation-panel"
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
        @cancel="emit('cancel')"
        @generate="emit('generate')"
        @stop="emit('stop')"
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
              {{ chapterDraft.mode === '重写当前章节' ? t`原生成方式` : t`生成方式` }}
            </label>
            <select
              v-model="chapterDraft.generationIntent"
              class="pc-select"
              :disabled="generationState.running"
              @change="emit('syncIntent')"
            >
              <option value="续写上一章">{{ t`续写上一章` }}</option>
              <option value="新开一本书">{{ t`新开一本书` }}</option>
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
      </GenerationPanel>
    </div>
  </section>
</template>

<script setup lang="ts">
import GenerationPanel from '@/components/GenerationPanel.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import type { ExtraChapterGenerationIntent, ExtraChapterGenerationMode } from '@/core/extrasGeneration';
import type { SummaryGenerationSourceMode } from '@/util/generationSource';
import type { GenerationReferenceItem } from '@/util/references';
import type { CapturedTavernPromptPreview } from '@/util/runtime';

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
  generationState: { error: string; rawOutput: string; running: boolean };
  selectedTypeValue: string;
  showCustomTypeField: boolean;
  typeOptions: Array<{ label: string; value: string }>;
}>();

const emit = defineEmits<{
  cancel: [];
  generate: [];
  selectType: [value: string];
  stop: [];
  syncIntent: [];
}>();
</script>
