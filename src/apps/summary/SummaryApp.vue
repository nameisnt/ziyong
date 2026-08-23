<template>
  <section class="pc-summary-app">
    <SummaryCatalogPage
      v-if="route.page === 'root'"
      :failed-drafts="failedDrafts"
      :get-failed-draft-context="failedDraftSourceLabel"
      :preview-draft="summaryPreviewDraft"
      :shelf-books="shelfBooks"
      @create="openCreationMode"
      @discard-preview="discardSummaryPreviewDraft"
      @open-book="openBook"
      @open-failed-draft="openFailedDraft"
      @open-preview="openSummaryPreviewDraft"
      @remove-failed-draft="removeFailedDraft"
    />

    <SummaryBookEditorPage
      v-else-if="route.page === 'create-book' || route.page === 'edit-book'"
      v-model:title="bookTitle"
      :creating="route.page === 'create-book'"
      @cancel="phone.goBack()"
      @create-empty="submitBook"
      @submit="route.page === 'create-book' ? submitBookAndGenerate() : submitBook()"
    />

    <SummaryBookPage
      v-else-if="route.page === 'book' && activeBook"
      :book="activeBook"
      :entries="sortedActiveBookEntries"
      :failed-drafts="activeBookFailedDrafts"
      :get-failed-draft-context="failedDraftSourceLabel"
      :sort-desc="summaryEntrySortDesc"
      @batch="openBatchGenerate(activeBook.id)"
      @generate="openGenerate(activeBook.id)"
      @import="openImportChat(activeBook.id)"
      @open-entry="openEntry(activeBook.id, $event)"
      @open-failed-draft="openFailedDraft"
      @remove-book="removeBook(activeBook.id)"
      @remove-failed-draft="removeFailedDraft"
      @rename="openRenameBook(activeBook.id)"
      @toggle-sort="summaryEntrySortDesc = !summaryEntrySortDesc"
    />

    <SummaryEntryDetailPage
      v-else-if="route.page === 'entry' && activeBook && activeEntry"
      v-model:catalog-open="showCatalogModal"
      :catalog-items="entryCatalogItems"
      :entry="activeEntry"
      :next-id="nextEntryId"
      :previous-id="previousEntryId"
      @bagu="openSummaryBaguScan"
      @bottom="scrollToBottom"
      @delete="removeEntry(activeBook.id, activeEntry.id)"
      @edit="openEditEntry(activeBook.id, activeEntry.id)"
      @erase="overwriteSummaryContent"
      @favorite="summary.toggleFavorite(activeBook.id, activeEntry.id)"
      @next="openEntry(activeBook.id, nextEntryId, true)"
      @previous="openEntry(activeBook.id, previousEntryId, true)"
      @select-catalog="selectCatalogEntry"
      @top="scrollToTop"
    />

    <SummaryBaguPage
      v-else-if="route.page === 'bagu-scan' && activeBook && activeEntry"
      :apply-handler="applySummaryBaguContent"
      :content="activeEntry.content"
      :range-label="activeEntry.rangeLabel"
      :title="activeEntry.title"
    />

    <SummaryEntryEditorPage
      v-else-if="route.page === 'editor' && activeBook"
      v-model:content="entryDraft.content"
      v-model:directory-order="entryDraft.directoryOrder"
      v-model:range-label="entryDraft.rangeLabel"
      v-model:title="entryDraft.title"
      :editing-title="editingEntry?.title || ''"
      :show-order="Boolean(editingEntry)"
      @cancel="phone.goBack()"
      @save="submitEntry"
    />

    <SummaryImportPage
      v-else-if="route.page === 'import-chat'"
      v-model:rule-id="summaryImport.ruleId"
      v-model:target-book-id="summaryImportTargetBookId"
      :all-selected="allSummaryImportsSelected"
      :books="books"
      :error="summaryImport.error"
      :items="summaryImport.items"
      :loading="summaryImport.loading"
      :rules="summaryImportRules"
      :selected-ids="summaryImport.selectedIds"
      :target-book-exists="Boolean(summaryImportTargetBook)"
      @cancel="phone.goBack()"
      @create-book="openCreateBook"
      @import="importSummaryEntries"
      @refresh="reloadSummaryImport"
      @rule-change="onSummaryImportRuleChange"
      @toggle-all="toggleAllSummaryImports"
      @toggle-item="toggleSummaryImport"
    />

    <SummaryGeneratePage
      v-else-if="route.page === 'generate' && activeBook"
      v-model:from-start-end="generationDraft.fromStartEnd"
      v-model:range-text="generationDraft.rangeText"
      v-model:recent-count="generationDraft.recentCount"
      v-model:references="selectedReferences"
      v-model:single-message-id="generationDraft.singleMessageId"
      v-model:source-mode="settings.generation.sourceMode"
      v-model:user-requirement="generationDraft.userRequirement"
      :capture="captureSummaryPrompt"
      :capture-reset-key="summaryPromptPreview"
      :error="generationError"
      :raw-output="generationRawOutput"
      :running="generationRunning"
      @cancel="phone.goBack()"
      @generate="runGeneration"
      @stop="stopGeneration"
    />

    <SummaryBatchPage
      v-else-if="route.page === 'batch-generate'"
      v-model:book-id="batchDraft.bookId"
      v-model:connection-selection="batchDraft.connectionSelection"
      v-model:floor-mode="batchDraft.floorMode"
      v-model:floor-text="batchDraft.floorText"
      v-model:group-mode="batchDraft.groupMode"
      v-model:group-size="batchDraft.groupSize"
      v-model:include-ai="batchDraft.includeAi"
      v-model:include-user="batchDraft.includeUser"
      v-model:references="selectedReferences"
      v-model:rpm-limit="batchDraft.rpmLimit"
      v-model:tavern-preset-name="batchDraft.tavernPresetName"
      v-model:user-requirement="batchDraft.userRequirement"
      :books="books"
      :inputs-locked="batchInputsLocked"
      :state="batchState"
      @cancel="phone.goBack()"
      @generate="runBatchGeneration"
      @reset="resetBatchProgress"
      @stop="stopBatchGeneration"
    />

    <SummaryPreviewPage
      v-else-if="route.page === 'preview' && previewBook && generationState.preview"
      v-model:content="generationState.preview.content"
      v-model:raw="generationState.preview.raw"
      :reparse-handler="reparsePreviewRaw"
      :reasoning="generationState.preview.generationRecord?.reasoning || ''"
      :source-label="generationState.preview.source.label"
      :text-provider-summary="textProviderSummary"
      :title="generationState.preview.title"
      :warnings="generationState.preview.warnings"
      @back="returnToGenerate"
      @reparse="reparsePreviewRaw"
      @update:reasoning="updateGenerationRecordReasoning(generationState.preview, $event)"
      @save="savePreview"
    />

    <SummaryFailedDraftPage
      v-else-if="route.page === 'failed-draft' && activeFailedDraft"
      v-model:raw-output="failedDraftRawOutput"
      v-model:target-book-id="failedDraftTargetBookId"
      :books="books"
      :draft="activeFailedDraft"
      @delete="removeFailedDraft(activeFailedDraft.id)"
      @reparse="reparseFailedDraft"
    />
    <CreationModeModal
      :open="creationModeOpen"
      :options="summaryCreationOptions"
      subtitle="选择后才进入具体页面"
      title="添加总结"
      @close="creationModeOpen = false"
      @select="selectSummaryCreationMode"
    />
  </section>
