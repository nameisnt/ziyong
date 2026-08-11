<template>
  <section class="pc-prompts-page">
    <div class="pc-prompts-editor pc-output-editor">
      <label class="pc-field-group">
        <span>{{ t`输出格式` }}</span>
        <textarea v-model="draft.outputFormat" class="pc-area" />
      </label>

      <label class="pc-output-parser-toggle">
        <input v-model="draft.parserEnabled" type="checkbox" />
        <span>{{ t`使用自定义解析` }}</span>
      </label>

      <template v-if="draft.parserEnabled">
        <div class="pc-output-parser-grid">
          <label class="pc-field-group">
            <span>{{ t`解析类型` }}</span>
            <select v-model="draft.parser.kind" class="pc-select">
              <option value="xml">XML</option>
              <option value="json">JSON</option>
              <option value="labels" :disabled="!canUseLabelParser">{{ t`标签文本` }}</option>
              <option value="text" :disabled="!canUsePlainTextParser">{{ t`纯文本` }}</option>
            </select>
          </label>
          <label v-if="draft.parser.kind !== 'text'" class="pc-field-group">
            <span>{{ draft.parser.kind === 'labels' ? t`外层标签` : t`根路径` }}</span>
            <input v-model="draft.parser.rootPath" class="pc-field" type="text" />
          </label>
        </div>

        <section class="pc-output-field-list">
          <strong>{{ t`字段映射` }}</strong>
          <article v-for="field in draft.parser.fields" :key="field.key" class="pc-output-field">
            <div class="pc-output-field-head">
              <strong>{{ field.label }}</strong>
              <small>{{ field.required ? t`必填` : field.kind === 'object-list' ? t`列表` : t`可选` }}</small>
            </div>
            <input v-model="field.defaultPath" class="pc-field" type="text" :placeholder="t`字段路径`" />
            <div v-if="field.kind === 'text'" class="pc-output-field-options">
              <select v-model="field.extraction" class="pc-select">
                <option value="text">{{ t`纯文本` }}</option>
                <option value="markup">{{ t`保留标记` }}</option>
              </select>
            </div>
            <div v-else-if="field.kind === 'text-list'" class="pc-output-field-options">
              <input v-model="field.separator" class="pc-field" type="text" :placeholder="t`分隔正则，可留空`" />
            </div>
            <div v-if="field.kind === 'object-list'" class="pc-output-child-fields">
              <label v-for="child in field.children" :key="child.key" class="pc-field-group">
                <span>{{ child.label }}</span>
                <input v-model="child.defaultPath" class="pc-field" type="text" />
              </label>
            </div>
          </article>
        </section>

        <label class="pc-field-group">
          <span>{{ t`测试输出` }}</span>
          <textarea v-model="draft.sample" class="pc-area compact" :placeholder="t`粘贴一段 AI 输出`" />
        </label>
        <button class="pc-soft-btn" type="button" @click="testParser">{{ t`测试解析` }}</button>
        <pre v-if="draft.testResult" class="pc-output-test-result">{{ draft.testResult }}</pre>
        <p v-if="draft.testError" class="pc-output-test-error">{{ draft.testError }}</p>
      </template>

      <div class="pc-form-actions">
        <button class="pc-soft-btn danger" type="button" @click="restoreDefault">{{ t`恢复默认` }}</button>
        <button class="pc-soft-btn" type="button" @click="$emit('back')">{{ t`取消` }}</button>
        <button class="pc-primary-btn" type="button" @click="save">{{ t`保存` }}</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { PhoneOutputParserDefinition, PhonePromptOutputFormat } from '@/core/appRegistry';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { parseOutputWithConfig } from '@/util/outputParsing';
import { storeToRefs } from 'pinia';

