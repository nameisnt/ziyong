<template>
  <section class="pc-summary-app">
    <section v-if="route.page === 'root'" class="pc-summary-page">
      <div class="pc-section-card pc-summary-root-actions">
        <button class="pc-soft-btn" type="button" @click="openSummaryExtract">
          <i class="fa-solid fa-file-import"></i>
          <span>{{ t`提取` }}</span>
        </button>
        <button class="pc-soft-btn" type="button" @click="openCreateBook">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          <span>{{ t`单条` }}</span>
        </button>
        <button class="pc-primary-btn" type="button" @click="openBatchGenerate()">
          <i class="fa-solid fa-layer-group"></i>
          <span>{{ t`批量` }}</span>
        </button>
      </div>

      <PreviewDraftNotice
        :draft="summaryPreviewDraft"
        @discard="discardSummaryPreviewDraft"
        @open="openSummaryPreviewDraft"
      />

      <EmptyState v-if="!books.length" :title="t`还没有总结集`" />

      <BookShelf v-else :books="shelfBooks" :show-create="false" variant="diary" @select="openBook" />

      <FailedDraftList
        :delete-title="t`删除`"
        :drafts="failedDrafts"
        :get-context="failedDraftSourceLabel"
        :get-title="() => t`未解析输出`"
        @open="openFailedDraft"
        @remove="removeFailedDraft"
      />
    </section>

    <section v-else-if="route.page === 'create-book' || route.page === 'edit-book'" class="pc-summary-page">
      <div class="pc-editor-card">
        <span class="pc-kicker">{{ route.page === 'create-book' ? t`生成总结` : t`重命名总结集` }}</span>
        <h2>{{ route.page === 'create-book' ? t`先设置总结集，再生成第一条` : t`更新标题` }}</h2>
        <input v-model="bookTitle" class="pc-field" type="text" :placeholder="t`例如 第一卷总结`" />
        <div :class="['pc-form-actions', { 'pc-summary-create-actions': route.page === 'create-book' }]">
          <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
          <button v-if="route.page === 'create-book'" class="pc-soft-btn" type="button" @click="submitBook">
            {{ t`先建空白` }}
          </button>
          <button
            class="pc-primary-btn"
            type="button"
            @click="route.page === 'create-book' ? submitBookAndGenerate() : submitBook()"
          >
            {{ route.page === 'create-book' ? t`开始生成` : t`保存` }}
          </button>
        </div>
      </div>
    </section>

    <section v-else-if="route.page === 'book' && activeBook" class="pc-summary-page">
      <div class="pc-summary-hero pc-summary-actions-hero">
        <div>
          <span class="pc-kicker">{{ t`总结条目` }}</span>
          <p>{{ formatBookMeta(activeBook.entries.length) }}</p>
        </div>
        <div class="pc-hero-actions">
          <button class="pc-soft-btn" type="button" @click="openImportChat(activeBook.id)">
            <i class="fa-solid fa-file-import"></i>
            <span>{{ t`导入` }}</span>
          </button>
          <button class="pc-soft-btn" type="button" @click="openBatchGenerate(activeBook.id)">
            <i class="fa-solid fa-layer-group"></i>
            <span>{{ t`批量` }}</span>
          </button>
          <button class="pc-soft-btn" type="button" @click="openGenerate(activeBook.id)">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
            <span>{{ t`生成` }}</span>
          </button>
          <button class="pc-soft-btn" type="button" @click="summaryEntrySortDesc = !summaryEntrySortDesc">
            <span>{{ summaryEntrySortDesc ? t`倒序` : t`正序` }}</span>
          </button>
          <button class="pc-icon-btn" type="button" :title="t`重命名总结集`" @click="openRenameBook(activeBook.id)">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="pc-icon-btn danger" type="button" :title="t`删除总结集`" @click="removeBook(activeBook.id)">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>

      <EmptyState v-if="!activeBook.entries.length" :title="t`还没有条目`" />

      <div v-else class="pc-entry-list">
        <article v-for="entry in sortedActiveBookEntries" :key="entry.id" class="pc-entry-card">
          <button class="pc-entry-main" type="button" @click="openEntry(activeBook.id, entry.id)">
            <div class="pc-entry-head">
              <strong>{{ entry.title }}</strong>
            </div>
            <p>{{ entry.rangeLabel }}</p>
          </button>
        </article>
      </div>

      <FailedDraftList
        :delete-title="t`删除`"
        :drafts="activeBookFailedDrafts"
        :get-context="failedDraftSourceLabel"
        :get-title="() => t`未解析输出`"
        @open="openFailedDraft"
        @remove="removeFailedDraft"
      />
    </section>

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
      @next="openEntry(activeBook.id, nextEntryId)"
      @previous="openEntry(activeBook.id, previousEntryId)"
      @select-catalog="selectCatalogEntry"
      @top="scrollToTop"
    />

    <section v-else-if="route.page === 'bagu-scan' && activeBook && activeEntry" class="pc-summary-page">
      <div class="pc-detail-card">
        <span class="pc-kicker">{{ activeEntry.rangeLabel }}</span>
        <div class="pc-detail-title-row">
          <h2>{{ activeEntry.title }}</h2>
        </div>
        <BaguScanPanel
          auto-scan
          class="pc-detail-bagu-panel"
          :content="activeEntry.content"
          :apply-handler="applySummaryBaguContent"
        />
      </div>
    </section>

    <section v-else-if="route.page === 'editor' && activeBook" class="pc-summary-page">
      <div class="pc-editor-card">
        <span class="pc-kicker">{{ t`编辑条目` }}</span>
        <h2>{{ editingEntry ? editingEntry.title : t`调整当前内容` }}</h2>
        <input v-model="entryDraft.title" class="pc-field" type="text" :placeholder="t`标题`" />
        <input v-model="entryDraft.rangeLabel" class="pc-field" type="text" :placeholder="t`范围，例如 第 1-20 楼`" />
        <textarea v-model="entryDraft.content" class="pc-area pc-saved-content-area" :placeholder="t`正文`"></textarea>
        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
          <button class="pc-primary-btn" type="button" @click="submitEntry">{{ t`保存` }}</button>
        </div>
      </div>
    </section>

    <section v-else-if="route.page === 'import-chat'" class="pc-summary-page">
      <article class="pc-editor-card pc-summary-import-page">
        <span class="pc-kicker">{{ t`当前聊天` }}</span>
        <h2>{{ t`提取 AI 楼层` }}</h2>
        <EmptyState v-if="!books.length" :title="t`还没有总结集`">
          <p>{{ t`先新建一个总结集，再把当前聊天里的 AI 楼层提取成总结条目。` }}</p>
          <button class="pc-primary-btn compact" type="button" @click="openCreateBook">
            {{ t`新建总结集` }}
          </button>
        </EmptyState>
        <template v-else>
          <label class="pc-field-group">
            <span>{{ t`保存到总结集` }}</span>
            <select v-model="summaryImportTargetBookId" class="pc-field pc-select" :disabled="summaryImport.loading">
              <option v-for="book in books" :key="book.id" :value="book.id">
                {{ book.title }}
              </option>
            </select>
          </label>
          <label class="pc-field-group">
            <span>{{ t`楼层正文提取` }}</span>
            <select
              v-model="summaryImport.ruleId"
              class="pc-field pc-select"
              :disabled="summaryImport.loading"
              @change="reloadSummaryImport"
            >
              <option value="__default_body__">{{ t`默认楼层正文提取` }}</option>
              <option v-for="rule in summaryImportRules" :key="rule.id" :value="rule.id">
                {{ rule.name || t`未命名规则` }}
              </option>
            </select>
          </label>
          <div class="pc-summary-import-head">
            <span>{{ t`AI 楼层` }} · {{ summaryImport.items.length }}</span>
            <div>
              <button
                class="pc-icon-btn"
                type="button"
                :disabled="summaryImport.loading"
                :title="t`刷新楼层`"
                @click="reloadSummaryImport"
              >
                <i :class="['fa-solid fa-rotate-right', { spinning: summaryImport.loading }]"></i>
              </button>
              <button
                class="pc-soft-btn compact"
                type="button"
                :disabled="!summaryImport.items.length"
                @click="toggleAllSummaryImports"
              >
                {{ allSummaryImportsSelected ? t`取消全选` : t`全选` }}
              </button>
            </div>
          </div>
          <div v-if="summaryImport.error" class="pc-status-card warning">
            <strong>{{ t`无法读取楼层` }}</strong>
            <p>{{ summaryImport.error }}</p>
          </div>
          <div v-else-if="summaryImport.items.length" class="pc-summary-import-list">
            <label v-for="item in summaryImport.items" :key="item.id" class="pc-summary-import-item">
              <input
                :checked="summaryImport.selectedIds.includes(item.id)"
                type="checkbox"
                @change="toggleSummaryImport(item.id, ($event.target as HTMLInputElement).checked)"
              />
              <span>
                <strong>{{ t`第 ${item.messageIndex} 楼总结` }}</strong>
                <small>{{ item.content }}</small>
              </span>
            </label>
          </div>
          <EmptyState v-else-if="!summaryImport.loading" :title="t`没有可导入的 AI 楼层`" />
          <div class="pc-form-actions">
            <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
            <button
              class="pc-primary-btn"
              type="button"
              :disabled="!summaryImportTargetBook || !summaryImport.selectedIds.length"
              @click="importSummaryEntries"
            >
              {{ t`提取 ${summaryImport.selectedIds.length} 条` }}
            </button>
          </div>
        </template>
      </article>
    </section>

    <section v-else-if="route.page === 'generate' && activeBook" class="pc-summary-page">
      <div class="pc-editor-card">
        <span class="pc-kicker">{{ t`AI 生成` }}</span>
        <h2>{{ t`生成一条新的总结` }}</h2>

        <GenerationPanel
          :capture="captureSummaryPrompt"
          :capture-reset-key="summaryPromptPreview"
          :error="generationState.error"
          :from-start-end="generationDraft.fromStartEnd"
          :range-text="generationDraft.rangeText"
          :raw-output="generationState.rawOutput"
          :recent-count="generationDraft.recentCount"
          :references="selectedReferences"
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
        />
      </div>
    </section>

    <section v-else-if="route.page === 'batch-generate'" class="pc-summary-page">
      <div class="pc-editor-card">
        <span class="pc-kicker">{{ t`AI 批量` }}</span>
        <h2>{{ t`批量生成总结` }}</h2>

        <div class="pc-field-group">
          <label class="pc-field-label">{{ t`保存到总结集` }}</label>
          <select v-model="batchDraft.bookId" class="pc-select" :disabled="batchInputsLocked">
            <option value="">{{ t`选择总结集` }}</option>
            <option v-for="book in books" :key="book.id" :value="book.id">{{ book.title }}</option>
          </select>
        </div>

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

        <div class="pc-segment pc-summary-batch-mode">
          <button
            :class="['pc-segment-btn', { active: !batchDraft.groupMode }]"
            type="button"
            :disabled="batchInputsLocked"
            @click="batchDraft.groupMode = false"
          >
            {{ t`逐楼` }}
          </button>
          <button
            :class="['pc-segment-btn', { active: batchDraft.groupMode }]"
            type="button"
            :disabled="batchInputsLocked"
            @click="batchDraft.groupMode = true"
          >
            {{ t`按组` }}
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

        <div class="pc-summary-batch-roles">
          <div>
            <span>{{ t`AI 楼层` }}</span>
            <label class="pc-toggle">
              <input v-model="batchDraft.includeAi" type="checkbox" :disabled="batchInputsLocked" />
              <span></span>
            </label>
          </div>
          <div>
            <span>{{ t`用户楼层` }}</span>
            <label class="pc-toggle">
              <input v-model="batchDraft.includeUser" type="checkbox" :disabled="batchInputsLocked" />
              <span></span>
            </label>
          </div>
        </div>

        <ReferencePicker v-model="selectedReferences" :disabled="batchInputsLocked" />

        <textarea
          v-model="batchDraft.userRequirement"
          class="pc-area compact"
          :disabled="batchInputsLocked"
          :placeholder="t`例如：每条总结保留关键事件、人物状态变化和未解决问题。`"
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

    <section
      v-else-if="route.page === 'preview' && activeBook && generationState.preview"
      class="pc-summary-page pc-generation-preview-page"
    >
      <div class="pc-detail-card pc-generation-preview-card">
        <GenerationPreviewPanel
          :content="generationState.preview.content"
          :raw="generationState.preview.raw"
          raw-editable
          :reparse-handler="reparsePreviewRaw"
          save-label="保存为条目"
          :source-label="generationState.preview.source.label"
          :text-provider-summary="textProviderSummary"
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

    <section v-else-if="route.page === 'failed-draft' && activeFailedDraft" class="pc-summary-page pc-repair-page">
      <div class="pc-editor-card pc-repair-card">
        <span class="pc-kicker">{{ activeFailedDraft.source.label }}</span>
        <h2>{{ t`修复解析失败草稿` }}</h2>

        <div class="pc-number-field">
          <label class="pc-field-label">{{ t`保存到总结集` }}</label>
          <select v-model="failedDraftTargetBookId" class="pc-field">
            <option v-for="book in books" :key="book.id" :value="book.id">{{ book.title }}</option>
          </select>
        </div>

        <div v-if="!books.length" class="pc-status-card danger">
          <strong>{{ t`还没有总结集` }}</strong>
          <p>{{ t`先建一个总结集，修好的内容才能保存进去。` }}</p>
        </div>

        <div class="pc-number-field pc-repair-raw-field">
          <label class="pc-field-label">{{ t`原始输出` }}</label>
          <RawOutputEditor
            v-model="failedDraftRawOutput"
            :placeholder="t`在这里修 XML 结构或补 title / content。`"
            @reparse="reparseFailedDraft"
          />
        </div>

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
import BookShelf from '@/components/BookShelf.vue';
import EmptyState from '@/components/EmptyState.vue';
import FailedDraftList from '@/components/FailedDraftList.vue';
import GenerationPanel from '@/components/GenerationPanel.vue';
import GenerationPreviewPanel from '@/components/GenerationPreviewPanel.vue';
import PreviewDraftNotice from '@/components/PreviewDraftNotice.vue';
import RawOutputEditor from '@/components/RawOutputEditor.vue';
import ReferencePicker from '@/components/ReferencePicker.vue';
import SummaryEntryDetailPage from '@/components/summary/SummaryEntryDetailPage.vue';
import { useCatalogDetailNavigation } from '@/composables/useCatalogDetailNavigation';
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
import {
  defaultReaderBodyRule,
  normalizeArchivedMessage,
  type ChatReaderRegexRule,
  useReaderStore,
} from '@/store/reader';
import { useSettingsStore } from '@/store/settings';
import { useSummaryStore } from '@/store/summary';
import type { FailedGenerationDraft } from '@/type/generation';
import { regexDisplayReaderTarget, useRegexDisplayStore } from '@/apps/regex-display/store';
import { canOpenBaguScan } from '@/util/baguScanGate';
import { useDetailScroll } from '@/util/detailScroll';
import { transformReaderMessages } from '@/util/readerRegex';
import { formatGenerationReferences, type GenerationReferenceItem } from '@/util/references';
import { usePreviewDraftPersistence } from '@/util/previewDrafts';
import { useInvalidRouteFallback } from '@/util/routeFallback';
import { getChatMessagesSafe, stopGenerationByIdSafe } from '@/util/runtime';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const prompts = usePromptStore();
const recovery = useRecoveryStore();
const reader = useReaderStore();
const regexDisplay = useRegexDisplayStore();
const settingsStore = useSettingsStore();
const summary = useSummaryStore();
const generationTasks = useGenerationTaskStore();
const summaryGenerationAdapter = getRegisteredPhoneGenerationAdapter('summary', 'generate');
const { books, failedDrafts } = storeToRefs(summary);
const { currentRoute: route } = storeToRefs(phone);
const { entries: recoveryEntries } = storeToRefs(recovery);
const { settings: readerSettings } = storeToRefs(reader);
const { rules: regexDisplayRules } = storeToRefs(regexDisplay);
const { settings } = storeToRefs(settingsStore);

