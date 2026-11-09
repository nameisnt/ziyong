<template>
  <section class="pc-page-section pc-extras-summary-options">
    <div class="pc-section-head">
      <strong>{{ t`番外摘要` }}</strong>
      <label class="pc-toggle" :title="parseSummary ? t`关闭摘要解析` : t`开启摘要解析`">
        <input v-model="parseSummary" type="checkbox" :disabled="disabled" />
        <span></span>
      </label>
    </div>
    <template v-if="parseSummary">
      <label class="pc-field-group">
        <span class="pc-field-label">{{ t`摘要提取规则` }}</span>
        <SearchableCombobox
          v-model="summaryRuleId"
          class="pc-extras-summary-rule-combobox"
          :disabled="disabled"
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
          v-model="summaryFormatHint"
          class="pc-area compact"
          :disabled="disabled"
          :placeholder="t`告诉 AI 应按什么标签或固定格式输出摘要`"
        ></textarea>
      </label>
      <div class="pc-section-head pc-extras-summary-remove-row">
        <span>{{ t`从章节正文移除匹配到的摘要块` }}</span>
        <label class="pc-toggle" :title="t`仅在正文内能唯一定位完整摘要块时才会移除`">
          <input v-model="removeSummaryBlock" type="checkbox" :disabled="disabled" />
          <span></span>
        </label>
      </div>
      <p class="pc-help-text">
        {{ t`结构化 summary 优先；正则仅作回退。未匹配时保留正文，仍可正常保存。` }}
      </p>
    </template>
  </section>
</template>

<script setup lang="ts">
import SearchableCombobox from '@/components/SearchableCombobox.vue';

const parseSummary = defineModel<boolean>('parseSummary', { required: true });
const removeSummaryBlock = defineModel<boolean>('removeSummaryBlock', { required: true });
const summaryFormatHint = defineModel<string>('summaryFormatHint', { required: true });
const summaryRuleId = defineModel<string>('summaryRuleId', { required: true });

const props = defineProps<{
  disabled: boolean;
  summaryRuleOptions: Array<{ label: string; value: string }>;
}>();

const summaryRuleSelectOptions = computed(() => [
  { label: '仅识别结构化 summary 字段', value: '' },
  ...props.summaryRuleOptions,
]);
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
