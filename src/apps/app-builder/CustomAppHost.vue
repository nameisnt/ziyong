<template>
  <section v-if="definition" class="pc-custom-app">
    <section v-if="route.page === 'root'" class="pc-custom-page">
      <div class="pc-custom-toolbar">
        <div class="pc-custom-search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="query" class="pc-field" type="search" :placeholder="t`搜索标题或内容`" />
        </div>
        <button
          class="pc-icon-btn"
          type="button"
          :title="definition.display.sortDesc ? t`当前倒序，切换正序` : t`当前正序，切换倒序`"
          @click="toggleSort"
        >
          <i
            :class="
              definition.display.sortDesc ? 'fa-solid fa-arrow-down-wide-short' : 'fa-solid fa-arrow-up-wide-short'
            "
          ></i>
        </button>
        <button class="pc-icon-btn" type="button" :title="t`编辑 App 设置`" @click="openAppSettings">
          <i class="fa-solid fa-gear"></i>
        </button>
      </div>

      <div class="pc-custom-create-actions">
        <button v-if="definition.creation.manual" class="pc-soft-btn compact" type="button" @click="openEditor()">
          <i class="fa-solid fa-plus"></i><span>{{ t`新增` }}</span>
        </button>
        <button
          v-if="definition.creation.extract"
          class="pc-soft-btn compact"
          type="button"
          @click="phone.pushPage('extract', '提取内容')"
        >
          <i class="fa-solid fa-highlighter"></i><span>{{ t`提取` }}</span>
        </button>
        <button
          v-if="definition.creation.generate"
          class="pc-primary-btn compact"
          type="button"
          @click="phone.pushPage('generate', 'AI 生成')"
        >
          <i class="fa-solid fa-wand-magic-sparkles"></i><span>{{ t`生成` }}</span>
        </button>
        <button
          :class="['pc-soft-btn', 'compact', { active: conversionSelectionMode }]"
          type="button"
          @click="startConversionSelection"
        >
          <i class="fa-solid fa-arrow-right-arrow-left"></i>
          <span>{{ conversionSelectionMode ? t`取消选择` : t`转换` }}</span>
        </button>
      </div>

      <PreviewDraftNotice
        v-if="previewDraft"
        :draft="previewDraft"
        @discard="discardPreviewDraft"
        @open="openPreviewDraft"
      />
      <FailedDraftList
        v-if="failedDrafts.length"
        :drafts="failedDrafts"
        :get-context="draft => draft.source.label"
        :get-title="() => '未解析生成内容'"
        @open="draftId => phone.pushPage('failed-draft', '解析失败草稿', { draftId })"
        @remove="removeFailedDraft"
      />

      <div v-if="filteredEntries.length" class="pc-custom-entry-list">
        <button
          v-for="entry in filteredEntries"
          :key="entry.id"
          :class="['pc-section-card', 'pc-custom-entry-row', { selected: selectedConversionIds.includes(entry.id) }]"
          type="button"
          @click="conversionSelectionMode ? toggleConversionSelection(entry.id) : openEntry(entry.id)"
        >
          <i
            v-if="conversionSelectionMode"
            :class="selectedConversionIds.includes(entry.id) ? 'fa-solid fa-square-check' : 'fa-regular fa-square'"
          ></i>
          <span class="pc-custom-entry-copy">
            <strong>{{ entry.title }}</strong>
            <small>{{ entry.content.slice(0, 100) || '暂无正文' }}</small>
            <span v-if="entry.tags.length" class="pc-custom-tag-line">
              <span v-for="tag in entry.tags.slice(0, 4)" :key="tag">{{ tag }}</span>
              <span v-if="entry.tags.length > 4">+{{ entry.tags.length - 4 }}</span>
            </span>
          </span>
          <i v-if="!conversionSelectionMode" class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
      <EmptyState v-else :title="query.trim() ? t`没有匹配的内容` : t`还没有内容`" />
      <div v-if="conversionSelectionMode" class="pc-form-actions pc-custom-selection-actions">
        <button class="pc-soft-btn" type="button" @click="toggleConversionSelectionMode">{{ t`取消` }}</button>
        <button
          class="pc-primary-btn"
          type="button"
          :disabled="!selectedConversionIds.length"
          @click="openConversion(selectedConversionIds)"
        >
          {{ `转换所选（${selectedConversionIds.length}）` }}
        </button>
      </div>
    </section>

    <section v-else-if="route.page === 'entry' && activeEntry" class="pc-custom-page pc-custom-detail-page">
      <ReaderDetailShell
        :content="displayActiveEntry?.content || ''"
        :custom-content="definition.display.mode !== 'markdown'"
        :favorite-active="activeEntry.favorite"
        :footer-always-visible="definition.display.mode === 'frontend'"
        :next-disabled="!nextEntryId"
        :previous-disabled="!previousEntryId"
        :title="displayActiveEntry?.title || activeEntry.title"
        @bottom="scrollToBottom"
        @catalog="phone.replacePage('root', definition.name)"
        @edit="openEditor(activeEntry.id)"
        @favorite="customApps.toggleFavorite(definition.id, activeEntry.id)"
        @next="openEntry(nextEntryId)"
        @previous="openEntry(previousEntryId)"
        @top="scrollToTop"
      >
        <template #meta>
          <p v-if="activeEntry.sourceLabel" class="pc-detail-meta">{{ activeEntry.sourceLabel }}</p>
        </template>
        <template #before-content>
          <div class="pc-custom-visible-actions">
            <button class="pc-soft-btn compact" type="button" @click="openConversion([activeEntry.id])">
              <i class="fa-solid fa-arrow-right-arrow-left"></i>
              <span>{{ t`转换到其他 App` }}</span>
            </button>
          </div>
        </template>
        <template v-if="definition.display.mode !== 'markdown'" #content>
          <FrontendFrame
            v-if="definition.display.mode === 'frontend'"
            :active="true"
            :content="displayActiveEntry?.content || activeEntry.content"
            security-mode="safe"
            :theme="settings.theme"
            :title="activeEntry.title"
          />
          <pre v-else class="pc-custom-plain-text">{{ displayActiveEntry?.content || activeEntry.content }}</pre>
        </template>
        <template #after-content>
          <details v-if="activeEntry.sourceText" class="pc-source-box">
            <summary>{{ t`来源原文` }}</summary>
            <p>{{ activeEntry.sourceText }}</p>
          </details>
          <details v-if="activeEntry.conversions.length" class="pc-source-box">
            <summary>{{ `转换记录（${activeEntry.conversions.length}）` }}</summary>
            <p v-for="record in activeEntry.conversions" :key="record.id">
              {{ `${new Date(record.createdAt).toLocaleString()} · ${record.targetAppName}` }}
            </p>
          </details>
        </template>
        <template #actions>
          <button class="pc-soft-btn" type="button" :title="t`转换内容`" @click="openConversion([activeEntry.id])">
            <i class="fa-solid fa-arrow-right-arrow-left"></i>
          </button>
          <button class="pc-soft-btn danger" type="button" :title="t`删除`" @click="removeEntry(activeEntry.id)">
            <i class="fa-solid fa-trash"></i>
          </button>
        </template>
      </ReaderDetailShell>
    </section>

    <section v-else-if="route.page === 'editor'" class="pc-custom-page">
      <article class="pc-editor-card">
        <div v-if="showTitleField" class="pc-field-group">
          <label class="pc-field-label">{{ t`标题` }}</label>
          <input v-model="entryDraft.title" class="pc-field" type="text" :placeholder="t`条目标题`" />
        </div>
        <div class="pc-field-group">
          <label class="pc-field-label">{{ t`正文` }}</label>
          <textarea
            v-model="entryDraft.content"
            class="pc-area pc-saved-content-area"
            :placeholder="t`填写要保存的内容`"
          ></textarea>
        </div>
        <div class="pc-field-group">
          <label class="pc-field-label">{{ t`标签` }}</label>
          <input v-model="entryDraft.tags" class="pc-field" type="text" :placeholder="t`使用逗号分隔`" />
        </div>
        <div class="pc-field-group">
          <label class="pc-field-label">{{ t`来源说明` }}</label>
          <input v-model="entryDraft.sourceLabel" class="pc-field" type="text" :placeholder="t`可留空`" />
        </div>
        <div v-if="editingEntry" class="pc-field-group">
          <label class="pc-field-label">{{ t`目录顺序` }}</label>
          <input v-model.number="entryDraft.directoryOrder" class="pc-field" type="number" min="0" step="1" />
        </div>
        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
          <button class="pc-primary-btn" type="button" :disabled="savingEntry" @click="saveEntry">
            {{ savingEntry ? t`正在保存` : t`保存` }}
          </button>
        </div>
      </article>
    </section>

    <section v-else-if="route.page === 'convert'" class="pc-custom-page">
      <ContentConversionPanel
        v-if="conversionSources.length"
        :source-app-id="definition.id"
        :source-app-name="definition.name"
        :sources="conversionSources"
        @cancel="phone.goBack()"
        @success="recordConversion"
      />
      <EmptyState v-else :title="t`待转换内容不存在`" />
    </section>

    <section v-else-if="route.page === 'extract'" class="pc-custom-page">
      <EmptyState v-if="!phone.isViewingCurrentChat" :title="t`历史聊天不能重新提取`" />
      <template v-else>
        <article class="pc-editor-card">
          <GenerationSourceFields
            :from-start-end="extractDraft.fromStartEnd"
            :mode="extractDraft.sourceMode"
            :range-text="extractDraft.rangeText"
            :recent-count="extractDraft.recentCount"
            :single-message-id="extractDraft.singleMessageId"
            @update:from-start-end="extractDraft.fromStartEnd = $event"
            @update:mode="extractDraft.sourceMode = $event"
            @update:range-text="extractDraft.rangeText = $event"
            @update:recent-count="extractDraft.recentCount = $event"
            @update:single-message-id="extractDraft.singleMessageId = $event"
          />
          <div class="pc-extract-role-row">
            <span>
              <strong>{{ t`提取楼层` }}</strong>
              <small>{{ extractDraft.includeUser ? t`全部 AI 与用户楼层` : t`全部 AI 楼层（包含隐藏）` }}</small>
            </span>
            <label class="pc-extract-role-toggle" :title="extractDraft.includeUser ? t`排除用户楼层` : t`包含用户楼层`">
              <span>{{ t`包含用户` }}</span>
              <span class="pc-toggle">
                <input v-model="extractDraft.includeUser" type="checkbox" />
                <span aria-hidden="true"></span>
              </span>
            </label>
          </div>
          <div class="pc-field-group">
            <label class="pc-field-label">{{ t`保存方式` }}</label>
            <div class="pc-extract-mode-segment">
              <button
                :class="['pc-segment-btn', { active: extractDraft.saveMode === 'separate' }]"
                type="button"
                @click="extractDraft.saveMode = 'separate'"
              >
                {{ t`每层一条` }}
              </button>
              <button
                :class="['pc-segment-btn', { active: extractDraft.saveMode === 'merge' }]"
                type="button"
                @click="extractDraft.saveMode = 'merge'"
              >
                {{ t`合并一条` }}
              </button>
            </div>
          </div>
          <div class="pc-form-actions">
            <button class="pc-soft-btn" type="button" @click="openRegexSettings">
              <i class="fa-solid fa-code"></i><span>{{ t`正则规则` }}</span>
            </button>
            <button class="pc-primary-btn" type="button" @click="buildExtractPreview">
              <i class="fa-solid fa-eye"></i><span>{{ t`预览提取` }}</span>
            </button>
          </div>
        </article>

        <article v-if="extractError" class="pc-status-card danger">
          <strong>{{ t`无法提取` }}</strong>
          <p>{{ extractError }}</p>
        </article>
        <section v-if="extractPreview.length" class="pc-extract-preview-list">
          <div class="pc-extract-preview-head">
            <strong>{{ `待保存 ${selectedExtractIds.length} / ${extractPreview.length}` }}</strong>
            <button class="pc-soft-btn compact" type="button" @click="toggleAllExtractPreview">
              {{ selectedExtractIds.length === extractPreview.length ? t`取消全选` : t`全选` }}
            </button>
          </div>
          <label v-for="item in extractPreview" :key="item.id" class="pc-section-card pc-extract-preview-row">
            <input v-model="selectedExtractIds" type="checkbox" :value="item.id" />
            <span
              ><strong>{{ item.title }}</strong
              ><small>{{ item.content.slice(0, 140) }}</small></span
            >
            <em v-if="!item.matched">{{ t`未命中，使用完整正文` }}</em>
          </label>
          <div class="pc-form-actions pc-extract-save-actions">
            <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
            <button
              class="pc-primary-btn"
              type="button"
              :disabled="!selectedExtractIds.length"
              @click="saveExtractPreview"
            >
              {{ t`保存所选` }}
            </button>
          </div>
        </section>
      </template>
    </section>

    <section v-else-if="route.page === 'generate'" class="pc-custom-page">
      <article class="pc-editor-card">
        <GenerationPanel
          :capture="captureCustomPrompt"
          :capture-reset-key="promptPreview"
          :error="generationState.error"
          :from-start-end="generationDraft.fromStartEnd"
          :range-text="generationDraft.rangeText"
          :raw-output="generationState.rawOutput"
          :recent-count="generationDraft.recentCount"
          :references="selectedReferences"
          :running="generationState.running"
          :single-message-id="generationDraft.singleMessageId"
          :source-mode="settings.generation.sourceMode"
          :user-requirement="generationDraft.userRequirement"
          :requirement-placeholder="t`补充这次内容的重点、风格或限制`"
          @cancel="phone.goBack()"
          @generate="runGeneration"
          @stop="stopGeneration"
          @update:from-start-end="generationDraft.fromStartEnd = $event"
          @update:range-text="generationDraft.rangeText = $event"
          @update:recent-count="generationDraft.recentCount = $event"
          @update:references="selectedReferences = $event"
          @update:single-message-id="generationDraft.singleMessageId = $event"
          @update:source-mode="settings.generation.sourceMode = $event"
          @update:user-requirement="generationDraft.userRequirement = $event"
        />
      </article>
    </section>

    <section v-else-if="route.page === 'preview' && generationState.preview" class="pc-custom-page">
      <article class="pc-detail-card pc-generation-preview-card">
        <GenerationPreviewPanel
          :content="generationState.preview.content"
          :raw="generationState.preview.raw"
          raw-editable
          :source-label="generationState.preview.source.label"
          :text-provider-summary="textProviderSummary"
          :title="generationState.preview.title"
          :warnings="generationState.preview.warnings"
          :save-label="t`保存内容`"
          @back="phone.replacePage('generate', 'AI 生成')"
          @reparse="reparsePreviewRaw"
          @save="saveGenerationPreview"
          @update:content="generationState.preview.content = $event"
          @update:raw="generationState.preview.raw = $event"
        >
          <template v-if="definition.display.mode === 'frontend'" #content>
            <FrontendFrame
              :active="true"
              :content="generationState.preview.content"
              security-mode="safe"
              :theme="settings.theme"
              :title="generationState.preview.title"
            />
          </template>
        </GenerationPreviewPanel>
      </article>
    </section>

    <section v-else-if="route.page === 'failed-draft' && activeFailedDraft" class="pc-custom-page">
      <article class="pc-editor-card pc-repair-card">
        <span class="pc-kicker">{{ activeFailedDraft.source.label }}</span>
        <h2>{{ t`修复解析失败草稿` }}</h2>
        <div v-if="activeFailedDraft.warnings.length" class="pc-status-card warning">
          <strong>{{ t`解析提示` }}</strong>
          <p>{{ activeFailedDraft.warnings.join('；') }}</p>
        </div>
        <RawOutputEditor v-model="failedDraftRawOutput" @reparse="reparseFailedDraft" />
        <div class="pc-form-actions">
          <button class="pc-soft-btn danger" type="button" @click="removeFailedDraft(activeFailedDraft.id)">
            {{ t`删除草稿` }}
          </button>
          <button class="pc-primary-btn" type="button" @click="reparseFailedDraft">{{ t`重新解析` }}</button>
        </div>
      </article>
    </section>

    <EmptyState v-else :title="t`内容不存在`" />
  </section>

  <EmptyState v-else :title="t`这个自制 App 已被删除`">
    <button class="pc-soft-btn" type="button" @click="phone.goHome()">{{ t`返回首页` }}</button>
  </EmptyState>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import ContentConversionPanel from '@/components/ContentConversionPanel.vue';
