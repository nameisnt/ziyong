<template>
  <section class="pc-app-builder">
    <section v-if="route.page === 'root'" class="pc-app-builder-page">
      <div class="pc-app-builder-toolbar">
        <div class="pc-search-field pc-search-wrap">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="query" type="search" :placeholder="t`搜索自制 App`" />
        </div>
        <button
          class="pc-icon-btn"
          type="button"
          :class="{ active: bulkMode }"
          :disabled="!filteredDefinitions.length"
          :title="t`批量删除`"
          :aria-label="t`批量删除`"
          @click="bulkMode ? cancelBulkSelection() : startBulkSelection()"
        >
          <i class="fa-solid fa-list-check"></i>
        </button>
        <button
          class="pc-icon-btn"
          type="button"
          :title="t`导入 App`"
          :aria-label="t`导入 App`"
          @click="importInput?.click()"
        >
          <i class="fa-solid fa-file-import"></i>
        </button>
        <button class="pc-primary-btn compact" type="button" @click="phone.pushPage('templates', '选择模板')">
          <i class="fa-solid fa-plus"></i>
          <span>{{ t`新建` }}</span>
        </button>
        <input
          ref="importInput"
          class="pc-visually-hidden"
          type="file"
          accept="application/json,.json"
          @change="importApp"
        />
      </div>

      <BulkSelectionBar
        v-if="bulkMode"
        :all-selected="allBulkSelected"
        :selected-count="bulkSelectedIds.length"
        :total-count="filteredDefinitions.length"
        @cancel="cancelBulkSelection"
        @remove="deleteSelectedApps"
        @toggle-all="toggleAllBulkSelection"
      />

      <div v-if="filteredDefinitions.length" class="pc-app-builder-list">
        <article
          v-for="definition in filteredDefinitions"
          :key="definition.id"
          class="pc-list-row pc-app-builder-row"
          :class="{ bulk: bulkMode }"
        >
          <BulkSelectionCheckbox
            v-if="bulkMode"
            :model-value="bulkSelectedIdSet.has(definition.id)"
            :label="`选择 ${definition.name}`"
            @update:model-value="setBulkSelected(definition.id, $event)"
          />
          <button
            class="pc-app-builder-main"
            type="button"
            @click="
              bulkMode
                ? setBulkSelected(definition.id, !bulkSelectedIdSet.has(definition.id))
                : openDefinitionEditor(definition.id)
            "
          >
            <span class="pc-app-builder-icon" :style="{ '--pc-builder-accent': customAppAccent(definition.id) }">
              <i class="fa-solid" :class="definition.icon"></i>
            </span>
            <span class="pc-app-builder-copy">
              <strong>{{ definition.name }}</strong>
              <small>{{ definitionSummary(definition) }}</small>
            </span>
            <i class="fa-solid fa-chevron-right"></i>
          </button>
          <div v-if="!bulkMode" class="pc-app-builder-actions">
            <button
              class="pc-icon-btn"
              type="button"
              :title="t`复制 App`"
              :aria-label="t`复制 App`"
              @click="duplicateApp(definition.id)"
            >
              <i class="fa-solid fa-copy"></i>
            </button>
            <button
              class="pc-icon-btn"
              type="button"
              :title="t`导出 App`"
              :aria-label="t`导出 App`"
              @click="exportApp(definition.id)"
            >
              <i class="fa-solid fa-file-export"></i>
            </button>
            <button
              class="pc-icon-btn danger"
              type="button"
              :title="t`删除 App`"
              :aria-label="t`删除 App`"
              @click="deleteApp(definition.id)"
            >
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </article>
      </div>

      <EmptyState v-else :title="query.trim() ? t`没有匹配的自制 App` : t`还没有自制 App`" />
    </section>

    <section v-else-if="route.page === 'templates'" class="pc-app-builder-page">
      <div class="pc-template-list">
        <button
          v-for="template in templates"
          :key="template.id"
          class="pc-list-row pc-template-row"
          type="button"
          @click="startCreate(template.id)"
        >
          <span class="pc-template-icon"><i class="fa-solid" :class="template.icon"></i></span>
          <span>
            <strong>{{ template.name }}</strong>
            <small>{{ template.description }}</small>
          </span>
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    </section>

    <section v-else-if="route.page === 'editor' && draft" class="pc-app-builder-page pc-app-builder-editor">
      <article class="pc-page-section">
        <div class="pc-field-group">
          <label class="pc-field-label">{{ t`App 名称` }}</label>
          <input v-model="draft.name" class="pc-field" type="text" :placeholder="t`例如：梦境记录`" />
        </div>
        <div class="pc-field-group">
          <label class="pc-field-label">{{ t`图标` }}</label>
          <SearchableCombobox v-model="draft.icon" :options="iconOptions" :placeholder="t`选择或搜索图标`" />
        </div>
        <div class="pc-field-group">
          <label class="pc-field-label">{{ t`说明` }}</label>
          <textarea
            v-model="draft.description"
            class="pc-area compact"
            :placeholder="t`首页和工坊中显示的简短说明`"
          ></textarea>
        </div>
      </article>

      <article class="pc-page-section">
        <div class="pc-app-builder-section-head">
          <div>
            <strong>
              {{ t`数据范围` }}
              <InfoHint :text="t`已有内容时切换范围会把这个 App 的全部内容迁移到新范围。`" />
            </strong>
            <small>{{ draft.dataScope === 'chat' ? t`不同聊天分别保存` : t`所有聊天共用内容` }}</small>
          </div>
        </div>
        <div class="pc-app-builder-segment">
          <button
            :class="['pc-segment-btn', { active: draft.dataScope === 'chat' }]"
            type="button"
            @click="draft.dataScope = 'chat'"
          >
            {{ t`当前聊天` }}
          </button>
          <button
            :class="['pc-segment-btn', { active: draft.dataScope === 'global' }]"
            type="button"
            @click="draft.dataScope = 'global'"
          >
            {{ t`全局` }}
          </button>
        </div>
      </article>

      <article class="pc-page-section">
        <div class="pc-app-builder-section-head">
          <div>
            <strong>{{ t`创建方式` }}</strong>
            <small>{{ t`至少保留一种内容入口` }}</small>
          </div>
        </div>
        <div class="pc-builder-toggle-list">
          <div class="pc-builder-toggle-row">
            <span
              ><strong>{{ t`手动新增` }}</strong
              ><small>{{ t`直接填写标题和正文` }}</small></span
            >
            <label class="pc-toggle"><input v-model="draft.creation.manual" type="checkbox" /><span></span></label>
          </div>
          <div class="pc-builder-toggle-row">
            <span
              ><strong>{{ t`楼层提取` }}</strong
              ><small>{{ t`从聊天楼层创建内容` }}</small></span
            >
            <label class="pc-toggle"><input v-model="draft.creation.extract" type="checkbox" /><span></span></label>
          </div>
          <div class="pc-builder-toggle-row">
            <span
              ><strong>{{ t`AI 生成` }}</strong
              ><small>{{ t`复用来源、引用和提示词生成` }}</small></span
            >
            <label class="pc-toggle"><input v-model="draft.creation.generate" type="checkbox" /><span></span></label>
          </div>
        </div>
      </article>

      <article class="pc-page-section">
        <div class="pc-field-group">
          <label class="pc-field-label">{{ t`内容命名` }}</label>
          <SearchableCombobox v-model="draft.naming.mode" :options="namingOptions" :placeholder="t`选择标题规则`" />
        </div>
        <div v-if="draft.naming.mode === 'template'" class="pc-field-group">
          <label class="pc-field-label">{{ t`标题模板` }}</label>
          <input v-model="draft.naming.template" class="pc-field" type="text" :placeholder="'{{appName}} {{index}}'" />
          <small class="pc-field-help" v-text="'支持 {{appName}}、{{index}}、{{date}}、{{sourceFloor}}'"></small>
        </div>
        <div class="pc-field-group">
          <label class="pc-field-label">{{ t`显示方式` }}</label>
          <div class="pc-app-builder-segment">
            <button
              v-for="mode in displayModes"
              :key="mode.id"
              :class="['pc-segment-btn', { active: draft.display.mode === mode.id }]"
              type="button"
              @click="draft.display.mode = mode.id"
            >
              {{ mode.label }}
            </button>
          </div>
        </div>
        <div class="pc-builder-toggle-row">
          <span
            ><strong>{{ t`允许引用` }}</strong
            ><small>{{ t`其他 App 可以选择这里保存的正文` }}</small></span
          >
          <label class="pc-toggle"><input v-model="draft.referenceEnabled" type="checkbox" /><span></span></label>
        </div>
      </article>

      <article v-if="draft.creation.generate" class="pc-page-section">
        <div class="pc-field-group">
          <label class="pc-field-label">{{ t`默认 App 提示词` }}</label>
          <textarea
            v-model="draft.generation.defaultAppPrompt"
            class="pc-area"
            :placeholder="t`说明这个 App 应生成什么内容`"
          ></textarea>
        </div>
        <div class="pc-field-group">
          <label class="pc-field-label">{{ t`默认任务模板` }}</label>
          <textarea v-model="draft.generation.defaultTaskTemplate" class="pc-area compact"></textarea>
        </div>
      </article>

      <div class="pc-form-actions pc-app-builder-form-actions">
        <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
        <button class="pc-primary-btn" type="button" :disabled="savingApp" @click="saveApp">
          <i class="fa-solid fa-floppy-disk"></i>
          <span>{{ savingApp ? t`正在保存` : t`保存 App` }}</span>
        </button>
      </div>
    </section>

    <EmptyState v-else :title="t`这个工坊页面不存在`" />
  </section>
