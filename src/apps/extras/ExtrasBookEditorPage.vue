<template>
  <section class="pc-extras-page">
    <div class="pc-page-section pc-extras-editor-section">
      <label class="pc-field-group">
        <span>{{ t`番外标题` }}</span>
        <input
          v-model="bookTitle"
          class="pc-field"
          type="text"
          :disabled="generationState.running"
          :placeholder="t`输入番外标题`"
        />
      </label>

      <GenerationPanel
        v-if="!editing"
        :capture="capture"
        :capture-reset-key="captureResetKey"
        :error="generationState.error"
        :from-start-end="chapterDraft.fromStartEnd"
        :generate-disabled="Boolean(typeBlockingMessage)"
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
            <SearchableCombobox
              :disabled="generationState.running"
              :empty-label="t`没有可用的生成模式`"
              :input-label="t`选择生成模式`"
              :model-value="chapterDraft.mode"
              :options="modeOptions"
              :placeholder="t`选择生成模式`"
              :searchable="false"
              :toggle-title="t`展开生成模式列表`"
              @update:model-value="onModeChange"
            />
          </div>

          <section class="pc-type-prompt-card">
            <div class="pc-section-head">
              <strong>{{ t`番外类型` }}</strong>
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
              :disabled="generationState.running"
              class="pc-field"
              type="text"
              :placeholder="t`自定义类型名称`"
            />
            <TheaterTypeGroupField
              v-if="showCustomTypeField || selectedTypeValue"
              v-model="chapterDraft.typeGroupId"
              :disabled="generationState.running"
              domain="extras"
              subject-label="番外类型"
            />
            <div class="pc-field-group">
              <div class="pc-field-head">
                <span class="pc-field-label">{{ showCustomTypeField ? t`类型提示词` : t`本次类型提示词` }}</span>
                <button
                  v-if="selectedTypeValue && !showCustomTypeField"
                  class="pc-soft-btn compact"
                  type="button"
                  :disabled="generationState.running || !typePromptChanged"
                  @click="emit('saveExistingType')"
                >
                  {{ t`保存到类型库` }}
                </button>
              </div>
              <textarea
                v-model="chapterDraft.typePrompt"
                class="pc-area compact"
                :disabled="generationState.running"
                :placeholder="t`本次生成使用的番外类型提示词`"
              ></textarea>
            </div>
            <div v-if="showCustomTypeField" class="pc-section-head">
              <span>{{ t`保存到类型库` }}</span>
              <label class="pc-toggle" title="保存到类型库">
                <input v-model="saveCustomTypeToLibrary" type="checkbox" :disabled="generationState.running" />
                <span></span>
              </label>
            </div>
            <p v-if="typeBlockingMessage" class="pc-help-text warning">{{ typeBlockingMessage }}</p>
          </section>

          <ExtrasSummaryOptions
            v-model:parse-summary="chapterDraft.parseSummary"
            v-model:remove-summary-block="chapterDraft.removeSummaryBlock"
            v-model:summary-format-hint="chapterDraft.summaryFormatHint"
            v-model:summary-rule-id="chapterDraft.summaryRuleId"
            :disabled="generationState.running"
            :summary-rule-options="summaryRuleOptions"
          />
        </template>

        <template #actions>
          <div class="pc-form-actions pc-extras-generate-actions">
            <button v-if="generationState.running" class="pc-soft-btn danger" type="button" @click="emit('stop')">
              {{ t`停止` }}
            </button>
            <button v-else class="pc-soft-btn" type="button" @click="emit('cancel')">{{ t`取消` }}</button>
            <button
              class="pc-primary-btn"
              type="button"
              :disabled="generationState.running || Boolean(typeBlockingMessage)"
              @click="emit('generate')"
            >
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
import ExtrasSummaryOptions from '@/components/ExtrasSummaryOptions.vue';
import GenerationPanel from '@/components/GenerationPanel.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import TheaterTypeGroupField from '@/components/prompts/TheaterTypeGroupField.vue';
import type { ExtraChapterGenerationIntent, ExtraChapterGenerationMode } from '@/core/extrasGeneration';
import type { GenerationReferenceItem } from '@/util/references';
import type { SummaryGenerationSourceMode } from '@/util/generationSource';
import type { CapturedTavernPromptPreview } from '@/util/runtime';

const bookTitle = defineModel<string>('bookTitle', { required: true });
const chapterDraft = defineModel<{
  fromStartEnd: number;
  generationIntent: ExtraChapterGenerationIntent;
  mode: ExtraChapterGenerationMode;
  parseSummary: boolean;
  rangeText: string;
  recentCount: number;
  removeSummaryBlock: boolean;
  singleMessageId: number;
  summaryFormatHint: string;
  summaryRuleId: string;
  typeGroupId: string;
  typeId: string;
  typeName: string;
  typePrompt: string;
  userRequirement: string;
}>('chapterDraft', { required: true });
const saveCustomTypeToLibrary = defineModel<boolean>('saveCustomTypeToLibrary', { required: true });
const references = defineModel<GenerationReferenceItem[]>('references', { required: true });
const sourceMode = defineModel<SummaryGenerationSourceMode>('sourceMode', { required: true });

const modeOptions = [
  { label: '新开一本书', value: '新开一本书' },
  { label: '续写上一章', value: '续写上一章' },
];

function onModeChange(value: string) {
  chapterDraft.value.mode = value as ExtraChapterGenerationMode;
}

defineProps<{
  capture: () => Promise<CapturedTavernPromptPreview>;
  captureResetKey: unknown;
  editing: boolean;
  generationState: { error: string; rawOutput: string; running: boolean };
  selectedTypeValue: string;
  showCustomTypeField: boolean;
  summaryRuleOptions: Array<{ label: string; value: string }>;
  typeBlockingMessage: string;
  typePromptChanged: boolean;
  typeOptions: Array<{ label: string; value: string }>;
}>();

const emit = defineEmits<{
  cancel: [];
  generate: [];
  save: [];
  saveExistingType: [];
  selectType: [value: string];
  stop: [];
}>();
</script>
