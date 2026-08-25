<template>
  <section class="pc-storylines-app">
    <section v-if="route.page === 'root'" class="pc-storylines-page">
      <PreviewDraftNotice
        :draft="storylinePreviewDraft"
        @discard="discardStorylinePreviewDraft"
        @open="openStorylinePreviewDraft"
        @open-id="openStorylinePreviewDraft"
      />
      <FailedDraftList
        :drafts="failedDrafts"
        :get-context="draft => draft.source.label"
        :get-title="() => '未解析剧情梳理'"
        @open="openFailedDraft"
        @remove="removeFailedDraft"
      />
      <article class="pc-page-section pc-storylines-source">
        <div class="pc-section-head">
          <strong>
            从总结梳理剧情
            <InfoHint
              label="梳理范围"
              text="选择已有总结集后，AI 会提取主线、支线、人物线、关系线、谜团线，以及已经发生的节点和伏笔状态。同名剧情线会合并更新。"
            />
          </strong>
          <span>{{ selectedSummaryBook?.entries.length || 0 }} 篇</span>
        </div>
        <div class="pc-storylines-generate-row">
          <SearchableCombobox
            v-model="summaryBookId"
            empty-label="没有匹配的总结集"
            input-label="选择总结集"
            :options="summaryBookOptions"
            placeholder="选择总结集"
            toggle-title="展开总结集列表"
          />
          <button
            class="pc-primary-btn"
            type="button"
            :disabled="!selectedSummaryBook?.entries.length"
            @click="openGeneration"
          >
            <i class="fa-solid fa-wand-magic-sparkles"></i>
            <span>开始梳理</span>
          </button>
        </div>
      </article>

      <nav class="pc-segment pc-storylines-tabs" aria-label="剧情梳理视图">
        <button
          :class="['pc-segment-btn', { active: activeTab === 'lines' }]"
          type="button"
          @click="activeTab = 'lines'"
        >
          剧情
        </button>
        <button
          :class="['pc-segment-btn', { active: activeTab === 'beats' }]"
          type="button"
          @click="activeTab = 'beats'"
        >
          节点
        </button>
        <button
          :class="['pc-segment-btn', { active: activeTab === 'hooks' }]"
          type="button"
          @click="activeTab = 'hooks'"
        >
          伏笔
        </button>
      </nav>

      <div class="pc-compact-toolbar pc-directory-toolbar pc-storylines-management-toolbar">
        <span class="pc-directory-count">{{ currentBulkIds.length }} 条记录</span>
        <button
          class="pc-icon-btn"
          type="button"
          :class="{ active: bulkMode }"
          :disabled="!currentBulkIds.length"
          aria-label="批量删除当前列表"
          title="批量删除"
          @click="bulkMode ? cancelBulkSelection() : startBulkSelection()"
        >
          <i class="fa-solid fa-list-check"></i>
        </button>
      </div>
      <BulkSelectionBar
        v-if="bulkMode"
        :all-selected="allBulkSelected"
        :selected-count="bulkSelectedIds.length"
        :total-count="currentBulkIds.length"
        @cancel="cancelBulkSelection"
        @remove="removeSelectedStorylineItems"
        @toggle-all="toggleAllBulkSelection"
      />

      <section v-if="activeTab === 'lines'" class="pc-directory-list pc-storylines-list">
        <EmptyState v-if="!storylines.lines.length" title="还没有梳理结果" />
        <article
          v-for="line in storylines.lines"
          v-else
          :key="line.id"
          class="pc-list-row pc-storyline-item"
          :class="{ bulk: bulkMode }"
        >
          <BulkSelectionCheckbox
            v-if="bulkMode"
            :model-value="bulkSelectedIdSet.has(line.id)"
            :label="`选择 ${line.title}`"
            @update:model-value="setBulkSelected(line.id, $event)"
          />
          <button
            class="pc-storyline-item-main"
            type="button"
            @click="bulkMode ? setBulkSelected(line.id, !bulkSelectedIdSet.has(line.id)) : openItem('line', line.id)"
          >
            <span class="pc-storyline-item-copy">
              <span class="pc-storyline-meta">
                {{ getStorylineKindLabel(line.kind) }} · {{ getStorylineStatusLabel(line.status) }}
              </span>
              <h3>{{ line.title }}</h3>
              <p>{{ line.summary || line.goal || '暂无概述' }}</p>
              <span class="pc-storyline-counts">
                <span>{{ countLineBeats(line.id) }} 个节点</span>
                <span>{{ countLineHooks(line.id) }} 个伏笔</span>
              </span>
            </span>
            <i class="fa-solid fa-chevron-right"></i>
          </button>
          <button v-if="!bulkMode" class="pc-detail-mini-btn" type="button" title="删除" @click="removeLine(line.id)">
            <i class="fa-solid fa-trash"></i>
          </button>
        </article>
      </section>

      <section v-else-if="activeTab === 'beats'" class="pc-directory-list pc-storylines-list">
        <EmptyState v-if="!storylines.beats.length" title="还没有剧情节点" />
        <article
          v-for="beat in storylines.beats"
          v-else
          :key="beat.id"
          class="pc-list-row pc-storyline-item"
          :class="{ bulk: bulkMode }"
        >
          <BulkSelectionCheckbox
            v-if="bulkMode"
            :model-value="bulkSelectedIdSet.has(beat.id)"
            :label="`选择 ${beat.title}`"
            @update:model-value="setBulkSelected(beat.id, $event)"
          />
          <button
            class="pc-storyline-item-main"
            type="button"
            @click="bulkMode ? setBulkSelected(beat.id, !bulkSelectedIdSet.has(beat.id)) : openItem('beat', beat.id)"
          >
            <span class="pc-storyline-item-copy">
              <span class="pc-storyline-meta">
                {{ findLineTitle(beat.lineId) }} · {{ getBeatStatusLabel(beat.status) }}
              </span>
              <h3>{{ beat.title }}</h3>
              <p>{{ beat.summary || '暂无节点说明' }}</p>
            </span>
            <i class="fa-solid fa-chevron-right"></i>
          </button>
          <button v-if="!bulkMode" class="pc-detail-mini-btn" type="button" title="删除" @click="removeBeat(beat.id)">
            <i class="fa-solid fa-trash"></i>
          </button>
        </article>
      </section>

      <section v-else class="pc-directory-list pc-storylines-list">
        <EmptyState v-if="!storylines.hooks.length" title="还没有识别到伏笔" />
        <article
          v-for="hook in storylines.hooks"
          v-else
          :key="hook.id"
          class="pc-list-row pc-storyline-item"
          :class="{ bulk: bulkMode }"
        >
          <BulkSelectionCheckbox
            v-if="bulkMode"
            :model-value="bulkSelectedIdSet.has(hook.id)"
            :label="`选择 ${hook.title}`"
            @update:model-value="setBulkSelected(hook.id, $event)"
          />
          <button
            class="pc-storyline-item-main"
            type="button"
            @click="bulkMode ? setBulkSelected(hook.id, !bulkSelectedIdSet.has(hook.id)) : openItem('hook', hook.id)"
          >
            <span class="pc-storyline-item-copy">
              <span class="pc-storyline-meta">
                {{ getForeshadowStatusLabel(hook.status) }} · {{ findLineTitle(hook.lineId) || '未绑定剧情线' }}
              </span>
              <h3>{{ hook.title }}</h3>
              <p>{{ hook.seed || hook.payoff || '暂无伏笔说明' }}</p>
            </span>
            <i class="fa-solid fa-chevron-right"></i>
          </button>
          <button v-if="!bulkMode" class="pc-detail-mini-btn" type="button" title="删除" @click="removeHook(hook.id)">
            <i class="fa-solid fa-trash"></i>
          </button>
        </article>
      </section>
    </section>

    <StorylineDetailPage
      v-else-if="route.page === 'detail' && activeItemKind && activeItemExists"
      :beat="activeBeat"
      :hook="activeHook"
      :item-kind="activeItemKind"
      :line="activeLine"
      :line-beats="activeLineBeats"
      :line-hooks="activeLineHooks"
      :next-disabled="!nextItemId"
      :parent-line="activeParentLine"
      :previous-disabled="!previousItemId"
      :profile-error="profileReadError"
      :profile-names="profileNames"
      @catalog="returnToRoot"
      @delete="removeActiveItem"
      @edit="openActiveEditor"
      @next="openAdjacentItem(nextItemId)"
      @open-item="openItem"
      @open-profile="openProfile"
      @previous="openAdjacentItem(previousItemId)"
    />

    <StorylineEditorPage
      v-else-if="route.page === 'editor' && activeItemKind && activeItemExists"
      v-model="editorDraft"
      :item-meta="activeItemMeta"
      :line-options="lineOptions"
      @cancel="phone.goBack()"
      @save="saveEditor"
    />

    <section v-else-if="route.page === 'generate'" class="pc-storylines-page">
      <article class="pc-storylines-generate-form">
        <div class="pc-section-head">
          <strong>梳理已有剧情</strong>
          <span>{{ selectedReferences.length }} 条引用</span>
        </div>
        <SearchableCombobox
          :model-value="summaryBookId"
          empty-label="没有匹配的总结集"
          input-label="选择总结集"
          :options="summaryBookOptions"
          placeholder="选择总结集"
          toggle-title="展开总结集列表"
          @update:model-value="selectSummaryBookById"
        />
        <GenerationPanel
          :capture="capturePrompt"
          :error="generationError"
          :from-start-end="generationDraft.fromStartEnd"
          generate-label="梳理剧情"
          :range-text="generationDraft.rangeText"
          :raw-output="generationRawOutput"
          :recent-count="generationDraft.recentCount"
          :references="selectedReferences"
          requirement-label="梳理要求"
          requirement-placeholder="例如：重点梳理关系变化；不要把尚未确认的猜测当成事实。"
          :running="generationRunning"
          :single-message-id="generationDraft.singleMessageId"
          :source-mode="settings.generation.sourceMode"
          :user-requirement="generationDraft.userRequirement"
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

    <section
      v-else-if="route.page === 'preview' && generationState.preview"
      class="pc-storylines-page pc-generation-preview-page"
    >
      <article class="pc-detail-card pc-generation-preview-card">
        <GenerationPreviewPanel
          :content="generationState.preview.content"
          :editable="false"
          :raw="generationState.preview.raw"
          raw-editable
          :reparse-handler="reparsePreviewRaw"
          :reasoning="generationState.preview.generationRecord?.reasoning || ''"
          reasoning-editable
          :scan-enabled="false"
          save-label="合并保存"
          :source-label="generationState.preview.source.label"
          :text-provider-summary="textProviderSummary"
          :title="`梳理出 ${generationState.preview.data.lines.length} 条剧情线`"
          :warnings="generationState.preview.warnings"
          @reparse="reparsePreviewRaw"
          @save="savePreview"
          @update:raw="generationState.preview.raw = $event"
          @update:reasoning="updateGenerationRecordReasoning(generationState.preview, $event)"
        />
      </article>
    </section>

    <FailedDraftRepairPage
      v-else-if="route.page === 'failed-draft' && activeFailedDraft"
      v-model:raw-output="failedDraftRawOutput"
      :regenerate-handler="regenerateFailedDraft"
      :raw-output-semantics="activeFailedDraft.rawOutputSemantics"
      :reasoning="activeFailedDraft.generationRecord?.reasoning || ''"
      :source-label="activeFailedDraft.source.label"
      title="修复剧情梳理草稿"
      :warnings="activeFailedDraft.warnings"
      @delete="removeFailedDraft(activeFailedDraft.id)"
      @reparse="reparseFailedDraft"
      @update:reasoning="updateGenerationRecordReasoning(activeFailedDraft, $event)"
    />

    <EmptyState v-else title="这条剧情记录无法打开">
      <p>记录可能已经被删除，或者页面地址已经失效。</p>
      <button class="pc-soft-btn" type="button" @click="returnToRoot">返回剧情列表</button>
    </EmptyState>
  </section>