import FailedDraftList from '@/components/FailedDraftList.vue';
import FrontendFrame from '@/components/FrontendFrame.vue';
import GenerationPanel from '@/components/GenerationPanel.vue';
import GenerationPreviewPanel from '@/components/GenerationPreviewPanel.vue';
import GenerationSourceFields from '@/components/GenerationSourceFields.vue';
import PreviewDraftNotice from '@/components/PreviewDraftNotice.vue';
import RawOutputEditor from '@/components/RawOutputEditor.vue';
import ReaderDetailShell from '@/components/ReaderDetailShell.vue';
import { useRegexDisplayStore } from '@/apps/regex-display/store';
import {
  getRegisteredPhoneGenerationAdapter,
  type PhoneContentConversionResult,
  type PhoneContentConversionSource,
} from '@/core/appRegistry';
import { buildGenerationPreview, captureGenerationPrompt, generateContent } from '@/core/generationService';
import { getCurrentChatScopeKey } from '@/store/chatScoped';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import { storeToRefs } from 'pinia';
import { buildSourceSelection, type SummaryGenerationSourceMode } from '@/util/generationSource';
import { parseSimpleXmlResult } from '@/util/generation';
import { usePreviewDraftPersistence } from '@/util/previewDrafts';
import { applyRegexDisplayRules, extractWithRegexRules, getRegexRulesByIds } from '@/util/regexDisplay';
import { formatGenerationReferences, type GenerationReferenceItem } from '@/util/references';
import { getChatMessagesSafe, stopGenerationByIdSafe } from '@/util/runtime';
import { getSourceLastFloor } from '@/util/sourceFloor';
import { formatTextProviderSummary } from '@/util/textProvider';
import { resolveCustomGeneratedTitle } from './generation';
import { type CustomAppDefinition, type CustomAppEntry } from './schema';
import { useCustomAppsStore } from './store';

