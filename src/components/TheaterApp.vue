<template>
  <section class="pc-theater-app">
    <TheaterCatalogPage
      v-if="route.page === 'root'"
      v-model:custom-type-name="customTypeName"
      v-model:custom-type-open="customTypeOpen"
      v-model:query="query"
      v-model:type-view="typeView"
      :entry-count="entries.length"
      :failed-drafts="failedDrafts"
      :get-failed-draft-context="failedDraftContextSummary"
      :get-failed-draft-title="() => '未解析小剧场'"
      :preview-draft="theaterPreviewDraft"
      :type-usage-counts="typeUsageCounts"
      :visible-type-prompts="visibleTypePrompts"
      @discard-preview="discardTheaterPreviewDraft"
      @open-custom-generate="openCustomGenerate"
      @open-failed-draft="openFailedDraft"
      @open-generate="openGenerate"
      @open-history="openHistory"
      @open-preview="openTheaterPreviewDraft"
      @remove-failed-draft="removeFailedDraft"
    />

    <TheaterHistoryPage
      v-else-if="route.page === 'history'"
      v-model:filter-open="historyFilterOpen"
      v-model:query="query"
      v-model:sort-desc="sortDesc"
      :entries="filteredEntries"
      :filtered-history-type-tabs="filteredHistoryTypeTabs"
      :history-type-tabs="historyTypeTabs"
      :selected-type-keys="selectedHistoryTypeKeys"
      @clear-filters="clearHistoryTypeFilters"
      @invert-visible="invertVisibleHistoryTypeFilters"
      @open-entry="openEntry"
      @toggle-filter="toggleHistoryTypeFilter"
    />

    <TheaterEntryEditorPage
      v-else-if="route.page === 'editor'"
      v-model:content="draft.content"
      v-model:render-mode="draft.renderMode"
      :title="editingEntry?.title"
      @cancel="phone.goBack()"
      @save="submitEntry"
    />

    <TheaterEntryDetailPage
      v-else-if="route.page === 'entry' && activeEntry"
      v-model:catalog-open="showCatalogModal"
      :catalog-items="entryCatalogItems"
      :entry="activeEntry"
      :next-entry-id="nextEntryId"
      :phone-open="isOpen"
      :previous-entry-id="previousEntryId"
      :theme="settings.theme"
      :viewed-entry="viewedEntry"
      :viewed-version-id="viewedEntryVersionId"
      @bagu="openTheaterBaguScan"
      @bottom="scrollToBottom"
      @edit="openEditEntry(activeEntry.id, viewedEntryVersionId)"
      @erase="overwriteTheaterContent"
      @favorite="theater.toggleFavorite(activeEntry.id)"
      @filter-type="filterTheaterRecords"
      @navigate-blocked="handleFrameNavigateBlocked"
      @next="openEntry(nextEntryId, true)"
      @previous="openEntry(previousEntryId, true)"
      @remove="removeEntry(activeEntry.id)"
      @rewrite="openRewrite(activeEntry.id)"
      @select-catalog="selectCatalogEntry"
      @select-version="selectTheaterVersion"
      @split-version="splitCurrentTheaterVersion"
      @top="scrollToTop"
    />

    <BaguDetailPage
      v-else-if="route.page === 'bagu-scan' && activeEntry"
      :apply-handler="applyTheaterBaguContent"
      :content="viewedEntry.content"
      :title="viewedEntry.title"
    />

    <GenerationFormPage
      v-else-if="route.page === 'generate'"
      v-model:from-start-end="generationDraft.fromStartEnd"
      v-model:range-text="generationDraft.rangeText"
      v-model:recent-count="generationDraft.recentCount"
      v-model:references="selectedReferences"
      v-model:single-message-id="generationDraft.singleMessageId"
      v-model:source-mode="generationSourceMode"
      v-model:user-requirement="generationDraft.userRequirement"
      :capture="captureTheaterPrompt"
      :capture-reset-key="generationPromptPreview"
      :error="generationState.error"
      kicker="类型配置"
      :raw-output="generationState.rawOutput"
      requirement-placeholder="例如：更强调舞台调度、停顿和角色对视。"
      :running="generationState.running"
      @cancel="phone.goBack()"
      @generate="runGeneration"
      @stop="stopGeneration"
    >
      <template #before-fields>
        <SearchableCombobox
          v-model="generationTypeChoice"
          :disabled="generationState.running"
          :empty-label="t`没有匹配类型`"
          :input-label="t`选择小剧场类型`"
          :options="theaterTypeComboboxOptions"
          :placeholder="t`选择或搜索小剧场类型`"
          :toggle-title="t`展开类型列表`"
        />

        <input
          v-if="showGenerationCustomTypeField"
          v-model="generationDraft.typeName"
          class="pc-field"
          type="text"
          :disabled="generationState.running"
          :placeholder="t`自定义类型名称`"
        />
        <textarea
          v-model="generationDraft.typePrompt"
          class="pc-area compact"
          :disabled="generationState.running"
          :placeholder="t`小剧场类型提示词`"
        ></textarea>
        <div class="pc-segment pc-mode-selector">
          <button
            :class="['pc-segment-btn', { active: generationDraft.renderMode === 'markdown' }]"
            type="button"
            :disabled="generationState.running"
            @click="generationDraft.renderMode = 'markdown'"
          >
            {{ t`Markdown 文本` }}
          </button>
          <button
            :class="['pc-segment-btn', { active: generationDraft.renderMode === 'frontend' }]"
            type="button"
            :disabled="generationState.running"
            @click="generationDraft.renderMode = 'frontend'"
          >
            {{ t`网页渲染` }}
          </button>
        </div>
      </template>
    </GenerationFormPage>

    <GenerationPreviewPage
      v-else-if="route.page === 'preview' && generationState.preview"
      v-model:content="generationState.preview.content"
      v-model:raw="generationState.preview.raw"
      :reparse-handler="reparsePreviewRaw"
      :save-label="generationState.preview.mode === 'rewrite' ? '保存新版本' : '保存为条目'"
      :source-label="generationState.preview.source.label"
      :text-provider-summary="generationState.preview.typeName"
      :title="generationState.preview.title"
      :warnings="generationState.preview.warnings"
      @back="returnToGenerate"
      @reparse="reparsePreviewRaw"
      @save="savePreview"
    >
      <template #content="{ displayContent }">
        <div class="pc-preview-render-toolbar">
          <span class="pc-field-label">{{ t`解析与预览方式` }}</span>
          <span class="pc-segment">
            <button
              :class="['pc-segment-btn', { active: generationState.preview.renderMode === 'markdown' }]"
              type="button"
              @click="switchPreviewRenderMode('markdown')"
            >
              Markdown
            </button>
            <button
              :class="['pc-segment-btn', { active: generationState.preview.renderMode === 'frontend' }]"
              type="button"
              @click="switchPreviewRenderMode('frontend')"
            >
              {{ t`网页渲染` }}
            </button>
          </span>
        </div>
        <FrontendFrame
          v-if="generationState.preview.renderMode === 'frontend'"
          :active="isOpen"
          :content="displayContent"
          :theme="settings.theme"
          :title="generationState.preview.title"
          @navigate-blocked="handleFrameNavigateBlocked"
        />
        <!-- eslint-disable-next-line vue/no-v-html -->
        <article
          v-else
          class="pc-detail-content pc-rendered-markdown"
          v-html="renderMarkdown(formatReaderContent(displayContent, settings.reader))"
        ></article>
      </template>
    </GenerationPreviewPage>

    <FailedDraftRepairPage
      v-else-if="route.page === 'failed-draft' && activeFailedDraft"
      v-model:raw-output="failedDraftRawOutput"
      :source-label="activeFailedDraft.source.label"
      title="修复小剧场草稿"
      @delete="removeFailedDraft(activeFailedDraft.id)"
      @reparse="reparseFailedDraft"
    >
      <template #before-editor>
        <div class="pc-segment pc-mode-selector" aria-label="小剧场解析方式">
          <button
            :class="['pc-segment-btn', { active: failedDraftRenderMode === 'markdown' }]"
            type="button"
            @click="selectFailedDraftRenderMode('markdown')"
          >
            {{ t`Markdown 文本` }}
          </button>
          <button
            :class="['pc-segment-btn', { active: failedDraftRenderMode === 'frontend' }]"
            type="button"
            @click="selectFailedDraftRenderMode('frontend')"
          >
            {{ t`网页渲染` }}
          </button>
        </div>
      </template>
    </FailedDraftRepairPage>

    <section v-else class="pc-theater-page">
      <EmptyState :title="t`小剧场页面已刷新`" />
    </section>
  </section>
