<template>
  <section class="pc-extras-app">
    <section v-if="route.page === 'root'" class="pc-extras-page">
      <BookShelf
        :books="shelfBooks"
        create-label="生成"
        create-subtitle="生成入口"
        variant="extras"
        @create="openCreateBook"
        @select="openBook"
      />

      <FailedDraftList
        :drafts="failedDrafts"
        :get-context="failedDraftContextTitle"
        :get-title="failedDraftTitle"
        @open="openFailedDraft"
        @remove="removeFailedDraft"
      />

      <PreviewDraftNotice
        :draft="extraChapterPreviewDraft"
        label="未保存章节预览"
        @discard="discardExtraChapterPreviewDraft"
        @open="openExtraChapterPreviewDraft"
      />

      <PreviewDraftNotice
        :draft="extraSummaryPreviewDraft"
        label="未保存总结预览"
        @discard="discardExtraSummaryPreviewDraft"
        @open="openExtraSummaryPreviewDraft"
      />
    </section>

    <section v-else-if="route.page === 'book-editor'" class="pc-extras-page">
      <div class="pc-editor-card">
        <template v-if="editingBook">
          <span class="pc-kicker">{{ t`编辑番外信息` }}</span>
          <h2>{{ editingBook.title }}</h2>
        </template>
        <label class="pc-field-group">
          <span>{{ t`番外标题` }}</span>
          <input v-model="bookDraft.title" class="pc-field" type="text" :placeholder="t`输入番外标题`" />
        </label>

        <GenerationPanel
          v-if="!editingBook"
          :capture="captureNewBookPrompt"
          :capture-reset-key="newBookPromptPreview"
          :error="chapterGenerationState.error"
          :from-start-end="chapterGenerationDraft.fromStartEnd"
          :range-text="chapterGenerationDraft.rangeText"
          :raw-output="chapterGenerationState.rawOutput"
          :recent-count="chapterGenerationDraft.recentCount"
          :references="selectedReferences"
          requirement-placeholder="例如：加强情绪推进，少写说明，多写现场。"
          :running="chapterGenerationState.running"
          :single-message-id="chapterGenerationDraft.singleMessageId"
          :source-mode="settings.generation.sourceMode"
          :user-requirement="chapterGenerationDraft.userRequirement"
          @update:from-start-end="chapterGenerationDraft.fromStartEnd = $event"
          @update:range-text="chapterGenerationDraft.rangeText = $event"
          @update:recent-count="chapterGenerationDraft.recentCount = $event"
          @update:references="selectedReferences = $event"
          @update:single-message-id="chapterGenerationDraft.singleMessageId = $event"
          @update:source-mode="settings.generation.sourceMode = $event"
          @update:user-requirement="chapterGenerationDraft.userRequirement = $event"
        >
          <template #before-fields>
            <div class="pc-number-field">
              <label class="pc-field-label">
                {{ t`生成模式` }}
              </label>
              <select v-model="chapterGenerationDraft.mode" class="pc-field" :disabled="chapterGenerationState.running">
                <option value="新开一本书">{{ t`新开一本书` }}</option>
                <option value="续写上一章">{{ t`续写上一章` }}</option>
              </select>
            </div>

            <section class="pc-type-prompt-card">
              <div class="pc-section-head">
                <strong>{{ t`本次类型提示词` }}</strong>
              </div>
              <SearchableCombobox
                :disabled="chapterGenerationState.running"
                :empty-label="t`没有匹配的类型`"
                :input-label="t`选择番外类型`"
                :model-value="selectedChapterTypeValue"
                :options="chapterTypeOptions"
                :placeholder="t`选择番外类型`"
                :toggle-title="t`展开番外类型`"
                @update:model-value="selectChapterTypeValue"
              />
              <input
                v-if="showChapterCustomTypeField"
                v-model="chapterGenerationDraft.typeName"
                class="pc-field"
                type="text"
                :placeholder="t`自定义类型名称`"
              />
              <textarea
                v-model="chapterGenerationDraft.typePrompt"
                class="pc-area compact"
                :disabled="chapterGenerationState.running"
                :placeholder="t`本次生成使用的番外类型提示词`"
              ></textarea>
            </section>
          </template>

          <template #actions>
            <div class="pc-form-actions pc-extras-generate-actions">
              <button
                v-if="chapterGenerationState.running"
                class="pc-soft-btn danger"
                type="button"
                @click="stopChapterGeneration"
              >
                {{ t`停止` }}
              </button>
              <button v-else class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
              <button
                class="pc-primary-btn"
                type="button"
                :disabled="chapterGenerationState.running"
                @click="submitBookAndGenerate"
              >
                <i class="fa-solid fa-sparkles"></i>
                <span>{{ chapterGenerationState.running ? t`生成中` : t`开始生成` }}</span>
              </button>
            </div>
          </template>
        </GenerationPanel>

        <div v-else class="pc-form-actions">
          <button class="pc-soft-btn" type="button" :disabled="chapterGenerationState.running" @click="phone.goBack()">
            {{ t`取消` }}
          </button>
          <button class="pc-primary-btn" type="button" @click="submitBook">{{ t`保存` }}</button>
        </div>
      </div>
    </section>

    <section v-else-if="route.page === 'book' && activeBook" class="pc-extras-page">
      <div class="pc-extras-hero pc-extras-actions-hero">
        <div class="pc-book-actions">
          <button class="pc-soft-btn" type="button" @click="openGenerateChapter(activeBook.id)">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
            <span>{{ t`生成章节` }}</span>
          </button>
          <button class="pc-icon-btn" type="button" :title="t`编辑番外信息`" @click="openEditBook(activeBook.id)">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="pc-icon-btn danger" type="button" :title="t`删除番外`" @click="removeBook(activeBook.id)">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>

      <div class="pc-toolbar">
        <input v-model="query" class="pc-search" type="text" :placeholder="t`搜索章节标题`" />
        <button class="pc-soft-btn" type="button" @click="sortDesc = !sortDesc">
          {{ sortDesc ? t`倒序` : t`正序` }}
        </button>
      </div>

      <section class="pc-summary-section">
        <div class="pc-section-head">
          <strong>{{ t`章节总结` }}</strong>
          <div class="pc-book-actions">
            <button class="pc-soft-btn" type="button" @click="openGenerateSummary(activeBook.id)">
              {{ t`生成总结` }}
            </button>
          </div>
        </div>

        <EmptyState v-if="!activeBook.summaries.length" compact :title="t`还没有章节总结。`" />

        <div v-else class="pc-summary-list">
          <article v-for="summaryItem in activeBook.summaries" :key="summaryItem.id" class="pc-summary-card">
            <div class="pc-summary-head">
              <strong>{{ formatCoveredChapters(summaryItem.coveredChapterIds) }}</strong>
              <div class="pc-book-actions">
                <button
                  :class="['pc-toggle-chip', { active: summaryItem.enabled }]"
                  type="button"
                  @click="extras.toggleSummary(activeBook.id, summaryItem.id)"
                >
                  {{ summaryItem.enabled ? t`已启用` : t`已停用` }}
                </button>
                <button class="pc-icon-btn" type="button" @click="openEditSummary(activeBook.id, summaryItem.id)">
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button class="pc-icon-btn danger" type="button" @click="removeSummary(activeBook.id, summaryItem.id)">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>

      <EmptyState v-if="!filteredChapters.length" :title="t`没有匹配的章节`" />

      <div v-else class="pc-entry-list">
        <article v-for="chapter in filteredChapters" :key="chapter.id" class="pc-entry-card">
          <button class="pc-entry-main" type="button" @click="openChapter(activeBook.id, chapter.id)">
            <div class="pc-entry-head">
              <strong>{{ `第 ${chapter.chapterNumber} 章 · ${chapter.title}` }}</strong>
            </div>
          </button>
        </article>
      </div>
    </section>

    <section v-else-if="route.page === 'chapter-editor' && activeBook" class="pc-extras-page">
      <div class="pc-editor-card">
        <span class="pc-kicker">{{ t`编辑章节` }}</span>
        <h2>{{ editingChapter ? editingChapter.title : t`调整当前章节` }}</h2>
        <input v-model="chapterDraft.title" class="pc-field" type="text" :placeholder="t`章节标题`" />
        <textarea
          v-model="chapterDraft.content"
          class="pc-area pc-saved-content-area"
          :placeholder="t`章节正文`"
        ></textarea>
        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
          <button class="pc-primary-btn" type="button" @click="submitChapter">{{ t`保存` }}</button>
        </div>
      </div>
    </section>

    <ExtrasChapterDetailPage
      v-else-if="route.page === 'chapter' && activeBook && activeChapter"
      v-model:catalog-open="showCatalogModal"
      :catalog-items="chapterCatalogItems"
      :chapter="activeChapter"
      :generation-records="activeChapterGenerationRecords"
      :next-id="chapterNextId || ''"
      :previous-id="chapterPrevId || ''"
      @bagu="openExtrasBaguScan"
      @bottom="scrollToBottom"
      @continue="openGenerateChapter(activeBook.id)"
      @delete="removeChapter(activeBook.id, activeChapter.id)"
      @edit="openEditChapter(activeBook.id, activeChapter.id)"
      @favorite="extras.toggleFavorite(activeBook.id, activeChapter.id)"
      @next="openChapter(activeBook.id, chapterNextId || '')"
      @previous="openChapter(activeBook.id, chapterPrevId || '')"
      @rewrite="openGenerateChapter(activeBook.id, activeChapter.id)"
      @rewrite-record="rewriteWithGenerationRecord"
      @select-catalog="selectCatalogChapter"
      @top="scrollToTop"
    />

    <section v-else-if="route.page === 'bagu-scan' && activeBook && activeChapter" class="pc-extras-page">
      <div class="pc-detail-card">
        <div class="pc-detail-title-row">
          <h2>{{ `第 ${activeChapter.chapterNumber} 章 · ${activeChapter.title}` }}</h2>
        </div>
        <BaguScanPanel
          auto-scan
          class="pc-detail-bagu-panel"
          :content="activeChapter.content"
          :apply-handler="applyExtrasBaguContent"
        />
      </div>
    </section>

    <section v-else-if="route.page === 'chapter-generate' && activeBook" class="pc-extras-page">
      <div class="pc-editor-card">
        <GenerationPanel
          class="pc-extras-generation-panel"
          :capture="captureChapterPrompt"
          :capture-reset-key="chapterPromptPreview"
          :error="chapterGenerationState.error"
          :from-start-end="chapterGenerationDraft.fromStartEnd"
          :range-text="chapterGenerationDraft.rangeText"
          :raw-output="chapterGenerationState.rawOutput"
          :recent-count="chapterGenerationDraft.recentCount"
          :references="selectedReferences"
          requirement-placeholder="例如：加强情绪推进，少写说明，多写现场。"
          :running="chapterGenerationState.running"
          :single-message-id="chapterGenerationDraft.singleMessageId"
          :source-mode="settings.generation.sourceMode"
          :user-requirement="chapterGenerationDraft.userRequirement"
          @cancel="phone.goBack()"
          @generate="runChapterGeneration"
          @stop="stopChapterGeneration"
          @update:from-start-end="chapterGenerationDraft.fromStartEnd = $event"
          @update:range-text="chapterGenerationDraft.rangeText = $event"
          @update:recent-count="chapterGenerationDraft.recentCount = $event"
          @update:references="selectedReferences = $event"
          @update:single-message-id="chapterGenerationDraft.singleMessageId = $event"
          @update:source-mode="settings.generation.sourceMode = $event"
          @update:user-requirement="chapterGenerationDraft.userRequirement = $event"
        >
          <template #before-fields>
            <div class="pc-number-field">
              <label class="pc-field-label">
                {{ t`生成模式` }}
              </label>
              <select v-model="chapterGenerationDraft.mode" class="pc-field" :disabled="chapterGenerationState.running">
                <option value="续写上一章">{{ t`续写上一章` }}</option>
                <option value="新开一本书">{{ t`新开一本书` }}</option>
                <option value="重写当前章节">{{ t`重写当前章节` }}</option>
              </select>
            </div>

            <section class="pc-type-prompt-card">
              <div class="pc-section-head">
                <strong>{{ t`本次类型提示词` }}</strong>
              </div>
              <SearchableCombobox
                :disabled="chapterGenerationState.running"
                :empty-label="t`没有匹配的类型`"
                :input-label="t`选择番外类型`"
                :model-value="selectedChapterTypeValue"
                :options="chapterTypeOptions"
                :placeholder="t`选择番外类型`"
                :toggle-title="t`展开番外类型`"
                @update:model-value="selectChapterTypeValue"
              />
              <input
                v-if="showChapterCustomTypeField"
                v-model="chapterGenerationDraft.typeName"
                class="pc-field"
                type="text"
                :placeholder="t`自定义类型名称`"
              />
              <textarea
                v-model="chapterGenerationDraft.typePrompt"
                class="pc-area compact"
                :disabled="chapterGenerationState.running"
                :placeholder="t`本次生成使用的番外类型提示词`"
              ></textarea>
            </section>
          </template>
        </GenerationPanel>
      </div>
    </section>

    <section v-else-if="route.page === 'summary-editor' && activeBook" class="pc-extras-page">
      <div class="pc-editor-card">
        <span class="pc-kicker">{{ editingSummary ? t`编辑章节总结` : t`新增章节总结` }}</span>
        <h2>{{ activeBook.title }}</h2>
        <textarea
          v-model="summaryDraft.content"
          class="pc-area pc-saved-content-area"
          :placeholder="t`总结正文`"
        ></textarea>
        <div class="pc-chapter-picks">
          <label v-for="chapter in orderedChapters" :key="chapter.id" class="pc-check-item">
            <input v-model="summaryDraft.coveredChapterIds" type="checkbox" :value="chapter.id" />
            <span>{{ `第 ${chapter.chapterNumber} 章 · ${chapter.title}` }}</span>
          </label>
        </div>
        <label class="pc-switch-row">
          <div>
            <strong>{{ t`启用这条总结` }}</strong>
            <p>{{ t`后续续写时可优先引用启用中的章节总结。` }}</p>
          </div>
          <span class="pc-checkbox">
            <input v-model="summaryDraft.enabled" type="checkbox" />
          </span>
        </label>
        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
          <button class="pc-primary-btn" type="button" @click="submitSummary">{{ t`保存` }}</button>
        </div>
      </div>
    </section>

    <section v-else-if="route.page === 'summary-generate' && activeBook" class="pc-extras-page">
      <div class="pc-editor-card">
        <GenerationPanel
          class="pc-extras-generation-panel"
          :capture="captureExtraSummaryPrompt"
          :capture-reset-key="generationPromptPreview"
          :error="generationState.error"
          :from-start-end="generationDraft.fromStartEnd"
          :range-text="generationDraft.rangeText"
          :raw-output="generationState.rawOutput"
          :recent-count="generationDraft.recentCount"
          :references="selectedReferences"
          requirement-placeholder="例如：更强调角色关系推进，少写情节流水账。"
          :running="generationState.running"
          :single-message-id="generationDraft.singleMessageId"
          :source-mode="settings.generation.sourceMode"
          :user-requirement="generationDraft.userRequirement"
          @cancel="phone.goBack()"
          @generate="runSummaryGeneration"
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
            <div class="pc-chapter-picks">
              <label v-for="chapter in orderedChapters" :key="chapter.id" class="pc-check-item">
                <input
                  v-model="generationDraft.coveredChapterIds"
                  type="checkbox"
                  :value="chapter.id"
                  :disabled="generationState.running"
                />
                <span>{{ `第 ${chapter.chapterNumber} 章 · ${chapter.title}` }}</span>
              </label>
            </div>

            <label class="pc-switch-row">
              <div>
                <strong>{{ t`保存后直接启用` }}</strong>
                <p>{{ t`后续续写时可优先引用这条新总结。` }}</p>
              </div>
              <span class="pc-checkbox">
                <input v-model="generationDraft.enabled" type="checkbox" :disabled="generationState.running" />
              </span>
            </label>
          </template>
        </GenerationPanel>
      </div>
    </section>

    <section
      v-else-if="route.page === 'chapter-preview' && chapterGenerationState.preview"
      class="pc-extras-page pc-generation-preview-page"
    >
      <div class="pc-detail-card pc-generation-preview-card">
        <GenerationPreviewPanel
          :content="chapterGenerationState.preview.content"
          :raw="chapterGenerationState.preview.raw"
          raw-editable
          :reparse-handler="reparseChapterPreviewRaw"
          save-label="保存章节"
          :source-label="activeBook?.title || t`番外预览`"
          :text-provider-summary="chapterGenerationState.preview.mode"
          :title="chapterGenerationState.preview.title"
          :warnings="chapterGenerationState.preview.warnings"
          @back="returnToChapterGenerate"
          @reparse="reparseChapterPreviewRaw"
          @save="saveChapterPreview"
          @update:content="chapterGenerationState.preview.content = $event"
          @update:raw="chapterGenerationState.preview.raw = $event"
        />
      </div>
    </section>

    <section
      v-else-if="route.page === 'summary-preview' && generationState.preview"
      class="pc-extras-page pc-generation-preview-page"
    >
      <div class="pc-detail-card pc-generation-preview-card">
        <GenerationPreviewPanel
          :content="generationState.preview.content"
          :raw="generationState.preview.raw"
          raw-editable
          :reparse-handler="reparseSummaryPreviewRaw"
          save-label="保存章节总结"
          :source-label="previewBook?.title || t`章节总结预览`"
          :text-provider-summary="generationState.preview.enabled ? t`保存后启用` : t`保存后停用`"
          :title="formatCoveredChaptersForBook(previewBook, generationState.preview.coveredChapterIds)"
          :warnings="generationState.preview.warnings"
          @back="returnToGenerate"
          @reparse="reparseSummaryPreviewRaw"
          @save="saveSummaryPreview"
          @update:content="generationState.preview.content = $event"
          @update:raw="generationState.preview.raw = $event"
        />
      </div>
    </section>

    <section v-else-if="route.page === 'failed-draft' && activeFailedDraft" class="pc-extras-page pc-repair-page">
      <div class="pc-editor-card pc-repair-card">
        <span class="pc-kicker">{{ activeFailedDraft.source.label }}</span>
        <h2>{{ activeFailedDraft.actionId === 'chapter-generate' ? t`修复番外章节草稿` : t`修复章节总结草稿` }}</h2>

        <RawOutputEditor
          v-model="failedDraftRawOutput"
          :placeholder="t`在这里修 XML 结构或补 content。`"
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
import ExtrasChapterDetailPage from '@/components/extras/ExtrasChapterDetailPage.vue';
import { useExtrasChapterView } from '@/components/extras/useExtrasChapterView';
import BaguScanPanel from '@/components/BaguScanPanel.vue';
import EmptyState from '@/components/EmptyState.vue';
import FailedDraftList from '@/components/FailedDraftList.vue';
import GenerationPanel from '@/components/GenerationPanel.vue';
import GenerationPreviewPanel from '@/components/GenerationPreviewPanel.vue';
import RawOutputEditor from '@/components/RawOutputEditor.vue';
import PreviewDraftNotice from '@/components/PreviewDraftNotice.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import {
  createExtraChapterGenerationRecord,
  ExtraChapterGenerateConfigSchema,
  type ExtraChapterGenerateConfig,
  type ExtraChapterGenerationMode,
} from '@/core/extrasGeneration';
import { buildGenerationPreview, captureGenerationPrompt, generateContent } from '@/core/generationService';
import { useExtrasStore } from '@/store/extras';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import type { ExtraBook, ExtraChapterGenerationRecord } from '@/type/extra';
import type { FailedGenerationDraft } from '@/type/generation';
import { canOpenBaguScan } from '@/util/baguScanGate';
import { useDetailScroll } from '@/util/detailScroll';
import { parseContentXmlResult, parseSimpleXmlResult } from '@/util/generation';
import { usePreviewDraftPersistence } from '@/util/previewDrafts';
import { formatGenerationReferences, type GenerationReferenceItem } from '@/util/references';
import { useInvalidRouteFallback } from '@/util/routeFallback';
import { stopGenerationByIdSafe } from '@/util/runtime';
import { storeToRefs } from 'pinia';

