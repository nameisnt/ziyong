<template>
  <section class="pc-regex-wizard-app">
    <article class="pc-page-section pc-regex-wizard-form">
      <div class="pc-regex-wizard-section">
        <strong class="pc-regex-wizard-step-title">1. 需要什么结果</strong>
        <div class="pc-segment pc-regex-wizard-purpose">
          <button
            v-for="option in purposeOptions"
            :key="option.value"
            :class="['pc-segment-btn', { active: draft.purpose === option.value }]"
            type="button"
            @click="draft.purpose = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <div class="pc-regex-wizard-section">
        <div class="pc-regex-wizard-step-head">
          <strong class="pc-regex-wizard-step-title">2. 原文结构</strong>
          <InfoHint text="适合结构稳定的平面文本；同名标签递归嵌套、任意 HTML/XML 不适合用正则可靠解析。" />
        </div>
        <div class="pc-segment pc-regex-wizard-mode-tabs">
          <button
            :class="['pc-segment-btn', { active: draft.mode === 'boundary' }]"
            type="button"
            @click="draft.mode = 'boundary'"
          >
            标签或双边界
          </button>
          <button
            :class="['pc-segment-btn', { active: draft.mode === 'fields' }]"
            type="button"
            @click="draft.mode = 'fields'"
          >
            多个字段
          </button>
        </div>

        <template v-if="draft.mode === 'boundary'">
          <span class="pc-regex-wizard-choice-label">边界类型</span>
          <div class="pc-segment pc-regex-wizard-kind-tabs">
            <button
              :class="['pc-segment-btn', { active: draft.boundaryKind === 'tag' }]"
              type="button"
              @click="draft.boundaryKind = 'tag'"
            >
              XML 标签
            </button>
            <button
              :class="['pc-segment-btn', { active: draft.boundaryKind === 'literal' }]"
              type="button"
              @click="draft.boundaryKind = 'literal'"
            >
              自定义标记
            </button>
          </div>

          <label v-if="draft.boundaryKind === 'tag'" class="pc-field-group">
            <span class="pc-field-label">标签名称</span>
            <input v-model="draft.tagName" class="pc-field" placeholder="例如：content" />
          </label>
          <template v-else>
            <label class="pc-field-group">
              <span class="pc-field-label">开始标记</span>
              <input v-model="draft.customStart" class="pc-field" placeholder="例如：【正文】" />
            </label>
            <label class="pc-field-group">
              <span class="pc-field-label">结束标记</span>
              <input v-model="draft.customEnd" class="pc-field" placeholder="例如：【/正文】" />
            </label>
          </template>
        </template>

        <template v-else>
          <span class="pc-regex-wizard-choice-label pc-regex-wizard-choice-head">
            字段结构
            <InfoHint
              v-if="draft.fieldStructure === 'line'"
              text="每项填写冒号前固定出现的文字。支持中文或英文冒号；相同字段名可以添加多次，并按列表顺序匹配。"
            />
          </span>
          <div class="pc-segment pc-regex-wizard-kind-tabs">
            <button
              :class="['pc-segment-btn', { active: draft.fieldStructure === 'line' }]"
              type="button"
              @click="draft.fieldStructure = 'line'"
            >
              行字段
            </button>
            <button
              :class="['pc-segment-btn', { active: draft.fieldStructure === 'tag' }]"
              type="button"
              @click="draft.fieldStructure = 'tag'"
            >
              XML 子标签
            </button>
          </div>
          <label v-if="draft.fieldStructure === 'line'" class="pc-field-group">
            <span class="pc-field-label">外层标签名称</span>
            <input v-model="draft.fieldsContainerTagName" class="pc-field" placeholder="例如：aa" />
          </label>
          <div class="pc-regex-wizard-field-list">
            <article v-for="(field, index) in draft.fields" :key="field.id" class="pc-editor-card pc-regex-field-card">
              <header>
                <strong>{{ `字段 ${index + 1}` }}</strong>
                <div>
                  <button
                    class="pc-icon-btn"
                    type="button"
                    :disabled="index === 0"
                    aria-label="上移字段"
                    title="上移字段"
                    @click="moveField(index, -1)"
                  >
                    <i class="fa-solid fa-arrow-up"></i>
                  </button>
                  <button
                    class="pc-icon-btn"
                    type="button"
                    :disabled="index === draft.fields.length - 1"
                    aria-label="下移字段"
                    title="下移字段"
                    @click="moveField(index, 1)"
                  >
                    <i class="fa-solid fa-arrow-down"></i>
                  </button>
                  <button
                    class="pc-icon-btn danger"
                    type="button"
                    :disabled="draft.fields.length === 1"
                    aria-label="删除字段"
                    title="删除字段"
                    @click="removeField(index)"
                  >
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              </header>
              <div class="pc-regex-field-grid">
                <label class="pc-field-group">
                  <span class="pc-field-label">字段名称</span>
                  <input v-model="field.label" class="pc-field" placeholder="例如：标题" />
                </label>
                <label class="pc-field-group">
                  <span class="pc-field-label">{{ draft.fieldStructure === 'line' ? '固定字段名' : '标签名称' }}</span>
                  <input
                    v-model="field.tagName"
                    class="pc-field"
                    :placeholder="draft.fieldStructure === 'line' ? '例如：固定字段' : '例如：title'"
                  />
                </label>
              </div>
              <label class="pc-field-group">
                <span class="pc-field-label">字段用途</span>
                <select v-model="field.kind" class="pc-select">
                  <option v-for="option in fieldKindOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>
              <label v-if="field.kind === 'fixed'" class="pc-field-group">
                <span class="pc-field-label">必须等于</span>
                <input v-model="field.fixedValue" class="pc-field" placeholder="例如：forum" />
              </label>
              <div class="pc-regex-field-toggles">
                <label><input v-model="field.optional" type="checkbox" />可选字段</label>
                <label v-if="field.kind !== 'fixed'"><input v-model="field.multiline" type="checkbox" />允许换行</label>
              </div>
            </article>
          </div>
          <button class="pc-soft-btn" type="button" @click="addField">
            <i class="fa-solid fa-plus"></i>
            添加字段
          </button>
        </template>

        <div v-if="draft.boundaryKind === 'tag' || draft.mode === 'fields'" class="pc-regex-wizard-tag-options">
          <label class="pc-field-group">
            <span class="pc-field-label">结束方式</span>
            <select v-model="draft.closingStyle" class="pc-select">
              <option value="standard">标准闭合 &lt;/tag&gt;</option>
              <option value="repeat">重复标签 &lt;tag&gt;</option>
              <option v-if="draft.mode === 'boundary'" value="custom">自定义结束标记</option>
            </select>
          </label>
          <label v-if="draft.closingStyle === 'custom' && draft.mode === 'boundary'" class="pc-field-group">
            <span class="pc-field-label">自定义结束标记</span>
            <input v-model="draft.customEnd" class="pc-field" placeholder="例如：【结束】" />
          </label>
          <label class="pc-regex-wizard-check"
            ><input v-model="draft.allowAttributes" type="checkbox" />允许开始标签带属性</label
          >
        </div>
      </div>

      <details class="pc-regex-wizard-advanced">
        <summary>
          <strong>3. 格式容错与匹配范围</strong>
          <span>{{ advancedSummary }}</span>
          <i class="fa-solid fa-chevron-down"></i>
        </summary>
        <div class="pc-regex-wizard-advanced-body">
          <label class="pc-field-group">
            <span class="pc-field-label">空格与换行</span>
            <select v-model="draft.whitespace" class="pc-select">
              <option value="exact">完全一致</option>
              <option value="horizontal">宽松空格，不跨行</option>
              <option value="flexible">宽松空白，允许换行</option>
              <option value="lines">按行匹配，可有空行</option>
            </select>
          </label>
          <div class="pc-regex-wizard-option-list">
            <label><input v-model="draft.allowEmpty" type="checkbox" />允许内容为空</label>
            <label><input v-model="draft.caseInsensitive" type="checkbox" />忽略大小写</label>
          </div>
          <div class="pc-segment pc-regex-wizard-occurrence">
            <button
              :class="['pc-segment-btn', { active: draft.occurrence === 'first' }]"
              type="button"
              @click="draft.occurrence = 'first'"
            >
              只取第一个区块
            </button>
            <button
              :class="['pc-segment-btn', { active: draft.occurrence === 'all' }]"
              type="button"
              @click="draft.occurrence = 'all'"
            >
              提取全部区块
            </button>
          </div>
          <label v-if="draft.mode === 'fields' && draft.purpose === 'extract-content'" class="pc-field-group">
            <span class="pc-field-label">多个提取字段之间</span>
            <select v-model="draft.outputSeparator" class="pc-select">
              <option :value="'\n\n'">空一行</option>
              <option :value="'\n'">换一行</option>
              <option value=" ">一个空格</option>
              <option value="">直接连接</option>
            </select>
          </label>
        </div>
      </details>
    </article>

    <article class="pc-page-section pc-regex-wizard-test">
      <header>
        <div>
          <strong>
            示例测试
            <InfoHint
              :text="
                draft.mode === 'fields' && draft.fieldStructure === 'line'
                  ? '先匹配外层标签，再按当前列表顺序匹配“字段名：内容”；同名字段也按顺序区分。每个字段可单独设为可选。'
                  : '多个固定字段按当前顺序匹配；每个字段可单独设为可选。下方“第一个/全部”只控制原文里有多个区块时取几个。'
              "
            />
          </strong>
          <small>{{ testSummary }}</small>
        </div>
      </header>
      <textarea v-model="sampleInput" class="pc-area" placeholder="粘贴一段真实原文，立即查看是否命中。"></textarea>
      <div v-if="generationError || testResult.error" class="pc-regex-wizard-error">
        {{ generationError || testResult.error }}
      </div>
      <div v-else-if="testResult.matches.length" class="pc-regex-wizard-match-list">
        <pre
          class="pc-regex-wizard-highlight"
        ><template v-for="(segment, index) in highlightedSegments" :key="index"><mark v-if="segment.matched">{{ segment.text }}</mark><template v-else>{{ segment.text }}</template></template></pre>
        <article v-for="(match, index) in testResult.matches.slice(0, 10)" :key="`${match.index}-${index}`">
          <strong>{{ `命中 ${index + 1} · 位置 ${match.index}` }}</strong>
          <div v-if="Object.keys(match.captures).length" class="pc-regex-wizard-captures">
            <span v-for="(value, name) in match.captures" :key="name">
              <b>{{ captureLabel(String(name)) }}</b
              >{{ value || '（空）' }}
            </span>
          </div>
          <pre>{{ generatedRule?.operation === 'replace' ? '将删除整个命中区块' : match.output }}</pre>
        </article>
      </div>
    </article>

    <article class="pc-page-section pc-regex-wizard-result">
      <header>
        <strong>
          生成结果
          <InfoHint text="正则替换 App 使用不带两侧 / / 的表达式主体。" />
        </strong>
      </header>

      <div class="pc-regex-wizard-code-row">
        <div>
          <strong>匹配表达式</strong><code>{{ generatedRule?.pattern || '等待完整结构' }}</code>
        </div>
        <button
          class="pc-icon-btn"
          type="button"
          :disabled="!generatedRule"
          aria-label="复制匹配表达式"
          title="复制匹配表达式"
          @click="copyValue('表达式', generatedRule?.pattern || '')"
        >
          <i class="fa-solid fa-copy"></i>
        </button>
      </div>
      <div class="pc-regex-wizard-code-row">
        <div>
          <strong>{{ generatedRule?.operation === 'replace' ? '替换模板' : '提取模板' }}</strong
          ><code>{{ generatedRule?.replacement || '（空）' }}</code>
        </div>
        <button
          class="pc-icon-btn"
          type="button"
          :disabled="!generatedRule"
          aria-label="复制模板"
          title="复制模板"
          @click="copyValue('模板', generatedRule?.replacement ?? '')"
        >
          <i class="fa-solid fa-copy"></i>
        </button>
      </div>
      <div class="pc-regex-wizard-code-row compact">
        <div>
          <strong>Flags</strong><code>{{ generatedRule?.flags || '—' }}</code>
        </div>
        <button
          class="pc-icon-btn"
          type="button"
          :disabled="!generatedRule"
          aria-label="复制 Flags"
          title="复制 Flags"
          @click="copyValue('Flags', generatedRule?.flags || '')"
        >
          <i class="fa-solid fa-copy"></i>
        </button>
      </div>

      <div class="pc-regex-wizard-copy-actions">
        <button
          class="pc-soft-btn"
          type="button"
          :disabled="!generatedRule"
          @click="copyValue('完整正则', generatedRule?.fullExpression || '')"
        >
          <i class="fa-solid fa-copy"></i>
          复制完整正则
        </button>
        <button
          class="pc-soft-btn"
          type="button"
          :disabled="!generatedRule"
          @click="copyValue('表达式', generatedRule?.pattern || '')"
        >
          <i class="fa-solid fa-bolt"></i>
          快捷复制表达式
        </button>
      </div>
    </article>

    <article class="pc-page-section pc-regex-wizard-save">
      <label class="pc-field-group">
        <span class="pc-field-label">规则名称</span>
        <input v-model="ruleName" class="pc-field" placeholder="例如：提取 content 正文" />
      </label>
      <label class="pc-field-group">
        <span class="pc-field-label">保存并使用到</span>
        <SearchableCombobox v-model="saveTarget" :options="saveTargetOptions" placeholder="只保存到规则库" />
      </label>
      <label v-if="saveTarget.startsWith('preset-')" class="pc-field-group">
        <span class="pc-field-label">目标预设</span>
        <SearchableCombobox v-model="targetPresetName" :options="presetOptions" placeholder="选择预设" />
      </label>
      <div class="pc-form-actions">
        <button class="pc-soft-btn" type="button" @click="openRegexLibrary">打开正则替换</button>
        <button class="pc-primary-btn" type="button" :disabled="!generatedRule" @click="saveRule">保存到规则库</button>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import InfoHint from '@/components/InfoHint.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { listTavernPresets } from '@/apps/preset-manager/api';