</template>

<script setup lang="ts">
import BaguDetailPage from '@/components/BaguDetailPage.vue';
import EmptyState from '@/components/EmptyState.vue';
import FailedDraftRepairPage from '@/components/FailedDraftRepairPage.vue';
import FrontendFrame from '@/components/FrontendFrame.vue';
import GenerationFormPage from '@/components/GenerationFormPage.vue';
import GenerationPreviewPage from '@/components/GenerationPreviewPage.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import TheaterCatalogPage from '@/components/theater/TheaterCatalogPage.vue';
import TheaterEntryDetailPage from '@/components/theater/TheaterEntryDetailPage.vue';
import TheaterEntryEditorPage from '@/components/theater/TheaterEntryEditorPage.vue';
import TheaterHistoryPage from '@/components/theater/TheaterHistoryPage.vue';
import { useGenerationReplaySession } from '@/composables/useGenerationReplaySession';
import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import { buildGenerationPreview, captureGenerationPrompt, generateContent } from '@/core/generationService';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import { useTheaterStore } from '@/store/theater';
import type { CharacterRef } from '@/type/diary';
import type { FailedGenerationDraft, GenerationReplaySnapshot, HiddenGenerationRecord } from '@/type/generation';
import type { TheaterRenderMode } from '@/type/theater';
import { canOpenBaguScan } from '@/util/baguScanGate';
import { useDetailScroll } from '@/util/detailScroll';
import { parseTheaterXmlResult } from '@/util/generation';
import { resolveGenerationReplayReferences } from '@/util/generationReplay';
import { createHiddenGenerationRecord, resolveHiddenGenerationReplay } from '@/util/hiddenGenerationRecord';
import { renderMarkdown } from '@/util/markdown';
import { formatReaderContent } from '@/util/readerContent';
import { formatGenerationReferences, type GenerationReferenceItem } from '@/util/references';
import { resolveContentVersion } from '@/util/contentVersions';
import { usePreviewDraftPersistence } from '@/util/previewDrafts';
import { useInvalidRouteFallback } from '@/util/routeFallback';
import { stopGenerationByIdSafe } from '@/util/runtime';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const prompts = usePromptStore();
const settingsStore = useSettingsStore();
const theater = useTheaterStore();
const theaterGenerationAdapter = getRegisteredPhoneGenerationAdapter('theater', 'generate');
const CUSTOM_THEATER_TYPE_VALUE = '__custom_theater_type__';
const { currentRoute: route, isOpen } = storeToRefs(phone);
const { settings } = storeToRefs(settingsStore);
const generationSourceMode = computed({
  get: () => settings.value.generation.sourceMode,
  set: value => {
    settings.value.generation.sourceMode = value;
  },
});
const replaySession = useGenerationReplaySession({
  appId: 'theater',
  defaultPresetName: () => settings.value.generation.tavernPresetName,
  page: 'generate',
  sourceMode: generationSourceMode,
});
const { entries, failedDrafts } = storeToRefs(theater);
const { appPrompts, typePrompts } = storeToRefs(prompts);

const query = ref('');
const typeView = ref<'all' | 'recent'>('recent');
const sortDesc = computed({
  get: () => settings.value.directorySort.theaterDesc,
  set: value => {
    settings.value.directorySort.theaterDesc = value;
  },
});
const selectedHistoryTypeKeys = ref(new Set<string>());
const historyFilterOpen = ref(false);
const customTypeOpen = ref(false);
const customTypeName = ref('');
const draft = reactive({
  content: '',
  participants: '',
  renderMode: 'markdown' as TheaterRenderMode,
  title: '',
  typeId: '',
  typeName: '',
});
const generationDraft = reactive({
  fromStartEnd: 20,
  rangeText: '',
  recentCount: 20,
  renderMode: 'markdown' as TheaterRenderMode,
  singleMessageId: 0,
  typeId: '',
  typeName: '',
  typePrompt: '',
  userRequirement: '',
});

