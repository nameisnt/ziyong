<template>
  <section class="pc-extras-app pc-app-fill">
    <ExtrasCatalogPage
      v-if="route.page === 'root'"
      :chapter-preview-draft="extraChapterPreviewDraft"
      :failed-drafts="failedDrafts"
      :get-failed-draft-context="failedDraftContextTitle"
      :get-failed-draft-title="failedDraftTitle"
      :shelf-books="shelfBooks"
      :summary-preview-draft="extraSummaryPreviewDraft"
      @create="openCreateBook"
      @discard-chapter-preview="discardExtraChapterPreviewDraft"
      @discard-summary-preview="discardExtraSummaryPreviewDraft"
      @open-book="openBook"
      @open-chapter-preview="openExtraChapterPreviewDraft"
      @open-failed-draft="openFailedDraft"
      @open-summary-preview="openExtraSummaryPreviewDraft"
      @remove-failed-draft="removeFailedDraft"
    />

    <ExtrasBookEditorPage
      v-else-if="route.page === 'book-editor'"
      v-model:book-title="bookDraft.title"
      v-model:chapter-draft="chapterGenerationDraft"
      v-model:references="selectedReferences"
      v-model:source-mode="settings.generation.sourceMode"
      :capture="captureNewBookPrompt"
      :capture-reset-key="newBookPromptPreview"
      :editing="Boolean(editingBook)"
      :generation-state="chapterGenerationViewState"
      :selected-type-value="selectedChapterTypeValue"
      :show-custom-type-field="showChapterCustomTypeField"
      :type-options="chapterTypeOptions"
      @cancel="phone.goBack()"
      @generate="submitBookAndGenerate"
      @save="submitBook"
      @select-type="selectChapterTypeValue"
      @stop="stopChapterGeneration"
    />

    <ExtrasBookOverviewPage
      v-else-if="route.page === 'book' && activeBook"
      v-model:query="query"
      v-model:sort-desc="sortDesc"
      :book="activeBook"
      :chapters="filteredChapters"
      @delete-book="removeBook(activeBook.id)"
      @delete-summary="removeSummary(activeBook.id, $event)"
      @edit-book="openEditBook(activeBook.id)"
      @edit-summary="openEditSummary(activeBook.id, $event)"
      @generate-chapter="openGenerateChapter(activeBook.id)"
      @generate-summary="openGenerateSummary(activeBook.id)"
      @open-chapter="openChapter(activeBook.id, $event)"
      @toggle-summary="extras.toggleSummary(activeBook.id, $event)"
    />

    <ExtrasChapterEditorPage
      v-else-if="route.page === 'chapter-editor' && activeBook"
      v-model:content="chapterDraft.content"
      v-model:title="chapterDraft.title"
      :heading="viewedChapter ? viewedChapter.title : t`调整当前章节`"
      @cancel="phone.goBack()"
      @save="submitChapter"
    />

    <ExtrasChapterDetailPage
      v-else-if="route.page === 'chapter' && activeBook && activeChapter"
      v-model:catalog-open="showCatalogModal"
      :catalog-items="chapterCatalogItems"
      :chapter="viewedChapter"
      :next-id="chapterNextId || ''"
      :previous-id="chapterPrevId || ''"
      :versions="activeChapter.versions"
      :viewed-version-id="viewedChapterVersionId"
      @bagu="openExtrasBaguScan"
      @bottom="scrollToBottom"
      @continue="openGenerateChapter(activeBook.id)"
      @delete="removeChapter(activeBook.id, activeChapter.id)"
      @edit="openEditChapter(activeBook.id, activeChapter.id, viewedChapterVersionId)"
      @favorite="extras.toggleFavorite(activeBook.id, activeChapter.id)"
      @next="openChapter(activeBook.id, chapterNextId || '', true)"
      @previous="openChapter(activeBook.id, chapterPrevId || '', true)"
      @rewrite="openGenerateChapter(activeBook.id, activeChapter.id, viewedChapterVersionId)"
      @select-catalog="selectCatalogChapter"
      @select-version="selectChapterVersion"
      @top="scrollToTop"
      @update:reasoning="updateViewedChapterReasoning"
    />

    <BaguDetailPage
      v-else-if="route.page === 'bagu-scan' && activeBook && activeChapter"
      :apply-handler="applyExtrasBaguContent"
      :content="viewedChapter.content"
      :title="`第 ${activeChapter.chapterNumber} 章 · ${viewedChapter.title}`"
    />

    <ExtrasChapterGeneratePage
      v-else-if="route.page === 'chapter-generate' && activeBook"
      v-model:chapter-draft="chapterGenerationDraft"
      v-model:references="selectedReferences"
      v-model:source-mode="settings.generation.sourceMode"
      :capture="captureChapterPrompt"
      :capture-reset-key="chapterPromptPreview"
      :generation-state="chapterGenerationState"
      :selected-type-value="selectedChapterTypeValue"
      :show-custom-type-field="showChapterCustomTypeField"
      :summary-rule-options="summaryRuleOptions"
      :type-options="chapterTypeOptions"
      @cancel="phone.goBack()"
      @generate="runChapterGeneration"
      @select-type="selectChapterTypeValue"
      @stop="stopChapterGeneration"
      @sync-intent="syncChapterGenerationMode"
    />

    <ExtrasSummaryEditorPage
      v-else-if="route.page === 'summary-editor' && activeBook"
      v-model:content="summaryDraft.content"
      v-model:covered-chapter-ids="summaryDraft.coveredChapterIds"
      v-model:enabled="summaryDraft.enabled"
      :book-title="activeBook.title"
      :chapters="summaryEditorChapters"
      :editing="Boolean(editingSummary)"
      @cancel="phone.goBack()"
      @save="submitSummary"
    />

    <ExtrasSummaryGeneratePage
      v-else-if="route.page === 'summary-generate' && activeBook"
      v-model:references="selectedReferences"
      v-model:source-mode="settings.generation.sourceMode"
      v-model:summary-draft="generationDraft"
      :capture="captureExtraSummaryPrompt"
      :capture-reset-key="generationPromptPreview"
      :chapters="summarizableChapters"
      :generation-state="summaryGenerationViewState"
      @cancel="phone.goBack()"
      @generate="runSummaryGeneration"
      @stop="stopGeneration"
    />

    <GenerationPreviewPage
      v-else-if="route.page === 'chapter-preview' && chapterGenerationState.preview"
      v-model:content="chapterGenerationState.preview.content"
      v-model:raw="chapterGenerationState.preview.raw"
      :reparse-handler="reparseChapterPreviewRaw"
      :reasoning="chapterGenerationState.preview.generationRecord?.reasoning || ''"
      :save-label="chapterGenerationState.preview.mode === '重写当前章节' ? '保存新版本' : '保存章节'"
      :source-label="activeBook?.title || '番外预览'"
      :text-provider-summary="chapterGenerationState.preview.mode"
      :title="chapterGenerationState.preview.title"
      :warnings="chapterGenerationState.preview.warnings"
      @update:reasoning="updateGenerationRecordReasoning(chapterGenerationState.preview, $event)"
      @back="returnToChapterGenerate"
      @reparse="reparseChapterPreviewRaw"
      @save="saveChapterPreview"
    >
      <template v-if="chapterGenerationState.preview.summary" #afterContent>
        <section class="pc-section-card pc-extras-preview-summary">
          <label class="pc-field-group">
            <span class="pc-field-label">自动章节摘要</span>
            <textarea v-model="chapterGenerationState.preview.summary" class="pc-area pc-area-multiline"></textarea>
          </label>
        </section>
      </template>
    </GenerationPreviewPage>

    <GenerationPreviewPage
      v-else-if="route.page === 'summary-preview' && generationState.preview"
      v-model:content="generationState.preview.content"
      v-model:raw="generationState.preview.raw"
      :reparse-handler="reparseSummaryPreviewRaw"
      :reasoning="generationState.preview.generationRecord?.reasoning || ''"
      save-label="保存章节总结"
      :source-label="previewBook?.title || '章节总结预览'"
      :text-provider-summary="generationState.preview.enabled ? '保存后启用' : '保存后停用'"
      :title="formatCoveredChaptersForBook(previewBook, generationState.preview.coveredChapterIds)"
      :warnings="generationState.preview.warnings"
      @update:reasoning="updateGenerationRecordReasoning(generationState.preview, $event)"
      @back="returnToGenerate"
      @reparse="reparseSummaryPreviewRaw"
      @save="saveSummaryPreview"
    />

    <FailedDraftRepairPage
      v-else-if="route.page === 'failed-draft' && activeFailedDraft"
      v-model:raw-output="failedDraftRawOutput"
      :regenerate-handler="regenerateFailedDraft"
      :raw-output-semantics="activeFailedDraft.rawOutputSemantics"
      :reasoning="activeFailedDraft.generationRecord?.reasoning || ''"
      placeholder="在这里修 XML 结构或补 content。"
      :source-label="activeFailedDraft.source.label"
      :title="activeFailedDraft.actionId === 'chapter-generate' ? '修复番外章节草稿' : '修复章节总结草稿'"
      :warnings="activeFailedDraft.warnings"
      @delete="removeFailedDraft(activeFailedDraft.id)"
      @reparse="reparseFailedDraft"
      @update:reasoning="updateGenerationRecordReasoning(activeFailedDraft, $event)"
    />
  </section>