import { usePresetLinkStore } from '@/apps/preset-link/store';
import { useRegexDisplayStore } from '@/apps/regex-display/store';
import { usePhoneStore } from '@/store/phone';
import {
  createRegexWizardDraft,
  createRegexWizardField,
  generateRegexWizardRule,
  testRegexWizardRule,
  type RegexWizardFieldKind,
  type RegexWizardPurpose,
} from './model';

type SaveTarget = 'library' | 'preset-content' | 'preset-title' | 'reader-content' | 'reader-title';

const phone = usePhoneStore();
const presetLinks = usePresetLinkStore();
const regexDisplay = useRegexDisplayStore();
const draft = reactive(createRegexWizardDraft());
const sampleInput = ref('<content>\n这里是正文。\n</content>');
const ruleName = ref('正则向导生成规则');
const saveTarget = ref<SaveTarget>('library');
const targetPresetName = ref('');
const presetNames = ref<string[]>([]);

const purposeOptions: Array<{ label: string; value: RegexWizardPurpose }> = [
  { label: '中间内容', value: 'extract-content' },
  { label: '整个区块', value: 'extract-block' },
  { label: '删除区块', value: 'remove-block' },
];
const fieldKindOptions: Array<{ label: string; value: RegexWizardFieldKind }> = [
  { label: '提取内容', value: 'capture' },
  { label: '固定值', value: 'fixed' },
  { label: '存在但忽略', value: 'ignore' },
];
const allSaveTargetOptions: Array<{ label: string; value: SaveTarget }> = [
  { label: '只保存到规则库', value: 'library' },
  { label: '全局阅读标题', value: 'reader-title' },
  { label: '全局阅读正文', value: 'reader-content' },
  { label: '指定预设 · 阅读标题', value: 'preset-title' },
  { label: '指定预设 · 阅读正文', value: 'preset-content' },
];
const saveTargetOptions = computed(() =>
  generatedRule.value?.operation === 'replace'
    ? allSaveTargetOptions.filter(option => option.value === 'library')
    : allSaveTargetOptions,
);
const presetOptions = computed(() => presetNames.value.map(name => ({ label: name, value: name })));
const generation = computed(() => {
  try {
    return { error: '', rule: generateRegexWizardRule(draft) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : '无法生成正则', rule: null };
  }
});
const generatedRule = computed(() => generation.value.rule);
const generationError = computed(() => generation.value.error);
const testResult = computed(() =>
  generatedRule.value ? testRegexWizardRule(generatedRule.value, sampleInput.value) : { error: '', matches: [] },
);
const testSummary = computed(() => {
  if (generationError.value || testResult.value.error) return '当前结构有错误';
  if (!sampleInput.value) return '等待示例文本';
  return testResult.value.matches.length ? `命中 ${testResult.value.matches.length} 个区块` : '没有命中';
});
const advancedSummary = computed(() => {
  const whitespaceLabels = { exact: '完全一致', flexible: '宽松空白', horizontal: '宽松空格', lines: '按行' };
  return `${whitespaceLabels[draft.whitespace]} · ${draft.occurrence === 'all' ? '全部区块' : '第一个区块'}`;
});
const highlightedSegments = computed(() => {
  const matches = [...testResult.value.matches].sort((left, right) => left.index - right.index);
  const segments: Array<{ matched: boolean; text: string }> = [];
  let cursor = 0;
  matches.forEach(match => {
    if (match.index < cursor) return;
    if (match.index > cursor) segments.push({ matched: false, text: sampleInput.value.slice(cursor, match.index) });
    segments.push({ matched: true, text: match.full });
    cursor = match.index + match.full.length;
  });
  if (cursor < sampleInput.value.length) segments.push({ matched: false, text: sampleInput.value.slice(cursor) });
  return segments;
});