</template>

<script setup lang="ts">
import SummaryBatchPage from '@/apps/summary/SummaryBatchPage.vue';
import SummaryBookPage from '@/apps/summary/SummaryBookPage.vue';
import SummaryBookEditorPage from '@/apps/summary/SummaryBookEditorPage.vue';
import SummaryBaguPage from '@/apps/summary/SummaryBaguPage.vue';
import SummaryCatalogPage from '@/apps/summary/SummaryCatalogPage.vue';
import CreationModeModal, { type CreationModeOption } from '@/components/CreationModeModal.vue';
import SummaryEntryDetailPage from '@/apps/summary/SummaryEntryDetailPage.vue';
import SummaryEntryEditorPage from '@/apps/summary/SummaryEntryEditorPage.vue';
import SummaryFailedDraftPage from '@/apps/summary/SummaryFailedDraftPage.vue';
import SummaryGeneratePage from '@/apps/summary/SummaryGeneratePage.vue';
import SummaryImportPage from '@/apps/summary/SummaryImportPage.vue';
import SummaryPreviewPage from '@/apps/summary/SummaryPreviewPage.vue';
import { useSummaryBookSession } from '@/apps/summary/useSummaryBookSession';
import { useSummaryBatchSession } from '@/apps/summary/useSummaryBatchSession';
import { useSummaryGenerationActions } from '@/apps/summary/useSummaryGenerationActions';
import { useCatalogDetailNavigation } from '@/composables/useCatalogDetailNavigation';
import { useDirectorySort } from '@/composables/useDirectorySort';
import { useSummaryImport } from '@/composables/useSummaryImport';
import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import { buildGenerationPreview, captureGenerationPrompt } from '@/core/generationService';
import type { ManualBatchTaskConfig } from '@/core/manualBatchRunner';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useRecoveryStore } from '@/store/recovery';
import { useSettingsStore } from '@/store/settings';
import { useSummaryStore } from '@/store/summary';
import type { FailedGenerationDraft } from '@/type/generation';
import { canOpenBaguScan } from '@/util/baguScanGate';
import { useDetailScroll } from '@/util/detailScroll';
import { parseSimpleXmlResult } from '@/util/generation';
import { formatGenerationReferences, type GenerationReferenceItem } from '@/util/references';
import { usePreviewDraftPersistence } from '@/util/previewDrafts';
import { useInvalidRouteFallback } from '@/util/routeFallback';
import { getSourceLastFloor } from '@/util/sourceFloor';
import { updateGenerationRecordReasoning } from '@/util/generationReasoning';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const creationModeOpen = ref(false);
const summaryCreationOptions: CreationModeOption[] = [
  { description: '从已有 AI 楼层提取', icon: 'fa-solid fa-file-import', id: 'extract', label: '提取总结' },
  { description: '创建新的总结集并生成', icon: 'fa-solid fa-wand-magic-sparkles', id: 'create', label: '新建总结' },
  { description: '按多个范围依次总结', icon: 'fa-solid fa-layer-group', id: 'batch', label: '批量总结' },
];
const prompts = usePromptStore();
const recovery = useRecoveryStore();
const settingsStore = useSettingsStore();
const summary = useSummaryStore();
const summaryGenerationAdapter = getRegisteredPhoneGenerationAdapter('summary', 'generate');
const { books, failedDrafts } = storeToRefs(summary);
const { currentRoute: route } = storeToRefs(phone);
const { entries: recoveryEntries } = storeToRefs(recovery);
const { settings } = storeToRefs(settingsStore);