</template>

<script setup lang="ts">
import BaguDetailPage from '@/components/BaguDetailPage.vue';
import FailedDraftRepairPage from '@/components/FailedDraftRepairPage.vue';
import GenerationPreviewPage from '@/components/GenerationPreviewPage.vue';
import ExtrasBookEditorPage from '@/apps/extras/ExtrasBookEditorPage.vue';
import ExtrasBookOverviewPage from '@/apps/extras/ExtrasBookOverviewPage.vue';
import ExtrasCatalogPage from '@/apps/extras/ExtrasCatalogPage.vue';
import ExtrasChapterGeneratePage from '@/apps/extras/ExtrasChapterGeneratePage.vue';
import ExtrasChapterEditorPage from '@/apps/extras/ExtrasChapterEditorPage.vue';
import ExtrasChapterDetailPage from '@/apps/extras/ExtrasChapterDetailPage.vue';
import ExtrasSummaryGeneratePage from '@/apps/extras/ExtrasSummaryGeneratePage.vue';
import ExtrasSummaryEditorPage from '@/apps/extras/ExtrasSummaryEditorPage.vue';
import { useExtrasChapterPreviewSession } from '@/apps/extras/useExtrasChapterPreviewSession';
import { useExtrasChapterEditorSession } from '@/apps/extras/useExtrasChapterEditorSession';
import { useExtrasBookEditorSession } from '@/apps/extras/useExtrasBookEditorSession';
import { useExtrasDeletionSession } from '@/apps/extras/useExtrasDeletionSession';
import { useExtrasSummaryEditorSession } from '@/apps/extras/useExtrasSummaryEditorSession';
import { useExtrasSummaryPreviewSession } from '@/apps/extras/useExtrasSummaryPreviewSession';
import { useExtrasChapterTypePromptSession } from '@/apps/extras/useExtrasChapterTypePromptSession';
import { useExtrasChapterView } from '@/apps/extras/useExtrasChapterView';
import { useExtrasGenerationState } from '@/apps/extras/useExtrasGenerationState';
import { useExtrasGenerationActions } from '@/apps/extras/useExtrasGenerationActions';
import { useExtrasFailedDraftRepair } from '@/composables/useExtrasFailedDraftRepair';
import { useFailedDraftRegeneration } from '@/composables/useFailedDraftRegeneration';
import { useGenerationReplaySession } from '@/composables/useGenerationReplaySession';
import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import { type ExtraChapterGenerationIntent, type ExtraChapterGenerationMode } from '@/core/extrasGeneration';
import { buildGenerationPreview, captureGenerationPrompt } from '@/core/generationService';
import { useExtrasStore } from '@/store/extras';
import { useRegexDisplayStore } from '@/apps/regex-display/store';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import type { ExtraBook, ExtraChapter } from '@/type/extra';
import type { FailedGenerationDraft } from '@/type/generation';
import { canOpenBaguScan } from '@/util/baguScanGate';
import { useDetailScroll } from '@/util/detailScroll';
import { parseContentXmlResult } from '@/util/generation';
import {
  formatMessageIdsAsRanges,
  resolveGenerationReplayReferences,
  resolveSavedGenerationReferences,
} from '@/util/generationReplay';
import { usePreviewDraftPersistence } from '@/util/previewDrafts';
import { formatGenerationReferences, type GenerationReferenceItem } from '@/util/references';
import { getRegexRulesByOperation } from '@/util/regexDisplay';
import { resolveContentVersion } from '@/util/contentVersions';
import { buildExtraHistoryContext, getSummarizableChapters } from '@/util/extrasSummary';
import { resolveExtraChapterGenerationRecords } from '@/util/extraGenerationRecords';
import { useInvalidRouteFallback } from '@/util/routeFallback';
import { updateGenerationRecordReasoning } from '@/util/generationReasoning';
import { storeToRefs } from 'pinia';