watch(
  () => generatedRule.value?.operation,
  operation => {
    if (operation === 'replace') saveTarget.value = 'library';
  },
);

function addField() {
  draft.fields.push(createRegexWizardField(draft.fields.length));
}

function removeField(index: number) {
  if (draft.fields.length <= 1) return;
  draft.fields.splice(index, 1);
}

function moveField(index: number, offset: -1 | 1) {
  const target = index + offset;
  if (target < 0 || target >= draft.fields.length) return;
  const [field] = draft.fields.splice(index, 1);
  if (field) draft.fields.splice(target, 0, field);
}

function captureLabel(name: string) {
  if (name === 'content') return '中间内容';
  if (name === 'block') return '整个区块';
  const fieldIndex = Number(name.replace(/^field/u, '')) - 1;
  return draft.fields[fieldIndex]?.label || name;
}

async function copyValue(label: string, value: string) {
  if (!generatedRule.value && label !== '模板') return;
  try {
    await navigator.clipboard.writeText(value);
    toastr.success(`已复制${label}`);
  } catch {
    toastr.warning('复制失败，请长按结果手动复制');
  }
}

function saveRule() {
  const generated = generatedRule.value;
  if (!generated) return;
  if (saveTarget.value.startsWith('preset-') && !targetPresetName.value) {
    toastr.warning('请先选择目标预设');
    return;
  }
  const rule = regexDisplay.addRule({
    enabled: true,
    flags: generated.flags,
    name: ruleName.value.trim() || '正则向导生成规则',
    operation: generated.operation,
    pattern: generated.pattern,
    renderMode: 'text',
    replacement: generated.replacement,
  });
  if (generated.operation === 'extract') {
    if (saveTarget.value === 'reader-title') regexDisplay.setExtractionRule('reader', 'title', rule.id);
    if (saveTarget.value === 'reader-content') regexDisplay.setExtractionRule('reader', 'content', rule.id);
    if (saveTarget.value === 'preset-title') presetLinks.setReaderRule(targetPresetName.value, 'title', rule.id);
    if (saveTarget.value === 'preset-content') presetLinks.setReaderRule(targetPresetName.value, 'content', rule.id);
  } else if (saveTarget.value !== 'library') {
    toastr.info('删除区块属于替换规则，已保存到规则库；请在正则替换中选择使用 App');
  }
  toastr.success(`已保存规则“${rule.name}”`);
}

