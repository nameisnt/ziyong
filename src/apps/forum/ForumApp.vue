<template>
  <section class="pc-forum-app">
    <ForumCatalogPage
      v-if="route.page === 'root'"
      :boards="boards"
      :failed-drafts="failedDrafts"
      :format-board-meta="formatBoardMeta"
      :get-failed-draft-context="failedDraftContextSummary"
      :get-failed-draft-title="failedDraftTitle"
      :preview-draft="forumPreviewDraft"
      @create-board="openCreateBoard"
      @discard-preview="discardForumPreviewDraft"
      @edit-board="openEditBoard"
      @generate-thread="openGenerateThread()"
      @open-board="openBoard"
      @open-failed-draft="openFailedDraft"
      @open-preview="openForumPreviewDraft"
      @remove-board="removeBoard"
      @remove-boards="removeBoards"
      @remove-failed-draft="removeFailedDraft"
    />

    <ForumBoardEditorPage
      v-else-if="route.page === 'board-editor'"
      v-model:name="boardDraft.name"
      v-model:type-prompt="boardDraft.typePrompt"
      :editing="Boolean(editingBoard)"
      :title="editingBoard?.name"
      :type-id="boardEditorTypeId"
      :type-options="boardTypeOptions"
      @cancel="phone.goBack()"
      @customize-type="markBoardEditorTypeCustom"
      @save="submitBoard"
      @select-type="selectBoardEditorType"
    />

    <ForumBoardPage
      v-else-if="route.page === 'board' && activeBoard"
      v-model:query="query"
      :board-id="activeBoard.id"
      :threads="filteredThreads"
      @create-thread="openCreateThread(activeBoard.id)"
      @generate-thread="openGenerateThread(activeBoard.id)"
      @open-thread="openThread(activeBoard.id, $event)"
      @toggle-favorite="forum.toggleFavorite(activeBoard.id, $event)"
    />

    <ForumThreadEditorPage
      v-else-if="route.page === 'thread-editor'"
      v-model:author="threadDraft.author"
      v-model:board-id="threadDraft.boardId"
      v-model:board-name="threadDraft.boardName"
      v-model:board-type-id="threadDraft.boardTypeId"
      v-model:board-type-prompt="threadDraft.boardTypePrompt"
      v-model:content="threadDraft.content"
      v-model:thread-title="threadDraft.title"
      :board-options="boardSelectionOptions"
      :board-type-options="boardTypeOptions"
      :custom-board-id="CUSTOM_BOARD_ID"
      :editing="Boolean(editingThread)"
      :inside-board="Boolean(activeBoard)"
      :title="editingThread?.title"
      @cancel="phone.goBack()"
      @customize-board-type="threadDraft.boardTypeId = CUSTOM_BOARD_TYPE_ID"
      @save="submitThread"
      @select-board-type="selectThreadEditorBoardType"
    />

    <ForumThreadDetailPage
      v-else-if="route.page === 'thread' && activeBoard && activeThread && viewedForumThread"
      :board-name="activeBoard.name"
      :displayed-content="displayedForumContent"
      :favorite="activeThread.favorite"
      :replies="displayedReplies"
      :thread="viewedForumThread"
      :versions="activeThread.versions"
      :viewed-version-id="viewedForumVersionId"
      @bagu="openForumBaguScan"
      @bottom="scrollForumDetail('bottom')"
      @catalog="phone.goBack()"
      @edit="openEditThread(activeBoard.id, activeThread.id, viewedForumVersionId)"
      @favorite="forum.toggleFavorite(activeBoard.id, activeThread.id)"
      @generate-replies="openGenerateReplies(activeBoard.id, activeThread.id)"
      @remove="removeThread(activeBoard.id, activeThread.id)"
      @rewrite="openRewriteThread"
      @select-version="selectForumVersion"
      @top="scrollForumDetail('top')"
      @update:reasoning="updateViewedForumReasoning"
    />

    <BaguDetailPage
      v-else-if="route.page === 'bagu-scan' && activeBoard && activeThread"
      :apply-handler="applyForumBaguContent"
      :content="viewedForumThread.content"
      :meta="`${activeBoard.name} · ${viewedForumThread.author}`"
      :title="viewedForumThread.title"
    />

    <ForumThreadGeneratePage
      v-else-if="route.page === 'generate-thread'"
      v-model:draft="threadGenerationDraft"
      v-model:references="selectedReferences"
      v-model:source-mode="generationSourceMode"
      :board-options="boardSelectionOptions"
      :board-type-options="boardTypeOptions"
      :capture="captureForumThreadPrompt"
      :capture-reset-key="forumPromptPreview"
      :custom-board-id="CUSTOM_BOARD_ID"
      :custom-board-type-id="CUSTOM_BOARD_TYPE_ID"
      :generation-state="threadGenerationState"
      :inside-board="Boolean(activeBoard)"
      :title="forumThreadGenerationMode === 'rewrite' ? '重新生成整个主题' : '生成一个新帖子'"
      @cancel="phone.goBack()"
      @create-board="createAndSelectThreadBoard"
      @generate="runThreadGeneration"
      @select-board-type="selectThreadBoardType"
      @stop="stopGeneration"
    />

    <ForumRepliesGeneratePage
      v-else-if="route.page === 'generate-replies' && activeBoard && activeThread"
      v-model:draft="replyGenerationDraft"
      v-model:references="selectedReferences"
      v-model:source-mode="generationSourceMode"
      :capture="captureForumReplyPrompt"
      :capture-reset-key="forumPromptPreview"
      :generation-state="replyGenerationState"
      @cancel="phone.goBack()"
      @generate="runReplyGeneration"
      @stop="stopGeneration"
    />

    <ForumPreviewPage
      v-else-if="route.page === 'preview' && generationState.preview"
      v-model:raw="generationState.preview.raw"
      :action="generationState.preview.action"
      :author="generationState.preview.action === 'thread' ? generationState.preview.author : ''"
      :board-name="generationState.preview.boardName"
      :reparse-handler="reparsePreviewRaw"
      :reasoning="generationState.preview.generationRecord?.reasoning || ''"
      :replies="previewReplies"
      :save-label="
        generationState.preview.action === 'thread'
          ? generationState.preview.mode === 'rewrite'
            ? '保存新版本'
            : '保存帖子'
          : '保存回复'
      "
      :thread-content="generationState.preview.action === 'thread' ? generationState.preview.content : ''"
      :title="
        generationState.preview.action === 'thread'
          ? generationState.preview.title
          : generationState.preview.threadTitle
      "
      :warnings="generationState.preview.warnings"
      @update:reasoning="updateGenerationRecordReasoning(generationState.preview, $event)"
      @apply-thread-content="updatePreviewThreadContent"
      @back="returnToGenerate"
      @reparse="reparsePreviewRaw"
      @save="savePreview"
    />

    <FailedDraftRepairPage
      v-else-if="route.page === 'failed-draft' && activeFailedDraft"
      v-model:raw-output="failedDraftRawOutput"
      :regenerate-handler="regenerateFailedDraft"
      :raw-output-semantics="activeFailedDraft.rawOutputSemantics"
      :reasoning="activeFailedDraft.generationRecord?.reasoning || ''"
      placeholder="在这里修 XML 结构或补字段。"
      :source-label="activeFailedDraft.source.label"
      title="修复解析失败草稿"
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
import ForumBoardPage from '@/apps/forum/ForumBoardPage.vue';
import ForumBoardEditorPage from '@/apps/forum/ForumBoardEditorPage.vue';
import ForumCatalogPage from '@/apps/forum/ForumCatalogPage.vue';
import ForumThreadDetailPage from '@/apps/forum/ForumThreadDetailPage.vue';
import ForumThreadEditorPage from '@/apps/forum/ForumThreadEditorPage.vue';
import ForumThreadGeneratePage from '@/apps/forum/ForumThreadGeneratePage.vue';
import ForumRepliesGeneratePage from '@/apps/forum/ForumRepliesGeneratePage.vue';
import ForumPreviewPage from '@/apps/forum/ForumPreviewPage.vue';
import { useForumBoardEditorSession } from '@/apps/forum/useForumBoardEditorSession';
import { useForumDeletionSession } from '@/apps/forum/useForumDeletionSession';
import { useForumThreadGenerationBoardSession } from '@/apps/forum/useForumThreadGenerationBoardSession';
import { useForumThreadEditorSession } from '@/apps/forum/useForumThreadEditorSession';
import { useForumPreviewSession, type ForumGenerationPreview } from '@/apps/forum/useForumPreviewSession';
import { useForumGenerationActions } from '@/apps/forum/useForumGenerationActions';
import { useForumFailedDraftRepair } from '@/composables/useForumFailedDraftRepair';
import { useFailedDraftRegeneration } from '@/composables/useFailedDraftRegeneration';
import { useGenerationReplaySession } from '@/composables/useGenerationReplaySession';
import type { ForumThreadGenerateConfig } from '@/core/forumGeneration';
import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import { buildGenerationPreview, captureGenerationPrompt } from '@/core/generationService';
import { useForumStore } from '@/store/forum';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import { useRegexDisplayStore } from '@/apps/regex-display/store';
import type { FailedGenerationDraft } from '@/type/generation';
import { type ForumThread, resolveForumBoardTypeName, resolveForumBoardTypePrompt } from '@/type/forum';
import { canOpenBaguScan } from '@/util/baguScanGate';
import { resolveGenerationReplayReferences } from '@/util/generationReplay';
import { resolveHiddenGenerationReplay } from '@/util/hiddenGenerationRecord';
import { usePreviewDraftPersistence } from '@/util/previewDrafts';
import { formatGenerationReferences, type GenerationReferenceItem } from '@/util/references';
import { resolveContentVersion } from '@/util/contentVersions';
import { applyRegexDisplayRules, getRegexRulesByIds } from '@/util/regexDisplay';
import { useInvalidRouteFallback } from '@/util/routeFallback';
import { updateGenerationRecordReasoning } from '@/util/generationReasoning';
import { storeToRefs } from 'pinia';

