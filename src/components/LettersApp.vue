<template>
  <section class="pc-letters-app">
    <LettersCatalogPage
      v-if="route.page === 'root'"
      :failed-drafts="failedDrafts"
      :get-failed-draft-context="failedDraftContextTitle"
      :preview-draft="lettersPreviewDraft"
      :shelf-books="shelfBooks"
      @create="openGenerate()"
      @discard-preview="discardLettersPreviewDraft"
      @open-book="openBook"
      @open-failed-draft="openFailedDraft"
      @open-preview="openLettersPreviewDraft"
      @remove-failed-draft="removeFailedDraft"
    />

    <LettersBookPage
      v-else-if="route.page === 'book' && activeBook"
      v-model:query="query"
      :book="activeBook"
      :entries="filteredEntries"
      :format-direction="formatDirection"
      :format-label="formatLabel"
      :sort-desc="sortDesc"
      @generate="openGenerate(activeBook.id)"
      @open-entry="openEntry(activeBook.id, $event)"
      @toggle-sort="sortDesc = !sortDesc"
    />

    <LettersBookEditorPage
      v-else-if="route.page === 'rename-book' && activeBook"
      v-model:title="bookTitle"
      :participants-label="formatParticipants(activeBook.participants)"
      @cancel="phone.goBack()"
      @save="submitRenameBook"
    />

    <LettersEntryDetailPage
      v-else-if="route.page === 'entry' && activeBook && activeEntry"
      v-model:catalog-open="showCatalogModal"
      :catalog-items="entryCatalogItems"
      :entry="viewedLetterEntry"
      :next-id="nextEntryId"
      :previous-id="previousEntryId"
      :versions="activeEntry.versions"
      :viewed-version-id="viewedLetterVersionId"
      @bagu="openLettersBaguScan"
      @bottom="scrollToBottom"
      @delete="removeEntry(activeBook.id, activeEntry.id)"
      @edit="openEditEntry(activeBook.id, activeEntry.id, viewedLetterVersionId)"
      @erase="overwriteLetterContent"
      @favorite="letters.toggleFavorite(activeBook.id, activeEntry.id)"
      @next="openEntry(activeBook.id, nextEntryId, true)"
      @previous="openEntry(activeBook.id, previousEntryId, true)"
      @reply="openReply(activeBook.id, activeEntry.id)"
      @rewrite="openRewriteLetter(activeBook.id, activeEntry.id)"
      @select-version="selectLetterVersion"
      @select-catalog="selectCatalogEntry"
      @top="scrollToTop"
    />

    <LettersBaguPage
      v-else-if="route.page === 'bagu-scan' && activeBook && activeEntry"
      :apply-handler="applyLettersBaguContent"
      :entry="viewedLetterEntry"
    />

    <LettersEntryEditorPage
      v-else-if="route.page === 'editor'"
      v-model:book-title="draft.bookTitle"
      v-model:content="draft.content"
      v-model:format="draft.format"
      v-model:format-prompt="draft.formatPrompt"
      v-model:receiver-name="draft.receiverName"
      v-model:sender-name="draft.senderName"
      v-model:title="draft.title"
      :book-title-label="activeBook?.title || ''"
      :direction-label="editingEntry ? formatDirection(editingEntry.sender.name, editingEntry.receiver.name) : ''"
      :editing-title="editingEntry?.title || ''"
      :format-label="editingEntry ? formatLabel(editingEntry.format) : ''"
      :format-options="formatOptions"
      :show-book-field="!activeBook"
      @cancel="phone.goBack()"
      @save="submitEntry"
    />

    <LettersGeneratePage
      v-else-if="route.page === 'generate'"
      v-model:book-title="generationDraft.bookTitle"
      v-model:format="generationDraft.format"
      v-model:format-prompt="generationDraft.formatPrompt"
      v-model:from-start-end="generationDraft.fromStartEnd"
      v-model:range-text="generationDraft.rangeText"
      v-model:receiver-name="generationDraft.receiverName"
      v-model:recent-count="generationDraft.recentCount"
      v-model:recent-entry-count="generationDraft.recentEntryCount"
      v-model:include-recent-entries="generationDraft.includeRecentEntries"
      v-model:references="selectedReferences"
      v-model:sender-name="generationDraft.senderName"
      v-model:single-message-id="generationDraft.singleMessageId"
      v-model:source-mode="settings.generation.sourceMode"
      v-model:user-requirement="generationDraft.userRequirement"
      :capture="captureLetterPrompt"
      :capture-reset-key="letterPromptPreview"
      :error="generationError"
      :format-options="formatOptions"
      :raw-output="generationRawOutput"
      :running="generationRunning"
      :show-recent-entries="Boolean(activeBook)"
      :show-book-field="!activeBook"
      :title="
        route.params?.rewriteEntryId
          ? '重新生成当前信件'
          : route.params?.replyToEntryId
            ? '生成回信'
            : '生成一封新的信件'
      "
      @cancel="phone.goBack()"
      @generate="runGeneration"
      @stop="stopGeneration"
    />

    <LettersPreviewPage
      v-else-if="route.page === 'preview' && generationState.preview"
      v-model:content="generationState.preview.content"
      v-model:raw="generationState.preview.raw"
      :book-title="generationState.preview.bookTitle"
      :meta-label="`${formatDirection(generationState.preview.sender.name, generationState.preview.receiver.name)} · ${formatLabel(generationState.preview.format)}`"
      :mode="generationState.preview.mode"
      :reparse-handler="reparsePreviewRaw"
      :reasoning="generationState.preview.generationRecord?.reasoning || ''"
      :title="generationState.preview.title"
      :warnings="generationState.preview.warnings"
      @update:reasoning="updateGenerationRecordReasoning(generationState.preview, $event)"
      @back="returnToGenerate"
      @reparse="reparsePreviewRaw"
      @save="savePreview"
    />

    <LettersFailedDraftPage
      v-else-if="route.page === 'failed-draft' && activeFailedDraft"
      v-model:raw-output="failedDraftRawOutput"
      :source-label="activeFailedDraft.source.label"
      @delete="removeFailedDraft(activeFailedDraft.id)"
      @reparse="reparseFailedDraft"
    />
  </section>