const extras = useExtrasStore();
const regexDisplay = useRegexDisplayStore();
const phone = usePhoneStore();
const prompts = usePromptStore();
const settingsStore = useSettingsStore();
const extraChapterGenerationAdapter = getRegisteredPhoneGenerationAdapter('extras', 'chapter-generate');
const extraSummaryGenerationAdapter = getRegisteredPhoneGenerationAdapter('extras', 'chapter-summary');
const { books, failedDrafts } = storeToRefs(extras);
const { currentRoute: route } = storeToRefs(phone);
const { settings } = storeToRefs(settingsStore);
const summaryExtractionRules = computed(() => getRegexRulesByOperation(regexDisplay.rules, 'extract'));
const summaryRuleOptions = computed(() =>
  summaryExtractionRules.value.map(rule => ({ label: rule.name || '未命名规则', value: rule.id })),
);
const generationSourceMode = computed({
  get: () => settings.value.generation.sourceMode,
  set: value => {
    settings.value.generation.sourceMode = value;
  },
});
const chapterReplaySession = useGenerationReplaySession({
  appId: 'extras',
  defaultPresetName: () => settings.value.generation.tavernPresetName,
  page: 'chapter-generate',
  sourceMode: generationSourceMode,
});
const query = ref('');
const sortDesc = computed({
  get: () => settings.value.directorySort.extrasDesc,
  set: value => {
    settings.value.directorySort.extrasDesc = value;
  },
});
const chapterContentEl = ref<HTMLElement | null>(null);
const { scrollToBottom, scrollToTop } = useDetailScroll(chapterContentEl, '.pc-extras-detail-page .pc-detail-content');
const showCatalogModal = ref(false);
const bookDraft = reactive({
  typeName: '',
  title: '',
});
const chapterDraft = reactive({
  title: '',
  content: '',
});
const summaryDraft = reactive({
  content: '',
  coveredChapterIds: [] as string[],
  enabled: true,
});
const {
  chapterGenerationDraft,
  chapterGenerationState,
  summaryGenerationDraft: generationDraft,
  summaryGenerationState: generationState,
} = useExtrasGenerationState();
const failedDraftRawOutput = ref('');
const selectedReferences = ref<GenerationReferenceItem[]>([]);
type ExtraChapterPreview = NonNullable<typeof chapterGenerationState.preview>;
type ExtraSummaryPreview = NonNullable<typeof generationState.preview>;

const {
  beginPreviewDraft: beginExtraChapterPreviewDraft,
  clearPreviewDraft: clearExtraChapterPreviewDraft,
  discardPreviewDraft: discardExtraChapterPreviewDraft,
  draft: extraChapterPreviewDraft,
  openPreviewDraft: openExtraChapterPreviewDraft,
  persistPreviewDraft: persistExtraChapterPreviewDraft,
} = usePreviewDraftPersistence<ExtraChapterPreview>({
  appId: 'extras',
  consumeFailedDraft: draftId => extras.deleteFailedDraft(draftId),
  getPreview: () => chapterGenerationState.preview,
  getRouteParams: () => {
    const preview = chapterGenerationState.preview;
    const bookId = preview?.bookId || route.value.params?.bookId || '';
    const chapterId = preview?.chapterId || route.value.params?.chapterId || '';
    const versionId = preview?.targetVersionId || route.value.params?.versionId || '';
    return {
      ...(bookId ? { bookId } : {}),
      ...(chapterId ? { chapterId } : {}),
      ...(versionId ? { versionId } : {}),
    };
  },
  page: 'chapter-preview',
  route,
  setPreview: preview => {
    chapterGenerationState.preview = {
      ...preview,
      bookId: preview.bookId || route.value.params?.bookId || '',
      chapterId: preview.chapterId || route.value.params?.chapterId || '',
      mode: normalizeChapterGenerationMode(preview.mode),
      summary: preview.summary || '',
      targetVersionId: preview.targetVersionId || route.value.params?.versionId || '',
    };
  },
  title: '番外预览',
});

const {
  beginPreviewDraft: beginExtraSummaryPreviewDraft,
  clearPreviewDraft: clearExtraSummaryPreviewDraft,
  discardPreviewDraft: discardExtraSummaryPreviewDraft,
  draft: extraSummaryPreviewDraft,
  openPreviewDraft: openExtraSummaryPreviewDraft,
  persistPreviewDraft: persistExtraSummaryPreviewDraft,
} = usePreviewDraftPersistence<ExtraSummaryPreview>({
  appId: 'extras',
  consumeFailedDraft: draftId => extras.deleteFailedDraft(draftId),
  getPreview: () => generationState.preview,
  getRouteParams: () => (generationState.preview?.bookId ? { bookId: generationState.preview.bookId } : {}),
  page: 'summary-preview',
  route,
  setPreview: preview => {
    generationState.preview = preview;
  },
  title: '章节总结预览',
});

const { reparseRaw: reparseChapterPreviewRaw, savePreview: saveChapterPreview } = useExtrasChapterPreviewSession({
  clearPreviewDraft: clearExtraChapterPreviewDraft,
  deleteFailedDraft: draftId => extras.deleteFailedDraft(draftId),
  getFallbackRouteParams: () => ({
    bookId: route.value.params?.bookId || extraChapterPreviewDraft.value?.routeParams.bookId,
    chapterId: route.value.params?.chapterId || extraChapterPreviewDraft.value?.routeParams.chapterId,
  }),
  getPreview: () => chapterGenerationState.preview,
  navigateToChapter: (title, params) => phone.replacePage('chapter', title, params),
  notify: toastr,
  setPreview: preview => {
    chapterGenerationState.preview = preview;
  },
  store: extras,
});
const { reparseRaw: reparseSummaryPreviewRaw, savePreview: saveSummaryPreview } = useExtrasSummaryPreviewSession({
  clearPreviewDraft: clearExtraSummaryPreviewDraft,
  deleteFailedDraft: draftId => extras.deleteFailedDraft(draftId),
  getPreview: () => generationState.preview,
  navigateToBook: (title, bookId) => phone.replacePage('book', title, { bookId }),
  notify: toastr,
  setPreview: preview => {
    generationState.preview = preview;
  },
});