type BoardNameMode = 'ai' | 'fixed';
const CUSTOM_BOARD_ID = '__custom_forum_board__';
const CUSTOM_BOARD_TYPE_ID = '__custom_forum_board_type__';

const forum = useForumStore();
const phone = usePhoneStore();
const prompts = usePromptStore();
const settingsStore = useSettingsStore();
const regexDisplay = useRegexDisplayStore();
const forumThreadGenerationAdapter = getRegisteredPhoneGenerationAdapter('forum', 'generate-thread');
const forumReplyGenerationAdapter = getRegisteredPhoneGenerationAdapter('forum', 'generate-replies');
const { boards, failedDrafts } = storeToRefs(forum);
const { currentRoute: route } = storeToRefs(phone);
const { typePrompts } = storeToRefs(prompts);
const { settings } = storeToRefs(settingsStore);
const generationSourceMode = computed({
  get: () => settings.value.generation.sourceMode,
  set: value => {
    settings.value.generation.sourceMode = value;
  },
});
const replaySession = useGenerationReplaySession({
  appId: 'forum',
  defaultPresetName: () => settings.value.generation.tavernPresetName,
  page: 'generate-thread',
  sourceMode: generationSourceMode,
});

const query = ref('');
const boardEditorTypeId = ref('');
const boardDraft = reactive({
  name: '',
  typePrompt: '',
});
const threadDraft = reactive({
  author: '',
  boardTypePrompt: '',
  boardId: CUSTOM_BOARD_ID,
  boardName: '',
  boardTypeId: CUSTOM_BOARD_TYPE_ID,
  content: '',
  title: '',
});
const threadGenerationDraft = reactive({
  boardTypePrompt: '',
  boardId: CUSTOM_BOARD_ID,
  boardName: '',
  boardNameMode: 'fixed' as BoardNameMode,
  boardTypeId: CUSTOM_BOARD_TYPE_ID,
  fromStartEnd: 20,
  rangeText: '',
  recentCount: 20,
  singleMessageId: 0,
  userRequirement: '',
});
const { createAndSelectBoard: createAndSelectThreadBoard, selectBoardType: selectThreadBoardType } =
  useForumThreadGenerationBoardSession(threadGenerationDraft, {
    customBoardTypeId: CUSTOM_BOARD_TYPE_ID,
    notify: toastr,
  });