</template>

<script setup lang="ts">
import BulkSelectionBar from '@/components/BulkSelectionBar.vue';
import BulkSelectionCheckbox from '@/components/BulkSelectionCheckbox.vue';
import EmptyState from '@/components/EmptyState.vue';
import FailedDraftList from '@/components/FailedDraftList.vue';
import FailedDraftRepairPage from '@/components/FailedDraftRepairPage.vue';
import GenerationPanel from '@/components/GenerationPanel.vue';
import GenerationPreviewPanel from '@/components/GenerationPreviewPanel.vue';
import InfoHint from '@/components/InfoHint.vue';
import PreviewDraftNotice from '@/components/PreviewDraftNotice.vue';
import { useBulkSelection } from '@/composables/useBulkSelection';
import { getExternalProfileRowLabel, readExternalProfileTables } from '@/apps/profiles/externalBridge';
import {
  cleanExternalProfileReferences,
  externalProfileReferenceKey,
  type ExternalProfileReference,
} from '@/apps/profiles/profileReferences';
import { useSingleGenerationTaskSession } from '@/composables/useSingleGenerationTaskSession';
import { useFailedDraftRegeneration } from '@/composables/useFailedDraftRegeneration';
import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import { captureGenerationPrompt, generateContent } from '@/core/generationService';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import { useSummaryStore } from '@/store/summary';
import type { GenerationExecutionPreview, SourceSelection } from '@/type/generation';
import type { GenerationTask } from '@/type/generationTask';
import { formatGenerationReferences, type GenerationReferenceItem } from '@/util/references';
import { formatTextProviderSummary } from '@/util/textProvider';
import { usePreviewDraftPersistence } from '@/util/previewDrafts';
import { updateGenerationRecordReasoning } from '@/util/generationReasoning';
import { createStorylineGenerationAdapter, formatStorylineResult, type StorylineGeneratedResult } from './generation';
import StorylineDetailPage from './StorylineDetailPage.vue';
import StorylineEditorPage from './StorylineEditorPage.vue';
import {
  beatStatusOptions,
  foreshadowStatusOptions,
  getBeatStatusLabel,
  getForeshadowStatusLabel,
  getStorylineKindLabel,
  getStorylineStatusLabel,
  storylineKindOptions,
  storylineStatusOptions,
  useStorylinesStore,
} from './store';
import type { Foreshadow, Storyline, StorylineBeat } from './store';
import type { StorylineEditorDraft, StorylineItemKind } from './viewTypes';
import { storeToRefs } from 'pinia';