</template>

<script setup lang="ts">
import LettersBookPage from '@/components/letters/LettersBookPage.vue';
import LettersBookEditorPage from '@/components/letters/LettersBookEditorPage.vue';
import LettersBaguPage from '@/components/letters/LettersBaguPage.vue';
import LettersCatalogPage from '@/components/letters/LettersCatalogPage.vue';
import LettersEntryEditorPage from '@/components/letters/LettersEntryEditorPage.vue';
import LettersFailedDraftPage from '@/components/letters/LettersFailedDraftPage.vue';
import LettersGeneratePage from '@/components/letters/LettersGeneratePage.vue';
import LettersPreviewPage from '@/components/letters/LettersPreviewPage.vue';
import LettersEntryDetailPage from '@/components/letters/LettersEntryDetailPage.vue';
import { useCatalogDetailNavigation } from '@/composables/useCatalogDetailNavigation';
import { useDirectorySort } from '@/composables/useDirectorySort';
import { useGenerationReplaySession } from '@/composables/useGenerationReplaySession';
import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import { useSingleGenerationTaskSession } from '@/composables/useSingleGenerationTaskSession';
import { buildGenerationPreview, captureGenerationPrompt, generateContent } from '@/core/generationService';
import { useLettersStore } from '@/store/letters';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import type { CharacterRef } from '@/type/diary';
import type { FailedGenerationDraft, GenerationReplaySnapshot, HiddenGenerationRecord } from '@/type/generation';
import type { LetterFormat } from '@/type/letter';
import type { GenerationTask } from '@/type/generationTask';
import { canOpenBaguScan } from '@/util/baguScanGate';
import { useDetailScroll } from '@/util/detailScroll';
import { parseSimpleXmlResult } from '@/util/generation';
import { resolveGenerationReplayReferences } from '@/util/generationReplay';
import { createHiddenGenerationRecord, resolveHiddenGenerationReplay } from '@/util/hiddenGenerationRecord';
import { usePreviewDraftPersistence } from '@/util/previewDrafts';
import { formatGenerationReferences, type GenerationReferenceItem } from '@/util/references';
import { resolveContentVersion } from '@/util/contentVersions';
import { useInvalidRouteFallback } from '@/util/routeFallback';
import { updateGenerationRecordReasoning } from '@/util/generationReasoning';
import { storeToRefs } from 'pinia';

const letters = useLettersStore();
const phone = usePhoneStore();
const prompts = usePromptStore();
const settingsStore = useSettingsStore();
const lettersGenerationAdapter = getRegisteredPhoneGenerationAdapter('letters', 'generate');
const { books, failedDrafts } = storeToRefs(letters);
const { currentRoute: route } = storeToRefs(phone);
const { settings } = storeToRefs(settingsStore);
const generationSourceMode = computed({
  get: () => settings.value.generation.sourceMode,
  set: value => {
    settings.value.generation.sourceMode = value;
  },
});
const replaySession = useGenerationReplaySession({
  appId: 'letters',
  defaultPresetName: () => settings.value.generation.tavernPresetName,
  page: 'generate',
  sourceMode: generationSourceMode,
});

const query = ref('');
const sortDesc = useDirectorySort('lettersDesc');
const bookTitle = ref('');
const entryContentEl = ref<HTMLElement | null>(null);
const { scrollToBottom, scrollToTop } = useDetailScroll(entryContentEl, '.pc-letters-detail-page .pc-detail-content');
const showCatalogModal = ref(false);
const draft = reactive({
  bookTitle: '',
  content: '',
  format: 'formal' as LetterFormat,
  formatPrompt: '',
  receiverName: '',
  senderName: '',
  title: '',
});
const generationDraft = reactive({
  bookTitle: '',
  format: 'formal' as LetterFormat,
  formatPrompt: '',
  fromStartEnd: 20,
  rangeText: '',
  receiverName: '',
  recentCount: 20,
  recentEntryCount: 6,
  includeRecentEntries: false,
  senderName: '',
  singleMessageId: 0,
  userRequirement: '',
});
const generationState = reactive({
  preview: null as null | {
    bookId: string;
    bookTitle: string;
    content: string;
    draftId: string | null;
    format: LetterFormat;
    formatPrompt: string;
    generationRecord?: HiddenGenerationRecord;
    mode: 'create' | 'rewrite';
    raw: string;
    replay?: GenerationReplaySnapshot;
    receiver: CharacterRef;
    sender: CharacterRef;
    title: string;
    targetEntryId: string;
    targetVersionId: string;
    warnings: string[];
  },
});
const generationSession = useSingleGenerationTaskSession({
  actionId: 'generate',
  appId: 'letters',
  sourcePage: 'generate',
  title: '生成书信 · 单次生成',
});
const { error: generationError, rawOutput: generationRawOutput, running: generationRunning } = generationSession;
const failedDraftRawOutput = ref('');
const selectedReferences = ref<GenerationReferenceItem[]>([]);
type LettersPreview = NonNullable<typeof generationState.preview>;