const replyGenerationDraft = reactive({
  fromStartEnd: 20,
  rangeText: '',
  recentCount: 20,
  singleMessageId: 0,
  userRequirement: '',
});
const generationState = reactive({
  preview: null as ForumGenerationPreview | null,
});
const failedDraftRawOutput = ref('');
const selectedReferences = ref<GenerationReferenceItem[]>([]);
type ForumPreview = ForumGenerationPreview;

const {
  beginPreviewDraft: beginForumPreviewDraft,
  clearPreviewDraft: clearForumPreviewDraft,
  discardPreviewDraft: discardForumPreviewDraft,
  draft: forumPreviewDraft,
  openPreviewDraft: openForumPreviewDraft,
  persistPreviewDraft: persistForumPreviewDraft,
} = usePreviewDraftPersistence<ForumPreview>({
  appId: 'forum',
  consumeFailedDraft: draftId => forum.deleteFailedDraft(draftId),
  getPreview: () => generationState.preview,
  getRouteParams: () => {
    const preview = generationState.preview;
    if (!preview) return {};
    if (preview.action === 'replies') {
      return {
        boardId: preview.boardId,
        threadId: preview.threadId,
        ...(preview.versionId ? { versionId: preview.versionId } : {}),
      };
    }
    return {
      ...(preview.boardId ? { boardId: preview.boardId } : {}),
      ...(preview.targetThreadId ? { rewriteThreadId: preview.targetThreadId } : {}),
    };
  },
  page: 'preview',
  route,
  setPreview: preview => {
    generationState.preview = preview;
  },
  title: '生成预览',
});

const { reparsePreviewRaw, savePreview } = useForumPreviewSession({
  clearPreviewDraft: clearForumPreviewDraft,
  getPreview: () => generationState.preview,
  navigateToThread: (title, params) => phone.replacePage('thread', title, params),
  notify: toastr,
  setPreview: preview => {
    generationState.preview = preview;
  },
  store: forum,
});

const forumBoardTypePrompts = computed(() => typePrompts.value.filter(item => item.domain === 'forum-board'));
const boardTypeOptions = computed(() => [
  { group: '新建', label: '+ 自定义', value: CUSTOM_BOARD_TYPE_ID },
  ...[...forumBoardTypePrompts.value]
    .sort((left, right) => right.usageCount - left.usageCount || left.name.localeCompare(right.name, 'zh-CN'))
    .map(item => ({ group: '已保存类型', label: item.name, value: item.id })),
]);
const boardSelectionOptions = computed(() => [
  { group: '新建', label: '+ 自定义板块', value: CUSTOM_BOARD_ID },
  ...boards.value.map(board => ({ group: '已有板块', label: board.name, value: board.id })),
]);