function openRegexLibrary() {
  phone.pushRoute('regex-display', 'root', '正则替换');
}

onMounted(() => {
  presetNames.value = listTavernPresets();
  targetPresetName.value = presetNames.value[0] || '';
});

watch(
  () => draft.mode,
  mode => {
    if (mode !== 'fields') return;
    if (draft.closingStyle === 'custom') draft.closingStyle = 'standard';
    if (!draft.fields[0]?.tagName) draft.fields[0].tagName = '固定字段';
    if (sampleInput.value === '<content>\n这里是正文。\n</content>') {
      sampleInput.value = '<aa>\n固定字段：第一段内容\n固定字段：第二段内容\n</aa>';
      draft.fields = [
        { ...createRegexWizardField(0), label: '第一项', multiline: false, tagName: '固定字段' },
        { ...createRegexWizardField(1), label: '第二项', multiline: false, tagName: '固定字段' },
      ];
    }
  },
);
</script>

<style scoped>
.pc-regex-wizard-app {
  display: grid;
  align-content: start;
  gap: 14px;
}

.pc-regex-wizard-form,
.pc-regex-wizard-section,
.pc-regex-wizard-test,
.pc-regex-wizard-result,
.pc-regex-wizard-save {
  display: grid;
  min-width: 0;
  gap: 12px;
}

