<template>
  <section class="pc-diary-app">
    <section v-if="route.page === 'root'" class="pc-diary-page">
      <PreviewDraftNotice
        :draft="diaryPreviewDraft"
        @discard="discardDiaryPreviewDraft"
        @open="openDiaryPreviewDraft"
      />

      <BookShelf
        :books="shelfBooks"
        create-label="生成日记"
        create-subtitle="选择生成方式"
        variant="diary"
        @create="openCreationMode"
        @select="openBook"
      />

      <FailedDraftList
        :drafts="failedDrafts"
        :get-context="failedDraftBookTitle"
        :get-title="() => t`未解析日记`"
        :show-header="false"
        @open="openFailedDraft"
        @remove="removeFailedDraft"
      />
    </section>

    <section v-else-if="route.page === 'creation-mode'" class="pc-diary-page">
      <div class="pc-create-mode-list">
        <button class="pc-soft-btn" type="button" @click="openGenerate()">
          <i class="fa-solid fa-file-lines"></i>
          <span>{{ t`生成单篇日记` }}</span>
        </button>
        <button class="pc-primary-btn" type="button" @click="openBatchGenerate()">
          <i class="fa-solid fa-layer-group"></i>
          <span>{{ t`批量生成日记` }}</span>
        </button>
      </div>
    </section>

    <section v-else-if="route.page === 'book' && activeBook" class="pc-diary-page">
      <div class="pc-diary-hero pc-diary-actions-hero">
        <div class="pc-hero-actions">
          <button class="pc-soft-btn" type="button" @click="openGenerate(activeBook.id)">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
            <span>{{ t`生成` }}</span>
          </button>
          <button class="pc-soft-btn" type="button" @click="openBatchGenerate(activeBook.id)">
            <i class="fa-solid fa-layer-group"></i>
            <span>{{ t`批量` }}</span>
          </button>
          <button class="pc-icon-btn" type="button" :title="t`重命名书架`" @click="openRenameBook(activeBook.id)">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="pc-icon-btn danger" type="button" :title="t`删除书架`" @click="removeBook(activeBook.id)">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>

      <div class="pc-toolbar">
        <input v-model="query" class="pc-search" type="text" :placeholder="t`搜索标题`" />
        <button class="pc-soft-btn" type="button" @click="sortDesc = !sortDesc">
          {{ sortDesc ? t`倒序` : t`正序` }}
        </button>
      </div>
      <p class="pc-list-count">{{ `${filteredEntries.length} 篇` }}</p>

      <EmptyState v-if="!filteredEntries.length" :title="t`没有匹配的日记`" />

      <div v-else class="pc-entry-list">
        <article v-for="entry in filteredEntries" :key="entry.id" class="pc-entry-card">
          <button class="pc-entry-main" type="button" @click="openEntry(activeBook.id, entry.id)">
            <div class="pc-entry-head">
              <strong>{{ entry.kind === 'read-reaction' ? `📖 ${entry.title}` : entry.title }}</strong>
              <span class="pc-entry-order">{{ t`顺序` }} {{ entry.directoryOrder }}</span>
            </div>
          </button>
        </article>
      </div>

      <FailedDraftList
        :drafts="activeBookFailedDrafts"
        :get-context="failedDraftBookTitle"
        :get-title="() => t`未解析日记`"
        :show-header="false"
        @open="openFailedDraft"
        @remove="removeFailedDraft"
      />
    </section>

    <section v-else-if="route.page === 'rename-book' && activeBook" class="pc-diary-page">
      <div class="pc-editor-card">
        <span class="pc-kicker">{{ t`重命名书架` }}</span>
        <h2>{{ activeBook.perspective.name }}</h2>
        <input v-model="bookTitle" class="pc-field" type="text" :placeholder="t`书架名称`" />
        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
          <button class="pc-primary-btn" type="button" @click="submitRenameBook">{{ t`保存` }}</button>
        </div>
      </div>
    </section>

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
    />

    <section v-else-if="route.page === 'bagu-scan' && activeBook && activeEntry" class="pc-diary-page">
      <div class="pc-detail-card">
        <div class="pc-detail-title-row">
          <h2>{{ activeEntry.kind === 'read-reaction' ? `📖 ${activeEntry.title}` : activeEntry.title }}</h2>
        </div>
        <div v-if="activeEntry.occurredAt" class="pc-detail-meta">
          <span>{{ activeEntry.occurredAt }}</span>
        </div>
        <BaguScanPanel
          auto-scan
          class="pc-detail-bagu-panel"
          :content="activeEntry.content"
          :apply-handler="applyDiaryBaguContent"
        />
      </div>
    </section>

    <section v-else-if="route.page === 'editor'" class="pc-diary-page">
      <div class="pc-editor-card">
        <span class="pc-kicker">{{ t`编辑日记` }}</span>
        <h2>{{ editingEntry ? editingEntry.title : t`调整当前内容` }}</h2>
        <input
          v-if="!activeBook"
          v-model="draft.perspectiveName"
          class="pc-field"
          type="text"
          :placeholder="t`视角角色名`"
        />
        <input
          v-if="!activeBook"
          v-model="draft.bookTitle"
          class="pc-field"
          type="text"
          :placeholder="t`书架名称（可留空）`"
        />
        <input v-model="draft.title" class="pc-field" type="text" :placeholder="t`标题`" />
        <input v-model="draft.occurredAt" class="pc-field" type="text" :placeholder="t`发生时间，例如 昨夜 23:10`" />
        <div v-if="editingEntry" class="pc-field-group">
          <label class="pc-field-label">{{ t`目录顺序` }}</label>
          <input v-model.number="draft.directoryOrder" class="pc-field" type="number" min="0" step="1" />
        </div>
        <div class="pc-kind-row">
          <button
            :class="['pc-kind-btn', { active: draft.kind === 'normal' }]"
            type="button"
            @click="draft.kind = 'normal'"
          >
            {{ t`普通日记` }}
          </button>
          <button
            :class="['pc-kind-btn', { active: draft.kind === 'read-reaction' }]"
            type="button"
            @click="draft.kind = 'read-reaction'"
          >
            {{ t`阅读反应` }}
          </button>
        </div>
        <input
          v-if="draft.kind === 'read-reaction'"
          v-model="draft.readers"
          class="pc-field"
          type="text"
          :placeholder="t`阅读者，用逗号分隔`"
        />
        <textarea v-model="draft.content" class="pc-area pc-saved-content-area" :placeholder="t`正文`"></textarea>
        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
          <button class="pc-primary-btn" type="button" @click="submitEntry">{{ t`保存` }}</button>
        </div>
      </div>
    </section>

    <section v-else-if="route.page === 'generate'" class="pc-diary-page">
      <div class="pc-editor-card">
        <span class="pc-kicker">{{ t`AI 生成` }}</span>
        <h2>{{ t`生成一篇新的日记` }}</h2>
        <GenerationPanel
          :capture="captureDiaryPrompt"
          :capture-reset-key="generationPromptPreview"
          :error="generationState.error"
          :from-start-end="generationDraft.fromStartEnd"
          :range-text="generationDraft.rangeText"
          :raw-output="generationState.rawOutput"
          :recent-count="generationDraft.recentCount"
          :references="selectedReferences"
          :requirement-placeholder="t`例如：更克制、更私密一点，少写结论，多写当下情绪。`"
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
              v-if="!activeBook"
              v-model="generationDraft.perspectiveName"
              class="pc-field"
              type="text"
              :disabled="generationState.running"
              :placeholder="t`视角角色名`"
            />
          </template>
        </GenerationPanel>
      </div>
    </section>

    <section v-else-if="route.page === 'batch-generate'" class="pc-diary-page">
      <div class="pc-editor-card">
        <span class="pc-kicker">{{ t`AI 批量` }}</span>
        <h2>{{ t`批量生成日记` }}</h2>
        <input
          v-if="!activeBook"
          v-model="batchDraft.perspectiveName"
          class="pc-field"
          type="text"
          :disabled="batchInputsLocked"
          :placeholder="t`视角角色名`"
        />
        <input
          v-if="!activeBook"
          v-model="batchDraft.bookTitle"
          class="pc-field"
          type="text"
          :disabled="batchInputsLocked"
          :placeholder="t`书架名称（可留空）`"
        />
        <div class="pc-field-group">
          <label class="pc-field-label">{{ t`批量楼层` }}</label>
          <select v-model="batchDraft.floorMode" class="pc-select" :disabled="batchInputsLocked">
            <option value="all">{{ t`全部楼层` }}</option>
            <option value="custom">{{ t`自定义楼层` }}</option>
          </select>
        </div>
        <input
          v-if="batchDraft.floorMode === 'custom'"
          v-model="batchDraft.floorText"
          class="pc-field"
          type="text"
          :disabled="batchInputsLocked"
          :placeholder="t`楼层范围，例如 1-30,35,40-45`"
        />

        <div class="pc-batch-mode-label">
          <span class="pc-field-label">{{ t`生成方式` }}</span>
          <InfoHint
            :text="
              t`逐楼：将每个符合条件的楼层作为截止点，累积读取第 0 楼到该楼层。例如目标楼层为 1、3、5，将分别使用 0-1、0-3、0-5 楼生成三篇日记。AI/用户选项只决定截止楼层，范围内会保留完整可见对话。\n\n按组：按设定数量合并符合条件的楼层。例如目标楼层为 1、3、5，每组 2 层，将使用 1、3 楼生成一篇，再使用第 5 楼生成一篇。`
            "
          />
        </div>
        <div class="pc-kind-row pc-batch-kind-row">
          <button
            :class="['pc-kind-btn', { active: !batchDraft.groupMode }]"
            type="button"
            :disabled="batchInputsLocked"
            @click="batchDraft.groupMode = false"
          >
            {{ t`逐楼生成` }}
          </button>
          <button
            :class="['pc-kind-btn', { active: batchDraft.groupMode }]"
            type="button"
            :disabled="batchInputsLocked"
            @click="batchDraft.groupMode = true"
          >
            {{ t`按组生成` }}
          </button>
        </div>

        <div v-if="batchDraft.groupMode" class="pc-number-field">
          <label class="pc-field-label">{{ t`每组楼数` }}</label>
          <input
            v-model.number="batchDraft.groupSize"
            class="pc-field"
            type="number"
            min="1"
            max="50"
            :disabled="batchInputsLocked"
          />
        </div>

        <div class="pc-number-field">
          <label class="pc-field-label">{{ t`RPM 请求限制` }}</label>
          <input
            v-model.number="batchDraft.rpmLimit"
            class="pc-field"
            type="number"
            min="0"
            max="120"
            :disabled="batchState.running"
          />
        </div>

        <div class="pc-kind-row pc-check-row">
          <label class="pc-check-pill">
            <input v-model="batchDraft.includeAi" type="checkbox" :disabled="batchInputsLocked" />
            <span>{{ t`AI 楼层` }}</span>
          </label>
          <label class="pc-check-pill">
            <input v-model="batchDraft.includeUser" type="checkbox" :disabled="batchInputsLocked" />
            <span>{{ t`用户楼层` }}</span>
          </label>
        </div>
        <ReferencePicker v-model="selectedReferences" :disabled="batchInputsLocked" />

        <textarea
          v-model="batchDraft.userRequirement"
          class="pc-area compact"
          :disabled="batchInputsLocked"
          :placeholder="t`例如：每篇都更私密，按对应楼层情绪独立成篇。`"
        ></textarea>

        <div v-if="batchState.running || batchState.total" class="pc-status-card">
          <strong>
            {{ batchState.running ? t`批量生成中` : batchState.resumeAvailable ? t`批量已暂停` : t`批量生成完成` }}
          </strong>
          <p>
            {{
              `${batchState.done + batchState.failed}/${batchState.total} · 成功 ${batchState.done}${batchState.failed ? ` · 草稿 ${batchState.failed}` : ''}${batchState.currentLabel ? ` · ${batchState.currentLabel}` : ''}`
            }}
          </p>
        </div>

        <div v-if="batchState.error" class="pc-status-card danger">
          <strong>{{ batchState.stopRequested ? t`批量已停止` : t`生成失败` }}</strong>
          <p>{{ batchState.error }}</p>
        </div>

        <div
          :class="['pc-form-actions', { 'pc-batch-actions-three': batchState.running || batchState.resumeAvailable }]"
        >
          <button class="pc-soft-btn" type="button" :disabled="batchState.running" @click="phone.goBack()">
            {{ t`取消` }}
          </button>
          <button v-if="batchState.running" class="pc-soft-btn danger" type="button" @click="stopBatchGeneration">
            {{ t`停止` }}
          </button>
          <button v-else-if="batchState.resumeAvailable" class="pc-soft-btn" type="button" @click="resetBatchProgress">
            <i class="fa-solid fa-rotate-left"></i>
            <span>{{ t`重新设置` }}</span>
          </button>
          <button class="pc-primary-btn" type="button" :disabled="batchState.running" @click="runBatchGeneration">
            <i class="fa-solid fa-layer-group"></i>
            <span>{{ batchState.running ? t`生成中` : batchState.resumeAvailable ? t`继续批量` : t`开始批量` }}</span>
          </button>
        </div>

        <div v-if="batchState.rawOutput" class="pc-raw-output">
          <div class="pc-raw-head">
            <strong>{{ t`最近一次输出` }}</strong>
          </div>
          <textarea :value="batchState.rawOutput" class="pc-area pc-raw-area" readonly></textarea>
        </div>
      </div>
    </section>

    <section v-else-if="route.page === 'reaction-generate' && activeBook && activeEntry" class="pc-diary-page">
      <div class="pc-editor-card">
        <span class="pc-kicker">{{ t`AI 生成` }}</span>
        <h2>{{ t`生成阅读反应` }}</h2>
        <GenerationPanel
          :capture="captureReactionPrompt"
          :capture-reset-key="reactionPromptPreview"
          :error="generationState.error"
          :from-start-end="reactionDraft.fromStartEnd"
          :range-text="reactionDraft.rangeText"
          :raw-output="generationState.rawOutput"
          :recent-count="reactionDraft.recentCount"
          :references="selectedReferences"
          :requirement-placeholder="t`例如：更像读完以后压在心里的私密独白。`"
          :running="generationState.running"
          :single-message-id="reactionDraft.singleMessageId"
          :source-mode="settings.generation.sourceMode"
          :user-requirement="reactionDraft.userRequirement"
          @cancel="phone.goBack()"
          @generate="runReadReactionGeneration"
          @stop="stopGeneration"
          @update:from-start-end="reactionDraft.fromStartEnd = $event"
          @update:range-text="reactionDraft.rangeText = $event"
          @update:recent-count="reactionDraft.recentCount = $event"
          @update:references="selectedReferences = $event"
          @update:single-message-id="reactionDraft.singleMessageId = $event"
          @update:source-mode="settings.generation.sourceMode = $event"
          @update:user-requirement="reactionDraft.userRequirement = $event"
        >
          <template #before-fields>
            <input
              v-model="reactionDraft.readerName"
              class="pc-field"
              type="text"
              :disabled="generationState.running"
              :placeholder="t`阅读者名字`"
            />
          </template>
        </GenerationPanel>
      </div>
    </section>

    <section
      v-else-if="route.page === 'preview' && generationState.preview"
      class="pc-diary-page pc-generation-preview-page"
    >
      <div class="pc-detail-card pc-generation-preview-card">
        <GenerationPreviewPanel
          :content="generationState.preview.content"
          :raw="generationState.preview.raw"
          raw-editable
          :reparse-handler="reparsePreviewRaw"
          :save-label="generationState.preview.action === 'read-reaction' ? t`保存阅读反应` : t`保存日记`"
          :source-label="
            generationState.preview.occurredAt ||
            (generationState.preview.action === 'read-reaction' ? t`阅读反应预览` : t`日记预览`)
          "
          :text-provider-summary="generationState.preview.perspective.name"
          :title="
            generationState.preview.action === 'read-reaction'
              ? `📖 ${generationState.preview.title}`
              : generationState.preview.title
          "
          :warnings="generationState.preview.warnings"
          @back="returnToGenerate"
          @reparse="reparsePreviewRaw"
          @save="savePreview"
          @update:content="generationState.preview.content = $event"
          @update:raw="generationState.preview.raw = $event"
        />
      </div>
    </section>

    <section v-else-if="route.page === 'failed-draft' && activeFailedDraft" class="pc-diary-page pc-repair-page">
      <div class="pc-editor-card pc-repair-card">
        <span class="pc-kicker">{{ activeFailedDraft.source.label }}</span>
        <h2>{{ t`修复日记草稿` }}</h2>

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
import DiaryEntryDetailPage from '@/components/diary/DiaryEntryDetailPage.vue';
import EmptyState from '@/components/EmptyState.vue';
import BaguScanPanel from '@/components/BaguScanPanel.vue';
import FailedDraftList from '@/components/FailedDraftList.vue';
import GenerationPanel from '@/components/GenerationPanel.vue';
import GenerationPreviewPanel from '@/components/GenerationPreviewPanel.vue';
import InfoHint from '@/components/InfoHint.vue';
import PreviewDraftNotice from '@/components/PreviewDraftNotice.vue';
import RawOutputEditor from '@/components/RawOutputEditor.vue';
import ReferencePicker from '@/components/ReferencePicker.vue';
import { useCatalogDetailNavigation } from '@/composables/useCatalogDetailNavigation';
import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import { parseDiaryGeneratedResult } from '@/core/diaryGeneration';
import { buildGenerationPreview, captureGenerationPrompt, generateContent } from '@/core/generationService';
import {
  createManualBatchTask,
  resumeGenerationTask,
  runManualBatchTask,
  type ManualBatchTaskConfig,
} from '@/core/manualBatchRunner';
import { getCurrentChatScopeKey } from '@/store/chatScoped';
import { useDiaryStore } from '@/store/diary';
import { useGenerationTaskStore } from '@/store/generationTasks';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import { canOpenBaguScan } from '@/util/baguScanGate';
import { formatGenerationReferences, type GenerationReferenceItem } from '@/util/references';
import { usePreviewDraftPersistence } from '@/util/previewDrafts';
import { useInvalidRouteFallback } from '@/util/routeFallback';
import { getChatMessagesSafe, stopGenerationByIdSafe } from '@/util/runtime';
import { useDetailScroll } from '@/util/detailScroll';
import { getSourceLastFloor } from '@/util/sourceFloor';
import type { FailedGenerationDraft } from '@/type/generation';
import type { CharacterRef } from '@/type/diary';
import { storeToRefs } from 'pinia';

