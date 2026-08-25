<template>
  <section v-if="route.page === 'root'" class="pc-status-display-app">
    <section v-if="schemes.length" class="pc-compact-toolbar pc-status-toolbar">
      <SearchableCombobox v-model="activeSchemeId" :options="schemeOptions" placeholder="选择状态方案" />
      <button class="pc-icon-btn" type="button" title="刷新状态" aria-label="刷新状态" @click="refreshStatus">
        <i class="fa-solid fa-rotate-right"></i>
      </button>
      <button class="pc-icon-btn" type="button" title="管理方案" aria-label="管理方案" @click="openManager">
        <i class="fa-solid fa-gear"></i>
      </button>
    </section>

    <div v-if="configError" class="pc-error-list"><span>{{ configError }}</span></div>

    <template v-if="activeScheme">
      <div class="pc-status-source-row">
        <span>{{ activeScheme.source === 'regex' ? '正则文字' : `MVU · ${mvuScopeLabel(activeScheme.mvuScope)}` }}</span>
        <small v-if="sourceLabel">{{ sourceLabel }}</small>
      </div>

      <div v-if="loading" class="pc-status-loading"><i class="fa-solid fa-spinner fa-spin"></i></div>
      <div v-else-if="errorMessage" class="pc-status-empty">
        <EmptyState :title="errorMessage">
          <button
            v-if="activeScheme.source === 'regex'"
            class="pc-soft-btn"
            type="button"
            @click="openRegexSettings(activeScheme)"
          >
            配置正则
          </button>
        </EmptyState>
      </div>
      <FrontendFrame
        v-else-if="renderedHtml"
        :active="true"
        :content="renderedHtml"
        security-mode="safe"
        :theme="settingsStore.settings.theme"
        :title="activeScheme.name"
      />
    </template>

    <EmptyState v-else title="还没有状态方案">
      <button class="pc-primary-btn compact" type="button" @click="createScheme">新建方案</button>
    </EmptyState>
  </section>

  <section v-else-if="route.page === 'manage'" class="pc-status-manage-page">
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
        <button class="pc-icon-btn" type="button" title="复制方案" aria-label="复制方案" @click="duplicateScheme(scheme)">
          <i class="fa-solid fa-copy"></i>
        </button>
        <button class="pc-icon-btn danger" type="button" title="删除方案" aria-label="删除方案" @click="deleteScheme(scheme)">
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
      <div>
        <strong>{{ activeEditorExtractRuleName || '未选择提取规则' }}</strong>
        <small>{{ `${activeEditorDisplayRuleCount} 条网页替换规则` }}</small>
      </div>
      <button class="pc-soft-btn compact" type="button" @click="configureEditorRegex">
        <i class="fa-solid fa-sliders"></i>
        配置正则
      </button>
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
        <input v-model="variableQuery" class="pc-field" type="search" placeholder="搜索变量路径或值" />
        <div v-if="filteredEditorVariables.length" class="pc-status-variable-list">
          <button v-for="item in filteredEditorVariables" :key="item.path" type="button" @click="insertMvuVariable(item.path)">
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
          security-mode="safe"
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
import {
  applyRegexDisplayRules,
  extractWithRegexRules,
  getRegexRulesByIds,
} from '@/util/regexDisplay';
import { getChatMessagesSafe, onTavernEvent } from '@/util/runtime';
import { storeToRefs } from 'pinia';
import { flattenMvuTemplateLeaves, renderMvuStatusTemplate, renderTextStatus } from './model';
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
const loading = ref(false);
const renderedHtml = ref('');
const errorMessage = ref('');
const sourceLabel = ref('');
const editorDraft = ref<StatusDisplayScheme | null>(null);
const editorStatData = ref<MvuStatData>({});
const editorVariablesLoading = ref(false);
const editorVariablesError = ref('');
const variableQuery = ref('');
const templateArea = ref<HTMLTextAreaElement | null>(null);
let refreshRevision = 0;
let eventStops: Array<{ stop: () => void }> = [];

const activeSchemeId = computed({
  get: () => statusStore.getActiveSchemeId(phone.currentTavernScopeKey),
  set: schemeId => {
    statusStore.setActiveScheme(phone.currentTavernScopeKey, schemeId);
    void refreshStatus();
  },
});
const activeScheme = computed(() => schemes.value.find(scheme => scheme.id === activeSchemeId.value) ?? null);
const schemeOptions = computed(() =>
  schemes.value.map(scheme => ({
    group: scheme.source === 'mvu' ? 'MVU 变量' : '固定文字',
    label: scheme.name,
    value: scheme.id,
  })),
);
const mvuScopeOptions = [
  { label: '最新消息', value: 'message' },
  { label: '当前聊天', value: 'chat' },
  { label: '当前角色', value: 'character' },
  { label: '全局', value: 'global' },
];
const editorRegexUsage = computed(() =>
  editorDraft.value ? regexDisplay.getUsage(statusDisplayRegexTargetId(editorDraft.value.id)) : null,
);
const activeEditorExtractRuleName = computed(() => {
  const id = editorRegexUsage.value?.contentRuleId;
  return regexDisplay.rules.find(rule => rule.id === id)?.name || '';
});
const activeEditorDisplayRuleCount = computed(() => editorRegexUsage.value?.displayRuleIds.length || 0);
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