const generationState = reactive({
  error: '',
  generationId: '',
  preview: null as null | {
    content: string;
    draftId: null | string;
    raw: string;
    renderMode: TheaterRenderMode;
    source: {
      label: string;
    };
    title: string;
    mode: 'create' | 'rewrite';
    generationRecord?: HiddenGenerationRecord;
    replay?: GenerationReplaySnapshot;
    targetEntryId: string;
    targetVersionId: string;
    typeId?: string;
    typeName: string;
    warnings: string[];
  },
  rawOutput: '',
  running: false,
});

type TheaterPreview = NonNullable<typeof generationState.preview>;

const {
  clearPreviewDraft: clearTheaterPreviewDraft,
  discardPreviewDraft: discardTheaterPreviewDraft,
  draft: theaterPreviewDraft,
  openPreviewDraft: openTheaterPreviewDraft,
  persistPreviewDraft: persistTheaterPreviewDraft,
} = usePreviewDraftPersistence<TheaterPreview>({
  appId: 'theater',
  consumeFailedDraft: draftId => theater.deleteFailedDraft(draftId),
  getPreview: () => generationState.preview,
  getRouteParams: () => ({}),
  page: 'preview',
  route,
  setPreview: preview => {
    generationState.preview = preview;
  },
  title: '生成预览',
});

const failedDraftRawOutput = ref('');
const failedDraftRenderMode = ref<TheaterRenderMode>('markdown');
const generationCustomTypeSelected = ref(false);
const selectedReferences = ref<GenerationReferenceItem[]>([]);
const entryContentEl = ref<HTMLElement | null>(null);
const { scrollToBottom, scrollToTop } = useDetailScroll(entryContentEl, '.pc-theater-detail-page .pc-detail-content');
const showCatalogModal = ref(false);

