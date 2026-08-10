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
      v-model:sort-mode="sortMode"
      :board="activeBoard"
      :sort-options="sortOptions"
      :threads="sortedThreads"
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
      :version-navigator-position="settings.reader.versionNavigatorPosition"
      :versions="activeThread.versions"
      :viewed-version-id="viewedForumVersionId"
      @bagu="openForumBaguScan"
      @edit="openEditThread(activeBoard.id, activeThread.id, viewedForumVersionId)"
      @favorite="forum.toggleFavorite(activeBoard.id, activeThread.id)"
      @generate-replies="openGenerateReplies(activeBoard.id, activeThread.id)"
      @remove="removeThread(activeBoard.id, activeThread.id)"
      @rewrite="openRewriteThread"
      @select-version="selectForumVersion"
    />

    <BaguDetailPage
      v-else-if="route.page === 'bagu-scan' && activeBoard && activeThread"
      :apply-handler="applyForumBaguContent"
      :content="viewedForumThread.content"
      :meta="`${activeBoard.name} · ${viewedForumThread.author}`"
      :title="viewedForumThread.title"
    />

    <GenerationFormPage
      v-else-if="route.page === 'generate-thread'"
      v-model:from-start-end="threadGenerationDraft.fromStartEnd"
      v-model:range-text="threadGenerationDraft.rangeText"
      v-model:recent-count="threadGenerationDraft.recentCount"
      v-model:references="selectedReferences"
      v-model:single-message-id="threadGenerationDraft.singleMessageId"
      v-model:source-mode="generationSourceMode"
      v-model:user-requirement="threadGenerationDraft.userRequirement"
      :capture="captureForumThreadPrompt"
      :capture-reset-key="forumPromptPreview"
      :error="generationState.error"
      :raw-output="generationState.rawOutput"
      requirement-placeholder="例如：主楼更像资深版友发的长帖，回复风格分化明显。"
      :running="generationState.running"
      :title="forumThreadGenerationMode === 'rewrite' ? '重新生成整个主题' : '生成一个新帖子'"
      @cancel="phone.goBack()"
      @generate="runThreadGeneration"
      @stop="stopGeneration"
    >
      <template #before-fields>
        <SearchableCombobox
          v-if="!activeBoard"
          :disabled="generationState.running"
          :input-label="t`选择或搜索论坛板块`"
          :model-value="threadGenerationDraft.boardId"
          :options="boardSelectionOptions"
          :placeholder="t`选择或搜索论坛板块`"
          :toggle-title="t`展开论坛板块`"
          @update:model-value="threadGenerationDraft.boardId = $event"
        />
        <div v-if="!activeBoard && threadGenerationDraft.boardId === CUSTOM_BOARD_ID" class="pc-forum-type-fields">
          <SearchableCombobox
            :disabled="generationState.running"
            :empty-label="t`没有匹配的板块类型`"
            :input-label="t`选择论坛板块类型`"
            :model-value="threadGenerationDraft.boardTypeId"
            :options="boardTypeOptions"
            :placeholder="t`选择论坛板块类型`"
            :toggle-title="t`展开论坛板块类型`"
            @update:model-value="selectThreadBoardType"
          />
          <textarea
            v-model="threadGenerationDraft.boardTypePrompt"
            class="pc-area compact"
            :disabled="generationState.running"
            :placeholder="t`板块类型提示词（可编辑）`"
            @input="threadGenerationDraft.boardTypeId = CUSTOM_BOARD_TYPE_ID"
          ></textarea>
          <div class="pc-segment pc-forum-name-mode" :aria-label="t`板块命名方式`">
            <button
              :class="['pc-segment-btn', { active: threadGenerationDraft.boardNameMode === 'fixed' }]"
              type="button"
              :disabled="generationState.running"
              @click="threadGenerationDraft.boardNameMode = 'fixed'"
            >
              {{ t`固定名称` }}
            </button>
            <button
              :class="['pc-segment-btn', { active: threadGenerationDraft.boardNameMode === 'ai' }]"
              type="button"
              :disabled="generationState.running"
              @click="threadGenerationDraft.boardNameMode = 'ai'"
            >
              {{ t`AI 生成` }}
            </button>
          </div>
          <input
            v-if="threadGenerationDraft.boardNameMode === 'fixed'"
            v-model="threadGenerationDraft.boardName"
            class="pc-field"
            type="text"
            :disabled="generationState.running"
            :placeholder="t`固定板块名称`"
          />
        </div>
      </template>
    </GenerationFormPage>

    <GenerationFormPage
      v-else-if="route.page === 'generate-replies' && activeBoard && activeThread"
      v-model:from-start-end="replyGenerationDraft.fromStartEnd"
      v-model:range-text="replyGenerationDraft.rangeText"
      v-model:recent-count="replyGenerationDraft.recentCount"
      v-model:references="selectedReferences"
      v-model:single-message-id="replyGenerationDraft.singleMessageId"
      v-model:source-mode="generationSourceMode"
      v-model:user-requirement="replyGenerationDraft.userRequirement"
      :capture="captureForumReplyPrompt"
      :capture-reset-key="forumPromptPreview"
      :error="generationState.error"
      kicker="AI 续回"
      :raw-output="generationState.rawOutput"
      requirement-placeholder="例如：让不同楼层意见更分裂。"
      :running="generationState.running"
      title="生成新的回复"
      @cancel="phone.goBack()"
      @generate="runReplyGeneration"
      @stop="stopGeneration"
    >
      <template #before-fields>
        <div class="pc-preview-card">
          <strong>{{ t`上下文` }}</strong>
          <p>{{ t`基于主楼和已有回复继续生成` }}</p>
        </div>
      </template>
    </GenerationFormPage>

    <ForumPreviewPage
      v-else-if="route.page === 'preview' && generationState.preview"
      v-model:raw="generationState.preview.raw"
      :action="generationState.preview.action"
      :author="generationState.preview.action === 'thread' ? generationState.preview.author : ''"
      :board-name="generationState.preview.boardName"
      :reparse-handler="reparsePreviewRaw"
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
      @apply-thread-content="updatePreviewThreadContent"
      @back="returnToGenerate"
      @reparse="reparsePreviewRaw"
      @save="savePreview"
    />

    <FailedDraftRepairPage
      v-else-if="route.page === 'failed-draft' && activeFailedDraft"
      v-model:raw-output="failedDraftRawOutput"
      placeholder="在这里修 XML 结构或补字段。"
      :source-label="activeFailedDraft.source.label"
      title="修复解析失败草稿"
      @delete="removeFailedDraft(activeFailedDraft.id)"
      @reparse="reparseFailedDraft"
    />
  </section>