const bookTitle = ref('');
const entryDraft = reactive({
  title: '',
  rangeLabel: '',
  content: '',
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
  preview: null as null | {
    bookId: string;
    content: string;
    draftId: null | string;
    raw: string;
    source: {
      floorEnd?: number;
      label: string;
    };
    title: string;
    warnings: string[];
  },
});
const failedDraftRawOutput = ref('');
const failedDraftTargetBookId = ref('');
const summaryEntrySortDesc = useDirectorySort('summaryDesc');
const selectedReferences = ref<GenerationReferenceItem[]>([]);
const entryContentEl = ref<HTMLElement | null>(null);
const { scrollToBottom, scrollToTop } = useDetailScroll(entryContentEl, '.pc-summary-detail-page .pc-detail-content');
const showCatalogModal = ref(false);
const {
  allSelected: allSummaryImportsSelected,
  importEntries: importSummaryEntries,
  reload: reloadSummaryImport,
  reset: resetSummaryImport,
  rules: summaryImportRules,
  setRule: onSummaryImportRuleChange,
  state: summaryImport,
  targetBook: summaryImportTargetBook,
  targetBookId: summaryImportTargetBookId,
  toggleAll: toggleAllSummaryImports,
  toggleItem: toggleSummaryImport,
} = useSummaryImport();

type SummaryPreview = NonNullable<typeof generationState.preview>;