const theaterTypePrompts = computed(() => typePrompts.value.filter(item => item.domain === 'theater'));
const activeEntry = computed(() => {
  const entryId = route.value.params?.entryId;
  return entryId ? theater.getEntry(entryId) : null;
});
const viewedEntryVersion = computed(() => {
  const entry = activeEntry.value;
  if (!entry) return null;
  return resolveContentVersion(entry.versions, entry.activeVersionId, route.value.params?.versionId);
});
const viewedEntryVersionId = computed(() => viewedEntryVersion.value?.id || activeEntry.value?.activeVersionId || '');
const viewedEntry = computed(() => {
  const entry = activeEntry.value;
  const version = viewedEntryVersion.value;
  return entry && version
    ? {
        ...entry,
        content: version.content,
        generationRecord: version.generationRecord,
        generationReplay: version.generationReplay,
        renderMode: version.renderMode,
        title: version.title,
      }
    : entry;
});
const rewriteTargetEntry = computed(() => {
  const entryId = route.value.params?.rewriteEntryId;
  return entryId ? theater.getEntry(entryId) : null;
});
const rewriteTargetVersion = computed(() => {
  const entry = rewriteTargetEntry.value;
  if (!entry) return null;
  return resolveContentVersion(entry.versions, entry.activeVersionId, route.value.params?.versionId);
});
const theaterGenerationMode = computed<'create' | 'rewrite'>(() => (rewriteTargetEntry.value ? 'rewrite' : 'create'));
const theaterGenerationAppPrompt = computed(() => appPrompts.value.theater);
const rewriteGenerationReplay = computed(() =>
  rewriteTargetEntry.value?.versions.length
    ? rewriteTargetVersion.value
      ? resolveHiddenGenerationReplay(rewriteTargetVersion.value)
      : undefined
    : rewriteTargetEntry.value
      ? resolveHiddenGenerationReplay(rewriteTargetEntry.value)
      : undefined,
);
const detailEntries = computed(() =>
  [...entries.value].sort((left, right) => {
    const compare = left.createdAt.localeCompare(right.createdAt);
    return sortDesc.value ? -compare : compare;
  }),
);
const activeEntryIndex = computed(() =>
  activeEntry.value ? detailEntries.value.findIndex(entry => entry.id === activeEntry.value?.id) : -1,
);
const previousEntryId = computed(() =>
  activeEntryIndex.value > 0 ? detailEntries.value[activeEntryIndex.value - 1]?.id || '' : '',
);
const nextEntryId = computed(() =>
  activeEntryIndex.value >= 0 ? detailEntries.value[activeEntryIndex.value + 1]?.id || '' : '',
);
const entryCatalogItems = computed(() =>
  detailEntries.value.map(entry => ({
    id: entry.id,
    title: entry.title,
    versionCount: Math.max(1, entry.versions.length),
  })),
);
const editingEntry = computed(() => (route.value.params?.entryId && activeEntry.value ? activeEntry.value : null));
const activeFailedDraft = computed(() => {
  const draftId = route.value.params?.draftId;
  return draftId ? theater.getFailedDraft(draftId) : null;
});
const formattedReferences = computed(() => formatGenerationReferences(selectedReferences.value));
const selectedEditorTypePrompt = computed(() => (draft.typeId ? prompts.getTypePrompt(draft.typeId) : null));
const selectedGenerationTypePrompt = computed(() =>
  generationDraft.typeId ? prompts.getTypePrompt(generationDraft.typeId) : null,
);
const theaterTypeComboboxOptions = computed(() => [
  { label: '+ 自定义', value: CUSTOM_THEATER_TYPE_VALUE },
  ...theaterTypePrompts.value.map(typePrompt => ({ label: typePrompt.name, value: typePrompt.id })),
]);
const typeUsageCounts = computed(() => {
  const counts = new Map<string, number>();
  for (const entry of entries.value) {
    counts.set(entry.typeId || entry.typeName, (counts.get(entry.typeId || entry.typeName) || 0) + 1);
  }
  return counts;
});
const historyTypeTabs = computed(() => {
  const groups = new Map<
    string,
    {
      count: number;
      key: string;
      label: string;
      latest: string;
    }
  >();
  for (const entry of entries.value) {
    const label = entry.typeName.trim() || '未分类小剧场';
    const key = label;
    const current = groups.get(key);
    if (current) {
      current.count += 1;
      if (entry.updatedAt > current.latest) current.latest = entry.updatedAt;
      continue;
    }
    groups.set(key, {
      count: 1,
      key,
      label,
      latest: entry.updatedAt,
    });
  }
  return [...groups.values()].sort(
    (left, right) =>
      right.count - left.count ||
      right.latest.localeCompare(left.latest) ||
      left.label.localeCompare(right.label, 'zh-CN'),
  );
});
const filteredHistoryTypeTabs = computed(() => {
  const keyword = query.value.trim().toLocaleLowerCase();
  return historyTypeTabs.value
    .filter(tab => !keyword || tab.label.toLocaleLowerCase().includes(keyword))
    .sort((left, right) => {
      const selectedDifference =
        Number(selectedHistoryTypeKeys.value.has(right.key)) - Number(selectedHistoryTypeKeys.value.has(left.key));
      return selectedDifference || right.count - left.count || left.label.localeCompare(right.label, 'zh-CN');
    });
});
const generationTypeChoice = computed({
  get() {
    return generationCustomTypeSelected.value ? CUSTOM_THEATER_TYPE_VALUE : generationDraft.typeId;
  },
  set(value: string) {
    if (value === CUSTOM_THEATER_TYPE_VALUE) {
      startCustomGenerationType();
      return;
    }
    selectGenerationTypePrompt(value);
  },
});
const showGenerationCustomTypeField = computed(() => generationCustomTypeSelected.value);
const filteredTypePrompts = computed(() => {
  const normalized = query.value.trim().toLowerCase();
  const source = normalized
    ? theaterTypePrompts.value.filter(prompt => {
        if (prompt.name.toLowerCase().includes(normalized)) return true;
        return entries.value.some(
          entry =>
            (entry.typeId === prompt.id || entry.typeName === prompt.name) &&
            `${entry.title}\n${entry.content}`.toLowerCase().includes(normalized),
        );
      })
    : theaterTypePrompts.value;

  return [...source].sort((left, right) => {
    const leftCount = typeUsageCounts.value.get(left.id) || typeUsageCounts.value.get(left.name) || 0;
    const rightCount = typeUsageCounts.value.get(right.id) || typeUsageCounts.value.get(right.name) || 0;
    return rightCount - leftCount || left.name.localeCompare(right.name, 'zh-CN');
  });
});
const recentTypePrompts = computed(() => {
  const promptByKey = new Map<string, (typeof theaterTypePrompts.value)[number]>();
  theaterTypePrompts.value.forEach(prompt => {
    promptByKey.set(prompt.id, prompt);
    promptByKey.set(prompt.name, prompt);
  });
  const seen = new Set<string>();
  const recent = [...entries.value]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map(entry => promptByKey.get(entry.typeId) || promptByKey.get(entry.typeName))
    .filter((prompt): prompt is (typeof theaterTypePrompts.value)[number] => Boolean(prompt))
    .filter(prompt => {
      if (seen.has(prompt.id)) return false;
      seen.add(prompt.id);
      return true;
    })
    .slice(0, 12);
  return recent.length ? recent : filteredTypePrompts.value.slice(0, 12);
});
const visibleTypePrompts = computed(() => {
  if (query.value.trim() || typeView.value === 'all') return filteredTypePrompts.value;
  return recentTypePrompts.value;
});
const filteredEntries = computed(() => {
  const normalized = query.value.trim().toLowerCase();
  const activeTypeKeys = selectedHistoryTypeKeys.value;
  const source = entries.value.filter(entry => {
    const typeKey = entry.typeName.trim() || '未分类小剧场';
    if (activeTypeKeys.size && !activeTypeKeys.has(typeKey)) return false;
    if (!normalized) return true;
    return (
      entry.title.toLowerCase().includes(normalized) ||
      entry.typeName.toLowerCase().includes(normalized) ||
      entry.participants.some(item => item.name.toLowerCase().includes(normalized))
    );
  });

  return [...source].sort((left, right) => {
    const compare = left.createdAt.localeCompare(right.createdAt);
    return sortDesc.value ? -compare : compare;
  });
});
const generationPromptPreview = computed(() => {
  try {
    return buildGenerationPreview(
      theaterGenerationAdapter,
      {
        appPrompt: theaterGenerationAppPrompt.value,
        entryId: rewriteTargetEntry.value?.id || '',
        existingContent: '',
        mode: theaterGenerationMode.value,
        outputFormat: buildOutputFormat(generationDraft.renderMode),
        renderMode: generationDraft.renderMode,
        typeId: generationDraft.typeId,
        typeName: generationDraft.typeName,
        typePrompt: generationDraft.typePrompt,
        userRequirement: generationDraft.userRequirement,
      },
      {
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
      },
    ).text;
  } catch (error) {
    return error instanceof Error ? error.message : '无法生成提示词预览';
  }
});

