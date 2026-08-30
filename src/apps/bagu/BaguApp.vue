<template>
  <section class="pc-bagu-app">
    <section class="pc-bagu-page">
      <section class="pc-page-section pc-bagu-panel pc-rule-manager">
        <div class="pc-panel-head">
          <div>
            <strong>{{ t`规则管理` }}</strong>
            <p>{{ ruleOverview }}</p>
          </div>
          <div class="pc-panel-actions">
            <button
              class="pc-soft-btn compact"
              type="button"
              :disabled="!visibleRules.length"
              @click="setVisibleRulesEnabled(true)"
            >
              {{ t`启用可见` }}
            </button>
            <button
              class="pc-soft-btn compact"
              type="button"
              :disabled="!visibleRules.length"
              @click="setVisibleRulesEnabled(false)"
            >
              {{ t`停用可见` }}
            </button>
          </div>
        </div>
        <label class="pc-search-field pc-rule-search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="ruleQuery" type="search" :placeholder="t`搜索命中词、替换词或句式`" />
        </label>
      </section>

      <section class="pc-page-section pc-bagu-panel">
        <div class="pc-panel-head">
          <button class="pc-section-toggle" type="button" @click="lexicalOpen = !lexicalOpen">
            <span>{{ t`词汇` }}</span>
            <small>{{ replacementRuleStat }}</small>
            <i class="fa-solid fa-chevron-down" :data-open="lexicalOpen"></i>
          </button>
          <div class="pc-panel-actions">
            <button
              class="pc-icon-btn"
              type="button"
              :title="t`新增词汇规则`"
              :aria-label="t`新增词汇规则`"
              @click="addReplacementRule"
            >
              <i class="fa-solid fa-plus"></i>
            </button>
            <button
              class="pc-icon-btn"
              type="button"
              :title="t`恢复默认词汇规则`"
              :aria-label="t`恢复默认词汇规则`"
              @click="resetRules('replacement')"
            >
              <i class="fa-solid fa-rotate-left"></i>
            </button>
          </div>
        </div>

        <div v-show="lexicalOpen" class="pc-rule-table">
          <div v-for="rule in visibleReplacementRules" :key="rule.id" class="pc-rule-row lexical">
            <label class="pc-check">
              <input
                :checked="rule.enabled"
                type="checkbox"
                @change="setRuleEnabled(rule, ($event.target as HTMLInputElement).checked)"
              />
            </label>
            <input
              class="pc-field pc-rule-input"
              :value="getReplacementSourcesDraft(rule)"
              type="text"
              autocomplete="off"
              :placeholder="t`命中词，用 / 分隔`"
              @input="updateReplacementSourcesDraft(rule.id, $event)"
              @blur="commitReplacementSourcesDraft(rule)"
            />
            <input
              class="pc-field pc-rule-input"
              :value="getReplacementCandidatesDraft(rule)"
              type="text"
              autocomplete="off"
              :placeholder="t`替换词，用 / 分隔`"
              @input="updateReplacementCandidatesDraft(rule.id, $event)"
              @blur="commitReplacementCandidatesDraft(rule)"
            />
            <button
              class="pc-icon-btn danger"
              type="button"
              :title="t`删除`"
              :aria-label="t`删除`"
              @click="removeRule(rule.id)"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div v-if="!visibleReplacementRules.length" class="pc-empty-row">
            {{ ruleQuery.trim() ? t`没有匹配的词汇规则` : t`暂无词汇规则` }}
          </div>
        </div>
      </section>

      <section class="pc-page-section pc-bagu-panel">
        <div class="pc-panel-head">
          <button class="pc-section-toggle" type="button" @click="templateOpen = !templateOpen">
            <span>{{ t`句式` }}</span>
            <small>{{ templateRuleStat }}</small>
            <i class="fa-solid fa-chevron-down" :data-open="templateOpen"></i>
          </button>
          <div class="pc-panel-actions">
            <button
              class="pc-icon-btn"
              type="button"
              :title="t`新增句式规则`"
              :aria-label="t`新增句式规则`"
              @click="addTemplateRule"
            >
              <i class="fa-solid fa-plus"></i>
            </button>
            <button
              class="pc-icon-btn"
              type="button"
              :title="t`恢复默认句式规则`"
              :aria-label="t`恢复默认句式规则`"
              @click="resetRules('template')"
            >
              <i class="fa-solid fa-rotate-left"></i>
            </button>
          </div>
        </div>

        <div v-show="templateOpen" class="pc-rule-table">
          <div class="pc-template-help">
            {{ t`模板写法：\`{A|B}\` 表示二选一，\`[A|B]\` 表示可选，\`…\` 表示中间任意内容。` }}
          </div>
          <div v-for="rule in visibleTemplateRules" :key="rule.id" class="pc-rule-row template">
            <label class="pc-check">
              <input
                :checked="rule.enabled"
                type="checkbox"
                @change="setRuleEnabled(rule, ($event.target as HTMLInputElement).checked)"
              />
            </label>
            <input
              class="pc-field pc-rule-input"
              :value="rule.template"
              type="text"
              :placeholder="t`句式模板`"
              @input="updateTemplateRule(rule, String(($event.target as HTMLInputElement).value), rule.suggestion)"
            />
            <input
              class="pc-field pc-rule-input"
              :value="rule.suggestion"
              type="text"
              :placeholder="templateReplacementPlaceholder"
              @input="updateTemplateRule(rule, rule.template, String(($event.target as HTMLInputElement).value))"
            />
            <button
              class="pc-icon-btn danger"
              type="button"
              :title="t`删除`"
              :aria-label="t`删除`"
              @click="removeRule(rule.id)"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div v-if="!visibleTemplateRules.length" class="pc-empty-row">
            {{ ruleQuery.trim() ? t`没有匹配的句式规则` : t`暂无句式规则` }}
          </div>
        </div>
      </section>
    </section>
  </section>
