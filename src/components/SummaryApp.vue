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

    <SummaryCreationModePage
      v-else-if="route.page === 'creation-mode'"
      @batch="openBatchGenerate()"
      @create="openCreateBook"
      @extract="openSummaryExtract"
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
      :error="generationState.error"
      :raw-output="generationState.rawOutput"
      :running="generationState.running"
      @cancel="phone.goBack()"
      @generate="runGeneration"
      @stop="stopGeneration"
    />

    <SummaryBatchPage
      v-else-if="route.page === 'batch-generate'"
      v-model:book-id="batchDraft.bookId"
      v-model:floor-mode="batchDraft.floorMode"
      v-model:floor-text="batchDraft.floorText"
      v-model:group-mode="batchDraft.groupMode"
      v-model:group-size="batchDraft.groupSize"
      v-model:include-ai="batchDraft.includeAi"
      v-model:include-user="batchDraft.includeUser"
      v-model:references="selectedReferences"
      v-model:rpm-limit="batchDraft.rpmLimit"
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
      :source-label="generationState.preview.source.label"
      :text-provider-summary="textProviderSummary"
      :title="generationState.preview.title"
      :warnings="generationState.preview.warnings"
      @back="returnToGenerate"
      @reparse="reparsePreviewRaw"
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
  </section>
</template>

<script setup lang="ts">
import SummaryBatchPage from '@/components/summary/SummaryBatchPage.vue';
import SummaryBookPage from '@/components/summary/SummaryBookPage.vue';
import SummaryBookEditorPage from '@/components/summary/SummaryBookEditorPage.vue';
import SummaryBaguPage from '@/components/summary/SummaryBaguPage.vue';
import SummaryCatalogPage from '@/components/summary/SummaryCatalogPage.vue';
import SummaryCreationModePage from '@/components/summary/SummaryCreationModePage.vue';
import SummaryEntryDetailPage from '@/components/summary/SummaryEntryDetailPage.vue';
import SummaryEntryEditorPage from '@/components/summary/SummaryEntryEditorPage.vue';
import SummaryFailedDraftPage from '@/components/summary/SummaryFailedDraftPage.vue';
import SummaryGeneratePage from '@/components/summary/SummaryGeneratePage.vue';
import SummaryImportPage from '@/components/summary/SummaryImportPage.vue';
import SummaryPreviewPage from '@/components/summary/SummaryPreviewPage.vue';
import { useCatalogDetailNavigation } from '@/composables/useCatalogDetailNavigation';
import { useDirectorySort } from '@/composables/useDirectorySort';
import { useSummaryImport } from '@/composables/useSummaryImport';
import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import { buildGenerationPreview, captureGenerationPrompt, generateContent } from '@/core/generationService';
import {
  createManualBatchTask,
  resumeGenerationTask,
  runManualBatchTask,
  type ManualBatchTaskConfig,
} from '@/core/manualBatchRunner';
import { getCurrentChatScopeKey } from '@/store/chatScoped';
import { useGenerationTaskStore } from '@/store/generationTasks';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useRecoveryStore } from '@/store/recovery';
import { useSettingsStore } from '@/store/settings';
import { useSummaryStore } from '@/store/summary';
import type { FailedGenerationDraft } from '@/type/generation';
import { canOpenBaguScan } from '@/util/baguScanGate';
import { useDetailScroll } from '@/util/detailScroll';
import { formatGenerationReferences, type GenerationReferenceItem } from '@/util/references';
import { usePreviewDraftPersistence } from '@/util/previewDrafts';
import { useInvalidRouteFallback } from '@/util/routeFallback';
import { stopGenerationByIdSafe } from '@/util/runtime';
import { getSourceLastFloor } from '@/util/sourceFloor';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const prompts = usePromptStore();
const recovery = useRecoveryStore();
const settingsStore = useSettingsStore();
const summary = useSummaryStore();
const generationTasks = useGenerationTaskStore();
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
  error: '',
  generationId: '',
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
  rawOutput: '',
  running: false,
});
const batchDraft = reactive({
  bookId: '',
  floorMode: 'custom' as 'all' | 'custom',
  floorText: '',
  groupMode: false,
  groupSize: 5,
  includeAi: true,
  includeUser: true,
  rpmLimit: 10,
  userRequirement: '',
});
const batchFormError = ref('');
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
const batchTask = computed(
  () =>
    generationTasks.tasks.find(
      task =>
        task.kind === 'summary-batch' &&
        task.scopeKey === getCurrentChatScopeKey() &&
        (!route.value.params?.bookId || task.routeParams.bookId === route.value.params.bookId),
    ) ?? null,
);
const batchState = computed(() => {
  const task = batchTask.value;
  const running = task?.status === 'running' || task?.status === 'pause-requested';
  const resumeAvailable = Boolean(task && ['paused', 'interrupted'].includes(task.status));
  return {
    currentLabel: task?.currentLabel || '',
    done: task?.savedCount || 0,
    error: task?.error || batchFormError.value,
    failed: task?.draftCount || 0,
    generationId: task?.activeGenerationId || '',
    nextJobIndex: task?.currentJobIndex || 0,
    rawOutput: task?.rawOutput || '',
    resumeAvailable,
    running,
    stopRequested: task?.status === 'paused',
    total: task?.total || 0,
  };
});
const batchInputsLocked = computed(() => batchState.value.running || batchState.value.resumeAvailable);
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
      generationDraft.fromStartEnd = 20;
      generationDraft.recentCount = 20;
      generationDraft.rangeText = '';
      generationDraft.singleMessageId = 0;
      generationDraft.userRequirement = '';
      generationState.error = '';
      generationState.rawOutput = '';
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
      batchDraft.bookId = current.params?.bookId || '';
      batchDraft.floorMode = 'custom';
      batchDraft.floorText = '';
      batchDraft.groupMode = false;
      batchDraft.groupSize = 5;
      batchDraft.includeAi = true;
      batchDraft.includeUser = true;
      batchDraft.rpmLimit = settings.value.generation.rpmLimit;
      batchDraft.userRequirement = '';
      batchFormError.value = '';
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

