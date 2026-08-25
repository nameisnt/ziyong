<template>
  <section class="pc-regex-display-app">
    <section class="pc-compact-toolbar pc-regex-toolbar">
      <span>{{ `${extractRuleCount} 条提取 · ${displayRuleCount} 条显示` }}</span>
      <InfoHint :text="t`提取规则用于从楼层创建内容；替换规则只改变显示结果，不会改动已保存原文。`" />
      <button
        v-if="activeView === 'rules'"
        class="pc-icon-btn"
        type="button"
        :title="t`新增规则`"
        :aria-label="t`新增规则`"
        @click="addNewRule"
      >
        <i class="fa-solid fa-plus"></i>
      </button>
    </section>

    <div class="pc-regex-view-tabs">
      <button
        :class="['pc-segment-btn', { active: activeView === 'rules' }]"
        type="button"
        @click="activeView = 'rules'"
      >
        {{ t`规则库` }}
      </button>
      <button
        :class="['pc-segment-btn', { active: activeView === 'usage' }]"
        type="button"
        @click="activeView = 'usage'"
      >
        {{ t`使用设置` }}
      </button>
    </div>

    <section v-if="activeView === 'rules' && rules.length" class="pc-page-section">
      <div class="pc-select-field">
        <label class="pc-field-label">{{ t`当前规则` }}</label>
        <SearchableCombobox v-model="activeRuleId" :options="ruleOptions" :placeholder="t`选择或搜索规则`" />
      </div>

      <article v-if="activeRule" class="pc-rule-editor">
        <div class="pc-select-field">
          <label class="pc-field-label">{{ t`规则名称` }}</label>
          <input v-model="activeRule.name" class="pc-field" type="text" :placeholder="t`例如：资料表头像卡片`" />
        </div>

        <div class="pc-select-field">
          <label class="pc-field-label">
            {{ t`处理方式` }}
            <InfoHint
              :text="
                t`提取用于从聊天楼层创建内容，只采用第一条成功命中的规则；替换按顺序处理显示内容，不修改已保存原文。`
              "
            />
          </label>
          <div class="pc-regex-operation-segment">
            <button
              v-for="operation in operationOptions"
              :key="operation.value"
              :class="['pc-segment-btn', { active: activeRule.operation === operation.value }]"
              type="button"
              @click="activeRule.operation = operation.value"
            >
              {{ operation.label }}
            </button>
          </div>
        </div>

        <div class="pc-inline-grid two-cols">
          <div class="pc-select-field">
            <label class="pc-field-label">{{ t`输出显示` }}</label>
            <SearchableCombobox
              v-model="activeRule.renderMode"
              :options="renderModeOptions"
              :placeholder="t`选择显示方式`"
            />
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
            <span>{{ `优先级 ${activeRuleIndex + 1} / ${rules.length}` }}</span>
            <button
              class="pc-icon-btn"
              type="button"
              :disabled="activeRuleIndex <= 0"
              :title="t`提高优先级`"
              :aria-label="t`提高优先级`"
              @click="regexDisplay.moveRule(activeRule.id, -1)"
            >
              <i class="fa-solid fa-arrow-up"></i>
            </button>
            <button
              class="pc-icon-btn"
              type="button"
              :disabled="activeRuleIndex < 0 || activeRuleIndex >= rules.length - 1"
              :title="t`降低优先级`"
              :aria-label="t`降低优先级`"
              @click="regexDisplay.moveRule(activeRule.id, 1)"
            >
              <i class="fa-solid fa-arrow-down"></i>
            </button>
          </div>
          <button
            class="pc-icon-btn"
            type="button"
            :title="t`复制规则`"
            :aria-label="t`复制规则`"
            @click="duplicateActiveRule"
          >
            <i class="fa-solid fa-copy"></i>
          </button>
          <button
            class="pc-icon-btn danger"
            type="button"
            :title="t`删除规则`"
            :aria-label="t`删除规则`"
            @click="deleteActiveRule"
          >
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </article>
    </section>

    <EmptyState v-else-if="activeView === 'rules'" :title="t`还没有显示规则`">
      <p>{{ t`新增一条规则后，可以在下方用示例文本测试替换效果。` }}</p>
    </EmptyState>

    <section v-else class="pc-page-section pc-regex-usage-panel">
      <label class="pc-field-group">
        <span class="pc-field-label">{{ t`选择 App` }}</span>
        <SearchableCombobox v-model="usageAppId" :options="appOptions" :placeholder="t`选择或搜索 App`" />
      </label>

      <template v-if="activeUsage">
        <div class="pc-inline-grid two-cols">
          <label class="pc-field-group">
            <span class="pc-field-label">{{ t`标题提取` }}</span>
            <SearchableCombobox
              :model-value="activeUsage.titleRuleId"
              :options="extractRuleOptions"
              :placeholder="t`无正则`"
              @update:model-value="regexDisplay.setExtractionRule(usageAppId, 'title', $event)"
            />
          </label>
          <label class="pc-field-group">
            <span class="pc-field-label">{{ t`正文提取` }}</span>
            <SearchableCombobox
              :model-value="activeUsage.contentRuleId"
              :options="extractRuleOptions"
              :placeholder="t`无正则`"
              @update:model-value="regexDisplay.setExtractionRule(usageAppId, 'content', $event)"
            />
          </label>
        </div>

        <div class="pc-select-field">
          <label class="pc-field-label">
            {{ t`正文显示规则` }}
            <InfoHint :text="t`只改变页面显示，不修改保存内容、版本、引用、导出或内容转换。`" />
          </label>
          <input v-model="usageRuleQuery" class="pc-field" type="search" :placeholder="t`搜索显示规则`" />
          <div class="pc-regex-target-list">
            <label v-for="rule in filteredDisplayRules" :key="rule.id" class="pc-regex-target-option">
              <input
                type="checkbox"
                :checked="activeUsage.displayRuleIds.includes(rule.id)"
                @change="
                  regexDisplay.setDisplayRuleEnabled(usageAppId, rule.id, ($event.target as HTMLInputElement).checked)
                "
              />
              <span>{{ rule.name || t`未命名规则` }}</span>
            </label>
            <p v-if="!filteredDisplayRules.length">{{ t`还没有可用的替换规则` }}</p>
          </div>
        </div>
      </template>
    </section>

    <section v-if="activeView === 'rules'" class="pc-page-section pc-regex-preview-section">
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
import { applyRegexDisplayRules, extractWithRegexRules, getRegexRulesByOperation } from '@/util/regexDisplay';
import { storeToRefs } from 'pinia';
import { defaultReaderBodyRegexDisplayRuleId, useRegexDisplayStore } from './store';

