<template>
  <section class="pc-storylines-app">
    <section v-if="route.page === 'root'" class="pc-storylines-page">
      <PreviewDraftNotice
        :draft="storylinePreviewDraft"
        @discard="discardStorylinePreviewDraft"
        @open="openStorylinePreviewDraft"
      />
      <article class="pc-editor-card">
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
          <select v-model="summaryBookId" class="pc-field pc-select">
            <option value="">选择总结集</option>
            <option v-for="book in summaryBooks" :key="book.id" :value="book.id">
              {{ book.title }} · {{ book.entries.length }} 篇
            </option>
          </select>
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

      <section v-if="activeTab === 'lines'" class="pc-storylines-list">
        <EmptyState v-if="!storylines.lines.length" title="还没有梳理结果" />
        <article v-for="line in storylines.lines" v-else :key="line.id" class="pc-section-card pc-storyline-item">
          <div class="pc-detail-title-row">
            <div>
              <span class="pc-storyline-meta">
                {{ getStorylineKindLabel(line.kind) }} · {{ getStorylineStatusLabel(line.status) }}
              </span>
              <h3>{{ line.title }}</h3>
            </div>
            <button class="pc-detail-mini-btn" type="button" title="删除" @click="removeLine(line.id)">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
          <p>{{ line.summary || line.goal || '暂无概述' }}</p>
          <div class="pc-storyline-counts">
            <span>{{ countLineBeats(line.id) }} 个节点</span>
            <span>{{ countLineHooks(line.id) }} 个伏笔</span>
          </div>
        </article>
      </section>

      <section v-else-if="activeTab === 'beats'" class="pc-storylines-list">
        <EmptyState v-if="!storylines.beats.length" title="还没有剧情节点" />
        <article v-for="beat in storylines.beats" v-else :key="beat.id" class="pc-section-card pc-storyline-item">
          <div class="pc-detail-title-row">
            <div>
              <span class="pc-storyline-meta">
                {{ findLineTitle(beat.lineId) }} · {{ getBeatStatusLabel(beat.status) }}
              </span>
              <h3>{{ beat.title }}</h3>
            </div>
            <button class="pc-detail-mini-btn" type="button" title="删除" @click="removeBeat(beat.id)">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
          <p>{{ beat.summary || '暂无节点说明' }}</p>
        </article>
      </section>

      <section v-else class="pc-storylines-list">
        <EmptyState v-if="!storylines.hooks.length" title="还没有识别到伏笔" />
        <article v-for="hook in storylines.hooks" v-else :key="hook.id" class="pc-section-card pc-storyline-item">
          <div class="pc-detail-title-row">
            <div>
              <span class="pc-storyline-meta">
                {{ getForeshadowStatusLabel(hook.status) }} · {{ findLineTitle(hook.lineId) || '未绑定剧情线' }}
              </span>
              <h3>{{ hook.title }}</h3>
            </div>
            <button class="pc-detail-mini-btn" type="button" title="删除" @click="removeHook(hook.id)">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
          <p>{{ hook.seed || hook.payoff || '暂无伏笔说明' }}</p>
        </article>
      </section>
    </section>

    <section v-else-if="route.page === 'generate'" class="pc-storylines-page">
      <article class="pc-editor-card">
        <div class="pc-section-head">
          <strong>梳理已有剧情</strong>
          <span>{{ selectedReferences.length }} 条引用</span>
        </div>
        <select v-model="summaryBookId" class="pc-field pc-select" @change="selectSummaryBook">
          <option v-for="book in summaryBooks" :key="book.id" :value="book.id">
            {{ book.title }} · {{ book.entries.length }} 篇
          </option>
        </select>
        <GenerationPanel
          :capture="capturePrompt"
          :error="generationState.error"
          :from-start-end="generationDraft.fromStartEnd"
          generate-label="梳理剧情"
          :range-text="generationDraft.rangeText"
          :raw-output="generationState.rawOutput"
          :recent-count="generationDraft.recentCount"
          :references="selectedReferences"
          requirement-label="梳理要求"
          requirement-placeholder="例如：重点梳理关系变化；不要把尚未确认的猜测当成事实。"
          :running="generationState.running"
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
          :scan-enabled="false"
          save-label="合并保存"
          :source-label="generationState.preview.source.label"
          :text-provider-summary="textProviderSummary"
          :title="`梳理出 ${generationState.preview.data.lines.length} 条剧情线`"
          :warnings="generationState.preview.warnings"
          @reparse="reparsePreviewRaw"
          @save="savePreview"
          @update:raw="generationState.preview.raw = $event"
        />
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import GenerationPanel from '@/components/GenerationPanel.vue';
import GenerationPreviewPanel from '@/components/GenerationPreviewPanel.vue';
import InfoHint from '@/components/InfoHint.vue';
import PreviewDraftNotice from '@/components/PreviewDraftNotice.vue';
import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import { captureGenerationPrompt, generateContent } from '@/core/generationService';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import { useSummaryStore } from '@/store/summary';
import type { GenerationExecutionPreview, SourceSelection } from '@/type/generation';
import { formatGenerationReferences, type GenerationReferenceItem } from '@/util/references';
import { stopGenerationByIdSafe } from '@/util/runtime';
import { formatTextProviderSummary } from '@/util/textProvider';
import { usePreviewDraftPersistence } from '@/util/previewDrafts';
import { createStorylineGenerationAdapter, formatStorylineResult, type StorylineGeneratedResult } from './generation';
import {
  getBeatStatusLabel,
  getForeshadowStatusLabel,
  getStorylineKindLabel,
  getStorylineStatusLabel,
  useStorylinesStore,
} from './store';
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
const route = computed(() => phone.currentRoute);
const activeTab = ref<'beats' | 'hooks' | 'lines'>('lines');
const summaryBookId = ref('');
const selectedReferences = ref<GenerationReferenceItem[]>([]);
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
  preview: null as StorylinePreview | null,
  rawOutput: '',
  running: false,
});
const {
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

onScopeDispose(() => {
  if (generationState.running && generationState.generationId) {
    stopGenerationByIdSafe(generationState.generationId);
  }
});

const selectedSummaryBook = computed(() => summary.getBook(summaryBookId.value));
const formattedReferences = computed(() => formatGenerationReferences(selectedReferences.value));
const textProviderSummary = computed(() => formatTextProviderSummary(settings.value.textProvider));

watch(
  summaryBooks,
  books => {
    if (!books.some(book => book.id === summaryBookId.value)) {
      summaryBookId.value = books.find(book => book.entries.length)?.id || books[0]?.id || '';
    }
  },
  { immediate: true },
);

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
  generationState.error = '';
  clearStorylinePreviewDraft();
  generationState.preview = null;
  generationState.rawOutput = '';
  try {
    const result = await generateContent(adapter, buildGenerationConfig(), {
      ...getGenerationOptions(),
      createFailedDraft: input => storylines.createFailedDraft(input),
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
      generationState.error = result.warnings.join('；') || '没有返回可解析的剧情梳理结果';
      toastr.warning('解析失败，原始输出已保留');
      return;
    }
    if (result.status === 'saved') {
      toastr.success(`已梳理 ${result.saved.lineCount} 条剧情线`);
      void phone.presentGeneratedPage('storylines', 'root', '剧情梳理');
      return;
    }
    openPreview(result);
  } catch (error) {
    generationState.error = error instanceof Error ? error.message : '剧情梳理失败';
  }
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
  if (!generationState.generationId) return;
  stopGenerationByIdSafe(generationState.generationId);
  generationState.running = false;
  generationState.error = '生成已停止';
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
  const confirmed = await phone.confirmNotice(`要删除剧情线“${line.title}”吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!confirmed) return;
  storylines.deleteLine(lineId);
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
  storylines.deleteBeat(beatId);
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
  storylines.deleteHook(hookId);
  toastr.success('已删除伏笔');
}
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