function openManager() {
  phone.pushPage('manage', '管理状态方案');
}

function createScheme() {
  editorDraft.value = createStatusDisplayScheme();
  editorStatData.value = {};
  phone.pushPage('editor', '新增状态方案', { schemeId: editorDraft.value.id });
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

function configureEditorRegex() {
  const saved = saveDraft();
  if (!saved) return;
  phone.pushRoute('regex-display', 'root', '正则替换', {
    operation: 'replace',
    targetId: statusDisplayRegexTargetId(saved.id),
  });
}

function openRegexSettings(scheme: StatusDisplayScheme) {
  phone.pushRoute('regex-display', 'root', '正则替换', {
    operation: 'replace',
    targetId: statusDisplayRegexTargetId(scheme.id),
  });
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
    editorStatData.value = readMvuStatData(await readMvuData(options));
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

function loadRegexStatus(scheme: StatusDisplayScheme) {
  const usage = regexDisplay.getUsage(statusDisplayRegexTargetId(scheme.id));
  const extractRules = getRegexRulesByIds(regexDisplay.rules, [usage.contentRuleId], 'extract');
  if (!extractRules.length) throw new Error('还没有配置状态文字提取规则');
  const displayRules = getRegexRulesByIds(regexDisplay.rules, usage.displayRuleIds, 'replace');
  const messages = getChatMessagesSafe('0-{{lastMessageId}}', { hide_state: 'unhidden' });

  for (const message of [...messages].reverse()) {
    if (message.role !== 'assistant' || !message.message.trim()) continue;
    const extracted = extractWithRegexRules(message.message, extractRules);
    if (extracted.errors.length) throw new Error(extracted.errors.join('；'));
    if (!extracted.applied.length) continue;
    const displayed = applyRegexDisplayRules(extracted.content, displayRules);
    if (displayed.errors.length) throw new Error(displayed.errors.join('；'));
    const renderMode = displayed.applied.length ? displayed.renderMode : extracted.renderMode;
    return {
      html: renderMode === 'html' ? displayed.content : renderTextStatus(displayed.content),
      label: `第 ${message.message_id + 1} 楼`,
    };
  }
  throw new Error('当前聊天没有命中状态格式的消息');
}

async function loadMvuStatus(scheme: StatusDisplayScheme) {
  if (!scheme.template.trim()) throw new Error('当前方案还没有网页模板');
  const options =
    scheme.mvuScope === 'message'
      ? { type: 'message' as const, message_id: 'latest' as const }
      : { type: scheme.mvuScope };
  const statData = readMvuStatData(await readMvuData(options));
  return { html: renderMvuStatusTemplate(scheme.template, statData), label: mvuScopeLabel(scheme.mvuScope) };
}

async function refreshStatus() {
  const revision = ++refreshRevision;
  renderedHtml.value = '';
  errorMessage.value = '';
  sourceLabel.value = '';
  if (!activeScheme.value) return;
  if (!phone.isViewingCurrentChat) {
    errorMessage.value = '状态栏只读取酒馆当前聊天';
    return;
  }
  loading.value = true;
  try {
    const result =
      activeScheme.value.source === 'regex'
        ? loadRegexStatus(activeScheme.value)
        : await loadMvuStatus(activeScheme.value);
    if (revision !== refreshRevision) return;
    renderedHtml.value = result.html;
    sourceLabel.value = result.label;
  } catch (error) {
    if (revision !== refreshRevision) return;
    errorMessage.value = error instanceof Error ? error.message : String(error);
  } finally {
    if (revision === refreshRevision) loading.value = false;
  }
}

watch(
  () => [route.value.page, activeSchemeId.value, phone.currentTavernScopeKey] as const,
  ([page]) => {
    if (page === 'root') void refreshStatus();
  },
  { immediate: true },
);

onActivated(() => {
  if (route.value.page === 'root') void refreshStatus();
});

onMounted(() => {
  eventStops = ['MESSAGE_RECEIVED', 'MESSAGE_UPDATED', 'GENERATION_ENDED', 'CHAT_CHANGED'].map(name =>
    onTavernEvent(name, () => {
      if (route.value.page === 'root') void refreshStatus();
    }),
  );
});

onUnmounted(() => {
  eventStops.forEach(stop => stop.stop());
  eventStops = [];
});
</script>

<style scoped>
.pc-status-display-app,
.pc-status-manage-page,
.pc-status-editor-page,
.pc-status-variable-panel,
.pc-status-editor-preview {
  display: grid;
  gap: 14px;
}

.pc-status-display-app,
.pc-status-manage-page,
.pc-status-editor-page {
  padding: 14px;
}

.pc-status-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
}

.pc-status-source-row,
.pc-status-variable-panel header,
.pc-status-regex-settings,
.pc-status-scheme-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-status-source-row {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-status-loading {
  display: grid;
  min-height: 180px;
  place-items: center;
  color: var(--pc-muted);
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-status-variable-list span {
  color: var(--pc-muted);
  text-align: right;
}
</style>