const activeBoard = computed(() => {
  const boardId = route.value.params?.boardId;
  return boardId ? forum.getBoard(boardId) : null;
});
const threadGenerationBoard = computed(() => {
  if (activeBoard.value) return activeBoard.value;
  return threadGenerationDraft.boardId && threadGenerationDraft.boardId !== CUSTOM_BOARD_ID
    ? forum.getBoard(threadGenerationDraft.boardId)
    : null;
});
const activeThread = computed(() => {
  const boardId = route.value.params?.boardId;
  const threadId = route.value.params?.threadId;
  return boardId && threadId ? forum.getThread(boardId, threadId) : null;
});
const viewedForumVersion = computed(() => {
  const thread = activeThread.value;
  if (!thread) return null;
  return resolveContentVersion(thread.versions, thread.activeVersionId, route.value.params?.versionId);
});
const viewedForumVersionId = computed(() => viewedForumVersion.value?.id || activeThread.value?.activeVersionId || '');
const viewedForumThread = computed(() => {
  const thread = activeThread.value;
  const version = viewedForumVersion.value;
  return thread && version
    ? {
        ...thread,
        author: version.author,
        content: version.content,
        generationRecord: version.generationRecord,
        generationReplay: version.generationReplay,
        replies: version.replies,
        title: version.title,
      }
    : thread;
});

function updateViewedForumReasoning(reasoning: string) {
  updateGenerationRecordReasoning(viewedForumVersion.value || activeThread.value, reasoning);
}
const displayedForumContent = computed(() => {
  const content = viewedForumThread.value?.content || '';
  const rules = getRegexRulesByIds(regexDisplay.rules, regexDisplay.getUsage('forum').displayRuleIds, 'replace');
  return applyRegexDisplayRules(content, rules).content;
});
const rewriteForumThread = computed(() => {
  const boardId = route.value.params?.boardId;
  const threadId = route.value.params?.rewriteThreadId;
  return boardId && threadId ? forum.getThread(boardId, threadId) : null;
});
const rewriteForumVersion = computed(() => {
  const thread = rewriteForumThread.value;
  if (!thread) return null;
  return resolveContentVersion(thread.versions, thread.activeVersionId, route.value.params?.versionId);
});
const forumThreadGenerationMode = computed<'create' | 'rewrite'>(() =>
  rewriteForumThread.value ? 'rewrite' : 'create',
);
const editingBoard = computed(() => {
  const boardId = route.value.params?.boardId;
  return route.value.page === 'board-editor' && boardId ? forum.getBoard(boardId) : null;
});
const {
  markTypeCustom: markBoardEditorTypeCustom,
  selectType: selectBoardEditorType,
  submit: submitBoard,
} = useForumBoardEditorSession(boardDraft, boardEditorTypeId, {
  customBoardTypeId: CUSTOM_BOARD_TYPE_ID,
  getEditingBoard: () => editingBoard.value,
  getEditingBoardId: () => route.value.params?.boardId,
  navigateToBoard: board => phone.replacePage('board', board.name, { boardId: board.id }),
});
const editingThread = computed(() => {
  const boardId = route.value.params?.boardId;
  const threadId = route.value.params?.threadId;
  return route.value.page === 'thread-editor' && boardId && threadId ? forum.getThread(boardId, threadId) : null;
});
const threadEditorSession = useForumThreadEditorSession(threadDraft, {
  customBoardId: CUSTOM_BOARD_ID,
  customBoardTypeId: CUSTOM_BOARD_TYPE_ID,
  getActiveBoard: () => activeBoard.value,
  getEditingThread: () => editingThread.value,
  getThreadId: () => route.value.params?.threadId,
  getVersionId: () => route.value.params?.versionId,
  navigateToThread: (title, params) => phone.replacePage('thread', title, params),
  notify: toastr,
});
const selectThreadEditorBoardType = threadEditorSession.selectBoardType;
const submitThread = threadEditorSession.submit;
const { removeBoard, removeBoards, removeForumVersion, removeThread } = useForumDeletionSession({
  confirmDelete: (message, confirmLabel) => phone.confirmNotice(message, { confirmLabel, kind: 'warning' }),
  getActiveBoard: () => activeBoard.value,
  getActiveThread: () => activeThread.value,
  getViewedVersionId: () => viewedForumVersionId.value,
  goHome: () => phone.goHome(),
  navigateToBoard: board => phone.replacePage('board', board.name, { boardId: board.id }),
  navigateToThread: (title, params) => phone.replacePage('thread', title, params),
  notifySuccess: message => toastr.success(message),
});
const activeFailedDraft = computed(() => {
  const draftId = route.value.params?.draftId;
  return draftId ? forum.getFailedDraft(draftId) : null;
});
const { removeFailedDraft, reparseFailedDraft } = useForumFailedDraftRepair({
  activeDraft: activeFailedDraft,
  persistPreviewDraft: persistForumPreviewDraft,
  rawOutput: failedDraftRawOutput,
  setPreview: preview => {
    generationState.preview = preview;
  },
});
const formattedReferences = computed(() => formatGenerationReferences(selectedReferences.value));
const forumPromptPreview = computed(() => {
  try {
    if (route.value.page === 'generate-replies') {
      const boardId = route.value.params?.boardId || activeBoard.value?.id;
      const threadId = route.value.params?.threadId || activeThread.value?.id;
      if (!boardId || !threadId || !activeThread.value) return '未选择帖子';
      return buildGenerationPreview(
        forumReplyGenerationAdapter,
        {
          appPrompt: prompts.specialPrompts.forumReplies,
          boardId,
          outputFormat: buildRepliesOutputFormat(),
          threadContext: buildReplyThreadContext(viewedForumThread.value || activeThread.value),
          threadId,
          userRequirement: replyGenerationDraft.userRequirement,
          versionId: viewedForumVersionId.value,
        },
        {
          generationDefaults: {
            resultMode: settings.value.generation.resultMode,
            stream: settings.value.generation.stream,
            tavernPresetName: settings.value.generation.tavernPresetName,
          },
          references: formattedReferences.value,
          source: {
            fromStartEnd: replyGenerationDraft.fromStartEnd,
            mode: settings.value.generation.sourceMode,
            rangeText: replyGenerationDraft.rangeText,
            recentCount: replyGenerationDraft.recentCount,
            singleMessageId: replyGenerationDraft.singleMessageId,
          },
          textProvider: settings.value.textProvider,
        },
      ).text;
    }

    return buildGenerationPreview(forumThreadGenerationAdapter, buildThreadGenerationConfig(), {
      generationDefaults: {
        resultMode: settings.value.generation.resultMode,
        stream: settings.value.generation.stream,
        tavernPresetName: settings.value.generation.tavernPresetName,
      },
      references: formattedReferences.value,
      source: {
        fromStartEnd: threadGenerationDraft.fromStartEnd,
        mode: settings.value.generation.sourceMode,
        rangeText: threadGenerationDraft.rangeText,
        recentCount: threadGenerationDraft.recentCount,
        singleMessageId: threadGenerationDraft.singleMessageId,
      },
      textProvider: settings.value.textProvider,
    }).text;
  } catch (error) {
    return error instanceof Error ? error.message : '无法生成提示词预览';
  }
});

