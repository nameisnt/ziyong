<template>
  <section class="pc-digest-app">
    <section v-if="route.page === 'root'" class="pc-digest-page">
      <div class="pc-digest-hero">
        <div>
          <span class="pc-kicker">{{ t`摘抄库` }}</span>
          <h2>{{ entries.length }} {{ t`条摘录` }}</h2>
        </div>
        <div class="pc-hero-actions">
          <button
            class="pc-icon-btn"
            type="button"
            :aria-label="sortDesc ? t`切换为正序` : t`切换为倒序`"
            :title="sortDesc ? t`当前倒序，点击切换正序` : t`当前正序，点击切换倒序`"
            @click="sortDesc = !sortDesc"
          >
            <i :class="sortDesc ? 'fa-solid fa-arrow-down-wide-short' : 'fa-solid fa-arrow-up-short-wide'"></i>
          </button>
          <button class="pc-soft-btn" type="button" @click="openEditor()">
            <i class="fa-solid fa-plus"></i>
            <span>{{ t`手动` }}</span>
          </button>
          <button class="pc-primary-btn" type="button" @click="openGenerate">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
            <span>{{ t`AI` }}</span>
          </button>
        </div>
      </div>

      <EmptyState v-if="!entries.length" :title="t`还没有摘抄`" />

      <div v-else class="pc-entry-list">
        <article v-for="entry in sortedEntries" :key="entry.id" class="pc-entry-card">
          <button class="pc-entry-main" type="button" @click="openEntry(entry.id)">
            <div class="pc-entry-head">
              <strong>{{ entry.title }}</strong>
              <span class="pc-entry-order">{{ t`顺序` }} {{ entry.directoryOrder }}</span>
            </div>
            <span>{{ entry.sourceLabel || (entry.kind === 'ai' ? t`AI 摘抄` : t`手动摘抄`) }}</span>
            <p>{{ entry.content }}</p>
          </button>
        </article>
      </div>

      <FailedDraftList
        :drafts="failedDrafts"
        :get-context="failedDraftSourceLabel"
        :get-title="failedDraftTitle"
        @open="openFailedDraft"
        @remove="removeFailedDraft"
      />

      <PreviewDraftNotice
        :draft="digestPreviewDraft"
        @discard="discardDigestPreviewDraft"
        @open="openDigestPreviewDraft"
      />
    </section>

    <section v-else-if="route.page === 'entry' && activeEntry" class="pc-digest-page pc-digest-detail-page">
      <ReaderDetailShell
        catalog-label="列表"
        :content="activeEntry.content"
        :favorite-active="activeEntry.favorite"
        next-label="下一条"
        previous-label="上一条"
        :next-disabled="!nextEntryId"
        :previous-disabled="!previousEntryId"
        :title="activeEntry.title"
        @bagu="openDigestBaguScan"
        @bottom="scrollToBottom"
        @catalog="phone.replacePage('root', '摘抄')"
        @edit="openEditor(activeEntry.id)"
        @favorite="digest.toggleFavorite(activeEntry.id)"
        @next="openEntry(nextEntryId)"
        @previous="openEntry(previousEntryId)"
        @top="scrollToTop"
      >
        <template #kicker>
          <span class="pc-kicker">{{
            activeEntry.sourceLabel || (activeEntry.kind === 'ai' ? t`AI 摘抄` : t`手动摘抄`)
          }}</span>
        </template>
        <template #after-content>
          <details v-if="activeEntry.sourceText" class="pc-source-box">
            <summary>{{ t`来源原文` }}</summary>
            <p>{{ activeEntry.sourceText }}</p>
          </details>
        </template>
        <template #actions>
          <button class="pc-soft-btn danger" type="button" :title="t`删除`" @click="removeEntry(activeEntry.id)">
            <i class="fa-solid fa-trash"></i>
          </button>
        </template>
      </ReaderDetailShell>
    </section>

    <section v-else-if="route.page === 'bagu-scan' && activeEntry" class="pc-digest-page">
      <article class="pc-detail-card">
        <span class="pc-kicker">{{
          activeEntry.sourceLabel || (activeEntry.kind === 'ai' ? t`AI 摘抄` : t`手动摘抄`)
        }}</span>
        <div class="pc-detail-title-row">
          <h2>{{ activeEntry.title }}</h2>
        </div>
        <BaguScanPanel
          auto-scan
          class="pc-detail-bagu-panel"
          :content="activeEntry.content"
          :apply-handler="applyDigestBaguContent"
        />
      </article>
    </section>

    <section v-else-if="route.page === 'editor'" class="pc-digest-page">
      <article class="pc-editor-card">
        <span class="pc-kicker">{{ editingEntry ? t`编辑摘抄` : t`新增摘抄` }}</span>
        <input v-model="draft.title" class="pc-field" type="text" :placeholder="t`标题`" />
        <input v-model="draft.sourceLabel" class="pc-field" type="text" :placeholder="t`来源，例如 第 12 楼`" />
        <div v-if="editingEntry" class="pc-field-group">
          <label class="pc-field-label">{{ t`目录顺序` }}</label>
          <input v-model.number="draft.directoryOrder" class="pc-field" type="number" min="0" step="1" />
        </div>
        <textarea
          v-model="draft.content"
          class="pc-area pc-saved-content-area"
          :placeholder="t`摘抄正文，必须是文内文字`"
        ></textarea>
        <textarea v-model="draft.sourceText" class="pc-area compact" :placeholder="t`来源原文，可留空`"></textarea>
        <div class="pc-form-actions pc-digest-actions">
          <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
          <button class="pc-primary-btn" type="button" @click="submitEntry">{{ t`保存` }}</button>
        </div>
      </article>
    </section>

    <section v-else-if="route.page === 'generate'" class="pc-digest-page">
      <article class="pc-editor-card">
        <span class="pc-kicker">{{ t`AI 摘抄` }}</span>
        <h2>{{ t`生成原文摘抄` }}</h2>
        <GenerationPanel
          :capture="captureDigestPrompt"
          :capture-reset-key="digestPromptPreview"
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
          requirement-placeholder="例如：只摘人物关系变化相关的原句，不要改写。"
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
      class="pc-digest-page pc-generation-preview-page"
    >
      <article class="pc-detail-card pc-generation-preview-card">
        <GenerationPreviewPanel
          :content="generationState.preview.content"
          :raw="generationState.preview.raw"
          raw-editable
          :reparse-handler="reparsePreviewRaw"
          :source-label="generationState.preview.source.label"
          :text-provider-summary="textProviderSummary"
          :title="generationState.preview.title"
          :warnings="generationState.preview.warnings"
          save-label="保存摘抄"
          @back="returnToGenerate"
          @reparse="reparsePreviewRaw"
          @save="savePreview"
          @update:content="generationState.preview.content = $event"
          @update:raw="generationState.preview.raw = $event"
        />
      </article>
    </section>

    <section v-else-if="route.page === 'failed-draft' && activeFailedDraft" class="pc-digest-page pc-repair-page">
      <article class="pc-editor-card pc-repair-card">
        <span class="pc-kicker">{{ activeFailedDraft.source.label }}</span>
        <h2>{{ t`修复解析失败草稿` }}</h2>
        <div v-if="activeFailedDraft.warnings.length" class="pc-status-card warning">
          <strong>{{ t`上次解析提示` }}</strong>
          <p>{{ activeFailedDraft.warnings.join('；') }}</p>
        </div>
        <div class="pc-number-field pc-repair-raw-field">
          <span class="pc-field-label">{{ t`原始输出` }}</span>
          <RawOutputEditor
            v-model="failedDraftRawOutput"
            :placeholder="t`在这里修 XML 结构或补 title / content。`"
            @reparse="reparseFailedDraft"
          />
        </div>
        <div class="pc-form-actions">
          <button class="pc-soft-btn danger" type="button" @click="removeFailedDraft(activeFailedDraft.id)">
            {{ t`删除草稿` }}
          </button>
          <button class="pc-soft-btn" type="button" @click="reparseFailedDraft">{{ t`重新解析` }}</button>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import FailedDraftList from '@/components/FailedDraftList.vue';