const {
  currentTypePrompt: currentChapterTypePrompt,
  findExtraTypePromptByName,
  saveTypePrompt: saveChapterTypePrompt,
  selectedTypeValue: selectedChapterTypeValue,
  selectTypeValue: selectChapterTypeValue,
  showCustomTypeField: showChapterCustomTypeField,
  syncCustomSelectionFromDraft,
  typeOptions: chapterTypeOptions,
} = useExtrasChapterTypePromptSession(chapterGenerationDraft);
const formattedReferences = computed(() => formatGenerationReferences(selectedReferences.value));

function getChapterAppPrompt(intent: ExtraChapterGenerationIntent) {
  if (intent === '新开一本书') return prompts.appPrompts.extras;
  return prompts.appPrompts.extrasContinue;
}

const activeBook = computed(() => {
  const bookId = route.value.params?.bookId;
  return bookId ? extras.getBook(bookId) : null;
});

const activeChapter = computed(() => {
  const bookId = route.value.params?.bookId;
  const chapterId = route.value.params?.chapterId;
  return bookId && chapterId ? extras.getChapter(bookId, chapterId) : null;
});

const viewedChapterVersion = computed(() => {
  const chapter = activeChapter.value;
  if (!chapter) return null;
  return resolveContentVersion(chapter.versions, chapter.activeVersionId, route.value.params?.versionId);
});
const viewedChapterVersionId = computed(
  () => viewedChapterVersion.value?.id || activeChapter.value?.activeVersionId || '',
);
const viewedChapter = computed(() => {
  const chapter = activeChapter.value;
  const version = viewedChapterVersion.value;
  return chapter && version
    ? { ...chapter, content: version.content, generationRecord: version.generationRecord, title: version.title }
    : chapter;
});

function updateViewedChapterReasoning(reasoning: string) {
  const generationRecord =
    viewedChapterVersion.value?.generationRecord || activeChapter.value?.generationRecords.at(-1);
  updateGenerationRecordReasoning({ generationRecord }, reasoning);
}
const activeSummary = computed(() => {
  const bookId = route.value.params?.bookId;
  const summaryId = route.value.params?.summaryId;
  return bookId && summaryId ? extras.getSummary(bookId, summaryId) : null;
});
const activeFailedDraft = computed(() => {
  const draftId = route.value.params?.draftId;
  return draftId ? extras.getFailedDraft(draftId) : null;
});
const { removeFailedDraft, reparseFailedDraft } = useExtrasFailedDraftRepair({
  activeDraft: activeFailedDraft,
  normalizeChapterMode: normalizeChapterGenerationMode,
  persistChapterPreviewDraft: persistExtraChapterPreviewDraft,
  persistSummaryPreviewDraft: persistExtraSummaryPreviewDraft,
  rawOutput: failedDraftRawOutput,
  setChapterPreview: preview => {
    chapterGenerationState.preview = preview;
  },
  setSummaryPreview: preview => {
    generationState.preview = preview;
  },
});

const {
  chapterSession,
  runChapterGeneration,
  runChapterGenerationForBook,
  runSummaryGeneration,
  stopChapterGeneration,
  stopSummaryGeneration: stopGeneration,
  summarySession,
} = useExtrasGenerationActions({
  activeBook,
  buildChapterOutputFormat,
  buildChaptersContext,
  buildPreviousChapterContext,
  buildSummaryOutputFormat,
  chapterGenerationDraft,
  chapterGenerationState,
  beginChapterPreviewDraft: beginExtraChapterPreviewDraft,
  beginSummaryPreviewDraft: beginExtraSummaryPreviewDraft,
  clearChapterPreviewDraft: clearExtraChapterPreviewDraft,
  clearSummaryPreviewDraft: clearExtraSummaryPreviewDraft,
  currentChapterTypePrompt,
  failedDraftRawOutput,
  formattedReferences,
  getChapterAppPrompt,
  getSummarizableChapters: () => summarizableChapters.value,
  persistChapterPreviewDraft: persistExtraChapterPreviewDraft,
  persistSummaryPreviewDraft: persistExtraSummaryPreviewDraft,
  route,
  saveChapterTypePrompt,
  selectedReferences,
  summaryGenerationDraft: generationDraft,
  summaryGenerationState: generationState,
  viewedChapterVersion,
});
const chapterGenerationViewState = computed(() => ({
  error: chapterSession.error.value,
  preview: chapterGenerationState.preview,
  rawOutput: chapterSession.rawOutput.value,
  running: chapterSession.running.value,
}));
const summaryGenerationViewState = computed(() => ({
  error: summarySession.error.value,
  preview: generationState.preview,
  rawOutput: summarySession.rawOutput.value,
  running: summarySession.running.value,
}));