const {
  beginPreviewDraft: beginSummaryPreviewDraft,
  clearPreviewDraft: clearSummaryPreviewDraft,
  discardPreviewDraft: discardSummaryPreviewDraft,
  draft: summaryPreviewDraft,
  openPreviewDraft: openSummaryPreviewDraft,
  persistPreviewDraft: persistSummaryPreviewDraft,
} = usePreviewDraftPersistence<SummaryPreview>({
  appId: 'summary',
  consumeFailedDraft: draftId => summary.deleteFailedDraft(draftId),
  getPreview: () => generationState.preview,
  getRouteParams: () => {
    const bookId = generationState.preview?.bookId || route.value.params?.bookId || '';
    return bookId ? { bookId } : {};
  },
  page: 'preview',
  route,
  setPreview: preview => {
    generationState.preview = {
      ...preview,
      bookId: preview.bookId || route.value.params?.bookId || '',
    };
  },
  title: '生成预览',
});

const activeBook = computed(() => {
  const bookId = route.value.params?.bookId;
  return bookId ? summary.getBook(bookId) : null;
});
const previewBook = computed(() => {
  const bookId = generationState.preview?.bookId;
  return bookId ? summary.getBook(bookId) : null;
});
const sortedActiveBookEntries = computed(() =>
  [...(activeBook.value?.entries || [])].sort((left, right) => {
    const compare =
      (left.directoryOrder ?? 0) - (right.directoryOrder ?? 0) || left.createdAt.localeCompare(right.createdAt);
    return summaryEntrySortDesc.value ? -compare : compare;
  }),
);

const shelfBooks = computed(() =>
  books.value.map(book => ({
    count: book.entries.length,
    gradient: 'linear-gradient(180deg, #0ea5e9 0%, #22c55e 100%)',
    icon: 'fa-solid fa-layer-group',
    id: book.id,
    subtitle: `${book.entries.length} 条`,
    title: book.title,
  })),
);

const activeBookFailedDrafts = computed(() => {
  const bookId = activeBook.value?.id;
  return bookId ? failedDrafts.value.filter(draft => draft.context.bookId === bookId) : [];
});

const activeEntry = computed(() => {
  const bookId = route.value.params?.bookId;
  const entryId = route.value.params?.entryId;
  return bookId && entryId ? summary.getEntry(bookId, entryId) : null;
});
const {
  catalogItems: entryCatalogItems,
  nextId: nextEntryId,
  previousId: previousEntryId,
} = useCatalogDetailNavigation(sortedActiveBookEntries, activeEntry, entry => entry.title);
const editingEntry = computed(() => (route.value.params?.entryId && activeEntry.value ? activeEntry.value : null));
const activeFailedDraft = computed(() => {
  const draftId = route.value.params?.draftId;
  return draftId ? summary.getFailedDraft(draftId) : null;
});
const formattedReferences = computed(() => formatGenerationReferences(selectedReferences.value));
const {
  draft: batchDraft,
  hydrate: hydrateBatchDraft,
  initialize: initializeBatchDraft,
  inputsLocked: batchInputsLocked,
  resetProgress: resetBatchProgress,
  run: runBatchGeneration,
  state: batchState,
  stop: stopBatchGeneration,
  task: batchTask,
} = useSummaryBatchSession({
  buildOutputFormat: buildSummaryOutputFormat,
  formattedReferences,
  getRouteBookId: () => route.value.params?.bookId || '',
});