const diary = useDiaryStore();
const diaryGenerationAdapter = getRegisteredPhoneGenerationAdapter('diary', 'generate');
const diaryReadReactionAdapter = getRegisteredPhoneGenerationAdapter('diary', 'read-reaction');
const generationTasks = useGenerationTaskStore();
const phone = usePhoneStore();
const prompts = usePromptStore();
const settingsStore = useSettingsStore();
const { books, failedDrafts } = storeToRefs(diary);
const { currentRoute: route } = storeToRefs(phone);
const { specialPrompts } = storeToRefs(prompts);
const { settings } = storeToRefs(settingsStore);

const query = ref('');
const sortDesc = computed({
  get: () => settings.value.directorySort.diaryDesc,
  set: value => {
    settings.value.directorySort.diaryDesc = value;
  },
});
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
  error: '',
  generationId: '',
  preview: null as null | {
    action: 'generate' | 'read-reaction';
    bookId: string;
    bookTitle: string;
    content: string;
    draftId: string | null;
    occurredAt: string;
    perspective: CharacterRef;
    raw: string;
    sourceBookId: string;
    sourceEntryId: string;
    sourceFloorEnd?: number;
    title: string;
    warnings: string[];
  },
  rawOutput: '',
  running: false,
});

type DiaryPreview = NonNullable<typeof generationState.preview>;