const {
  beginPreviewDraft: beginLettersPreviewDraft,
  clearPreviewDraft: clearLettersPreviewDraft,
  discardPreviewDraft: discardLettersPreviewDraft,
  draft: lettersPreviewDraft,
  openPreviewDraft: openLettersPreviewDraft,
  persistPreviewDraft: persistLettersPreviewDraft,
} = usePreviewDraftPersistence<LettersPreview>({
  appId: 'letters',
  consumeFailedDraft: draftId => letters.deleteFailedDraft(draftId),
  getPreview: () => generationState.preview,
  getRouteParams: () => {
    const params: Record<string, string> = {};
    if (generationState.preview?.bookId) params.bookId = generationState.preview.bookId;
    if (route.value.params?.replyToEntryId) params.replyToEntryId = route.value.params.replyToEntryId;
    if (generationState.preview?.targetEntryId) params.rewriteEntryId = generationState.preview.targetEntryId;
    return params;
  },
  page: 'preview',
  route,
  setPreview: preview => {
    generationState.preview = preview;
  },
  title: '生成预览',
});

const formatOptions = [
  { label: '正式信', value: 'formal' },
  { label: '便签', value: 'note' },
  { label: '短信', value: 'sms' },
  { label: '邮件', value: 'email' },
];
const generationFormatDescription = computed(() => {
  const name = formatLabel(generationDraft.format);
  const prompt = generationDraft.formatPrompt.trim();
  return prompt ? `${name}\n类型要求：${prompt}` : name;
});

const activeBook = computed(() => {
  const bookId = route.value.params?.bookId;
  return bookId ? letters.getBook(bookId) : null;
});
const shelfBooks = computed(() =>
  books.value.map(book => ({
    count: book.entries.length,
    gradient: 'linear-gradient(180deg, #14b8a6 0%, #0f766e 100%)',
    icon: 'fa-solid fa-envelope-open-text',
    id: book.id,
    subtitle: `${book.entries.length} 封`,
    title: book.title,
  })),
);

const activeEntry = computed(() => {
  const bookId = route.value.params?.bookId;
  const entryId = route.value.params?.entryId;
  return bookId && entryId ? letters.getEntry(bookId, entryId) : null;
});
const viewedLetterVersion = computed(() => {
  const entry = activeEntry.value;
  if (!entry) return null;
  return resolveContentVersion(entry.versions, entry.activeVersionId, route.value.params?.versionId);
});
const viewedLetterVersionId = computed(() => viewedLetterVersion.value?.id || activeEntry.value?.activeVersionId || '');
const viewedLetterEntry = computed(() => {
  const entry = activeEntry.value;
  const version = viewedLetterVersion.value;
  return entry && version
    ? {
        ...entry,
        content: version.content,
        format: version.format,
        generationRecord: version.generationRecord,
        generationReplay: version.generationReplay,
        title: version.title,
      }
    : entry;
});
const rewriteLetterEntry = computed(() => {
  const bookId = route.value.params?.bookId;
  const entryId = route.value.params?.rewriteEntryId;
  return bookId && entryId ? letters.getEntry(bookId, entryId) : null;
});
const rewriteLetterVersion = computed(() => {
  const entry = rewriteLetterEntry.value;
  if (!entry) return null;
  return resolveContentVersion(entry.versions, entry.activeVersionId, route.value.params?.versionId);
});
const letterGenerationMode = computed<'create' | 'rewrite'>(() => (rewriteLetterEntry.value ? 'rewrite' : 'create'));
const letterGenerationAppPrompt = computed(() => prompts.appPrompts.letters);
const rewriteLetterReplay = computed(() =>
  rewriteLetterEntry.value?.versions.length
    ? rewriteLetterVersion.value
      ? resolveHiddenGenerationReplay(rewriteLetterVersion.value)
      : undefined
    : rewriteLetterEntry.value
      ? resolveHiddenGenerationReplay(rewriteLetterEntry.value)
      : undefined,
);

const editingEntry = computed(() => (route.value.params?.entryId && activeEntry.value ? activeEntry.value : null));
const activeFailedDraft = computed(() => {
  const draftId = route.value.params?.draftId;
  return draftId ? letters.getFailedDraft(draftId) : null;
});
const formattedReferences = computed(() => formatGenerationReferences(selectedReferences.value));

const filteredEntries = computed(() => {
  const normalized = query.value.trim().toLowerCase();
  const source = activeBook.value?.entries || [];
  const matched = normalized
    ? source.filter(
        entry =>
          entry.title.toLowerCase().includes(normalized) ||
          entry.sender.name.toLowerCase().includes(normalized) ||
          entry.receiver.name.toLowerCase().includes(normalized),
      )
    : source;

  return [...matched].sort((left, right) => {
    const compare = left.createdAt.localeCompare(right.createdAt);
    return sortDesc.value ? -compare : compare;
  });
});
const {
  catalogItems: entryCatalogItems,
  nextId: nextEntryId,
  previousId: previousEntryId,
} = useCatalogDetailNavigation(
  filteredEntries,
  activeEntry,
  entry => entry.title,
  entry => Math.max(1, entry.versions.length),
);