</template>

<script setup lang="ts">
import { type BaguRule, useBaguStore } from '@/store/bagu';
import { usePhoneStore } from '@/store/phone';
import { storeToRefs } from 'pinia';

const bagu = useBaguStore();
const phone = usePhoneStore();
const { rules } = storeToRefs(bagu);

const lexicalOpen = ref(true);
const templateOpen = ref(true);
const ruleQuery = ref('');
const replacementSourceDrafts = ref<Record<string, string>>({});
const replacementCandidateDrafts = ref<Record<string, string>>({});
const templateReplacementPlaceholder = '替换句式，可用 {{中间内容}}，留空删除';

const replacementRules = computed(() => rules.value.filter(rule => rule.type === 'replacement'));
const templateRules = computed(() => rules.value.filter(rule => rule.type === 'template'));
const normalizedRuleQuery = computed(() => ruleQuery.value.trim().toLowerCase());
const visibleReplacementRules = computed(() => replacementRules.value.filter(matchesRuleQuery));
const visibleTemplateRules = computed(() => templateRules.value.filter(matchesRuleQuery));
const visibleRules = computed(() => [...visibleReplacementRules.value, ...visibleTemplateRules.value]);
const replacementRuleStat = computed(() => formatRuleStat(replacementRules.value, visibleReplacementRules.value));
const templateRuleStat = computed(() => formatRuleStat(templateRules.value, visibleTemplateRules.value));
const ruleOverview = computed(() => {
  const total = replacementRules.value.length + templateRules.value.length;
  const enabled = [...replacementRules.value, ...templateRules.value].filter(rule => rule.enabled).length;
  const visibleSuffix = normalizedRuleQuery.value ? ` · 可见 ${visibleRules.value.length}` : '';
  return `共 ${total} 条，${enabled} 条启用${visibleSuffix}`;
});

function matchesRuleQuery(rule: BaguRule) {
  const query = normalizedRuleQuery.value;
  if (!query) return true;
  const text = [
    rule.title,
    rule.note,
    rule.pattern,
    rule.suggestion,
    rule.template,
    ...rule.sources,
    ...rule.replacements,
  ]
    .join(' ')
    .toLowerCase();
  return text.includes(query);
}