const {
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

onScopeDispose(() => {
  if (generationState.running && generationState.generationId) {
    stopGenerationByIdSafe(generationState.generationId);
  }
});

const batchDraft = reactive({
  bookTitle: '',
  floorMode: 'custom' as 'all' | 'custom',
  floorText: '',
  groupMode: false,
  groupSize: 5,
  includeAi: true,
  includeUser: true,
  perspectiveName: '',
  rpmLimit: 10,
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
      generationDraft.fromStartEnd = 20;
      generationDraft.occurredAt = '';
      generationDraft.perspectiveName = activeBook.value?.perspective.name || '';
      generationDraft.rangeText = '';
      generationDraft.recentCount = 20;
      generationDraft.singleMessageId = 0;
      generationDraft.userRequirement = '';
      generationState.error = '';
      generationState.preview = null;
      generationState.rawOutput = '';
    }

    if (current.page === 'batch-generate') {
      const existingTask = batchTask.value;
      if (existingTask && !['completed', 'cancelled'].includes(existingTask.status)) {
        hydrateBatchDraft(existingTask.config as ManualBatchTaskConfig);
        return;
      }
      selectedReferences.value = [];
      batchDraft.bookTitle = activeBook.value?.title || '';
      batchDraft.floorMode = 'custom';
      batchDraft.floorText = '';
      batchDraft.groupMode = false;
      batchDraft.groupSize = 5;
      batchDraft.includeAi = true;
      batchDraft.includeUser = true;
      batchDraft.perspectiveName = activeBook.value?.perspective.name || '';
      batchDraft.rpmLimit = settings.value.generation.rpmLimit;
      batchDraft.userRequirement = '';
      batchFormError.value = '';
    }

    if (current.page === 'reaction-generate' && previous?.page !== 'preview') {
      selectedReferences.value = [];
      reactionDraft.fromStartEnd = 20;
      reactionDraft.occurredAt = activeEntry.value?.occurredAt || '';
      reactionDraft.rangeText = '';
      reactionDraft.recentCount = 20;
      reactionDraft.readerName = '';
      reactionDraft.singleMessageId = 0;
      reactionDraft.userRequirement = '';
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
  phone.pushPage('creation-mode', '生成日记');
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
  if (!batchDraft.groupMode) {
    return floors.map(floor => ({
      fromStartEnd: floor,
      label: `第 0-${floor} 楼`,
      mode: 'fromStart' as const,
      rangeText: '',
      singleMessageId: 0,
    }));
  }

  const groupSize = Math.min(50, Math.max(1, Math.round(batchDraft.groupSize || 1)));
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
  const perspective = generationPerspective.value;
  if (!perspective) {
    generationState.error = '请先填写视角角色名';
    return;
  }

  generationState.error = '';
  clearDiaryPreviewDraft();
  generationState.preview = null;
  generationState.rawOutput = '';

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
      failedDraftRawOutput.value = result.rawOutput;
      generationState.error = result.warnings.join('；') || '模型没有返回可解析的日记 XML';
      toastr.warning('XML 解析失败，已保存到失败草稿');
      void phone.presentGeneratedPage('diary', 'failed-draft', '解析失败草稿', { draftId: result.draft.id });
      return;
    }

    if (result.status === 'saved') {
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
      occurredAt: result.data.occurredAt || generationDraft.occurredAt,
      perspective,
      raw: result.rawOutput,
      sourceBookId: activeBook.value?.id || '',
      sourceEntryId: '',
      sourceFloorEnd: getSourceLastFloor(result.source),
      title: result.data.title,
      warnings: result.warnings,
    };
    persistDiaryPreviewDraft(activeBook.value?.id ? { bookId: activeBook.value.id } : {});
    void phone.presentGeneratedPage(
      'diary',
      'preview',
      '日记预览',
      activeBook.value?.id ? { bookId: activeBook.value.id } : undefined,
    );
  } catch (error) {
    generationState.error = error instanceof Error ? error.message : '生成失败，请稍后再试';
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
      tavernPresetName: settings.value.generation.tavernPresetName,
      textProvider: klona(settings.value.textProvider),
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
  batchDraft.floorMode = config.floorMode || 'custom';
  batchDraft.floorText = config.floorText || '';
  batchDraft.groupMode = config.groupMode ?? false;
  batchDraft.groupSize = config.groupSize ?? 5;
  batchDraft.includeAi = config.includeAi ?? true;
  batchDraft.includeUser = config.includeUser ?? true;
  batchDraft.perspectiveName = config.perspective?.name || '';
  batchDraft.rpmLimit = config.rpmLimit;
  batchDraft.userRequirement = config.userRequirement;
}

async function runReadReactionGeneration() {
  const sourceBook = activeBook.value;
  const sourceEntry = activeEntry.value;
  if (!sourceBook || !sourceEntry) return;
  const readerName = reactionDraft.readerName.trim();
  if (!readerName) {
    generationState.error = '请先填写阅读者名字';
    return;
  }

  const targetPerspective: CharacterRef = { name: readerName };
  const targetBook = diary.findBookByPerspective(targetPerspective);

  generationState.error = '';
  clearDiaryPreviewDraft();
  generationState.preview = null;
  generationState.rawOutput = '';

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
      generationState.error = result.warnings.join('；') || '模型没有返回可解析的阅读反应 XML';
      toastr.warning('XML 解析失败，已保存到失败草稿');
      void phone.presentGeneratedPage('diary', 'failed-draft', '解析失败草稿', { draftId: result.draft.id });
      return;
    }

    if (result.status === 'saved') {
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
    void phone.presentGeneratedPage('diary', 'preview', '阅读反应预览', {
      bookId: sourceBook.id,
      entryId: sourceEntry.id,
    });
  } catch (error) {
    generationState.error = error instanceof Error ? error.message : '生成失败，请稍后再试';
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
  const rawOutput = preview.raw.trim();
  if (!rawOutput) {
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

  const rawOutput = failedDraftRawOutput.value.trim();
  if (!rawOutput) {
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
    rawOutput: parsed.raw,
    warnings: parsed.warnings,
  });
  generationState.preview = {
    action: isReaction ? 'read-reaction' : 'generate',
    bookId,
    bookTitle,
    content: parsed.data.content,
    draftId: null,
    occurredAt: parsed.data.occurredAt || occurredAt,
    perspective: perspective || diary.getBook(bookId)?.perspective || { name: '当前视角' },
    raw: parsed.raw,
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
</script>

<style scoped>
.pc-diary-app,
.pc-diary-page {
  min-height: 100%;
}

.pc-diary-app {
  height: 100%;
  min-height: 0;
}

.pc-diary-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pc-diary-detail-page {
  height: 100%;
  gap: 10px;
  min-height: 0;
}

.pc-diary-hero,
.pc-book-card,
.pc-entry-card,
.pc-editor-card,
.pc-detail-card,
.pc-toolbar {
  border: 1px solid var(--pc-border);
  background: color-mix(in srgb, var(--pc-surface) 72%, transparent 28%);
  border-radius: 20px;
  backdrop-filter: blur(12px);
}

.pc-diary-hero,
.pc-editor-card,
.pc-detail-card,
.pc-toolbar {
  padding: 14px;
}

.pc-diary-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
}

.pc-diary-actions-hero {
  grid-template-columns: minmax(0, 1fr);
}

.pc-diary-hero h2,
.pc-editor-card h2,
.pc-detail-card h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
}

.pc-diary-hero p,
.pc-book-card p,
.pc-entry-card p,
.pc-detail-meta,
.pc-reader-row span {
  color: var(--pc-muted);
}

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
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
}