const extras = useExtrasStore();
const phone = usePhoneStore();
const prompts = usePromptStore();
const settingsStore = useSettingsStore();
const extraChapterGenerationAdapter = getRegisteredPhoneGenerationAdapter('extras', 'chapter-generate');
const extraSummaryGenerationAdapter = getRegisteredPhoneGenerationAdapter('extras', 'chapter-summary');
const { books, failedDrafts } = storeToRefs(extras);
const { currentRoute: route } = storeToRefs(phone);
const { settings } = storeToRefs(settingsStore);
const { typePrompts } = storeToRefs(prompts);
const query = ref('');
const sortDesc = ref(true);
const chapterCustomTypeSelected = ref(false);
const chapterContentEl = ref<HTMLElement | null>(null);
const { scrollToBottom, scrollToTop } = useDetailScroll(chapterContentEl, '.pc-extras-detail-page .pc-detail-content');
const showCatalogModal = ref(false);
const bookDraft = reactive({
  typeName: '',
  title: '',
});
const chapterDraft = reactive({
  title: '',
  content: '',
});
const chapterGenerationDraft = reactive({
  fromStartEnd: 20,
  mode: '续写上一章' as ExtraChapterGenerationMode,
  rangeText: '',
  recentCount: 20,
  singleMessageId: 0,
  typeId: '',
  typeName: '',
  typePrompt: '',
  userRequirement: '',
});
const chapterGenerationState = reactive({
  error: '',
  generationId: '',
  preview: null as null | {
    content: string;
    draftId: string | null;
    generationRecord?: ExtraChapterGenerationRecord;
    mode: ExtraChapterGenerationMode;
    raw: string;
    title: string;
    warnings: string[];
  },
  rawOutput: '',
  running: false,
});
const summaryDraft = reactive({
  content: '',
  coveredChapterIds: [] as string[],
  enabled: true,
});
const generationDraft = reactive({
  coveredChapterIds: [] as string[],
  enabled: true,
  fromStartEnd: 20,
  rangeText: '',
  recentCount: 20,
  singleMessageId: 0,
  userRequirement: '',
});
const generationState = reactive({
  error: '',
  generationId: '',
  preview: null as null | {
    bookId: string;
    content: string;
    coveredChapterIds: string[];
    draftId: string | null;
    enabled: boolean;
    raw: string;
    warnings: string[];
  },
  rawOutput: '',
  running: false,
});
const failedDraftRawOutput = ref('');
const selectedReferences = ref<GenerationReferenceItem[]>([]);
type ExtraChapterPreview = NonNullable<typeof chapterGenerationState.preview>;
type ExtraSummaryPreview = NonNullable<typeof generationState.preview>;