</template>

<script setup lang="ts">
import BaguDetailPage from '@/components/BaguDetailPage.vue';
import FailedDraftRepairPage from '@/components/FailedDraftRepairPage.vue';
import ForumBoardPage from '@/components/forum/ForumBoardPage.vue';
import ForumBoardEditorPage from '@/components/forum/ForumBoardEditorPage.vue';
import ForumCatalogPage from '@/components/forum/ForumCatalogPage.vue';
import ForumThreadDetailPage from '@/components/forum/ForumThreadDetailPage.vue';
import ForumThreadEditorPage from '@/components/forum/ForumThreadEditorPage.vue';
import ForumPreviewPage from '@/components/forum/ForumPreviewPage.vue';
import GenerationFormPage from '@/components/GenerationFormPage.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { useGenerationReplaySession } from '@/composables/useGenerationReplaySession';
import { createForumReplySnapshots, materializeForumReplies, persistForumReplyDrafts } from '@/core/forumGeneration';
import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import { buildGenerationPreview, captureGenerationPrompt, generateContent } from '@/core/generationService';
import { useForumStore } from '@/store/forum';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import { useRegexDisplayStore } from '@/apps/regex-display/store';
import type { FailedGenerationDraft, GenerationReplaySnapshot, HiddenGenerationRecord } from '@/type/generation';
import { type ForumThread, resolveForumBoardTypeName, resolveForumBoardTypePrompt } from '@/type/forum';
import { canOpenBaguScan } from '@/util/baguScanGate';
import { parseForumRepliesXmlResult, parseForumXmlResult } from '@/util/generation';
import { resolveGenerationReplayReferences } from '@/util/generationReplay';
import { createHiddenGenerationRecord, resolveHiddenGenerationReplay } from '@/util/hiddenGenerationRecord';
import { usePreviewDraftPersistence } from '@/util/previewDrafts';
import { formatGenerationReferences, type GenerationReferenceItem } from '@/util/references';
import { resolveContentVersion } from '@/util/contentVersions';
import { applyRegexDisplayRules, getRegexRulesByIds } from '@/util/regexDisplay';
import { useInvalidRouteFallback } from '@/util/routeFallback';
import { stopGenerationByIdSafe } from '@/util/runtime';
import { storeToRefs } from 'pinia';