</template>

<script setup lang="ts">
import BulkSelectionBar from '@/components/BulkSelectionBar.vue';
import BulkSelectionCheckbox from '@/components/BulkSelectionCheckbox.vue';
import EmptyState from '@/components/EmptyState.vue';
import InfoHint from '@/components/InfoHint.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { useBulkSelection } from '@/composables/useBulkSelection';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useRegexDisplayStore } from '@/apps/regex-display/store';
import { storeToRefs } from 'pinia';
import {
  createCustomAppDefinition,
  customAppAccent,
  CustomAppDefinitionSchema,
  type CustomAppDefinition,
} from './schema';
import { useCustomAppsStore } from './store';

const phone = usePhoneStore();
const customApps = useCustomAppsStore();
const prompts = usePromptStore();
const regexDisplay = useRegexDisplayStore();
const { currentRoute: route } = storeToRefs(phone);
const { definitions } = storeToRefs(customApps);
const query = ref('');
const draft = ref<CustomAppDefinition | null>(null);
const importInput = ref<HTMLInputElement | null>(null);
const savingApp = ref(false);

const templates = [
  { id: 'extract' as const, icon: 'fa-highlighter', name: '提取记录', description: '手动新增，也可以从聊天楼层提取。' },
  {
    id: 'ai' as const,
    icon: 'fa-wand-magic-sparkles',
    name: 'AI 内容',
    description: '使用来源、引用和提示词生成内容。',
  },
  {
    id: 'frontend' as const,
    icon: 'fa-window-maximize',
    name: '网页内容',
    description: '生成并以安全网页模式展示 HTML。',
  },
  { id: 'blank' as const, icon: 'fa-file', name: '空白 App', description: '只启用手动新增，从最简单的结构开始。' },
];
const iconOptions = [
  ['fa-shapes', '形状'],
  ['fa-book', '书本'],
  ['fa-note-sticky', '便签'],
  ['fa-feather-pointed', '羽毛笔'],
  ['fa-comments', '对话'],
  ['fa-masks-theater', '剧场'],
  ['fa-envelope-open-text', '书信'],
  ['fa-highlighter', '摘抄'],
  ['fa-wand-magic-sparkles', '魔法棒'],
  ['fa-star', '星标'],
  ['fa-heart', '爱心'],
  ['fa-cloud-moon', '梦境'],
  ['fa-user', '人物'],
  ['fa-route', '路线'],
  ['fa-window-maximize', '网页'],
  ['fa-folder-open', '文件夹'],
].map(([value, label]) => ({ value: value!, label: label! }));
const namingOptions = [
  { value: 'manual', label: '手动填写' },
  { value: 'first-line', label: '正文第一行' },
  { value: 'template', label: '固定模板' },
  { value: 'ai', label: 'AI 返回标题' },
];
const displayModes: Array<{ id: CustomAppDefinition['display']['mode']; label: string }> = [
  { id: 'text', label: '纯文本' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'frontend', label: '网页' },
];
const filteredDefinitions = computed(() => {
  const normalized = query.value.trim().toLowerCase();
  if (!normalized) return definitions.value;
  return definitions.value.filter(definition =>
    `${definition.name} ${definition.description}`.toLowerCase().includes(normalized),
  );
});
const {
  active: bulkMode,
  allSelected: allBulkSelected,
  cancel: cancelBulkSelection,
  selectedIds: bulkSelectedIds,
  selectedIdSet: bulkSelectedIdSet,
  setSelected: setBulkSelected,
  start: startBulkSelection,
  toggleAll: toggleAllBulkSelection,
} = useBulkSelection(() => filteredDefinitions.value.map(definition => definition.id));

