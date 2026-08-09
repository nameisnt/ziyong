<template>
  <section class="pc-regex-display-app">
    <section class="pc-regex-card pc-regex-toolbar">
      <div>
        <strong>
          {{ t`正则替换设置` }}
          <InfoHint :text="t`提取规则用于从楼层创建内容；替换规则只改变显示结果，不会改动已保存原文。`" />
        </strong>
        <p>
          {{ `${rules.length} 条规则，${readerExtractRuleCount} 条正文抽取，${readerCleanupRuleCount} 条正文清理` }}
        </p>
      </div>
      <button class="pc-soft-btn compact pc-regex-add-btn" type="button" @click="addNewRule">
        <i class="fa-solid fa-plus"></i>
        <span>{{ t`新增` }}</span>
      </button>
    </section>

    <section v-if="rules.length" class="pc-regex-card">
      <div class="pc-select-field">
        <label class="pc-field-label">{{ t`当前规则` }}</label>
        <SearchableCombobox v-model="activeRuleId" :options="ruleOptions" :placeholder="t`选择或搜索规则`" />
      </div>

      <article v-if="activeRule" class="pc-rule-editor">
        <div class="pc-select-field">
          <label class="pc-field-label">{{ t`规则名称` }}</label>
          <input v-model="activeRule.name" class="pc-field" type="text" :placeholder="t`例如：资料表头像卡片`" />
        </div>

        <div class="pc-inline-grid two-cols">
          <div class="pc-select-field">
            <label class="pc-field-label">{{ t`目标 App` }}</label>
            <SearchableCombobox v-model="activeRule.targetId" :options="targetOptions" :placeholder="t`选择或搜索 App`" />
          </div>
          <div class="pc-select-field">
            <label class="pc-field-label">{{ t`作用字段` }}</label>
            <SearchableCombobox v-model="activeRule.field" :options="fieldOptions" :placeholder="t`选择字段`" />
          </div>
        </div>

        <div class="pc-select-field">
          <label class="pc-field-label">
            {{ t`处理方式` }}
            <InfoHint :text="t`提取用于从聊天楼层创建内容，只采用第一条成功命中的规则；替换按顺序处理显示内容，不修改已保存原文。`" />
          </label>
          <div class="pc-regex-operation-segment">
            <button
              v-for="operation in operationOptions"
              :key="operation.value"
              :class="['pc-segment-btn', { active: activeRule.operation === operation.value }]"
              type="button"
              :disabled="!activeTarget?.operations.includes(operation.value)"
              @click="activeRule.operation = operation.value"
            >
              {{ operation.label }}
            </button>
          </div>
        </div>

        <div class="pc-inline-grid two-cols">
          <div v-if="!activeRule.targetId.startsWith('custom-')" class="pc-select-field">
            <label class="pc-field-label">{{ t`输出显示` }}</label>
            <SearchableCombobox v-model="activeRule.renderMode" :options="renderModeOptions" :placeholder="t`选择显示方式`" />
          </div>
          <div class="pc-select-field">
            <label class="pc-field-label">
              {{ t`Flags` }}
              <InfoHint :text="t`默认 g 表示替换全部命中；可按需加入 i、m、s、u 等 JS 正则 flags。`" />
            </label>
            <input v-model="activeRule.flags" class="pc-field" type="text" placeholder="g" />
          </div>
        </div>

        <div class="pc-select-field">
          <label class="pc-field-label">{{ t`匹配正则` }}</label>
          <textarea
            v-model="activeRule.pattern"
            class="pc-area compact mono"
            :placeholder="t`填写 JS 正则主体，不需要写两侧 / /`"
          ></textarea>
        </div>

        <div class="pc-select-field">
          <label class="pc-field-label">
            {{ activeRule.operation === 'extract' ? t`提取模板` : t`替换模板` }}
            <InfoHint :text="t`可使用 $1、$<name> 这类 JS replace 捕获组。`" />
          </label>
          <textarea
            v-model="activeRule.replacement"
            class="pc-area mono"
            :placeholder="t`例如：<section class='profile'>$1</section>`"
          ></textarea>
        </div>

        <div class="pc-action-grid">
          <div class="pc-rule-order-actions">
            <button class="pc-icon-btn" type="button" :title="t`上移`" @click="regexDisplay.moveRule(activeRule.id, -1)">
              <i class="fa-solid fa-arrow-up"></i>
            </button>
            <button class="pc-icon-btn" type="button" :title="t`下移`" @click="regexDisplay.moveRule(activeRule.id, 1)">
              <i class="fa-solid fa-arrow-down"></i>
            </button>
          </div>
          <button class="pc-soft-btn compact" type="button" @click="duplicateActiveRule">
            <i class="fa-solid fa-copy"></i>
            <span>{{ t`复制` }}</span>
          </button>
          <button class="pc-soft-btn compact danger" type="button" @click="deleteActiveRule">
            <i class="fa-solid fa-trash"></i>
            <span>{{ t`删除` }}</span>
          </button>
        </div>
      </article>
    </section>

    <EmptyState v-else :title="t`还没有显示规则`">
      <p>{{ t`新增一条规则后，可以在下方用示例文本测试替换效果。` }}</p>
    </EmptyState>

    <section class="pc-regex-card">
      <div class="pc-row pc-row-top">
        <div>
          <strong>
            {{ t`预览` }}
            <InfoHint :text="t`预览会按当前排序依次应用全部规则。`" />
          </strong>
          <p>{{ previewSummary }}</p>
        </div>
      </div>

      <div class="pc-select-field">
        <label class="pc-field-label">{{ t`原文` }}</label>
        <textarea
          v-model="settings.previewInput"
          class="pc-area preview-source"
          :placeholder="t`把资料表、楼层片段或任意文本放在这里测试。`"
        ></textarea>
      </div>

      <div v-if="previewResult.errors.length" class="pc-error-list">
        <span v-for="error in previewResult.errors" :key="error">{{ error }}</span>
      </div>

      <div class="pc-preview-box">
        <FrontendFrame
          v-if="previewResult.renderMode === 'html'"
          :active="true"
          :content="previewResult.content"
          security-mode="safe"
          :theme="settingsStore.settings.theme"
          title="正则显示预览"
        />
        <pre v-else>{{ previewResult.content || '暂无预览内容' }}</pre>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import FrontendFrame from '@/components/FrontendFrame.vue';