import BaguScanPanel from '@/components/BaguScanPanel.vue';
import GenerationPanel from '@/components/GenerationPanel.vue';
import GenerationPreviewPanel from '@/components/GenerationPreviewPanel.vue';
import PreviewDraftNotice from '@/components/PreviewDraftNotice.vue';
import RawOutputEditor from '@/components/RawOutputEditor.vue';
import ReaderDetailShell from '@/components/ReaderDetailShell.vue';
import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import { buildGenerationPreview, captureGenerationPrompt, generateContent } from '@/core/generationService';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import { canOpenBaguScan } from '@/util/baguScanGate';
import { useDetailScroll } from '@/util/detailScroll';
import { parseSimpleXmlResult } from '@/util/generation';
import { usePreviewDraftPersistence } from '@/util/previewDrafts';
import type { GenerationReferenceItem } from '@/util/references';
import { formatGenerationReferences } from '@/util/references';
import { useInvalidRouteFallback } from '@/util/routeFallback';
import { stopGenerationByIdSafe } from '@/util/runtime';
import { getSourceLastFloor } from '@/util/sourceFloor';
import { formatTextProviderSummary } from '@/util/textProvider';
import type { FailedGenerationDraft } from '@/type/generation';
import { useDigestStore } from './store';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const digest = useDigestStore();
const prompts = usePromptStore();
const settingsStore = useSettingsStore();
const adapter = getRegisteredPhoneGenerationAdapter('digest', 'generate');
const { currentRoute: route } = storeToRefs(phone);
const { entries, failedDrafts } = storeToRefs(digest);
const { settings } = storeToRefs(settingsStore);
const selectedReferences = ref<GenerationReferenceItem[]>([]);
const entryContentEl = ref<HTMLElement | null>(null);
const failedDraftRawOutput = ref('');
const draft = reactive({
  title: '',
  content: '',
  sourceLabel: '',
  sourceText: '',
  tags: [] as string[],
  directoryOrder: 0,
});
const generationDraft = reactive({
  fromStartEnd: 20,
  recentCount: 20,
  rangeText: '',
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
type DigestPreview = NonNullable<typeof generationState.preview>;

const {
  clearPreviewDraft: clearDigestPreviewDraft,
  discardPreviewDraft: discardDigestPreviewDraft,
  draft: digestPreviewDraft,
  openPreviewDraft: openDigestPreviewDraft,
  persistPreviewDraft: persistDigestPreviewDraft,
} = usePreviewDraftPersistence<DigestPreview>({
  appId: 'digest',
  consumeFailedDraft: draftId => digest.deleteFailedDraft(draftId),
  getPreview: () => generationState.preview,
  page: 'preview',
  route,
  setPreview: preview => {
    generationState.preview = preview;
  },
  title: '摘抄预览',
});

const activeEntry = computed(() => (route.value.params?.entryId ? digest.getEntry(route.value.params.entryId) : null));
const editingEntry = computed(() => (route.value.params?.entryId ? digest.getEntry(route.value.params.entryId) : null));
const activeFailedDraft = computed(() =>
  route.value.params?.draftId ? digest.getFailedDraft(route.value.params.draftId) : null,
);
const formattedReferences = computed(() => formatGenerationReferences(selectedReferences.value));
const sortDesc = computed({
  get: () => settings.value.directorySort.digestDesc,
  set: value => {
    settings.value.directorySort.digestDesc = value;
  },
});
const sortedEntries = computed(() => {
  const sorted = [...entries.value];
  if (sortDesc.value) sorted.reverse();
  return sorted;
});
const activeEntryIndex = computed(() => sortedEntries.value.findIndex(entry => entry.id === activeEntry.value?.id));
const previousEntryId = computed(() =>
  activeEntryIndex.value > 0 ? sortedEntries.value[activeEntryIndex.value - 1]?.id || '' : '',
);
const nextEntryId = computed(() =>
  activeEntryIndex.value >= 0 ? sortedEntries.value[activeEntryIndex.value + 1]?.id || '' : '',
);
const textProviderSummary = computed(() =>
  settings.value.textProvider.mode === 'external'
    ? formatTextProviderSummary(settings.value.textProvider)
    : '跟随酒馆当前模型',
);
const digestPromptPreview = computed(() => {
  try {
    return buildGenerationPreview(
      adapter,
      {
        appPrompt: prompts.appPrompts.digest,
        outputFormat: buildDigestOutputFormat(),
        userRequirement: generationDraft.userRequirement,
      },
      getGenerationOptions(),
    ).text;
  } catch (error) {
    return error instanceof Error ? error.message : '无法生成提示词预览';
  }
});
const { scrollToBottom, scrollToTop } = useDetailScroll(entryContentEl, '.pc-digest-detail-page .pc-detail-content');

watch(
  () => route.value,
  current => {
    if (current.appId !== 'digest') return;
    if (current.page === 'editor') {
      draft.title = editingEntry.value?.title || '';
      draft.content = editingEntry.value?.content || '';
      draft.sourceLabel = editingEntry.value?.sourceLabel || '';
      draft.sourceText = editingEntry.value?.sourceText || '';
      draft.tags = [...(editingEntry.value?.tags || [])];
      draft.directoryOrder = editingEntry.value?.directoryOrder ?? 0;
    }
    if (current.page === 'generate') {
      selectedReferences.value = [];
      generationDraft.userRequirement = '';
      generationState.error = '';
      generationState.preview = null;
      generationState.rawOutput = '';
    }
    if (current.page === 'failed-draft') {
      failedDraftRawOutput.value = activeFailedDraft.value?.rawOutput || '';
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
    current.appId === 'digest' &&
    ((current.page === 'preview' && !current.hasPreview) ||
      (['entry', 'bagu-scan'].includes(current.page) && !current.hasEntry) ||
      (current.page === 'failed-draft' && !current.hasFailedDraft)),
  fallback: () => {
    if (route.value.appId !== 'digest') return;
    phone.replacePage('root', '摘抄');
  },
});

onScopeDispose(() => {
  if (generationState.running && generationState.generationId) {
    stopGenerationByIdSafe(generationState.generationId);
  }
});

function openEntry(entryId: string) {
  const entry = digest.getEntry(entryId);
  if (!entry) return;
  phone.pushPage('entry', entry.title, { entryId });
}

function openDigestBaguScan() {
  if (!activeEntry.value) return;
  if (!canOpenBaguScan(activeEntry.value.content)) return;
  phone.pushPage('bagu-scan', '八股检测', {
    entryId: activeEntry.value.id,
  });
}

function openEditor(entryId = '') {
  phone.pushPage('editor', entryId ? '编辑摘抄' : '新增摘抄', entryId ? { entryId } : undefined);
}

function openGenerate() {
  phone.pushPage('generate', 'AI 摘抄');
}

function openFailedDraft(draftId: string) {
  if (!digest.getFailedDraft(draftId)) return;
  phone.pushPage('failed-draft', '解析失败草稿', { draftId });
}

function failedDraftTitle() {
  return '未解析摘抄';
}

function failedDraftSourceLabel(draft: FailedGenerationDraft) {
  return draft.source.label;
}

function submitEntry() {
  if (!draft.content.trim()) {
    toastr.warning('请先填写摘抄正文');
    return;
  }
  if (editingEntry.value) {
    const entry = digest.updateEntry(editingEntry.value.id, draft);
    if (entry) phone.replacePage('entry', entry.title, { entryId: entry.id });
    return;
  }
  const entry = digest.createEntry({
    title: draft.title,
    content: draft.content,
    sourceLabel: draft.sourceLabel,
    sourceText: draft.sourceText,
    tags: draft.tags,
    kind: 'manual',
  });
  phone.replacePage('entry', entry.title, { entryId: entry.id });
}

function applyDigestBaguContent(content: string) {
  if (!activeEntry.value) return false;
  const entry = digest.updateEntry(activeEntry.value.id, {
    content,
    sourceLabel: activeEntry.value.sourceLabel,
    sourceText: activeEntry.value.sourceText,
    tags: [...activeEntry.value.tags],
    title: activeEntry.value.title,
  });
  return Boolean(entry);
}

async function removeEntry(entryId: string) {
  const entry = digest.getEntry(entryId);
  const shouldDelete = await phone.confirmNotice(`要删除摘抄“${entry?.title || '未命名摘抄'}”吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!shouldDelete) return;
  digest.deleteEntry(entryId);
  phone.replacePage('root', '摘抄');
  toastr.success('已删除摘抄');
}

function buildDigestOutputFormat() {
  return prompts.resolveOutputFormat('digest.generate');
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

function captureDigestPrompt() {
  return captureGenerationPrompt(
    adapter,
    {
      appPrompt: prompts.appPrompts.digest,
      outputFormat: buildDigestOutputFormat(),
      userRequirement: generationDraft.userRequirement,
    },
    getGenerationOptions(),
  );
}

async function runGeneration() {
  generationState.error = '';
  clearDigestPreviewDraft();
  generationState.rawOutput = '';
  generationState.preview = null;
  try {
    const result = await generateContent(
      adapter,
      {
        appPrompt: prompts.appPrompts.digest,
        outputFormat: buildDigestOutputFormat(),
        userRequirement: generationDraft.userRequirement,
      },
      {
        ...getGenerationOptions(),
        createFailedDraft: input => digest.createFailedDraft(input),
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
      },
    );

    if (result.status === 'failed') {
      generationState.error = result.warnings.join('；') || '模型没有返回可解析的摘抄 XML';
      toastr.warning('XML 解析失败，已保存失败草稿');
      void phone.presentGeneratedPage('digest', 'failed-draft', '解析失败草稿', { draftId: result.draft.id });
      return;
    }

    if (result.status === 'saved') {
      toastr.success('已生成并保存摘抄');
      void phone.presentGeneratedPage('digest', 'entry', result.saved.entry.title, {
        entryId: result.saved.entry.id,
      });
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
    persistDigestPreviewDraft();
    void phone.presentGeneratedPage('digest', 'preview', '摘抄预览');
  } catch (caughtError) {
    generationState.error = caughtError instanceof Error ? caughtError.message : '生成摘抄失败';
  }
}

function returnToGenerate() {
  if (generationState.preview?.draftId) {
    phone.replacePage('failed-draft', '解析失败草稿', { draftId: generationState.preview.draftId });
    return;
  }
  phone.replacePage('generate', 'AI 摘抄');
}

function savePreview() {
  const preview = generationState.preview;
  if (!preview) return;
  const entry = digest.createEntry({
    title: preview.title,
    content: preview.content,
    kind: 'ai',
    sourceLabel: preview.source.label,
    directoryOrder: preview.source.floorEnd,
    sourceFloorEnd: preview.source.floorEnd,
  });
  if (preview.draftId) digest.deleteFailedDraft(preview.draftId);
  clearDigestPreviewDraft();
  generationState.preview = null;
  toastr.success('已保存摘抄');
  phone.replacePage('entry', entry.title, { entryId: entry.id });
}

function reparsePreviewRaw() {
  const preview = generationState.preview;
  if (!preview) return false;
  const rawOutput = preview.raw.trim();
  if (!rawOutput) {
    toastr.warning('先补一点可解析的 XML 内容');
    return false;
  }

  const parsed = parseSimpleXmlResult(rawOutput);
  if (!parsed.ok) {
    preview.raw = rawOutput;
    preview.warnings = parsed.warnings;
    toastr.warning(parsed.warnings.join('；') || '还是没能解析成功');
    return false;
  }

  preview.content = parsed.data.content;
  preview.raw = parsed.raw;
  preview.title = parsed.data.title;
  preview.warnings = parsed.warnings;
  toastr.success('已按原始输出重新解析');
  return true;
}

async function removeFailedDraft(draftId: string) {
  const shouldDelete = await phone.confirmNotice('要删除这条解析失败草稿吗？原始输出也会一并移除。', {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!shouldDelete) return;
  digest.deleteFailedDraft(draftId);
  failedDraftRawOutput.value = '';
  if (route.value.page === 'failed-draft') phone.replacePage('root', '摘抄');
  toastr.success('已删除失败草稿');
}

function reparseFailedDraft() {
  const draft = activeFailedDraft.value;
  if (!draft) return;
  const rawOutput = failedDraftRawOutput.value.trim();
  if (!rawOutput) {
    toastr.warning('先补一点可解析的 XML 内容');
    return;
  }

  const parsed = parseSimpleXmlResult(rawOutput);
  if (!parsed.ok) {
    digest.updateFailedDraft(draft.id, {
      rawOutput,
      warnings: parsed.warnings,
    });
    failedDraftRawOutput.value = rawOutput;
    toastr.warning(parsed.warnings.join('；') || '还是没能解析成功');
    return;
  }

  digest.updateFailedDraft(draft.id, {
    rawOutput: parsed.raw,
    warnings: parsed.warnings,
  });
  generationState.preview = {
    content: parsed.data.content,
    draftId: null,
    raw: parsed.raw,
    source: { floorEnd: getSourceLastFloor(draft.source), label: draft.source.label },
    title: parsed.data.title,
    warnings: parsed.warnings,
  };
  persistDigestPreviewDraft();
  digest.deleteFailedDraft(draft.id);
  failedDraftRawOutput.value = '';
  phone.replacePage('preview', '摘抄预览');
}

function stopGeneration() {
  if (!generationState.generationId) return;
  stopGenerationByIdSafe(generationState.generationId);
  generationState.running = false;
  generationState.error = '生成已停止';
}
</script>

<style scoped>
.pc-digest-app,
.pc-digest-page {
  min-height: 100%;
}

.pc-digest-app {
  height: 100%;
  min-height: 0;
}

.pc-digest-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pc-digest-detail-page {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.pc-digest-hero,
.pc-entry-card,
.pc-detail-card {
  border: 1px solid var(--pc-border);
  border-radius: 20px;
  background: color-mix(in srgb, var(--pc-surface) 72%, transparent 28%);
  backdrop-filter: blur(12px);
  padding: 14px;
}

.pc-digest-hero,
.pc-hero-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-digest-hero {
  flex-direction: column;
  align-items: stretch;
}

.pc-digest-hero .pc-hero-actions {
  display: grid;
  grid-template-columns: 44px repeat(2, minmax(0, 1fr));
  width: 100%;
}

.pc-digest-hero .pc-hero-actions > button {
  width: 100%;
  min-width: 0;
  justify-content: center;
}

.pc-digest-hero h2,
.pc-detail-card h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
}

.pc-entry-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pc-entry-main {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
  text-align: left;
}

.pc-entry-head {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-entry-head strong {
  flex: 1 1 auto;
}

.pc-entry-head .pc-entry-order {
  flex: 0 0 auto;
  font-size: 12px;
  white-space: nowrap;
}

.pc-entry-main strong,
.pc-entry-main span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-entry-main span,
.pc-entry-main p,
.pc-source-box summary,
.pc-source-box p {
  color: var(--pc-muted);
}

.pc-entry-main p {
  display: -webkit-box;
  margin: 8px 0 0;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  white-space: pre-wrap;
}

.pc-detail-content,
.pc-source-box {
  margin-top: 14px;
  border-radius: 18px;
  background: var(--pc-surface-strong);
  padding: 14px;
  white-space: pre-wrap;
}

.pc-digest-detail-page .pc-detail-card {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  flex-direction: column;
}

.pc-digest-detail-page .pc-detail-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

.pc-digest-detail-page .pc-source-box {
  flex: 0 0 auto;
  max-height: 120px;
  overflow: auto;
}

.pc-raw-area {
  min-height: 180px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}

.pc-source-box p {
  white-space: pre-wrap;
}

.pc-editor-card > .pc-field,
.pc-editor-card > .pc-area,
.pc-editor-card > .pc-field-group {
  margin-top: 12px;
}

.pc-area.compact {
  min-height: 100px;
}

.pc-soft-btn.active {
  color: var(--pc-danger);
}

.pc-digest-actions {
  justify-content: flex-end;
}
</style>