onScopeDispose(() => {
  if (generationState.running && generationState.generationId) {
    stopGenerationByIdSafe(generationState.generationId);
  }
});

function openCreateBook() {
  phone.pushPage('create-book', '生成总结');
}

function openCreationMode() {
  phone.pushPage('creation-mode', '生成总结');
}

function openSummaryExtract() {
  phone.pushPage('import-chat', '提取总结');
}

function openRenameBook(bookId: string) {
  const book = summary.getBook(bookId);
  if (!book) return;
  phone.pushPage('edit-book', '重命名总结集', { bookId });
}

function submitBook() {
  if (route.value.page === 'create-book') {
    const book = summary.createBook(bookTitle.value);
    phone.replacePage('book', book.title, { bookId: book.id });
    return;
  }

  if (route.value.page === 'edit-book' && route.value.params?.bookId) {
    const book = summary.renameBook(route.value.params.bookId, bookTitle.value);
    if (!book) return;
    phone.replacePage('book', book.title, { bookId: book.id });
  }
}

function openBook(bookId: string) {
  const book = summary.getBook(bookId);
  if (!book) return;
  phone.pushPage('book', book.title, { bookId });
}

async function removeBook(bookId: string) {
  const book = summary.getBook(bookId);
  const shouldDelete = await phone.confirmNotice(
    `要删除总结集“${book?.title || '未命名总结集'}”吗？里面的条目也会一起删除。`,
    {
      confirmLabel: '删除',
      kind: 'warning',
    },
  );
  if (!shouldDelete) return;
  summary.deleteBook(bookId);
  if (route.value.params?.bookId === bookId) {
    phone.replacePage('root', '总结集');
  }
  toastr.success('已删除总结集');
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

function submitBookAndGenerate() {
  if (route.value.page !== 'create-book') return;
  const book = summary.createBook(bookTitle.value);
  phone.replacePage('generate', '生成总结', { bookId: book.id });
}

function buildSummaryOutputFormat() {
  return prompts.resolveOutputFormat('summary.generate');
}

function parseBatchFloorText(rawValue: string) {
  const normalized = rawValue.trim();
  if (!normalized) {
    throw new Error('请先填写楼层范围，例如 1-30,35,40-45');
  }

  const segments = normalized
    .split(/[\s,，;；\n]+/)
    .map(item => item.trim())
    .filter(Boolean);
  const floorSet = new Set<number>();

  for (const segment of segments) {
    const singleMatch = segment.match(/^(\d+)$/);
    if (singleMatch) {
      floorSet.add(Number(singleMatch[1]));
      continue;
    }

    const rangeMatch = segment.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!rangeMatch) {
      throw new Error(`无法识别楼层片段：${segment}`);
    }

    const left = Number(rangeMatch[1]);
    const right = Number(rangeMatch[2]);
    const start = Math.min(left, right);
    const end = Math.max(left, right);
    for (let floor = start; floor <= end; floor += 1) {
      floorSet.add(floor);
    }
  }

  return [...floorSet].sort((left, right) => left - right);
}