const phone = usePhoneStore();
const settingsStore = useSettingsStore();
const customApps = useCustomAppsStore();
const regexDisplay = useRegexDisplayStore();
const prompts = usePromptStore();
const { currentRoute: route } = storeToRefs(phone);
const { settings } = storeToRefs(settingsStore);
const query = ref('');
const conversionSelectionMode = ref(false);
const selectedConversionIds = ref<string[]>([]);
const savingEntry = ref(false);
const hostAppId = route.value.appId;
const selectedReferences = ref<GenerationReferenceItem[]>([]);
const entryDraft = reactive({ title: '', content: '', tags: '', sourceLabel: '', sourceText: '', directoryOrder: 0 });
const extractDraft = reactive({
  fromStartEnd: 20,
  includeUser: false,
  rangeText: '',
  recentCount: 20,
  saveMode: 'separate' as 'merge' | 'separate',
  singleMessageId: 0,
  sourceMode: 'recent' as SummaryGenerationSourceMode,
});
const extractError = ref('');
const extractPreview = ref<
  Array<{
    content: string;
    id: string;
    matched: boolean;
    sourceFloorEnd?: number;
    sourceLabel: string;
    sourceText: string;
    title: string;
  }>
>([]);
const selectedExtractIds = ref<string[]>([]);
const generationDraft = reactive({
  fromStartEnd: 20,
  rangeText: '',
  recentCount: 20,
  singleMessageId: 0,
  userRequirement: '',
});
const generationState = reactive({
  error: '',
  generationId: '',
  preview: null as null | {
    content: string;
    draftId: null | string;
    raw: string;
    source: { floorEnd?: number; label: string };
    title: string;
    warnings: string[];
  },
  rawOutput: '',
  running: false,
});
const failedDraftRawOutput = ref('');