function captureForumReplyPrompt() {
  const boardId = route.value.params?.boardId || activeBoard.value?.id;
  const threadId = route.value.params?.threadId || activeThread.value?.id;
  if (!boardId || !threadId || !activeThread.value) return Promise.reject(new Error('未选择帖子'));
  return captureGenerationPrompt(
    forumReplyGenerationAdapter,
    {
      appPrompt: prompts.specialPrompts.forumReplies,
      boardId,
      outputFormat: buildRepliesOutputFormat(),
      threadContext: buildReplyThreadContext(viewedForumThread.value || activeThread.value),
      threadId,
      userRequirement: replyGenerationDraft.userRequirement,
      versionId: viewedForumVersionId.value,
    },
    {
      generationDefaults: {
        resultMode: settings.value.generation.resultMode,
        stream: settings.value.generation.stream,
        tavernPresetName: settings.value.generation.tavernPresetName,
      },
      references: formattedReferences.value,
      source: {
        fromStartEnd: replyGenerationDraft.fromStartEnd,
        mode: settings.value.generation.sourceMode,
        rangeText: replyGenerationDraft.rangeText,
        recentCount: replyGenerationDraft.recentCount,
        singleMessageId: replyGenerationDraft.singleMessageId,
      },
      textProvider: settings.value.textProvider,
    },
  );
}