const {
  clearPreviewDraft: clearExtraChapterPreviewDraft,
  discardPreviewDraft: discardExtraChapterPreviewDraft,
  draft: extraChapterPreviewDraft,
  openPreviewDraft: openExtraChapterPreviewDraft,
  persistPreviewDraft: persistExtraChapterPreviewDraft,
} = usePreviewDraftPersistence<ExtraChapterPreview>({
  appId: 'extras',
  consumeFailedDraft: draftId => extras.deleteFailedDraft(draftId),
  getPreview: () => chapterGenerationState.preview,
  getRouteParams: () => ({
    ...(route.value.params?.bookId ? { bookId: route.value.params.bookId } : {}),
    ...(route.value.params?.chapterId ? { chapterId: route.value.params.chapterId } : {}),
  }),
  page: 'chapter-preview',
  route,
  setPreview: preview => {
    chapterGenerationState.preview = {
      ...preview,
      mode: normalizeChapterGenerationMode(preview.mode),
    };
  },
  title: '番外预览',
});

const {
  clearPreviewDraft: clearExtraSummaryPreviewDraft,
  discardPreviewDraft: discardExtraSummaryPreviewDraft,
  draft: extraSummaryPreviewDraft,
  openPreviewDraft: openExtraSummaryPreviewDraft,
  persistPreviewDraft: persistExtraSummaryPreviewDraft,
} = usePreviewDraftPersistence<ExtraSummaryPreview>({
  appId: 'extras',
  consumeFailedDraft: draftId => extras.deleteFailedDraft(draftId),
  getPreview: () => generationState.preview,
  getRouteParams: () => (generationState.preview?.bookId ? { bookId: generationState.preview.bookId } : {}),
  page: 'summary-preview',
  route,
  setPreview: preview => {
    generationState.preview = preview;
  },
  title: '章节总结预览',
});

onScopeDispose(() => {
  if (chapterGenerationState.running && chapterGenerationState.generationId) {
    stopGenerationByIdSafe(chapterGenerationState.generationId);
  }
  if (generationState.running && generationState.generationId) {
    stopGenerationByIdSafe(generationState.generationId);
  }
});

const customChapterTypeValue = '__custom_chapter_type__';
const extraTypePrompts = computed(() => typePrompts.value.filter(item => item.domain === 'extras'));
const chapterTypeOptions = computed(() => [
  { label: '自定义', value: customChapterTypeValue },
  ...[...extraTypePrompts.value]
    .sort((left, right) => right.usageCount - left.usageCount || left.name.localeCompare(right.name, 'zh-CN'))
    .map(item => ({ label: item.name, value: item.id })),
]);
const selectedChapterTypePrompt = computed(() =>
  chapterGenerationDraft.typeId ? prompts.getTypePrompt(chapterGenerationDraft.typeId) : null,
);
const showChapterCustomTypeField = computed(
  () =>
    chapterCustomTypeSelected.value ||
    (!chapterGenerationDraft.typeId && Boolean(chapterGenerationDraft.typeName.trim())),
);
const selectedChapterTypeValue = computed(() => {
  if (chapterCustomTypeSelected.value) return customChapterTypeValue;
  return chapterGenerationDraft.typeId;
});
const currentChapterTypePrompt = computed(() => chapterGenerationDraft.typePrompt.trim());
const formattedReferences = computed(() => formatGenerationReferences(selectedReferences.value));

function getChapterAppPrompt(mode: ExtraChapterGenerationMode) {
  if (mode === '新开一本书') return prompts.appPrompts.extras;
  if (mode === '重写当前章节') return prompts.appPrompts.extrasRewrite;
  return prompts.appPrompts.extrasContinue;
}

const activeBook = computed(() => {
  const bookId = route.value.params?.bookId;
  return bookId ? extras.getBook(bookId) : null;
});