const definition = computed(() => customApps.getDefinition(route.value.appId));
const entries = computed(() => (definition.value ? customApps.getEntries(definition.value.id) : []));
const failedDrafts = computed(() => customApps.getFailedDrafts(hostAppId));
const activeFailedDraft = computed(() =>
  route.value.params?.draftId ? customApps.getFailedDraft(hostAppId, route.value.params.draftId) : null,
);
const adapter = computed(() =>
  definition.value?.creation.generate ? getRegisteredPhoneGenerationAdapter(hostAppId, 'generate') : null,
);
const formattedReferences = computed(() => formatGenerationReferences(selectedReferences.value));
const textProviderSummary = computed(() =>
  settings.value.textProvider.mode === 'external'
    ? formatTextProviderSummary(settings.value.textProvider)
    : '跟随酒馆当前模型',
);
const orderedEntries = computed(() => {
  const result = [...entries.value];
  if (definition.value?.display.sortDesc) result.reverse();
  return result;
});
const filteredEntries = computed(() => {
  const normalized = query.value.trim().toLowerCase();
  const displayed = orderedEntries.value.map(entry => ({
    ...entry,
    title: applyRegexDisplayRules(entry.title, replacementRules.value.title).content,
    content: applyRegexDisplayRules(entry.content, replacementRules.value.content).content,
  }));
  if (!normalized) return displayed;
  return displayed.filter(entry =>
    `${entry.title} ${entry.content} ${entry.tags.join(' ')}`.toLowerCase().includes(normalized),
  );
});
const activeEntry = computed(() => {
  const entryId = route.value.params?.entryId;
  return definition.value && entryId ? customApps.getEntry(definition.value.id, entryId) : null;
});
const conversionSources = computed<PhoneContentConversionSource[]>(() => {
  const app = definition.value;
  if (!app || route.value.page !== 'convert') return [];
  const entryById = new Map(entries.value.map(entry => [entry.id, entry]));
  return (route.value.params?.entryIds || '')
    .split(',')
    .filter(Boolean)
    .flatMap(entryId => {
      const entry = entryById.get(entryId);
      if (!entry) return [];
      return [
        {
          appId: app.id,
          appName: app.name,
          content: entry.content,
          displayMode: app.display.mode,
          entryId: entry.id,
          sourceFloorEnd: entry.sourceFloorEnd,
          sourceLabel: entry.sourceLabel,
          tags: [...entry.tags],
          title: entry.title,
        },
      ];
    });
});
const regexUsage = computed(() => (definition.value ? regexDisplay.getUsage(definition.value.id) : null));
const replacementRules = computed(() =>
  regexUsage.value
    ? getRegexRulesByIds(regexDisplay.rules, regexUsage.value.displayRuleIds, 'replace')
    : [],
);
const displayActiveEntry = computed(() => {
  if (!activeEntry.value) return null;
  return {
    ...activeEntry.value,
    content: applyRegexDisplayRules(activeEntry.value.content, replacementRules.value).content,
  };
});
const editingEntry = computed(() => (route.value.page === 'editor' ? activeEntry.value : null));
const activeEntryIndex = computed(() => orderedEntries.value.findIndex(entry => entry.id === activeEntry.value?.id));
const previousEntryId = computed(() =>
  activeEntryIndex.value > 0 ? orderedEntries.value[activeEntryIndex.value - 1]?.id || '' : '',
);
const nextEntryId = computed(() =>
  activeEntryIndex.value >= 0 ? orderedEntries.value[activeEntryIndex.value + 1]?.id || '' : '',
);
const showTitleField = computed(() => definition.value?.naming.mode === 'manual' || Boolean(editingEntry.value));
const promptPreview = computed(() => {
  if (!adapter.value || !definition.value) return '';
  try {
    return buildGenerationPreview(adapter.value, buildGenerationConfig(), getGenerationOptions()).text;
  } catch (error) {
    return error instanceof Error ? error.message : '无法生成提示词预览';
  }
});

