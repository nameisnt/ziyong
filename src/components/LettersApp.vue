<template>
  <section class="pc-letters-app">
    <section v-if="route.page === 'root'" class="pc-letters-page">
      <BookShelf
        :books="shelfBooks"
        create-label="生成"
        create-subtitle="生成入口"
        variant="diary"
        @create="openGenerate()"
        @select="openBook"
      />

      <FailedDraftList
        :drafts="failedDrafts"
        :get-context="failedDraftContextTitle"
        :get-title="() => t`未解析书信`"
        @open="openFailedDraft"
        @remove="removeFailedDraft"
      />

      <PreviewDraftNotice
        :draft="lettersPreviewDraft"
        @discard="discardLettersPreviewDraft"
        @open="openLettersPreviewDraft"
      />
    </section>

    <section v-else-if="route.page === 'book' && activeBook" class="pc-letters-page">
      <div class="pc-letters-hero pc-letters-actions-hero">
        <div class="pc-hero-actions">
          <button class="pc-soft-btn" type="button" @click="openGenerate(activeBook.id)">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
            <span>{{ t`生成回信` }}</span>
          </button>
        </div>
      </div>

      <div class="pc-toolbar">
        <input v-model="query" class="pc-search" type="text" :placeholder="t`搜索标题、发信人或收信人`" />
        <button class="pc-soft-btn" type="button" @click="sortDesc = !sortDesc">
          {{ sortDesc ? t`倒序` : t`正序` }}
        </button>
      </div>

      <EmptyState v-if="!filteredEntries.length" :title="t`没有匹配的信件`" />

      <div v-else class="pc-entry-list">
        <article v-for="entry in filteredEntries" :key="entry.id" class="pc-entry-card">
          <button class="pc-entry-main" type="button" @click="openEntry(activeBook.id, entry.id)">
            <div class="pc-entry-head">
              <strong>{{ entry.title }}</strong>
              <ContentVersionBadge :count="Math.max(1, entry.versions.length)" />
            </div>
            <p>{{ formatDirection(entry.sender.name, entry.receiver.name) }} · {{ formatLabel(entry.format) }}</p>
          </button>
        </article>
      </div>
    </section>

    <section v-else-if="route.page === 'rename-book' && activeBook" class="pc-letters-page">
      <div class="pc-editor-card">
        <span class="pc-kicker">{{ t`重命名分册` }}</span>
        <h2>{{ formatParticipants(activeBook.participants) }}</h2>
        <input v-model="bookTitle" class="pc-field" type="text" :placeholder="t`分册名称`" />
        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
          <button class="pc-primary-btn" type="button" @click="submitRenameBook">{{ t`保存` }}</button>
        </div>
      </div>
    </section>

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
      @favorite="letters.toggleFavorite(activeBook.id, activeEntry.id)"
      @next="openEntry(activeBook.id, nextEntryId, true)"
      @previous="openEntry(activeBook.id, previousEntryId, true)"
      @reply="openReply(activeBook.id, activeEntry.id)"
      @rewrite="openRewriteLetter(activeBook.id, activeEntry.id)"
      @select-version="selectLetterVersion"
      @select-catalog="selectCatalogEntry"
      @top="scrollToTop"
    />

    <section v-else-if="route.page === 'bagu-scan' && activeBook && activeEntry" class="pc-letters-page">
      <div class="pc-detail-card">
        <div class="pc-detail-title-row">
          <h2>{{ viewedLetterEntry.title }}</h2>
        </div>
        <BaguScanPanel
          auto-scan
          class="pc-detail-bagu-panel"
          :content="viewedLetterEntry.content"
          :apply-handler="applyLettersBaguContent"
        />
      </div>
    </section>

    <section v-else-if="route.page === 'editor'" class="pc-letters-page">
      <div class="pc-editor-card">
        <span class="pc-kicker">{{ t`编辑信件` }}</span>
        <h2>{{ editingEntry ? editingEntry.title : t`调整当前内容` }}</h2>

        <div v-if="editingEntry" class="pc-preview-card">
          <strong>{{ formatDirection(editingEntry.sender.name, editingEntry.receiver.name) }}</strong>
          <p>{{ formatLabel(editingEntry.format) }} · {{ activeBook?.title || t`当前分册` }}</p>
        </div>

        <template v-else>
          <input v-model="draft.senderName" class="pc-field" type="text" :placeholder="t`发信人`" />
          <input v-model="draft.receiverName" class="pc-field" type="text" :placeholder="t`收信人`" />
          <input
            v-if="!activeBook"
            v-model="draft.bookTitle"
            class="pc-field"
            type="text"
            :placeholder="t`分册名称（可留空）`"
          />
        </template>

        <input v-model="draft.title" class="pc-field" type="text" :placeholder="t`标题`" />
        <div class="pc-format-row">
          <button
            v-for="option in formatOptions"
            :key="option.value"
            :class="['pc-format-btn', { active: draft.format === option.value }]"
            type="button"
            @click="draft.format = option.value"
          >
            {{ option.label }}
          </button>
        </div>
        <textarea v-model="draft.content" class="pc-area pc-saved-content-area" :placeholder="t`正文`"></textarea>
        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
          <button class="pc-primary-btn" type="button" @click="submitEntry">{{ t`保存` }}</button>
        </div>
      </div>
    </section>

    <section v-else-if="route.page === 'generate'" class="pc-letters-page">
      <div class="pc-editor-card">
        <span class="pc-kicker">{{ t`AI 生成` }}</span>
        <h2>
          {{
            route.params?.rewriteEntryId
              ? t`重新生成当前信件`
              : route.params?.replyToEntryId
                ? t`生成回信`
                : t`生成一封新的信件`
          }}
        </h2>

        <GenerationPanel
          :capture="captureLetterPrompt"
          :capture-reset-key="letterPromptPreview"
          :error="generationState.error"
          :from-start-end="generationDraft.fromStartEnd"
          :range-text="generationDraft.rangeText"
          :raw-output="generationState.rawOutput"
          :recent-count="generationDraft.recentCount"
          :references="selectedReferences"
          requirement-placeholder="例如：语气更像压抑已久的回信，少解释，多留余味。"
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
        >
          <template #before-fields>
            <input
              v-model="generationDraft.senderName"
              class="pc-field"
              type="text"
              :disabled="generationState.running"
              :placeholder="t`发信人`"
            />
            <input
              v-model="generationDraft.receiverName"
              class="pc-field"
              type="text"
              :disabled="generationState.running"
              :placeholder="t`收信人`"
            />
            <input
              v-if="!activeBook"
              v-model="generationDraft.bookTitle"
              class="pc-field"
              type="text"
              :disabled="generationState.running"
              :placeholder="t`分册名称（可留空）`"
            />

            <div class="pc-format-row">
              <button
                v-for="option in formatOptions"
                :key="option.value"
                :class="['pc-format-btn', { active: generationDraft.format === option.value }]"
                type="button"
                :disabled="generationState.running"
                @click="generationDraft.format = option.value"
              >
                {{ option.label }}
              </button>
            </div>

            <div class="pc-number-field">
              <label class="pc-field-label">{{ t`附带最近 N 封相关书信` }}</label>
              <input
                v-model.number="generationDraft.recentEntryCount"
                class="pc-field"
                type="number"
                min="0"
                max="20"
                :disabled="generationState.running"
              />
            </div>
          </template>
        </GenerationPanel>
      </div>
    </section>

    <section
      v-else-if="route.page === 'preview' && generationState.preview"
      class="pc-letters-page pc-generation-preview-page"
    >
      <div class="pc-detail-card pc-generation-preview-card">
        <GenerationPreviewPanel
          :content="generationState.preview.content"
          :raw="generationState.preview.raw"
          raw-editable
          :reparse-handler="reparsePreviewRaw"
          :save-label="generationState.preview.mode === 'rewrite' ? '保存新版本' : '保存信件'"
          :source-label="generationState.preview.bookTitle"
          :text-provider-summary="`${formatDirection(generationState.preview.sender.name, generationState.preview.receiver.name)} · ${formatLabel(generationState.preview.format)}`"
          :title="generationState.preview.title"
          :warnings="generationState.preview.warnings"
          @back="returnToGenerate"
          @reparse="reparsePreviewRaw"
          @save="savePreview"
          @update:content="generationState.preview.content = $event"
          @update:raw="generationState.preview.raw = $event"
        />
      </div>
    </section>

    <section v-else-if="route.page === 'failed-draft' && activeFailedDraft" class="pc-letters-page pc-repair-page">
      <div class="pc-editor-card pc-repair-card">
        <span class="pc-kicker">{{ activeFailedDraft.source.label }}</span>
        <h2>{{ t`修复解析失败草稿` }}</h2>

        <RawOutputEditor
          v-model="failedDraftRawOutput"
          :placeholder="t`在这里修 XML 结构或补 title / content。`"
          @reparse="reparseFailedDraft"
        />

        <div class="pc-form-actions">
          <button class="pc-soft-btn danger" type="button" @click="removeFailedDraft(activeFailedDraft.id)">
            {{ t`删除草稿` }}
          </button>
          <button class="pc-soft-btn" type="button" @click="reparseFailedDraft">{{ t`重新解析` }}</button>
        </div>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import BookShelf from '@/components/BookShelf.vue';