function formatRuleStat(allRules: BaguRule[], visible: BaguRule[]) {
  const enabled = allRules.filter(rule => rule.enabled).length;
  const visibleSuffix = normalizedRuleQuery.value ? ` · 可见 ${visible.length}` : '';
  return `${enabled}/${allRules.length}${visibleSuffix}`;
}

function splitRuleList(text: string) {
  return text
    .split(/[/／|、，,\n]/g)
    .map(item => item.trim())
    .filter(Boolean);
}

function formatList(items: string[]) {
  return items.join(' / ');
}

function getReplacementSourcesDraft(rule: BaguRule) {
  return replacementSourceDrafts.value[rule.id] ?? formatList(rule.sources);
}

function getReplacementCandidatesDraft(rule: BaguRule) {
  return replacementCandidateDrafts.value[rule.id] ?? formatList(rule.replacements);
}

function syncReplacementDrafts() {
  const nextSourceDrafts: Record<string, string> = {};
  const nextCandidateDrafts: Record<string, string> = {};

  replacementRules.value.forEach(rule => {
    nextSourceDrafts[rule.id] = replacementSourceDrafts.value[rule.id] ?? formatList(rule.sources);
    nextCandidateDrafts[rule.id] = replacementCandidateDrafts.value[rule.id] ?? formatList(rule.replacements);
  });

  replacementSourceDrafts.value = nextSourceDrafts;
  replacementCandidateDrafts.value = nextCandidateDrafts;
}

function getInputValue(event: Event) {
  return (event.target as HTMLInputElement | null)?.value ?? '';
}

function updateReplacementSourcesDraft(ruleId: string, event: Event) {
  replacementSourceDrafts.value = {
    ...replacementSourceDrafts.value,
    [ruleId]: getInputValue(event),
  };
}

function updateReplacementCandidatesDraft(ruleId: string, event: Event) {
  replacementCandidateDrafts.value = {
    ...replacementCandidateDrafts.value,
    [ruleId]: getInputValue(event),
  };
}

function buildReplacementTitle(sources: string[]) {
  return sources.length ? sources.join('/') : '未命名词汇规则';
}

function buildTemplateTitle(template: string) {
  return template.trim() || '未命名句式规则';
}

function setRuleEnabled(rule: BaguRule, enabled: boolean) {
  bagu.updateRule(rule.id, {
    enabled,
    flags: rule.flags,
    note: rule.note,
    pattern: rule.pattern,
    replacements: rule.replacements,
    sources: rule.sources,
    suggestion: rule.suggestion,
    targets: rule.targets,
    template: rule.template,
    title: rule.title,
    type: rule.type,
  });
}

function updateReplacementRule(rule: BaguRule, sources: string[], replacements: string[]) {
  bagu.updateRule(rule.id, {
    enabled: rule.enabled,
    note: rule.note,
    replacements,
    sources,
    template: '',
    title: buildReplacementTitle(sources),
    type: 'replacement',
  });
}

function commitReplacementSourcesDraft(rule: BaguRule) {
  const sources = splitRuleList(getReplacementSourcesDraft(rule));
  updateReplacementRule(rule, sources, rule.replacements);
  replacementSourceDrafts.value = {
    ...replacementSourceDrafts.value,
    [rule.id]: formatList(sources),
  };
}

function commitReplacementCandidatesDraft(rule: BaguRule) {
  const replacements = splitRuleList(getReplacementCandidatesDraft(rule));
  updateReplacementRule(rule, rule.sources, replacements);
  replacementCandidateDrafts.value = {
    ...replacementCandidateDrafts.value,
    [rule.id]: formatList(replacements),
  };
}

function commitAllReplacementDrafts() {
  replacementRules.value.forEach(rule => {
    commitReplacementSourcesDraft(rule);
    commitReplacementCandidatesDraft(rule);
  });
}