watch(
  () => route.value,
  current => {
    if (current.appId !== 'app-builder' || current.page !== 'editor') return;
    const definitionId = current.params?.definitionId;
    const existing = definitionId ? customApps.getDefinition(definitionId) : null;
    draft.value = existing
      ? CustomAppDefinitionSchema.parse(klona(existing))
      : createCustomAppDefinition((current.params?.template as 'ai' | 'blank' | 'extract' | 'frontend') || 'extract');
  },
  { deep: true, immediate: true },
);

function definitionSummary(definition: CustomAppDefinition) {
  const capabilities = [
    definition.creation.manual ? '手动' : '',
    definition.creation.extract ? '提取' : '',
    definition.creation.generate ? 'AI' : '',
    definition.display.mode === 'frontend' ? '网页' : '',
  ].filter(Boolean);
  return `${definition.dataScope === 'chat' ? '当前聊天' : '全局'} · ${capabilities.join(' / ')}`;
}

function startCreate(template: 'ai' | 'blank' | 'extract' | 'frontend') {
  phone.pushPage('editor', '新建自制 App', { template });
}

function openDefinitionEditor(definitionId: string) {
  const definition = customApps.getDefinition(definitionId);
  if (!definition) return;
  phone.pushPage('editor', definition.name, { definitionId });
}