const {
  clearPreviewDraft,
  discardPreviewDraft,
  draft: previewDraft,
  openPreviewDraft,
  persistPreviewDraft,
} = usePreviewDraftPersistence<NonNullable<typeof generationState.preview>>({
  appId: hostAppId,
  consumeFailedDraft: draftId => customApps.deleteFailedDraft(hostAppId, draftId),
  getPreview: () => generationState.preview,
  page: 'preview',
  route,
  setPreview: preview => {
    generationState.preview = preview;
  },
  title: () => `${definition.value?.name || '自制 App'}预览`,
});

watch(
  () => route.value,
  current => {
    if (!current.appId.startsWith('custom-') || current.page !== 'editor') return;
    const entry = current.params?.entryId ? customApps.getEntry(current.appId, current.params.entryId) : null;
    entryDraft.title = entry?.title || '';
    entryDraft.content = entry?.content || '';
    entryDraft.tags = entry?.tags.join(', ') || '';
    entryDraft.sourceLabel = entry?.sourceLabel || '';
    entryDraft.sourceText = entry?.sourceText || '';
    entryDraft.directoryOrder = entry?.directoryOrder ?? 0;
  },
  { deep: true, immediate: true },
);

watch(
  () => route.value,
  current => {
    if (current.appId !== hostAppId) return;
    if (current.page !== 'root') {
      conversionSelectionMode.value = false;
      selectedConversionIds.value = [];
    }
    if (current.page === 'generate') {
      generationState.error = '';
      generationState.rawOutput = '';
      selectedReferences.value = [];
    }
    if (current.page === 'failed-draft') failedDraftRawOutput.value = activeFailedDraft.value?.rawOutput || '';
  },
  { deep: true, immediate: true },
);

function resolveTitle(app: CustomAppDefinition, content: string, index: number, sourceFloor?: number) {
  const firstLine =
    content
      .split(/\r?\n/)
      .map(line => line.trim())
      .find(Boolean) || '';
  if (app.naming.mode === 'first-line') return firstLine.slice(0, 80) || '未命名条目';
  if (app.naming.mode === 'template') {
    return (
      app.naming.template
        .replaceAll('{{appName}}', app.name)
        .replaceAll('{{index}}', String(index))
        .replaceAll('{{date}}', new Date().toLocaleDateString())
        .replaceAll('{{sourceFloor}}', typeof sourceFloor === 'number' ? String(sourceFloor) : '')
        .trim() || '未命名条目'
    );
  }
  return entryDraft.title.trim() || firstLine.slice(0, 80) || '未命名条目';
}

function openEntry(entryId: string) {
  const entry = definition.value ? customApps.getEntry(definition.value.id, entryId) : null;
  if (!entry || !definition.value) return;
  phone.pushPage('entry', entry.title, { entryId });
}

function toggleConversionSelectionMode() {
  conversionSelectionMode.value = !conversionSelectionMode.value;
  selectedConversionIds.value = [];
}

function startConversionSelection() {
  if (!entries.value.length) {
    toastr.info('请先新增、提取或生成至少一条内容');
    return;
  }
  toggleConversionSelectionMode();
}