type ThreadSortMode = 'favorite' | 'heat' | 'latestPublish' | 'latestReply';
type BoardNameMode = 'ai' | 'fixed';
type PreviewReplyDraft = ReturnType<typeof materializeForumReplies>['replies'][number];

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
const sortMode = computed<ThreadSortMode>({
  get: () => settings.value.directorySort.forumMode,
  set: value => {
    settings.value.directorySort.forumMode = value;
  },
});
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
const replyGenerationDraft = reactive({
  fromStartEnd: 20,
  rangeText: '',
  recentCount: 20,
  singleMessageId: 0,
  userRequirement: '',
});
const generationState = reactive({
  error: '',
  generationId: '',
  preview: null as
    | null
    | (
        | {
            action: 'thread';
            author: string;
            boardTypePrompt: string;
            boardId: string;
            boardName: string;
            boardTypeId: string;
            boardTypeName: string;
            content: string;
            draftId: string | null;
            generationRecord?: HiddenGenerationRecord;
            raw: string;
            replies: PreviewReplyDraft[];
            replay?: GenerationReplaySnapshot;
            mode: 'create' | 'rewrite';
            targetThreadId: string;
            targetVersionId: string;
            title: string;
            warnings: string[];
          }
        | {
            action: 'replies';
            boardId: string;
            boardName: string;
            draftId: string | null;
            raw: string;
            replies: PreviewReplyDraft[];
            versionId: string;
            threadId: string;
            threadTitle: string;
            warnings: string[];
          }
      ),
  rawOutput: '',
  running: false,
});
const failedDraftRawOutput = ref('');
const selectedReferences = ref<GenerationReferenceItem[]>([]);
type ForumPreview = NonNullable<typeof generationState.preview>;