const editingBook = computed(() => (route.value.params?.bookId ? activeBook.value : null));
const { saveBook: submitBook, saveBookAndGenerate: submitBookAndGenerate } = useExtrasBookEditorSession(
  bookDraft,
  chapterGenerationDraft,
  {
    generateForBook: runChapterGenerationForBook,
    getBookId: () => route.value.params?.bookId,
    getChapterId: () => route.value.params?.chapterId,
    getEditingBook: () => editingBook.value,
    navigateToBook: book => phone.replacePage('book', book.title, { bookId: book.id }),
  },
);
const editingChapter = computed(() => (route.value.params?.chapterId ? activeChapter.value : null));
const { saveChapter: submitChapter } = useExtrasChapterEditorSession(chapterDraft, {
  getBookId: () => route.value.params?.bookId,
  getChapterId: () => route.value.params?.chapterId,
  getEditingChapter: () => editingChapter.value,
  getVersionId: () => route.value.params?.versionId,
  navigateToChapter: (title, params) => phone.replacePage('chapter', title, params),
});
const editingSummary = computed(() => (route.value.params?.summaryId ? activeSummary.value : null));
const { removeSummary, saveSummary: submitSummary } = useExtrasSummaryEditorSession(summaryDraft, {
  confirmDelete: message =>
    phone.confirmNotice(message, {
      confirmLabel: '删除',
      kind: 'warning',
    }),
  getBookId: () => route.value.params?.bookId,
  getEditingSummary: () => editingSummary.value,
  getSummaryId: () => route.value.params?.summaryId,
  navigateToBook: book => phone.replacePage('book', book.title, { bookId: book.id }),
  notifySuccess: message => toastr.success(message),
});
const { removeBook, removeChapter, removeChapterVersion } = useExtrasDeletionSession({
  confirmDelete: (message, confirmLabel) => phone.confirmNotice(message, { confirmLabel, kind: 'warning' }),
  getActiveBook: () => activeBook.value,
  getActiveChapter: () => activeChapter.value,
  getViewedVersionId: () => viewedChapterVersionId.value,
  goHome: () => phone.goHome(),
  navigateToBook: book => phone.replacePage('book', book.title, { bookId: book.id }),
  navigateToChapter: (title, params) => phone.replacePage('chapter', title, params),
  navigateToRoot: () => phone.replacePage('root', '番外书架'),
  notifySuccess: message => toastr.success(message),
});
const previewBook = computed(() =>
  generationState.preview?.bookId ? extras.getBook(generationState.preview.bookId) : null,
);
const newBookPromptPreview = computed(() => {
  try {
    return buildGenerationPreview(
      extraChapterGenerationAdapter,
      {
        appPrompt: getChapterAppPrompt(chapterGenerationDraft.generationIntent),
        bookId: '__new_extra_book__',
        chapterId: '',
        chapterMode: chapterGenerationDraft.mode,
        generationIntent: chapterGenerationDraft.generationIntent,
        outputFormat: buildChapterOutputFormat(),
        parseSummary: chapterGenerationDraft.parseSummary,
        previousChapterContext: buildNewBookGenerationContext(),
        summaryFormatHint: chapterGenerationDraft.summaryFormatHint,
        typeName: chapterGenerationDraft.typeName,
        typePrompt: currentChapterTypePrompt.value,
        userRequirement: chapterGenerationDraft.userRequirement,
      },
      {
        generationDefaults: {
          resultMode: settings.value.generation.resultMode,
          stream: settings.value.generation.stream,
          tavernPresetName: settings.value.generation.tavernPresetName,
        },
        references: formattedReferences.value,
        source: {
          fromStartEnd: chapterGenerationDraft.fromStartEnd,
          mode: settings.value.generation.sourceMode,
          rangeText: chapterGenerationDraft.rangeText,
          recentCount: chapterGenerationDraft.recentCount,
          singleMessageId: chapterGenerationDraft.singleMessageId,
        },
        textProvider: settings.value.textProvider,
      },
    ).text;
  } catch (error) {
    return error instanceof Error ? error.message : '无法生成提示词预览';
  }
});
const generationPromptPreview = computed(() => {
  if (!activeBook.value) return '未选择番外';
  try {
    return buildGenerationPreview(
      extraSummaryGenerationAdapter,
      {
        appPrompt: prompts.specialPrompts.extraSummary,
        bookId: activeBook.value.id,
        chaptersContext: buildChaptersContext(activeBook.value, generationDraft.coveredChapterIds),
        coveredChapterIds: [...generationDraft.coveredChapterIds],
        enabled: generationDraft.enabled,
        outputFormat: buildSummaryOutputFormat(),
        typePrompt: '',
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
const chapterPromptPreview = computed(() => {
  if (!activeBook.value) return '未选择番外';
  try {
    return buildGenerationPreview(
      extraChapterGenerationAdapter,
      {
        appPrompt: getChapterAppPrompt(chapterGenerationDraft.generationIntent),
        bookId: activeBook.value.id,
        chapterId: route.value.params?.chapterId || '',
        chapterMode: chapterGenerationDraft.mode,
        generationIntent: chapterGenerationDraft.generationIntent,
        outputFormat: buildChapterOutputFormat(),
        parseSummary: chapterGenerationDraft.parseSummary,
        previousChapterContext: buildPreviousChapterContext(activeBook.value),
        summaryFormatHint: chapterGenerationDraft.summaryFormatHint,
        typeName: chapterGenerationDraft.typeName,
        typePrompt: currentChapterTypePrompt.value,
        userRequirement: chapterGenerationDraft.userRequirement,
      },
      {
        generationDefaults: {
          resultMode: settings.value.generation.resultMode,
          stream: settings.value.generation.stream,
          tavernPresetName: settings.value.generation.tavernPresetName,
        },
        references: formattedReferences.value,
        source: {
          fromStartEnd: chapterGenerationDraft.fromStartEnd,
          mode: settings.value.generation.sourceMode,
          rangeText: chapterGenerationDraft.rangeText,
          recentCount: chapterGenerationDraft.recentCount,
          singleMessageId: chapterGenerationDraft.singleMessageId,
        },
        textProvider: settings.value.textProvider,
      },
    ).text;
  } catch (error) {
    return error instanceof Error ? error.message : '无法生成提示词预览';
  }
});
function captureNewBookPrompt() {
  return captureGenerationPrompt(
    extraChapterGenerationAdapter,
    {
      appPrompt: getChapterAppPrompt(chapterGenerationDraft.generationIntent),
      bookId: '__new_extra_book__',
      chapterId: '',
      chapterMode: chapterGenerationDraft.mode,
      generationIntent: chapterGenerationDraft.generationIntent,
      outputFormat: buildChapterOutputFormat(),
      parseSummary: chapterGenerationDraft.parseSummary,
      previousChapterContext: buildNewBookGenerationContext(),
      summaryFormatHint: chapterGenerationDraft.summaryFormatHint,
      typeName: chapterGenerationDraft.typeName,
      typePrompt: currentChapterTypePrompt.value,
      userRequirement: chapterGenerationDraft.userRequirement,
    },
    {
      generationDefaults: {
        resultMode: settings.value.generation.resultMode,
        stream: settings.value.generation.stream,
        tavernPresetName: settings.value.generation.tavernPresetName,
      },
      references: formattedReferences.value,
      referenceItems: selectedReferences.value,
      source: {
        fromStartEnd: chapterGenerationDraft.fromStartEnd,
        mode: settings.value.generation.sourceMode,
        rangeText: chapterGenerationDraft.rangeText,
        recentCount: chapterGenerationDraft.recentCount,
        singleMessageId: chapterGenerationDraft.singleMessageId,
      },
      textProvider: settings.value.textProvider,
    },
  );
}

function captureExtraSummaryPrompt() {
  if (!activeBook.value) return Promise.reject(new Error('未选择番外'));
  return captureGenerationPrompt(
    extraSummaryGenerationAdapter,
    {
      appPrompt: prompts.specialPrompts.extraSummary,
      bookId: activeBook.value.id,
      chaptersContext: buildChaptersContext(activeBook.value, generationDraft.coveredChapterIds),
      coveredChapterIds: [...generationDraft.coveredChapterIds],
      enabled: generationDraft.enabled,
      outputFormat: buildSummaryOutputFormat(),
      typePrompt: '',
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

function captureChapterPrompt() {
  if (!activeBook.value) return Promise.reject(new Error('未选择番外'));
  return captureGenerationPrompt(
    extraChapterGenerationAdapter,
    {
      appPrompt: getChapterAppPrompt(chapterGenerationDraft.generationIntent),
      bookId: activeBook.value.id,
      chapterId: route.value.params?.chapterId || '',
      chapterMode: chapterGenerationDraft.mode,
      generationIntent: chapterGenerationDraft.generationIntent,
      outputFormat: buildChapterOutputFormat(),
      parseSummary: chapterGenerationDraft.parseSummary,
      previousChapterContext: buildPreviousChapterContext(activeBook.value),
      summaryFormatHint: chapterGenerationDraft.summaryFormatHint,
      typeName: chapterGenerationDraft.typeName,
      typePrompt: currentChapterTypePrompt.value,
      userRequirement: chapterGenerationDraft.userRequirement,
    },
    {
      generationDefaults: {
        resultMode: settings.value.generation.resultMode,
        stream: settings.value.generation.stream,
        tavernPresetName: settings.value.generation.tavernPresetName,
      },
      references: formattedReferences.value,
      source: {
        fromStartEnd: chapterGenerationDraft.fromStartEnd,
        mode: settings.value.generation.sourceMode,
        rangeText: chapterGenerationDraft.rangeText,
        recentCount: chapterGenerationDraft.recentCount,
        singleMessageId: chapterGenerationDraft.singleMessageId,
      },
      textProvider: settings.value.textProvider,
    },
  );
}

const {
  catalogItems: chapterCatalogItems,
  nextId: chapterNextId,
  orderedChapters,
  previousId: chapterPrevId,
} = useExtrasChapterView(activeBook, activeChapter);

const filteredChapters = computed(() => {
  const chapters = [...(activeBook.value?.chapters || [])];
  const normalized = query.value.trim().toLowerCase();
  const result = normalized ? chapters.filter(chapter => chapter.title.toLowerCase().includes(normalized)) : chapters;
  result.sort((left, right) => {
    const compare = left.chapterNumber - right.chapterNumber;
    return sortDesc.value ? -compare : compare;
  });
  return result;
});
const summarizableChapters = computed(() => (activeBook.value ? getSummarizableChapters(activeBook.value) : []));
const summaryEditorChapters = computed(() => {
  const book = activeBook.value;
  const summary = editingSummary.value;
  if (!book) return [];
  const selectableChapterIds = new Set(getSummarizableChapters(book, summary?.id).map(chapter => chapter.id));
  const ownChapterIds = new Set(summary?.coveredChapterIds || []);
  return orderedChapters.value.filter(chapter => ownChapterIds.has(chapter.id) || selectableChapterIds.has(chapter.id));
});
const shelfBooks = computed(() =>
  books.value.map(book => ({
    count: book.chapters.length,
    icon: 'fa-solid fa-book',
    id: book.id,
    subtitle: `${book.typeName} · ${book.chapters.length} 章`,
    title: book.title,
  })),
);

watch(
  () => route.value,
  (current, previous) => {
    if (current.appId !== 'extras') {
      chapterReplaySession.release();
      return;
    }
    if (current.page !== 'chapter-generate' && current.page !== 'chapter-preview') {
      chapterReplaySession.release();
    }
    if (current.page === 'book-editor') {
      bookDraft.typeName = editingBook.value?.typeName || '';
      bookDraft.title = editingBook.value?.title || '';
      if (!editingBook.value && previous?.page !== 'chapter-preview') {
        selectedReferences.value = [];
        resetChapterGenerationDraft('新开一本书');
      }
    }

    if (current.page === 'chapter-editor') {
      chapterDraft.title = viewedChapter.value?.title || '';
      chapterDraft.content = viewedChapter.value?.content || '';
    }

    if (current.page === 'chapter-generate' && previous?.page !== 'chapter-preview') {
      selectedReferences.value = [];
      resetChapterGenerationDraft(
        current.params?.chapterId ? '重写当前章节' : activeBook.value?.chapters.length ? '续写上一章' : '新开一本书',
      );
    }

    if (current.page === 'summary-editor') {
      summaryDraft.content = editingSummary.value?.content || '';
      summaryDraft.coveredChapterIds = [...(editingSummary.value?.coveredChapterIds || [])];
      summaryDraft.enabled = editingSummary.value?.enabled ?? true;
    }

    if (current.page === 'summary-generate' && previous?.page !== 'summary-preview') {
      selectedReferences.value = [];
      generationDraft.coveredChapterIds = [];
      generationDraft.enabled = true;
      generationDraft.rangeText = '';
      generationDraft.singleMessageId = 0;
      generationDraft.userRequirement = '';
      generationState.preview = null;
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
    bookId: route.value.params?.bookId,
    chapterId: route.value.params?.chapterId,
    hasBook: Boolean(activeBook.value),
    hasChapter: Boolean(activeChapter.value),
    hasChapterPreview: Boolean(chapterGenerationState.preview),
    hasFailedDraft: Boolean(activeFailedDraft.value),
    hasSummary: Boolean(activeSummary.value),
    hasSummaryPreview: Boolean(generationState.preview),
    page: route.value.page,
    summaryId: route.value.params?.summaryId,
  }),
  isInvalid: current =>
    current.appId === 'extras' &&
    ((current.page === 'book' && !current.hasBook) ||
      (current.page === 'book-editor' && Boolean(current.bookId) && !current.hasBook) ||
      (current.page === 'chapter' && (!current.hasBook || !current.hasChapter)) ||
      (current.page === 'bagu-scan' && (!current.hasBook || !current.hasChapter)) ||
      (current.page === 'chapter-editor' &&
        (!current.hasBook || (Boolean(current.chapterId) && !current.hasChapter))) ||
      (current.page === 'chapter-generate' &&
        (!current.hasBook || (Boolean(current.chapterId) && !current.hasChapter))) ||
      (current.page === 'summary-editor' &&
        (!current.hasBook || (Boolean(current.summaryId) && !current.hasSummary))) ||
      (current.page === 'summary-generate' && !current.hasBook) ||
      (current.page === 'chapter-preview' && !current.hasChapterPreview) ||
      (current.page === 'summary-preview' && !current.hasSummaryPreview) ||
      (current.page === 'failed-draft' && !current.hasFailedDraft)),
  fallback: () => {
    if (route.value.appId !== 'extras') return;
    if (activeBook.value) {
      phone.replacePage('book', activeBook.value.title, { bookId: activeBook.value.id });
      return;
    }
    phone.replacePage('root', '番外书架');
  },
});

function buildNewBookGenerationContext() {
  const title = bookDraft.title.trim();
  return title ? `番外书名：${title}` : '';
}

function normalizeChapterGenerationMode(value: unknown): ExtraChapterGenerationMode {
  if (value === '新开一本书' || value === '重写当前章节') return value;
  return '续写上一章';
}

function getViewedChapterGenerationRecord() {
  const chapter = activeChapter.value;
  if (!chapter) return null;
  if (chapter.versions.length) return viewedChapterVersion.value?.generationRecord || null;
  return chapter.generationRecords.at(-1) || null;
}

function resolveStoredChapterGenerationIntent(
  generationRecord = getViewedChapterGenerationRecord(),
): ExtraChapterGenerationIntent {
  if (generationRecord?.generationIntent) return generationRecord.generationIntent;
  if (generationRecord?.chapterMode === '新开一本书' || generationRecord?.chapterMode === '续写上一章') {
    return generationRecord.chapterMode;
  }
  const chapter = activeChapter.value;
  const historicalRecord = [...(chapter ? resolveExtraChapterGenerationRecords(chapter) : [])].find(
    record => record.chapterMode === '新开一本书' || record.chapterMode === '续写上一章',
  );
  if (historicalRecord?.chapterMode === '新开一本书' || historicalRecord?.chapterMode === '续写上一章') {
    return historicalRecord.chapterMode;
  }
  return chapter?.chapterNumber === 1 ? '新开一本书' : '续写上一章';
}

function syncChapterGenerationMode() {
  if (chapterGenerationDraft.mode !== '重写当前章节') {
    chapterGenerationDraft.mode = chapterGenerationDraft.generationIntent;
  }
}

function getAdoptedChapterGenerationRecord(chapter: ExtraChapter) {
  if (chapter.versions.length) {
    return resolveContentVersion(chapter.versions, chapter.activeVersionId)?.generationRecord || null;
  }
  return chapter.generationRecords.at(-1) || null;
}

function resetChapterGenerationDraft(mode: typeof chapterGenerationDraft.mode) {
  chapterReplaySession.release();
  const book = activeBook.value;
  const promptById = book?.typeId ? prompts.getTypePrompt(book.typeId) : null;
  const normalizedTypeName = book?.typeName.trim().toLocaleLowerCase() || '';
  const prompt = promptById?.domain === 'extras' ? promptById : findExtraTypePromptByName(normalizedTypeName);
  if (book && prompt && book.typeId !== prompt.id) {
    extras.updateBook(book.id, {
      title: book.title,
      typeId: prompt.id,
      typeName: book.typeName || prompt.name,
    });
  }
  chapterGenerationDraft.mode = mode;
  chapterGenerationDraft.generationIntent = mode === '新开一本书' ? '新开一本书' : '续写上一章';
  chapterGenerationDraft.rangeText = '';
  chapterGenerationDraft.singleMessageId = 0;
  chapterGenerationDraft.typeId = prompt?.id || '';
  chapterGenerationDraft.typeName = book?.typeName || prompt?.name || '';
  chapterGenerationDraft.typePrompt = prompt?.prompt || '';
  chapterGenerationDraft.userRequirement = '';
  if (mode === '续写上一章' && book) {
    const previousChapter = [...book.chapters].sort((left, right) => left.chapterNumber - right.chapterNumber).at(-1);
    const previousGenerationRecord = previousChapter ? getAdoptedChapterGenerationRecord(previousChapter) : null;
    if (previousGenerationRecord) {
      selectedReferences.value = resolveSavedGenerationReferences(previousGenerationRecord.references);
    }
  }
  const generationRecord = mode === '重写当前章节' ? getViewedChapterGenerationRecord() : null;
  if (generationRecord) {
    chapterGenerationDraft.generationIntent = resolveStoredChapterGenerationIntent(generationRecord);
    chapterGenerationDraft.fromStartEnd = generationRecord.fromStartEnd;
    chapterGenerationDraft.rangeText = generationRecord.rangeText;
    chapterGenerationDraft.recentCount = generationRecord.recentCount;
    chapterGenerationDraft.singleMessageId = generationRecord.singleMessageId;
    chapterGenerationDraft.parseSummary = generationRecord.parseSummary ?? false;
    chapterGenerationDraft.removeSummaryBlock = generationRecord.removeSummaryBlock ?? false;
    chapterGenerationDraft.summaryFormatHint =
      generationRecord.summaryFormatHint || chapterGenerationDraft.summaryFormatHint;
    chapterGenerationDraft.summaryRuleId = generationRecord.summaryRuleId || '';
    chapterGenerationDraft.typeId = generationRecord.typeId;
    chapterGenerationDraft.typeName = generationRecord.typeName;
    chapterGenerationDraft.typePrompt = generationRecord.typePrompt;
    chapterGenerationDraft.userRequirement = generationRecord.userRequirement;
    selectedReferences.value = resolveSavedGenerationReferences(generationRecord.references);
    const legacyRangeText = formatMessageIdsAsRanges(generationRecord.sourceMessageIds);
    if (!generationRecord.replay) {
      chapterGenerationDraft.rangeText =
        generationRecord.sourceMode === 'range' ? generationRecord.rangeText || legacyRangeText : '';
      chapterReplaySession.applyLegacy({
        sourceMode: generationRecord.sourceMode,
        tavernPresetName: generationRecord.tavernPresetName,
      });
    }
  }
  if (mode === '重写当前章节' && !generationRecord) {
    chapterGenerationDraft.generationIntent = resolveStoredChapterGenerationIntent();
  }
  if (generationRecord?.replay) {
    selectedReferences.value = resolveGenerationReplayReferences(generationRecord.replay);
    chapterReplaySession.applyReplay(generationRecord.replay, chapterGenerationDraft);
  }
  syncCustomSelectionFromDraft();
  chapterGenerationState.preview = null;
}

function openCreateBook() {
  phone.pushPage('book-editor', '新建番外');
}

function openEditBook(bookId: string) {
  phone.pushPage('book-editor', '编辑番外', { bookId });
}

function openBook(bookId: string) {
  const book = extras.getBook(bookId);
  if (!book) return;
  query.value = '';
  phone.pushPage('book', book.title, { bookId });
}

function openGenerateChapter(bookId: string, chapterId?: string, versionId?: string) {
  phone.pushPage(
    'chapter-generate',
    chapterId ? '重新生成章节' : '生成章节',
    chapterId
      ? {
          bookId,
          chapterId,
          ...(versionId ? { versionId } : {}),
        }
      : { bookId },
  );
}

function selectChapterVersion(versionId: string) {
  if (!activeBook.value || !activeChapter.value) return;
  const chapter = extras.activateChapterVersion(activeBook.value.id, activeChapter.value.id, versionId);
  if (!chapter) return;
  phone.replacePage('chapter', chapter.title, {
    bookId: activeBook.value.id,
    chapterId: chapter.id,
    versionId,
  });
}

function openEditChapter(bookId: string, chapterId: string, versionId?: string) {
  phone.pushPage('chapter-editor', '编辑章节', { bookId, chapterId, ...(versionId ? { versionId } : {}) });
}

function applyExtrasBaguContent(content: string) {
  if (!activeBook.value || !activeChapter.value) return false;
  const versionId = route.value.params?.versionId;
  const chapter = versionId
    ? extras.updateChapterVersion(activeBook.value.id, activeChapter.value.id, versionId, {
        content,
        title: viewedChapter.value?.title || activeChapter.value.title,
      })
    : extras.updateChapter(activeBook.value.id, activeChapter.value.id, {
        content,
        title: activeChapter.value.title,
      });
  if (!chapter) return false;
  extras.flushCurrentScope();
  return versionId ? chapter.versions.find(version => version.id === versionId)?.content || false : chapter.content;
}

function openChapter(bookId: string, chapterId: string, replaceCurrent = false) {
  if (!chapterId) return;
  const chapter = extras.getChapter(bookId, chapterId);
  if (!chapter) return;
  if (replaceCurrent) phone.replacePage('chapter', chapter.title, { bookId, chapterId });
  else phone.pushPage('chapter', chapter.title, { bookId, chapterId });
  void nextTick(() => scrollToTop('auto'));
}

function openExtrasBaguScan() {
  if (!activeBook.value || !activeChapter.value) return;
  if (!canOpenBaguScan(viewedChapter.value?.content || activeChapter.value.content)) return;
  phone.pushPage('bagu-scan', '八股检测', {
    bookId: activeBook.value.id,
    chapterId: activeChapter.value.id,
    ...(viewedChapterVersionId.value ? { versionId: viewedChapterVersionId.value } : {}),
  });
}

function selectCatalogChapter(chapterId: string) {
  if (!activeBook.value) return;
  showCatalogModal.value = false;
  openChapter(activeBook.value.id, chapterId, true);
}

function openGenerateSummary(bookId: string) {
  phone.pushPage('summary-generate', '生成章节总结', { bookId });
}

function openEditSummary(bookId: string, summaryId: string) {
  phone.pushPage('summary-editor', '编辑章节总结', { bookId, summaryId });
}

function openFailedDraft(draftId: string) {
  const draft = extras.getFailedDraft(draftId);
  if (!draft) return;
  const bookId = typeof draft.context.bookId === 'string' ? draft.context.bookId : '';
  phone.pushPage('failed-draft', '解析失败草稿', bookId ? { draftId, bookId } : { draftId });
}

function buildSummaryOutputFormat() {
  return prompts.resolveOutputFormat('extras.summary');
}

function buildChapterOutputFormat() {
  return prompts.resolveOutputFormat('extras.chapter');
}

function buildPreviousChapterContext(book = activeBook.value) {
  if (!book) return '';

  if (chapterGenerationDraft.generationIntent === '新开一本书') {
    return book.title.trim() ? `番外书名：${book.title.trim()}` : '';
  }

  let contextChapters = orderedChapters.value;
  if (chapterGenerationDraft.mode === '重写当前章节' && activeChapter.value) {
    const targetIndex = contextChapters.findIndex(chapter => chapter.id === activeChapter.value?.id);
    contextChapters =
      targetIndex >= 0
        ? contextChapters.slice(0, targetIndex)
        : contextChapters.filter(chapter => chapter.chapterNumber < activeChapter.value!.chapterNumber);
  }

  const historyContext = buildExtraHistoryContext(book, contextChapters);

  return [
    `番外书名：${book.title}`,
    historyContext ? `番外前文（按章节顺序）：\n${historyContext}` : '当前还没有已保存章节。',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function buildChaptersContext(book = activeBook.value, coveredChapterIds = generationDraft.coveredChapterIds) {
  if (!book) return '';
  const selectedChapters = book.chapters
    .filter(chapter => coveredChapterIds.includes(chapter.id))
    .sort((left, right) => left.chapterNumber - right.chapterNumber);
  const chapterBlocks = selectedChapters.map(chapter =>
    [`第 ${chapter.chapterNumber} 章 · ${chapter.title}`, chapter.content].join('\n'),
  );

  return [`番外书名：${book.title}`, chapterBlocks.join('\n\n')].filter(Boolean).join('\n\n');
}

function draftContextBookTitle(context: Record<string, unknown>) {
  const bookId = typeof context.bookId === 'string' ? context.bookId : '';
  return extras.getBook(bookId)?.title || '未知番外';
}

function failedDraftContextTitle(draft: FailedGenerationDraft) {
  return draftContextBookTitle(draft.context);
}

function failedDraftTitle(draft: FailedGenerationDraft) {
  return draft.actionId === 'chapter-generate' ? '未解析番外章节' : '未解析章节总结';
}

function returnToGenerate() {
  if (generationState.preview?.draftId) {
    phone.replacePage('failed-draft', '解析失败草稿', { draftId: generationState.preview.draftId });
    return;
  }
  const bookId = generationState.preview?.bookId || route.value.params?.bookId;
  if (!bookId) return;
  phone.replacePage('summary-generate', '生成章节总结', { bookId });
}

function returnToChapterGenerate() {
  const bookId = route.value.params?.bookId || activeBook.value?.id;
  if (!bookId) return;
  phone.replacePage(
    'chapter-generate',
    chapterGenerationDraft.mode === '重写当前章节' ? '重新生成章节' : '生成章节',
    route.value.params?.chapterId
      ? {
          bookId,
          chapterId: route.value.params.chapterId,
          ...(chapterGenerationState.preview?.targetVersionId
            ? { versionId: chapterGenerationState.preview.targetVersionId }
            : route.value.params?.versionId
              ? { versionId: route.value.params.versionId }
              : {}),
        }
      : { bookId },
  );
}

function formatCoveredChaptersForBook(book: typeof activeBook.value, ids: string[]) {
  if (!book) return '未关联章节';
  if (!ids.length) return '未关联章节';
  const titles = book.chapters
    .filter(chapter => ids.includes(chapter.id))
    .map(chapter => `第 ${chapter.chapterNumber} 章`);
  return titles.join('、') || '未关联章节';
}
const regenerateFailedDraft = useFailedDraftRegeneration({
  draft: () => activeFailedDraft.value,
  rawOutput: failedDraftRawOutput,
  reparse: reparseFailedDraft,
});
</script>
