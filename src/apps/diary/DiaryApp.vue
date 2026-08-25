<template>
  <section class="pc-diary-app">
    <DiaryCatalogPage
      v-if="route.page === 'root'"
      :failed-drafts="failedDrafts"
      :get-failed-draft-context="failedDraftBookTitle"
      :preview-draft="diaryPreviewDraft"
      :shelf-books="shelfBooks"
      @create="openCreationMode"
      @discard-preview="discardDiaryPreviewDraft"
      @open-book="openBook"
      @open-failed-draft="openFailedDraft"
      @open-preview="openDiaryPreviewDraft"
      @remove-failed-draft="removeFailedDraft"
    />

    <DiaryBookPage
      v-else-if="route.page === 'book' && activeBook"
      v-model:query="query"
      :book="activeBook"
      :entries="filteredEntries"
      :failed-drafts="activeBookFailedDrafts"
      :get-failed-draft-context="failedDraftBookTitle"
      :sort-desc="sortDesc"
      @batch="openBatchGenerate(activeBook.id)"
      @generate="openGenerate(activeBook.id)"
      @open-entry="openEntry(activeBook.id, $event)"
      @open-failed-draft="openFailedDraft"
      @remove-book="removeBook(activeBook.id)"
      @remove-failed-draft="removeFailedDraft"
      @rename="openRenameBook(activeBook.id)"
      @toggle-sort="sortDesc = !sortDesc"
    />

    <DiaryBookEditorPage
      v-else-if="route.page === 'rename-book' && activeBook"
      v-model:title="bookTitle"
      :perspective-name="activeBook.perspective.name"
      @cancel="phone.goBack()"
      @save="submitRenameBook"
    />

    <DiaryEntryDetailPage
      v-else-if="route.page === 'entry' && activeBook && activeEntry"
      v-model:catalog-open="showCatalogModal"
      :catalog-items="entryCatalogItems"
      :entry="activeEntry"
      :next-id="nextEntryId"
      :previous-id="previousEntryId"
      @bagu="openDiaryBaguScan"
      @bottom="scrollToBottom"
      @delete="removeEntry(activeBook.id, activeEntry.id)"
      @edit="openEditEntry(activeBook.id, activeEntry.id)"
      @favorite="diary.toggleFavorite(activeBook.id, activeEntry.id)"
      @next="openEntry(activeBook.id, nextEntryId, true)"
      @previous="openEntry(activeBook.id, previousEntryId, true)"
      @read-reaction="openReadReaction(activeBook.id, activeEntry.id)"
      @select-catalog="selectCatalogEntry"
      @top="scrollToTop"
      @update:reasoning="updateGenerationRecordReasoning(activeEntry, $event)"
    />

    <DiaryBaguPage
      v-else-if="route.page === 'bagu-scan' && activeBook && activeEntry"
      :apply-handler="applyDiaryBaguContent"
      :entry="activeEntry"
    />

    <DiaryEntryEditorPage
      v-else-if="route.page === 'editor'"
      v-model:book-title="draft.bookTitle"
      v-model:content="draft.content"
      v-model:directory-order="draft.directoryOrder"
      v-model:kind="draft.kind"
      v-model:occurred-at="draft.occurredAt"
      v-model:perspective-name="draft.perspectiveName"
      v-model:readers="draft.readers"
      v-model:title="draft.title"
      :editing-title="editingEntry?.title || ''"
      :show-book-fields="!activeBook"
      :show-order="Boolean(editingEntry)"
      @cancel="phone.goBack()"
      @save="submitEntry"
    />

    <DiaryGeneratePage
      v-else-if="route.page === 'generate'"
      v-model:extra-field="generationDraft.perspectiveName"
      v-model:from-start-end="generationDraft.fromStartEnd"
      v-model:range-text="generationDraft.rangeText"
      v-model:recent-count="generationDraft.recentCount"
      v-model:references="selectedReferences"
      v-model:single-message-id="generationDraft.singleMessageId"
      v-model:source-mode="settings.generation.sourceMode"
      v-model:user-requirement="generationDraft.userRequirement"
      :capture="captureDiaryPrompt"
      :capture-reset-key="generationPromptPreview"
      :default-preset-selection="BUILTIN_DIARY_PRESET_SELECTION"
      :error="diaryGenerationError"
      extra-field-placeholder="视角角色名"
      :extra-field-visible="!activeBook"
      :raw-output="diaryGenerationRawOutput"
      requirement-placeholder="例如：更克制、更私密一点，少写结论，多写当下情绪。"
      :running="diaryGenerationRunning"
      title="生成一篇新的日记"
      @cancel="phone.goBack()"
      @generate="runGeneration"
      @stop="stopGeneration"
    />

    <BatchGenerationPreviewPage
      v-else-if="route.page === 'batch-preview' && batchPreviewTask"
      :items="batchPreviewItems"
      kind="diary"
      :save-handler="saveBatchPreview"
      @back="returnFromBatchPreview"
    />

    <DiaryBatchPage
      v-else-if="route.page === 'batch-generate'"
      v-model:book-title="batchDraft.bookTitle"
      v-model:connection-selection="batchDraft.connectionSelection"
      v-model:floor-mode="batchDraft.floorMode"
      v-model:floor-text="batchDraft.floorText"
      v-model:group-mode="batchDraft.groupMode"
      v-model:group-size="batchDraft.groupSize"
      v-model:include-ai="batchDraft.includeAi"
      v-model:include-user="batchDraft.includeUser"
      v-model:perspective-name="batchDraft.perspectiveName"
      v-model:references="selectedReferences"
      v-model:rpm-limit="batchDraft.rpmLimit"
      v-model:tavern-preset-name="batchDraft.tavernPresetName"
      v-model:user-requirement="batchDraft.userRequirement"
      :inputs-locked="batchInputsLocked"
      :show-book-fields="!activeBook"
      :state="batchState"
      @cancel="phone.goBack()"
      @generate="runBatchGeneration"
      @reset="resetBatchProgress"
      @stop="stopBatchGeneration"
    />

    <DiaryGeneratePage
      v-else-if="route.page === 'reaction-generate' && activeBook && activeEntry"
      v-model:extra-field="reactionDraft.readerName"
      v-model:from-start-end="reactionDraft.fromStartEnd"
      v-model:range-text="reactionDraft.rangeText"
      v-model:recent-count="reactionDraft.recentCount"
      v-model:references="selectedReferences"
      v-model:single-message-id="reactionDraft.singleMessageId"
      v-model:source-mode="settings.generation.sourceMode"
      v-model:user-requirement="reactionDraft.userRequirement"
      :capture="captureReactionPrompt"
      :capture-reset-key="reactionPromptPreview"
      :error="reactionGenerationError"
      extra-field-placeholder="阅读者名字"
      extra-field-visible
      :raw-output="reactionGenerationRawOutput"
      requirement-placeholder="例如：更像读完以后压在心里的私密独白。"
      :running="reactionGenerationRunning"
      title="生成阅读反应"
      @cancel="phone.goBack()"
      @generate="runReadReactionGeneration"
      @stop="stopGeneration"
    />

    <DiaryPreviewPage
      v-else-if="route.page === 'preview' && generationState.preview"
      v-model:content="generationState.preview.content"
      v-model:raw="generationState.preview.raw"
      :action="generationState.preview.action"
      :occurred-at="generationState.preview.occurredAt || ''"
      :perspective-name="generationState.preview.perspective.name"
      :reparse-handler="reparsePreviewRaw"
      :reasoning="generationState.preview.generationRecord?.reasoning || ''"
      :title="generationState.preview.title"
      :warnings="generationState.preview.warnings"
      @back="returnToGenerate"
      @reparse="reparsePreviewRaw"
      @update:reasoning="updateGenerationRecordReasoning(generationState.preview, $event)"
      @save="savePreview"
    />

    <DiaryFailedDraftPage
      v-else-if="route.page === 'failed-draft' && activeFailedDraft"
      v-model:raw-output="failedDraftRawOutput"
      :regenerate-handler="regenerateFailedDraft"
      :reasoning="activeFailedDraft.generationRecord?.reasoning || ''"
      :source-label="activeFailedDraft.source.label"
      @delete="removeFailedDraft(activeFailedDraft.id)"
      @reparse="reparseFailedDraft"
      @update:reasoning="updateGenerationRecordReasoning(activeFailedDraft, $event)"
    />
    <CreationModeModal
      :open="creationModeOpen"
      :options="diaryCreationOptions"
      subtitle="选择后才进入具体生成页面"
      title="添加日记"
      @close="creationModeOpen = false"
      @select="selectDiaryCreationMode"
    />
  </section>