.pc-regex-wizard-test small {
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.45;
}

.pc-regex-wizard-section + .pc-regex-wizard-section {
  border-top: 1px solid var(--pc-border);
  padding-top: 14px;
}

.pc-regex-wizard-step-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pc-regex-wizard-step-title {
  color: var(--pc-text);
  font-size: 14px;
}

.pc-regex-wizard-choice-label {
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 700;
}

.pc-regex-wizard-purpose {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.pc-regex-wizard-purpose .pc-segment-btn {
  min-width: 0;
}

.pc-regex-wizard-choice-head {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.pc-regex-wizard-mode-tabs,
.pc-regex-wizard-kind-tabs,
.pc-regex-wizard-occurrence,
.pc-regex-wizard-copy-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.pc-regex-wizard-field-list {
  display: grid;
  gap: 10px;
}

.pc-regex-field-card {
  display: grid;
  gap: 10px;
}

.pc-regex-field-card header,
.pc-regex-field-card header > div,
.pc-regex-wizard-test header,
.pc-regex-wizard-result header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pc-regex-field-card header > div {
  justify-content: flex-end;
}

.pc-regex-wizard-test header > div {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.pc-regex-wizard-test header small {
  border-radius: 999px;
  padding: 3px 7px;
  background: color-mix(in srgb, var(--pc-theme-accent) 12%, var(--pc-surface-strong) 88%);
  color: var(--pc-theme-accent);
  white-space: nowrap;
}

.pc-regex-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.pc-regex-field-toggles,
.pc-regex-wizard-option-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-regex-field-toggles label,
.pc-regex-wizard-option-list label,
.pc-regex-wizard-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.pc-regex-wizard-tag-options {
  display: grid;
  gap: 10px;
  border-top: 1px solid var(--pc-border);
  padding-top: 12px;
}

.pc-regex-wizard-advanced {
  border-top: 1px solid var(--pc-border);
  border-bottom: 1px solid var(--pc-border);
}

.pc-regex-wizard-advanced summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 46px;
  cursor: pointer;
  list-style: none;
}

.pc-regex-wizard-advanced summary::-webkit-details-marker {
  display: none;
}

.pc-regex-wizard-advanced summary span {
  overflow: hidden;
  color: var(--pc-muted);
  font-size: 12px;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-regex-wizard-advanced summary i {
  color: var(--pc-muted);
  transition: transform 0.18s ease;
}

.pc-regex-wizard-advanced[open] summary i {
  transform: rotate(180deg);
}

.pc-regex-wizard-advanced-body {
  display: grid;
  gap: 12px;
  padding-bottom: 12px;
}

.pc-regex-wizard-test .pc-area {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.pc-regex-wizard-error {
  color: var(--pc-danger);
  font-size: 12px;
  line-height: 1.5;
}

.pc-regex-wizard-match-list {
  display: grid;
  gap: 8px;
}

.pc-regex-wizard-match-list article {
  display: grid;
  gap: 6px;
  border-top: 1px solid var(--pc-border);
  padding-top: 8px;
}

.pc-regex-wizard-highlight {
  max-height: 180px;
  overflow: auto;
  margin: 0;
  border-radius: min(var(--pc-control-radius), 8px);
  padding: 10px;
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  font-size: 11px;
  white-space: pre-wrap;
}

.pc-regex-wizard-highlight mark {
  border-radius: 3px;
  background: color-mix(in srgb, var(--pc-theme-accent) 28%, transparent 72%);
  color: inherit;
}

.pc-regex-wizard-captures {
  display: grid;
  gap: 4px;
}

.pc-regex-wizard-captures span {
  display: grid;
  grid-template-columns: minmax(72px, auto) minmax(0, 1fr);
  gap: 8px;
  color: var(--pc-muted);
  font-size: 11px;
  white-space: pre-wrap;
}

.pc-regex-wizard-captures b {
  color: var(--pc-text);
}

.pc-regex-wizard-match-list strong {
  font-size: 12px;
}

.pc-regex-wizard-match-list pre {
  max-height: 140px;
  overflow: auto;
  margin: 0;
  border-radius: min(var(--pc-control-radius), 8px);
  padding: 10px;
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  font-size: 11px;
  white-space: pre-wrap;
}

.pc-regex-wizard-code-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  align-items: start;
  gap: 8px;
}

.pc-regex-wizard-code-row > div {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.pc-regex-wizard-code-row code {
  overflow-x: auto;
  border-radius: min(var(--pc-control-radius), 8px);
  padding: 10px;
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  font-size: 11px;
  white-space: nowrap;
}

@media (max-width: 370px) {
  .pc-regex-field-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