async function saveApp() {
  if (!draft.value || savingApp.value) return;
  if (!draft.value.name.trim()) {
    toastr.warning('请填写 App 名称');
    return;
  }
  if (!Object.values(draft.value.creation).some(Boolean)) {
    toastr.warning('至少启用一种创建方式');
    return;
  }
  if (draft.value.naming.mode === 'ai' && !draft.value.creation.generate) {
    toastr.warning('使用 AI 返回标题前需要开启 AI 生成');
    return;
  }
  savingApp.value = true;
  try {
    const isNewApp = !customApps.getDefinition(draft.value.id);
    const saved = customApps.saveDefinition(draft.value);
    await nextTick();
    toastr.success('自制 App 已保存');
    phone.replaceRoute(isNewApp ? saved.id : 'app-builder', 'root', isNewApp ? saved.name : 'App 工坊');
  } catch (error) {
    console.error('[App Builder] Failed to save custom app', error);
    toastr.error(error instanceof Error ? `保存失败：${error.message}` : '保存失败，请查看控制台');
  } finally {
    savingApp.value = false;
  }
}

function duplicateApp(appId: string) {
  const copy = customApps.duplicateDefinition(appId);
  if (!copy) return;
  toastr.success('已创建 App 副本');
}

function exportApp(appId: string) {
  const definition = customApps.getDefinition(appId);
  if (!definition) return;
  const regexUsage = regexDisplay.getUsage(appId);
  const exportedRuleIds = new Set(
    [regexUsage.titleRuleId, regexUsage.contentRuleId, ...regexUsage.displayRuleIds].filter(Boolean),
  );
  const payload = JSON.stringify(
    {
      format: 'sillytavern-phone-custom-app',
      version: 1,
      definition,
      prompt: {
        appPrompt: prompts.appPrompts[appId] ?? definition.generation.defaultAppPrompt,
        taskTemplate: prompts.taskTemplates[`${appId}.generate`] ?? definition.generation.defaultTaskTemplate,
      },
      regexRules: regexDisplay.rules.filter(rule => exportedRuleIds.has(rule.id)),
      regexUsage,
      content: customApps.getEntries(appId),
    },
    null,
    2,
  );
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
  anchor.download = `${definition.name.replace(/[\\/:*?"<>|]/g, '_') || 'custom-app'}.json`;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

async function importApp(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    const raw = JSON.parse(await file.text()) as {
      content?: unknown[];
      definition?: unknown;
      prompt?: { appPrompt?: unknown; taskTemplate?: unknown };
      regexRules?: unknown[];
      regexUsage?: { contentRuleId?: unknown; displayRuleIds?: unknown; titleRuleId?: unknown };
    };
    const parsed = CustomAppDefinitionSchema.parse(raw.definition ?? raw);
    const existing = customApps.getDefinition(parsed.id);
    const next = existing
      ? { ...parsed, id: createCustomAppDefinition('blank').id, name: `${parsed.name} 副本` }
      : parsed;
    const saved = customApps.saveDefinition(CustomAppDefinitionSchema.parse(next));
    if (typeof raw.prompt?.appPrompt === 'string') prompts.updateAppPrompt(saved.id, raw.prompt.appPrompt);
    if (typeof raw.prompt?.taskTemplate === 'string') {
      prompts.updateTaskTemplate(`${saved.id}.generate`, raw.prompt.taskTemplate);
    }
    const importedRuleIds = new Map<string, string>();
    raw.regexRules?.forEach(item => {
      if (!item || typeof item !== 'object') return;
      const source = item as Record<string, unknown>;
      const rule = regexDisplay.addRule({
        enabled: source.enabled !== false,
        flags: typeof source.flags === 'string' ? source.flags : 'g',
        name: typeof source.name === 'string' ? source.name : `${saved.name}规则`,
        operation: source.operation === 'extract' ? 'extract' : 'replace',
        pattern: typeof source.pattern === 'string' ? source.pattern : '',
        replacement: typeof source.replacement === 'string' ? source.replacement : '',
      });
      if (typeof source.id === 'string') importedRuleIds.set(source.id, rule.id);
      if (!raw.regexUsage) {
        if (source.operation === 'extract') {
          regexDisplay.setExtractionRule(saved.id, source.field === 'title' ? 'title' : 'content', rule.id);
        } else {
          regexDisplay.setDisplayRuleEnabled(saved.id, rule.id, true);
        }
      }
    });
    if (raw.regexUsage) {
      const titleRuleId = typeof raw.regexUsage.titleRuleId === 'string' ? raw.regexUsage.titleRuleId : '';
      const contentRuleId = typeof raw.regexUsage.contentRuleId === 'string' ? raw.regexUsage.contentRuleId : '';
      regexDisplay.setExtractionRule(saved.id, 'title', importedRuleIds.get(titleRuleId) || '');
      regexDisplay.setExtractionRule(saved.id, 'content', importedRuleIds.get(contentRuleId) || '');
      const displayRuleIds = Array.isArray(raw.regexUsage.displayRuleIds)
        ? raw.regexUsage.displayRuleIds.filter((id): id is string => typeof id === 'string')
        : [];
      displayRuleIds.forEach(id => {
        const importedId = importedRuleIds.get(id);
        if (importedId) regexDisplay.setDisplayRuleEnabled(saved.id, importedId, true);
      });
    }
    raw.content?.forEach(item => {
      if (!item || typeof item !== 'object') return;
      const source = item as Record<string, unknown>;
      if (typeof source.content !== 'string') return;
      customApps.createEntry(saved.id, {
        title: typeof source.title === 'string' ? source.title : '未命名条目',
        content: source.content,
        sourceLabel: typeof source.sourceLabel === 'string' ? source.sourceLabel : '',
        sourceText: typeof source.sourceText === 'string' ? source.sourceText : '',
        tags: Array.isArray(source.tags) ? source.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      });
    });
    toastr.success(existing ? 'ID 已存在，已作为副本导入' : '自制 App 已导入');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '无法读取 App 文件');
  }
}