</template>

<script setup lang="ts">
import DiaryBookPage from '@/apps/diary/DiaryBookPage.vue';
import DiaryBookEditorPage from '@/apps/diary/DiaryBookEditorPage.vue';
import DiaryBaguPage from '@/apps/diary/DiaryBaguPage.vue';
import DiaryBatchPage from '@/apps/diary/DiaryBatchPage.vue';
import DiaryCatalogPage from '@/apps/diary/DiaryCatalogPage.vue';
import BatchGenerationPreviewPage from '@/components/BatchGenerationPreviewPage.vue';
import CreationModeModal, { type CreationModeOption } from '@/components/CreationModeModal.vue';
import DiaryEntryDetailPage from '@/apps/diary/DiaryEntryDetailPage.vue';
import DiaryEntryEditorPage from '@/apps/diary/DiaryEntryEditorPage.vue';
import DiaryFailedDraftPage from '@/apps/diary/DiaryFailedDraftPage.vue';
import DiaryGeneratePage from '@/apps/diary/DiaryGeneratePage.vue';
import DiaryPreviewPage from '@/apps/diary/DiaryPreviewPage.vue';
import { BUILTIN_DIARY_PRESET_SELECTION, resolveDiaryPresetSelection } from '@/apps/preset-manager/builtinDiaryPreset';
import { useCatalogDetailNavigation } from '@/composables/useCatalogDetailNavigation';
import { useDirectorySort } from '@/composables/useDirectorySort';
import { useFailedDraftRegeneration } from '@/composables/useFailedDraftRegeneration';
import { useSingleGenerationTaskSession } from '@/composables/useSingleGenerationTaskSession';
import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import { parseDiaryGeneratedResult } from '@/core/diaryGeneration';
import { buildGenerationPreview, captureGenerationPrompt, generateContent } from '@/core/generationService';
import {
  createManualBatchTask,
  getManualBatchPreviews,
  resumeGenerationTask,
  runManualBatchTask,
  saveManualBatchPreviews,
  updateManualBatchPreviews,
  type ManualBatchPreviewEdit,
  type ManualBatchTaskConfig,
} from '@/core/manualBatchRunner';
import { getCurrentChatScopeKey } from '@/store/chatScoped';
import { useDiaryStore } from '@/store/diary';
import { useGenerationTaskStore } from '@/store/generationTasks';
import { usePhoneStore } from '@/store/phone';
import { usePluginPresetStore } from '@/store/pluginPresets';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import { canOpenBaguScan } from '@/util/baguScanGate';
import { formatGenerationReferences, type GenerationReferenceItem } from '@/util/references';
import { usePreviewDraftPersistence } from '@/util/previewDrafts';
import { useInvalidRouteFallback } from '@/util/routeFallback';
import { getChatMessagesSafe } from '@/util/runtime';
import { useDetailScroll } from '@/util/detailScroll';
import { getSourceLastFloor } from '@/util/sourceFloor';
import { updateGenerationRecordReasoning } from '@/util/generationReasoning';
import {
  applyTextProviderSelection,
  getCurrentTextProviderSelection,
  type TextProviderSelection,
} from '@/util/textProvider';
import type { FailedGenerationDraft, HiddenGenerationRecord } from '@/type/generation';
import type { GenerationTask } from '@/type/generationTask';
import type { CharacterRef } from '@/type/diary';
import { storeToRefs } from 'pinia';

const diary = useDiaryStore();
const diaryGenerationAdapter = getRegisteredPhoneGenerationAdapter('diary', 'generate');
const diaryReadReactionAdapter = getRegisteredPhoneGenerationAdapter('diary', 'read-reaction');
const generationTasks = useGenerationTaskStore();
const phone = usePhoneStore();
const pluginPresets = usePluginPresetStore();
const creationModeOpen = ref(false);
const diaryCreationOptions: CreationModeOption[] = [
  { description: '生成一篇日记', icon: 'fa-solid fa-wand-magic-sparkles', id: 'single', label: '单篇生成' },
  { description: '按多个楼层范围依次生成', icon: 'fa-solid fa-layer-group', id: 'batch', label: '批量生成' },
];
const prompts = usePromptStore();
const settingsStore = useSettingsStore();
const { books, failedDrafts } = storeToRefs(diary);
const { currentRoute: route } = storeToRefs(phone);
const { specialPrompts } = storeToRefs(prompts);
const { settings } = storeToRefs(settingsStore);