const activeChapter = computed(() => {
  const bookId = route.value.params?.bookId;
  const chapterId = route.value.params?.chapterId;
  return bookId && chapterId ? extras.getChapter(bookId, chapterId) : null;
});

const activeSummary = computed(() => {
  const bookId = route.value.params?.bookId;
  const summaryId = route.value.params?.summaryId;
  return bookId && summaryId ? extras.getSummary(bookId, summaryId) : null;
});
const activeFailedDraft = computed(() => {
  const draftId = route.value.params?.draftId;
  return draftId ? extras.getFailedDraft(draftId) : null;
});

const editingBook = computed(() => (route.value.params?.bookId ? activeBook.value : null));
const editingChapter = computed(() => (route.value.params?.chapterId ? activeChapter.value : null));
const editingSummary = computed(() => (route.value.params?.summaryId ? activeSummary.value : null));
const previewBook = computed(() =>
  generationState.preview?.bookId ? extras.getBook(generationState.preview.bookId) : null,
);
const newBookPromptPreview = computed(() => {
  try {
    return buildGenerationPreview(
      extraChapterGenerationAdapter,
      {
        appPrompt: getChapterAppPrompt(chapterGenerationDraft.mode),
        bookId: '__new_extra_book__',
        chapterId: '',
        chapterMode: chapterGenerationDraft.mode,
        outputFormat: buildChapterOutputFormat(),
        previousChapterContext: buildNewBookGenerationContext(),
        typeName: chapterGenerationDraft.typeName,
        typePrompt: currentChapterTypePrompt.value,
        userRequirement: chapterGenerationDraft.userRequirement,
      },
      {
        generationDefaults: {
          resultMode: settings.value.generation.resultMode,
          stream: settings.value.generation.stream,
          tavernPresetName: settings.value.generation.tavernPresetName,
        },
        references: formattedReferences.value,
        source: {
          fromStartEnd: chapterGenerationDraft.fromStartEnd,
          mode: settings.value.generation.sourceMode,
          rangeText: chapterGenerationDraft.rangeText,
          recentCount: chapterGenerationDraft.recentCount,
          singleMessageId: chapterGenerationDraft.singleMessageId,
        },
        textProvider: settings.value.textProvider,
      },
    ).text;
  } catch (error) {
    return error instanceof Error ? error.message : '无法生成提示词预览';
  }
});
const generationPromptPreview = computed(() => {
  if (!activeBook.value) return '未选择番外';
  try {
    return buildGenerationPreview(
      extraSummaryGenerationAdapter,
      {
        appPrompt: prompts.specialPrompts.extraSummary,
        bookId: activeBook.value.id,
        chaptersContext: buildChaptersContext(activeBook.value, generationDraft.coveredChapterIds),
        coveredChapterIds: [...generationDraft.coveredChapterIds],
        enabled: generationDraft.enabled,
        outputFormat: buildSummaryOutputFormat(),
        typePrompt: '',
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
const chapterPromptPreview = computed(() => {
  if (!activeBook.value) return '未选择番外';
  try {
    return buildGenerationPreview(
      extraChapterGenerationAdapter,
      {
        appPrompt: getChapterAppPrompt(chapterGenerationDraft.mode),
        bookId: activeBook.value.id,
        chapterId: route.value.params?.chapterId || '',
        chapterMode: chapterGenerationDraft.mode,
        outputFormat: buildChapterOutputFormat(),
        previousChapterContext: buildPreviousChapterContext(activeBook.value),
        typeName: chapterGenerationDraft.typeName,
        typePrompt: currentChapterTypePrompt.value,
        userRequirement: chapterGenerationDraft.userRequirement,
      },
      {
        generationDefaults: {
          resultMode: settings.value.generation.resultMode,
          stream: settings.value.generation.stream,
          tavernPresetName: settings.value.generation.tavernPresetName,
        },
        references: formattedReferences.value,
        source: {
          fromStartEnd: chapterGenerationDraft.fromStartEnd,
          mode: settings.value.generation.sourceMode,
          rangeText: chapterGenerationDraft.rangeText,
          recentCount: chapterGenerationDraft.recentCount,
          singleMessageId: chapterGenerationDraft.singleMessageId,
        },
        textProvider: settings.value.textProvider,
      },
    ).text;
  } catch (error) {
    return error instanceof Error ? error.message : '无法生成提示词预览';
  }
});
function captureNewBookPrompt() {
  return captureGenerationPrompt(
    extraChapterGenerationAdapter,
    {
      appPrompt: getChapterAppPrompt(chapterGenerationDraft.mode),
      bookId: '__new_extra_book__',
      chapterId: '',
      chapterMode: chapterGenerationDraft.mode,
      outputFormat: buildChapterOutputFormat(),
      previousChapterContext: buildNewBookGenerationContext(),
      typeName: chapterGenerationDraft.typeName,
      typePrompt: currentChapterTypePrompt.value,
      userRequirement: chapterGenerationDraft.userRequirement,
    },
    {
      generationDefaults: {
        resultMode: settings.value.generation.resultMode,
        stream: settings.value.generation.stream,
        tavernPresetName: settings.value.generation.tavernPresetName,
      },
      references: formattedReferences.value,
      source: {
        fromStartEnd: chapterGenerationDraft.fromStartEnd,
        mode: settings.value.generation.sourceMode,
        rangeText: chapterGenerationDraft.rangeText,
        recentCount: chapterGenerationDraft.recentCount,
        singleMessageId: chapterGenerationDraft.singleMessageId,
      },
      textProvider: settings.value.textProvider,
    },
  );
}

function captureExtraSummaryPrompt() {
  if (!activeBook.value) return Promise.reject(new Error('未选择番外'));
  return captureGenerationPrompt(
    extraSummaryGenerationAdapter,
    {
      appPrompt: prompts.specialPrompts.extraSummary,
      bookId: activeBook.value.id,
      chaptersContext: buildChaptersContext(activeBook.value, generationDraft.coveredChapterIds),
      coveredChapterIds: [...generationDraft.coveredChapterIds],
      enabled: generationDraft.enabled,
      outputFormat: buildSummaryOutputFormat(),
      typePrompt: '',
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

function captureChapterPrompt() {
  if (!activeBook.value) return Promise.reject(new Error('未选择番外'));
  return captureGenerationPrompt(
    extraChapterGenerationAdapter,
    {
      appPrompt: getChapterAppPrompt(chapterGenerationDraft.mode),
      bookId: activeBook.value.id,
      chapterId: route.value.params?.chapterId || '',
      chapterMode: chapterGenerationDraft.mode,
      outputFormat: buildChapterOutputFormat(),
      previousChapterContext: buildPreviousChapterContext(activeBook.value),
      typeName: chapterGenerationDraft.typeName,
      typePrompt: currentChapterTypePrompt.value,
      userRequirement: chapterGenerationDraft.userRequirement,
    },
    {
      generationDefaults: {
        resultMode: settings.value.generation.resultMode,
        stream: settings.value.generation.stream,
        tavernPresetName: settings.value.generation.tavernPresetName,
      },
      references: formattedReferences.value,
      source: {
        fromStartEnd: chapterGenerationDraft.fromStartEnd,
        mode: settings.value.generation.sourceMode,
        rangeText: chapterGenerationDraft.rangeText,
        recentCount: chapterGenerationDraft.recentCount,
        singleMessageId: chapterGenerationDraft.singleMessageId,
      },
      textProvider: settings.value.textProvider,
    },
  );
}

const {
  catalogItems: chapterCatalogItems,
  generationRecords: activeChapterGenerationRecords,
  nextId: chapterNextId,
  orderedChapters,
  previousId: chapterPrevId,
} = useExtrasChapterView(activeBook, activeChapter);

const filteredChapters = computed(() => {
  const chapters = [...(activeBook.value?.chapters || [])];
  const normalized = query.value.trim().toLowerCase();
  const result = normalized ? chapters.filter(chapter => chapter.title.toLowerCase().includes(normalized)) : chapters;
  result.sort((left, right) => {
    const compare = left.chapterNumber - right.chapterNumber;
    return sortDesc.value ? -compare : compare;
  });
  return result;
});
const shelfBooks = computed(() =>
  books.value.map(book => ({
    count: book.chapters.length,
    gradient: 'linear-gradient(180deg, #f472b6 0%, #fb7185 100%)',
    icon: 'fa-solid fa-book',
    id: book.id,
    subtitle: `${book.typeName} · ${book.chapters.length} 章`,
    title: book.title,
  })),
);

watch(
  () => route.value,
  (current, previous) => {
    if (current.appId !== 'extras') return;
    if (current.page === 'book-editor') {
      bookDraft.typeName = editingBook.value?.typeName || '';
      bookDraft.title = editingBook.value?.title || '';
      if (!editingBook.value && previous?.page !== 'chapter-preview') {
        selectedReferences.value = [];
        resetChapterGenerationDraft('新开一本书');
      }
    }

    if (current.page === 'chapter-editor') {
      chapterDraft.title = editingChapter.value?.title || '';
      chapterDraft.content = editingChapter.value?.content || '';
    }

    if (current.page === 'chapter-generate' && previous?.page !== 'chapter-preview') {
      selectedReferences.value = [];
      resetChapterGenerationDraft(
        current.params?.chapterId ? '重写当前章节' : activeBook.value?.chapters.length ? '续写上一章' : '新开一本书',
        current.params?.generationRecordId,
      );
    }

    if (current.page === 'summary-editor') {
      summaryDraft.content = editingSummary.value?.content || '';
      summaryDraft.coveredChapterIds = [...(editingSummary.value?.coveredChapterIds || [])];
      summaryDraft.enabled = editingSummary.value?.enabled ?? true;
    }

    if (current.page === 'summary-generate' && previous?.page !== 'summary-preview') {
      selectedReferences.value = [];
      generationDraft.coveredChapterIds = activeBook.value?.chapters.map(chapter => chapter.id) || [];
      generationDraft.enabled = true;
      generationDraft.fromStartEnd = 20;
      generationDraft.rangeText = '';
      generationDraft.recentCount = 20;
      generationDraft.singleMessageId = 0;
      generationDraft.userRequirement = '';
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
    bookId: route.value.params?.bookId,
    chapterId: route.value.params?.chapterId,
    hasBook: Boolean(activeBook.value),
    hasChapter: Boolean(activeChapter.value),
    hasChapterPreview: Boolean(chapterGenerationState.preview),
    hasFailedDraft: Boolean(activeFailedDraft.value),
    hasSummary: Boolean(activeSummary.value),
    hasSummaryPreview: Boolean(generationState.preview),
    page: route.value.page,
    summaryId: route.value.params?.summaryId,
  }),
  isInvalid: current =>
    current.appId === 'extras' &&
    ((current.page === 'book' && !current.hasBook) ||
      (current.page === 'book-editor' && Boolean(current.bookId) && !current.hasBook) ||
      (current.page === 'chapter' && (!current.hasBook || !current.hasChapter)) ||
      (current.page === 'bagu-scan' && (!current.hasBook || !current.hasChapter)) ||
      (current.page === 'chapter-editor' &&
        (!current.hasBook || (Boolean(current.chapterId) && !current.hasChapter))) ||
      (current.page === 'chapter-generate' &&
        (!current.hasBook || (Boolean(current.chapterId) && !current.hasChapter))) ||
      (current.page === 'summary-editor' &&
        (!current.hasBook || (Boolean(current.summaryId) && !current.hasSummary))) ||
      (current.page === 'summary-generate' && !current.hasBook) ||
      (current.page === 'chapter-preview' && !current.hasChapterPreview) ||
      (current.page === 'summary-preview' && !current.hasSummaryPreview) ||
      (current.page === 'failed-draft' && !current.hasFailedDraft)),
  fallback: () => {
    if (route.value.appId !== 'extras') return;
    if (activeBook.value) {
      phone.replacePage('book', activeBook.value.title, { bookId: activeBook.value.id });
      return;
    }
    phone.replacePage('root', '番外书架');
  },
});

function buildNewBookGenerationContext() {
  const title = bookDraft.title.trim();
  return title ? `番外书名：${title}` : '';
}

function normalizeChapterGenerationMode(value: unknown): ExtraChapterGenerationMode {
  if (value === '新开一本书' || value === '重写当前章节') return value;
  return '续写上一章';
}

function resetChapterGenerationDraft(mode: typeof chapterGenerationDraft.mode, generationRecordId?: string) {
  const book = activeBook.value;
  const promptById = book?.typeId ? prompts.getTypePrompt(book.typeId) : null;
  const normalizedTypeName = book?.typeName.trim().toLocaleLowerCase() || '';
  const prompt =
    promptById?.domain === 'extras'
      ? promptById
      : (extraTypePrompts.value.find(item => item.name.trim().toLocaleLowerCase() === normalizedTypeName) ?? null);
  if (book && prompt && book.typeId !== prompt.id) {
    extras.updateBook(book.id, {
      title: book.title,
      typeId: prompt.id,
      typeName: book.typeName || prompt.name,
    });
  }
  chapterGenerationDraft.fromStartEnd = 20;
  chapterGenerationDraft.mode = mode;
  chapterGenerationDraft.rangeText = '';
  chapterGenerationDraft.recentCount = 20;
  chapterGenerationDraft.singleMessageId = 0;
  chapterGenerationDraft.typeId = prompt?.id || '';
  chapterGenerationDraft.typeName = book?.typeName || prompt?.name || '';
  chapterGenerationDraft.typePrompt = prompt?.prompt || '';
  chapterGenerationDraft.userRequirement = '';
  const generationRecord =
    mode === '重写当前章节'
      ? [...(activeChapter.value?.generationRecords || [])]
          .reverse()
          .find(record => !generationRecordId || record.id === generationRecordId)
      : null;
  if (generationRecord) {
    chapterGenerationDraft.fromStartEnd = generationRecord.fromStartEnd;
    chapterGenerationDraft.rangeText = generationRecord.rangeText;
    chapterGenerationDraft.recentCount = generationRecord.recentCount;
    chapterGenerationDraft.singleMessageId = generationRecord.singleMessageId;
    chapterGenerationDraft.typeId = generationRecord.typeId;
    chapterGenerationDraft.typeName = generationRecord.typeName;
    chapterGenerationDraft.typePrompt = generationRecord.typePrompt;
    chapterGenerationDraft.userRequirement = generationRecord.userRequirement;
    selectedReferences.value = generationRecord.references.map(reference => ({
      ...reference,
      sourcePath: [...reference.sourcePath],
    }));
    settings.value.generation.sourceMode = generationRecord.sourceMode;
    settings.value.generation.tavernPresetName = generationRecord.tavernPresetName;
  }
  chapterCustomTypeSelected.value = !chapterGenerationDraft.typeId && Boolean(chapterGenerationDraft.typeName.trim());
  chapterGenerationState.error = '';
  chapterGenerationState.preview = null;
  chapterGenerationState.rawOutput = '';
}

function selectChapterTypePrompt(promptId: string) {
  const prompt = prompts.getTypePrompt(promptId);
  chapterGenerationDraft.typeId = promptId;
  chapterCustomTypeSelected.value = false;
  if (prompt) {
    chapterGenerationDraft.typeName = prompt.name;
    chapterGenerationDraft.typePrompt = prompt.prompt;
  }
}

function selectCustomChapterType() {
  chapterGenerationDraft.typeId = '';
  chapterCustomTypeSelected.value = true;
  chapterGenerationDraft.typeName = '';
  chapterGenerationDraft.typePrompt = '';
}

function selectChapterTypeValue(value: string) {
  if (value === customChapterTypeValue) {
    selectCustomChapterType();
    return;
  }
  if (value) selectChapterTypePrompt(value);
}

function saveChapterTypePrompt() {
  const name = chapterGenerationDraft.typeName.trim();
  const promptText = chapterGenerationDraft.typePrompt.trim();
  if (!name && !promptText) return null;
  if (chapterGenerationDraft.typeId) {
    const updated = prompts.updateTypePrompt(chapterGenerationDraft.typeId, {
      domain: 'extras',
      name: name || selectedChapterTypePrompt.value?.name || '未分类番外',
      prompt: promptText,
    });
    if (!updated) return null;
    chapterGenerationDraft.typeName = updated.name;
    chapterGenerationDraft.typePrompt = updated.prompt;
    chapterCustomTypeSelected.value = false;
    return updated;
  }
  const created = prompts.createTypePrompt({
    domain: 'extras',
    name: name || '未分类番外',
    prompt: promptText,
  });
  chapterGenerationDraft.typeId = created.id;
  chapterGenerationDraft.typeName = created.name;
  chapterGenerationDraft.typePrompt = created.prompt;
  chapterCustomTypeSelected.value = false;
  return created;
}

function openCreateBook() {
  phone.pushPage('book-editor', '新建番外');
}

function openEditBook(bookId: string) {
  phone.pushPage('book-editor', '编辑番外', { bookId });
}

function submitBook() {
  const payload = {
    title: bookDraft.title,
    typeId: editingBook.value?.typeId || chapterGenerationDraft.typeId || undefined,
    typeName: bookDraft.typeName.trim() || chapterGenerationDraft.typeName.trim() || '未分类番外',
  };
  if (editingBook.value && route.value.params?.bookId) {
    const book = extras.updateBook(route.value.params.bookId, payload);
    if (!book) return;
    phone.replacePage('book', book.title, { bookId: book.id });
    return;
  }

  const book = extras.createBook(payload);
  phone.replacePage('book', book.title, { bookId: book.id });
}

async function submitBookAndGenerate() {
  const payload = {
    title: bookDraft.title,
    typeId: chapterGenerationDraft.typeId || undefined,
    typeName: bookDraft.typeName.trim() || chapterGenerationDraft.typeName.trim() || '未分类番外',
  };
  if (editingBook.value && route.value.params?.bookId) {
    const book = extras.updateBook(route.value.params.bookId, payload);
    if (!book) return;
    await runChapterGenerationForBook(book.id, book, route.value.params?.chapterId || '');
    return;
  }

  const book = extras.createBook(payload);
  await runChapterGenerationForBook(book.id, book);
}

function openBook(bookId: string) {
  const book = extras.getBook(bookId);
  if (!book) return;
  query.value = '';
  sortDesc.value = true;
  phone.pushPage('book', book.title, { bookId });
}

async function removeBook(bookId: string) {
  const book = extras.getBook(bookId);
  const shouldDelete = await phone.confirmNotice(
    `要删除番外“${book?.title || '未命名番外'}”吗？章节、大纲和章节总结都会一起删除。`,
    {
      confirmLabel: '删除',
      kind: 'warning',
    },
  );
  if (!shouldDelete) return;
  extras.deleteBook(bookId);
  phone.replacePage('root', '番外书架');
  toastr.success('已删除番外');
}

function openGenerateChapter(bookId: string, chapterId?: string, generationRecordId?: string) {
  phone.pushPage(
    'chapter-generate',
    chapterId ? '重写章节' : '生成章节',
    chapterId ? { bookId, chapterId, ...(generationRecordId ? { generationRecordId } : {}) } : { bookId },
  );
}

function rewriteWithGenerationRecord(generationRecordId: string) {
  if (!activeBook.value || !activeChapter.value) return;
  openGenerateChapter(activeBook.value.id, activeChapter.value.id, generationRecordId);
}

function openEditChapter(bookId: string, chapterId: string) {
  phone.pushPage('chapter-editor', '编辑章节', { bookId, chapterId });
}

function submitChapter() {
  const bookId = route.value.params?.bookId;
  if (!bookId) return;

  if (editingChapter.value && route.value.params?.chapterId) {
    const chapter = extras.updateChapter(bookId, route.value.params.chapterId, chapterDraft);
    if (!chapter) return;
    phone.replacePage('chapter', chapter.title, { bookId, chapterId: chapter.id });
    return;
  }

  const chapter = extras.createChapter(bookId, chapterDraft);
  if (!chapter) return;
  phone.replacePage('chapter', chapter.title, { bookId, chapterId: chapter.id });
}

function applyExtrasBaguContent(content: string) {
  if (!activeBook.value || !activeChapter.value) return false;
  const chapter = extras.updateChapter(activeBook.value.id, activeChapter.value.id, {
    content,
    title: activeChapter.value.title,
  });
  return Boolean(chapter);
}

function openChapter(bookId: string, chapterId: string) {
  if (!chapterId) return;
  const chapter = extras.getChapter(bookId, chapterId);
  if (!chapter) return;
  phone.pushPage('chapter', chapter.title, { bookId, chapterId });
  void nextTick(() => scrollToTop('auto'));
}

function openExtrasBaguScan() {
  if (!activeBook.value || !activeChapter.value) return;
  if (!canOpenBaguScan(activeChapter.value.content)) return;
  phone.pushPage('bagu-scan', '八股检测', {
    bookId: activeBook.value.id,
    chapterId: activeChapter.value.id,
  });
}

function selectCatalogChapter(chapterId: string) {
  if (!activeBook.value) return;
  showCatalogModal.value = false;
  openChapter(activeBook.value.id, chapterId);
}

async function removeChapter(bookId: string, chapterId: string) {
  const chapter = extras.getChapter(bookId, chapterId);
  const shouldDelete = await phone.confirmNotice(`要删除章节“${chapter?.title || '未命名章节'}”吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!shouldDelete) return;
  extras.deleteChapter(bookId, chapterId);
  const book = extras.getBook(bookId);
  if (!book) {
    phone.goHome();
    toastr.success('已删除章节');
    return;
  }
  phone.replacePage('book', book.title, { bookId });
  toastr.success('已删除章节');
}

function openGenerateSummary(bookId: string) {
  phone.pushPage('summary-generate', '生成章节总结', { bookId });
}

function openEditSummary(bookId: string, summaryId: string) {
  phone.pushPage('summary-editor', '编辑章节总结', { bookId, summaryId });
}

function openFailedDraft(draftId: string) {
  const draft = extras.getFailedDraft(draftId);
  if (!draft) return;
  const bookId = typeof draft.context.bookId === 'string' ? draft.context.bookId : '';
  phone.pushPage('failed-draft', '解析失败草稿', bookId ? { draftId, bookId } : { draftId });
}

function submitSummary() {
  const bookId = route.value.params?.bookId;
  if (!bookId || !summaryDraft.content.trim()) return;

  if (editingSummary.value && route.value.params?.summaryId) {
    extras.updateSummary(bookId, route.value.params.summaryId, summaryDraft);
  } else {
    extras.createSummary(bookId, summaryDraft);
  }
  const book = extras.getBook(bookId);
  if (!book) return;
  phone.replacePage('book', book.title, { bookId });
}

async function removeSummary(bookId: string, summaryId: string) {
  const summaryItem = extras.getSummary(bookId, summaryId);
  const shouldDelete = await phone.confirmNotice(
    `要删除这条章节总结吗？${summaryItem?.enabled ? '当前启用状态也会一并移除。' : ''}`,
    {
      confirmLabel: '删除',
      kind: 'warning',
    },
  );
  if (!shouldDelete) return;
  extras.deleteSummary(bookId, summaryId);
  toastr.success('已删除章节总结');
}

function buildSummaryOutputFormat() {
  return prompts.resolveOutputFormat('extras.summary');
}

function buildChapterOutputFormat() {
  return prompts.resolveOutputFormat('extras.chapter');
}

function buildPreviousChapterContext(book = activeBook.value) {
  if (!book) return '';

  if (chapterGenerationDraft.mode === '新开一本书') {
    return book.title.trim() ? `番外书名：${book.title.trim()}` : '';
  }

  if (chapterGenerationDraft.mode === '重写当前章节' && activeChapter.value) {
    return [
      `番外书名：${book.title}`,
      `需要重写的章节：第 ${activeChapter.value.chapterNumber} 章 · ${activeChapter.value.title}`,
      activeChapter.value.content,
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  const chapterBlocks = orderedChapters.value.map(chapter =>
    [`第 ${chapter.chapterNumber} 章 · ${chapter.title}`, chapter.content].join('\n'),
  );
  const summaryBlocks = (book.summaries || [])
    .filter(summaryItem => summaryItem.enabled)
    .map(summaryItem => `${formatCoveredChapters(summaryItem.coveredChapterIds)} 总结\n${summaryItem.content}`);

  return [
    `番外书名：${book.title}`,
    chapterBlocks.length ? `已保存章节：\n${chapterBlocks.join('\n\n')}` : '当前还没有已保存章节。',
    summaryBlocks.length ? `已启用总结：\n${summaryBlocks.join('\n\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function buildChaptersContext(book = activeBook.value, coveredChapterIds = generationDraft.coveredChapterIds) {
  if (!book) return '';
  const selectedChapters = book.chapters
    .filter(chapter => coveredChapterIds.includes(chapter.id))
    .sort((left, right) => left.chapterNumber - right.chapterNumber);
  const chapterBlocks = selectedChapters.map(chapter =>
    [`第 ${chapter.chapterNumber} 章 · ${chapter.title}`, chapter.content].join('\n'),
  );

  return [`番外书名：${book.title}`, chapterBlocks.join('\n\n')].filter(Boolean).join('\n\n');
}

function getDraftContextValue<T>(draft: NonNullable<typeof activeFailedDraft.value>, key: string, fallback: T) {
  return (draft.context[key] as T | undefined) ?? fallback;
}

function draftContextBookTitle(context: Record<string, unknown>) {
  const bookId = typeof context.bookId === 'string' ? context.bookId : '';
  return extras.getBook(bookId)?.title || '未知番外';
}

function failedDraftContextTitle(draft: FailedGenerationDraft) {
  return draftContextBookTitle(draft.context);
}

function failedDraftTitle(draft: FailedGenerationDraft) {
  return draft.actionId === 'chapter-generate' ? '未解析番外章节' : '未解析章节总结';
}

function returnToGenerate() {
  if (generationState.preview?.draftId) {
    phone.replacePage('failed-draft', '解析失败草稿', { draftId: generationState.preview.draftId });
    return;
  }
  const bookId = generationState.preview?.bookId || route.value.params?.bookId;
  if (!bookId) return;
  phone.replacePage('summary-generate', '生成章节总结', { bookId });
}

function returnToChapterGenerate() {
  const bookId = route.value.params?.bookId || activeBook.value?.id;
  if (!bookId) return;
  phone.replacePage(
    'chapter-generate',
    chapterGenerationDraft.mode === '重写当前章节' ? '重写章节' : '生成章节',
    route.value.params?.chapterId ? { bookId, chapterId: route.value.params.chapterId } : { bookId },
  );
}

async function runChapterGeneration() {
  const bookId = route.value.params?.bookId;
  const book = activeBook.value;
  if (!bookId || !book) return;
  await runChapterGenerationForBook(bookId, book, route.value.params?.chapterId || '');
}

async function runChapterGenerationForBook(bookId: string, book: ExtraBook, chapterId = '') {
  if (chapterGenerationDraft.mode === '重写当前章节' && !chapterId) {
    chapterGenerationState.error = '当前没有可重写的章节';
    return;
  }

  chapterGenerationState.error = '';
  clearExtraChapterPreviewDraft();
  chapterGenerationState.preview = null;
  chapterGenerationState.rawOutput = '';
  const savedTypePrompt = saveChapterTypePrompt();
  if (savedTypePrompt) {
    extras.updateBook(bookId, {
      title: book.title,
      typeId: savedTypePrompt.id,
      typeName: savedTypePrompt.name,
    });
  }

  try {
    const generationConfig = {
      appPrompt: getChapterAppPrompt(chapterGenerationDraft.mode),
      bookId,
      chapterId,
      chapterMode: chapterGenerationDraft.mode,
      fromStartEnd: chapterGenerationDraft.fromStartEnd,
      outputFormat: buildChapterOutputFormat(),
      previousChapterContext: buildPreviousChapterContext(book),
      rangeText: chapterGenerationDraft.rangeText,
      recentCount: chapterGenerationDraft.recentCount,
      references: selectedReferences.value.map(reference => ({
        ...reference,
        sourcePath: [...reference.sourcePath],
      })),
      singleMessageId: chapterGenerationDraft.singleMessageId,
      sourceMode: settings.value.generation.sourceMode,
      tavernPresetName: settings.value.generation.tavernPresetName,
      typeId: chapterGenerationDraft.typeId,
      typeName: chapterGenerationDraft.typeName,
      typePrompt: currentChapterTypePrompt.value,
      userRequirement: chapterGenerationDraft.userRequirement,
    } satisfies ExtraChapterGenerateConfig;
    const result = await generateContent(extraChapterGenerationAdapter, generationConfig, {
      createFailedDraft: input => extras.createFailedDraft(input),
      generationDefaults: {
        resultMode: settings.value.generation.resultMode,
        stream: settings.value.generation.stream,
        tavernPresetName: settings.value.generation.tavernPresetName,
      },
      references: formattedReferences.value,
      lifecycle: {
        onFinish() {
          chapterGenerationState.running = false;
          chapterGenerationState.generationId = '';
        },
        onRawOutput(rawOutput) {
          chapterGenerationState.rawOutput = rawOutput;
        },
        onStart(generationId) {
          chapterGenerationState.running = true;
          chapterGenerationState.generationId = generationId;
        },
      },
      source: {
        fromStartEnd: chapterGenerationDraft.fromStartEnd,
        mode: settings.value.generation.sourceMode,
        rangeText: chapterGenerationDraft.rangeText,
        recentCount: chapterGenerationDraft.recentCount,
        singleMessageId: chapterGenerationDraft.singleMessageId,
      },
      textProvider: settings.value.textProvider,
    });

    if (result.status === 'failed') {
      failedDraftRawOutput.value = result.rawOutput;
      chapterGenerationState.error = result.warnings.join('；') || '模型没有返回可解析的番外 XML';
      toastr.warning('XML 解析失败，已保存到失败草稿');
      phone.replacePage('failed-draft', '解析失败草稿', { draftId: result.draft.id, bookId });
      return;
    }

    if (result.status === 'saved') {
      const savedChapter = result.saved.chapter;
      toastr.success(chapterGenerationDraft.mode === '重写当前章节' ? '已重写并保存章节' : '已生成并保存章节');
      phone.replacePage('chapter', savedChapter.title, { bookId, chapterId: savedChapter.id });
      return;
    }

    chapterGenerationState.preview = {
      content: result.data.content,
      draftId: null,
      generationRecord: createExtraChapterGenerationRecord(generationConfig, result.source),
      mode: chapterGenerationDraft.mode,
      raw: result.rawOutput,
      title: result.data.title,
      warnings: result.warnings,
    };
    persistExtraChapterPreviewDraft(chapterId ? { bookId, chapterId } : { bookId });
    phone.replacePage('chapter-preview', '番外预览', chapterId ? { bookId, chapterId } : { bookId });
  } catch (error) {
    chapterGenerationState.error = error instanceof Error ? error.message : '生成失败，请稍后再试';
  }
}

function saveChapterPreview() {
  const preview = chapterGenerationState.preview;
  const bookId = route.value.params?.bookId;
  if (!preview || !bookId) return;

  const chapter =
    preview.mode === '重写当前章节' && route.value.params?.chapterId
      ? extras.updateChapter(bookId, route.value.params.chapterId, {
          content: preview.content,
          generationRecord: preview.generationRecord,
          title: preview.title,
        })
      : extras.createChapter(bookId, {
          content: preview.content,
          generationRecord: preview.generationRecord,
          title: preview.title,
        });

  if (!chapter) {
    toastr.warning('目标番外不存在，无法保存章节');
    return;
  }
  if (preview.draftId) {
    extras.deleteFailedDraft(preview.draftId);
  }
  clearExtraChapterPreviewDraft();
  chapterGenerationState.preview = null;
  toastr.success(preview.mode === '重写当前章节' ? '已保存重写章节' : '已保存新章节');
  phone.replacePage('chapter', chapter.title, { bookId, chapterId: chapter.id });
}

function reparseChapterPreviewRaw() {
  const preview = chapterGenerationState.preview;
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

async function runSummaryGeneration() {
  const bookId = route.value.params?.bookId;
  const book = activeBook.value;
  if (!bookId || !book) return;
  if (!generationDraft.coveredChapterIds.length) {
    generationState.error = '请至少选择一章后再生成总结';
    return;
  }

  generationState.error = '';
  clearExtraSummaryPreviewDraft();
  generationState.preview = null;
  generationState.rawOutput = '';

  try {
    const result = await generateContent(
      extraSummaryGenerationAdapter,
      {
        appPrompt: prompts.specialPrompts.extraSummary,
        bookId,
        chaptersContext: buildChaptersContext(book, generationDraft.coveredChapterIds),
        coveredChapterIds: [...generationDraft.coveredChapterIds],
        enabled: generationDraft.enabled,
        outputFormat: buildSummaryOutputFormat(),
        typePrompt: '',
        userRequirement: generationDraft.userRequirement,
      },
      {
        createFailedDraft: input => extras.createFailedDraft(input),
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
      generationState.error = result.warnings.join('；') || '模型没有返回可解析的章节总结 XML';
      toastr.warning('XML 解析失败，已保存到失败草稿');
      phone.replacePage('failed-draft', '解析失败草稿', { draftId: result.draft.id });
      return;
    }

    if (result.status === 'saved') {
      const nextBook = extras.getBook(bookId);
      toastr.success('已生成并保存章节总结');
      if (nextBook) {
        phone.replacePage('book', nextBook.title, { bookId });
      }
      return;
    }

    generationState.preview = {
      bookId,
      content: result.data.content,
      coveredChapterIds: [...generationDraft.coveredChapterIds],
      draftId: null,
      enabled: generationDraft.enabled,
      raw: result.rawOutput,
      warnings: result.warnings,
    };
    persistExtraSummaryPreviewDraft({ bookId });
    phone.replacePage('summary-preview', '章节总结预览', { bookId });
  } catch (error) {
    generationState.error = error instanceof Error ? error.message : '生成失败，请稍后再试';
  }
}

function saveSummaryPreview() {
  const preview = generationState.preview;
  if (!preview) return;

  const summary = extras.createSummary(preview.bookId, {
    content: preview.content,
    coveredChapterIds: [...preview.coveredChapterIds],
    enabled: preview.enabled,
  });
  if (!summary) {
    toastr.warning('目标番外不存在，无法保存章节总结');
    return;
  }
  if (preview.draftId) {
    extras.deleteFailedDraft(preview.draftId);
  }
  clearExtraSummaryPreviewDraft();
  generationState.preview = null;
  const book = extras.getBook(preview.bookId);
  toastr.success('已保存章节总结');
  if (book) {
    phone.replacePage('book', book.title, { bookId: book.id });
  }
}

function reparseSummaryPreviewRaw() {
  const preview = generationState.preview;
  if (!preview) return false;
  const rawOutput = preview.raw.trim();
  if (!rawOutput) {
    toastr.warning('先补一点可解析的 XML 内容');
    return false;
  }

  const parsed = parseContentXmlResult(rawOutput);
  if (!parsed.ok) {
    preview.raw = rawOutput;
    preview.warnings = parsed.warnings;
    toastr.warning(parsed.warnings.join('；') || '还是没能解析成功');
    return false;
  }

  preview.content = parsed.data.content;
  preview.raw = parsed.raw;
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

function stopChapterGeneration() {
  if (!chapterGenerationState.generationId) return;
  stopGenerationByIdSafe(chapterGenerationState.generationId);
  chapterGenerationState.running = false;
  chapterGenerationState.error = '生成已停止';
}

async function removeFailedDraft(draftId: string) {
  const shouldDelete = await phone.confirmNotice('要删除这条解析失败草稿吗？原始输出也会一并移除。', {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!shouldDelete) return;
  extras.deleteFailedDraft(draftId);
  failedDraftRawOutput.value = '';
  if (route.value.page === 'failed-draft') {
    phone.replacePage('root', '番外书架');
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

  if (draft.actionId === 'chapter-generate') {
    const parsed = parseSimpleXmlResult(rawOutput);
    if (!parsed.ok) {
      extras.updateFailedDraft(draft.id, {
        rawOutput,
        warnings: parsed.warnings,
      });
      failedDraftRawOutput.value = rawOutput;
      toastr.warning(parsed.warnings.join('；') || '还是没能解析成功');
      return;
    }

    extras.updateFailedDraft(draft.id, {
      rawOutput: parsed.raw,
      warnings: parsed.warnings,
    });
    chapterGenerationState.preview = {
      content: parsed.data.content,
      draftId: null,
      generationRecord: (() => {
        const config = ExtraChapterGenerateConfigSchema.safeParse(draft.context);
        return config.success ? createExtraChapterGenerationRecord(config.data, draft.source) : undefined;
      })(),
      mode: normalizeChapterGenerationMode(draft.context.chapterMode),
      raw: parsed.raw,
      title: parsed.data.title,
      warnings: parsed.warnings,
    };
    const bookId = getDraftContextValue(draft, 'bookId', '');
    if (!extras.getBook(bookId)) {
      toastr.warning('原番外已经不存在，暂时不能恢复这条章节草稿');
      return;
    }
    const chapterId = getDraftContextValue(draft, 'chapterId', '');
    persistExtraChapterPreviewDraft({
      bookId,
      ...(chapterId ? { chapterId } : {}),
    });
    extras.deleteFailedDraft(draft.id);
    failedDraftRawOutput.value = '';
    phone.replacePage('chapter-preview', '番外预览', {
      bookId,
      ...(chapterId ? { chapterId } : {}),
    });
    return;
  }

  const parsed = parseContentXmlResult(rawOutput);
  if (!parsed.ok) {
    extras.updateFailedDraft(draft.id, {
      rawOutput,
      warnings: parsed.warnings,
    });
    failedDraftRawOutput.value = rawOutput;
    toastr.warning(parsed.warnings.join('；') || '还是没能解析成功');
    return;
  }

  const bookId = getDraftContextValue(draft, 'bookId', '');
  const coveredChapterIds = getDraftContextValue(draft, 'coveredChapterIds', [] as string[]);
  const enabled = Boolean(getDraftContextValue(draft, 'enabled', true));
  if (!extras.getBook(bookId)) {
    toastr.warning('原番外已经不存在，暂时不能恢复这条章节总结');
    return;
  }

  extras.updateFailedDraft(draft.id, {
    rawOutput: parsed.raw,
    warnings: parsed.warnings,
  });
  generationState.preview = {
    bookId,
    content: parsed.data.content,
    coveredChapterIds: [...coveredChapterIds],
    draftId: null,
    enabled,
    raw: parsed.raw,
    warnings: parsed.warnings,
  };
  persistExtraSummaryPreviewDraft({ bookId });
  extras.deleteFailedDraft(draft.id);
  failedDraftRawOutput.value = '';
  phone.replacePage('summary-preview', '章节总结预览', { bookId });
}

function formatCoveredChapters(ids: string[]) {
  return formatCoveredChaptersForBook(activeBook.value, ids);
}

function formatCoveredChaptersForBook(book: typeof activeBook.value, ids: string[]) {
  if (!book) return '未关联章节';
  if (!ids.length) return '未关联章节';
  const titles = book.chapters
    .filter(chapter => ids.includes(chapter.id))
    .map(chapter => `第 ${chapter.chapterNumber} 章`);
  return titles.join('、') || '未关联章节';
}
</script>

<style scoped>
.pc-extras-app,
.pc-extras-page {
  min-height: 100%;
}

.pc-extras-app {
  height: 100%;
  min-height: 0;
}

.pc-extras-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pc-extras-hero,
.pc-book-card,
.pc-entry-card,
.pc-editor-card,
.pc-detail-card,
.pc-toolbar,
.pc-summary-card,
.pc-preview-card {
  border: 1px solid var(--pc-border);
  background: color-mix(in srgb, var(--pc-surface) 72%, transparent 28%);
  border-radius: 20px;
  backdrop-filter: blur(12px);
}

.pc-extras-hero,
.pc-editor-card,
.pc-detail-card,
.pc-toolbar,
.pc-preview-card {
  padding: 18px;
}

.pc-extras-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
}

.pc-extras-actions-hero {
  display: flex;
  justify-content: flex-end;
  padding: 14px;
}

.pc-extras-hero h2,
.pc-editor-card h2,
.pc-detail-card h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
}

.pc-extras-generation-panel {
  margin-top: 0;
}

.pc-extras-hero p,
.pc-book-card p,
.pc-entry-card p,
.pc-summary-card p,
.pc-preview-card p,
.pc-detail-meta,
.pc-copy,
.pc-status-card p,
.pc-raw-head span {
  color: var(--pc-muted);
}

.pc-book-list,
.pc-entry-list,
.pc-summary-list,
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
  border-radius: 18px;
  background: var(--pc-surface);
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

.pc-book-main strong,
.pc-entry-main strong,
.pc-summary-head strong {
  display: block;
  font-size: 16px;
}

.pc-type-chip {
  display: inline-block;
  margin-bottom: 8px;
  padding: 4px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pc-theme-accent) 18%, var(--pc-surface-strong) 82%);
  color: var(--pc-theme-accent);
  font-size: 11px;
}

.pc-toolbar,
.pc-section-head,
.pc-summary-head,
.pc-book-actions,
.pc-entry-head,
.pc-detail-meta,
.pc-type-selector,
.pc-type-option,
.pc-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
}

.pc-search {
  width: 100%;
  border: 1px solid var(--pc-border);
  border-radius: 16px;
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  padding: 12px 14px;
}

.pc-extras-app :is(.pc-field, .pc-area),
.pc-preview-card {
  margin-top: 14px;
}

.pc-extras-app .pc-area {
  min-height: 220px;
  resize: vertical;
}

.pc-extras-app .pc-area.compact {
  min-height: 120px;
}

.pc-type-selector {
  flex-wrap: wrap;
  justify-content: flex-start;
  margin-top: 14px;
}

.pc-type-prompt-card {
  display: flex;
  flex-direction: column;
  margin-top: 14px;
}

.pc-mini-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.pc-mini-grid .pc-field {
  margin-top: 14px;
}

.pc-favorite-chip,
.pc-toggle-chip {
  border: 0;
  cursor: pointer;
  color: var(--pc-text);
}

.pc-toggle-chip {
  min-width: 92px;
  height: 40px;
  border-radius: 999px;
  padding: 0 14px;
}

.pc-type-option,
.pc-toggle-chip,
.pc-favorite-chip,
.pc-checkbox {
  background: var(--pc-surface-strong);
}

.pc-type-option.active,
.pc-toggle-chip.active {
  background: color-mix(in srgb, var(--pc-theme-accent) 18%, var(--pc-surface-strong) 82%);
}

.pc-favorite-chip {
  width: 40px;
  height: 40px;
  border-radius: 12px;
}

.pc-favorite-chip i[data-active='true'] {
  color: var(--pc-danger);
}

.pc-icon-btn.danger {
  color: var(--pc-danger);
}

.pc-entry-main p.preview {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pc-prewrap,
.pc-detail-content {
  white-space: pre-wrap;
}

.pc-raw-output {
  margin-top: 14px;
}

.pc-raw-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.pc-raw-area {
  min-height: 180px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}

.pc-prewrap {
  font-size: var(--pc-reader-font-size);
  line-height: var(--pc-reader-line-height);
}

.pc-summary-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pc-summary-card {
  padding: 14px;
}

.pc-status-card {
  margin-top: 14px;
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

.pc-extras-detail-page .pc-detail-card {
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
  color: var(--pc-text);
  font-size: var(--pc-reader-font-size);
  line-height: var(--pc-reader-line-height);
}

.pc-chapter-picks {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.pc-check-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 16px;
  background: var(--pc-surface-strong);
}

.pc-checkbox {
  width: 44px;
  height: 28px;
  border-radius: 999px;
  position: relative;
}

.pc-checkbox input {
  position: absolute;
  inset: 0;
  opacity: 0;
}

.pc-number-field + .pc-number-field {
  margin-top: 14px;
}

.pc-extras-app .pc-form-actions {
  margin-top: 18px;
  justify-content: flex-end;
}

.pc-extras-app .pc-extras-generate-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.pc-extras-app .pc-extras-generate-actions > :is(.pc-soft-btn, .pc-primary-btn) {
  min-inline-size: 0;
  width: 100%;
}
</style>
