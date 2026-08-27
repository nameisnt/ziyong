<template>
  <section v-if="route.page === 'root'" class="pc-status-settings-page">
    <div v-if="configError" class="pc-error-list">
      <span>{{ configError }}</span>
    </div>

    <section v-if="schemes.length" class="pc-status-enabled-panel">
      <header class="pc-section-head">
        <strong>当前聊天启用</strong>
        <span>{{ `${enabledSchemeIds.length} 个` }}</span>
      </header>
      <label v-for="scheme in schemes" :key="scheme.id" class="pc-list-row pc-status-enable-row">
        <input
          type="checkbox"
          :checked="enabledSchemeIds.includes(scheme.id)"
          @change="toggleEnabledScheme(scheme.id, ($event.target as HTMLInputElement).checked)"
        />
        <i class="fa-solid" :class="scheme.source === 'mvu' ? 'fa-database' : 'fa-code'"></i>
        <span>{{ scheme.name }}</span>
      </label>
    </section>

    <section class="pc-compact-toolbar">
      <span>{{ `${schemes.length} 个方案` }}</span>
      <button class="pc-icon-btn primary" type="button" title="新增方案" aria-label="新增方案" @click="createScheme">
        <i class="fa-solid fa-plus"></i>
      </button>
    </section>

    <div v-if="schemes.length" class="pc-status-scheme-list">
      <article v-for="scheme in schemes" :key="scheme.id" class="pc-list-row pc-status-scheme-row">
        <button class="pc-status-scheme-main" type="button" @click="editScheme(scheme)">
          <i class="fa-solid" :class="scheme.source === 'mvu' ? 'fa-database' : 'fa-code'"></i>
          <span>
            <strong>{{ scheme.name }}</strong>
            <small>{{ scheme.source === 'mvu' ? `MVU · ${mvuScopeLabel(scheme.mvuScope)}` : '固定文字正则' }}</small>
          </span>
        </button>
        <button
          class="pc-icon-btn"
          type="button"
          title="复制方案"
          aria-label="复制方案"
          @click="duplicateScheme(scheme)"
        >
          <i class="fa-solid fa-copy"></i>
        </button>
        <button
          class="pc-icon-btn danger"
          type="button"
          title="删除方案"
          aria-label="删除方案"
          @click="deleteScheme(scheme)"
        >
          <i class="fa-solid fa-trash"></i>
        </button>
      </article>
    </div>
    <EmptyState v-else title="还没有状态方案" />
  </section>

  <section v-else-if="route.page === 'editor' && editorDraft" class="pc-status-editor-page">
    <label class="pc-field-group">
      <span class="pc-field-label">方案名称</span>
      <input v-model="editorDraft.name" class="pc-field" type="text" />
    </label>

    <div class="pc-segment pc-status-source-tabs" aria-label="数据来源">
      <button
        :class="['pc-segment-btn', { active: editorDraft.source === 'regex' }]"
        type="button"
        @click="editorDraft.source = 'regex'"
      >
        固定文字
      </button>
      <button
        :class="['pc-segment-btn', { active: editorDraft.source === 'mvu' }]"
        type="button"
        @click="selectMvuSource"
      >
        MVU 变量
      </button>
    </div>

    <section v-if="editorDraft.source === 'regex'" class="pc-section-card pc-status-regex-settings">
      <label class="pc-field-group">
        <span class="pc-field-label">状态文字提取</span>
        <SearchableCombobox
          :model-value="editorRegexUsage?.contentRuleId || ''"
          :options="extractRuleOptions"
          placeholder="选择提取规则"
          @update:model-value="setEditorExtractRule"
        />
      </label>
      <details class="pc-status-display-rules" open>
        <summary>网页替换规则 · {{ editorRegexUsage?.displayRuleIds.length || 0 }}</summary>
        <div v-if="displayRules.length">
          <label v-for="rule in displayRules" :key="rule.id">
            <input
              type="checkbox"
              :checked="editorRegexUsage?.displayRuleIds.includes(rule.id)"
              @change="toggleEditorDisplayRule(rule.id, ($event.target as HTMLInputElement).checked)"
            />
            <span>{{ rule.name || '未命名规则' }}</span>
          </label>
        </div>
        <p v-else>还没有替换规则</p>
      </details>
    </section>

    <template v-else>
      <label class="pc-field-group">
        <span class="pc-field-label">变量范围</span>
        <SearchableCombobox
          :model-value="editorDraft.mvuScope"
          :options="mvuScopeOptions"
          @update:model-value="changeEditorMvuScope"
        />
      </label>

      <label class="pc-field-group">
        <span class="pc-field-label">网页模板</span>
        <textarea
          ref="templateArea"
          v-model="editorDraft.template"
          class="pc-area mono pc-status-template-area"
          placeholder="使用 {{mvu:角色.状态}} 插入变量"
        ></textarea>
      </label>

      <section class="pc-status-variable-panel">
        <header>
          <strong>变量</strong>
          <button class="pc-icon-btn" type="button" title="刷新变量" aria-label="刷新变量" @click="loadEditorVariables">
            <i class="fa-solid fa-rotate-right" :class="{ 'fa-spin': editorVariablesLoading }"></i>
          </button>
        </header>
        <label class="pc-search-field">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="variableQuery" type="search" placeholder="搜索变量路径或值" />
        </label>
        <div v-if="filteredEditorVariables.length" class="pc-status-variable-list">
          <button
            v-for="item in filteredEditorVariables"
            :key="item.path"
            type="button"
            @click="insertMvuVariable(item.path)"
          >
            <code>{{ item.path }}</code>
            <span>{{ item.preview }}</span>
          </button>
        </div>
        <p v-else>{{ editorVariablesError || '没有可插入的变量' }}</p>
      </section>

      <section v-if="editorDraft.template" class="pc-status-editor-preview">
        <strong>预览</strong>
        <FrontendFrame
          :active="true"
          :content="editorPreviewHtml"
          flush-content
          host-bridge
          security-mode="trusted"
          :theme="settingsStore.settings.theme"
          title="状态栏预览"
        />
      </section>
    </template>

    <footer class="pc-form-actions">
      <button class="pc-soft-btn" type="button" @click="phone.goBack">取消</button>
      <button class="pc-primary-btn" type="button" @click="saveEditor">保存</button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { readMvuData, readMvuStatData, type MvuScope, type MvuStatData } from '@/apps/mvu-modifier/api';