function captureForumThreadPrompt() {
  return captureGenerationPrompt(forumThreadGenerationAdapter, buildThreadGenerationConfig(), {
    generationDefaults: {
      resultMode: settings.value.generation.resultMode,
      stream: settings.value.generation.stream,
      tavernPresetName: settings.value.generation.tavernPresetName,
    },
    references: formattedReferences.value,
    source: {
      fromStartEnd: threadGenerationDraft.fromStartEnd,
      mode: settings.value.generation.sourceMode,
      rangeText: threadGenerationDraft.rangeText,
      recentCount: threadGenerationDraft.recentCount,
      singleMessageId: threadGenerationDraft.singleMessageId,
    },
    textProvider: settings.value.textProvider,
  });
}
const filteredThreads = computed(() => {
  const normalized = query.value.trim().toLowerCase();
  const source = activeBoard.value?.threads || [];
  const matched = normalized
    ? source.filter(
        thread =>
          thread.title.toLowerCase().includes(normalized) ||
          thread.author.toLowerCase().includes(normalized) ||
          thread.content.toLowerCase().includes(normalized),
      )
    : source;

  return [...matched].sort((left, right) => {
    const leftLatestReplyAt = left.replies.at(-1)?.createdAt || left.createdAt;
    const rightLatestReplyAt = right.replies.at(-1)?.createdAt || right.createdAt;
    return rightLatestReplyAt.localeCompare(leftLatestReplyAt);
  });
});
const displayedReplies = computed(() =>
  (viewedForumThread.value?.replies || []).map((reply, index) => ({
    ...reply,
    floor: index + 1,
  })),
);
const previewReplies = computed(() => {
  const preview = generationState.preview;
  const previewThread =
    preview?.action === 'replies' && preview.threadId && preview.boardId
      ? forum.getThread(preview.boardId, preview.threadId)
      : null;
  const existingCount =
    preview?.action === 'replies'
      ? previewThread?.versions.find(version => version.id === preview.versionId)?.replies.length ||
        previewThread?.replies.length ||
        0
      : 0;
  return (generationState.preview?.replies || []).map((reply, index) => ({
    ...reply,
    floor: existingCount + index + 1,
    key: `preview_reply_${index}`,
  }));
});
watch(
  () => route.value,
  (current, previous) => {
    if (current.appId !== 'forum') {
      replaySession.release();
      return;
    }
    if (current.page !== 'generate-thread' && current.page !== 'preview') replaySession.release();
    if (current.page === 'board-editor') {
      boardDraft.typePrompt = editingBoard.value ? resolveForumBoardTypePrompt(editingBoard.value) : '';
      boardDraft.name = editingBoard.value?.name || '';
      const matchedType = forumBoardTypePrompts.value.find(
        item => item.id === editingBoard.value?.typeId || item.prompt.trim() === boardDraft.typePrompt.trim(),
      );
      boardEditorTypeId.value = matchedType?.id || CUSTOM_BOARD_TYPE_ID;
    }

    if (current.page === 'thread-editor') {
      if (editingThread.value) {
        threadDraft.author = viewedForumThread.value?.author || editingThread.value.author;
        threadDraft.boardTypePrompt = activeBoard.value ? resolveForumBoardTypePrompt(activeBoard.value) : '';
        threadDraft.boardId = activeBoard.value?.id || '';
        threadDraft.boardName = activeBoard.value?.name || '';
        threadDraft.boardTypeId = activeBoard.value?.typeId || CUSTOM_BOARD_TYPE_ID;
        threadDraft.content = viewedForumThread.value?.content || editingThread.value.content;
        threadDraft.title = viewedForumThread.value?.title || editingThread.value.title;
      } else {
        threadDraft.author = '';
        threadDraft.boardTypePrompt = activeBoard.value ? resolveForumBoardTypePrompt(activeBoard.value) : '';
        threadDraft.boardId = activeBoard.value?.id || CUSTOM_BOARD_ID;
        threadDraft.boardName = activeBoard.value?.name || '';
        threadDraft.boardTypeId = activeBoard.value?.typeId || CUSTOM_BOARD_TYPE_ID;
        threadDraft.content = '';
        threadDraft.title = '';
      }
    }

    if (current.page === 'generate-thread' && previous?.page !== 'preview') {
      replaySession.release();
      selectedReferences.value = [];
      threadGenerationDraft.boardId = activeBoard.value?.id || CUSTOM_BOARD_ID;
      threadGenerationDraft.boardName = activeBoard.value?.name || '';
      threadGenerationDraft.boardTypePrompt = activeBoard.value ? resolveForumBoardTypePrompt(activeBoard.value) : '';
      threadGenerationDraft.boardNameMode = 'fixed';
      threadGenerationDraft.boardTypeId = activeBoard.value?.typeId || CUSTOM_BOARD_TYPE_ID;
      threadGenerationDraft.rangeText = '';
      threadGenerationDraft.singleMessageId = 0;
      threadGenerationDraft.userRequirement = '';
      generationState.preview = null;

      const replay = rewriteForumThread.value?.versions.length
        ? rewriteForumVersion.value
          ? resolveHiddenGenerationReplay(rewriteForumVersion.value)
          : undefined
        : rewriteForumThread.value
          ? resolveHiddenGenerationReplay(rewriteForumThread.value)
          : undefined;
      if (replay) {
        selectedReferences.value = resolveGenerationReplayReferences(replay);
        replaySession.applyReplay(replay, threadGenerationDraft);
        const replayBoardId = typeof replay.config.boardId === 'string' ? replay.config.boardId : '';
        const replayBoardName = typeof replay.config.boardName === 'string' ? replay.config.boardName : '';
        const replayBoardTypeId = typeof replay.config.boardTypeId === 'string' ? replay.config.boardTypeId : '';
        const replayBoardTypePrompt =
          typeof replay.config.boardTypePrompt === 'string' ? replay.config.boardTypePrompt : '';
        threadGenerationDraft.boardId = forum.getBoard(replayBoardId)?.id || CUSTOM_BOARD_ID;
        threadGenerationDraft.boardName = replayBoardName;
        threadGenerationDraft.boardNameMode = replayBoardName ? 'fixed' : 'ai';
        threadGenerationDraft.boardTypeId = replayBoardTypeId || CUSTOM_BOARD_TYPE_ID;
        threadGenerationDraft.boardTypePrompt = replayBoardTypePrompt;
      }
    }

    if (current.page === 'generate-replies' && previous?.page !== 'preview') {
      selectedReferences.value = [];
      replyGenerationDraft.rangeText = '';
      replyGenerationDraft.singleMessageId = 0;
      replyGenerationDraft.userRequirement = '';
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
    hasBoard: Boolean(activeBoard.value),
    hasFailedDraft: Boolean(activeFailedDraft.value),
    hasPreview: Boolean(generationState.preview),
    hasThread: Boolean(activeThread.value),
    page: route.value.page,
  }),
  isInvalid: current =>
    current.appId === 'forum' &&
    ((current.page === 'preview' && !current.hasPreview) ||
      (current.page === 'failed-draft' && !current.hasFailedDraft) ||
      (current.page === 'board' && !current.hasBoard) ||
      (['thread', 'bagu-scan', 'generate-replies'].includes(current.page) &&
        (!current.hasBoard || !current.hasThread))),
  fallback: () => {
    if (route.value.appId !== 'forum') return;
    phone.replacePage('root', '论坛板块');
  },
});