import InfoHint from '@/components/InfoHint.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { getRegexTargets, type RegexRuleOperation } from '@/core/regexTargetRegistry';
import { usePhoneStore } from '@/store/phone';
import { useSettingsStore } from '@/store/settings';
import { applyRegexDisplayRules, extractWithRegexRules, getRegexRulesForTarget } from '@/util/regexDisplay';
import { storeToRefs } from 'pinia';
import {
  defaultReaderBodyRegexDisplayRuleId,
  regexDisplayProfilesTarget,
  regexDisplayReaderCleanupTarget,
  regexDisplayReaderTarget,
  useRegexDisplayStore,
} from './store';

const regexDisplay = useRegexDisplayStore();
const phone = usePhoneStore();
const settingsStore = useSettingsStore();
const { rules, settings } = storeToRefs(regexDisplay);
const activeRuleId = ref('');

const activeRule = computed(() => rules.value.find(rule => rule.id === activeRuleId.value) ?? rules.value[0] ?? null);
const regexTargets = computed(() => getRegexTargets());
const activeTarget = computed(() => regexTargets.value.find(target => target.id === activeRule.value?.targetId) ?? null);
const targetOptions = computed(() => regexTargets.value.map(target => ({ label: target.label, value: target.id })));
const ruleOptions = computed(() => rules.value.map(rule => ({
  group: regexTargets.value.find(target => target.id === rule.targetId)?.label || '其他',
  label: rule.name || '未命名规则',
  value: rule.id,
})));
const renderModeOptions = [
  { label: '文字', value: 'text' },
  { label: '网页', value: 'html' },
];
const fieldOptions = computed(() =>
  (activeTarget.value?.fields ?? ['content']).map(field => ({ label: field === 'title' ? '标题' : '正文', value: field })),
);
const operationOptions: Array<{ label: string; value: RegexRuleOperation }> = [
  { label: '提取', value: 'extract' },
  { label: '替换', value: 'replace' },
];
const previewRules = computed(() =>
  activeRule.value
    ? getRegexRulesForTarget(rules.value, activeRule.value.targetId, activeRule.value.field, activeRule.value.operation)
    : [],
);
const previewResult = computed(() =>
  activeRule.value?.operation === 'extract'
    ? extractWithRegexRules(settings.value.previewInput, previewRules.value)
    : applyRegexDisplayRules(settings.value.previewInput, previewRules.value),
);
const readerExtractRuleCount = computed(
  () => rules.value.filter(rule => rule.targetId === 'reader' && rule.operation === 'extract').length,
);
const readerCleanupRuleCount = computed(
  () => rules.value.filter(rule => rule.targetId === 'reader' && rule.operation === 'replace').length,
);
const previewSummary = computed(() => {
  if (previewResult.value.errors.length) return `有 ${previewResult.value.errors.length} 条规则报错`;
  if (!previewResult.value.applied.length) return '当前没有命中规则';
  return `已应用：${previewResult.value.applied.join('、')}`;
});

watch(
  rules,
  nextRules => {
    if (!nextRules.length) {
      activeRuleId.value = '';
      return;
    }
    if (!nextRules.some(rule => rule.id === activeRuleId.value)) {
      activeRuleId.value = nextRules[0].id;
    }
  },
  { immediate: true },
);