import { useRegexDisplayStore } from '@/apps/regex-display/store';
import EmptyState from '@/components/EmptyState.vue';
import FrontendFrame from '@/components/FrontendFrame.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { usePhoneStore } from '@/store/phone';
import { useSettingsStore } from '@/store/settings';
import { getRegexRulesByOperation } from '@/util/regexDisplay';
import { storeToRefs } from 'pinia';
import { flattenMvuTemplateLeaves, renderMvuStatusTemplate } from './model';
import {
  createStatusDisplayScheme,
  statusDisplayRegexTargetId,
  type StatusDisplayScheme,
  useStatusDisplayStore,
} from './store';

const phone = usePhoneStore();
const settingsStore = useSettingsStore();
const statusStore = useStatusDisplayStore();
const regexDisplay = useRegexDisplayStore();
const { configError, schemes } = storeToRefs(statusStore);
const route = computed(() => phone.currentRoute);
const editorDraft = ref<StatusDisplayScheme | null>(null);
const editorStatData = ref<MvuStatData>({});
const editorVariablesLoading = ref(false);
const editorVariablesError = ref('');
const variableQuery = ref('');
const templateArea = ref<HTMLTextAreaElement | null>(null);

const enabledSchemeIds = computed(() => statusStore.getEnabledSchemeIds(phone.currentTavernScopeKey));
const mvuScopeOptions = [
  { label: '最新消息', value: 'message' },
  { label: '当前聊天', value: 'chat' },
  { label: '当前角色', value: 'character' },
  { label: '全局', value: 'global' },
];
const editorRegexUsage = computed(() =>
  editorDraft.value ? regexDisplay.getUsage(statusDisplayRegexTargetId(editorDraft.value.id)) : null,
);
const extractRules = computed(() => getRegexRulesByOperation(regexDisplay.rules, 'extract'));
const displayRules = computed(() => getRegexRulesByOperation(regexDisplay.rules, 'replace'));
const extractRuleOptions = computed(() => [
  { label: '无正则', value: '' },
  ...extractRules.value.map(rule => ({ label: rule.name || '未命名规则', value: rule.id })),
]);
const editorVariables = computed(() => flattenMvuTemplateLeaves(editorStatData.value));
const filteredEditorVariables = computed(() => {
  const query = variableQuery.value.trim().toLowerCase();
  return editorVariables.value.filter(item => !query || `${item.path}\n${item.preview}`.toLowerCase().includes(query));
});
const editorPreviewHtml = computed(() =>
  editorDraft.value ? renderMvuStatusTemplate(editorDraft.value.template, editorStatData.value) : '',
);