function updateTemplateRule(rule: BaguRule, template: string, suggestion: string) {
  bagu.updateRule(rule.id, {
    enabled: rule.enabled,
    note: rule.note,
    replacements: [],
    sources: [],
    suggestion,
    template,
    title: buildTemplateTitle(template),
    type: 'template',
  });
}

function addReplacementRule() {
  lexicalOpen.value = true;
  bagu.createRule({
    note: '',
    replacements: [],
    sources: [],
    title: '未命名词汇规则',
    type: 'replacement',
  });
  syncReplacementDrafts();
}

function addTemplateRule() {
  templateOpen.value = true;
  bagu.createRule({
    note: '',
    template: '',
    title: '未命名句式规则',
    type: 'template',
  });
}

function setVisibleRulesEnabled(enabled: boolean) {
  visibleRules.value.forEach(rule => {
    setRuleEnabled(rule, enabled);
  });
  toastr.success(enabled ? '已启用可见规则' : '已停用可见规则');
}

function resetRules(type: BaguRule['type']) {
  if (type === 'replacement') {
    replacementSourceDrafts.value = {};
    replacementCandidateDrafts.value = {};
  }
  bagu.resetRulesByType(type);
  if (type === 'replacement') {
    syncReplacementDrafts();
    lexicalOpen.value = true;
  }
  if (type === 'template') templateOpen.value = true;
  toastr.success('已恢复默认规则');
}

async function removeRule(ruleId: string) {
  const rule = rules.value.find(item => item.id === ruleId);
  if (!rule) return;
  const confirmed = await phone.confirmNotice(`要删除八股规则“${rule.title || '未命名规则'}”吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
    title: '删除八股规则？',
  });
  if (!confirmed) return;
  bagu.deleteRule(ruleId);
  const nextSourceDrafts = { ...replacementSourceDrafts.value };
  const nextCandidateDrafts = { ...replacementCandidateDrafts.value };
  delete nextSourceDrafts[ruleId];
  delete nextCandidateDrafts[ruleId];
  replacementSourceDrafts.value = nextSourceDrafts;
  replacementCandidateDrafts.value = nextCandidateDrafts;
}

syncReplacementDrafts();
onBeforeUnmount(commitAllReplacementDrafts);
</script>

<style scoped>
.pc-bagu-app,
.pc-bagu-page {
  min-height: 100%;
}

.pc-bagu-app {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pc-bagu-page {
  display: grid;
  align-content: start;
  gap: 0;
}

.pc-bagu-panel {
  gap: 8px;
  overflow: hidden;
}

.pc-rule-manager p {
  margin: 5px 0 0;
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.45;
}

.pc-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-rule-search {
  margin-bottom: 4px;
}

.pc-section-toggle {
  border: 0;
  color: var(--pc-text);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 0;
  background: transparent;
  font-size: 16px;
  font-weight: 700;
}

.pc-section-toggle i {
  font-size: 12px;
  transition: transform 0.16s ease;
}

.pc-section-toggle i[data-open='true'] {
  transform: rotate(180deg);
}

.pc-section-toggle small {
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 800;
}

.pc-panel-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.pc-rule-table {
  display: grid;
  gap: 10px;
}

.pc-rule-row {
  display: grid;
  gap: 8px;
  align-items: center;
}

.pc-rule-row.lexical {
  grid-template-columns: 24px minmax(0, 1fr) minmax(0, 1fr) 42px 42px;
}

.pc-rule-row.template {
  grid-template-columns: 24px minmax(0, 1fr) minmax(0, 1fr) 42px;
}

.pc-rule-row.regex {
  grid-template-columns: 24px minmax(92px, 0.8fr) minmax(150px, 1.35fr) minmax(110px, 1fr) 70px 94px 42px;
}

.pc-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 40px;
}

.pc-check input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--pc-theme-accent);
}

.pc-rule-input {
  min-width: 0;
}

.pc-template-help {
  border-left: 2px solid var(--pc-border);
  color: var(--pc-muted);
  padding: 6px 10px;
  line-height: 1.55;
}

.pc-empty-row {
  color: var(--pc-muted);
  padding: 8px 2px;
}
</style>