function captureTheaterPrompt() {
  return captureGenerationPrompt(
    theaterGenerationAdapter,
    {
      appPrompt: theaterGenerationAppPrompt.value,
      entryId: rewriteTargetEntry.value?.id || '',
      existingContent: '',
      mode: theaterGenerationMode.value,
      outputFormat: buildOutputFormat(generationDraft.renderMode),
      renderMode: generationDraft.renderMode,
      typeId: generationDraft.typeId,
      typeName: generationDraft.typeName,
      typePrompt: generationDraft.typePrompt,
      userRequirement: generationDraft.userRequirement,
    },
    {
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
    },
  );
}
watch(
  () => route.value,
  (current, previous) => {
    if (current.appId !== 'theater') {
      replaySession.release();
      return;
    }
    if (current.page !== 'generate' && current.page !== 'preview') replaySession.release();
    if (current.page === 'editor') {
      draft.content = viewedEntry.value?.content || '';
      draft.participants = participantsToText(activeEntry.value?.participants || []);
      draft.renderMode = viewedEntry.value?.renderMode || 'markdown';
      draft.title = viewedEntry.value?.title || '';
      draft.typeId = activeEntry.value?.typeId || '';
      draft.typeName = activeEntry.value?.typeName || '';
    }

    if (current.page === 'generate' && previous?.page !== 'preview') {
      replaySession.release();
      const initialTypePrompt = prompts.getTypePrompt(current.params?.typeId || '');
      const continuationEntry = current.params?.entryId
        ? theater.getEntry(current.params.entryId)
        : current.params?.rewriteEntryId
          ? theater.getEntry(current.params.rewriteEntryId)
          : null;
      const customTypeName =
        typeof current.params?.customTypeName === 'string' ? current.params.customTypeName.trim() : '';
      selectedReferences.value = [];
      generationDraft.rangeText = '';
      generationDraft.renderMode =
        continuationEntry?.renderMode || (initialTypePrompt?.renderMode === 'frontend' ? 'frontend' : 'markdown');
      generationDraft.singleMessageId = 0;
      generationDraft.typeId = current.params?.typeId || '';
      generationDraft.typeName = initialTypePrompt?.name || customTypeName;
      generationDraft.typePrompt = initialTypePrompt?.prompt || '';
      generationDraft.userRequirement = '';
      generationCustomTypeSelected.value = Boolean(customTypeName && !initialTypePrompt);
      generationState.error = '';
      generationState.preview = null;
      generationState.rawOutput = '';

      const replay = rewriteGenerationReplay.value;
      if (replay) {
        selectedReferences.value = resolveGenerationReplayReferences(replay);
        replaySession.applyReplay(replay, generationDraft);
        const replayRenderMode = replay.config.renderMode;
        if (replayRenderMode === 'markdown' || replayRenderMode === 'frontend') {
          generationDraft.renderMode = replayRenderMode;
        }
        generationDraft.typeId =
          typeof replay.config.typeId === 'string' ? replay.config.typeId : generationDraft.typeId;
        generationDraft.typeName =
          typeof replay.config.typeName === 'string' ? replay.config.typeName : generationDraft.typeName;
        generationDraft.typePrompt =
          typeof replay.config.typePrompt === 'string' ? replay.config.typePrompt : generationDraft.typePrompt;
      }
    }

    if (current.page === 'failed-draft') {
      failedDraftRawOutput.value = activeFailedDraft.value?.rawOutput || '';
      failedDraftRenderMode.value =
        activeFailedDraft.value?.context.renderMode === 'frontend' ? 'frontend' : 'markdown';
    }
  },
  { immediate: true, deep: true },
);

useInvalidRouteFallback({
  source: () => ({
    appId: route.value.appId,
    hasEntry: Boolean(activeEntry.value),
    hasFailedDraft: Boolean(activeFailedDraft.value),
    hasPreview: Boolean(generationState.preview),
    page: route.value.page,
  }),
  isInvalid: current =>
    current.appId === 'theater' &&
    ((current.page === 'preview' && !current.hasPreview) ||
      (['entry', 'bagu-scan'].includes(current.page) && !current.hasEntry) ||
      (current.page === 'failed-draft' && !current.hasFailedDraft)),
  fallback: () => {
    if (route.value.appId !== 'theater') return;
    phone.replacePage(entries.value.length ? 'history' : 'root', entries.value.length ? '小剧场记录' : '小剧场');
  },
});

onScopeDispose(() => {
  if (generationState.running && generationState.generationId) {
    stopGenerationByIdSafe(generationState.generationId);
  }
});

function participantsToText(participants: CharacterRef[]) {
  return participants.map(item => item.name).join('，');
}

