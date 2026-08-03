<template>
  <section class="pc-forum-app">
    <section v-if="route.page === 'root'" class="pc-forum-page">
      <div class="pc-forum-hero actions-only">
        <div class="pc-hero-actions">
          <button class="pc-soft-btn" type="button" @click="openGenerateThread()">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
            <span>{{ t`生成帖子` }}</span>
          </button>
          <button class="pc-primary-btn" type="button" @click="openCreateBoard()">
            <i class="fa-solid fa-plus"></i>
            <span>{{ t`新建板块` }}</span>
          </button>
        </div>
      </div>

      <EmptyState v-if="!boards.length" :title="t`还没有论坛板块`" />

      <div v-else class="pc-board-list">
        <article v-for="board in boards" :key="board.id" class="pc-board-card">
          <button class="pc-board-main" type="button" @click="openBoard(board.id)">
            <div>
              <strong>{{ board.name }}</strong>
              <p>{{ formatBoardMeta(board.threads.length) }}</p>
            </div>
          </button>
          <div class="pc-board-actions">
            <button class="pc-icon-btn" type="button" @click="openEditBoard(board.id)">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="pc-icon-btn danger" type="button" @click="removeBoard(board.id)">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </article>
      </div>

      <FailedDraftList
        :drafts="failedDrafts"
        :get-context="failedDraftContextSummary"
        :get-title="failedDraftTitle"
        @open="openFailedDraft"
        @remove="removeFailedDraft"
      />

      <PreviewDraftNotice
        :draft="forumPreviewDraft"
        @discard="discardForumPreviewDraft"
        @open="openForumPreviewDraft"
      />
    </section>

    <section v-else-if="route.page === 'board-editor'" class="pc-forum-page">
      <div class="pc-editor-card">
        <span class="pc-kicker">{{ editingBoard ? t`编辑板块` : t`新建板块` }}</span>
        <h2>{{ editingBoard ? editingBoard.name : t`建立一个新的板块` }}</h2>
        <SearchableCombobox
          :empty-label="t`没有匹配的板块类型`"
          :input-label="t`选择论坛板块类型`"
          :model-value="boardEditorTypeId"
          :options="boardTypeOptions"
          :placeholder="t`选择论坛板块类型`"
          :toggle-title="t`展开论坛板块类型`"
          @update:model-value="selectBoardEditorType"
        />
        <input v-model="boardDraft.name" class="pc-field" type="text" :placeholder="t`板块名称`" />
        <textarea
          v-model="boardDraft.description"
          class="pc-area compact"
          :placeholder="t`板块类型提示词（可编辑）`"
          @input="markBoardEditorTypeCustom"
        ></textarea>
        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
          <button class="pc-primary-btn" type="button" @click="submitBoard">{{ t`保存` }}</button>
        </div>
      </div>
    </section>

    <section v-else-if="route.page === 'board' && activeBoard" class="pc-forum-page">
      <div class="pc-forum-hero">
        <div>
          <span class="pc-kicker">{{ t`帖子列表` }}</span>
          <h2>{{ activeBoard.name }}</h2>
          <small v-if="activeBoardTypeLabel" class="pc-board-type-label">
            {{ t`类型` }} · {{ activeBoardTypeLabel }}
          </small>
        </div>
        <div class="pc-hero-actions">
          <button class="pc-soft-btn compact" type="button" @click="openGenerateThread(activeBoard.id)">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
            <span>{{ t`生成帖子` }}</span>
          </button>
          <button class="pc-primary-btn compact" type="button" @click="openCreateThread(activeBoard.id)">
            <i class="fa-solid fa-file-circle-plus"></i>
            <span>{{ t`发帖` }}</span>
          </button>
        </div>
      </div>

      <div class="pc-toolbar">
        <input v-model="query" class="pc-search" type="text" :placeholder="t`搜索标题、作者或正文`" />
        <div class="pc-sort-group">
          <button
            v-for="option in sortOptions"
            :key="option.value"
            :class="['pc-sort-btn', { active: sortMode === option.value }]"
            type="button"
            :title="option.title"
            @click="sortMode = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <EmptyState v-if="!sortedThreads.length" :title="t`还没有匹配的帖子`" />

      <div v-else class="pc-entry-list">
        <article v-for="thread in sortedThreads" :key="thread.id" class="pc-entry-card">
          <button class="pc-entry-main" type="button" @click="openThread(activeBoard.id, thread.id)">
            <div class="pc-entry-head">
              <strong>{{ thread.title }}</strong>
            </div>
            <p>{{ thread.author }} · {{ thread.replies.length }} {{ t`条回复` }}</p>
          </button>
          <button class="pc-favorite-chip" type="button" @click="forum.toggleFavorite(activeBoard.id, thread.id)">
            <i class="fa-solid fa-bookmark" :data-active="thread.favorite"></i>
          </button>
        </article>
      </div>
    </section>

    <section v-else-if="route.page === 'thread-editor'" class="pc-forum-page">
      <div class="pc-editor-card">
        <span class="pc-kicker">{{ editingThread ? t`编辑帖子` : t`发布帖子` }}</span>
        <h2>{{ editingThread ? editingThread.title : t`写一篇新的主楼` }}</h2>

        <template v-if="!editingThread">
          <SearchableCombobox
            v-if="!activeBoard"
            :input-label="t`选择或搜索论坛板块`"
            :model-value="threadDraft.boardId"
            :options="boardSelectionOptions"
            :placeholder="t`选择或搜索论坛板块`"
            :toggle-title="t`展开论坛板块`"
            @update:model-value="threadDraft.boardId = $event"
          />
          <SearchableCombobox
            v-if="!activeBoard && threadDraft.boardId === CUSTOM_BOARD_ID"
            :input-label="t`选择论坛板块类型`"
            :model-value="threadDraft.boardTypeId"
            :options="boardTypeOptions"
            :placeholder="t`选择论坛板块类型`"
            :toggle-title="t`展开论坛板块类型`"
            @update:model-value="selectThreadEditorBoardType"
          />
          <input
            v-if="!activeBoard && threadDraft.boardId === CUSTOM_BOARD_ID"
            v-model="threadDraft.boardName"
            class="pc-field"
            type="text"
            :placeholder="t`新板块名称`"
          />
          <textarea
            v-if="!activeBoard && threadDraft.boardId === CUSTOM_BOARD_ID"
            v-model="threadDraft.boardDescription"
            class="pc-area compact"
            :placeholder="t`板块类型提示词（可编辑）`"
            @input="threadDraft.boardTypeId = CUSTOM_BOARD_TYPE_ID"
          ></textarea>
        </template>

        <input v-model="threadDraft.author" class="pc-field" type="text" :placeholder="t`主楼作者`" />
        <input v-model="threadDraft.title" class="pc-field" type="text" :placeholder="t`帖子标题`" />
        <textarea
          v-model="threadDraft.content"
          class="pc-area pc-saved-content-area"
          :placeholder="t`主楼正文`"
        ></textarea>
        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
          <button class="pc-primary-btn" type="button" @click="submitThread">{{ t`保存` }}</button>
        </div>
      </div>
    </section>

    <section v-else-if="route.page === 'thread' && activeBoard && activeThread" class="pc-forum-page">
      <div class="pc-detail-card">
        <span class="pc-kicker">{{ activeBoard.name }}</span>
        <div class="pc-detail-title-row">
          <h2>{{ viewedForumThread.title }}</h2>
        </div>
        <div class="pc-detail-meta">
          <span>{{ viewedForumThread.author }}</span>
          <span>{{ activeThread.favorite ? t`已收藏` : t`未收藏` }}</span>
        </div>
        <VersionNavigator
          :active-version-id="activeThread.activeVersionId"
          :versions="activeThread.versions"
          :viewed-version-id="viewedForumVersionId"
          @adopt="adoptForumVersion"
          @select="selectForumVersion"
        />
        <ReaderContent :content="viewedForumThread.content" />
      </div>
      <div class="pc-detail-footer pc-forum-thread-footer">
        <div class="pc-detail-actions six">
          <button class="pc-soft-btn" type="button" :title="t`八股检测`" @click="openForumBaguScan">
            <i class="fa-solid fa-filter-circle-xmark"></i>
          </button>
          <button
            class="pc-soft-btn"
            type="button"
            :title="t`生成回复`"
            @click="openGenerateReplies(activeBoard.id, activeThread.id)"
          >
            <i class="fa-solid fa-wand-magic-sparkles"></i>
          </button>
          <button
            :class="['pc-soft-btn', { active: activeThread.favorite }]"
            type="button"
            :title="activeThread.favorite ? t`取消收藏` : t`收藏`"
            @click="forum.toggleFavorite(activeBoard.id, activeThread.id)"
          >
            <i class="fa-solid fa-bookmark"></i>
          </button>
          <button
            class="pc-soft-btn"
            type="button"
            :title="t`编辑主楼`"
            @click="openEditThread(activeBoard.id, activeThread.id, viewedForumVersionId)"
          >
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="pc-soft-btn" type="button" :title="t`重写主帖`" @click="openRewriteThread">
            <i class="fa-solid fa-rotate"></i>
          </button>
          <button
            class="pc-soft-btn danger"
            type="button"
            :title="t`删帖`"
            @click="removeThread(activeBoard.id, activeThread.id)"
          >
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>

      <section class="pc-reply-section">
        <div class="pc-section-head">
          <strong>{{ t`回复` }}</strong>
          <p>{{ `${activeThread.replies.length} 条` }}</p>
        </div>

        <EmptyState v-if="!activeThread.replies.length" compact :title="t`还没有回复。`" />

        <div v-else class="pc-reply-list">
          <article v-for="reply in displayedReplies" :key="reply.id" class="pc-reply-card">
            <div class="pc-reply-head">
              <strong>{{ reply.author }}</strong>
              <span>{{ `第 ${reply.floor} 层` }}</span>
            </div>
            <p class="pc-reply-content">{{ reply.content }}</p>
          </article>
        </div>

        <div class="pc-detail-footer pc-forum-thread-footer">
          <div class="pc-detail-actions six">
            <button class="pc-soft-btn" type="button" :title="t`八股检测`" @click="openForumBaguScan">
              <i class="fa-solid fa-filter-circle-xmark"></i>
            </button>
            <button
              class="pc-soft-btn"
              type="button"
              :title="t`生成回复`"
              @click="openGenerateReplies(activeBoard.id, activeThread.id)"
            >
              <i class="fa-solid fa-wand-magic-sparkles"></i>
            </button>
            <button
              :class="['pc-soft-btn', { active: activeThread.favorite }]"
              type="button"
              :title="activeThread.favorite ? t`取消收藏` : t`收藏`"
              @click="forum.toggleFavorite(activeBoard.id, activeThread.id)"
            >
              <i class="fa-solid fa-bookmark"></i>
            </button>
            <button
              class="pc-soft-btn"
              type="button"
              :title="t`编辑主楼`"
              @click="openEditThread(activeBoard.id, activeThread.id, viewedForumVersionId)"
            >
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="pc-soft-btn" type="button" :title="t`重写主帖`" @click="openRewriteThread">
              <i class="fa-solid fa-rotate"></i>
            </button>
            <button
              class="pc-soft-btn danger"
              type="button"
              :title="t`删帖`"
              @click="removeThread(activeBoard.id, activeThread.id)"
            >
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      </section>
    </section>

    <section v-else-if="route.page === 'bagu-scan' && activeBoard && activeThread" class="pc-forum-page">
      <div class="pc-detail-card">
        <span class="pc-kicker">{{ activeBoard.name }}</span>
        <div class="pc-detail-title-row">
          <h2>{{ viewedForumThread.title }}</h2>
        </div>
        <div class="pc-detail-meta">
          <span>{{ viewedForumThread.author }}</span>
          <span>{{ activeThread.favorite ? t`已收藏` : t`未收藏` }}</span>
        </div>
        <BaguScanPanel
          auto-scan
          class="pc-detail-bagu-panel"
          :content="viewedForumThread.content"
          :apply-handler="applyForumBaguContent"
        />
      </div>
    </section>

    <section v-else-if="route.page === 'generate-thread'" class="pc-forum-page">
      <div class="pc-editor-card">
        <span class="pc-kicker">{{ t`AI 生成` }}</span>
        <h2>{{ forumThreadGenerationMode === 'rewrite' ? t`重写当前主帖` : t`生成一个新帖子` }}</h2>

        <GenerationPanel
          :capture="captureForumThreadPrompt"
          :capture-reset-key="forumPromptPreview"
          :error="generationState.error"
          :from-start-end="threadGenerationDraft.fromStartEnd"
          :range-text="threadGenerationDraft.rangeText"
          :raw-output="generationState.rawOutput"
          :recent-count="threadGenerationDraft.recentCount"
          :references="selectedReferences"
          requirement-placeholder="例如：主楼更像资深版友发的长帖，回复风格分化明显。"
          :running="generationState.running"
          :single-message-id="threadGenerationDraft.singleMessageId"
          :source-mode="settings.generation.sourceMode"
          :user-requirement="threadGenerationDraft.userRequirement"
          @cancel="phone.goBack()"
          @generate="runThreadGeneration"
          @stop="stopGeneration"
          @update:from-start-end="threadGenerationDraft.fromStartEnd = $event"
          @update:range-text="threadGenerationDraft.rangeText = $event"
          @update:recent-count="threadGenerationDraft.recentCount = $event"
          @update:references="selectedReferences = $event"
          @update:single-message-id="threadGenerationDraft.singleMessageId = $event"
          @update:source-mode="settings.generation.sourceMode = $event"
          @update:user-requirement="threadGenerationDraft.userRequirement = $event"
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
                v-model="threadGenerationDraft.boardDescription"
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
        </GenerationPanel>
      </div>
    </section>

    <section v-else-if="route.page === 'generate-replies' && activeBoard && activeThread" class="pc-forum-page">
      <div class="pc-editor-card">
        <span class="pc-kicker">{{ t`AI 续回` }}</span>
        <h2>{{ t`生成新的回复` }}</h2>

        <GenerationPanel
          :capture="captureForumReplyPrompt"
          :capture-reset-key="forumPromptPreview"
          :error="generationState.error"
          :from-start-end="replyGenerationDraft.fromStartEnd"
          :range-text="replyGenerationDraft.rangeText"
          :raw-output="generationState.rawOutput"
          :recent-count="replyGenerationDraft.recentCount"
          :references="selectedReferences"
          requirement-placeholder="例如：让不同楼层意见更分裂。"
          :running="generationState.running"
          :single-message-id="replyGenerationDraft.singleMessageId"
          :source-mode="settings.generation.sourceMode"
          :user-requirement="replyGenerationDraft.userRequirement"
          @cancel="phone.goBack()"
          @generate="runReplyGeneration"
          @stop="stopGeneration"
          @update:from-start-end="replyGenerationDraft.fromStartEnd = $event"
          @update:range-text="replyGenerationDraft.rangeText = $event"
          @update:recent-count="replyGenerationDraft.recentCount = $event"
          @update:references="selectedReferences = $event"
          @update:single-message-id="replyGenerationDraft.singleMessageId = $event"
          @update:source-mode="settings.generation.sourceMode = $event"
          @update:user-requirement="replyGenerationDraft.userRequirement = $event"
        >
          <template #before-fields>
            <div class="pc-preview-card">
              <strong>{{ t`上下文` }}</strong>
              <p>{{ t`基于主楼和已有回复继续生成` }}</p>
            </div>
          </template>
        </GenerationPanel>
      </div>
    </section>

    <section
      v-else-if="route.page === 'preview' && generationState.preview"
      class="pc-forum-page pc-generation-preview-page"
    >
      <div class="pc-detail-card pc-generation-preview-card">
        <GenerationPreviewPanel
          :content="
            generationState.preview.action === 'thread'
              ? generationState.preview.content
              : generationState.preview.replies.map(reply => reply.content).join('\n')
          "
          :raw="generationState.preview.raw"
          raw-editable
          :reparse-handler="reparsePreviewRaw"
          :save-label="
            generationState.preview.action === 'thread'
              ? generationState.preview.mode === 'rewrite'
                ? '保存候选版本'
                : '保存帖子'
              : '保存回复'
          "
          :scan-enabled="false"
          :source-label="generationState.preview.boardName"
          :text-provider-summary="
            generationState.preview.action === 'thread'
              ? generationState.preview.author
              : `${generationState.preview.replies.length} ${t`条回复`}`
          "
          :title="
            generationState.preview.action === 'thread'
              ? generationState.preview.title
              : generationState.preview.threadTitle
          "
          :warnings="generationState.preview.warnings"
          @back="returnToGenerate"
          @reparse="reparsePreviewRaw"
          @save="savePreview"
          @update:raw="generationState.preview.raw = $event"
        >
          <template #content="{ renderedContent }">
            <article
              v-if="generationState.preview?.action === 'thread'"
              class="pc-detail-content pc-rendered-markdown"
              v-html="renderedContent"
            ></article>
            <BaguScanPanel
              v-if="generationState.preview?.action === 'thread'"
              auto-scan
              :content="generationState.preview.content"
              @apply="updatePreviewThreadContent"
            />

            <section class="pc-reply-section">
              <div class="pc-section-head">
                <strong>{{ generationState.preview?.action === 'thread' ? t`预览回复` : t`回复预览` }}</strong>
                <p>{{ `${generationState.preview?.replies.length || 0} 条` }}</p>
              </div>
              <EmptyState v-if="!generationState.preview?.replies.length" compact :title="t`没有回复内容。`" />
              <div v-else class="pc-reply-list">
                <article v-for="reply in previewReplies" :key="reply.key" class="pc-reply-card">
                  <div class="pc-reply-head">
                    <strong>{{ reply.author }}</strong>
                    <span>{{ `第 ${reply.floor} 层` }}</span>
                  </div>
                  <p class="pc-reply-content">{{ reply.content }}</p>
                </article>
              </div>
            </section>
          </template>
        </GenerationPreviewPanel>
      </div>
    </section>

    <section v-else-if="route.page === 'failed-draft' && activeFailedDraft" class="pc-forum-page pc-repair-page">
      <div class="pc-editor-card pc-repair-card">
        <span class="pc-kicker">{{ activeFailedDraft.source.label }}</span>
        <h2>{{ t`修复解析失败草稿` }}</h2>

        <RawOutputEditor
          v-model="failedDraftRawOutput"
          :placeholder="t`在这里修 XML 结构或补字段。`"
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
import BaguScanPanel from '@/components/BaguScanPanel.vue';
import EmptyState from '@/components/EmptyState.vue';
import FailedDraftList from '@/components/FailedDraftList.vue';
import GenerationPanel from '@/components/GenerationPanel.vue';
import GenerationPreviewPanel from '@/components/GenerationPreviewPanel.vue';
import PreviewDraftNotice from '@/components/PreviewDraftNotice.vue';
import RawOutputEditor from '@/components/RawOutputEditor.vue';
import ReaderContent from '@/components/ReaderContent.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import VersionNavigator from '@/components/VersionNavigator.vue';
import { materializeForumReplies, persistForumReplyDrafts } from '@/core/forumGeneration';
import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import { buildGenerationPreview, captureGenerationPrompt, generateContent } from '@/core/generationService';
import { useForumStore } from '@/store/forum';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import type { FailedGenerationDraft } from '@/type/generation';
import { type ForumThread, resolveForumBoardTypeName, resolveForumBoardTypePrompt } from '@/type/forum';
import { canOpenBaguScan } from '@/util/baguScanGate';
import { parseForumRepliesXmlResult, parseForumXmlResult } from '@/util/generation';
import { usePreviewDraftPersistence } from '@/util/previewDrafts';
import { formatGenerationReferences, type GenerationReferenceItem } from '@/util/references';
import { resolveContentVersion } from '@/util/contentVersions';
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
const forumThreadGenerationAdapter = getRegisteredPhoneGenerationAdapter('forum', 'generate-thread');
const forumReplyGenerationAdapter = getRegisteredPhoneGenerationAdapter('forum', 'generate-replies');
const { boards, failedDrafts } = storeToRefs(forum);
const { currentRoute: route } = storeToRefs(phone);
const { typePrompts } = storeToRefs(prompts);
const { settings } = storeToRefs(settingsStore);