const bookTitle = ref('');
const entryDraft = reactive({
  title: '',
  rangeLabel: '',
  content: '',
});
const generationDraft = reactive({
  fromStartEnd: 20,
  recentCount: 20,
  rangeText: '',
  singleMessageId: 0,
  userRequirement: '',
});
const summaryImport = reactive({
  error: '',
  items: [] as Array<{ content: string; id: string; messageIndex: number }>,
  loading: false,
  ruleId: '__default_body__',
  selectedIds: [] as string[],
});
const generationState = reactive({
  error: '',
  generationId: '',
  preview: null as null | {
    content: string;
    draftId: null | string;
    raw: string;
    source: {
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
const summaryEntrySortDesc = ref(true);
const summaryImportTargetBookId = ref('');
const selectedReferences = ref<GenerationReferenceItem[]>([]);
const entryContentEl = ref<HTMLElement | null>(null);
const { scrollToBottom, scrollToTop } = useDetailScroll(entryContentEl, '.pc-summary-detail-page .pc-detail-content');
const showCatalogModal = ref(false);

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
  getRouteParams: () => (route.value.params?.bookId ? { bookId: route.value.params.bookId } : {}),
  page: 'preview',
  route,
  setPreview: preview => {
    generationState.preview = preview;
  },
  title: '生成预览',
});

const activeBook = computed(() => {
  const bookId = route.value.params?.bookId;
  return bookId ? summary.getBook(bookId) : null;
});
const sortedActiveBookEntries = computed(() =>
  [...(activeBook.value?.entries || [])].sort((left, right) => {
    const compare = left.createdAt.localeCompare(right.createdAt);
    return summaryEntrySortDesc.value ? -compare : compare;
  }),
);
const summaryImportTargetBook = computed(() =>
  summaryImportTargetBookId.value ? summary.getBook(summaryImportTargetBookId.value) : null,
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
const summaryImportRules = computed(() =>
  regexDisplayRules.value.filter(
    rule => rule.enabled && rule.pattern.trim() && rule.targets.includes(regexDisplayReaderTarget),
  ),
);
const allSummaryImportsSelected = computed(
  () =>
    summaryImport.items.length > 0 && summaryImport.items.every(item => summaryImport.selectedIds.includes(item.id)),
);
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
      summaryImportTargetBookId.value = current.params?.bookId || books.value[0]?.id || '';
      summaryImport.ruleId = resolveSummaryImportRuleId();
      summaryImport.error = '';
      summaryImport.items = [];
      summaryImport.selectedIds = [];
      void reloadSummaryImport();
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
    page: route.value.page,
  }),
  isInvalid: current =>
    current.appId === 'summary' &&
    ((['book', 'edit-book', 'generate'].includes(current.page) && !current.hasBook) ||
      (['entry', 'bagu-scan'].includes(current.page) && (!current.hasBook || !current.hasEntry)) ||
      (current.page === 'editor' && (!current.hasBook || (Boolean(current.entryId) && !current.hasEntry))) ||
      (current.page === 'preview' && (!current.hasBook || !current.hasPreview)) ||
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

function resolveSummaryImportRuleId() {
  const preferredId = readerSettings.value.bodyRuleId;
  return summaryImportRules.value.some(rule => rule.id === preferredId) ? preferredId : '__default_body__';
}

function getSummaryImportRule(): ChatReaderRegexRule {
  if (summaryImport.ruleId === '__default_body__') return defaultReaderBodyRule;
  const rule = summaryImportRules.value.find(item => item.id === summaryImport.ruleId);
  if (!rule) return defaultReaderBodyRule;
  return {
    find: rule.pattern,
    flags: rule.flags,
    replace: rule.replacement,
  };
}

async function reloadSummaryImport() {
  summaryImport.error = '';
  summaryImport.loading = true;
  try {
    const sourceMessages = getChatMessagesSafe('0-{{lastMessageId}}')
      .map((item, index) =>
        normalizeArchivedMessage(item, index, {
          ...readerSettings.value,
          showUserMessages: true,
        }),
      )
      .filter(
        (item): item is NonNullable<ReturnType<typeof normalizeArchivedMessage>> =>
          Boolean(item) && !item.isUser && (readerSettings.value.showHiddenAssistantMessages || !item.isHidden),
      );
    const transformed = await transformReaderMessages(
      sourceMessages.map(item => ({ messageIndex: item.messageIndex, rawText: item.rawText })),
      { find: '', flags: '', replace: '' },
      getSummaryImportRule(),
    );
    summaryImport.items = sourceMessages
      .map((item, index) => ({
        content: transformed[index]?.body.trim() || '',
        id: item.id,
        messageIndex: item.messageIndex,
      }))
      .filter(item => Boolean(item.content));
    summaryImport.selectedIds = summaryImport.items.map(item => item.id);
  } catch (caughtError) {
    summaryImport.items = [];
    summaryImport.selectedIds = [];
    summaryImport.error = caughtError instanceof Error ? caughtError.message : '读取当前聊天失败';
  } finally {
    summaryImport.loading = false;
  }
}

function toggleSummaryImport(itemId: string, checked: boolean) {
  summaryImport.selectedIds = checked
    ? [...new Set([...summaryImport.selectedIds, itemId])]
    : summaryImport.selectedIds.filter(id => id !== itemId);
}

function toggleAllSummaryImports() {
  summaryImport.selectedIds = allSummaryImportsSelected.value ? [] : summaryImport.items.map(item => item.id);
}

function importSummaryEntries() {
  const book = summaryImportTargetBook.value;
  if (!book) return;
  const selected = summaryImport.items.filter(item => summaryImport.selectedIds.includes(item.id));
  if (!selected.length) return;
  selected.forEach(item => {
    summary.createEntry(book.id, {
      content: item.content,
      rangeLabel: `第 ${item.messageIndex} 楼`,
      title: `第 ${item.messageIndex} 楼总结`,
    });
  });
  toastr.success(`已导入 ${selected.length} 条总结`);
  phone.replacePage('book', book.title, { bookId: book.id });
}

function openBatchGenerate(bookId?: string) {
  if (!bookId && !books.value.length) {
    phone.noticeWarning('请先创建总结集，再进行批量生成');
    return;
  }
  phone.pushPage('batch-generate', '批量生成总结', bookId ? { bookId } : undefined);
}

function openEntry(bookId: string, entryId: string) {
  if (!entryId) return;
  const entry = summary.getEntry(bookId, entryId);
  if (!entry) return;
  phone.pushPage('entry', entry.title, { bookId, entryId });
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
  openEntry(activeBook.value.id, entryId);
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

  const entry = summary.createEntry(bookId, entryDraft);
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
  if (!route.value.params?.bookId) return;
  phone.replacePage('generate', '生成总结', { bookId: route.value.params.bookId });
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
      phone.replacePage('failed-draft', '解析失败草稿', { bookId, draftId: result.draft.id });
      return;
    }

    if (result.status === 'saved') {
      toastr.success('已生成并保存总结');
      phone.replacePage('entry', result.saved.entry.title, { bookId, entryId: result.saved.entry.id });
      return;
    }

    generationState.preview = {
      content: result.data.content,
      draftId: null,
      raw: result.rawOutput,
      source: {
        label: result.source.label,
      },
      title: result.data.title,
      warnings: result.warnings,
    };
    persistSummaryPreviewDraft({ bookId });
    phone.replacePage('preview', '生成预览', { bookId });
  } catch (error) {
    generationState.error = error instanceof Error ? error.message : '生成失败，请稍后再试';
  }
}