function formatBatchRange(floors: number[]) {
  if (!floors.length) return '';
  const sorted = [...floors].sort((left, right) => left - right);
  const ranges: Array<{ end: number; start: number }> = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    if (current === end + 1) {
      end = current;
      continue;
    }
    ranges.push({ end, start });
    start = current;
    end = current;
  }
  ranges.push({ end, start });
  return ranges.map(range => (range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`)).join(', ');
}

function getBatchVisibleFloors() {
  if (!batchDraft.includeAi && !batchDraft.includeUser) {
    throw new Error('请至少选择 AI 楼层或用户楼层');
  }

  const visibleMessages = getChatMessagesSafe('0-{{lastMessageId}}', { hide_state: 'unhidden' });
  const visibleById = new Map(visibleMessages.map(message => [message.message_id, message]));
  const requestedFloors =
    batchDraft.floorMode === 'all'
      ? visibleMessages.map(message => message.message_id)
      : parseBatchFloorText(batchDraft.floorText);
  const floors = requestedFloors
    .filter(floor => {
      const message = visibleById.get(floor);
      if (!message) return false;
      if (message.role === 'assistant') return batchDraft.includeAi;
      if (message.role === 'user') return batchDraft.includeUser;
      return false;
    })
    .sort((left, right) => left - right);

  if (!floors.length) {
    throw new Error(
      batchDraft.floorMode === 'all'
        ? '当前聊天没有符合条件的可见 AI/用户楼层'
        : '给定范围内没有符合条件的可见 AI/用户楼层',
    );
  }
  return floors;
}

function buildBatchJobs() {
  const floors = getBatchVisibleFloors();
  if (!batchDraft.groupMode) {
    return floors.map(floor => ({
      label: `第 ${floor} 楼`,
      mode: 'single' as const,
      rangeText: '',
      singleMessageId: floor,
    }));
  }

  const groupSize = Math.min(50, Math.max(1, Math.round(batchDraft.groupSize || 1)));
  const jobs: Array<{
    label: string;
    mode: 'range';
    rangeText: string;
    singleMessageId: number;
  }> = [];
  for (let index = 0; index < floors.length; index += groupSize) {
    const group = floors.slice(index, index + groupSize);
    const rangeText = formatBatchRange(group);
    jobs.push({
      label: `第 ${rangeText} 楼`,
      mode: 'range',
      rangeText,
      singleMessageId: 0,
    });
  }
  return jobs;
}

async function runBatchGeneration() {
  const existingTask = batchTask.value;
  if (existingTask && ['paused', 'interrupted'].includes(existingTask.status)) {
    await resumeGenerationTask(existingTask.id);
    return;
  }
  if (existingTask && ['running', 'pause-requested'].includes(existingTask.status)) return;

  const book = summary.getBook(batchDraft.bookId);
  if (!book) {
    batchFormError.value = '请先选择要保存到的总结集';
    return;
  }

  let jobs: ReturnType<typeof buildBatchJobs>;
  try {
    jobs = buildBatchJobs();
  } catch (error) {
    batchFormError.value = error instanceof Error ? error.message : '无法解析批量楼层';
    return;
  }

  batchFormError.value = '';
  const task = createManualBatchTask({
    config: {
      appPrompt: prompts.appPrompts.summaries,
      bookId: book.id,
      floorMode: batchDraft.floorMode,
      floorText: batchDraft.floorText,
      groupMode: batchDraft.groupMode,
      groupSize: batchDraft.groupSize,
      includeAi: batchDraft.includeAi,
      includeUser: batchDraft.includeUser,
      outputFormat: buildSummaryOutputFormat(),
      references: formattedReferences.value,
      rpmLimit: batchDraft.rpmLimit,
      stream: settings.value.generation.stream,
      tavernPresetName: settings.value.generation.tavernPresetName,
      textProvider: klona(settings.value.textProvider),
      userRequirement: batchDraft.userRequirement,
    },
    jobs,
    kind: 'summary-batch',
    routeParams: { bookId: book.id },
    title: `批量总结 · ${book.title}`,
  });
  await runManualBatchTask(task.id);
}

function resetBatchProgress() {
  if (batchTask.value) generationTasks.removeTask(batchTask.value.id);
  batchFormError.value = '';
}

function hydrateBatchDraft(config: ManualBatchTaskConfig) {
  batchDraft.bookId = config.bookId;
  batchDraft.floorMode = config.floorMode || 'custom';
  batchDraft.floorText = config.floorText || '';
  batchDraft.groupMode = config.groupMode ?? false;
  batchDraft.groupSize = config.groupSize ?? 5;
  batchDraft.includeAi = config.includeAi ?? true;
  batchDraft.includeUser = config.includeUser ?? true;
  batchDraft.rpmLimit = config.rpmLimit;
  batchDraft.userRequirement = config.userRequirement;
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

async function runGeneration() {
  const bookId = route.value.params?.bookId;
  if (!bookId) return;
  generationState.error = '';
  clearSummaryPreviewDraft();
  generationState.preview = null;
  generationState.rawOutput = '';

  try {
    const result = await generateContent(
      summaryGenerationAdapter,
      {
        appPrompt: prompts.appPrompts.summaries,
        bookId,
        outputFormat: buildSummaryOutputFormat(),
        userRequirement: generationDraft.userRequirement,
      },
      {
        createFailedDraft: input => summary.createFailedDraft(input),
        generationDefaults: {
          resultMode: settings.value.generation.resultMode,
          stream: settings.value.generation.stream,
          tavernPresetName: settings.value.generation.tavernPresetName,
        },
        references: formattedReferences.value,
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
      generationState.error = result.warnings.join('；') || '模型没有返回可解析的总结 XML';
      failedDraftRawOutput.value = result.rawOutput;
      failedDraftTargetBookId.value = bookId;
      toastr.warning('XML 解析失败，已保存到失败草稿');
      void phone.presentGeneratedPage('summary', 'failed-draft', '解析失败草稿', {
        bookId,
        draftId: result.draft.id,
      });
      return;
    }

    if (result.status === 'saved') {
      toastr.success('已生成并保存总结');
      void phone.presentGeneratedPage('summary', 'entry', result.saved.entry.title, {
        bookId,
        entryId: result.saved.entry.id,
      });
      return;
    }

    generationState.preview = {
      bookId,
      content: result.data.content,
      draftId: null,
      raw: result.rawOutput,
      source: {
        floorEnd: getSourceLastFloor(result.source),
        label: result.source.label,
      },
      title: result.data.title,
      warnings: result.warnings,
    };
    persistSummaryPreviewDraft({ bookId });
    void phone.presentGeneratedPage('summary', 'preview', '生成预览', { bookId });
  } catch (error) {
    generationState.error = error instanceof Error ? error.message : '生成失败，请稍后再试';
  }
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

function stopGeneration() {
  if (!generationState.generationId) return;
  stopGenerationByIdSafe(generationState.generationId);
  generationState.running = false;
  generationState.error = '生成已停止';
}

function stopBatchGeneration() {
  if (batchTask.value) generationTasks.stopNow(batchTask.value.id);
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

  const rawOutput = failedDraftRawOutput.value.trim();
  if (!rawOutput) {
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
    rawOutput: parsed.raw,
    warnings: parsed.warnings,
  });
  generationState.preview = {
    bookId,
    content: parsed.data.content,
    draftId: null,
    raw: parsed.raw,
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
  min-height: 100%;
}
</style>