const {
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

const sortOptions = [
  { label: '回复', title: '最新回复', value: 'latestReply' as const },
  { label: '发布', title: '最新发布', value: 'latestPublish' as const },
  { label: '热度', title: '热度', value: 'heat' as const },
  { label: '收藏', title: '收藏', value: 'favorite' as const },
];
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
const editingThread = computed(() => {
  const boardId = route.value.params?.boardId;
  const threadId = route.value.params?.threadId;
  return route.value.page === 'thread-editor' && boardId && threadId ? forum.getThread(boardId, threadId) : null;
});
const activeFailedDraft = computed(() => {
  const draftId = route.value.params?.draftId;
  return draftId ? forum.getFailedDraft(draftId) : null;
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
const sortedThreads = computed(() => {
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
    if (sortMode.value === 'favorite') {
      const favoriteCompare = Number(right.favorite) - Number(left.favorite);
      if (favoriteCompare) return favoriteCompare;
      return rightLatestReplyAt.localeCompare(leftLatestReplyAt);
    }
    if (sortMode.value === 'heat') {
      const heatCompare = right.replies.length - left.replies.length;
      if (heatCompare) return heatCompare;
      return rightLatestReplyAt.localeCompare(leftLatestReplyAt);
    }
    if (sortMode.value === 'latestPublish') {
      return right.createdAt.localeCompare(left.createdAt);
    }
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
      threadGenerationDraft.fromStartEnd = 20;
      threadGenerationDraft.rangeText = '';
      threadGenerationDraft.recentCount = 20;
      threadGenerationDraft.singleMessageId = 0;
      threadGenerationDraft.userRequirement = '';
      generationState.error = '';
      generationState.preview = null;
      generationState.rawOutput = '';

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
      replyGenerationDraft.fromStartEnd = 20;
      replyGenerationDraft.rangeText = '';
      replyGenerationDraft.recentCount = 20;
      replyGenerationDraft.singleMessageId = 0;
      replyGenerationDraft.userRequirement = '';
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

onScopeDispose(() => {
  if (generationState.running && generationState.generationId) {
    stopGenerationByIdSafe(generationState.generationId);
  }
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
  void nextTick(() => {
    const screen = document.querySelector('.pc-screen');
    if (!(screen instanceof HTMLElement)) return;
    const top = settings.value.reader.versionNavigatorPosition === 'after' ? screen.scrollHeight : 0;
    screen.scrollTo({ behavior: 'auto', top });
  });
}

async function removeForumVersion(versionId: string) {
  if (!activeBoard.value || !activeThread.value || activeThread.value.versions.length <= 1) return;
  const versionIndex = activeThread.value.versions.findIndex(version => version.id === versionId);
  if (versionIndex < 0) return;
  const shouldDelete = await phone.confirmNotice(
    `要删除当前查看的主题版本 ${versionIndex + 1}/${activeThread.value.versions.length} 吗？该版本的主楼和回复会一起删除。`,
    { confirmLabel: '删除此版本', kind: 'warning' },
  );
  if (!shouldDelete || !activeBoard.value || !activeThread.value) return;
  const versions = [...activeThread.value.versions];
  const previousVersion = versions[(versionIndex - 1 + versions.length) % versions.length];
  const result = forum.deleteThreadVersion(activeBoard.value.id, activeThread.value.id, versionId);
  if (!result) return;
  const thread = previousVersion
    ? forum.activateThreadVersion(activeBoard.value.id, result.thread.id, previousVersion.id)
    : result.thread;
  phone.replacePage('thread', thread?.title || result.activeVersion.title, {
    boardId: activeBoard.value.id,
    threadId: result.thread.id,
    versionId: previousVersion?.id || result.activeVersion.id,
  });
  toastr.success('已删除当前论坛主题版本');
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

function submitBoard() {
  const selectedType = forumBoardTypePrompts.value.find(prompt => prompt.id === boardEditorTypeId.value);
  const boardInput = {
    name: boardDraft.name,
    typeId: selectedType?.id || '',
    typeName: selectedType?.name || (boardDraft.typePrompt.trim() ? '自定义' : ''),
    typePrompt: boardDraft.typePrompt,
  };
  if (editingBoard.value && route.value.params?.boardId) {
    const board = forum.updateBoard(route.value.params.boardId, boardInput);
    if (!board) return;
    phone.replacePage('board', board.name, { boardId: board.id });
    return;
  }
  const board = forum.createBoard(boardInput);
  phone.replacePage('board', board.name, { boardId: board.id });
}

function selectBoardEditorType(promptId: string) {
  if (promptId === CUSTOM_BOARD_TYPE_ID) {
    boardEditorTypeId.value = CUSTOM_BOARD_TYPE_ID;
    boardDraft.typePrompt = '';
    return;
  }
  const prompt = prompts.getTypePrompt(promptId);
  if (!prompt || prompt.domain !== 'forum-board') {
    boardEditorTypeId.value = CUSTOM_BOARD_TYPE_ID;
    return;
  }
  boardEditorTypeId.value = prompt.id;
  boardDraft.typePrompt = prompt.prompt;
  if (!boardDraft.name.trim()) boardDraft.name = prompt.name;
}

function markBoardEditorTypeCustom() {
  const selected = forumBoardTypePrompts.value.find(prompt => prompt.id === boardEditorTypeId.value);
  if (selected?.prompt.trim() === boardDraft.typePrompt.trim()) return;
  boardEditorTypeId.value = CUSTOM_BOARD_TYPE_ID;
}

function selectThreadEditorBoardType(promptId: string) {
  if (promptId === CUSTOM_BOARD_TYPE_ID) {
    threadDraft.boardTypeId = CUSTOM_BOARD_TYPE_ID;
    threadDraft.boardTypePrompt = '';
    return;
  }
  const prompt = prompts.getTypePrompt(promptId);
  if (!prompt || prompt.domain !== 'forum-board') {
    threadDraft.boardTypeId = CUSTOM_BOARD_TYPE_ID;
    return;
  }
  threadDraft.boardTypeId = prompt.id;
  threadDraft.boardTypePrompt = prompt.prompt;
  if (!threadDraft.boardName.trim()) threadDraft.boardName = prompt.name;
}

function selectThreadBoardType(promptId: string) {
  if (promptId === CUSTOM_BOARD_TYPE_ID) {
    threadGenerationDraft.boardTypeId = CUSTOM_BOARD_TYPE_ID;
    threadGenerationDraft.boardTypePrompt = '';
    return;
  }
  const prompt = prompts.getTypePrompt(promptId);
  if (!prompt || prompt.domain !== 'forum-board') {
    threadGenerationDraft.boardTypeId = CUSTOM_BOARD_TYPE_ID;
    return;
  }
  threadGenerationDraft.boardTypeId = prompt.id;
  threadGenerationDraft.boardTypePrompt = prompt.prompt;
  threadGenerationDraft.boardName = prompt.name;
}

function resolveThreadTargetBoard() {
  if (activeBoard.value) return activeBoard.value;
  if (threadDraft.boardId) {
    if (threadDraft.boardId === CUSTOM_BOARD_ID) {
      // Continue below and create the custom board.
    } else {
      const existing = forum.getBoard(threadDraft.boardId);
      if (existing) return existing;
    }
  }
  const boardName = threadDraft.boardName.trim();
  if (!boardName) {
    throw new Error('请先选择一个板块，或填写新板块名称');
  }
  const selectedType = forumBoardTypePrompts.value.find(prompt => prompt.id === threadDraft.boardTypeId);
  return forum.ensureBoard(boardName, threadDraft.boardTypePrompt, {
    typeId: selectedType?.id || '',
    typeName: selectedType?.name || (threadDraft.boardTypePrompt.trim() ? '自定义' : ''),
  });
}

function submitThread() {
  if (editingThread.value && activeBoard.value && route.value.params?.threadId) {
    const versionId = route.value.params?.versionId;
    const thread = versionId
      ? forum.updateThreadVersion(activeBoard.value.id, route.value.params.threadId, versionId, threadDraft)
      : forum.updateThread(activeBoard.value.id, route.value.params.threadId, threadDraft);
    if (!thread) return;
    phone.replacePage('thread', versionId ? threadDraft.title : thread.title, {
      boardId: activeBoard.value.id,
      threadId: thread.id,
      ...(versionId ? { versionId } : {}),
    });
    return;
  }

  try {
    const board = resolveThreadTargetBoard();
    const created = forum.createThread(board.id, threadDraft);
    if (!created) return;
    phone.replacePage('thread', created.thread.title, { boardId: board.id, threadId: created.thread.id });
  } catch (error) {
    toastr.warning(error instanceof Error ? error.message : '请先补齐板块信息');
  }
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

async function removeBoard(boardId: string) {
  const board = forum.getBoard(boardId);
  const shouldDelete = await phone.confirmNotice(
    `要删除板块“${board?.name || '未命名板块'}”吗？里面的帖子和回复都会一起删除。`,
    {
      confirmLabel: '删除',
      kind: 'warning',
    },
  );
  if (!shouldDelete) return;
  forum.deleteBoard(boardId);
  toastr.success('已删除板块');
}

async function removeThread(boardId: string, threadId: string) {
  const thread = forum.getThread(boardId, threadId);
  if (thread && thread.versions.length > 1) {
    await removeForumVersion(viewedForumVersionId.value);
    return;
  }
  const shouldDelete = await phone.confirmNotice(
    `要删除帖子“${thread?.title || '未命名帖子'}”的最后一个版本吗？主楼、回复和帖子记录会一起移除。`,
    {
      confirmLabel: '删除',
      kind: 'warning',
    },
  );
  if (!shouldDelete) return;
  forum.deleteThread(boardId, threadId);
  const board = forum.getBoard(boardId);
  if (!board) {
    phone.goHome();
    toastr.success('已删帖');
    return;
  }
  phone.replacePage('board', board.name, { boardId });
  toastr.success('已删帖');
}

function buildThreadOutputFormat() {
  return prompts.resolveOutputFormat('forum.thread');
}

function buildThreadGenerationConfig() {
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
    [`第 ${index + 1} 层 · ${reply.author}`, reply.content].join('\n'),
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

async function runThreadGeneration() {
  generationState.error = '';
  clearForumPreviewDraft();
  generationState.preview = null;
  generationState.rawOutput = '';

  try {
    const config = buildThreadGenerationConfig();
    const result = await generateContent(forumThreadGenerationAdapter, config, {
      createFailedDraft: input => forum.createFailedDraft(input),
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
        fromStartEnd: threadGenerationDraft.fromStartEnd,
        mode: settings.value.generation.sourceMode,
        rangeText: threadGenerationDraft.rangeText,
        recentCount: threadGenerationDraft.recentCount,
        singleMessageId: threadGenerationDraft.singleMessageId,
      },
      textProvider: settings.value.textProvider,
    });

    if (result.status === 'failed') {
      generationState.error = result.warnings.join('；') || '模型没有返回可解析的论坛 XML';
      failedDraftRawOutput.value = result.rawOutput;
      toastr.warning('XML 解析失败，已保存到失败草稿');
      void phone.presentGeneratedPage('forum', 'failed-draft', '解析失败草稿', { draftId: result.draft.id });
      return;
    }

    if (result.status === 'saved') {
      toastr.success(forumThreadGenerationMode.value === 'rewrite' ? '已保存并切换到主帖新版本' : '已生成并保存帖子');
      void phone.presentGeneratedPage('forum', 'thread', result.data.title, {
        boardId: result.saved.board.id,
        threadId: result.saved.thread.id,
        ...(result.saved.versionId ? { versionId: result.saved.versionId } : {}),
      });
      return;
    }

    const materialized = materializeForumReplies([], result.data.replies, result.source);
    generationState.preview = {
      action: 'thread',
      author: result.data.author,
      boardTypePrompt: config.boardTypePrompt,
      boardId: config.boardId,
      boardName: config.boardName || result.data.board,
      boardTypeId: config.boardTypeId,
      boardTypeName: config.boardTypeName,
      content: result.data.content,
      draftId: null,
      raw: result.rawOutput,
      replies: materialized.replies,
      generationRecord: result.generationRecord,
      mode: forumThreadGenerationMode.value,
      targetThreadId: rewriteForumThread.value?.id || '',
      targetVersionId: rewriteForumVersion.value?.id || '',
      title: result.data.title,
      warnings: [...result.warnings, ...materialized.warnings],
    };
    persistForumPreviewDraft({
      ...(generationState.preview.boardId ? { boardId: generationState.preview.boardId } : {}),
      ...(generationState.preview.targetThreadId ? { rewriteThreadId: generationState.preview.targetThreadId } : {}),
      ...(generationState.preview.targetVersionId ? { versionId: generationState.preview.targetVersionId } : {}),
    });
    void phone.presentGeneratedPage('forum', 'preview', '生成预览', {
      ...(generationState.preview.boardId ? { boardId: generationState.preview.boardId } : {}),
      ...(generationState.preview.targetThreadId ? { rewriteThreadId: generationState.preview.targetThreadId } : {}),
      ...(generationState.preview.targetVersionId ? { versionId: generationState.preview.targetVersionId } : {}),
    });
  } catch (error) {
    generationState.error = error instanceof Error ? error.message : '生成失败，请稍后再试';
  }
}

async function runReplyGeneration() {
  const boardId = route.value.params?.boardId;
  const threadId = route.value.params?.threadId;
  const thread = viewedForumThread.value;
  if (!boardId || !threadId || !thread) return;

  generationState.error = '';
  clearForumPreviewDraft();
  generationState.preview = null;
  generationState.rawOutput = '';

  try {
    const result = await generateContent(
      forumReplyGenerationAdapter,
      {
        appPrompt: prompts.specialPrompts.forumReplies,
        boardId,
        outputFormat: buildRepliesOutputFormat(),
        threadContext: buildReplyThreadContext(thread),
        threadId,
        userRequirement: replyGenerationDraft.userRequirement,
        versionId: viewedForumVersionId.value,
      },
      {
        createFailedDraft: input => forum.createFailedDraft(input),
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
          fromStartEnd: replyGenerationDraft.fromStartEnd,
          mode: settings.value.generation.sourceMode,
          rangeText: replyGenerationDraft.rangeText,
          recentCount: replyGenerationDraft.recentCount,
          singleMessageId: replyGenerationDraft.singleMessageId,
        },
        textProvider: settings.value.textProvider,
      },
    );

    if (result.status === 'failed') {
      generationState.error = result.warnings.join('；') || '模型没有返回可解析的论坛回复 XML';
      failedDraftRawOutput.value = result.rawOutput;
      toastr.warning('XML 解析失败，已保存到失败草稿');
      void phone.presentGeneratedPage('forum', 'failed-draft', '解析失败草稿', { draftId: result.draft.id });
      return;
    }

    if (result.status === 'saved') {
      toastr.success('已生成并保存回复');
      void phone.presentGeneratedPage('forum', 'thread', thread.title, {
        boardId,
        threadId,
        ...(viewedForumVersionId.value ? { versionId: viewedForumVersionId.value } : {}),
      });
      return;
    }

    const materialized = materializeForumReplies(thread.replies, result.data.replies);
    generationState.preview = {
      action: 'replies',
      boardId,
      boardName: activeBoard.value?.name || '',
      draftId: null,
      raw: result.rawOutput,
      replies: materialized.replies,
      threadId,
      threadTitle: thread.title,
      versionId: viewedForumVersionId.value,
      warnings: [...result.warnings, ...materialized.warnings],
    };
    persistForumPreviewDraft({
      boardId,
      threadId,
      ...(viewedForumVersionId.value ? { versionId: viewedForumVersionId.value } : {}),
    });
    void phone.presentGeneratedPage('forum', 'preview', '生成预览', {
      boardId,
      threadId,
      ...(viewedForumVersionId.value ? { versionId: viewedForumVersionId.value } : {}),
    });
  } catch (error) {
    generationState.error = error instanceof Error ? error.message : '生成失败，请稍后再试';
  }
}

function savePreview() {
  const preview = generationState.preview;
  if (!preview) return;

  if (preview.action === 'thread') {
    const board = preview.boardId
      ? forum.getBoard(preview.boardId) ||
        forum.ensureBoard(preview.boardName, preview.boardTypePrompt, {
          typeId: preview.boardTypeId,
          typeName: preview.boardTypeName,
        })
      : forum.ensureBoard(preview.boardName, preview.boardTypePrompt, {
          typeId: preview.boardTypeId,
          typeName: preview.boardTypeName,
        });
    const previewReplay = preview.generationRecord?.replay || preview.replay;
    const replySnapshots = createForumReplySnapshots(preview.replies, previewReplay?.source);
    const saved =
      preview.mode === 'rewrite' && preview.targetThreadId
        ? forum.appendThreadVersion(board.id, preview.targetThreadId, {
            author: preview.author,
            content: preview.content,
            generationRecord:
              preview.generationRecord ||
              (preview.replay ? createHiddenGenerationRecord('generate-thread', preview.replay) : undefined),
            replies: replySnapshots,
            title: preview.title,
          })
        : forum.createThread(board.id, {
            author: preview.author,
            content: preview.content,
            generationRecord:
              preview.generationRecord ||
              (preview.replay ? createHiddenGenerationRecord('generate-thread', preview.replay) : undefined),
            replies: replySnapshots,
            title: preview.title,
          });
    if (!saved) {
      toastr.warning('目标板块不存在，无法保存帖子');
      return;
    }
    if (preview.draftId) {
      forum.deleteFailedDraft(preview.draftId);
    }
    clearForumPreviewDraft();
    generationState.preview = null;
    const versionId = 'version' in saved ? saved.version.id : '';
    toastr.success(preview.mode === 'rewrite' ? '已保存并切换到主帖新版本' : '已保存帖子');
    phone.replacePage('thread', versionId ? preview.title : saved.thread.title, {
      boardId: board.id,
      threadId: saved.thread.id,
      ...(versionId ? { versionId } : {}),
    });
    return;
  }

  persistForumReplyDrafts(forum.createReply, preview.boardId, preview.threadId, preview.replies, preview.versionId);
  if (preview.draftId) {
    forum.deleteFailedDraft(preview.draftId);
  }
  const thread = forum.getThread(preview.boardId, preview.threadId);
  clearForumPreviewDraft();
  generationState.preview = null;
  toastr.success('已保存回复');
  if (thread) {
    phone.replacePage('thread', thread.title, {
      boardId: preview.boardId,
      threadId: preview.threadId,
      ...(preview.versionId ? { versionId: preview.versionId } : {}),
    });
  }
}

function reparsePreviewRaw() {
  const preview = generationState.preview;
  if (!preview) return false;
  const rawOutput = preview.raw.trim();
  if (!rawOutput) {
    toastr.warning('先补一点可解析的 XML 内容');
    return false;
  }

  if (preview.action === 'thread') {
    const parsed = parseForumXmlResult(rawOutput);
    if (!parsed.ok) {
      preview.raw = rawOutput;
      preview.warnings = parsed.warnings;
      toastr.warning(parsed.warnings.join('；') || '还是没能解析成功');
      return false;
    }

    const materialized = materializeForumReplies([], parsed.data.replies);
    preview.author = parsed.data.author;
    preview.boardName = parsed.data.board || preview.boardName;
    preview.content = parsed.data.content;
    preview.raw = parsed.raw;
    preview.replies = materialized.replies;
    preview.title = parsed.data.title;
    preview.warnings = [...parsed.warnings, ...materialized.warnings];
    toastr.success('已按原始输出重新解析');
    return true;
  }

  const thread = forum.getThread(preview.boardId, preview.threadId);
  if (!thread) {
    toastr.warning('原帖子已经不存在，暂时不能重新解析回复');
    return false;
  }

  const parsed = parseForumRepliesXmlResult(rawOutput);
  if (!parsed.ok) {
    preview.raw = rawOutput;
    preview.warnings = parsed.warnings;
    toastr.warning(parsed.warnings.join('；') || '还是没能解析成功');
    return false;
  }

  const materialized = materializeForumReplies(thread.replies, parsed.data.replies);
  preview.raw = parsed.raw;
  preview.replies = materialized.replies;
  preview.warnings = [...parsed.warnings, ...materialized.warnings];
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
  forum.deleteFailedDraft(draftId);
  failedDraftRawOutput.value = '';
  if (route.value.page === 'failed-draft') {
    phone.replacePage('root', '论坛板块');
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

  if (draft.actionId === 'generate-thread') {
    const parsed = parseForumXmlResult(rawOutput);
    if (!parsed.ok) {
      forum.updateFailedDraft(draft.id, {
        rawOutput,
        warnings: parsed.warnings,
      });
      failedDraftRawOutput.value = rawOutput;
      toastr.warning(parsed.warnings.join('；') || '还是没能解析成功');
      return;
    }

    const materialized = materializeForumReplies([], parsed.data.replies);
    forum.updateFailedDraft(draft.id, {
      rawOutput: parsed.raw,
      warnings: [...parsed.warnings, ...materialized.warnings],
    });
    generationState.preview = {
      action: 'thread',
      author: parsed.data.author,
      boardTypePrompt:
        typeof draft.context.boardTypePrompt === 'string'
          ? draft.context.boardTypePrompt
          : typeof draft.context.boardDescription === 'string'
            ? draft.context.boardDescription
            : '',
      boardId: typeof draft.context.boardId === 'string' ? draft.context.boardId : '',
      boardName: (typeof draft.context.boardName === 'string' ? draft.context.boardName : '') || parsed.data.board,
      boardTypeId: typeof draft.context.boardTypeId === 'string' ? draft.context.boardTypeId : '',
      boardTypeName: typeof draft.context.boardTypeName === 'string' ? draft.context.boardTypeName : '',
      content: parsed.data.content,
      draftId: null,
      generationRecord: draft.generationRecord,
      raw: parsed.raw,
      replies: materialized.replies,
      mode: draft.context.mode === 'rewrite' ? 'rewrite' : 'create',
      targetThreadId: typeof draft.context.threadId === 'string' ? draft.context.threadId : '',
      targetVersionId: '',
      title: parsed.data.title,
      warnings: [...parsed.warnings, ...materialized.warnings],
    };
    persistForumPreviewDraft(generationState.preview.boardId ? { boardId: generationState.preview.boardId } : {});
    forum.deleteFailedDraft(draft.id);
    failedDraftRawOutput.value = '';
    phone.replacePage(
      'preview',
      '生成预览',
      generationState.preview.boardId ? { boardId: generationState.preview.boardId } : undefined,
    );
    return;
  }

  const boardId = typeof draft.context.boardId === 'string' ? draft.context.boardId : '';
  const threadId = typeof draft.context.threadId === 'string' ? draft.context.threadId : '';
  const thread = boardId && threadId ? forum.getThread(boardId, threadId) : null;
  const versionId = typeof draft.context.versionId === 'string' ? draft.context.versionId : '';
  if (!thread) {
    toastr.warning('原帖子已经不存在，暂时不能恢复这条回复草稿');
    return;
  }

  const parsed = parseForumRepliesXmlResult(rawOutput);
  if (!parsed.ok) {
    forum.updateFailedDraft(draft.id, {
      rawOutput,
      warnings: parsed.warnings,
    });
    failedDraftRawOutput.value = rawOutput;
    toastr.warning(parsed.warnings.join('；') || '还是没能解析成功');
    return;
  }

  const targetReplies = thread.versions.find(version => version.id === versionId)?.replies || thread.replies;
  const materialized = materializeForumReplies(targetReplies, parsed.data.replies);
  forum.updateFailedDraft(draft.id, {
    rawOutput: parsed.raw,
    warnings: [...parsed.warnings, ...materialized.warnings],
  });
  generationState.preview = {
    action: 'replies',
    boardId,
    boardName: forum.getBoard(boardId)?.name || '论坛板块',
    draftId: null,
    raw: parsed.raw,
    replies: materialized.replies,
    threadId,
    threadTitle: thread.title,
    versionId,
    warnings: [...parsed.warnings, ...materialized.warnings],
  };
  persistForumPreviewDraft({ boardId, threadId, ...(versionId ? { versionId } : {}) });
  forum.deleteFailedDraft(draft.id);
  failedDraftRawOutput.value = '';
  phone.replacePage('preview', '生成预览', { boardId, threadId, ...(versionId ? { versionId } : {}) });
}
</script>

<style scoped>
.pc-forum-app {
  min-height: 100%;
}

.pc-forum-type-fields {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}

.pc-forum-type-fields :is(.pc-field, .pc-area) {
  margin-top: 0;
}

.pc-forum-type-fields .pc-area {
  min-height: 120px;
}

.pc-forum-name-mode {
  align-self: flex-start;
}

.pc-preview-card {
  margin-top: 14px;
  padding: 14px;
  border: 1px solid var(--pc-border);
  border-radius: min(var(--pc-card-radius), 8px);
  background: color-mix(in srgb, var(--pc-surface) 72%, transparent 28%);
  backdrop-filter: blur(12px);
}

.pc-preview-card p {
  margin: 6px 0 0;
  color: var(--pc-muted);
}
</style>