const query = ref('');
const sortDesc = useDirectorySort('diaryDesc');
const bookTitle = ref('');
const entryContentEl = ref<HTMLElement | null>(null);
const { scrollToBottom, scrollToTop } = useDetailScroll(entryContentEl, '.pc-diary-detail-page .pc-detail-content');
const showCatalogModal = ref(false);
const draft = reactive({
  perspectiveName: '',
  bookTitle: '',
  title: '',
  occurredAt: '',
  kind: 'normal' as 'normal' | 'read-reaction',
  readers: '',
  content: '',
  directoryOrder: 0,
});
const generationDraft = reactive({
  bookTitle: '',
  fromStartEnd: 20,
  occurredAt: '',
  perspectiveName: '',
  rangeText: '',
  recentCount: 20,
  singleMessageId: 0,
  userRequirement: '',
});
const reactionDraft = reactive({
  fromStartEnd: 20,
  occurredAt: '',
  rangeText: '',
  recentCount: 20,
  readerName: '',
  singleMessageId: 0,
  userRequirement: '',
});
const generationState = reactive({
  preview: null as null | {
    action: 'generate' | 'read-reaction';
    bookId: string;
    bookTitle: string;
    content: string;
    draftId: string | null;
    generationRecord?: HiddenGenerationRecord;
    occurredAt: string;
    perspective: CharacterRef;
    raw: string;
    sourceBookId: string;
    sourceEntryId: string;
    sourceFloorEnd?: number;
    title: string;
    warnings: string[];
  },
});
const diaryGenerationSession = useSingleGenerationTaskSession({
  actionId: 'generate',
  appId: 'diary',
  sourcePage: 'generate',
  title: '生成日记 · 单次生成',
});
const reactionGenerationSession = useSingleGenerationTaskSession({
  actionId: 'read-reaction',
  appId: 'diary',
  sourcePage: 'reaction-generate',
  title: '生成阅读反应 · 单次生成',
});
const {
  error: diaryGenerationError,
  rawOutput: diaryGenerationRawOutput,
  running: diaryGenerationRunning,
} = diaryGenerationSession;
const {
  error: reactionGenerationError,
  rawOutput: reactionGenerationRawOutput,
  running: reactionGenerationRunning,
} = reactionGenerationSession;

type DiaryPreview = NonNullable<typeof generationState.preview>;

const {
  beginPreviewDraft: beginDiaryPreviewDraft,
  clearPreviewDraft: clearDiaryPreviewDraft,
  discardPreviewDraft: discardDiaryPreviewDraft,
  draft: diaryPreviewDraft,
  openPreviewDraft: openDiaryPreviewDraft,
  persistPreviewDraft: persistDiaryPreviewDraft,
} = usePreviewDraftPersistence<DiaryPreview>({
  appId: 'diary',
  consumeFailedDraft: draftId => diary.deleteFailedDraft(draftId),
  getPreview: () => generationState.preview,
  getRouteParams: () => {
    const preview = generationState.preview;
    if (preview?.action === 'read-reaction' && preview.sourceBookId && preview.sourceEntryId) {
      return { bookId: preview.sourceBookId, entryId: preview.sourceEntryId };
    }
    const bookId = preview?.bookId || route.value.params?.bookId || '';
    return bookId ? { bookId } : {};
  },
  page: 'preview',
  route,
  setPreview: preview => {
    generationState.preview = preview;
  },
  title: () => (generationState.preview?.action === 'read-reaction' ? '阅读反应预览' : '日记预览'),
});

const batchDraft = reactive({
  bookTitle: '',
  connectionSelection: 'tavern' as TextProviderSelection,
  floorMode: 'custom' as 'all' | 'custom',
  floorText: '',
  groupMode: false,
  groupSize: 5,
  includeAi: true,
  includeUser: true,
  perspectiveName: '',
  rpmLimit: 10,
  tavernPresetName: BUILTIN_DIARY_PRESET_SELECTION,
  userRequirement: '',
});
const batchFormError = ref('');
const failedDraftRawOutput = ref('');
const selectedReferences = ref<GenerationReferenceItem[]>([]);

const activeBook = computed(() => {
  const bookId = route.value.params?.bookId;
  return bookId ? diary.getBook(bookId) : null;
});

const activeBookFailedDrafts = computed(() => {
  const bookId = activeBook.value?.id;
  return bookId ? failedDrafts.value.filter(draft => draft.context.bookId === bookId) : [];
});

const activeEntry = computed(() => {
  const bookId = route.value.params?.bookId;
  const entryId = route.value.params?.entryId;
  return bookId && entryId ? diary.getEntry(bookId, entryId) : null;
});

