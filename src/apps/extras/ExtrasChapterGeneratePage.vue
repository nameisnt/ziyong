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

          <section class="pc-page-section pc-extras-summary-options">
            <div class="pc-section-head">
              <strong>{{ t`番外摘要` }}</strong>
              <label class="pc-toggle" :title="chapterDraft.parseSummary ? t`关闭摘要解析` : t`开启摘要解析`">
                <input v-model="chapterDraft.parseSummary" type="checkbox" />
                <span></span>
              </label>
            </div>
            <template v-if="chapterDraft.parseSummary">
              <label class="pc-field-group">
                <span class="pc-field-label">{{ t`摘要提取规则` }}</span>
                <SearchableCombobox
                  v-model="chapterDraft.summaryRuleId"
                  class="pc-extras-summary-rule-combobox"
                  :disabled="generationState.running"
                  :empty-label="t`没有匹配的摘要规则`"
                  :input-label="t`选择摘要提取规则`"
                  :options="summaryRuleSelectOptions"
                  :placeholder="t`选择摘要提取规则`"
                  :toggle-title="t`展开摘要提取规则`"
                />
              </label>
              <label class="pc-field-group">
                <span class="pc-field-label">{{ t`摘要格式提示` }}</span>
                <textarea
                  v-model="chapterDraft.summaryFormatHint"
                  class="pc-area compact"
                  :disabled="generationState.running"
                  :placeholder="t`告诉 AI 应按什么标签或固定格式输出摘要`"
                ></textarea>
              </label>
              <div class="pc-section-head pc-extras-summary-remove-row">
                <span>{{ t`从章节正文移除匹配到的摘要块` }}</span>
                <label class="pc-toggle" :title="t`仅在正文内能唯一定位完整摘要块时才会移除`">
                  <input
                    v-model="chapterDraft.removeSummaryBlock"
                    type="checkbox"
                    :disabled="generationState.running || !chapterDraft.summaryRuleId"
                  />
                  <span></span>
                </label>
              </div>
              <p class="pc-help-text">
                {{ t`结构化 summary 优先；正则仅作回退。未匹配时保留正文，仍可正常保存。` }}
              </p>
            </template>
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
  parseSummary: boolean;
  removeSummaryBlock: boolean;
  summaryFormatHint: string;
  summaryRuleId: string;
  typeId: string;
  typeName: string;
  typePrompt: string;
  userRequirement: string;
}>('chapterDraft', { required: true });
const references = defineModel<GenerationReferenceItem[]>('references', { required: true });
const sourceMode = defineModel<SummaryGenerationSourceMode>('sourceMode', { required: true });

const props = defineProps<{
  capture: () => Promise<CapturedTavernPromptPreview>;
  captureResetKey: unknown;
  generationState: { error: string; rawOutput: string; running: boolean };
  selectedTypeValue: string;
  showCustomTypeField: boolean;
  summaryRuleOptions: Array<{ label: string; value: string }>;
  typeOptions: Array<{ label: string; value: string }>;
}>();

const summaryRuleSelectOptions = computed(() => [
  { label: '仅识别结构化 summary 字段', value: '' },
  ...props.summaryRuleOptions,
]);

const emit = defineEmits<{
  cancel: [];
  generate: [];
  selectType: [value: string];
  stop: [];
  syncIntent: [];
}>();
</script>

<style scoped>
.pc-extras-summary-options {
  display: grid;
  gap: 10px;
}

.pc-extras-summary-remove-row {
  font-size: 13px;
}
</style>