type StorylinePreview = {
  content: string;
  data: StorylineGeneratedResult;
  raw: string;
  source: SourceSelection;
  warnings: string[];
};

const phone = usePhoneStore();
const prompts = usePromptStore();
const settingsStore = useSettingsStore();
const summary = useSummaryStore();
const storylines = useStorylinesStore();
const adapter = getRegisteredPhoneGenerationAdapter<ReturnType<typeof createStorylineGenerationAdapter>>(
  'storylines',
  'extract',
);
const { settings } = storeToRefs(settingsStore);
const { books: summaryBooks } = storeToRefs(summary);
const { failedDrafts } = storeToRefs(storylines);
const route = computed(() => phone.currentRoute);
const activeTab = ref<'beats' | 'hooks' | 'lines'>('lines');
const currentBulkIds = computed(() => {
  if (activeTab.value === 'lines') return storylines.lines.map(item => item.id);
  if (activeTab.value === 'beats') return storylines.beats.map(item => item.id);
  return storylines.hooks.map(item => item.id);
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
} = useBulkSelection(currentBulkIds);
watch(activeTab, cancelBulkSelection);
const summaryBookId = ref('');
const selectedReferences = ref<GenerationReferenceItem[]>([]);
const profileNames = ref<Record<string, string>>({});
const profileReadError = ref('');
const generationDraft = reactive({
  fromStartEnd: 20,
  rangeText: '',
  recentCount: 20,
  singleMessageId: 0,
  userRequirement: '',
});
const generationState = reactive({
  preview: null as StorylinePreview | null,
});
const generationSession = useSingleGenerationTaskSession({
  actionId: 'extract',
  appId: 'storylines',
  sourcePage: 'generate',
  title: '剧情梳理 · 单次生成',
});
const { error: generationError, rawOutput: generationRawOutput, running: generationRunning } = generationSession;
const failedDraftRawOutput = ref('');
const editorDraft = reactive<StorylineEditorDraft>(createEmptyEditorDraft('line'));
const activeFailedDraft = computed(() => {
  const draftId = route.value.params?.draftId;
  return draftId ? storylines.getFailedDraft(draftId) : null;
});
const activeItemKind = computed(() => parseItemKind(route.value.params?.kind));
const activeItemId = computed(() => route.value.params?.id || '');
const activeLine = computed(() => (activeItemKind.value === 'line' ? storylines.getLine(activeItemId.value) : null));
const activeBeat = computed(() => (activeItemKind.value === 'beat' ? storylines.getBeat(activeItemId.value) : null));
const activeHook = computed(() => (activeItemKind.value === 'hook' ? storylines.getHook(activeItemId.value) : null));
const activeItemExists = computed(() => Boolean(activeLine.value || activeBeat.value || activeHook.value));
const activeParentLine = computed(() => {
  if (activeLine.value) return activeLine.value;
  const lineId = activeBeat.value?.lineId || activeHook.value?.lineId || '';
  return lineId ? storylines.getLine(lineId) : null;
});
const activeLineBeats = computed(() => {
  if (!activeLine.value) return [];
  return storylines.beats.filter(beat => beat.lineId === activeLine.value?.id);
});
const activeLineHooks = computed(() => {
  if (!activeLine.value) return [];
  return storylines.hooks.filter(hook => hook.lineId === activeLine.value?.id);
});
const activeItemMeta = computed(() => {
  if (activeLine.value) {
    return `${getStorylineKindLabel(activeLine.value.kind)} · ${getStorylineStatusLabel(activeLine.value.status)}`;
  }
  if (activeBeat.value) return `剧情节点 · ${getBeatStatusLabel(activeBeat.value.status)}`;
  if (activeHook.value) return `伏笔 · ${getForeshadowStatusLabel(activeHook.value.status)}`;
  return '剧情记录';
});
const activeItemList = computed<Array<Foreshadow | Storyline | StorylineBeat>>(() => {
  if (activeItemKind.value === 'line') return storylines.lines;
  if (activeItemKind.value === 'beat') return storylines.beats;
  if (activeItemKind.value === 'hook') return storylines.hooks;
  return [];
});
const activeItemIndex = computed(() => activeItemList.value.findIndex(item => item.id === activeItemId.value));
const previousItemId = computed(() => activeItemList.value[activeItemIndex.value - 1]?.id || '');
const nextItemId = computed(() => activeItemList.value[activeItemIndex.value + 1]?.id || '');
const lineOptions = computed(() => storylines.lines.map(line => ({ label: line.title, value: line.id })));
const {
  beginPreviewDraft: beginStorylinePreviewDraft,
  clearPreviewDraft: clearStorylinePreviewDraft,
  discardPreviewDraft: discardStorylinePreviewDraft,
  draft: storylinePreviewDraft,
  openPreviewDraft: openStorylinePreviewDraft,
  persistPreviewDraft: persistStorylinePreviewDraft,
} = usePreviewDraftPersistence<StorylinePreview>({
  appId: 'storylines',
  getPreview: () => generationState.preview,
  page: 'preview',
  route,
  setPreview: preview => {
    generationState.preview = preview;
  },
  title: '剧情梳理预览',
});

const selectedSummaryBook = computed(() => summary.getBook(summaryBookId.value));
const summaryBookOptions = computed(() =>
  summaryBooks.value.map(book => ({
    label: `${book.title} · ${book.entries.length} 篇`,
    value: book.id,
  })),
);
const formattedReferences = computed(() => formatGenerationReferences(selectedReferences.value));
const textProviderSummary = computed(() => formatTextProviderSummary(settings.value.textProvider));

watch(
  () => {
    const references = [...storylines.lines, ...storylines.hooks]
      .flatMap(item => item.relatedProfiles)
      .map(externalProfileReferenceKey)
      .join('|');
    return references;
  },
  () => refreshProfileNames(),
  { immediate: true },
);

watch(
  summaryBooks,
  books => {
    if (!books.some(book => book.id === summaryBookId.value)) {
      summaryBookId.value = books.find(book => book.entries.length)?.id || books[0]?.id || '';
    }
  },
  { immediate: true },
);

watch(
  () => [route.value.page, route.value.params?.draftId] as const,
  ([page]) => {
    if (page === 'failed-draft') failedDraftRawOutput.value = activeFailedDraft.value?.rawOutput || '';
  },
  { immediate: true },
);

watch(
  () => [route.value.page, route.value.params?.kind, route.value.params?.id] as const,
  ([page, kindValue, id]) => {
    if (page !== 'detail' && page !== 'editor') return;
    const kind = parseItemKind(kindValue);
    if (!kind || !id) return;
    activeTab.value = itemKindToTab(kind);
    if (page === 'editor') loadEditorDraft(kind, id);
  },
  { immediate: true },
);

function createEmptyEditorDraft(itemKind: StorylineItemKind): StorylineEditorDraft {
  return {
    beatStatus: beatStatusOptions[0]?.id || 'planned',
    goal: '',
    hookStatus: foreshadowStatusOptions[0]?.id || 'seeded',
    itemKind,
    lineId: '',
    lineKind: storylineKindOptions[0]?.id || 'main',
    lineStatus: storylineStatusOptions[0]?.id || 'planned',
    order: 0,
    payoff: '',
    relatedProfileIds: [],
    relatedProfiles: [],
    seed: '',
    stakes: '',
    summary: '',
    tagsText: '',
    title: '',
  };
}

function parseItemKind(value: unknown): StorylineItemKind | null {
  return value === 'line' || value === 'beat' || value === 'hook' ? value : null;
}

function itemKindToTab(kind: StorylineItemKind): 'beats' | 'hooks' | 'lines' {
  return kind === 'line' ? 'lines' : kind === 'beat' ? 'beats' : 'hooks';
}

function itemTitle(kind: StorylineItemKind, id: string) {
  if (kind === 'line') return storylines.getLine(id)?.title || '';
  if (kind === 'beat') return storylines.getBeat(id)?.title || '';
  return storylines.getHook(id)?.title || '';
}

function loadEditorDraft(kind: StorylineItemKind, id: string) {
  const next = createEmptyEditorDraft(kind);
  if (kind === 'line') {
    const line = storylines.getLine(id);
    if (!line) return;
    Object.assign(next, {
      goal: line.goal,
      lineKind: line.kind,
      lineStatus: line.status,
      relatedProfileIds: [...line.relatedProfileIds],
      relatedProfiles: klona(line.relatedProfiles),
      stakes: line.stakes,
      summary: line.summary,
      tagsText: line.tags.join('、'),
      title: line.title,
    });
  } else if (kind === 'beat') {
    const beat = storylines.getBeat(id);
    if (!beat) return;
    Object.assign(next, {
      beatStatus: beat.status,
      lineId: beat.lineId,
      order: beat.order,
      summary: beat.summary,
      title: beat.title,
    });
  } else {
    const hook = storylines.getHook(id);
    if (!hook) return;
    Object.assign(next, {
      hookStatus: hook.status,
      lineId: hook.lineId,
      payoff: hook.payoff,
      relatedProfileIds: [...hook.relatedProfileIds],
      relatedProfiles: klona(hook.relatedProfiles),
      seed: hook.seed,
      tagsText: hook.tags.join('、'),
      title: hook.title,
    });
  }
  Object.assign(editorDraft, next);
}

function cleanEditorTags(value: string) {
  return [
    ...new Set(
      value
        .split(/[,，、\n]/)
        .map(item => item.trim())
        .filter(Boolean),
    ),
  ];
}

function refreshProfileNames() {
  profileNames.value = {};
  profileReadError.value = '';
  const references = [...storylines.lines, ...storylines.hooks].flatMap(item => item.relatedProfiles);
  if (!references.length) return;
  try {
    const tables = readExternalProfileTables();
    references.forEach(reference => {
      const table = tables.find(candidate => candidate.key === reference.profileSheetKey);
      const row = table?.rows.find(candidate => candidate.index === reference.profileRowIndex);
      if (!table || !row) return;
      profileNames.value[externalProfileReferenceKey(reference)] = getExternalProfileRowLabel(table, row);
    });
  } catch (error) {
    profileReadError.value = error instanceof Error ? error.message : '读取关联资料失败';
  }
}

function openItem(kind: StorylineItemKind, id: string) {
  const title = itemTitle(kind, id);
  if (!title) return;
  activeTab.value = itemKindToTab(kind);
  phone.pushPage('detail', title, { id, kind });
}

function openAdjacentItem(id: string) {
  const kind = activeItemKind.value;
  if (!kind || !id) return;
  const title = itemTitle(kind, id);
  if (!title) return;
  phone.replacePage('detail', title, { id, kind });
}

function openActiveEditor() {
  const kind = activeItemKind.value;
  const id = activeItemId.value;
  if (!kind || !id || !activeItemExists.value) return;
  loadEditorDraft(kind, id);
  phone.pushPage('editor', `编辑${kind === 'line' ? '剧情线' : kind === 'beat' ? '节点' : '伏笔'}`, { id, kind });
}

function openProfile(profile: ExternalProfileReference) {
  const table = readExternalProfileTables().find(candidate => candidate.key === profile.profileSheetKey);
  const row = table?.rows.find(candidate => candidate.index === profile.profileRowIndex);
  if (!table || !row) return void toastr.warning('关联的资料已经不存在');
  phone.pushRoute('profiles', 'row', getExternalProfileRowLabel(table, row), {
    rowIndex: String(row.index),
    sheetKey: table.key,
  });
}

function returnToRoot() {
  const targetIndex = phone.stack.findLastIndex(item => item.appId === 'storylines' && item.page === 'root');
  if (targetIndex >= 0) {
    phone.stack = phone.stack.slice(0, targetIndex + 1);
    return;
  }
  phone.replacePage('root', '剧情梳理');
}

function saveEditor() {
  const kind = activeItemKind.value;
  const id = activeItemId.value;
  const title = editorDraft.title.trim();
  if (!kind || !id || !activeItemExists.value) return;
  if (!title) return void toastr.warning('请先填写标题');
  if (kind === 'beat' && !storylines.getLine(editorDraft.lineId)) {
    return void toastr.warning('请选择有效的所属剧情线');
  }

  if (kind === 'line') {
    storylines.updateLine(id, {
      goal: editorDraft.goal,
      kind: editorDraft.lineKind,
      relatedProfileIds: [...editorDraft.relatedProfileIds],
      relatedProfiles: cleanExternalProfileReferences(editorDraft.relatedProfiles),
      stakes: editorDraft.stakes,
      status: editorDraft.lineStatus,
      summary: editorDraft.summary,
      tags: cleanEditorTags(editorDraft.tagsText),
      title,
    });
  } else if (kind === 'beat') {
    storylines.updateBeat(id, {
      lineId: editorDraft.lineId,
      order: editorDraft.order,
      status: editorDraft.beatStatus,
      summary: editorDraft.summary,
      title,
    });
  } else {
    storylines.updateHook(id, {
      lineId: storylines.getLine(editorDraft.lineId) ? editorDraft.lineId : '',
      payoff: editorDraft.payoff,
      relatedProfileIds: [...editorDraft.relatedProfileIds],
      relatedProfiles: cleanExternalProfileReferences(editorDraft.relatedProfiles),
      seed: editorDraft.seed,
      status: editorDraft.hookStatus,
      tags: cleanEditorTags(editorDraft.tagsText),
      title,
    });
  }

  toastr.success('剧情记录已保存');
  phone.replacePage('detail', title, { id, kind });
}

function removeActiveItem() {
  if (activeLine.value) return removeLine(activeLine.value.id);
  if (activeBeat.value) return removeBeat(activeBeat.value.id);
  if (activeHook.value) return removeHook(activeHook.value.id);
}

function referencesForBook(bookId: string) {
  const book = summary.getBook(bookId);
  if (!book) return [];
  return [...book.entries]
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map(entry => ({
      content: entry.content,
      id: `summary:${book.id}:entry:${entry.id}`,
      sourcePath: ['总结', book.title],
      timeLabel: entry.rangeLabel,
      title: entry.title,
      updatedAt: entry.updatedAt,
    }));
}

function selectSummaryBook() {
  selectedReferences.value = referencesForBook(summaryBookId.value);
}

function selectSummaryBookById(bookId: string) {
  summaryBookId.value = bookId;
  selectSummaryBook();
}

function openGeneration() {
  if (!selectedSummaryBook.value?.entries.length) {
    toastr.warning('请先选择有内容的总结集');
    return;
  }
  selectSummaryBook();
  phone.pushPage('generate', '梳理剧情');
}

function buildGenerationConfig() {
  return {
    appPrompt: prompts.appPrompts.storylines || '',
    outputFormat: prompts.resolveOutputFormat('storylines.extract'),
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

function capturePrompt() {
  return captureGenerationPrompt(adapter, buildGenerationConfig(), getGenerationOptions());
}

async function runGeneration() {
  beginStorylinePreviewDraft();
  generationState.preview = null;
  let task: GenerationTask | null = null;
  try {
    task = generationSession.create({
      sourceParams: summaryBookId.value ? { bookId: summaryBookId.value } : {},
      title: selectedSummaryBook.value ? `剧情梳理 · ${selectedSummaryBook.value.title}` : '剧情梳理 · 单次生成',
    });
    const result = await generateContent(adapter, buildGenerationConfig(), {
      ...getGenerationOptions(),
      createFailedDraft: input => storylines.createFailedDraft(input),
      lifecycle: generationSession.lifecycle(task.id),
    });
    if (result.status === 'failed') {
      failedDraftRawOutput.value = result.rawOutput;
      generationSession.complete(task.id, {
        currentLabel: '解析失败草稿已保留',
        resultPage: 'failed-draft',
        resultParams: { draftId: result.draft.id },
        resultState: 'failed-draft',
        resultTitle: '解析失败草稿',
      });
      toastr.warning('解析失败，已保存到失败草稿');
      void phone.presentGeneratedPage('storylines', 'failed-draft', '解析失败草稿', { draftId: result.draft.id });
      return;
    }
    if (result.status === 'saved') {
      generationSession.complete(task.id, {
        currentLabel: `已保存 ${result.saved.lineCount} 条剧情线`,
        resultPage: 'root',
        resultState: 'saved',
        resultTitle: '剧情梳理',
      });
      toastr.success(`已梳理 ${result.saved.lineCount} 条剧情线`);
      void phone.presentGeneratedPage('storylines', 'root', '剧情梳理');
      return;
    }
    openPreview(result);
    generationSession.complete(task.id, {
      currentLabel: `已梳理 ${result.data.lines.length} 条剧情线，等待确认`,
      resultPage: 'preview',
      resultState: 'preview',
      resultTitle: '剧情梳理预览',
    });
  } catch (error) {
    if (task) generationSession.fail(task.id, error);
    else toastr.error(error instanceof Error ? error.message : '剧情梳理失败');
  }
}

function openFailedDraft(draftId: string) {
  if (!storylines.getFailedDraft(draftId)) return;
  phone.pushPage('failed-draft', '解析失败草稿', { draftId });
}

async function removeFailedDraft(draftId: string) {
  const confirmed = await phone.confirmNotice('要删除这条剧情梳理失败草稿吗？', {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!confirmed) return;
  storylines.deleteFailedDraft(draftId);
  failedDraftRawOutput.value = '';
  if (route.value.page === 'failed-draft') phone.replacePage('root', '剧情梳理');
  toastr.success('已删除失败草稿');
}

function reparseFailedDraft() {
  const failedDraft = activeFailedDraft.value;
  if (!failedDraft) return;
  const rawOutput = failedDraftRawOutput.value;
  if (!rawOutput.trim()) return void toastr.warning('先补一点可解析的输出');
  const parsed = adapter.parse(rawOutput, buildGenerationConfig());
  if (!parsed.ok) {
    storylines.updateFailedDraft(failedDraft.id, { rawOutput, warnings: parsed.warnings });
    toastr.warning(parsed.warnings.join('；') || '仍然无法解析');
    return;
  }
  generationState.preview = {
    content: formatStorylineResult(parsed.data),
    data: parsed.data,
    raw: rawOutput,
    source: failedDraft.source,
    warnings: parsed.warnings,
  };
  persistStorylinePreviewDraft();
  storylines.deleteFailedDraft(failedDraft.id);
  failedDraftRawOutput.value = '';
  phone.replacePage('preview', '剧情梳理预览');
  toastr.success('已重新解析');
}

function openPreview(result: GenerationExecutionPreview<StorylineGeneratedResult>) {
  generationState.preview = {
    content: formatStorylineResult(result.data),
    data: result.data,
    raw: result.rawOutput,
    source: result.source,
    warnings: result.warnings,
  };
  persistStorylinePreviewDraft();
  void phone.presentGeneratedPage('storylines', 'preview', '剧情梳理预览');
}

function reparsePreviewRaw() {
  const preview = generationState.preview;
  if (!preview) return false;
  const parsed = adapter.parse(preview.raw, buildGenerationConfig());
  if (!parsed.ok) {
    preview.warnings = parsed.warnings;
    toastr.warning(parsed.warnings.join('；') || '仍然无法解析');
    return false;
  }
  preview.data = parsed.data;
  preview.content = formatStorylineResult(parsed.data);
  preview.warnings = parsed.warnings;
  toastr.success('已重新解析');
  return true;
}

async function savePreview() {
  const preview = generationState.preview;
  if (!preview) return;
  const saved = await adapter.save(preview.data, {
    config: buildGenerationConfig(),
    rawOutput: preview.raw,
    scopeId: preview.source.scopeId,
    source: preview.source,
    warnings: preview.warnings,
  });
  generationState.preview = null;
  clearStorylinePreviewDraft();
  toastr.success(`已合并 ${saved.lineCount} 条剧情线`);
  phone.replacePage('root', '剧情梳理');
}

function stopGeneration() {
  generationSession.stop();
}

function findLineTitle(lineId: string) {
  return storylines.getLine(lineId)?.title || '';
}

function countLineBeats(lineId: string) {
  return storylines.data.beats.filter(beat => beat.lineId === lineId).length;
}

function countLineHooks(lineId: string) {
  return storylines.data.hooks.filter(hook => hook.lineId === lineId).length;
}

async function removeLine(lineId: string) {
  const line = storylines.getLine(lineId);
  if (!line) return;
  const beatCount = countLineBeats(lineId);
  const hookCount = countLineHooks(lineId);
  const impact = [
    beatCount ? `同时删除 ${beatCount} 个所属节点` : '',
    hookCount ? `${hookCount} 个伏笔会保留，但解除剧情线绑定` : '',
  ]
    .filter(Boolean)
    .join('；');
  const confirmed = await phone.confirmNotice(`要删除剧情线“${line.title}”吗？${impact ? `\n${impact}。` : ''}`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!confirmed) return;
  const deletingActiveItem = activeItemKind.value === 'line' && activeItemId.value === lineId;
  storylines.deleteLine(lineId);
  if (deletingActiveItem) returnToRoot();
  toastr.success('已删除剧情线');
}

async function removeBeat(beatId: string) {
  const beat = storylines.getBeat(beatId);
  if (!beat) return;
  const confirmed = await phone.confirmNotice(`要删除节点“${beat.title}”吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!confirmed) return;
  const deletingActiveItem = activeItemKind.value === 'beat' && activeItemId.value === beatId;
  storylines.deleteBeat(beatId);
  if (deletingActiveItem) returnToRoot();
  toastr.success('已删除节点');
}

async function removeHook(hookId: string) {
  const hook = storylines.getHook(hookId);
  if (!hook) return;
  const confirmed = await phone.confirmNotice(`要删除伏笔“${hook.title}”吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!confirmed) return;
  const deletingActiveItem = activeItemKind.value === 'hook' && activeItemId.value === hookId;
  storylines.deleteHook(hookId);
  if (deletingActiveItem) returnToRoot();
  toastr.success('已删除伏笔');
}

async function removeSelectedStorylineItems() {
  const selectedIds = [...bulkSelectedIds.value];
  if (!selectedIds.length) return;
  const label = activeTab.value === 'lines' ? '剧情线' : activeTab.value === 'beats' ? '节点' : '伏笔';
  const confirmed = await phone.confirmNotice(`要删除所选 ${selectedIds.length} 个${label}吗？`, {
    confirmLabel: '删除所选',
    kind: 'warning',
  });
  if (!confirmed) return;
  if (activeTab.value === 'lines') selectedIds.forEach(storylines.deleteLine);
  else if (activeTab.value === 'beats') selectedIds.forEach(storylines.deleteBeat);
  else selectedIds.forEach(storylines.deleteHook);
  cancelBulkSelection();
  toastr.success(`已删除 ${selectedIds.length} 个${label}`);
}
const regenerateFailedDraft = useFailedDraftRegeneration({
  draft: () => activeFailedDraft.value,
  rawOutput: failedDraftRawOutput,
  reparse: reparseFailedDraft,
});
</script>

<style scoped>
.pc-storylines-app,
.pc-storylines-page {
  min-height: 100%;
}

.pc-storylines-page,
.pc-storylines-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pc-storylines-list {
  gap: 0;
}

.pc-storyline-item {
  grid-template-columns: minmax(0, 1fr) 32px;
}

.pc-storyline-item.bulk {
  grid-template-columns: auto minmax(0, 1fr);
}

.pc-storylines-management-toolbar {
  justify-content: space-between;
}

.pc-storyline-item-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-width: 0;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
  text-align: left;
}

.pc-storyline-item-main > i {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-storyline-item-copy {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.pc-storylines-generate-form {
  display: grid;
  gap: 12px;
}

.pc-storylines-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  width: 100%;
}

.pc-storylines-generate-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}

.pc-storylines-generate-row .pc-primary-btn {
  min-inline-size: 112px;
  white-space: nowrap;
}

.pc-storyline-item h3,
.pc-storyline-item p {
  margin: 0;
}

.pc-storyline-item h3 {
  margin-top: 4px;
  font-size: 15px;
}

.pc-storyline-item p {
  color: var(--pc-muted);
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-wrap;
}

.pc-storyline-meta,
.pc-storyline-counts {
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 800;
}

.pc-storyline-counts {
  display: flex;
  gap: 12px;
}
</style>