function openCreateBoard() {
  phone.pushPage('board-editor', '新建板块');
}

function openEditBoard(boardId: string) {
  phone.pushPage('board-editor', '编辑板块', { boardId });
}

function openBoard(boardId: string) {
  const board = forum.getBoard(boardId);
  if (!board) return;
  query.value = '';
  phone.pushPage('board', board.name, { boardId });
}

function openCreateThread(boardId?: string) {
  phone.pushPage('thread-editor', '发帖', boardId ? { boardId } : undefined);
}

function openEditThread(boardId: string, threadId: string, versionId?: string) {
  phone.pushPage('thread-editor', '编辑主楼', { boardId, threadId, ...(versionId ? { versionId } : {}) });
}

function openThread(boardId: string, threadId: string) {
  const thread = forum.getThread(boardId, threadId);
  if (!thread) return;
  phone.pushPage('thread', thread.title, { boardId, threadId });
}

function openGenerateThread(boardId?: string) {
  phone.pushPage('generate-thread', '生成帖子', boardId ? { boardId } : undefined);
}

function openRewriteThread() {
  if (!activeBoard.value || !activeThread.value) return;
  phone.pushPage('generate-thread', '重新生成论坛主题', {
    boardId: activeBoard.value.id,
    rewriteThreadId: activeThread.value.id,
    ...(viewedForumVersionId.value ? { versionId: viewedForumVersionId.value } : {}),
  });
}

function selectForumVersion(versionId: string) {
  if (!activeBoard.value || !activeThread.value) return;
  const thread = forum.activateThreadVersion(activeBoard.value.id, activeThread.value.id, versionId);
  if (!thread) return;
  phone.replacePage('thread', thread.title, {
    boardId: activeBoard.value.id,
    threadId: thread.id,
    versionId,
  });
}

function scrollForumDetail(position: 'bottom' | 'top') {
  const content = document.querySelector('.pc-forum-thread-detail-page .pc-reader-content');
  if (!(content instanceof HTMLElement)) return;
  content.scrollTo({ behavior: 'smooth', top: position === 'top' ? 0 : content.scrollHeight });
}

function openGenerateReplies(boardId: string, threadId: string) {
  phone.pushPage('generate-replies', '生成回复', {
    boardId,
    threadId,
    ...(viewedForumVersionId.value ? { versionId: viewedForumVersionId.value } : {}),
  });
}

function openFailedDraft(draftId: string) {
  const draft = forum.getFailedDraft(draftId);
  if (!draft) return;
  phone.pushPage('failed-draft', '解析失败草稿', { draftId });
}

function applyForumBaguContent(content: string) {
  if (!activeBoard.value || !activeThread.value || !viewedForumThread.value) return false;
  const input = {
    author: viewedForumThread.value.author,
    content,
    title: viewedForumThread.value.title,
  };
  const versionId = route.value.params?.versionId;
  const thread = versionId
    ? forum.updateThreadVersion(activeBoard.value.id, activeThread.value.id, versionId, input)
    : forum.updateThread(activeBoard.value.id, activeThread.value.id, input);
  return Boolean(thread);
}

function openForumBaguScan() {
  if (!activeBoard.value || !activeThread.value || !viewedForumThread.value) return;
  if (!canOpenBaguScan(viewedForumThread.value.content)) return;
  phone.pushPage('bagu-scan', '八股检测', {
    boardId: activeBoard.value.id,
    threadId: activeThread.value.id,
    ...(viewedForumVersionId.value ? { versionId: viewedForumVersionId.value } : {}),
  });
}

function buildThreadOutputFormat() {
  return prompts.resolveOutputFormat('forum.thread');
}