const {
  error: generationError,
  rawOutput: generationRawOutput,
  runGeneration,
  running: generationRunning,
  stopGeneration,
} = useSummaryGenerationActions({
  beginPreviewDraft: beginSummaryPreviewDraft,
  buildOutputFormat: buildSummaryOutputFormat,
  clearPreviewDraft: clearSummaryPreviewDraft,
  draft: generationDraft,
  failedDraftRawOutput,
  failedDraftTargetBookId,
  formattedReferences,
  persistPreviewDraft: persistSummaryPreviewDraft,
  route,
  selectedReferences,
  state: generationState,
});
const summaryPromptPreview = computed(() => {
  const bookId = route.value.params?.bookId || activeBook.value?.id;
  if (!bookId) return '未选择总结集';
  try {
    return buildGenerationPreview(
      summaryGenerationAdapter,
      {
        appPrompt: prompts.appPrompts.summaries,
        bookId,
        outputFormat: buildSummaryOutputFormat(),
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
const {
  removeBook,
  saveBook: submitBook,
  saveBookAndGenerate: submitBookAndGenerate,
} = useSummaryBookSession({
  confirmDelete: message => phone.confirmNotice(message, { confirmLabel: '删除', kind: 'warning' }),
  getBookId: () => route.value.params?.bookId,
  getPage: () => route.value.page,
  getTitle: () => bookTitle.value,
  navigateToBook: book => phone.replacePage('book', book.title, { bookId: book.id }),
  navigateToGenerate: bookId => phone.replacePage('generate', '生成总结', { bookId }),
  navigateToRoot: () => phone.replacePage('root', '总结集'),
  notifySuccess: message => toastr.success(message),
});

function captureSummaryPrompt() {
  const bookId = route.value.params?.bookId || activeBook.value?.id;
  if (!bookId) return Promise.reject(new Error('未选择总结集'));
  return captureGenerationPrompt(
    summaryGenerationAdapter,
    {
      appPrompt: prompts.appPrompts.summaries,
      bookId,
      outputFormat: buildSummaryOutputFormat(),
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
    if (current.appId !== 'summary') return;
    if (current.page === 'create-book') {
      bookTitle.value = '';
    } else if (current.page === 'edit-book') {
      bookTitle.value = activeBook.value?.title || '';
    }

    if (current.page === 'editor') {
      entryDraft.title = activeEntry.value?.title || '';
      entryDraft.rangeLabel = activeEntry.value?.rangeLabel || '';
      entryDraft.content = activeEntry.value?.content || '';
      entryDraft.directoryOrder = activeEntry.value?.directoryOrder ?? 0;
    }

    if (current.page === 'generate' && previous?.page !== 'preview') {
      selectedReferences.value = [];
      generationDraft.rangeText = '';
      generationDraft.singleMessageId = 0;
      generationDraft.userRequirement = '';
      generationState.preview = null;
    }

    if (current.page === 'import-chat' && previous?.page !== 'import-chat') {
      resetSummaryImport(current.params?.bookId || '');
    }

    if (current.page === 'batch-generate') {
      const existingTask = batchTask.value;
      if (existingTask && !['completed', 'cancelled'].includes(existingTask.status)) {
        hydrateBatchDraft(existingTask.config as ManualBatchTaskConfig);
        return;
      }
      selectedReferences.value = [];
      initializeBatchDraft(current.params?.bookId || '');
    }

    if (current.page === 'failed-draft') {
      failedDraftRawOutput.value = activeFailedDraft.value?.rawOutput || '';
      failedDraftTargetBookId.value = route.value.params?.bookId || activeBook.value?.id || books.value[0]?.id || '';
    }
  },
  { immediate: true, deep: true },
);

useInvalidRouteFallback({
  source: () => ({
    appId: route.value.appId,
    entryId: route.value.params?.entryId,
    hasBook: Boolean(activeBook.value),
    hasEntry: Boolean(activeEntry.value),
    hasFailedDraft: Boolean(activeFailedDraft.value),
    hasPreview: Boolean(generationState.preview),
    hasPreviewBook: Boolean(previewBook.value),
    page: route.value.page,
  }),
  isInvalid: current =>
    current.appId === 'summary' &&
    ((['book', 'edit-book', 'generate'].includes(current.page) && !current.hasBook) ||
      (['entry', 'bagu-scan'].includes(current.page) && (!current.hasBook || !current.hasEntry)) ||
      (current.page === 'editor' && (!current.hasBook || (Boolean(current.entryId) && !current.hasEntry))) ||
      (current.page === 'preview' && (!current.hasPreviewBook || !current.hasPreview)) ||
      (current.page === 'failed-draft' && !current.hasFailedDraft)),
  fallback: () => {
    if (route.value.appId !== 'summary') return;
    if (activeBook.value) {
      phone.replacePage('book', activeBook.value.title, { bookId: activeBook.value.id });
      return;
    }
    phone.replacePage('root', '总结集');
  },
});

function openCreateBook() {
  phone.pushPage('create-book', '生成总结');
}

function openCreationMode() {
  creationModeOpen.value = true;
}

function selectSummaryCreationMode(mode: string) {
  if (mode === 'extract') openSummaryExtract();
  else if (mode === 'batch') openBatchGenerate();
  else openCreateBook();
}

function openSummaryExtract() {
  phone.pushPage('import-chat', '提取总结');
}

function openRenameBook(bookId: string) {
  const book = summary.getBook(bookId);
  if (!book) return;
  phone.pushPage('edit-book', '重命名总结集', { bookId });
}

function openBook(bookId: string) {
  const book = summary.getBook(bookId);
  if (!book) return;
  phone.pushPage('book', book.title, { bookId });
}

function openGenerate(bookId: string) {
  phone.pushPage('generate', '生成总结', { bookId });
}

function openImportChat(bookId: string) {
  phone.pushPage('import-chat', '导入 AI 楼层', { bookId });
}

function openBatchGenerate(bookId?: string) {
  if (!bookId && !books.value.length) {
    phone.noticeWarning('请先创建总结集，再进行批量生成');
    return;
  }
  phone.pushPage('batch-generate', '批量生成总结', bookId ? { bookId } : undefined);
}

function openEntry(bookId: string, entryId: string, replaceCurrent = false) {
  if (!entryId) return;
  const entry = summary.getEntry(bookId, entryId);
  if (!entry) return;
  if (replaceCurrent) phone.replacePage('entry', entry.title, { bookId, entryId });
  else phone.pushPage('entry', entry.title, { bookId, entryId });
  void nextTick(() => scrollToTop('auto'));
}

function openSummaryBaguScan() {
  if (!activeBook.value || !activeEntry.value) return;
  if (!canOpenBaguScan(activeEntry.value.content)) return;
  phone.pushPage('bagu-scan', '八股检测', {
    bookId: activeBook.value.id,
    entryId: activeEntry.value.id,
  });
}

function overwriteSummaryContent(content: string) {
  const book = activeBook.value;
  const entry = activeEntry.value;
  if (!book || !entry) return;
  summary.updateEntry(book.id, entry.id, {
    content,
    directoryOrder: entry.directoryOrder,
    rangeLabel: entry.rangeLabel,
    title: entry.title,
  });
  toastr.success('已覆盖当前总结正文');
}

function selectCatalogEntry(entryId: string) {
  if (!activeBook.value) return;
  showCatalogModal.value = false;
  openEntry(activeBook.value.id, entryId, true);
}

function openFailedDraft(draftId: string) {
  const draft = summary.getFailedDraft(draftId);
  if (!draft) return;
  const bookId = typeof draft.context.bookId === 'string' ? draft.context.bookId : '';
  phone.pushPage('failed-draft', '解析失败草稿', {
    draftId,
    bookId: bookId || books.value[0]?.id || '',
  });
}

function failedDraftSourceLabel(draft: FailedGenerationDraft) {
  return draft.source.label;
}

function openEditEntry(bookId: string, entryId: string) {
  phone.pushPage('editor', '编辑总结', { bookId, entryId });
}

function submitEntry() {
  const bookId = route.value.params?.bookId;
  if (!bookId) return;

  if (editingEntry.value && route.value.params?.entryId) {
    const entry = summary.updateEntry(bookId, route.value.params.entryId, entryDraft);
    if (!entry) return;
    phone.replacePage('entry', entry.title, { bookId, entryId: entry.id });
    return;
  }

  const entry = summary.createEntry(bookId, {
    content: entryDraft.content,
    rangeLabel: entryDraft.rangeLabel,
    title: entryDraft.title,
  });
  if (!entry) return;
  phone.replacePage('entry', entry.title, { bookId, entryId: entry.id });
}

function applySummaryBaguContent(content: string) {
  if (!activeBook.value || !activeEntry.value) return false;
  const entry = summary.updateEntry(activeBook.value.id, activeEntry.value.id, {
    content,
    rangeLabel: activeEntry.value.rangeLabel,
    title: activeEntry.value.title,
  });
  return Boolean(entry);
}

function buildSummaryOutputFormat() {
  return prompts.resolveOutputFormat('summary.generate');
}

function returnToGenerate() {
  if (generationState.preview?.draftId) {
    const bookId = route.value.params?.bookId || failedDraftTargetBookId.value || books.value[0]?.id || '';
    phone.replacePage('failed-draft', '解析失败草稿', {
      bookId,
      draftId: generationState.preview.draftId,
    });
    return;
  }
  const bookId = generationState.preview?.bookId || route.value.params?.bookId;
  if (!bookId) {
    toastr.warning('草稿缺少目标总结集信息，无法返回生成设置');
    return;
  }
  phone.replacePage('generate', '生成总结', { bookId });
}

function savePreview() {
  const preview = generationState.preview;
  if (!preview) return;
  const bookId = preview.bookId || route.value.params?.bookId || summaryPreviewDraft.value?.routeParams.bookId;
  if (!bookId) {
    toastr.warning('草稿缺少目标总结集信息，无法保存条目');
    return;
  }

  const entry = summary.createEntry(bookId, {
    content: preview.content,
    directoryOrder: preview.source.floorEnd,
    generationRecord: preview.generationRecord,
    rangeLabel: preview.source.label,
    sourceFloorEnd: preview.source.floorEnd,
    title: preview.title,
  });
  if (!entry) {
    toastr.warning('目标总结集不存在，无法保存生成结果');
    return;
  }
  if (preview.draftId) {
    summary.deleteFailedDraft(preview.draftId);
  }
  clearSummaryPreviewDraft();
  generationState.preview = null;
  toastr.success('已保存生成结果');
  phone.replacePage('entry', entry.title, { bookId, entryId: entry.id });
}

function reparsePreviewRaw() {
  const preview = generationState.preview;
  if (!preview) return false;
  const rawOutput = preview.raw;
  if (!rawOutput.trim()) {
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
  preview.raw = rawOutput;
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
  summary.deleteFailedDraft(draftId);
  failedDraftRawOutput.value = '';
  if (route.value.page === 'failed-draft') {
    phone.replacePage('root', '总结集');
  }
  toastr.success('已删除失败草稿');
}

function reparseFailedDraft() {
  const draft = activeFailedDraft.value;
  if (!draft) return;

  const rawOutput = failedDraftRawOutput.value;
  if (!rawOutput.trim()) {
    toastr.warning('先补一点可解析的 XML 内容');
    return;
  }

  const bookId = failedDraftTargetBookId.value || books.value[0]?.id || '';
  if (!bookId) {
    toastr.warning('请先创建一个总结集');
    return;
  }

  const parsed = parseSimpleXmlResult(rawOutput);
  if (!parsed.ok) {
    summary.updateFailedDraft(draft.id, {
      rawOutput,
      warnings: parsed.warnings,
    });
    failedDraftRawOutput.value = rawOutput;
    toastr.warning(parsed.warnings.join('；') || '还是没能解析成功');
    return;
  }

  summary.updateFailedDraft(draft.id, {
    rawOutput,
    warnings: parsed.warnings,
  });
  generationState.preview = {
    bookId,
    content: parsed.data.content,
    draftId: null,
    generationRecord: draft.generationRecord,
    raw: rawOutput,
    source: {
      floorEnd: getSourceLastFloor(draft.source),
      label: draft.source.label,
    },
    title: parsed.data.title,
    warnings: parsed.warnings,
  };
  persistSummaryPreviewDraft({ bookId });
  summary.deleteFailedDraft(draft.id);
  failedDraftRawOutput.value = '';
  phone.replacePage('preview', '生成预览', { bookId });
}

async function removeEntry(bookId: string, entryId: string) {
  const entry = summary.getEntry(bookId, entryId);
  const shouldDelete = await phone.confirmNotice(`要删除总结条目“${entry?.title || '未命名条目'}”吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!shouldDelete) return;
  summary.deleteEntry(bookId, entryId);
  const book = summary.getBook(bookId);
  if (!book) {
    phone.goHome();
    toastr.success('已删除总结条目');
    return;
  }
  phone.replacePage('book', book.title, { bookId });
  toastr.success('已删除总结条目');
}
</script>

<style scoped>
.pc-summary-app {
  height: 100%;
  min-height: 0;
}
</style>