async function deleteApp(appId: string) {
  const definition = customApps.getDefinition(appId);
  if (!definition) return;
  const count = customApps.getEntries(appId).length;
  const confirmed = await phone.confirmNotice(`删除“${definition.name}”及其 ${count} 条内容吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
    title: '删除自制 App',
  });
  if (!confirmed) return;
  customApps.deleteDefinition(appId);
  toastr.success('自制 App 已删除');
}

async function deleteSelectedApps() {
  const selected = definitions.value.filter(definition => bulkSelectedIdSet.value.has(definition.id));
  if (!selected.length) return;
  const contentCount = selected.reduce((sum, definition) => sum + customApps.getEntries(definition.id).length, 0);
  const confirmed = await phone.confirmNotice(
    `确认删除所选 ${selected.length} 个自制 App 及其中 ${contentCount} 条内容吗？`,
    { confirmLabel: '删除所选', kind: 'warning', title: '批量删除自制 App' },
  );
  if (!confirmed) return;
  selected.forEach(definition => customApps.deleteDefinition(definition.id));
  cancelBulkSelection();
  toastr.success(`已删除 ${selected.length} 个自制 App`);
}
</script>

<style scoped>
.pc-app-builder,
.pc-app-builder-page,
.pc-app-builder-list,
.pc-template-list,
.pc-app-builder-editor {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 12px;
}

.pc-app-builder-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto auto;
  gap: 8px;
  align-items: center;
}

.pc-app-builder-row {
  padding: 10px;
}

.pc-app-builder-row.bulk {
  grid-template-columns: auto minmax(0, 1fr);
}

.pc-app-builder-main,
.pc-template-row {
  display: grid;
  width: 100%;
  min-width: 0;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  border: 0;
  color: var(--pc-text);
  background: transparent;
  text-align: left;
}

.pc-template-row {
  padding: 14px;
}

.pc-app-builder-icon,
.pc-template-icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: var(--pc-control-radius);
  color: var(--pc-builder-accent, var(--pc-theme-accent));
  background: color-mix(in srgb, var(--pc-builder-accent, var(--pc-theme-accent)) 16%, var(--pc-surface-strong) 84%);
}

.pc-app-builder-copy,
.pc-template-row > span:nth-child(2),
.pc-builder-toggle-row > span,
.pc-app-builder-section-head > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.pc-app-builder-copy small,
.pc-template-row small,
.pc-builder-toggle-row small,
.pc-app-builder-section-head small,
.pc-field-help {
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.4;
}

.pc-app-builder-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--pc-border);
}

.pc-app-builder-section-head,
.pc-builder-toggle-row {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pc-builder-toggle-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}

.pc-builder-toggle-row + .pc-builder-toggle-row {
  padding-top: 12px;
  border-top: 1px solid var(--pc-border);
}

.pc-field-group + .pc-field-group,
.pc-field-group + .pc-builder-toggle-row {
  margin-top: 14px;
}

.pc-app-builder-segment {
  display: grid;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
  gap: 6px;
  margin-top: 12px;
}

.pc-app-builder-form-actions {
  position: sticky;
  z-index: 3;
  bottom: 0;
  padding: 10px 0;
  background: var(--pc-bg);
}

.pc-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