const editingEntry = computed(() => (route.value.params?.entryId && activeEntry.value ? activeEntry.value : null));
const activeFailedDraft = computed(() => {
  const draftId = route.value.params?.draftId;
  return draftId ? diary.getFailedDraft(draftId) : null;
});
const generationPerspective = computed(() => {
  const fromBook = activeBook.value?.perspective;
  if (fromBook?.name) return fromBook;
  const name = generationDraft.perspectiveName.trim();
  return name ? { name } : null;
});
const generationTargetBookTitle = computed(() => activeBook.value?.title || generationDraft.bookTitle.trim());
const batchPerspective = computed(() => {
  const fromBook = activeBook.value?.perspective;
  if (fromBook?.name) return fromBook;
  const name = batchDraft.perspectiveName.trim();
  return name ? { name } : null;
});
const batchTargetBookTitle = computed(() => activeBook.value?.title || batchDraft.bookTitle.trim());
const batchTask = computed(
  () =>
    generationTasks.tasks.find(
      task =>
        task.kind === 'diary-batch' &&
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
    done: (task?.savedCount || 0) + (task?.previewCount || 0),
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
const batchPreviewTask = computed(() => {
  const taskId = route.value.params?.taskId;
  return taskId ? generationTasks.getTask(taskId) : batchTask.value;
});
const batchPreviewItems = computed(() =>
  batchPreviewTask.value ? getManualBatchPreviews(batchPreviewTask.value.id) : [],
);
const batchInputsLocked = computed(() => batchState.value.running || batchState.value.resumeAvailable);
const formattedReferences = computed(() => formatGenerationReferences(selectedReferences.value));
const generationPromptPreview = computed(() => {
  if (!generationPerspective.value) return '请先填写视角角色名';
  try {
    return buildGenerationPreview(
      diaryGenerationAdapter,
      {
        appPrompt: prompts.appPrompts.diary,
        bookId: activeBook.value?.id || '',
        bookTitle: generationTargetBookTitle.value,
        occurredAt: '',
        outputFormat: buildDiaryOutputFormat(),
        perspective: generationPerspective.value,
        userRequirement: generationDraft.userRequirement,
      },
      {
        generationDefaults: {
          resultMode: settings.value.generation.resultMode,
          stream: settings.value.generation.stream,
          tavernPresetName: resolveDiaryPresetSelection(settings.value.generation.tavernPresetName),
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
const reactionPromptPreview = computed(() => {
  if (!activeEntry.value) return '未选择日记';
  const readerName = reactionDraft.readerName.trim() || '阅读者';
  try {
    return buildGenerationPreview(
      diaryReadReactionAdapter,
      {
        appPrompt: prompts.appPrompts.diary,
        bookId: '',
        bookTitle: `${readerName}的日记`,
        occurredAt: '',
        outputFormat: buildDiaryOutputFormat('diary.reaction'),
        perspective: { name: readerName },
        sourceContent: activeEntry.value.content,
        specialPrompt: specialPrompts.value.diaryReaction,
        userRequirement: reactionDraft.userRequirement,
      },
      {
        generationDefaults: {
          resultMode: settings.value.generation.resultMode,
          stream: settings.value.generation.stream,
          tavernPresetName: settings.value.generation.tavernPresetName,
        },
        references: formattedReferences.value,
        source: {
          fromStartEnd: reactionDraft.fromStartEnd,
          mode: settings.value.generation.sourceMode,
          rangeText: reactionDraft.rangeText,
          recentCount: reactionDraft.recentCount,
          singleMessageId: reactionDraft.singleMessageId,
        },
        textProvider: settings.value.textProvider,
      },
    ).text;
  } catch (error) {
    return error instanceof Error ? error.message : '无法生成提示词预览';
  }
});

function captureDiaryPrompt() {
  if (!generationPerspective.value) return Promise.reject(new Error('请先填写视角角色名'));
  return captureGenerationPrompt(
    diaryGenerationAdapter,
    {
      appPrompt: prompts.appPrompts.diary,
      bookId: activeBook.value?.id || '',
      bookTitle: generationTargetBookTitle.value,
      occurredAt: '',
      outputFormat: buildDiaryOutputFormat(),
      perspective: generationPerspective.value,
      userRequirement: generationDraft.userRequirement,
    },
    {
      generationDefaults: {
        resultMode: settings.value.generation.resultMode,
        stream: settings.value.generation.stream,
        tavernPresetName: resolveDiaryPresetSelection(settings.value.generation.tavernPresetName),
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

function captureReactionPrompt() {
  if (!activeEntry.value) return Promise.reject(new Error('未选择日记'));
  const readerName = reactionDraft.readerName.trim() || '阅读者';
  return captureGenerationPrompt(
    diaryReadReactionAdapter,
    {
      appPrompt: prompts.appPrompts.diary,
      bookId: '',
      bookTitle: `${readerName}的日记`,
      occurredAt: '',
      outputFormat: buildDiaryOutputFormat('diary.reaction'),
      perspective: { name: readerName },
      sourceContent: activeEntry.value.content,
      specialPrompt: specialPrompts.value.diaryReaction,
      userRequirement: reactionDraft.userRequirement,
    },
    {
      generationDefaults: {
        resultMode: settings.value.generation.resultMode,
        stream: settings.value.generation.stream,
        tavernPresetName: settings.value.generation.tavernPresetName,
      },
      references: formattedReferences.value,
      source: {
        fromStartEnd: reactionDraft.fromStartEnd,
        mode: settings.value.generation.sourceMode,
        rangeText: reactionDraft.rangeText,
        recentCount: reactionDraft.recentCount,
        singleMessageId: reactionDraft.singleMessageId,
      },
      textProvider: settings.value.textProvider,
    },
  );
}
const filteredEntries = computed(() => {
  const entries = [...(activeBook.value?.entries || [])];
  const normalized = query.value.trim().toLowerCase();
  const result = normalized ? entries.filter(entry => entry.title.toLowerCase().includes(normalized)) : entries;
  result.sort((left, right) => {
    const compare =
      (left.directoryOrder ?? 0) - (right.directoryOrder ?? 0) || left.createdAt.localeCompare(right.createdAt);
    return sortDesc.value ? -compare : compare;
  });
  return result;
});
const {
  catalogItems: entryCatalogItems,
  nextId: nextEntryId,
  previousId: previousEntryId,
} = useCatalogDetailNavigation(filteredEntries, activeEntry, entry =>
  entry.kind === 'read-reaction' ? `📖 ${entry.title}` : entry.title,
);
const shelfBooks = computed(() =>
  books.value.map(book => ({
    count: book.entries.length,
    gradient: 'linear-gradient(180deg, #4c8dff 0%, #6f6bff 100%)',
    icon: 'fa-solid fa-book-open',
    id: book.id,
    subtitle: `${book.entries.length} 篇`,
    title: book.title,
  })),
);

watch(
  () => route.value,
  (current, previous) => {
    if (current.appId !== 'diary') return;
    if (current.page === 'rename-book') {
      bookTitle.value = activeBook.value?.title || '';
    }

    if (current.page === 'editor') {
      draft.perspectiveName = activeBook.value?.perspective.name || editingEntry.value?.perspective.name || '';
      draft.bookTitle = activeBook.value?.title || '';
      draft.title = editingEntry.value?.title || '';
      draft.occurredAt = editingEntry.value?.occurredAt || '';
      draft.kind = editingEntry.value?.kind || 'normal';
      draft.readers = editingEntry.value?.readers?.map(reader => reader.name).join(', ') || '';
      draft.content = editingEntry.value?.content || '';
      draft.directoryOrder = editingEntry.value?.directoryOrder ?? 0;
    }

    if (current.page === 'generate' && previous?.page !== 'preview') {
      selectedReferences.value = [];
      generationDraft.bookTitle = activeBook.value?.title || '';
      generationDraft.occurredAt = '';
      generationDraft.perspectiveName = activeBook.value?.perspective.name || '';
      generationDraft.rangeText = '';
      generationDraft.singleMessageId = 0;
      generationDraft.userRequirement = '';
      generationState.preview = null;
    }

    if (current.page === 'batch-generate') {
      const existingTask = batchTask.value;
      if (existingTask && !['completed', 'cancelled'].includes(existingTask.status)) {
        hydrateBatchDraft(existingTask.config as ManualBatchTaskConfig);
        return;
      }
      selectedReferences.value = [];
      batchDraft.bookTitle = activeBook.value?.title || '';
      batchDraft.connectionSelection = getCurrentTextProviderSelection(settings.value.textProvider);
      batchDraft.floorMode = 'custom';
      batchDraft.floorText = '';
      batchDraft.groupMode = false;
      batchDraft.groupSize = 5;
      batchDraft.includeAi = true;
      batchDraft.includeUser = true;
      batchDraft.perspectiveName = activeBook.value?.perspective.name || '';
      batchDraft.rpmLimit = settings.value.generation.rpmLimit;
      batchDraft.tavernPresetName =
        pluginPresets.getDefaultSelectionForApp('diary') ||
        resolveDiaryPresetSelection(settings.value.generation.tavernPresetName);
      batchDraft.userRequirement = '';
      batchFormError.value = '';
    }

    if (current.page === 'reaction-generate' && previous?.page !== 'preview') {
      selectedReferences.value = [];
      reactionDraft.occurredAt = activeEntry.value?.occurredAt || '';
      reactionDraft.rangeText = '';
      reactionDraft.readerName = '';
      reactionDraft.singleMessageId = 0;
      reactionDraft.userRequirement = '';
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
    entryId: route.value.params?.entryId,
    hasBook: Boolean(activeBook.value),
    hasEntry: Boolean(activeEntry.value),
    hasFailedDraft: Boolean(activeFailedDraft.value),
    hasPreview: Boolean(generationState.preview),
    page: route.value.page,
  }),
  isInvalid: current =>
    current.appId === 'diary' &&
    ((['book', 'rename-book'].includes(current.page) && !current.hasBook) ||
      (['entry', 'bagu-scan', 'reaction-generate'].includes(current.page) && (!current.hasBook || !current.hasEntry)) ||
      (current.page === 'editor' && Boolean(current.entryId) && !current.hasEntry) ||
      (current.page === 'preview' && !current.hasPreview) ||
      (current.page === 'failed-draft' && !current.hasFailedDraft)),
  fallback: () => {
    if (route.value.appId !== 'diary') return;
    if (activeBook.value) {
      phone.replacePage('book', activeBook.value.title, { bookId: activeBook.value.id });
      return;
    }
    phone.replacePage('root', '角色书架');
  },
});

function openGenerate(bookId?: string) {
  phone.pushPage('generate', '生成日记', bookId ? { bookId } : undefined);
}

function openCreationMode() {
  creationModeOpen.value = true;
}

function selectDiaryCreationMode(mode: string) {
  if (mode === 'batch') openBatchGenerate();
  else openGenerate();
}

function openBatchGenerate(bookId?: string) {
  phone.pushPage('batch-generate', '批量生成日记', bookId ? { bookId } : undefined);
}

function openBook(bookId: string) {
  const book = diary.getBook(bookId);
  if (!book) return;
  query.value = '';
  phone.pushPage('book', book.title, { bookId });
}

function openRenameBook(bookId: string) {
  const book = diary.getBook(bookId);
  if (!book) return;
  phone.pushPage('rename-book', '重命名书架', { bookId });
}

function submitRenameBook() {
  const bookId = route.value.params?.bookId;
  if (!bookId) return;
  const book = diary.renameBook(bookId, bookTitle.value);
  if (!book) return;
  phone.replacePage('book', book.title, { bookId: book.id });
}

function openEntry(bookId: string, entryId: string, replaceCurrent = false) {
  const entry = diary.getEntry(bookId, entryId);
  if (!entry) return;
  if (replaceCurrent) phone.replacePage('entry', entry.title, { bookId, entryId });
  else phone.pushPage('entry', entry.title, { bookId, entryId });
  void nextTick(() => scrollToTop('auto'));
}

function openDiaryBaguScan() {
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

function failedDraftBookTitle(draft: FailedGenerationDraft) {
  const bookId = typeof draft.context.bookId === 'string' ? draft.context.bookId : '';
  return diary.getBook(bookId)?.title || '未知书架';
}

function openEditEntry(bookId: string, entryId: string) {
  phone.pushPage('editor', '编辑日记', { bookId, entryId });
}

function openReadReaction(bookId: string, entryId: string) {
  phone.pushPage('reaction-generate', '生成阅读反应', { bookId, entryId });
}

function openFailedDraft(draftId: string) {
  const draft = diary.getFailedDraft(draftId);
  if (!draft) return;
  phone.pushPage('failed-draft', '解析失败草稿', { draftId });
}

async function removeBook(bookId: string) {
  const book = diary.getBook(bookId);
  const shouldDelete = await phone.confirmNotice(
    `要删除日记书架“${book?.title || '未命名书架'}”吗？里面的日记也会一起删除。`,
    {
      confirmLabel: '删除',
      kind: 'warning',
    },
  );
  if (!shouldDelete) return;
  diary.deleteBook(bookId);
  phone.replacePage('root', '角色书架');
  toastr.success('已删除日记书架');
}

function parseReaders(raw: string): CharacterRef[] | undefined {
  const items = raw
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(name => ({ name }));
  return items.length ? items : undefined;
}

function buildDiaryOutputFormat(outputId = 'diary.generate') {
  return prompts.resolveOutputFormat(outputId);
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
  const ranges: Array<{ start: number; end: number }> = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    if (current === end + 1) {
      end = current;
      continue;
    }
    ranges.push({ start, end });
    start = current;
    end = current;
  }
  ranges.push({ start, end });

  return ranges.map(range => (range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`)).join(', ');
}

function getBatchVisibleFloors() {
  if (!batchDraft.includeAi && !batchDraft.includeUser) {
    throw new Error('请至少选择 AI 楼层或用户楼层');
  }

  const visibleMessages = getChatMessagesSafe('0-{{lastMessageId}}', { hide_state: 'unhidden' });
  const requestedFloors =
    batchDraft.floorMode === 'all'
      ? visibleMessages.map(message => message.message_id)
      : parseBatchFloorText(batchDraft.floorText);
  const visibleById = new Map(visibleMessages.map(message => [message.message_id, message]));
  const floors = requestedFloors.filter(floor => {
    const message = visibleById.get(floor);
    if (!message) return false;
    if (message.role === 'assistant') return batchDraft.includeAi;
    if (message.role === 'user') return batchDraft.includeUser;
    return false;
  });

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
  const groupSize = Math.min(50, Math.max(1, Math.round(batchDraft.groupSize || 1)));
  if (!batchDraft.groupMode) {
    const jobs: Array<{
      fromStartEnd: number;
      label: string;
      mode: 'fromStart';
      rangeText: string;
      singleMessageId: number;
    }> = [];
    for (let index = 0; index < floors.length; index += groupSize) {
      const endFloor = floors.slice(index, index + groupSize).at(-1)!;
      jobs.push({
        fromStartEnd: endFloor,
        label: `第 0-${endFloor} 楼`,
        mode: 'fromStart',
        rangeText: '',
        singleMessageId: 0,
      });
    }
    return jobs;
  }

  const jobs: Array<{
    fromStartEnd: number;
    label: string;
    mode: 'range';
    rangeText: string;
    singleMessageId: number;
  }> = [];
  for (let index = 0; index < floors.length; index += groupSize) {
    const group = floors.slice(index, index + groupSize);
    const rangeText = formatBatchRange(group);
    jobs.push({
      fromStartEnd: 0,
      label: `第 ${rangeText} 楼`,
      mode: 'range',
      rangeText,
      singleMessageId: 0,
    });
  }
  return jobs;
}

function returnToGenerate() {
  if (generationState.preview?.draftId) {
    phone.replacePage('failed-draft', '解析失败草稿', { draftId: generationState.preview.draftId });
    return;
  }
  const preview = generationState.preview;
  if (preview?.action === 'read-reaction') {
    phone.replacePage('reaction-generate', '生成阅读反应', {
      bookId: preview.sourceBookId,
      entryId: preview.sourceEntryId,
    });
    return;
  }
  const bookId = preview?.bookId || route.value.params?.bookId;
  phone.replacePage('generate', '生成日记', bookId ? { bookId } : undefined);
}

async function runGeneration() {
  let task: GenerationTask | null = null;
  try {
    task = diaryGenerationSession.create({
      sourceParams: activeBook.value?.id ? { bookId: activeBook.value.id } : {},
      title: '生成日记 · 单次生成',
    });
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '无法建立日记生成任务');
    return;
  }
  const perspective = generationPerspective.value;
  if (!perspective) {
    diaryGenerationSession.fail(task.id, new Error('请先填写视角角色名'));
    return;
  }

  beginDiaryPreviewDraft();
  generationState.preview = null;

  try {
    const result = await generateContent(
      diaryGenerationAdapter,
      {
        appPrompt: prompts.appPrompts.diary,
        bookId: activeBook.value?.id || '',
        bookTitle: generationTargetBookTitle.value,
        occurredAt: generationDraft.occurredAt,
        outputFormat: buildDiaryOutputFormat(),
        perspective,
        userRequirement: generationDraft.userRequirement,
      },
      {
        createFailedDraft: input => diary.createFailedDraft(input),
        generationDefaults: {
          resultMode: settings.value.generation.resultMode,
          stream: settings.value.generation.stream,
          tavernPresetName: resolveDiaryPresetSelection(settings.value.generation.tavernPresetName),
        },
        references: formattedReferences.value,
        lifecycle: diaryGenerationSession.lifecycle(task.id),
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
      failedDraftRawOutput.value = result.rawOutput;
      diaryGenerationSession.complete(task.id, {
        currentLabel: '解析失败草稿已保留',
        resultPage: 'failed-draft',
        resultParams: { draftId: result.draft.id },
        resultState: 'failed-draft',
        resultTitle: '解析失败草稿',
      });
      toastr.warning('XML 解析失败，已保存到失败草稿');
      void phone.presentGeneratedPage('diary', 'failed-draft', '解析失败草稿', { draftId: result.draft.id });
      return;
    }

    if (result.status === 'saved') {
      diaryGenerationSession.complete(task.id, {
        currentLabel: `已保存日记：${result.saved.entry.title}`,
        resultPage: 'entry',
        resultParams: { bookId: result.saved.bookId, entryId: result.saved.entry.id },
        resultState: 'saved',
        resultTitle: result.saved.entry.title,
      });
      toastr.success('已生成并保存日记');
      void phone.presentGeneratedPage('diary', 'entry', result.saved.entry.title, {
        bookId: result.saved.bookId,
        entryId: result.saved.entry.id,
      });
      return;
    }

    generationState.preview = {
      action: 'generate',
      bookId: activeBook.value?.id || '',
      bookTitle: generationTargetBookTitle.value || `${perspective.name}的日记`,
      content: result.data.content,
      draftId: null,
      generationRecord: result.generationRecord,
      occurredAt: result.data.occurredAt || generationDraft.occurredAt,
      perspective,
      raw: result.rawOutput,
      sourceBookId: activeBook.value?.id || '',
      sourceEntryId: '',
      sourceFloorEnd: getSourceLastFloor(result.source),
      title: result.data.title,
      warnings: result.warnings,
    };
    const previewParams = activeBook.value?.id ? { bookId: activeBook.value.id } : {};
    persistDiaryPreviewDraft(previewParams);
    diaryGenerationSession.complete(task.id, {
      currentLabel: '日记已生成，等待确认',
      resultPage: 'preview',
      resultParams: previewParams,
      resultState: 'preview',
      resultTitle: '日记预览',
    });
    void phone.presentGeneratedPage(
      'diary',
      'preview',
      '日记预览',
      activeBook.value?.id ? { bookId: activeBook.value.id } : undefined,
    );
  } catch (error) {
    diaryGenerationSession.fail(task.id, error);
  }
}

async function runBatchGeneration() {
  const existingTask = batchTask.value;
  if (existingTask && ['paused', 'interrupted'].includes(existingTask.status)) {
    await resumeGenerationTask(existingTask.id);
    return;
  }
  if (existingTask && ['running', 'pause-requested'].includes(existingTask.status)) return;

  const perspective = batchPerspective.value;
  if (!perspective) {
    batchFormError.value = '请先填写视角角色名';
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
      appPrompt: prompts.appPrompts.diary,
      bookId: activeBook.value?.id || '',
      bookTitle: batchTargetBookTitle.value,
      floorMode: batchDraft.floorMode,
      floorText: batchDraft.floorText,
      groupMode: batchDraft.groupMode,
      groupSize: batchDraft.groupSize,
      includeAi: batchDraft.includeAi,
      includeUser: batchDraft.includeUser,
      outputFormat: buildDiaryOutputFormat(),
      perspective,
      references: formattedReferences.value,
      rpmLimit: batchDraft.rpmLimit,
      stream: settings.value.generation.stream,
      tavernPresetName: resolveDiaryPresetSelection(batchDraft.tavernPresetName),
      textProvider: applyTextProviderSelection(klona(settings.value.textProvider), batchDraft.connectionSelection),
      userRequirement: batchDraft.userRequirement,
    },
    jobs,
    kind: 'diary-batch',
    routeParams: activeBook.value?.id ? { bookId: activeBook.value.id } : {},
    title: `批量日记 · ${batchTargetBookTitle.value || perspective.name}`,
  });
  await runManualBatchTask(task.id);
}

function resetBatchProgress() {
  if (batchTask.value) generationTasks.removeTask(batchTask.value.id);
  batchFormError.value = '';
}

function hydrateBatchDraft(config: ManualBatchTaskConfig) {
  batchDraft.bookTitle = config.bookTitle || '';
  batchDraft.connectionSelection = getCurrentTextProviderSelection(config.textProvider);
  batchDraft.floorMode = config.floorMode || 'custom';
  batchDraft.floorText = config.floorText || '';
  batchDraft.groupMode = config.groupMode ?? false;
  batchDraft.groupSize = config.groupSize ?? 5;
  batchDraft.includeAi = config.includeAi ?? true;
  batchDraft.includeUser = config.includeUser ?? true;
  batchDraft.perspectiveName = config.perspective?.name || '';
  batchDraft.rpmLimit = config.rpmLimit;
  batchDraft.tavernPresetName = config.tavernPresetName;
  batchDraft.userRequirement = config.userRequirement;
}

async function runReadReactionGeneration() {
  const sourceBook = activeBook.value;
  const sourceEntry = activeEntry.value;
  if (!sourceBook || !sourceEntry) return;
  let task: GenerationTask | null = null;
  try {
    task = reactionGenerationSession.create({
      sourceParams: { bookId: sourceBook.id, entryId: sourceEntry.id },
      title: '生成阅读反应 · 单次生成',
    });
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '无法建立阅读反应任务');
    return;
  }
  const readerName = reactionDraft.readerName.trim();
  if (!readerName) {
    reactionGenerationSession.fail(task.id, new Error('请先填写阅读者名字'));
    return;
  }

  const targetPerspective: CharacterRef = { name: readerName };
  const targetBook = diary.findBookByPerspective(targetPerspective);

  beginDiaryPreviewDraft();
  generationState.preview = null;

  try {
    const result = await generateContent(
      diaryReadReactionAdapter,
      {
        appPrompt: prompts.appPrompts.diary,
        bookId: targetBook?.id || '',
        bookTitle: targetBook?.title || `${readerName}的日记`,
        occurredAt: reactionDraft.occurredAt,
        outputFormat: buildDiaryOutputFormat('diary.reaction'),
        perspective: targetPerspective,
        sourceContent: sourceEntry.content,
        specialPrompt: specialPrompts.value.diaryReaction,
        userRequirement: reactionDraft.userRequirement,
      },
      {
        createFailedDraft: input => diary.createFailedDraft(input),
        generationDefaults: {
          resultMode: settings.value.generation.resultMode,
          stream: settings.value.generation.stream,
          tavernPresetName: settings.value.generation.tavernPresetName,
        },
        references: formattedReferences.value,
        lifecycle: reactionGenerationSession.lifecycle(task.id),
        source: {
          fromStartEnd: reactionDraft.fromStartEnd,
          mode: settings.value.generation.sourceMode,
          rangeText: reactionDraft.rangeText,
          recentCount: reactionDraft.recentCount,
          singleMessageId: reactionDraft.singleMessageId,
        },
        textProvider: settings.value.textProvider,
      },
    );

    if (result.status === 'failed') {
      failedDraftRawOutput.value = result.rawOutput;
      reactionGenerationSession.complete(task.id, {
        currentLabel: '解析失败草稿已保留',
        resultPage: 'failed-draft',
        resultParams: { draftId: result.draft.id },
        resultState: 'failed-draft',
        resultTitle: '解析失败草稿',
      });
      toastr.warning('XML 解析失败，已保存到失败草稿');
      void phone.presentGeneratedPage('diary', 'failed-draft', '解析失败草稿', { draftId: result.draft.id });
      return;
    }

    if (result.status === 'saved') {
      reactionGenerationSession.complete(task.id, {
        currentLabel: `已保存阅读反应：${result.saved.entry.title}`,
        resultPage: 'entry',
        resultParams: { bookId: result.saved.bookId, entryId: result.saved.entry.id },
        resultState: 'saved',
        resultTitle: result.saved.entry.title,
      });
      toastr.success('已生成并保存阅读反应');
      void phone.presentGeneratedPage('diary', 'entry', result.saved.entry.title, {
        bookId: result.saved.bookId,
        entryId: result.saved.entry.id,
      });
      return;
    }

    generationState.preview = {
      action: 'read-reaction',
      bookId: targetBook?.id || '',
      bookTitle: targetBook?.title || `${readerName}的日记`,
      content: result.data.content,
      draftId: null,
      generationRecord: result.generationRecord,
      occurredAt: result.data.occurredAt || reactionDraft.occurredAt,
      perspective: targetPerspective,
      raw: result.rawOutput,
      sourceBookId: sourceBook.id,
      sourceEntryId: sourceEntry.id,
      sourceFloorEnd: getSourceLastFloor(result.source),
      title: result.data.title,
      warnings: result.warnings,
    };
    persistDiaryPreviewDraft({ bookId: sourceBook.id, entryId: sourceEntry.id });
    reactionGenerationSession.complete(task.id, {
      currentLabel: '阅读反应已生成，等待确认',
      resultPage: 'preview',
      resultParams: { bookId: sourceBook.id, entryId: sourceEntry.id },
      resultState: 'preview',
      resultTitle: '阅读反应预览',
    });
    void phone.presentGeneratedPage('diary', 'preview', '阅读反应预览', {
      bookId: sourceBook.id,
      entryId: sourceEntry.id,
    });
  } catch (error) {
    reactionGenerationSession.fail(task.id, error);
  }
}

function savePreview() {
  const preview = generationState.preview;
  if (!preview) return;

  const created = diary.createEntry({
    bookId: preview.action === 'generate' ? preview.bookId || undefined : preview.bookId || undefined,
    bookTitle: preview.bookTitle || undefined,
    content: preview.content,
    kind: preview.action === 'read-reaction' ? 'read-reaction' : 'normal',
    occurredAt: preview.occurredAt,
    perspective: preview.perspective,
    readers: preview.action === 'read-reaction' ? [preview.perspective] : undefined,
    title: preview.title,
    directoryOrder: preview.sourceFloorEnd,
    generationRecord: preview.generationRecord,
    sourceFloorEnd: preview.sourceFloorEnd,
  });
  if (!created) {
    toastr.warning('目标日记书架不存在，无法保存生成结果');
    return;
  }
  if (preview.draftId) {
    diary.deleteFailedDraft(preview.draftId);
  }
  clearDiaryPreviewDraft();
  generationState.preview = null;
  toastr.success('已保存生成结果');
  phone.replacePage('entry', created.entry.title, { bookId: created.book.id, entryId: created.entry.id });
}

function reparsePreviewRaw() {
  const preview = generationState.preview;
  if (!preview) return false;
  const rawOutput = preview.raw;
  if (!rawOutput.trim()) {
    toastr.warning('先补一点可解析的 XML 内容');
    return false;
  }

  const parsed = parseDiaryGeneratedResult(rawOutput);
  if (!parsed.ok) {
    preview.raw = rawOutput;
    preview.warnings = parsed.warnings;
    toastr.warning(parsed.warnings.join('；') || '还是没能解析成功');
    return false;
  }

  preview.content = parsed.data.content;
  preview.occurredAt = parsed.data.occurredAt;
  preview.raw = rawOutput;
  preview.title = parsed.data.title;
  preview.warnings = parsed.warnings;
  toastr.success('已按原始输出重新解析');
  return true;
}

function stopGeneration() {
  if (route.value.page === 'reaction-generate') reactionGenerationSession.stop();
  else diaryGenerationSession.stop();
}

function stopBatchGeneration() {
  if (batchTask.value) generationTasks.stopNow(batchTask.value.id);
}

function returnFromBatchPreview() {
  const bookId = batchPreviewTask.value?.routeParams.bookId || '';
  const book = bookId ? diary.getBook(bookId) : null;
  phone.replacePage(book ? 'book' : 'root', book?.title || '角色书架', book ? { bookId } : undefined);
}

async function saveBatchPreview(edits: ManualBatchPreviewEdit[]) {
  const task = batchPreviewTask.value;
  if (!task) return;
  updateManualBatchPreviews(task.id, edits);
  try {
    const result = await saveManualBatchPreviews(task.id);
    if (!result) return;
    const book = result.bookId ? diary.getBook(result.bookId) : null;
    toastr.success(`已保存 ${result.savedCount} 篇日记`);
    phone.replacePage(book ? 'book' : 'root', book?.title || '角色书架', book ? { bookId: book.id } : undefined);
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '批量保存失败');
  }
}

async function removeFailedDraft(draftId: string) {
  const shouldDelete = await phone.confirmNotice('要删除这条解析失败草稿吗？原始输出也会一并移除。', {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!shouldDelete) return;
  diary.deleteFailedDraft(draftId);
  failedDraftRawOutput.value = '';
  if (route.value.page === 'failed-draft') {
    phone.replacePage('root', '角色书架');
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

  const parsed = parseDiaryGeneratedResult(rawOutput);
  if (!parsed.ok) {
    diary.updateFailedDraft(draft.id, {
      rawOutput,
      warnings: parsed.warnings,
    });
    failedDraftRawOutput.value = rawOutput;
    toastr.warning(parsed.warnings.join('；') || '还是没能解析成功');
    return;
  }

  const bookId = typeof draft.context.bookId === 'string' ? draft.context.bookId : '';
  const bookTitle = typeof draft.context.bookTitle === 'string' ? draft.context.bookTitle : '';
  const occurredAt = typeof draft.context.occurredAt === 'string' ? draft.context.occurredAt : '';
  const perspective =
    typeof draft.context.perspective === 'object' &&
    draft.context.perspective &&
    typeof (draft.context.perspective as CharacterRef).name === 'string'
      ? (draft.context.perspective as CharacterRef)
      : null;
  const isReaction = draft.actionId === 'read-reaction';
  if (!isReaction && bookId && !diary.getBook(bookId)) {
    toastr.warning('原日记书架已经不存在，暂时不能恢复这条日记');
    return;
  }
  if (!isReaction && !bookId && !perspective) {
    toastr.warning('这条日记草稿缺少目标视角信息，暂时不能恢复');
    return;
  }
  if (isReaction && !perspective) {
    toastr.warning('这条阅读反应草稿缺少目标视角信息，暂时不能恢复');
    return;
  }

  diary.updateFailedDraft(draft.id, {
    rawOutput,
    warnings: parsed.warnings,
  });
  generationState.preview = {
    action: isReaction ? 'read-reaction' : 'generate',
    bookId,
    bookTitle,
    content: parsed.data.content,
    draftId: null,
    generationRecord: draft.generationRecord,
    occurredAt: parsed.data.occurredAt || occurredAt,
    perspective: perspective || diary.getBook(bookId)?.perspective || { name: '当前视角' },
    raw: rawOutput,
    sourceBookId: typeof draft.context.sourceBookId === 'string' ? draft.context.sourceBookId : bookId,
    sourceEntryId: typeof draft.context.sourceEntryId === 'string' ? draft.context.sourceEntryId : '',
    sourceFloorEnd: getSourceLastFloor(draft.source),
    title: parsed.data.title,
    warnings: parsed.warnings,
  };
  const previewRouteParams: Record<string, string> = {
    bookId: typeof draft.context.sourceBookId === 'string' ? draft.context.sourceBookId : bookId,
  };
  if (typeof draft.context.sourceEntryId === 'string') previewRouteParams.entryId = draft.context.sourceEntryId;
  persistDiaryPreviewDraft(previewRouteParams);
  diary.deleteFailedDraft(draft.id);
  failedDraftRawOutput.value = '';
  phone.replacePage('preview', isReaction ? '阅读反应预览' : '日记预览', {
    bookId: typeof draft.context.sourceBookId === 'string' ? draft.context.sourceBookId : bookId,
    entryId: typeof draft.context.sourceEntryId === 'string' ? draft.context.sourceEntryId : undefined,
  });
}

function submitEntry() {
  const readers = draft.kind === 'read-reaction' ? parseReaders(draft.readers) : undefined;

  if (editingEntry.value && route.value.params?.bookId && route.value.params?.entryId) {
    const entry = diary.updateEntry(route.value.params.bookId, route.value.params.entryId, {
      title: draft.title,
      content: draft.content,
      occurredAt: draft.occurredAt,
      kind: draft.kind,
      readers,
      directoryOrder: draft.directoryOrder,
    });
    if (!entry) return;
    phone.replacePage('entry', entry.title, { bookId: route.value.params.bookId, entryId: entry.id });
    return;
  }

  if (!draft.perspectiveName.trim() && !activeBook.value) return;
  const result = diary.createEntry({
    bookId: route.value.params?.bookId,
    bookTitle: draft.bookTitle,
    perspective: activeBook.value?.perspective || { name: draft.perspectiveName.trim() },
    title: draft.title,
    content: draft.content,
    occurredAt: draft.occurredAt,
    kind: draft.kind,
    readers,
  });
  if (!result) return;
  phone.replacePage('entry', result.entry.title, { bookId: result.book.id, entryId: result.entry.id });
}

function applyDiaryBaguContent(content: string) {
  if (!activeBook.value || !activeEntry.value) return false;
  const entry = diary.updateEntry(activeBook.value.id, activeEntry.value.id, {
    content,
    kind: activeEntry.value.kind,
    occurredAt: activeEntry.value.occurredAt || '',
    readers: activeEntry.value.readers,
    title: activeEntry.value.title,
  });
  return Boolean(entry);
}

async function removeEntry(bookId: string, entryId: string) {
  const entry = diary.getEntry(bookId, entryId);
  const shouldDelete = await phone.confirmNotice(`要删除日记“${entry?.title || '未命名日记'}”吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!shouldDelete) return;
  diary.deleteEntry(bookId, entryId);
  const book = diary.getBook(bookId);
  if (!book) {
    phone.goHome();
    toastr.success('已删除日记');
    return;
  }
  phone.replacePage('book', book.title, { bookId });
  toastr.success('已删除日记');
}
const regenerateFailedDraft = useFailedDraftRegeneration({
  draft: () => activeFailedDraft.value,
  rawOutput: failedDraftRawOutput,
  reparse: reparseFailedDraft,
});
</script>

<style scoped>
.pc-diary-app {
  height: 100%;
  min-height: 0;
}
</style>