import BaguScanPanel from '@/components/BaguScanPanel.vue';
import ContentVersionBadge from '@/components/ContentVersionBadge.vue';
import EmptyState from '@/components/EmptyState.vue';
import FailedDraftList from '@/components/FailedDraftList.vue';
import GenerationPanel from '@/components/GenerationPanel.vue';
import GenerationPreviewPanel from '@/components/GenerationPreviewPanel.vue';
import PreviewDraftNotice from '@/components/PreviewDraftNotice.vue';
import RawOutputEditor from '@/components/RawOutputEditor.vue';
import LettersEntryDetailPage from '@/components/letters/LettersEntryDetailPage.vue';
import { useCatalogDetailNavigation } from '@/composables/useCatalogDetailNavigation';
import { useGenerationReplaySession } from '@/composables/useGenerationReplaySession';
import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import { buildGenerationPreview, captureGenerationPrompt, generateContent } from '@/core/generationService';
import { useLettersStore } from '@/store/letters';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import type { CharacterRef } from '@/type/diary';
import type { FailedGenerationDraft, GenerationReplaySnapshot, HiddenGenerationRecord } from '@/type/generation';
import type { LetterFormat } from '@/type/letter';
import { canOpenBaguScan } from '@/util/baguScanGate';
import { useDetailScroll } from '@/util/detailScroll';
import { parseSimpleXmlResult } from '@/util/generation';
import { resolveGenerationReplayReferences } from '@/util/generationReplay';
import { createHiddenGenerationRecord, resolveHiddenGenerationReplay } from '@/util/hiddenGenerationRecord';
import { usePreviewDraftPersistence } from '@/util/previewDrafts';
import { formatGenerationReferences, type GenerationReferenceItem } from '@/util/references';
import { resolveContentVersion } from '@/util/contentVersions';
import { useInvalidRouteFallback } from '@/util/routeFallback';
import { stopGenerationByIdSafe } from '@/util/runtime';
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
const sortDesc = ref(true);
const bookTitle = ref('');
const entryContentEl = ref<HTMLElement | null>(null);
const { scrollToBottom, scrollToTop } = useDetailScroll(entryContentEl, '.pc-letters-detail-page .pc-detail-content');
const showCatalogModal = ref(false);
const draft = reactive({
  bookTitle: '',
  content: '',
  format: 'formal' as LetterFormat,
  receiverName: '',
  senderName: '',
  title: '',
});
const generationDraft = reactive({
  bookTitle: '',
  format: 'formal' as LetterFormat,
  fromStartEnd: 20,
  rangeText: '',
  receiverName: '',
  recentCount: 20,
  recentEntryCount: 6,
  senderName: '',
  singleMessageId: 0,
  userRequirement: '',
});
const generationState = reactive({
  error: '',
  generationId: '',
  preview: null as null | {
    bookId: string;
    bookTitle: string;
    content: string;
    draftId: string | null;
    format: LetterFormat;
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
  rawOutput: '',
  running: false,
});
const failedDraftRawOutput = ref('');
const selectedReferences = ref<GenerationReferenceItem[]>([]);
type LettersPreview = NonNullable<typeof generationState.preview>;

const {
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
  { label: '正式信', value: 'formal' as const },
  { label: '便签', value: 'note' as const },
  { label: '短信', value: 'sms' as const },
  { label: '邮件', value: 'email' as const },
];

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
        format: generationDraft.format,
        entryId: rewriteLetterEntry.value?.id || '',
        existingContent: '',
        mode: letterGenerationMode.value,
        outputFormat: buildOutputFormat(),
        recentLettersContext: buildRecentLettersContext(activeBook.value, generationDraft.recentEntryCount),
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
      format: generationDraft.format,
      entryId: rewriteLetterEntry.value?.id || '',
      existingContent: '',
      mode: letterGenerationMode.value,
      outputFormat: buildOutputFormat(),
      recentLettersContext: buildRecentLettersContext(activeBook.value, generationDraft.recentEntryCount),
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
        draft.receiverName = editingEntry.value.receiver.name;
        draft.senderName = editingEntry.value.sender.name;
        draft.title = viewedLetterEntry.value?.title || editingEntry.value.title;
        draft.bookTitle = activeBook.value?.title || '';
      } else if (activeBook.value?.participants.length === 2) {
        draft.content = '';
        draft.format = 'formal';
        draft.receiverName = activeBook.value.participants[1]?.name || '';
        draft.senderName = activeBook.value.participants[0]?.name || '';
        draft.title = '';
        draft.bookTitle = activeBook.value.title;
      } else {
        draft.bookTitle = '';
        draft.content = '';
        draft.format = 'formal';
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
      generationDraft.fromStartEnd = 20;
      generationDraft.rangeText = '';
      generationDraft.recentCount = 20;
      generationDraft.recentEntryCount = 6;
      generationDraft.receiverName =
        rewriteEntry?.receiver.name || replyEntry?.sender.name || activeBook.value?.participants[1]?.name || '';
      generationDraft.senderName =
        rewriteEntry?.sender.name || replyEntry?.receiver.name || activeBook.value?.participants[0]?.name || '';
      generationDraft.singleMessageId = 0;
      generationDraft.userRequirement = '';
      generationState.error = '';
      generationState.preview = null;
      generationState.rawOutput = '';

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

onScopeDispose(() => {
  if (generationState.running && generationState.generationId) {
    stopGenerationByIdSafe(generationState.generationId);
  }
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
  void nextTick(() => scrollToTop('auto'));
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
  sortDesc.value = true;
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
  generationState.error = '';
  clearLettersPreviewDraft();
  generationState.preview = null;
  generationState.rawOutput = '';

  try {
    const { receiver, sender } = normalizeDraftPair(generationDraft.senderName, generationDraft.receiverName);
    if (!matchesActiveBook(sender, receiver)) {
      generationState.error = '当前分册只允许这两位参与者互通信件';
      return;
    }

    const result = await generateContent(
      lettersGenerationAdapter,
      {
        appPrompt: letterGenerationAppPrompt.value,
        bookId: activeBook.value?.id || '',
        bookTitle: generationDraft.bookTitle || activeBook.value?.title || '',
        format: generationDraft.format,
        entryId: rewriteLetterEntry.value?.id || '',
        existingContent: '',
        mode: letterGenerationMode.value,
        outputFormat: buildOutputFormat(),
        recentLettersContext: buildRecentLettersContext(activeBook.value, generationDraft.recentEntryCount),
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
      generationState.error = result.warnings.join('；') || '模型没有返回可解析的书信 XML';
      failedDraftRawOutput.value = result.rawOutput;
      toastr.warning('XML 解析失败，已保存到失败草稿');
      void phone.presentGeneratedPage('letters', 'failed-draft', '解析失败草稿', { draftId: result.draft.id });
      return;
    }

    if (result.status === 'saved') {
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
    void phone.presentGeneratedPage('letters', 'preview', '生成预览', {
      ...(activeBook.value?.id ? { bookId: activeBook.value.id } : {}),
      ...(route.value.params?.replyToEntryId ? { replyToEntryId: route.value.params.replyToEntryId } : {}),
      ...(rewriteLetterEntry.value ? { rewriteEntryId: rewriteLetterEntry.value.id } : {}),
      ...(rewriteLetterVersion.value ? { versionId: rewriteLetterVersion.value.id } : {}),
    });
  } catch (error) {
    generationState.error = error instanceof Error ? error.message : '生成失败，请稍后再试';
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

  const rawOutput = failedDraftRawOutput.value.trim();
  if (!rawOutput) {
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
    rawOutput: parsed.raw,
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
    raw: parsed.raw,
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
  return '正式信';
}
</script>

<style scoped>
.pc-letters-app,
.pc-letters-page {
  min-height: 100%;
}

.pc-letters-app {
  height: 100%;
  min-height: 0;
}

.pc-letters-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pc-letters-detail-page {
  height: 100%;
  gap: 10px;
  min-height: 0;
}

.pc-letters-hero,
.pc-book-card,
.pc-entry-card,
.pc-editor-card,
.pc-detail-card,
.pc-preview-card,
.pc-toolbar {
  border: 1px solid var(--pc-border);
  background: color-mix(in srgb, var(--pc-surface) 72%, transparent 28%);
  border-radius: 20px;
  backdrop-filter: blur(12px);
}

.pc-letters-hero,
.pc-editor-card,
.pc-detail-card,
.pc-preview-card,
.pc-toolbar {
  padding: 14px;
}

.pc-letters-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
}

.pc-letters-actions-hero {
  grid-template-columns: minmax(0, 1fr);
}

.pc-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.pc-letters-actions-hero .pc-hero-actions {
  justify-content: flex-start;
}

.pc-letters-hero h2,
.pc-editor-card h2,
.pc-detail-card h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
}

.pc-letters-hero p,
.pc-book-card p,
.pc-entry-card p,
.pc-detail-meta,
.pc-copy,
.pc-status-card p,
.pc-raw-head span,
.pc-preview-card p {
  color: var(--pc-muted);
}

.pc-book-list,
.pc-entry-list,
.pc-shelf-manage {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pc-shelf-manage-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--pc-border);
  border-radius: 16px;
  background: color-mix(in srgb, var(--pc-surface) 62%, transparent 38%);
}

.pc-book-card,
.pc-entry-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  padding: 14px;
}

.pc-book-main,
.pc-entry-main {
  text-align: left;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
}

.pc-book-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pc-book-main strong,
.pc-entry-main strong,
.pc-preview-card strong {
  display: block;
  font-size: 16px;
}

.pc-avatar {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--pc-theme-accent) 18%, var(--pc-surface-strong) 82%);
  color: var(--pc-theme-accent);
  font-weight: 700;
}