function toggleConversionSelection(entryId: string) {
  selectedConversionIds.value = selectedConversionIds.value.includes(entryId)
    ? selectedConversionIds.value.filter(id => id !== entryId)
    : [...selectedConversionIds.value, entryId];
}

function openConversion(entryIds: string[]) {
  if (!entryIds.length) return;
  const selected = new Set(entryIds);
  const orderedIds =
    route.value.page === 'root'
      ? filteredEntries.value.filter(entry => selected.has(entry.id)).map(entry => entry.id)
      : entryIds;
  phone.pushPage('convert', '转换内容', { entryIds: orderedIds.join(',') });
}

function recordConversion(payload: {
  result: PhoneContentConversionResult;
  sourceEntryIds: string[];
  targetAppId: string;
  targetAppName: string;
}) {
  const app = definition.value;
  if (!app) return;
  customApps.recordConversion(app.id, payload.sourceEntryIds, {
    appId: payload.targetAppId,
    appName: payload.targetAppName,
    entryIds: payload.result.itemIds,
  });
}

function openEditor(entryId = '') {
  if (!definition.value) return;
  phone.pushPage('editor', entryId ? '编辑内容' : '新增内容', entryId ? { entryId } : undefined);
}

async function saveEntry() {
  const app = definition.value;
  if (savingEntry.value) return;
  if (!app || !entryDraft.content.trim()) {
    toastr.warning('请填写正文');
    return;
  }
  savingEntry.value = true;
  try {
    const tags = entryDraft.tags
      .split(/[，,]/)
      .map(tag => tag.trim())
      .filter(Boolean);
    const title = resolveTitle(app, entryDraft.content, entries.value.length + 1);
    const entry: CustomAppEntry | null = editingEntry.value
      ? customApps.updateEntry(app.id, editingEntry.value.id, {
          title,
          content: entryDraft.content,
          tags,
          sourceLabel: entryDraft.sourceLabel,
          sourceText: entryDraft.sourceText,
          directoryOrder: entryDraft.directoryOrder,
        })
      : customApps.createEntry(app.id, {
          title,
          content: entryDraft.content,
          tags,
          sourceLabel: entryDraft.sourceLabel,
          sourceText: entryDraft.sourceText,
        });
    if (!entry) throw new Error('目标条目不存在');
    await nextTick();
    toastr.success('内容已保存');
    phone.replacePage('entry', entry.title, { entryId: entry.id });
  } catch (error) {
    console.error('[Custom App] Failed to save entry', error);
    toastr.error(error instanceof Error ? `保存失败：${error.message}` : '保存失败，请查看控制台');
  } finally {
    savingEntry.value = false;
  }
}

function toggleSort() {
  if (!definition.value) return;
  const next = klona(definition.value);
  next.display.sortDesc = !next.display.sortDesc;
  customApps.saveDefinition(next);
}

function openAppSettings() {
  if (!definition.value) return;
  phone.pushRoute('app-builder', 'editor', definition.value.name, { definitionId: definition.value.id });
}

function openRegexSettings() {
  if (!definition.value) return;
  phone.pushRoute('regex-display', 'root', '正则替换', { operation: 'extract', targetId: definition.value.id });
}

function buildExtractPreview() {
  const app = definition.value;
  if (!app) return;
  extractError.value = '';
  try {
    if (extractDraft.sourceMode === 'none') throw new Error('提取内容时需要选择聊天楼层');
    const sourceMessages = getChatMessagesSafe('0-{{lastMessageId}}', { hide_state: 'all' }).filter(
      message => message.role === 'assistant' || (extractDraft.includeUser && message.role === 'user'),
    );
    const source = buildSourceSelection({
      chatIdAtGeneration: String(SillyTavern.getCurrentChatId?.() || SillyTavern.chatId || ''),
      fromStartEnd: extractDraft.fromStartEnd,
      mode: extractDraft.sourceMode,
      rangeText: extractDraft.rangeText,
      recentCount: extractDraft.recentCount,
      scopeId: getCurrentChatScopeKey(),
      singleMessageId: extractDraft.singleMessageId,
      visibleMessages: sourceMessages,
    }).selection;
    const selectedMessages = sourceMessages.filter(message => source.messageIds.includes(message.message_id));
    const usage = regexDisplay.getUsage(app.id);
    const contentRules = getRegexRulesByIds(regexDisplay.rules, [usage.contentRuleId], 'extract');
    const titleRules = getRegexRulesByIds(regexDisplay.rules, [usage.titleRuleId], 'extract');
    const extracted = selectedMessages.flatMap((message, index) => {
      const contentResult = extractWithRegexRules(message.message, contentRules);
      if (contentRules.length && !contentResult.applied.length) return [];
      const content = contentResult.content.trim();
      if (!content) return [];

      const titleResult = extractWithRegexRules(message.message, titleRules);
      const extractedTitle = titleRules.length && titleResult.applied.length ? titleResult.content.trim() : '';
      return [
        {
          id: `floor-${message.message_id}-${index}`,
          title: extractedTitle || resolveTitle(app, content, entries.value.length + index + 1, message.message_id),
          content,
          matched: true,
          sourceFloorEnd: message.message_id,
          sourceLabel: `第 ${message.message_id} 楼`,
          sourceText: message.message,
        },
      ];
    });
    extractPreview.value =
      extractDraft.saveMode === 'merge' && extracted.length
        ? [
            {
              id: `merged-${Date.now()}`,
              title:
                extracted.length === 1
                  ? extracted[0]!.title
                  : resolveTitle(
                      app,
                      extracted.map(item => item.content).join('\n\n'),
                      entries.value.length + 1,
                      extracted.at(-1)?.sourceFloorEnd,
                    ),
              content: extracted.map(item => item.content).join('\n\n'),
              matched: extracted.every(item => item.matched),
              sourceFloorEnd: extracted.at(-1)?.sourceFloorEnd,
              sourceLabel: source.label,
              sourceText: extracted.map(item => item.sourceText).join('\n\n'),
            },
          ]
        : extracted;
    selectedExtractIds.value = extractPreview.value.map(item => item.id);
    if (!extractPreview.value.length) throw new Error('选中楼层没有可保存的正文');
  } catch (error) {
    extractPreview.value = [];
    selectedExtractIds.value = [];
    extractError.value = error instanceof Error ? error.message : '提取失败';
  }
}