function savePreview() {
  const bookId = route.value.params?.bookId;
  const preview = generationState.preview;
  if (!bookId || !preview) return;

  const entry = summary.createEntry(bookId, {
    content: preview.content,
    rangeLabel: preview.source.label,
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
    content: parsed.data.content,
    draftId: null,
    raw: parsed.raw,
    source: {
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

function formatBookMeta(count: number) {
  return `${count} 条`;
}
</script>

<style scoped>
.pc-summary-app,
.pc-summary-page {
  min-height: 100%;
}

.pc-summary-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pc-summary-hero,
.pc-entry-card,
.pc-editor-card,
.pc-detail-card {
  border: 1px solid var(--pc-border);
  background: color-mix(in srgb, var(--pc-surface) 72%, transparent 28%);
  border-radius: 20px;
  backdrop-filter: blur(12px);
}

.pc-summary-hero,
.pc-editor-card,
.pc-detail-card {
  padding: 14px;
}

.pc-summary-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.pc-summary-actions-hero {
  grid-template-columns: minmax(0, 1fr);
}

.pc-summary-actions-hero .pc-hero-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
  width: 100%;
}

.pc-summary-actions-hero .pc-primary-btn,
.pc-summary-actions-hero .pc-soft-btn,
.pc-summary-actions-hero .pc-icon-btn {
  width: 100%;
  min-width: 0;
}

.pc-summary-actions-hero .pc-icon-btn:nth-last-child(2) {
  grid-column: 2;
}

.pc-summary-import-page {
  min-height: 0;
}

.pc-summary-import-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 14px;
}

.pc-summary-import-head > span {
  color: var(--pc-muted);
  font-size: 13px;
  font-weight: 800;
}

.pc-summary-import-head > div {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

.pc-summary-import-list {
  display: grid;
  max-height: min(46vh, 420px);
  gap: 8px;
  margin-top: 12px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 2px;
}

.pc-summary-import-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: 10px;
  padding: 11px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
  cursor: pointer;
}

.pc-summary-import-item input {
  width: 18px;
  height: 18px;
  margin: 1px 0 0;
  accent-color: var(--pc-theme-accent);
}

.pc-summary-import-item span {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.pc-summary-import-item strong {
  color: var(--pc-text);
  font-size: 14px;
}

.pc-summary-import-item small {
  display: -webkit-box;
  overflow: hidden;
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.pc-summary-root-actions {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.pc-summary-root-actions .pc-soft-btn,
.pc-summary-root-actions .pc-primary-btn {
  width: 100%;
  justify-content: center;
}

.pc-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.pc-summary-hero h2,
.pc-editor-card h2,
.pc-detail-card h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
}

.pc-summary-hero p,
.pc-entry-card p,
.pc-detail-meta {
  color: var(--pc-muted);
}

.pc-entry-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pc-entry-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  padding: 14px;
}

.pc-entry-main {
  text-align: left;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
}

.pc-detail-meta,
.pc-entry-head,
.pc-section-head,
.pc-raw-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-entry-main strong {
  display: block;
  min-width: 0;
  overflow: hidden;
  font-size: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-section-head {
  align-items: baseline;
}

.pc-entry-head {
  align-items: baseline;
}

.pc-entry-head span,
.pc-detail-meta span {
  font-size: 12px;
  color: var(--pc-muted);
}

.pc-entry-main p.preview {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pc-favorite-chip {
  border: 0;
  cursor: pointer;
  color: var(--pc-text);
}

.pc-primary-btn.compact {
  min-width: 74px;
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

.pc-summary-app :is(.pc-field, .pc-area) {
  margin-top: 14px;
}

.pc-summary-app .pc-area {
  min-height: 220px;
  resize: vertical;
}

.pc-summary-app .pc-area.compact {
  min-height: 120px;
}

.pc-summary-app .pc-form-actions {
  margin-top: 16px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.pc-summary-create-actions,
.pc-batch-actions-three {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.pc-summary-create-actions > button,
.pc-batch-actions-three > button {
  width: 100%;
  min-width: 0;
  padding-inline: 6px;
  white-space: nowrap;
}

.pc-batch-actions-three > button {
  gap: 5px;
  font-size: 13px;
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

.pc-copy,
.pc-status-card p,
.pc-raw-head span {
  color: var(--pc-muted);
}

.pc-generate-form,
.pc-raw-output {
  margin-top: 14px;
}

.pc-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.pc-status-card {
  border: 1px solid var(--pc-border);
  border-radius: 18px;
  background: var(--pc-surface-strong);
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

.pc-summary-batch-mode {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: 100%;
  margin-top: 14px;
}

.pc-summary-batch-roles {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}

.pc-summary-batch-roles > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 44px;
  padding: 8px 10px;
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
}

.pc-summary-batch-roles > div > span {
  color: var(--pc-text);
  font-size: 13px;
  font-weight: 800;
}

.pc-raw-head {
  align-items: baseline;
}

.pc-raw-area {
  min-height: 180px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}
</style>