function mvuScopeLabel(scope: MvuScope) {
  return mvuScopeOptions.find(option => option.value === scope)?.label || scope;
}

function createScheme() {
  editorDraft.value = createStatusDisplayScheme();
  editorStatData.value = {};
  phone.pushPage('editor', '新增状态方案', { schemeId: editorDraft.value.id });
}

function toggleEnabledScheme(schemeId: string, enabled: boolean) {
  statusStore.setEnabledSchemeIds(
    phone.currentTavernScopeKey,
    enabled ? [...enabledSchemeIds.value, schemeId] : enabledSchemeIds.value.filter(id => id !== schemeId),
  );
}

function editScheme(scheme: StatusDisplayScheme) {
  editorDraft.value = klona(scheme);
  editorStatData.value = {};
  phone.pushPage('editor', '编辑状态方案', { schemeId: scheme.id });
  if (scheme.source === 'mvu') void loadEditorVariables();
}

function duplicateScheme(scheme: StatusDisplayScheme) {
  const copy = createStatusDisplayScheme(scheme.source);
  copy.name = `${scheme.name} 副本`;
  copy.mvuScope = scheme.mvuScope;
  copy.template = scheme.template;
  statusStore.upsertScheme(copy);
  if (scheme.source === 'regex') {
    const source = regexDisplay.getUsage(statusDisplayRegexTargetId(scheme.id));
    const target = regexDisplay.getUsage(statusDisplayRegexTargetId(copy.id));
    target.contentRuleId = source.contentRuleId;
    target.displayRuleIds = [...source.displayRuleIds];
  }
  toastr.success('状态方案已复制');
}