const props = defineProps<{ definition: PhonePromptOutputFormat }>();
const emit = defineEmits<{ back: [] }>();
const phone = usePhoneStore();
const prompts = usePromptStore();
const { outputRules } = storeToRefs(prompts);
const draft = reactive<{
  outputFormat: string;
  parser: PhoneOutputParserDefinition;
  parserEnabled: boolean;
  sample: string;
  testError: string;
  testResult: string;
}>({
  outputFormat: '',
  parser: { fields: [], kind: 'xml', rootPath: 'result' },
  parserEnabled: false,
  sample: '',
  testError: '',
  testResult: '',
});

const canUseLabelParser = computed(() => draft.parser.fields.every(field => field.kind === 'text'));
const canUsePlainTextParser = computed(
  () => draft.parser.fields.length === 1 && draft.parser.fields[0]?.kind === 'text',
);

function loadDraft() {
  const override = outputRules.value[props.definition.id];
  draft.outputFormat = prompts.resolveOutputFormat(props.definition.id);
  draft.parser = structuredClone(override?.parser ?? props.definition.parser);
  draft.parserEnabled = override?.parserEnabled ?? false;
  draft.sample = '';
  draft.testError = '';
  draft.testResult = '';
}

function testParser() {
  draft.testError = '';
  draft.testResult = '';
  if (!draft.sample.trim()) {
    draft.testError = '请先填写测试输出';
    return;
  }
  const result = parseOutputWithConfig(draft.sample, draft.parser);
  if (!result.ok) {
    draft.testError = result.warnings.join('\n');
    return;
  }
  draft.testResult = JSON.stringify(result.data, null, 2);
}

function save() {
  if (!draft.outputFormat.trim()) return;
  if (draft.parserEnabled) {
    const missingPath = draft.parser.fields.some(
      field => !field.defaultPath.trim() || field.children?.some(child => !child.defaultPath.trim()),
    );
    if (missingPath) {
      toastr.warning('解析字段路径不能为空');
      return;
    }
    if (draft.parser.kind === 'text' && draft.parser.fields.filter(field => field.kind === 'text').length !== 1) {
      toastr.warning('纯文本解析只支持一个文本字段');
      return;
    }
  }
  prompts.saveOutputRule(props.definition.id, {
    outputFormat: draft.outputFormat,
    parser: draft.parser,
    parserEnabled: draft.parserEnabled,
  });
  toastr.success('已保存输出与解析规则');
  emit('back');
}

async function restoreDefault() {
  const shouldRestore = await phone.confirmNotice(`要恢复“${props.definition.label}”的默认输出与解析规则吗？`, {
    confirmLabel: '恢复',
    kind: 'warning',
  });
  if (!shouldRestore) return;
  prompts.resetOutputRule(props.definition.id);
  loadDraft();
  toastr.success('已恢复默认规则');
}

watch(() => props.definition, loadDraft, { immediate: true });
</script>

<style scoped>
.pc-prompts-page {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 14px;
}

.pc-prompts-editor {
  display: grid;
  gap: 14px;
}

.pc-output-parser-toggle {
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
}

.pc-output-parser-grid,
.pc-output-field-options,
.pc-output-child-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.pc-output-field-list {
  display: grid;
  gap: 0;
  border-block: 1px solid var(--pc-border);
}

.pc-output-field-list > strong {
  padding-block: 12px;
}

.pc-output-field {
  display: grid;
  gap: 10px;
  padding: 12px 0;
  border-top: 1px solid var(--pc-border);
}

.pc-output-field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-output-field-head small {
  color: var(--pc-muted);
}

.pc-output-editor :is(.pc-field, .pc-select, .pc-area) {
  margin-top: 0;
}

.pc-output-editor .pc-form-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.pc-output-editor .pc-form-actions :is(.pc-soft-btn, .pc-primary-btn) {
  min-width: 0;
  padding-inline: 8px;
}

.pc-output-test-result {
  max-height: 220px;
  overflow: auto;
  margin: 0;
  padding: 12px;
  border: 1px solid var(--pc-border);
  border-radius: 8px;
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  white-space: pre-wrap;
}

.pc-output-test-error {
  margin: 0;
  color: var(--pc-danger);
  white-space: pre-wrap;
}
</style>