function toggleAllExtractPreview() {
  selectedExtractIds.value =
    selectedExtractIds.value.length === extractPreview.value.length ? [] : extractPreview.value.map(item => item.id);
}

function saveExtractPreview() {
  const app = definition.value;
  if (!app) return;
  const selected = new Set(selectedExtractIds.value);
  extractPreview.value
    .filter(item => selected.has(item.id))
    .forEach(item => {
      customApps.createEntry(app.id, {
        title: item.title,
        content: item.content,
        sourceFloorEnd: item.sourceFloorEnd,
        sourceLabel: item.sourceLabel,
        sourceText: item.sourceText,
      });
    });
  toastr.success(`已保存 ${selected.size} 条内容`);
  phone.replacePage('root', app.name);
}

function buildGenerationConfig() {
  const app = definition.value;
  if (!app) throw new Error('自制 App 不存在');
  return {
    appPrompt: prompts.appPrompts[app.id] ?? app.generation.defaultAppPrompt,
    definition: klona(app),
    outputFormat: prompts.resolveOutputFormat(`${app.id}.generate`),
    userRequirement: generationDraft.userRequirement,
  };
}

function getGenerationOptions() {
  return {
    generationDefaults: {
      resultMode: settings.value.generation.resultMode,
      stream: settings.value.generation.stream,
      tavernPresetName: settings.value.generation.tavernPresetName,
    },
    references: formattedReferences.value,
    source: {
      fromStartEnd: generationDraft.fromStartEnd,
      mode: settings.value.generation.sourceMode,
      rangeText: generationDraft.rangeText,
      recentCount: generationDraft.recentCount,
      singleMessageId: generationDraft.singleMessageId,
    },
    textProvider: settings.value.textProvider,
  };
}

function captureCustomPrompt() {
  if (!adapter.value) return Promise.reject(new Error('当前 App 没有启用 AI 生成'));
  return captureGenerationPrompt(adapter.value, buildGenerationConfig(), getGenerationOptions());
}

async function runGeneration() {
  const currentAdapter = adapter.value;
  const app = definition.value;
  if (!currentAdapter || !app) return;
  generationState.error = '';
  generationState.rawOutput = '';
  generationState.preview = null;
  clearPreviewDraft();
  try {
    const result = await generateContent(currentAdapter, buildGenerationConfig(), {
      ...getGenerationOptions(),
      createFailedDraft: input => customApps.createFailedDraft(app.id, input),
      lifecycle: {
        onFinish() {
          generationState.running = false;
          generationState.generationId = '';
        },
        onRawOutput(rawOutput) {
          generationState.rawOutput = rawOutput;
        },
        onStart(generationId) {
          generationState.running = true;
          generationState.generationId = generationId;
        },
      },
    });
    if (result.status === 'failed') {
      generationState.error = result.warnings.join('；') || '模型输出无法解析';
      void phone.presentGeneratedPage(app.id, 'failed-draft', '解析失败草稿', { draftId: result.draft.id });
      return;
    }
    if (result.status === 'saved') {
      toastr.success('已生成并保存');
      void phone.presentGeneratedPage(app.id, 'entry', result.saved.entry.title, { entryId: result.saved.entry.id });
      return;
    }
    generationState.preview = {
      content: result.data.content,
      draftId: null,
      raw: result.rawOutput,
      source: { floorEnd: getSourceLastFloor(result.source), label: result.source.label },
      title: result.data.title,
      warnings: result.warnings,
    };
    persistPreviewDraft();
    void phone.presentGeneratedPage(app.id, 'preview', `${app.name}预览`);
  } catch (error) {
    generationState.error = error instanceof Error ? error.message : '生成失败';
  }
}

function stopGeneration() {
  if (generationState.generationId) stopGenerationByIdSafe(generationState.generationId);
}

function saveGenerationPreview() {
  const preview = generationState.preview;
  const app = definition.value;
  if (!preview || !app) return;
  const title = resolveCustomGeneratedTitle(app, preview, entries.value.length + 1, preview.source.floorEnd);
  const entry = customApps.createEntry(app.id, {
    title,
    content: preview.content,
    directoryOrder: preview.source.floorEnd,
    sourceFloorEnd: preview.source.floorEnd,
    sourceLabel: preview.source.label,
  });
  if (preview.draftId) customApps.deleteFailedDraft(app.id, preview.draftId);
  clearPreviewDraft();
  generationState.preview = null;
  toastr.success('内容已保存');
  phone.replacePage('entry', entry.title, { entryId: entry.id });
}