const query = ref('');
const sortMode = ref<ThreadSortMode>('latestReply');
const boardEditorTypeId = ref('');
const boardDraft = reactive({
  description: '',
  name: '',
});
const threadDraft = reactive({
  author: '',
  boardDescription: '',
  boardId: CUSTOM_BOARD_ID,
  boardName: '',
  boardTypeId: CUSTOM_BOARD_TYPE_ID,
  content: '',
  title: '',
});
const threadGenerationDraft = reactive({
  boardDescription: '',
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
            boardDescription: string;
            boardId: string;
            boardName: string;
            boardTypeId: string;
            boardTypeName: string;
            content: string;
            draftId: string | null;
            raw: string;
            replies: PreviewReplyDraft[];
            mode: 'create' | 'rewrite';
            targetThreadId: string;
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
      return { boardId: preview.boardId, threadId: preview.threadId };
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
const activeBoardTypeLabel = computed(() => {
  if (!activeBoard.value || !resolveForumBoardTypePrompt(activeBoard.value)) return '';
  return resolveForumBoardTypeName(activeBoard.value);
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
    ? { ...thread, author: version.author, content: version.content, title: version.title }
    : thread;
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
          threadContext: buildReplyThreadContext(activeThread.value),
          threadId,
          userRequirement: replyGenerationDraft.userRequirement,
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
      threadContext: buildReplyThreadContext(activeThread.value),
      threadId,
      userRequirement: replyGenerationDraft.userRequirement,
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
  (activeThread.value?.replies || []).map((reply, index) => ({
    ...reply,
    floor: index + 1,
  })),
);
const previewReplies = computed(() => {
  const existingCount =
    generationState.preview?.action === 'replies' && generationState.preview.threadId && generationState.preview.boardId
      ? forum.getThread(generationState.preview.boardId, generationState.preview.threadId)?.replies.length || 0
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
    if (current.appId !== 'forum') return;
    if (current.page === 'board-editor') {
      boardDraft.description = editingBoard.value ? resolveForumBoardTypePrompt(editingBoard.value) : '';
      boardDraft.name = editingBoard.value?.name || '';
      const matchedType = forumBoardTypePrompts.value.find(
        item => item.id === editingBoard.value?.typeId || item.prompt.trim() === boardDraft.description.trim(),
      );
      boardEditorTypeId.value = matchedType?.id || CUSTOM_BOARD_TYPE_ID;
    }

    if (current.page === 'thread-editor') {
      if (editingThread.value) {
        threadDraft.author = viewedForumThread.value?.author || editingThread.value.author;
        threadDraft.boardDescription = activeBoard.value ? resolveForumBoardTypePrompt(activeBoard.value) : '';
        threadDraft.boardId = activeBoard.value?.id || '';
        threadDraft.boardName = activeBoard.value?.name || '';
        threadDraft.boardTypeId = activeBoard.value?.typeId || CUSTOM_BOARD_TYPE_ID;
        threadDraft.content = viewedForumThread.value?.content || editingThread.value.content;
        threadDraft.title = viewedForumThread.value?.title || editingThread.value.title;
      } else {
        threadDraft.author = '';
        threadDraft.boardDescription = activeBoard.value ? resolveForumBoardTypePrompt(activeBoard.value) : '';
        threadDraft.boardId = activeBoard.value?.id || CUSTOM_BOARD_ID;
        threadDraft.boardName = activeBoard.value?.name || '';
        threadDraft.boardTypeId = activeBoard.value?.typeId || CUSTOM_BOARD_TYPE_ID;
        threadDraft.content = '';
        threadDraft.title = '';
      }
    }

    if (current.page === 'generate-thread' && previous?.page !== 'preview') {
      selectedReferences.value = [];
      threadGenerationDraft.boardId = activeBoard.value?.id || CUSTOM_BOARD_ID;
      threadGenerationDraft.boardName = activeBoard.value?.name || '';
      threadGenerationDraft.boardDescription = activeBoard.value ? resolveForumBoardTypePrompt(activeBoard.value) : '';
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
  sortMode.value = 'latestReply';
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
  phone.pushPage('generate-thread', '重写论坛主帖', {
    boardId: activeBoard.value.id,
    rewriteThreadId: activeThread.value.id,
    ...(viewedForumVersionId.value ? { versionId: viewedForumVersionId.value } : {}),
  });
}

function selectForumVersion(versionId: string) {
  if (!activeBoard.value || !activeThread.value) return;
  const version = activeThread.value.versions.find(item => item.id === versionId);
  phone.replacePage('thread', version?.title || activeThread.value.title, {
    boardId: activeBoard.value.id,
    threadId: activeThread.value.id,
    versionId,
  });
}

function adoptForumVersion(versionId: string) {
  if (!activeBoard.value || !activeThread.value) return;
  const thread = forum.activateThreadVersion(activeBoard.value.id, activeThread.value.id, versionId);
  if (!thread) return;
  phone.replacePage('thread', thread.title, {
    boardId: activeBoard.value.id,
    threadId: thread.id,
    versionId,
  });
  toastr.success('已采用这个论坛主帖版本');
}

function openGenerateReplies(boardId: string, threadId: string) {
  phone.pushPage('generate-replies', '生成回复', {
    boardId,
    threadId,
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
    typeName: selectedType?.name || (boardDraft.description.trim() ? '自定义' : ''),
    typePrompt: boardDraft.description,
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
    boardDraft.description = '';
    return;
  }
  const prompt = prompts.getTypePrompt(promptId);
  if (!prompt || prompt.domain !== 'forum-board') {
    boardEditorTypeId.value = CUSTOM_BOARD_TYPE_ID;
    return;
  }
  boardEditorTypeId.value = prompt.id;
  boardDraft.description = prompt.prompt;
  if (!boardDraft.name.trim()) boardDraft.name = prompt.name;
}

function markBoardEditorTypeCustom() {
  const selected = forumBoardTypePrompts.value.find(prompt => prompt.id === boardEditorTypeId.value);
  if (selected?.prompt.trim() === boardDraft.description.trim()) return;
  boardEditorTypeId.value = CUSTOM_BOARD_TYPE_ID;
}

function selectThreadEditorBoardType(promptId: string) {
  if (promptId === CUSTOM_BOARD_TYPE_ID) {
    threadDraft.boardTypeId = CUSTOM_BOARD_TYPE_ID;
    threadDraft.boardDescription = '';
    return;
  }
  const prompt = prompts.getTypePrompt(promptId);
  if (!prompt || prompt.domain !== 'forum-board') {
    threadDraft.boardTypeId = CUSTOM_BOARD_TYPE_ID;
    return;
  }
  threadDraft.boardTypeId = prompt.id;
  threadDraft.boardDescription = prompt.prompt;
  if (!threadDraft.boardName.trim()) threadDraft.boardName = prompt.name;
}

function selectThreadBoardType(promptId: string) {
  if (promptId === CUSTOM_BOARD_TYPE_ID) {
    threadGenerationDraft.boardTypeId = CUSTOM_BOARD_TYPE_ID;
    threadGenerationDraft.boardDescription = '';
    return;
  }
  const prompt = prompts.getTypePrompt(promptId);
  if (!prompt || prompt.domain !== 'forum-board') {
    threadGenerationDraft.boardTypeId = CUSTOM_BOARD_TYPE_ID;
    return;
  }
  threadGenerationDraft.boardTypeId = prompt.id;
  threadGenerationDraft.boardDescription = prompt.prompt;
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
  return forum.ensureBoard(boardName, threadDraft.boardDescription, {
    typeId: selectedType?.id || '',
    typeName: selectedType?.name || (threadDraft.boardDescription.trim() ? '自定义' : ''),
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
  const shouldDelete = await phone.confirmNotice(
    `要删除帖子“${thread?.title || '未命名帖子'}”吗？下面的回复也会一起删除。`,
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
    appPrompt:
      forumThreadGenerationMode.value === 'rewrite' ? prompts.appPrompts.forumRewrite : prompts.appPrompts.forum,
    boardDescription: board ? resolveForumBoardTypePrompt(board) : threadGenerationDraft.boardDescription,
    boardId: board?.id || '',
    boardName:
      board?.name || (threadGenerationDraft.boardNameMode === 'fixed' ? threadGenerationDraft.boardName.trim() : ''),
    boardTypeId: board?.typeId || selectedType?.id || '',
    boardTypeName:
      board?.typeName || selectedType?.name || (threadGenerationDraft.boardDescription.trim() ? '自定义' : ''),
    existingThreadContent: rewriteForumThread.value
      ? [
          `当前主帖：${rewriteForumVersion.value?.title || rewriteForumThread.value.title}`,
          `作者：${rewriteForumVersion.value?.author || rewriteForumThread.value.author}`,
          rewriteForumVersion.value?.content || rewriteForumThread.value.content,
        ].join('\n\n')
      : '',
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
    phone.replacePage('generate-thread', preview.mode === 'rewrite' ? '重写论坛主帖' : '生成帖子', {
      ...(preview.boardId ? { boardId: preview.boardId } : {}),
      ...(preview.targetThreadId ? { rewriteThreadId: preview.targetThreadId } : {}),
    });
    return;
  }
  phone.replacePage('generate-replies', '生成回复', {
    boardId: preview.boardId,
    threadId: preview.threadId,
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
      toastr.success(forumThreadGenerationMode.value === 'rewrite' ? '已保存主帖候选版本' : '已生成并保存帖子');
      void phone.presentGeneratedPage('forum', 'thread', result.data.title, {
        boardId: result.saved.board.id,
        threadId: result.saved.thread.id,
        ...(result.saved.versionId ? { versionId: result.saved.versionId } : {}),
      });
      return;
    }

    const materialized =
      forumThreadGenerationMode.value === 'rewrite'
        ? { replies: [], warnings: [] }
        : materializeForumReplies([], result.data.replies);
    generationState.preview = {
      action: 'thread',
      author: result.data.author,
      boardDescription: config.boardDescription,
      boardId: config.boardId,
      boardName: config.boardName || result.data.board,
      boardTypeId: config.boardTypeId,
      boardTypeName: config.boardTypeName,
      content: result.data.content,
      draftId: null,
      raw: result.rawOutput,
      replies: materialized.replies,
      mode: forumThreadGenerationMode.value,
      targetThreadId: rewriteForumThread.value?.id || '',
      title: result.data.title,
      warnings: [...result.warnings, ...materialized.warnings],
    };
    persistForumPreviewDraft({
      ...(generationState.preview.boardId ? { boardId: generationState.preview.boardId } : {}),
      ...(generationState.preview.targetThreadId ? { rewriteThreadId: generationState.preview.targetThreadId } : {}),
    });
    void phone.presentGeneratedPage('forum', 'preview', '生成预览', {
      ...(generationState.preview.boardId ? { boardId: generationState.preview.boardId } : {}),
      ...(generationState.preview.targetThreadId ? { rewriteThreadId: generationState.preview.targetThreadId } : {}),
    });
  } catch (error) {
    generationState.error = error instanceof Error ? error.message : '生成失败，请稍后再试';
  }
}

async function runReplyGeneration() {
  const boardId = route.value.params?.boardId;
  const threadId = route.value.params?.threadId;
  const thread = activeThread.value;
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
      },
      {
        createFailedDraft: input => forum.createFailedDraft(input),
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
      void phone.presentGeneratedPage('forum', 'thread', thread.title, { boardId, threadId });
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
      warnings: [...result.warnings, ...materialized.warnings],
    };
    persistForumPreviewDraft({ boardId, threadId });
    void phone.presentGeneratedPage('forum', 'preview', '生成预览', { boardId, threadId });
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
        forum.ensureBoard(preview.boardName, preview.boardDescription, {
          typeId: preview.boardTypeId,
          typeName: preview.boardTypeName,
        })
      : forum.ensureBoard(preview.boardName, preview.boardDescription, {
          typeId: preview.boardTypeId,
          typeName: preview.boardTypeName,
        });
    const saved =
      preview.mode === 'rewrite' && preview.targetThreadId
        ? forum.appendThreadVersion(board.id, preview.targetThreadId, {
            author: preview.author,
            content: preview.content,
            title: preview.title,
          })
        : forum.createThread(board.id, {
            author: preview.author,
            content: preview.content,
            title: preview.title,
          });
    if (!saved) {
      toastr.warning('目标板块不存在，无法保存帖子');
      return;
    }
    if (preview.mode !== 'rewrite') {
      persistForumReplyDrafts(forum.createReply, board.id, saved.thread.id, preview.replies);
    }
    if (preview.draftId) {
      forum.deleteFailedDraft(preview.draftId);
    }
    clearForumPreviewDraft();
    generationState.preview = null;
    const versionId = 'version' in saved ? saved.version.id : '';
    toastr.success(preview.mode === 'rewrite' ? '已保存主帖候选版本' : '已保存帖子');
    phone.replacePage('thread', versionId ? preview.title : saved.thread.title, {
      boardId: board.id,
      threadId: saved.thread.id,
      ...(versionId ? { versionId } : {}),
    });
    return;
  }

  persistForumReplyDrafts(forum.createReply, preview.boardId, preview.threadId, preview.replies);
  if (preview.draftId) {
    forum.deleteFailedDraft(preview.draftId);
  }
  const thread = forum.getThread(preview.boardId, preview.threadId);
  clearForumPreviewDraft();
  generationState.preview = null;
  toastr.success('已保存回复');
  if (thread) {
    phone.replacePage('thread', thread.title, { boardId: preview.boardId, threadId: preview.threadId });
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
      boardDescription: typeof draft.context.boardDescription === 'string' ? draft.context.boardDescription : '',
      boardId: typeof draft.context.boardId === 'string' ? draft.context.boardId : '',
      boardName: (typeof draft.context.boardName === 'string' ? draft.context.boardName : '') || parsed.data.board,
      boardTypeId: typeof draft.context.boardTypeId === 'string' ? draft.context.boardTypeId : '',
      boardTypeName: typeof draft.context.boardTypeName === 'string' ? draft.context.boardTypeName : '',
      content: parsed.data.content,
      draftId: null,
      raw: parsed.raw,
      replies: materialized.replies,
      mode: draft.context.mode === 'rewrite' ? 'rewrite' : 'create',
      targetThreadId: typeof draft.context.threadId === 'string' ? draft.context.threadId : '',
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

  const materialized = materializeForumReplies(thread.replies, parsed.data.replies);
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
    warnings: [...parsed.warnings, ...materialized.warnings],
  };
  persistForumPreviewDraft({ boardId, threadId });
  forum.deleteFailedDraft(draft.id);
  failedDraftRawOutput.value = '';
  phone.replacePage('preview', '生成预览', { boardId, threadId });
}
</script>

<style scoped>
.pc-forum-app,
.pc-forum-page {
  min-height: 100%;
}

.pc-forum-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pc-reply-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pc-forum-hero,
.pc-board-card,
.pc-entry-card,
.pc-editor-card,
.pc-detail-card,
.pc-toolbar,
.pc-preview-card,
.pc-reply-card {
  border: 1px solid var(--pc-border);
  background: color-mix(in srgb, var(--pc-surface) 72%, transparent 28%);
  border-radius: 20px;
  backdrop-filter: blur(12px);
}

.pc-forum-hero,
.pc-editor-card,
.pc-detail-card,
.pc-toolbar,
.pc-preview-card {
  padding: 14px;
}

.pc-forum-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
}

.pc-forum-hero.actions-only {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 10px 14px;
}

.pc-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.pc-forum-hero .pc-hero-actions {
  align-content: start;
  align-items: flex-start;
}

.pc-forum-hero h2,
.pc-editor-card h2,
.pc-detail-card h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
}

.pc-board-type-label {
  display: block;
  overflow: hidden;
  margin-top: 6px;
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-forum-hero p,
.pc-board-card p,
.pc-entry-card p,
.pc-detail-meta,
.pc-copy,
.pc-status-card p,
.pc-raw-head span,
.pc-preview-card p {
  color: var(--pc-muted);
}

.pc-board-list,
.pc-entry-list,
.pc-reply-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pc-board-card,
.pc-entry-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  padding: 14px;
}

.pc-board-main,
.pc-entry-main {
  text-align: left;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
}

.pc-board-main strong,
.pc-entry-main strong,
.pc-preview-card strong,
.pc-reply-head strong {
  display: block;
  font-size: 16px;
}

.pc-board-actions,
.pc-form-actions,
.pc-detail-meta,
.pc-entry-head,
.pc-section-head,
.pc-raw-head,
.pc-sort-group,
.pc-reply-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pc-form-actions,
.pc-detail-meta,
.pc-entry-head,
.pc-section-head,
.pc-raw-head {
  justify-content: space-between;
}

.pc-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  min-width: 0;
}

.pc-toolbar .pc-sort-group {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  width: 100%;
  min-width: 0;
}

.pc-entry-main p.preview,
.pc-board-main p {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pc-search {
  width: 100%;
  border: 1px solid var(--pc-border);
  border-radius: 16px;
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  padding: 12px 14px;
}

.pc-forum-app :is(.pc-field, .pc-area),
.pc-preview-card {
  margin-top: 14px;
}

.pc-forum-app .pc-area {
  min-height: 220px;
  resize: vertical;
}

.pc-forum-type-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
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

.pc-forum-app .pc-area.compact {
  min-height: 120px;
}

.pc-favorite-chip,
.pc-sort-btn {
  border: 0;
  cursor: pointer;
  color: var(--pc-text);
}

.pc-sort-btn {
  min-width: 0;
  height: 40px;
  border-radius: 999px;
  padding: 0 14px;
}

.pc-favorite-chip,
.pc-sort-btn,
.pc-status-card,
.pc-reply-card {
  background: var(--pc-surface-strong);
}

.pc-sort-btn.active {
  background: color-mix(in srgb, var(--pc-theme-accent) 18%, var(--pc-surface-strong) 82%);
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

.pc-detail-content {
  margin-top: 16px;
  padding: 16px;
  border-radius: 18px;
  background: var(--pc-surface-strong);
  white-space: pre-wrap;
  color: var(--pc-text);
  font-size: var(--pc-reader-font-size);
  line-height: var(--pc-reader-line-height);
}

.pc-reply-card {
  padding: 14px;
  border-radius: 18px;
}

.pc-reply-content {
  margin: 8px 0 0;
  white-space: pre-wrap;
  color: var(--pc-text);
}

.pc-forum-app .pc-form-actions {
  margin-top: 16px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.pc-raw-output,
.pc-meta-grid {
  margin-top: 14px;
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