const letterPromptPreview = computed(() => {
  try {
    const { receiver, sender } = normalizeDraftPair(
      generationDraft.senderName.trim() || activeBook.value?.participants[0]?.name || '发信人',
      generationDraft.receiverName.trim() || activeBook.value?.participants[1]?.name || '收信人',
    );
    return buildGenerationPreview(
      lettersGenerationAdapter,
      {
        appPrompt: letterGenerationAppPrompt.value,
        bookId: activeBook.value?.id || '',
        bookTitle: generationDraft.bookTitle || activeBook.value?.title || '',
        format: generationFormatDescription.value,
        entryId: rewriteLetterEntry.value?.id || '',
        existingContent: '',
        mode: letterGenerationMode.value,
        outputFormat: buildOutputFormat(),
        recentLettersContext: buildSelectedRecentLettersContext(),
        receiver,
        sender,
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

function captureLetterPrompt() {
  const { receiver, sender } = normalizeDraftPair(
    generationDraft.senderName.trim() || activeBook.value?.participants[0]?.name || '发信人',
    generationDraft.receiverName.trim() || activeBook.value?.participants[1]?.name || '收信人',
  );
  return captureGenerationPrompt(
    lettersGenerationAdapter,
    {
      appPrompt: letterGenerationAppPrompt.value,
      bookId: activeBook.value?.id || '',
      bookTitle: generationDraft.bookTitle || activeBook.value?.title || '',
      format: generationFormatDescription.value,
      entryId: rewriteLetterEntry.value?.id || '',
      existingContent: '',
      mode: letterGenerationMode.value,
      outputFormat: buildOutputFormat(),
      recentLettersContext: buildSelectedRecentLettersContext(),
      receiver,
      sender,
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
    if (current.appId !== 'letters') {
      replaySession.release();
      return;
    }
    if (current.page !== 'generate' && current.page !== 'preview') replaySession.release();
    if (current.page === 'rename-book') {
      bookTitle.value = activeBook.value?.title || '';
    }

    if (current.page === 'editor') {
      if (editingEntry.value) {
        draft.content = viewedLetterEntry.value?.content || editingEntry.value.content;
        draft.format = viewedLetterEntry.value?.format || editingEntry.value.format;
        draft.formatPrompt = viewedLetterEntry.value?.formatPrompt || editingEntry.value.formatPrompt;
        draft.receiverName = editingEntry.value.receiver.name;
        draft.senderName = editingEntry.value.sender.name;
        draft.title = viewedLetterEntry.value?.title || editingEntry.value.title;
        draft.bookTitle = activeBook.value?.title || '';
      } else if (activeBook.value?.participants.length === 2) {
        draft.content = '';
        draft.format = 'formal';
        draft.formatPrompt = '';
        draft.receiverName = activeBook.value.participants[1]?.name || '';
        draft.senderName = activeBook.value.participants[0]?.name || '';
        draft.title = '';
        draft.bookTitle = activeBook.value.title;
      } else {
        draft.bookTitle = '';
        draft.content = '';
        draft.format = 'formal';
        draft.formatPrompt = '';
        draft.receiverName = '';
        draft.senderName = '';
        draft.title = '';
      }
    }

    if (current.page === 'generate' && previous?.page !== 'preview') {
      replaySession.release();
      const replyEntry =
        current.params?.replyToEntryId && current.params?.bookId
          ? letters.getEntry(current.params.bookId, current.params.replyToEntryId)
          : null;
      const rewriteEntry =
        current.params?.rewriteEntryId && current.params?.bookId
          ? letters.getEntry(current.params.bookId, current.params.rewriteEntryId)
          : null;
      selectedReferences.value = [];
      generationDraft.bookTitle = activeBook.value?.title || '';
      generationDraft.format = rewriteEntry?.format || replyEntry?.format || 'formal';
      generationDraft.formatPrompt = rewriteEntry?.formatPrompt || replyEntry?.formatPrompt || '';
      generationDraft.includeRecentEntries = false;
      generationDraft.rangeText = '';
      generationDraft.recentEntryCount = 6;
      generationDraft.receiverName =
        rewriteEntry?.receiver.name || replyEntry?.sender.name || activeBook.value?.participants[1]?.name || '';
      generationDraft.senderName =
        rewriteEntry?.sender.name || replyEntry?.receiver.name || activeBook.value?.participants[0]?.name || '';
      generationDraft.singleMessageId = 0;
      generationDraft.userRequirement = '';
      generationState.preview = null;

      const replay = rewriteLetterReplay.value;
      if (replay) {
        selectedReferences.value = resolveGenerationReplayReferences(replay);
        replaySession.applyReplay(replay, generationDraft);
        if (typeof replay.config.bookTitle === 'string') {
          generationDraft.bookTitle = replay.config.bookTitle;
        }
        const replayFormat = replay.config.format;
        if (
          replayFormat === 'formal' ||
          replayFormat === 'note' ||
          replayFormat === 'sms' ||
          replayFormat === 'email'
        ) {
          generationDraft.format = replayFormat;
        }
        if (typeof replay.config.recentEntryCount === 'number') {
          generationDraft.recentEntryCount = replay.config.recentEntryCount;
        }
        const replaySender = replay.config.sender;
        const replayReceiver = replay.config.receiver;
        if (replaySender && typeof replaySender === 'object' && 'name' in replaySender) {
          generationDraft.senderName = String(replaySender.name || '');
        }
        if (replayReceiver && typeof replayReceiver === 'object' && 'name' in replayReceiver) {
          generationDraft.receiverName = String(replayReceiver.name || '');
        }
      }
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
    current.appId === 'letters' &&
    ((['book', 'rename-book'].includes(current.page) && !current.hasBook) ||
      (['entry', 'bagu-scan'].includes(current.page) && (!current.hasBook || !current.hasEntry)) ||
      (current.page === 'editor' && Boolean(current.entryId) && !current.hasEntry) ||
      (current.page === 'preview' && !current.hasPreview) ||
      (current.page === 'failed-draft' && !current.hasFailedDraft)),
  fallback: () => {
    if (route.value.appId !== 'letters') return;
    if (activeBook.value) {
      phone.replacePage('book', activeBook.value.title, { bookId: activeBook.value.id });
      return;
    }
    phone.replacePage('root', '往返信箱');
  },
});

function buildCharacter(name: string) {
  const normalized = name.trim();
  if (!normalized) return null;
  return { name: normalized } satisfies CharacterRef;
}

function normalizeDraftPair(senderName: string, receiverName: string) {
  const sender = buildCharacter(senderName);
  const receiver = buildCharacter(receiverName);
  if (!sender || !receiver) {
    throw new Error('请先填写发信人和收信人');
  }
  if (sender.name === receiver.name) {
    throw new Error('发信人和收信人不能是同一个人');
  }
  return { receiver, sender };
}

function matchesActiveBook(sender: CharacterRef, receiver: CharacterRef) {
  if (!activeBook.value) return true;
  const current = [...activeBook.value.participants]
    .map(item => item.name)
    .sort()
    .join('::');
  const next = [sender.name, receiver.name].sort().join('::');
  return current === next;
}

function openGenerate(bookId?: string, replyToEntryId?: string) {
  phone.pushPage('generate', replyToEntryId ? '生成回信' : '生成信件', {
    ...(bookId ? { bookId } : {}),
    ...(replyToEntryId ? { replyToEntryId } : {}),
  });
}

function openReply(bookId: string, entryId: string) {
  openGenerate(bookId, entryId);
}

function openRewriteLetter(bookId: string, entryId: string) {
  phone.pushPage('generate', '重新生成书信', {
    bookId,
    rewriteEntryId: entryId,
    ...(viewedLetterVersionId.value ? { versionId: viewedLetterVersionId.value } : {}),
  });
}

function selectLetterVersion(versionId: string) {
  if (!activeBook.value || !activeEntry.value) return;
  const entry = letters.activateEntryVersion(activeBook.value.id, activeEntry.value.id, versionId);
  if (!entry) return;
  phone.replacePage('entry', entry.title, {
    bookId: activeBook.value.id,
    entryId: entry.id,
    versionId,
  });
}

async function removeLetterVersion(versionId: string) {
  if (!activeBook.value || !activeEntry.value || activeEntry.value.versions.length <= 1) return;
  const versionIndex = activeEntry.value.versions.findIndex(version => version.id === versionId);
  if (versionIndex < 0) return;
  const shouldDelete = await phone.confirmNotice(
    `要删除当前查看的书信版本 ${versionIndex + 1}/${activeEntry.value.versions.length} 吗？只会删除这个版本。`,
    { confirmLabel: '删除此版本', kind: 'warning' },
  );
  if (!shouldDelete || !activeBook.value || !activeEntry.value) return;
  const versions = [...activeEntry.value.versions];
  const previousVersion = versions[(versionIndex - 1 + versions.length) % versions.length];
  const result = letters.deleteEntryVersion(activeBook.value.id, activeEntry.value.id, versionId);
  if (!result) return;
  const entry = previousVersion
    ? letters.activateEntryVersion(activeBook.value.id, result.entry.id, previousVersion.id)
    : result.entry;
  phone.replacePage('entry', entry?.title || result.activeVersion.title, {
    bookId: activeBook.value.id,
    entryId: result.entry.id,
    versionId: previousVersion?.id || result.activeVersion.id,
  });
  toastr.success('已删除当前书信版本');
}

function openRenameBook(bookId: string) {
  const book = letters.getBook(bookId);
  if (!book) return;
  phone.pushPage('rename-book', '重命名分册', { bookId });
}

function openBook(bookId: string) {
  const book = letters.getBook(bookId);
  if (!book) return;
  query.value = '';
  phone.pushPage('book', book.title, { bookId });
}

function openEntry(bookId: string, entryId: string, replaceCurrent = false) {
  const entry = letters.getEntry(bookId, entryId);
  if (!entry) return;
  if (replaceCurrent) phone.replacePage('entry', entry.title, { bookId, entryId });
  else phone.pushPage('entry', entry.title, { bookId, entryId });
  void nextTick(() => scrollToTop('auto'));
}

function openLettersBaguScan() {
  if (!activeBook.value || !activeEntry.value || !viewedLetterEntry.value) return;
  if (!canOpenBaguScan(viewedLetterEntry.value.content)) return;
  phone.pushPage('bagu-scan', '八股检测', {
    bookId: activeBook.value.id,
    entryId: activeEntry.value.id,
    ...(viewedLetterVersionId.value ? { versionId: viewedLetterVersionId.value } : {}),
  });
}

function overwriteLetterContent(content: string) {
  const book = activeBook.value;
  const entry = activeEntry.value;
  if (!book || !entry) return;
  const versionId = viewedLetterVersionId.value;
  const result = versionId
    ? letters.updateEntryVersion(book.id, entry.id, versionId, {
        content,
        format: viewedLetterEntry.value.format,
        title: viewedLetterEntry.value.title,
      })
    : letters.updateEntry(book.id, entry.id, {
        content,
        format: viewedLetterEntry.value.format,
        title: viewedLetterEntry.value.title,
      });
  if (!result) return;
  toastr.success(versionId ? '已覆盖当前书信版本' : '已覆盖当前书信正文');
}

function selectCatalogEntry(entryId: string) {
  if (!activeBook.value) return;
  showCatalogModal.value = false;
  openEntry(activeBook.value.id, entryId, true);
}

function openEditEntry(bookId: string, entryId: string, versionId?: string) {
  phone.pushPage('editor', '编辑信件', { bookId, entryId, ...(versionId ? { versionId } : {}) });
}

function openFailedDraft(draftId: string) {
  const draft = letters.getFailedDraft(draftId);
  if (!draft) return;
  phone.pushPage('failed-draft', '解析失败草稿', { draftId });
}

function submitRenameBook() {
  const bookId = route.value.params?.bookId;
  if (!bookId) return;
  const book = letters.renameBook(bookId, bookTitle.value);
  if (!book) return;
  phone.replacePage('book', book.title, { bookId: book.id });
}

function submitEntry() {
  const bookId = route.value.params?.bookId;

  if (editingEntry.value && bookId && route.value.params?.entryId) {
    const input = {
      content: draft.content,
      format: draft.format,
      formatName: formatLabel(draft.format),
      formatPrompt: draft.formatPrompt,
      title: draft.title,
    };
    const versionId = route.value.params?.versionId;
    const entry = versionId
      ? letters.updateEntryVersion(bookId, route.value.params.entryId, versionId, input)
      : letters.updateEntry(bookId, route.value.params.entryId, input);
    if (!entry) return;
    phone.replacePage('entry', versionId ? draft.title : entry.title, {
      bookId,
      entryId: entry.id,
      ...(versionId ? { versionId } : {}),
    });
    return;
  }

  try {
    const { receiver, sender } = normalizeDraftPair(draft.senderName, draft.receiverName);
    if (!matchesActiveBook(sender, receiver)) {
      toastr.warning('当前分册只允许这两位参与者互通信件');
      return;
    }
    const saved = letters.createEntry({
      bookId,
      bookTitle: draft.bookTitle,
      content: draft.content,
      format: draft.format,
      formatName: formatLabel(draft.format),
      formatPrompt: draft.formatPrompt,
      receiver,
      sender,
      title: draft.title,
    });
    if (!saved) return;
    phone.replacePage('entry', saved.entry.title, { bookId: saved.book.id, entryId: saved.entry.id });
  } catch (error) {
    toastr.warning(error instanceof Error ? error.message : '请先补齐发信人与收信人');
  }
}

function applyLettersBaguContent(content: string) {
  if (!activeBook.value || !activeEntry.value || !viewedLetterEntry.value) return false;
  const input = {
    content,
    format: viewedLetterEntry.value.format,
    title: viewedLetterEntry.value.title,
  };
  const versionId = route.value.params?.versionId;
  const entry = versionId
    ? letters.updateEntryVersion(activeBook.value.id, activeEntry.value.id, versionId, input)
    : letters.updateEntry(activeBook.value.id, activeEntry.value.id, input);
  return Boolean(entry);
}

async function removeBook(bookId: string) {
  const book = letters.getBook(bookId);
  const shouldDelete = await phone.confirmNotice(
    `要删除书信分册“${book?.title || '未命名分册'}”吗？里面的信件也会一起删除。`,
    {
      confirmLabel: '删除',
      kind: 'warning',
    },
  );
  if (!shouldDelete) return;
  letters.deleteBook(bookId);
  toastr.success('已删除书信分册');
}

async function removeEntry(bookId: string, entryId: string) {
  const entry = letters.getEntry(bookId, entryId);
  if (entry && entry.versions.length > 1) {
    await removeLetterVersion(viewedLetterVersionId.value);
    return;
  }
  const shouldDelete = await phone.confirmNotice(
    `要删除信件“${entry?.title || '未命名信件'}”的最后一个版本吗？删除后这封信也会移除。`,
    {
      confirmLabel: '删除',
      kind: 'warning',
    },
  );
  if (!shouldDelete) return;
  letters.deleteEntry(bookId, entryId);
  const book = letters.getBook(bookId);
  if (!book) {
    phone.goHome();
    toastr.success('已删除信件');
    return;
  }
  phone.replacePage('book', book.title, { bookId });
  toastr.success('已删除信件');
}

function buildOutputFormat() {
  return prompts.resolveOutputFormat('letters.generate');
}

function clampRecentEntryCount(value: number) {
  return Math.max(0, Math.min(20, Math.round(value || 0)));
}

function buildRecentLettersContext(book = activeBook.value, count = generationDraft.recentEntryCount) {
  if (!book) return '';
  const effectiveCount = clampRecentEntryCount(count);
  if (!effectiveCount) return '';
  let availableEntries = [...book.entries];
  if (letterGenerationMode.value === 'rewrite' && rewriteLetterEntry.value) {
    const targetIndex = availableEntries.findIndex(entry => entry.id === rewriteLetterEntry.value?.id);
    availableEntries =
      targetIndex >= 0
        ? availableEntries.slice(targetIndex + 1)
        : availableEntries.filter(entry => entry.id !== rewriteLetterEntry.value?.id);
  }
  const entries = availableEntries.slice(0, effectiveCount).reverse();
  if (!entries.length) return '';
  const blocks = entries.map(entry =>
    [
      `${formatLabel(entry.format)} · ${entry.title}`,
      `${entry.sender.name} -> ${entry.receiver.name}`,
      entry.content,
    ].join('\n'),
  );
  return ['最近相关书信：', blocks.join('\n\n')].join('\n\n');
}

function buildSelectedRecentLettersContext() {
  if (!activeBook.value || !generationDraft.includeRecentEntries) return '';
  return buildRecentLettersContext(activeBook.value, generationDraft.recentEntryCount);
}

function failedDraftBookTitle(context: Record<string, unknown>) {
  const bookId = typeof context.bookId === 'string' ? context.bookId : '';
  const fallback = typeof context.bookTitle === 'string' ? context.bookTitle : '未知分册';
  return letters.getBook(bookId)?.title || fallback;
}

function failedDraftContextTitle(draft: FailedGenerationDraft) {
  return failedDraftBookTitle(draft.context);
}

function returnToGenerate() {
  if (generationState.preview?.draftId) {
    phone.replacePage('failed-draft', '解析失败草稿', { draftId: generationState.preview.draftId });
    return;
  }
  const preview = generationState.preview;
  phone.replacePage(
    'generate',
    preview?.mode === 'rewrite' ? '重新生成书信' : route.value.params?.replyToEntryId ? '生成回信' : '生成信件',
    {
      ...(preview?.bookId ? { bookId: preview.bookId } : {}),
      ...(route.value.params?.replyToEntryId ? { replyToEntryId: route.value.params.replyToEntryId } : {}),
      ...(preview?.targetEntryId ? { rewriteEntryId: preview.targetEntryId } : {}),
      ...(preview?.targetVersionId ? { versionId: preview.targetVersionId } : {}),
    },
  );
}

async function runGeneration() {
  beginLettersPreviewDraft();
  generationState.preview = null;
  let task: GenerationTask | null = null;
  try {
    task = generationSession.create({
      sourceParams: activeBook.value?.id ? { bookId: activeBook.value.id } : {},
      title: letterGenerationMode.value === 'rewrite' ? '重新生成书信' : '生成书信 · 单次生成',
    });
    const { receiver, sender } = normalizeDraftPair(generationDraft.senderName, generationDraft.receiverName);
    if (!matchesActiveBook(sender, receiver)) {
      generationSession.fail(task.id, new Error('当前分册只允许这两位参与者互通信件'));
      return;
    }

    const result = await generateContent(
      lettersGenerationAdapter,
      {
        appPrompt: letterGenerationAppPrompt.value,
        bookId: activeBook.value?.id || '',
        bookTitle: generationDraft.bookTitle || activeBook.value?.title || '',
        format: generationFormatDescription.value,
        entryId: rewriteLetterEntry.value?.id || '',
        existingContent: '',
        mode: letterGenerationMode.value,
        outputFormat: buildOutputFormat(),
        recentLettersContext: buildSelectedRecentLettersContext(),
        receiver,
        sender,
        userRequirement: generationDraft.userRequirement,
      },
      {
        createFailedDraft: input => letters.createFailedDraft(input),
        generationDefaults: {
          resultMode: settings.value.generation.resultMode,
          stream: settings.value.generation.stream,
          tavernPresetName: settings.value.generation.tavernPresetName,
        },
        references: formattedReferences.value,
        referenceItems: selectedReferences.value,
        lifecycle: generationSession.lifecycle(task.id),
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
      generationSession.complete(task.id, {
        currentLabel: '解析失败草稿已保留',
        resultPage: 'failed-draft',
        resultParams: { draftId: result.draft.id },
        resultState: 'failed-draft',
        resultTitle: '解析失败草稿',
      });
      toastr.warning('XML 解析失败，已保存到失败草稿');
      void phone.presentGeneratedPage('letters', 'failed-draft', '解析失败草稿', { draftId: result.draft.id });
      return;
    }

    if (result.status === 'saved') {
      generationSession.complete(task.id, {
        currentLabel: `已保存书信：${result.data.title}`,
        resultPage: 'entry',
        resultParams: {
          bookId: result.saved.book.id,
          entryId: result.saved.entry.id,
          ...(result.saved.versionId ? { versionId: result.saved.versionId } : {}),
        },
        resultState: 'saved',
        resultTitle: result.data.title,
      });
      toastr.success(letterGenerationMode.value === 'rewrite' ? '已保存并切换到书信新版本' : '已生成并保存信件');
      void phone.presentGeneratedPage('letters', 'entry', result.data.title, {
        bookId: result.saved.book.id,
        entryId: result.saved.entry.id,
        ...(result.saved.versionId ? { versionId: result.saved.versionId } : {}),
      });
      return;
    }

    generationState.preview = {
      bookId: activeBook.value?.id || '',
      bookTitle: generationDraft.bookTitle || activeBook.value?.title || `${sender.name} 与 ${receiver.name}的书信`,
      content: result.data.content,
      draftId: null,
      format: generationDraft.format,
      formatPrompt: generationDraft.formatPrompt,
      generationRecord: result.generationRecord,
      mode: letterGenerationMode.value,
      raw: result.rawOutput,
      receiver,
      sender,
      title: result.data.title,
      targetEntryId: rewriteLetterEntry.value?.id || '',
      targetVersionId: rewriteLetterVersion.value?.id || '',
      warnings: result.warnings,
    };
    persistLettersPreviewDraft({
      ...(activeBook.value?.id ? { bookId: activeBook.value.id } : {}),
      ...(route.value.params?.replyToEntryId ? { replyToEntryId: route.value.params.replyToEntryId } : {}),
      ...(rewriteLetterEntry.value ? { rewriteEntryId: rewriteLetterEntry.value.id } : {}),
      ...(rewriteLetterVersion.value ? { versionId: rewriteLetterVersion.value.id } : {}),
    });
    const previewParams = {
      ...(activeBook.value?.id ? { bookId: activeBook.value.id } : {}),
      ...(route.value.params?.replyToEntryId ? { replyToEntryId: route.value.params.replyToEntryId } : {}),
      ...(rewriteLetterEntry.value ? { rewriteEntryId: rewriteLetterEntry.value.id } : {}),
      ...(rewriteLetterVersion.value ? { versionId: rewriteLetterVersion.value.id } : {}),
    };
    generationSession.complete(task.id, {
      currentLabel: '书信已生成，等待确认',
      resultPage: 'preview',
      resultParams: previewParams,
      resultState: 'preview',
      resultTitle: '生成预览',
    });
    void phone.presentGeneratedPage('letters', 'preview', '生成预览', previewParams);
  } catch (error) {
    if (task) generationSession.fail(task.id, error);
    else toastr.error(error instanceof Error ? error.message : '生成失败，请稍后再试');
  }
}

function savePreview() {
  const preview = generationState.preview;
  if (!preview) return;
  const saved =
    preview.mode === 'rewrite' && preview.bookId && preview.targetEntryId
      ? letters.appendEntryVersion(preview.bookId, preview.targetEntryId, {
          content: preview.content,
          format: preview.format,
          formatName: formatLabel(preview.format),
          formatPrompt: preview.formatPrompt,
          generationRecord:
            preview.generationRecord ||
            (preview.replay ? createHiddenGenerationRecord('generate', preview.replay) : undefined),
          title: preview.title,
        })
      : letters.createEntry({
          bookId: preview.bookId || undefined,
          bookTitle: preview.bookTitle,
          content: preview.content,
          format: preview.format,
          formatName: formatLabel(preview.format),
          formatPrompt: preview.formatPrompt,
          generationRecord:
            preview.generationRecord ||
            (preview.replay ? createHiddenGenerationRecord('generate', preview.replay) : undefined),
          receiver: preview.receiver,
          sender: preview.sender,
          title: preview.title,
        });
  if (!saved) {
    toastr.warning('保存失败，目标书信分册不存在');
    return;
  }
  if (preview.draftId) {
    letters.deleteFailedDraft(preview.draftId);
  }
  clearLettersPreviewDraft();
  generationState.preview = null;
  const versionId = 'version' in saved ? saved.version.id : '';
  toastr.success(preview.mode === 'rewrite' ? '已保存并切换到书信新版本' : '已保存信件');
  phone.replacePage('entry', versionId ? preview.title : saved.entry.title, {
    bookId: saved.book.id,
    entryId: saved.entry.id,
    ...(versionId ? { versionId } : {}),
  });
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

function stopGeneration() {
  generationSession.stop();
}

async function removeFailedDraft(draftId: string) {
  const shouldDelete = await phone.confirmNotice('要删除这条解析失败草稿吗？原始输出也会一并移除。', {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!shouldDelete) return;
  letters.deleteFailedDraft(draftId);
  failedDraftRawOutput.value = '';
  if (route.value.page === 'failed-draft') {
    phone.replacePage('root', '往返信箱');
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

  const parsed = parseSimpleXmlResult(rawOutput);
  if (!parsed.ok) {
    letters.updateFailedDraft(draft.id, {
      rawOutput,
      warnings: parsed.warnings,
    });
    failedDraftRawOutput.value = rawOutput;
    toastr.warning(parsed.warnings.join('；') || '还是没能解析成功');
    return;
  }

  const sender =
    typeof draft.context.sender === 'object' &&
    draft.context.sender &&
    typeof (draft.context.sender as CharacterRef).name === 'string'
      ? (draft.context.sender as CharacterRef)
      : { name: '未知发信人' };
  const receiver =
    typeof draft.context.receiver === 'object' &&
    draft.context.receiver &&
    typeof (draft.context.receiver as CharacterRef).name === 'string'
      ? (draft.context.receiver as CharacterRef)
      : { name: '未知收信人' };
  const format =
    draft.context.format === 'formal' ||
    draft.context.format === 'note' ||
    draft.context.format === 'sms' ||
    draft.context.format === 'email'
      ? draft.context.format
      : 'formal';
  const bookId = typeof draft.context.bookId === 'string' ? draft.context.bookId : '';
  const bookTitleValue =
    typeof draft.context.bookTitle === 'string' && draft.context.bookTitle.trim()
      ? draft.context.bookTitle
      : letters.getBook(bookId)?.title || `${sender.name} 与 ${receiver.name}的书信`;

  letters.updateFailedDraft(draft.id, {
    rawOutput,
    warnings: parsed.warnings,
  });
  generationState.preview = {
    bookId,
    bookTitle: bookTitleValue,
    content: parsed.data.content,
    draftId: null,
    format,
    generationRecord: draft.generationRecord,
    mode: draft.context.mode === 'rewrite' ? 'rewrite' : 'create',
    raw: rawOutput,
    receiver,
    sender,
    title: parsed.data.title,
    targetEntryId: typeof draft.context.entryId === 'string' ? draft.context.entryId : '',
    targetVersionId: '',
    warnings: parsed.warnings,
  };
  persistLettersPreviewDraft(bookId ? { bookId } : {});
  letters.deleteFailedDraft(draft.id);
  failedDraftRawOutput.value = '';
  phone.replacePage('preview', '生成预览', bookId ? { bookId } : undefined);
}

function formatDirection(senderName: string, receiverName: string) {
  return `${senderName} -> ${receiverName}`;
}

function formatParticipants(participants: CharacterRef[]) {
  return participants.map(item => item.name).join('、') || '未指定参与者';
}

function formatLabel(format: LetterFormat) {
  if (format === 'sms') return '短信';
  if (format === 'email') return '邮件';
  if (format === 'note') return '便签';
  if (format === 'formal') return '正式信';
  return format.replace(/^custom:/, '') || '自定义书信';
}
</script>

<style scoped>
.pc-letters-app {
  height: 100%;
  min-height: 0;
}
</style>
