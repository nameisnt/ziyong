<template>
  <section class="pc-regex-display-app">
    <section class="pc-regex-card pc-regex-toolbar">
      <div>
        <strong>
          {{ t`正则显示设置` }}
          <InfoHint :text="t`只负责把原文经过正则替换后预览成文字或网页；不会改动原始内容。后续资料表等 App 可以复用这些规则。`" />
        </strong>
        <p>{{ `${rules.length} 条规则，${readerExtractRuleCount} 条正文抽取，${readerCleanupRuleCount} 条正文清理` }}</p>
      </div>
      <button class="pc-soft-btn compact" type="button" @click="addNewRule">
        <i class="fa-solid fa-plus"></i>
        <span>{{ t`新增` }}</span>
      </button>
    </section>

    <section v-if="rules.length" class="pc-regex-card">
      <div class="pc-select-field">
        <label class="pc-field-label">{{ t`当前规则` }}</label>
        <select v-model="activeRuleId" class="pc-select">
          <option v-for="rule in rules" :key="rule.id" :value="rule.id">
            {{ rule.name || '未命名规则' }}
          </option>
        </select>
      </div>

      <article v-if="activeRule" class="pc-rule-editor">
        <div class="pc-select-field">
          <label class="pc-field-label">{{ t`规则名称` }}</label>
          <input v-model="activeRule.name" class="pc-field" type="text" :placeholder="t`例如：资料表头像卡片`" />
        </div>

        <div class="pc-select-field">
          <label class="pc-field-label">
            {{ t`应用位置` }}
            <InfoHint :text="t`楼层正文提取用于阅读聊天和总结集导入；正文清理会在提取后继续替换。资料表格式会按顺序应用全部已启用规则。`" />
          </label>
          <div class="pc-target-row">
            <label class="pc-target-pill">
              <input
                :checked="activeRule.targets.includes(regexDisplayReaderTarget)"
                type="checkbox"
                @change="setActiveRuleTarget(regexDisplayReaderTarget, ($event.target as HTMLInputElement).checked)"
              />
              <span>{{ t`楼层正文提取` }}</span>
            </label>
            <label class="pc-target-pill">
              <input
                :checked="activeRule.targets.includes(regexDisplayReaderCleanupTarget)"
                type="checkbox"
                @change="setActiveRuleTarget(regexDisplayReaderCleanupTarget, ($event.target as HTMLInputElement).checked)"
              />
              <span>{{ t`正文清理` }}</span>
            </label>
            <label class="pc-target-pill">
              <input
                :checked="activeRule.targets.includes(regexDisplayProfilesTarget)"
                type="checkbox"
                @change="setActiveRuleTarget(regexDisplayProfilesTarget, ($event.target as HTMLInputElement).checked)"
              />
              <span>{{ t`资料表格式` }}</span>
            </label>
          </div>
        </div>

        <div class="pc-inline-grid two-cols">
          <div class="pc-select-field">
            <label class="pc-field-label">{{ t`输出显示` }}</label>
            <select v-model="activeRule.renderMode" class="pc-select">
              <option value="text">{{ t`文字` }}</option>
              <option value="html">{{ t`网页` }}</option>
            </select>
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
          <textarea v-model="activeRule.pattern" class="pc-area compact mono" :placeholder="t`填写 JS 正则主体，不需要写两侧 / /`"></textarea>
        </div>

        <div class="pc-select-field">
          <label class="pc-field-label">
            {{ t`替换模板` }}
            <InfoHint :text="t`可使用 $1、$<name> 这类 JS replace 捕获组。选择网页时，替换结果会按 HTML 片段预览。`" />
          </label>
          <textarea v-model="activeRule.replacement" class="pc-area mono" :placeholder="t`例如：<section class='profile'>$1</section>`"></textarea>
        </div>

        <div class="pc-action-grid">
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
        <textarea v-model="settings.previewInput" class="pc-area preview-source" :placeholder="t`把资料表、楼层片段或任意文本放在这里测试。`"></textarea>
      </div>

      <div v-if="previewResult.errors.length" class="pc-error-list">
        <span v-for="error in previewResult.errors" :key="error">{{ error }}</span>
      </div>

      <div class="pc-preview-box">
        <FrontendFrame
          v-if="previewResult.renderMode === 'html'"
          :active="true"
          :content="previewResult.content"
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
import { usePhoneStore } from '@/store/phone';
import { useSettingsStore } from '@/store/settings';
import { applyRegexDisplayRules } from '@/util/regexDisplay';
import { storeToRefs } from 'pinia';
import { defaultReaderBodyRegexDisplayRuleId, regexDisplayProfilesTarget, regexDisplayReaderCleanupTarget, regexDisplayReaderTarget, useRegexDisplayStore } from './store';

const regexDisplay = useRegexDisplayStore();
const phone = usePhoneStore();
const settingsStore = useSettingsStore();
const { rules, settings } = storeToRefs(regexDisplay);
const activeRuleId = ref('');

const activeRule = computed(() => rules.value.find(rule => rule.id === activeRuleId.value) ?? rules.value[0] ?? null);
const previewResult = computed(() => applyRegexDisplayRules(settings.value.previewInput, rules.value));
const readerExtractRuleCount = computed(() => rules.value.filter(rule => rule.targets.includes(regexDisplayReaderTarget)).length);
const readerCleanupRuleCount = computed(() => rules.value.filter(rule => rule.targets.includes(regexDisplayReaderCleanupTarget)).length);
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

function addNewRule() {
  const rule = regexDisplay.addRule();
  activeRuleId.value = rule.id;
}

function duplicateActiveRule() {
  if (!activeRule.value) return;
  const rule = regexDisplay.duplicateRule(activeRule.value.id);
  activeRuleId.value = rule.id;
}

function setActiveRuleTarget(target: string, enabled: boolean) {
  if (!activeRule.value) return;
  activeRule.value.targets = enabled
    ? [...new Set([...activeRule.value.targets, target])]
    : activeRule.value.targets.filter(item => item !== target);
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
  font-family: SFMono-Regular, Consolas, Liberation Mono, monospace;
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

.pc-soft-btn.compact {
  margin-top: 0;
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