async function deleteScheme(scheme: StatusDisplayScheme) {
  const confirmed = await phone.confirmNotice(`要删除状态方案“${scheme.name}”吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!confirmed) return;
  regexDisplay.deleteUsage(statusDisplayRegexTargetId(scheme.id));
  statusStore.deleteScheme(scheme.id);
  toastr.success('状态方案已删除');
}

function saveDraft() {
  if (!editorDraft.value) return null;
  editorDraft.value.name = editorDraft.value.name.trim() || '未命名状态栏';
  const saved = statusStore.upsertScheme(editorDraft.value);
  statusStore.setActiveScheme(phone.currentTavernScopeKey, saved.id);
  editorDraft.value = klona(saved);
  return saved;
}

function saveEditor() {
  if (!saveDraft()) return;
  phone.goBack();
  toastr.success('状态方案已保存');
}

function setEditorExtractRule(ruleId: string) {
  if (!editorDraft.value) return;
  regexDisplay.setExtractionRule(statusDisplayRegexTargetId(editorDraft.value.id), 'content', ruleId);
}

function toggleEditorDisplayRule(ruleId: string, enabled: boolean) {
  if (!editorDraft.value) return;
  regexDisplay.setDisplayRuleEnabled(statusDisplayRegexTargetId(editorDraft.value.id), ruleId, enabled);
}

function selectMvuSource() {
  if (!editorDraft.value) return;
  editorDraft.value.source = 'mvu';
  if (!editorDraft.value.template) editorDraft.value.template = createStatusDisplayScheme('mvu').template;
  void loadEditorVariables();
}

function changeEditorMvuScope(scope: string) {
  if (!editorDraft.value) return;
  editorDraft.value.mvuScope = scope as MvuScope;
  void loadEditorVariables();
}

async function loadEditorVariables() {
  if (!editorDraft.value || editorDraft.value.source !== 'mvu') return;
  editorVariablesLoading.value = true;
  editorVariablesError.value = '';
  try {
    const options =
      editorDraft.value.mvuScope === 'message'
        ? { type: 'message' as const, message_id: 'latest' as const }
        : { type: editorDraft.value.mvuScope };
    const data = await readMvuData(options);
    editorStatData.value = readMvuStatData(data);
  } catch (error) {
    editorStatData.value = {};
    editorVariablesError.value = error instanceof Error ? error.message : String(error);
  } finally {
    editorVariablesLoading.value = false;
  }
}

async function insertMvuVariable(path: string) {
  if (!editorDraft.value) return;
  const token = `{{mvu:${path}}}`;
  const area = templateArea.value;
  if (!area) {
    editorDraft.value.template += token;
    return;
  }
  const start = area.selectionStart;
  const end = area.selectionEnd;
  editorDraft.value.template = `${editorDraft.value.template.slice(0, start)}${token}${editorDraft.value.template.slice(end)}`;
  await nextTick();
  area.focus();
  area.setSelectionRange(start + token.length, start + token.length);
}
</script>

<style scoped>
.pc-status-settings-page,
.pc-status-editor-page,
.pc-status-variable-panel,
.pc-status-editor-preview {
  display: grid;
  gap: 14px;
}

.pc-status-enabled-panel {
  display: grid;
  border-block: 1px solid var(--pc-border);
}

.pc-status-enabled-panel > header {
  padding: 8px 4px;
}

.pc-status-enable-row {
  grid-template-columns: auto auto minmax(0, 1fr);
}

.pc-status-enable-row input {
  width: 18px;
  height: 18px;
  accent-color: var(--pc-theme-accent);
}

.pc-status-variable-panel header,
.pc-status-scheme-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.pc-status-regex-settings,
.pc-status-display-rules,
.pc-status-display-rules > div {
  display: grid;
  gap: 10px;
}
.pc-status-display-rules > summary {
  cursor: pointer;
  font-weight: 800;
}
.pc-status-display-rules > div > label {
  display: flex;
  align-items: center;
  gap: 9px;
}
.pc-status-display-rules input {
  width: 18px;
  height: 18px;
  accent-color: var(--pc-theme-accent);
}

.pc-status-scheme-list {
  display: grid;
}

.pc-status-scheme-main {
  display: grid;
  min-width: 0;
  flex: 1;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  text-align: left;
}

.pc-status-scheme-main > span,
.pc-status-regex-settings > div {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.pc-status-scheme-main small,
.pc-status-regex-settings small,
.pc-status-variable-panel p {
  color: var(--pc-muted);
}

.pc-status-source-tabs > button {
  min-width: 0;
  flex: 1;
}

.pc-status-regex-settings {
  padding: 14px;
}

.pc-status-template-area {
  min-height: 240px;
}

.pc-status-variable-list {
  display: grid;
  max-height: 240px;
  overflow-y: auto;
  border-block: 1px solid var(--pc-border);
}

.pc-status-variable-list > button {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr) minmax(80px, 0.7fr);
  gap: 10px;
  border: 0;
  border-bottom: 1px solid var(--pc-border);
  padding: 10px 4px;
  background: transparent;
  color: inherit;
  text-align: left;
}

.pc-status-variable-list > button:last-child {
  border-bottom: 0;
}

.pc-status-variable-list code,
.pc-status-variable-list span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.pc-status-variable-list span {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-status-variable-panel p {
  margin: 0;
}
</style>