.pc-avatar {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--pc-theme-accent) 18%, var(--pc-surface-strong) 82%);
  color: var(--pc-theme-accent);
  font-weight: 700;
}

.pc-book-main strong,
.pc-entry-main strong {
  display: block;
  min-width: 0;
  overflow: hidden;
  font-size: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-book-actions,
.pc-form-actions,
.pc-detail-meta,
.pc-kind-row,
.pc-raw-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.pc-diary-actions-hero .pc-hero-actions {
  display: grid;
  grid-template-columns: minmax(84px, 1fr) minmax(84px, 1fr) 44px 44px;
  align-items: center;
  justify-content: stretch;
  width: 100%;
}

.pc-diary-actions-hero .pc-primary-btn,
.pc-diary-actions-hero .pc-soft-btn,
.pc-diary-actions-hero .pc-icon-btn {
  width: 100%;
  min-width: 0;
}

.pc-diary-actions-hero .pc-primary-btn,
.pc-diary-actions-hero .pc-soft-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.pc-diary-actions-hero .pc-primary-btn span,
.pc-diary-actions-hero .pc-soft-btn span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-list-count {
  margin: -8px 4px 0;
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.pc-search {
  width: 100%;
  border: 1px solid var(--pc-border);
  border-radius: 16px;
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  padding: 12px 14px;
}

.pc-diary-app :is(.pc-field, .pc-area),
.pc-kind-row,
.pc-preview-card {
  margin-top: 14px;
}

.pc-batch-mode-label {
  display: flex;
  align-items: center;
  margin-top: 14px;
}

.pc-batch-kind-row {
  justify-content: flex-start;
}

.pc-entry-main {
  align-items: flex-start;
}

.pc-entry-head {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-entry-head strong {
  flex: 1 1 auto;
}

.pc-entry-order {
  flex: 0 0 auto;
  color: var(--pc-muted);
  font-size: 12px;
  white-space: nowrap;
}

.pc-entry-main .preview {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pc-favorite-chip,
.pc-kind-btn {
  border: 0;
  cursor: pointer;
  color: var(--pc-text);
}

.pc-kind-btn {
  min-width: 92px;
  height: 40px;
  border-radius: 999px;
  padding: 0 14px;
}

.pc-kind-btn {
  background: var(--pc-surface-strong);
}

.pc-kind-btn.active {
  background: color-mix(in srgb, var(--pc-theme-accent) 22%, var(--pc-surface-strong) 78%);
}

.pc-number-field {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}

.pc-check-row {
  justify-content: flex-start;
  flex-wrap: wrap;
}

.pc-check-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  background: var(--pc-surface-strong);
  color: var(--pc-text);
}

.pc-soft-btn.danger,
.pc-icon-btn.danger {
  color: var(--pc-danger);
}

.pc-favorite-chip {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--pc-surface-strong);
}

.pc-favorite-chip i[data-active='true'] {
  color: var(--pc-danger);
}

.pc-diary-app .pc-area {
  min-height: 220px;
  resize: vertical;
}

.pc-diary-app .pc-area.compact {
  min-height: 120px;
}

.pc-diary-app .pc-form-actions {
  margin-top: 16px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.pc-batch-actions-three {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.pc-batch-actions-three > button {
  width: 100%;
  min-width: 0;
  gap: 5px;
  padding-inline: 6px;
  font-size: 13px;
  white-space: nowrap;
}

.pc-diary-detail-page .pc-detail-card {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
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

.pc-reader-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
}

.pc-preview-card,
.pc-status-card {
  border: 1px solid var(--pc-border);
  border-radius: 18px;
  background: var(--pc-surface-strong);
  padding: 14px;
}

.pc-status-card {
  margin-top: 14px;
}

.pc-status-card.warning {
  border-color: color-mix(in srgb, #f5a623 42%, var(--pc-border) 58%);
}

.pc-status-card.danger {
  border-color: color-mix(in srgb, var(--pc-danger) 42%, var(--pc-border) 58%);
}

.pc-raw-output {
  margin-top: 14px;
}

.pc-raw-head {
  align-items: baseline;
}

.pc-raw-area {
  min-height: 180px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}

.pc-entry-main.draft {
  display: block;
}
</style>