function parseParticipants(raw: string) {
  const seen = new Set<string>();
  return raw
    .split(/[\n,，]/g)
    .map(item => item.trim())
    .filter(Boolean)
    .filter(item => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(name => ({ name }));
}

function draftContextSummary(context: Record<string, unknown>) {
  return typeof context.typeName === 'string' && context.typeName.trim() ? context.typeName : '未分类小剧场';
}

function failedDraftContextSummary(draft: FailedGenerationDraft) {
  return draftContextSummary(draft.context);
}

function selectGenerationTypePrompt(promptId: string) {
  const prompt = prompts.getTypePrompt(promptId);
  generationCustomTypeSelected.value = false;
  generationDraft.typeId = promptId;
  if (prompt) {
    generationDraft.typeName = prompt.name;
    generationDraft.typePrompt = prompt.prompt;
    generationDraft.renderMode = prompt.renderMode === 'frontend' ? 'frontend' : 'markdown';
  }
}

function startCustomGenerationType() {
  generationCustomTypeSelected.value = true;
  generationDraft.typeId = '';
  generationDraft.typeName = '';
  generationDraft.typePrompt = '';
  generationDraft.renderMode = 'markdown';
}

function openEditEntry(entryId: string, versionId?: string) {
  phone.pushPage('editor', '编辑小剧场', { entryId, ...(versionId ? { versionId } : {}) });
}

async function splitCurrentTheaterVersion() {
  const entry = activeEntry.value;
  const versionId = viewedEntryVersionId.value;
  if (!entry || !versionId || entry.versions.length <= 1) return;
  const versionIndex = entry.versions.findIndex(version => version.id === versionId);
  const confirmed = await phone.confirmNotice(
    `将当前版本 ${versionIndex + 1}/${entry.versions.length} 拆分为独立小剧场，并从原记录中移除吗？`,
    { confirmLabel: '拆分版本', kind: 'warning' },
  );
  if (!confirmed) return;
  const result = theater.splitEntryVersion(entry.id, versionId);
  if (!result) {
    toastr.warning('当前版本无法拆分');
    return;
  }
  toastr.success('已拆分为独立小剧场');
  phone.replacePage('entry', result.splitEntry.title, { entryId: result.splitEntry.id, versionId });
}

function openEntry(entryId: string, replaceCurrent = false) {
  if (!entryId) return;
  const entry = theater.getEntry(entryId);
  if (!entry) return;
  if (replaceCurrent) phone.replacePage('entry', entry.title, { entryId });
  else phone.pushPage('entry', entry.title, { entryId });
  void nextTick(() => scrollToTop('auto'));
}

function openTheaterBaguScan() {
  if (!activeEntry.value || !viewedEntry.value) return;
  if (!canOpenBaguScan(viewedEntry.value.content)) return;
  phone.pushPage('bagu-scan', '八股检测', {
    entryId: activeEntry.value.id,
    ...(viewedEntryVersionId.value ? { versionId: viewedEntryVersionId.value } : {}),
  });
}

function overwriteTheaterContent(content: string) {
  const entry = activeEntry.value;
  if (!entry) return;
  const versionId = viewedEntryVersionId.value;
  const result = versionId
    ? theater.updateEntryVersion(entry.id, versionId, {
        content,
        renderMode: viewedEntry.value.renderMode,
        title: viewedEntry.value.title,
      })
    : theater.updateEntry(entry.id, {
        content,
        renderMode: viewedEntry.value.renderMode,
        title: viewedEntry.value.title,
      });
  if (!result) return;
  toastr.success(versionId ? '已覆盖当前小剧场版本' : '已覆盖当前小剧场正文');
}

function selectCatalogEntry(entryId: string) {
  showCatalogModal.value = false;
  openEntry(entryId, true);
}

function openGenerate(typeId?: string, entryId?: string) {
  const params: Record<string, string> = {};
  if (typeId) params.typeId = typeId;
  if (entryId) params.entryId = entryId;
  phone.pushPage('generate', '小剧场配置', Object.keys(params).length ? params : undefined);
}

function openRewrite(entryId: string) {
  const entry = theater.getEntry(entryId);
  if (!entry) return;
  phone.pushPage('generate', '重新生成小剧场', {
    rewriteEntryId: entryId,
    typeId: entry.typeId || '',
    ...(viewedEntryVersionId.value ? { versionId: viewedEntryVersionId.value } : {}),
  });
}

function selectTheaterVersion(versionId: string) {
  if (!activeEntry.value) return;
  const entry = theater.activateEntryVersion(activeEntry.value.id, versionId);
  if (!entry) return;
  phone.replacePage('entry', entry.title, { entryId: entry.id, versionId });
}

async function removeTheaterVersion(versionId: string) {
  if (!activeEntry.value || activeEntry.value.versions.length <= 1) return;
  const versionIndex = activeEntry.value.versions.findIndex(version => version.id === versionId);
  if (versionIndex < 0) return;
  const shouldDelete = await phone.confirmNotice(
    `要删除当前查看的版本 ${versionIndex + 1}/${activeEntry.value.versions.length} 吗？只会删除这个版本。`,
    { confirmLabel: '删除此版本', kind: 'warning' },
  );
  if (!shouldDelete || !activeEntry.value) return;
  const versions = [...activeEntry.value.versions];
  const previousVersion = versions[(versionIndex - 1 + versions.length) % versions.length];
  const result = theater.deleteEntryVersion(activeEntry.value.id, versionId);
  if (!result) return;
  const entry = previousVersion ? theater.activateEntryVersion(result.entry.id, previousVersion.id) : result.entry;
  phone.replacePage('entry', entry?.title || result.activeVersion.title, {
    entryId: result.entry.id,
    versionId: previousVersion?.id || result.activeVersion.id,
  });
  toastr.success('已删除当前小剧场版本');
}

function openCustomGenerate() {
  const name = customTypeName.value.trim();
  if (!name) return;
  customTypeOpen.value = false;
  customTypeName.value = '';
  phone.pushPage('generate', '小剧场配置', { customTypeName: name });
}

function openHistory() {
  phone.pushPage('history', '小剧场记录');
}

function filterTheaterRecords(label: string) {
  const normalized = label.trim();
  if (!normalized) return;
  const matchedTab = historyTypeTabs.value.find(tab => tab.label === normalized);
  selectedHistoryTypeKeys.value = new Set(matchedTab ? [matchedTab.key] : []);
  if (route.value.page === 'history') return;
  phone.pushPage('history', '小剧场记录');
}

function clearHistoryTypeFilters() {
  selectedHistoryTypeKeys.value = new Set();
}

function invertVisibleHistoryTypeFilters() {
  const next = new Set(selectedHistoryTypeKeys.value);
  filteredHistoryTypeTabs.value.forEach(tab => {
    if (next.has(tab.key)) next.delete(tab.key);
    else next.add(tab.key);
  });
  selectedHistoryTypeKeys.value = next;
}

function toggleHistoryTypeFilter(key: string) {
  const next = new Set(selectedHistoryTypeKeys.value);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  selectedHistoryTypeKeys.value = next;
}

function openFailedDraft(draftId: string) {
  const failedDraft = theater.getFailedDraft(draftId);
  if (!failedDraft) return;
  phone.pushPage('failed-draft', '解析失败草稿', { draftId });
}

function selectFailedDraftRenderMode(renderMode: TheaterRenderMode) {
  failedDraftRenderMode.value = renderMode;
  if (!activeFailedDraft.value) return;
  theater.updateFailedDraftRenderMode(activeFailedDraft.value.id, renderMode);
}

function submitEntry() {
  const input = {
    content: draft.content,
    participants: parseParticipants(draft.participants),
    renderMode: draft.renderMode,
    title: draft.title,
    typeId: draft.typeId,
    typeName: draft.typeName,
  };

  if (editingEntry.value && route.value.params?.entryId) {
    const versionId = route.value.params?.versionId;
    const entry = versionId
      ? theater.updateEntryVersion(route.value.params.entryId, versionId, {
          content: input.content,
          renderMode: input.renderMode,
          title: input.title,
        })
      : theater.updateEntry(route.value.params.entryId, input);
    if (!entry) return;
    if (versionId) {
      theater.updateEntryMetadata(entry.id, {
        participants: input.participants,
        typeId: input.typeId,
        typeName: input.typeName,
      });
    }
    phone.replacePage('entry', versionId ? draft.title : entry.title, {
      entryId: entry.id,
      ...(versionId ? { versionId } : {}),
    });
    return;
  }

  const entry = theater.createEntry(input);
  phone.replacePage('entry', entry.title, { entryId: entry.id });
}

function applyTheaterBaguContent(content: string) {
  if (!activeEntry.value || !viewedEntry.value) return false;
  const input = {
    content,
    participants: [...activeEntry.value.participants],
    renderMode: viewedEntry.value.renderMode,
    title: viewedEntry.value.title,
    typeId: activeEntry.value.typeId,
    typeName: activeEntry.value.typeName,
  };
  const versionId = route.value.params?.versionId;
  const entry = versionId
    ? theater.updateEntryVersion(activeEntry.value.id, versionId, input)
    : theater.updateEntry(activeEntry.value.id, input);
  return Boolean(entry);
}

function buildOutputFormat(renderMode: TheaterRenderMode) {
  return prompts.resolveOutputFormat(renderMode === 'frontend' ? 'theater.frontend' : 'theater.markdown');
}

function returnToGenerate() {
  if (generationState.preview?.draftId) {
    phone.replacePage('failed-draft', '解析失败草稿', { draftId: generationState.preview.draftId });
    return;
  }
  const preview = generationState.preview;
  phone.replacePage('generate', preview?.mode === 'rewrite' ? '重新生成小剧场' : '小剧场配置', {
    ...(preview?.typeId ? { typeId: preview.typeId } : {}),
    ...(preview?.targetEntryId ? { rewriteEntryId: preview.targetEntryId } : {}),
    ...(preview?.targetVersionId ? { versionId: preview.targetVersionId } : {}),
  });
}

function saveGenerationTypePrompt() {
  const name = generationDraft.typeName.trim();
  const promptText = generationDraft.typePrompt.trim();
  if (!name && !promptText) return null;
  if (generationDraft.typeId) {
    const updated = prompts.updateTypePrompt(generationDraft.typeId, {
      domain: 'theater',
      name: name || selectedGenerationTypePrompt.value?.name || '未分类小剧场',
      prompt: promptText,
      renderMode: selectedGenerationTypePrompt.value?.renderMode === 'frontend' ? 'frontend' : 'markdown',
    });
    if (!updated) return null;
    generationDraft.typeName = updated.name;
    generationDraft.typePrompt = updated.prompt;
    generationCustomTypeSelected.value = false;
    return updated;
  }
  const created = prompts.createTypePrompt({
    domain: 'theater',
    name: name || '未分类小剧场',
    prompt: promptText,
    renderMode: generationDraft.renderMode,
  });
  generationDraft.typeId = created.id;
  generationDraft.typeName = created.name;
  generationDraft.typePrompt = created.prompt;
  generationCustomTypeSelected.value = false;
  return created;
}

async function runGeneration() {
  generationState.error = '';
  clearTheaterPreviewDraft();
  generationState.preview = null;
  generationState.rawOutput = '';
  const savedTypePrompt = saveGenerationTypePrompt();

  try {
    const result = await generateContent(
      theaterGenerationAdapter,
      {
        appPrompt: theaterGenerationAppPrompt.value,
        entryId: rewriteTargetEntry.value?.id || '',
        existingContent: '',
        mode: theaterGenerationMode.value,
        outputFormat: buildOutputFormat(generationDraft.renderMode),
        renderMode: generationDraft.renderMode,
        typeId: savedTypePrompt?.id || generationDraft.typeId,
        typeName: generationDraft.typeName,
        typePrompt: generationDraft.typePrompt,
        userRequirement: generationDraft.userRequirement,
      },
      {
        createFailedDraft: input => theater.createFailedDraft(input),
        generationDefaults: {
          resultMode: settings.value.generation.resultMode,
          stream: settings.value.generation.stream,
          tavernPresetName: settings.value.generation.tavernPresetName,
        },
        references: formattedReferences.value,
        referenceItems: selectedReferences.value,
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
        source: {
          fromStartEnd: generationDraft.fromStartEnd,
          mode: settings.value.generation.sourceMode,
          rangeText: generationDraft.rangeText,
          recentCount: generationDraft.recentCount,
          singleMessageId: generationDraft.singleMessageId,
        },
        textProvider: settings.value.textProvider,
      },
    );

    if (result.status === 'failed') {
      generationState.error = result.warnings.join('；') || '模型没有返回可解析的小剧场 XML';
      failedDraftRawOutput.value = result.rawOutput;
      toastr.warning('XML 解析失败，已保存到失败草稿');
      void phone.presentGeneratedPage('theater', 'failed-draft', '解析失败草稿', { draftId: result.draft.id });
      return;
    }

    if (result.status === 'saved') {
      toastr.success(theaterGenerationMode.value === 'rewrite' ? '已保存并切换到小剧场新版本' : '已生成并保存小剧场');
      void phone.presentGeneratedPage('theater', 'entry', result.data.title, {
        entryId: result.saved.entry.id,
        ...(result.saved.versionId ? { versionId: result.saved.versionId } : {}),
      });
      return;
    }

    generationState.preview = {
      content: result.data.content,
      draftId: null,
      raw: result.rawOutput,
      renderMode: generationDraft.renderMode,
      source: {
        label: result.source.label,
      },
      title: result.data.title,
      mode: theaterGenerationMode.value,
      generationRecord: result.generationRecord,
      targetEntryId: rewriteTargetEntry.value?.id || '',
      targetVersionId: rewriteTargetVersion.value?.id || '',
      typeId: generationDraft.typeId || undefined,
      typeName: generationDraft.typeName.trim() || '未分类小剧场',
      warnings: result.warnings,
    };
    persistTheaterPreviewDraft();
    void phone.presentGeneratedPage('theater', 'preview', '生成预览');
  } catch (error) {
    generationState.error = error instanceof Error ? error.message : '生成失败，请稍后再试';
  }
}

function savePreview() {
  const preview = generationState.preview;
  if (!preview) return;

  const saved =
    preview.mode === 'rewrite' && preview.targetEntryId
      ? theater.appendEntryVersion(preview.targetEntryId, {
          content: preview.content,
          generationRecord:
            preview.generationRecord ||
            (preview.replay ? createHiddenGenerationRecord('generate', preview.replay) : undefined),
          renderMode: preview.renderMode,
          title: preview.title,
        })
      : theater.createEntry({
          content: preview.content,
          generationRecord:
            preview.generationRecord ||
            (preview.replay ? createHiddenGenerationRecord('generate', preview.replay) : undefined),
          participants: [],
          renderMode: preview.renderMode,
          title: preview.title,
          typeId: preview.typeId,
          typeName: preview.typeName,
        });
  if (!saved) {
    toastr.warning('目标小剧场不存在，无法保存重写版本');
    return;
  }
  if (preview.draftId) {
    theater.deleteFailedDraft(preview.draftId);
  }
  clearTheaterPreviewDraft();
  generationState.preview = null;
  const entry = 'entry' in saved ? saved.entry : saved;
  const versionId = 'version' in saved ? saved.version.id : '';
  toastr.success(preview.mode === 'rewrite' ? '已保存并切换到小剧场新版本' : '已保存小剧场');
  phone.replacePage('entry', versionId ? preview.title : entry.title, {
    entryId: entry.id,
    ...(versionId ? { versionId } : {}),
  });
}

function reparsePreviewAs(renderMode: TheaterRenderMode, successMessage: string) {
  const preview = generationState.preview;
  if (!preview) return false;
  const rawOutput = preview.raw.trim();
  if (!rawOutput) {
    toastr.warning('先补一点可解析的 XML 内容');
    return false;
  }

  const parsed = parseTheaterXmlResult(
    rawOutput,
    renderMode === 'frontend' ? { preserveContentMarkup: true } : undefined,
  );
  if (!parsed.ok) {
    preview.raw = rawOutput;
    preview.warnings = parsed.warnings;
    toastr.warning(parsed.warnings.join('；') || '还是没能解析成功');
    return false;
  }

  preview.content = parsed.data.content;
  preview.raw = parsed.raw;
  preview.renderMode = renderMode;
  preview.title = parsed.data.title;
  preview.warnings = parsed.warnings;
  persistTheaterPreviewDraft();
  toastr.success(successMessage);
  return true;
}

function reparsePreviewRaw() {
  const preview = generationState.preview;
  if (!preview) return false;
  return reparsePreviewAs(preview.renderMode, '已按原始输出重新解析');
}

function switchPreviewRenderMode(renderMode: TheaterRenderMode) {
  const preview = generationState.preview;
  if (!preview || preview.renderMode === renderMode) return;
  reparsePreviewAs(renderMode, renderMode === 'frontend' ? '已切换为网页渲染' : '已切换为 Markdown');
}

function stopGeneration() {
  if (!generationState.generationId) return;
  stopGenerationByIdSafe(generationState.generationId);
  generationState.running = false;
  generationState.error = '生成已停止';
}

async function removeEntry(entryId: string) {
  const entry = theater.getEntry(entryId);
  if (entry && entry.versions.length > 1) {
    await removeTheaterVersion(viewedEntryVersionId.value);
    return;
  }
  const shouldDelete = await phone.confirmNotice(
    `要删除小剧场“${entry?.title || '未命名条目'}”的最后一个版本吗？删除后这条记录也会移除。`,
    {
      confirmLabel: '删除',
      kind: 'warning',
    },
  );
  if (!shouldDelete) return;
  theater.deleteEntry(entryId);
  if (route.value.page === 'entry' || route.value.page === 'editor') {
    phone.replacePage(entries.value.length ? 'history' : 'root', entries.value.length ? '小剧场记录' : '小剧场');
  }
  toastr.success('已删除小剧场');
}

async function removeFailedDraft(draftId: string) {
  const shouldDelete = await phone.confirmNotice('要删除这条解析失败草稿吗？原始输出也会一并移除。', {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!shouldDelete) return;
  theater.deleteFailedDraft(draftId);
  failedDraftRawOutput.value = '';
  if (route.value.page === 'failed-draft') {
    phone.replacePage(entries.value.length ? 'history' : 'root', entries.value.length ? '小剧场记录' : '小剧场');
  }
  toastr.success('已删除失败草稿');
}

function reparseFailedDraft() {
  const failedDraft = activeFailedDraft.value;
  if (!failedDraft) return;

  const rawOutput = failedDraftRawOutput.value.trim();
  if (!rawOutput) {
    toastr.warning('先补一点可解析的 XML 内容');
    return;
  }

  const renderMode = failedDraftRenderMode.value;
  const parsed = parseTheaterXmlResult(
    rawOutput,
    renderMode === 'frontend' ? { preserveContentMarkup: true } : undefined,
  );
  if (!parsed.ok) {
    theater.updateFailedDraft(failedDraft.id, {
      rawOutput,
      warnings: parsed.warnings,
    });
    failedDraftRawOutput.value = rawOutput;
    toastr.warning(parsed.warnings.join('；') || '还是没能解析成功');
    return;
  }

  theater.updateFailedDraft(failedDraft.id, {
    rawOutput: parsed.raw,
    warnings: parsed.warnings,
  });
  generationState.preview = {
    content: parsed.data.content,
    draftId: null,
    raw: parsed.raw,
    renderMode,
    mode: failedDraft.context.mode === 'rewrite' ? 'rewrite' : 'create',
    source: {
      label: failedDraft.source.label,
    },
    title: parsed.data.title,
    generationRecord: failedDraft.generationRecord,
    targetEntryId: typeof failedDraft.context.entryId === 'string' ? failedDraft.context.entryId : '',
    targetVersionId: '',
    typeId: typeof failedDraft.context.typeId === 'string' ? failedDraft.context.typeId : undefined,
    typeName:
      typeof failedDraft.context.typeName === 'string' && failedDraft.context.typeName.trim()
        ? failedDraft.context.typeName
        : '未分类小剧场',
    warnings: parsed.warnings,
  };
  persistTheaterPreviewDraft();
  theater.deleteFailedDraft(failedDraft.id);
  failedDraftRawOutput.value = '';
  phone.replacePage('preview', '生成预览');
}

function handleFrameNavigateBlocked() {
  toastr.warning('检测到 Frontend 视图尝试重新加载，已按安全策略卸载 iframe');
}
</script>

<style scoped>
.pc-theater-app,
.pc-theater-page {
  min-height: 100%;
}

.pc-theater-app {
  height: 100%;
  min-height: 0;
}

.pc-theater-page {
  display: grid;
  align-content: start;
  gap: 14px;
}

.pc-mode-selector {
  max-width: 100%;
}

.pc-preview-render-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.pc-detail-content {
  margin: 0;
  overflow: auto;
  color: var(--pc-text);
  font-family: var(--pc-reader-font-family);
  font-size: var(--pc-reader-font-size);
  line-height: var(--pc-reader-line-height);
  white-space: pre-wrap;
}

.pc-detail-content :deep(*) {
  font-family: inherit;
}
</style>