function buildThreadGenerationConfig(): ForumThreadGenerateConfig {
  const board = threadGenerationBoard.value;
  if (!board && threadGenerationDraft.boardNameMode === 'fixed' && !threadGenerationDraft.boardName.trim()) {
    throw new Error('请填写固定板块名称，或切换为 AI 生成');
  }
  const selectedType = forumBoardTypePrompts.value.find(prompt => prompt.id === threadGenerationDraft.boardTypeId);
  return {
    appPrompt: prompts.appPrompts.forum,
    boardTypePrompt: board ? resolveForumBoardTypePrompt(board) : threadGenerationDraft.boardTypePrompt,
    boardId: board?.id || '',
    boardName:
      board?.name || (threadGenerationDraft.boardNameMode === 'fixed' ? threadGenerationDraft.boardName.trim() : ''),
    boardTypeId: board?.typeId || selectedType?.id || '',
    boardTypeName:
      board?.typeName || selectedType?.name || (threadGenerationDraft.boardTypePrompt.trim() ? '自定义' : ''),
    existingThreadContent: '',
    mode: forumThreadGenerationMode.value,
    outputFormat: buildThreadOutputFormat(),
    threadId: rewriteForumThread.value?.id || '',
    userRequirement: threadGenerationDraft.userRequirement,
  };
}

function buildRepliesOutputFormat() {
  return prompts.resolveOutputFormat('forum.replies');
}

function buildReplyThreadContext(thread: ForumThread) {
  const replyBlocks = thread.replies.map((reply, index) =>
    [`第 ${index + 1} 层 · ${reply.author}${reply.isOriginalPoster ? '（楼主）' : ''}`, reply.content].join('\n'),
  );

  return [
    `板块：${activeBoard.value?.name || ''}`,
    activeBoard.value && resolveForumBoardTypePrompt(activeBoard.value)
      ? `板块类型提示词：${resolveForumBoardTypePrompt(activeBoard.value)}`
      : '',
    `帖子标题：${thread.title}`,
    `主楼作者：${thread.author}`,
    `主楼正文：\n${thread.content}`,
    thread.replies.length ? `已有回复：\n${replyBlocks.join('\n\n')}` : '当前还没有回复。',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function failedDraftContextLabel(context: Record<string, unknown>) {
  const boardId = typeof context.boardId === 'string' ? context.boardId : '';
  const threadId = typeof context.threadId === 'string' ? context.threadId : '';
  const boardLabel =
    forum.getBoard(boardId)?.name || (typeof context.boardName === 'string' ? context.boardName : '未知板块');
  const threadLabel = boardId && threadId ? forum.getThread(boardId, threadId)?.title : '';
  return [boardLabel, threadLabel].filter(Boolean).join(' · ') || '论坛草稿';
}

function failedDraftContextSummary(draft: FailedGenerationDraft) {
  return failedDraftContextLabel(draft.context);
}

function failedDraftTitle(draft: FailedGenerationDraft) {
  return draft.actionId === 'generate-thread' ? '未解析帖子' : '未解析回复';
}

function formatBoardMeta(threadCount: number) {
  return `${threadCount} 帖`;
}

function returnToGenerate() {
  const preview = generationState.preview;
  if (!preview) return;
  if (preview.draftId) {
    phone.replacePage('failed-draft', '解析失败草稿', { draftId: preview.draftId });
    return;
  }
  if (preview.action === 'thread') {
    phone.replacePage('generate-thread', preview.mode === 'rewrite' ? '重新生成论坛主题' : '生成帖子', {
      ...(preview.boardId ? { boardId: preview.boardId } : {}),
      ...(preview.targetThreadId ? { rewriteThreadId: preview.targetThreadId } : {}),
      ...(preview.targetVersionId ? { versionId: preview.targetVersionId } : {}),
    });
    return;
  }
  phone.replacePage('generate-replies', '生成回复', {
    boardId: preview.boardId,
    threadId: preview.threadId,
    ...(preview.versionId ? { versionId: preview.versionId } : {}),
  });
}

function updatePreviewThreadContent(content: string) {
  if (generationState.preview?.action === 'thread') {
    generationState.preview.content = content;
  }
}

const { replySession, runReplyGeneration, runThreadGeneration, stopGeneration, threadSession } =
  useForumGenerationActions({
    activeBoard,
    buildReplyThreadContext,
    buildRepliesOutputFormat,
    buildThreadGenerationConfig,
    beginPreviewDraft: beginForumPreviewDraft,
    clearPreviewDraft: clearForumPreviewDraft,
    failedDraftRawOutput,
    formattedReferences,
    generationState,
    persistPreviewDraft: persistForumPreviewDraft,
    replyGenerationDraft,
    rewriteForumThread,
    rewriteForumVersion,
    route,
    selectedReferences,
    threadGenerationDraft,
    threadGenerationMode: forumThreadGenerationMode,
    viewedForumThread,
    viewedForumVersionId,
  });
const threadGenerationState = computed(() => ({
  error: threadSession.error.value,
  preview: generationState.preview,
  rawOutput: threadSession.rawOutput.value,
  running: threadSession.running.value,
}));
const replyGenerationState = computed(() => ({
  error: replySession.error.value,
  preview: generationState.preview,
  rawOutput: replySession.rawOutput.value,
  running: replySession.running.value,
}));
const regenerateFailedDraft = useFailedDraftRegeneration({
  draft: () => activeFailedDraft.value,
  rawOutput: failedDraftRawOutput,
  reparse: reparseFailedDraft,
});
</script>

<style scoped>
.pc-forum-app {
  min-height: 100%;
}
</style>