.pc-book-actions,
.pc-detail-meta,
.pc-entry-head,
.pc-section-head,
.pc-raw-head,
.pc-format-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-format-row {
  justify-content: flex-start;
  flex-wrap: wrap;
  margin-top: 14px;
}

.pc-entry-main p.preview {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pc-favorite-chip,
.pc-format-btn {
  border: 0;
  cursor: pointer;
  color: var(--pc-text);
}

.pc-format-btn {
  min-width: 92px;
  height: 40px;
  border-radius: 999px;
  padding: 0 14px;
}

.pc-favorite-chip,
.pc-format-btn,
.pc-status-card {
  background: var(--pc-surface-strong);
}

.pc-soft-btn.danger,
.pc-icon-btn.danger {
  color: var(--pc-danger);
}

.pc-favorite-chip {
  width: 40px;
  height: 40px;
  border-radius: 12px;
}

.pc-favorite-chip i[data-active='true'] {
  color: var(--pc-danger);
}

.pc-format-btn.active {
  background: color-mix(in srgb, var(--pc-theme-accent) 18%, var(--pc-surface-strong) 82%);
}

.pc-search {
  width: 100%;
  border: 1px solid var(--pc-border);
  border-radius: 16px;
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  padding: 12px 14px;
}

.pc-letters-app :is(.pc-field, .pc-area),
.pc-preview-card {
  margin-top: 14px;
}

.pc-letters-app .pc-area {
  min-height: 220px;
  resize: vertical;
}

.pc-letters-app .pc-area.compact {
  min-height: 120px;
}

.pc-detail-content {
  flex: 1 1 auto;
  margin-top: 16px;
  min-height: 0;
  overflow: auto;
  padding: 16px;
  border-radius: 18px;
  background: var(--pc-surface-strong);
  white-space: pre-wrap;
  color: var(--pc-text);
  font-size: var(--pc-reader-font-size);
  line-height: var(--pc-reader-line-height);
}

.pc-letters-detail-page .pc-detail-card {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.pc-letters-app .pc-form-actions {
  margin-top: 16px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.pc-toolbar,
.pc-raw-output,
.pc-meta-grid {
  margin-top: 14px;
}

.pc-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.pc-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.pc-status-card {
  border: 1px solid var(--pc-border);
  border-radius: 18px;
  padding: 14px;
}

.pc-status-card.warning {
  border-color: color-mix(in srgb, #f5a623 42%, var(--pc-border) 58%);
}

.pc-status-card.danger {
  border-color: color-mix(in srgb, var(--pc-danger) 42%, var(--pc-border) 58%);
}

.pc-number-field + .pc-number-field {
  margin-top: 14px;
}

.pc-raw-area {
  min-height: 180px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}
</style>