const regexDisplay = useRegexDisplayStore();
const phone = usePhoneStore();
const settingsStore = useSettingsStore();
const { rules, settings } = storeToRefs(regexDisplay);
const activeRuleId = ref('');
const activeView = ref<'rules' | 'usage'>('rules');
const usageAppId = ref('reader');
const usageRuleQuery = ref('');

const activeRule = computed(() => rules.value.find(rule => rule.id === activeRuleId.value) ?? rules.value[0] ?? null);
const activeRuleIndex = computed(() => rules.value.findIndex(rule => rule.id === activeRule.value?.id));
const ruleOptions = computed(() =>
  rules.value.map((rule, index) => ({
    group: rule.operation === 'extract' ? '提取规则' : '显示规则',
    label: `${String(index + 1).padStart(2, '0')} · ${rule.name || '未命名规则'}`,
    value: rule.id,
  })),
);
const renderModeOptions = [
  { label: '文字', value: 'text' },
  { label: '网页', value: 'html' },
];
const operationOptions: Array<{ label: string; value: RegexRuleOperation }> = [
  { label: '提取', value: 'extract' },
  { label: '替换', value: 'replace' },
];
const appOptions = computed(() => getRegexTargets().map(target => ({ label: target.label, value: target.id })));
const extractRules = computed(() => getRegexRulesByOperation(rules.value, 'extract'));
const displayRules = computed(() => getRegexRulesByOperation(rules.value, 'replace'));
const extractRuleOptions = computed(() => [
  { label: '无正则', value: '' },
  ...extractRules.value.map(rule => ({ label: rule.name || '未命名规则', value: rule.id })),
]);
const activeUsage = computed(() => (usageAppId.value ? regexDisplay.getUsage(usageAppId.value) : null));
const filteredDisplayRules = computed(() => {
  const query = usageRuleQuery.value.trim().toLowerCase();
  return displayRules.value.filter(rule => !query || `${rule.name}\n${rule.pattern}`.toLowerCase().includes(query));
});
const previewResult = computed(() =>
  activeRule.value?.operation === 'extract'
    ? extractWithRegexRules(settings.value.previewInput, activeRule.value ? [activeRule.value] : [])
    : applyRegexDisplayRules(settings.value.previewInput, activeRule.value ? [activeRule.value] : []),
);
const extractRuleCount = computed(() => extractRules.value.length);
const displayRuleCount = computed(() => displayRules.value.length);
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
  ([appId, targetId]) => {
    if (appId !== 'regex-display' || !targetId) return;
    usageAppId.value = targetId;
    activeView.value = 'usage';
  },
  { immediate: true },
);

function addNewRule() {
  const rule = regexDisplay.addRule({ operation: 'replace' });
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

.pc-regex-view-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
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

.pc-regex-display-app p {
  margin: 6px 0 0;
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.45;
}

.pc-select-field {
  margin-top: 14px;
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
  border-radius: min(var(--pc-control-radius), 8px);
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
  align-items: center;
  gap: 8px;
}

.pc-rule-order-actions > span {
  color: var(--pc-muted);
  font-size: 12px;
  white-space: nowrap;
}

.pc-regex-target-list {
  display: grid;
  max-height: 220px;
  margin-top: 8px;
  overflow-y: auto;
  border: 1px solid var(--pc-border);
  background: var(--pc-surface-strong);
}

.pc-regex-target-option {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 8px 12px;
}

.pc-regex-target-option + .pc-regex-target-option {
  border-top: 1px solid var(--pc-border);
}

.pc-regex-target-option input {
  margin: 0;
  accent-color: var(--pc-theme-accent);
}

.pc-regex-target-list p {
  padding: 10px 12px;
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
  border-radius: min(var(--pc-card-radius), 8px);
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  padding: 14px;
  font: inherit;
  line-height: 1.6;
}
</style>