function reparsePreviewRaw() {
  const preview = generationState.preview;
  if (!preview) return false;
  const parsed = parseSimpleXmlResult(
    preview.raw.trim(),
    definition.value?.display.mode === 'frontend' ? { preserveContentMarkup: true } : undefined,
  );
  if (!parsed.ok) {
    preview.warnings = parsed.warnings;
    toastr.warning(parsed.warnings.join('；') || '仍然无法解析');
    return false;
  }
  preview.title = parsed.data.title;
  preview.content = parsed.data.content;
  preview.raw = parsed.raw;
  preview.warnings = parsed.warnings;
  toastr.success('已重新解析');
  return true;
}

function reparseFailedDraft() {
  const draft = activeFailedDraft.value;
  if (!draft) return;
  const parsed = parseSimpleXmlResult(
    failedDraftRawOutput.value.trim(),
    definition.value?.display.mode === 'frontend' ? { preserveContentMarkup: true } : undefined,
  );
  if (!parsed.ok) {
    customApps.updateFailedDraft(hostAppId, draft.id, failedDraftRawOutput.value, parsed.warnings);
    toastr.warning(parsed.warnings.join('；') || '仍然无法解析');
    return;
  }
  generationState.preview = {
    content: parsed.data.content,
    draftId: draft.id,
    raw: parsed.raw,
    source: { floorEnd: getSourceLastFloor(draft.source), label: draft.source.label },
    title: parsed.data.title,
    warnings: parsed.warnings,
  };
  persistPreviewDraft();
  phone.replacePage('preview', `${definition.value?.name || '自制 App'}预览`);
}

async function removeFailedDraft(draftId: string) {
  const confirmed = await phone.confirmNotice('删除这条解析失败草稿吗？', { confirmLabel: '删除', kind: 'warning' });
  if (!confirmed) return;
  customApps.deleteFailedDraft(hostAppId, draftId);
  if (route.value.page === 'failed-draft') phone.replacePage('root', definition.value?.name || '自制 App');
}

async function removeEntry(entryId: string) {
  if (!definition.value) return;
  const confirmed = await phone.confirmNotice('删除当前内容吗？', { confirmLabel: '删除', kind: 'warning' });
  if (!confirmed) return;
  customApps.deleteEntry(definition.value.id, entryId);
  toastr.success('内容已删除');
  phone.replacePage('root', definition.value.name);
}

function scrollToTop() {
  document.querySelector('.pc-custom-detail-page .pc-detail-content')?.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToBottom() {
  const element = document.querySelector('.pc-custom-detail-page .pc-detail-content');
  element?.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
}
</script>

<style scoped>
.pc-custom-app,
.pc-custom-page,
.pc-custom-entry-list {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 12px;
}

.pc-custom-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px;
}

.pc-custom-search {
  position: relative;
  min-width: 0;
}

.pc-custom-search > i {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: 14px;
  color: var(--pc-muted);
  transform: translateY(-50%);
}

.pc-custom-search .pc-field {
  padding-left: 40px;
}

.pc-custom-create-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pc-custom-create-actions .pc-soft-btn.active,
.pc-custom-entry-row.selected {
  border-color: var(--pc-theme-accent);
  color: var(--pc-theme-accent);
}

.pc-extract-mode-segment,
.pc-extract-preview-head {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.pc-extract-role-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
}

.pc-extract-role-row > span {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.pc-extract-role-row small {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-extract-role-toggle {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-extract-mode-segment .pc-segment-btn {
  flex: 1 1 0;
}

.pc-extract-preview-list {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 10px;
}

.pc-extract-preview-row {
  display: grid;
  min-width: 0;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  padding: 12px;
}

.pc-extract-preview-row > span {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
}

.pc-extract-preview-row small,
.pc-extract-preview-row em {
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.4;
}

.pc-extract-preview-row em {
  grid-column: 2;
  color: var(--pc-danger);
  font-style: normal;
}

.pc-extract-save-actions {
  position: sticky;
  bottom: 0;
  z-index: 3;
  padding: 10px 0;
  background: var(--pc-bg);
}

.pc-custom-entry-row {
  display: grid;
  width: 100%;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 14px;
  border-color: var(--pc-border);
  color: var(--pc-text);
  text-align: left;
}

.pc-custom-entry-row:has(> .fa-square-check),
.pc-custom-entry-row:has(> .fa-square) {
  grid-template-columns: auto minmax(0, 1fr);
}

.pc-custom-entry-row.selected .pc-custom-entry-copy {
  color: var(--pc-text);
}

.pc-custom-selection-actions {
  position: sticky;
  z-index: 4;
  bottom: 0;
  padding: 10px 0;
  background: var(--pc-bg);
}

.pc-custom-visible-actions {
  display: flex;
  justify-content: flex-end;
  margin: 0 0 12px;
}

.pc-custom-entry-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}

.pc-custom-entry-copy strong,
.pc-custom-entry-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
}

.pc-custom-entry-copy small {
  display: -webkit-box;
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.pc-custom-tag-line {
  display: flex;
  max-height: 30px;
  gap: 5px;
  overflow: auto hidden;
}

.pc-custom-tag-line span {
  flex: 0 0 auto;
  padding: 3px 7px;
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
  color: var(--pc-muted);
  font-size: 11px;
}

.pc-field-group + .pc-field-group {
  margin-top: 14px;
}

.pc-custom-plain-text {
  width: 100%;
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: var(--pc-text);
  font: inherit;
  line-height: 1.75;
}
</style>