watch(
  () => [phone.currentRoute.appId, phone.currentRoute.params?.targetId, phone.currentRoute.params?.operation] as const,
  ([appId, targetId, operation]) => {
    if (appId !== 'regex-display' || !targetId) return;
    const normalizedOperation = operation === 'extract' ? 'extract' : 'replace';
    const existing = rules.value.find(rule => rule.targetId === targetId && rule.operation === normalizedOperation);
    if (existing) {
      activeRuleId.value = existing.id;
      return;
    }
    const target = regexTargets.value.find(item => item.id === targetId);
    const rule = regexDisplay.addRule({
      field: target?.fields[0] || 'content',
      name: `${target?.label || '目标 App'}${normalizedOperation === 'extract' ? '提取' : '替换'}`,
      operation: normalizedOperation,
      targetId,
    });
    activeRuleId.value = rule.id;
  },
  { immediate: true },
);

watch(
  () => [activeRule.value?.targetId, activeRule.value?.operation, activeRule.value?.field] as const,
  () => {
    const rule = activeRule.value;
    if (!rule) return;
    const target = activeTarget.value;
    if (target && !target.fields.includes(rule.field)) rule.field = target.fields[0] ?? 'content';
    if (target && !target.operations.includes(rule.operation)) rule.operation = target.operations[0] ?? 'replace';
    if (rule.targetId === 'reader') {
      rule.targets = [rule.operation === 'extract' ? regexDisplayReaderTarget : regexDisplayReaderCleanupTarget];
    } else if (rule.targetId === 'profiles') {
      rule.targets = [regexDisplayProfilesTarget];
    } else {
      rule.targets = [];
    }
  },
  { immediate: true },
);

function addNewRule() {
  const firstTarget = regexTargets.value[0];
  const rule = regexDisplay.addRule({
    targetId: firstTarget?.id || 'reader',
    field: firstTarget?.fields[0] || 'content',
    operation: firstTarget?.operations.includes('replace') ? 'replace' : firstTarget?.operations[0] || 'extract',
  });
  activeRuleId.value = rule.id;
}

function duplicateActiveRule() {
  if (!activeRule.value) return;
  const rule = regexDisplay.duplicateRule(activeRule.value.id);
  activeRuleId.value = rule.id;
}

async function deleteActiveRule() {
  if (!activeRule.value) return;
  if (activeRule.value.id === defaultReaderBodyRegexDisplayRuleId) {
    toastr.warning('默认正文规则不能删除，可以直接编辑它的内容');
    return;
  }
  const shouldDelete = await phone.confirmNotice(`要删除规则“${activeRule.value.name || '未命名规则'}”吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!shouldDelete) return;
  const deletedId = activeRule.value.id;
  regexDisplay.deleteRule(deletedId);
  toastr.success('已删除显示规则');
}
</script>

<style scoped>
.pc-regex-display-app {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pc-regex-card {
  padding: 14px;
  border: 1px solid var(--pc-border);
  border-radius: 20px;
  background: color-mix(in srgb, var(--pc-surface) 72%, transparent 28%);
}

.pc-regex-toolbar,
.pc-row,
.pc-action-grid {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pc-row-top {
  align-items: flex-start;
}

.pc-regex-card p {
  margin: 6px 0 0;
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.45;
}

.pc-select-field {
  margin-top: 14px;
}

.pc-area.preview-source {
  min-height: 150px;
}

.mono {
  font-family:
    SFMono-Regular,
    Consolas,
    Liberation Mono,
    monospace;
}

.pc-toggle-row,
.pc-target-pill {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 18px;
  background: var(--pc-surface-strong);
}

.pc-target-pill {
  justify-content: flex-start;
  width: fit-content;
  min-height: 42px;
  margin-top: 0;
  font-weight: 700;
}

.pc-target-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pc-target-row .pc-target-pill {
  margin-top: 0;
}

.pc-target-pill input {
  accent-color: var(--pc-theme-accent);
  margin: 0;
}

.pc-inline-grid.two-cols {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.pc-action-grid {
  margin-top: 14px;
}

.pc-rule-order-actions,
.pc-regex-operation-segment {
  display: flex;
  gap: 8px;
}

.pc-regex-operation-segment .pc-segment-btn {
  flex: 1 1 0;
}

.pc-soft-btn.compact {
  margin-top: 0;
}

.pc-regex-add-btn {
  flex: 0 0 auto;
  white-space: nowrap;
}

.pc-error-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.pc-error-list span {
  padding: 9px 10px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--pc-danger) 16%, var(--pc-surface-strong) 84%);
  color: var(--pc-danger);
  font-size: 12px;
  line-height: 1.4;
}

.pc-preview-box {
  margin-top: 14px;
}

.pc-preview-box pre {
  min-height: 160px;
  max-height: 360px;
  margin: 0;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  border: 1px solid var(--pc-border);
  border-radius: 18px;
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  padding: 14px;
  font: inherit;
  line-height: 1.6;
}
</style>
