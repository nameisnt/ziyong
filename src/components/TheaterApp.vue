<template>
  <section class="pc-theater-app">
    <section v-if="route.page === 'root'" class="pc-theater-page">
      <div class="pc-toolbar">
        <input v-model="query" class="pc-search" type="text" :placeholder="t`搜索类型或历史内容...`" />
        <button v-if="entries.length" class="pc-soft-btn compact" type="button" @click="openHistory">
          <i class="fa-solid fa-clock-rotate-left"></i>
          <span>{{ `小剧场记录（${entries.length}）` }}</span>
        </button>
      </div>

      <section class="pc-section-card pc-generation-aliases">
        <div class="pc-generation-aliases-head">
          <strong>{{ t`生成称呼替换` }}</strong>
          <InfoHint :text="t`仅保存于当前聊天，并应用到手机内所有文字生成。不会修改聊天原文或引用内容。`" />
        </div>
        <div class="pc-alias-grid">
          <label class="pc-field-group">
            <span class="pc-field-label">{{ t`char 替换` }}</span>
            <input v-model="charReplacement" class="pc-field" type="text" :placeholder="t`角色称呼`" />
          </label>
          <button
            class="pc-icon-btn pc-alias-swap"
            type="button"
            :title="t`互换 char 与 user`"
            :aria-label="t`互换 char 与 user`"
            @click="swapGenerationAliases"
          >
            <i class="fa-solid fa-right-left"></i>
          </button>
          <label class="pc-field-group">
            <span class="pc-field-label">{{ t`user 替换` }}</span>
            <input v-model="userReplacement" class="pc-field" type="text" :placeholder="t`用户称呼`" />
          </label>
        </div>
      </section>

      <PreviewDraftNotice
        :draft="theaterPreviewDraft"
        @discard="discardTheaterPreviewDraft"
        @open="openTheaterPreviewDraft"
      />

      <div class="pc-tag-cloud">
        <CapsuleTag
          :active="customTypeOpen"
          icon="fa-solid fa-plus"
          :label="t`自定义`"
          @click="customTypeOpen = !customTypeOpen"
        />
        <CapsuleTag
          v-for="typePrompt in filteredTypePrompts"
          :key="typePrompt.id"
          :active="query.trim() === typePrompt.name"
          :count="typeUsageCounts.get(typePrompt.id) || typeUsageCounts.get(typePrompt.name)"
          icon="fa-solid fa-masks-theater"
          :label="typePrompt.name"
          @click="openGenerate(typePrompt.id)"
        />
      </div>

      <div v-if="customTypeOpen" class="pc-custom-type-row">
        <input
          v-model="customTypeName"
          class="pc-field"
          type="text"
          :placeholder="t`输入新类型名`"
          @keydown.enter="openCustomGenerate"
        />
        <button
          class="pc-primary-btn compact"
          type="button"
          :disabled="!customTypeName.trim()"
          @click="openCustomGenerate"
        >
          {{ t`添加` }}
        </button>
      </div>

      <FailedDraftList
        :drafts="failedDrafts"
        :get-context="failedDraftContextSummary"
        :get-title="() => t`未解析小剧场`"
        @open="openFailedDraft"
        @remove="removeFailedDraft"
      />
    </section>

    <section v-else-if="route.page === 'history'" class="pc-theater-page">
      <div class="pc-theater-hero">
        <div>
          <h2>{{ t`小剧场记录` }}</h2>
        </div>
        <div class="pc-hero-actions">
          <button class="pc-soft-btn" type="button" @click="sortDesc = !sortDesc">
            {{ sortDesc ? t`倒序` : t`正序` }}
          </button>
        </div>
      </div>

      <div class="pc-toolbar">
        <input v-model="query" class="pc-search" type="text" :placeholder="t`搜索标题或类型...`" />
      </div>
      <div v-if="historyTypeTabs.length" class="pc-theater-filter-tabs" aria-label="小剧场类型筛选">
        <CapsuleTag
          :active="!selectedHistoryTypeKeys.size"
          compact
          icon="fa-solid fa-layer-group"
          :label="t`全部`"
          @click="clearHistoryTypeFilters"
        />
        <CapsuleTag
          v-for="tab in historyTypeTabs"
          :key="tab.key"
          :active="selectedHistoryTypeKeys.has(tab.key)"
          compact
          :count="tab.count"
          icon="fa-solid fa-masks-theater"
          :label="tab.label"
          @click="toggleHistoryTypeFilter(tab.key)"
        />
      </div>

      <EmptyState
        v-if="!filteredEntries.length"
        :title="query || selectedHistoryTypeKeys.size ? t`暂无匹配记录` : t`还没有小剧场条目`"
      />

      <div v-else class="pc-entry-list">
        <article v-for="entry in filteredEntries" :key="entry.id" class="pc-entry-card">
          <button class="pc-entry-main" type="button" @click="openEntry(entry.id)">
            <div class="pc-entry-head">
              <strong>{{ entry.title }}</strong>
            </div>
          </button>
        </article>
      </div>
    </section>

    <section v-else-if="route.page === 'editor'" class="pc-theater-page">
      <div class="pc-editor-card">
        <span class="pc-kicker">{{ t`编辑小剧场` }}</span>
        <h2>{{ editingEntry ? editingEntry.title : t`调整当前条目` }}</h2>

        <div class="pc-segment pc-mode-selector">
          <button
            :class="['pc-segment-btn', { active: draft.renderMode === 'markdown' }]"
            type="button"
            @click="draft.renderMode = 'markdown'"
          >
            {{ t`Markdown 文本` }}
          </button>
          <button
            :class="['pc-segment-btn', { active: draft.renderMode === 'frontend' }]"
            type="button"
            @click="draft.renderMode = 'frontend'"
          >
            {{ t`网页渲染` }}
          </button>
        </div>
        <textarea v-model="draft.content" class="pc-area pc-saved-content-area" :placeholder="t`正文`"></textarea>

        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
          <button class="pc-primary-btn" type="button" @click="submitEntry">{{ t`保存` }}</button>
        </div>
      </div>
    </section>

    <section v-else-if="route.page === 'entry' && activeEntry" class="pc-theater-page pc-theater-detail-page">
      <ReaderDetailShell
        actions-class="six"
        :content="activeEntry.content"
        :custom-content="activeEntry.renderMode === 'frontend'"
        :favorite-active="activeEntry.favorite"
        :next-disabled="!nextEntryId"
        :previous-disabled="!previousEntryId"
        :title="activeEntry.title"
        @bagu="openTheaterBaguScan"
        @bottom="scrollToBottom"
        @catalog="showCatalogModal = true"
        @edit="openEditEntry(activeEntry.id)"
        @favorite="theater.toggleFavorite(activeEntry.id)"
        @next="openEntry(nextEntryId || '')"
        @previous="openEntry(previousEntryId || '')"
        @top="scrollToTop"
      >
        <template #before-content>
          <div class="pc-entry-tags">
            <CapsuleTag
              compact
              active
              icon="fa-solid fa-masks-theater"
              :label="activeEntry.typeName || t`未分类小剧场`"
              @click="filterTheaterRecords(activeEntry.typeName || t`未分类小剧场`)"
            />
          </div>
        </template>
        <template #content>
          <FrontendFrame
            v-if="activeEntry.renderMode === 'frontend'"
            :active="isOpen"
            :content="activeEntry.content"
            :theme="settings.theme"
            :title="activeEntry.title"
            @navigate-blocked="handleFrameNavigateBlocked"
          />
        </template>
        <template #actions>
          <button class="pc-soft-btn" type="button" :title="t`转为番外`" @click="openConvertToExtra(activeEntry.id)">
            <i class="fa-solid fa-book-open"></i>
          </button>
          <button
            class="pc-soft-btn"
            type="button"
            :title="t`续写`"
            @click="openGenerate(activeEntry.typeId, activeEntry.id)"
          >
            <i class="fa-solid fa-wand-magic-sparkles"></i>
          </button>
          <button class="pc-soft-btn danger" type="button" :title="t`删除`" @click="removeEntry(activeEntry.id)">
            <i class="fa-solid fa-trash"></i>
          </button>
        </template>
        <template #overlays>
          <CatalogModal
            :active-id="activeEntry.id"
            :items="entryCatalogItems"
            :open="showCatalogModal"
            @close="showCatalogModal = false"
            @select="selectCatalogEntry"
          />
        </template>
      </ReaderDetailShell>
    </section>

    <section v-else-if="route.page === 'convert-extra' && activeEntry" class="pc-theater-page">
      <div class="pc-editor-card">
        <span class="pc-kicker">{{ t`转为番外` }}</span>
        <h2>{{ activeEntry.title }}</h2>

        <label class="pc-field-group">
          <span class="pc-field-label">{{ t`番外书名` }}</span>
          <input v-model="conversionDraft.bookTitle" class="pc-field" type="text" :placeholder="t`番外书名`" />
        </label>

        <label class="pc-field-group">
          <span class="pc-field-label">{{ t`番外类型` }}</span>
          <SearchableCombobox
            :allow-custom="true"
            :empty-label="t`没有匹配的番外类型`"
            :input-label="t`选择或输入番外类型`"
            :model-value="conversionTypeValue"
            :options="extraTypeOptions"
            :placeholder="t`选择或输入番外类型`"
            :toggle-title="t`展开番外类型`"
            @update:model-value="selectConversionType"
          />
        </label>

        <label class="pc-field-group">
          <span class="pc-field-label">{{ t`第一章标题` }}</span>
          <input v-model="conversionDraft.chapterTitle" class="pc-field" type="text" :placeholder="t`第一章标题`" />
        </label>

        <label class="pc-field-group">
          <span class="pc-field-label">
            {{ t`第一章正文` }}
            <InfoHint
              v-if="activeEntry.renderMode === 'frontend'"
              :text="t`网页渲染内容已提取为可编辑文本，原小剧场不会改变。`"
            />
          </span>
          <textarea
            v-model="conversionDraft.content"
            class="pc-area pc-saved-content-area"
            :placeholder="t`第一章正文`"
          ></textarea>
        </label>

        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
          <button class="pc-primary-btn" type="button" @click="convertToExtra">
            <i class="fa-solid fa-book-open"></i>
            <span>{{ t`新建番外` }}</span>
          </button>
        </div>
      </div>
    </section>

    <section v-else-if="route.page === 'bagu-scan' && activeEntry" class="pc-theater-page">
      <div class="pc-detail-card">
        <div class="pc-detail-title-row">
          <h2>{{ activeEntry.title }}</h2>
        </div>
        <BaguScanPanel
          auto-scan
          class="pc-detail-bagu-panel"
          :content="activeEntry.content"
          :apply-handler="applyTheaterBaguContent"
        />
      </div>
    </section>

    <section v-else-if="route.page === 'generate'" class="pc-theater-page">
      <div class="pc-editor-card">
        <span class="pc-kicker">{{ t`类型配置` }}</span>

        <GenerationPanel
          :capture="captureTheaterPrompt"
          :capture-reset-key="generationPromptPreview"
          :error="generationState.error"
          :from-start-end="generationDraft.fromStartEnd"
          :range-text="generationDraft.rangeText"
          :raw-output="generationState.rawOutput"
          :recent-count="generationDraft.recentCount"
          :references="selectedReferences"
          requirement-placeholder="例如：更强调舞台调度、停顿和角色对视。"
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
            <SearchableCombobox
              v-model="generationTypeChoice"
              :disabled="generationState.running"
              :empty-label="t`没有匹配类型`"
              :input-label="t`选择小剧场类型`"
              :options="theaterTypeComboboxOptions"
              :placeholder="t`选择或搜索小剧场类型`"
              :toggle-title="t`展开类型列表`"
            />

            <input
              v-if="showGenerationCustomTypeField"
              v-model="generationDraft.typeName"
              class="pc-field"
              type="text"
              :disabled="generationState.running"
              :placeholder="t`自定义类型名称`"
            />
            <textarea
              v-model="generationDraft.typePrompt"
              class="pc-area compact"
              :disabled="generationState.running"
              :placeholder="t`小剧场类型提示词`"
            ></textarea>
            <div class="pc-segment pc-mode-selector">
              <button
                :class="['pc-segment-btn', { active: generationDraft.renderMode === 'markdown' }]"
                type="button"
                :disabled="generationState.running"
                @click="generationDraft.renderMode = 'markdown'"
              >
                {{ t`Markdown 文本` }}
              </button>
              <button
                :class="['pc-segment-btn', { active: generationDraft.renderMode === 'frontend' }]"
                type="button"
                :disabled="generationState.running"
                @click="generationDraft.renderMode = 'frontend'"
              >
                {{ t`网页渲染` }}
              </button>
            </div>
          </template>
        </GenerationPanel>
      </div>
    </section>

    <section
      v-else-if="route.page === 'preview' && generationState.preview"
      class="pc-theater-page pc-generation-preview-page"
    >
      <div class="pc-detail-card pc-generation-preview-card">
        <GenerationPreviewPanel
          :content="generationState.preview.content"
          :raw="generationState.preview.raw"
          raw-editable
          :reparse-handler="reparsePreviewRaw"
          save-label="保存为条目"
          :source-label="generationState.preview.source.label"
          :text-provider-summary="generationState.preview.typeName"
          :title="generationState.preview.title"
          :warnings="generationState.preview.warnings"
          @back="returnToGenerate"
          @reparse="reparsePreviewRaw"
          @save="savePreview"
          @update:content="generationState.preview.content = $event"
          @update:raw="generationState.preview.raw = $event"
        >
          <template #content>
            <div class="pc-preview-render-toolbar">
              <span class="pc-field-label">{{ t`解析与预览方式` }}</span>
              <span class="pc-segment">
                <button
                  :class="['pc-segment-btn', { active: generationState.preview.renderMode === 'markdown' }]"
                  type="button"
                  @click="switchPreviewRenderMode('markdown')"
                >
                  Markdown
                </button>
                <button
                  :class="['pc-segment-btn', { active: generationState.preview.renderMode === 'frontend' }]"
                  type="button"
                  @click="switchPreviewRenderMode('frontend')"
                >
                  {{ t`网页渲染` }}
                </button>
              </span>
            </div>
            <FrontendFrame
              v-if="generationState.preview.renderMode === 'frontend'"
              :active="isOpen"
              :content="generationState.preview.content"
              :theme="settings.theme"
              :title="generationState.preview.title"
              @navigate-blocked="handleFrameNavigateBlocked"
            />
            <!-- eslint-disable-next-line vue/no-v-html -->
            <article
              v-else
              class="pc-detail-content pc-rendered-markdown"
              v-html="renderMarkdown(formatReaderContent(generationState.preview.content, settings.reader))"
            ></article>
          </template>
        </GenerationPreviewPanel>
      </div>
    </section>

    <section v-else-if="route.page === 'failed-draft' && activeFailedDraft" class="pc-theater-page pc-repair-page">
      <div class="pc-editor-card pc-repair-card">
        <span class="pc-kicker">{{ activeFailedDraft.source.label }}</span>

        <div class="pc-segment pc-mode-selector" aria-label="小剧场解析方式">
          <button
            :class="['pc-segment-btn', { active: failedDraftRenderMode === 'markdown' }]"
            type="button"
            @click="selectFailedDraftRenderMode('markdown')"
          >
            {{ t`Markdown 文本` }}
          </button>
          <button
            :class="['pc-segment-btn', { active: failedDraftRenderMode === 'frontend' }]"
            type="button"
            @click="selectFailedDraftRenderMode('frontend')"
          >
            {{ t`网页渲染` }}
          </button>
        </div>

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

    <section v-else class="pc-theater-page">
      <EmptyState :title="t`小剧场页面已刷新`" />
    </section>
  </section>
</template>

<script setup lang="ts">
import CatalogModal from '@/components/CatalogModal.vue';
import BaguScanPanel from '@/components/BaguScanPanel.vue';
import CapsuleTag from '@/components/CapsuleTag.vue';
import EmptyState from '@/components/EmptyState.vue';
import FailedDraftList from '@/components/FailedDraftList.vue';
import FrontendFrame from '@/components/FrontendFrame.vue';
import GenerationPanel from '@/components/GenerationPanel.vue';
import GenerationPreviewPanel from '@/components/GenerationPreviewPanel.vue';
import InfoHint from '@/components/InfoHint.vue';
import PreviewDraftNotice from '@/components/PreviewDraftNotice.vue';
import RawOutputEditor from '@/components/RawOutputEditor.vue';
import ReaderDetailShell from '@/components/ReaderDetailShell.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import { buildGenerationPreview, captureGenerationPrompt, generateContent } from '@/core/generationService';
import { useGenerationAliasesStore } from '@/store/generationAliases';
import { useExtrasStore } from '@/store/extras';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import { useTheaterStore } from '@/store/theater';
import type { CharacterRef } from '@/type/diary';
import type { FailedGenerationDraft } from '@/type/generation';
import type { TheaterRenderMode } from '@/type/theater';
import { canOpenBaguScan } from '@/util/baguScanGate';
import { useDetailScroll } from '@/util/detailScroll';
import { parseTheaterXmlResult } from '@/util/generation';
import { renderMarkdown } from '@/util/markdown';
import { formatReaderContent } from '@/util/readerContent';
import { formatGenerationReferences, type GenerationReferenceItem } from '@/util/references';
import { usePreviewDraftPersistence } from '@/util/previewDrafts';
import { useInvalidRouteFallback } from '@/util/routeFallback';
import { stopGenerationByIdSafe } from '@/util/runtime';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const prompts = usePromptStore();
const settingsStore = useSettingsStore();
const theater = useTheaterStore();
const extras = useExtrasStore();
const generationAliases = useGenerationAliasesStore();
const theaterGenerationAdapter = getRegisteredPhoneGenerationAdapter('theater', 'generate');
const CUSTOM_THEATER_TYPE_VALUE = '__custom_theater_type__';
const { currentRoute: route, isOpen } = storeToRefs(phone);
const { settings } = storeToRefs(settingsStore);
const { entries, failedDrafts } = storeToRefs(theater);
const { charReplacement, userReplacement } = storeToRefs(generationAliases);
const { appPrompts, typePrompts } = storeToRefs(prompts);

const query = ref('');
const sortDesc = ref(true);
const selectedHistoryTypeKeys = ref(new Set<string>());
const customTypeOpen = ref(false);
const customTypeName = ref('');
const draft = reactive({
  content: '',
  participants: '',
  renderMode: 'markdown' as TheaterRenderMode,
  title: '',
  typeId: '',
  typeName: '',
});
const generationDraft = reactive({
  fromStartEnd: 20,
  rangeText: '',
  recentCount: 20,
  renderMode: 'markdown' as TheaterRenderMode,
  singleMessageId: 0,
  typeId: '',
  typeName: '',
  typePrompt: '',
  userRequirement: '',
});
const conversionDraft = reactive({
  bookTitle: '',
  chapterTitle: '',
  content: '',
  typeId: '',
  typeName: '',
});

function swapGenerationAliases() {
  const previousChar = charReplacement.value;
  charReplacement.value = userReplacement.value;
  userReplacement.value = previousChar;
}
const generationState = reactive({
  error: '',
  generationId: '',
  preview: null as null | {
    content: string;
    draftId: null | string;
    raw: string;
    renderMode: TheaterRenderMode;
    source: {
      label: string;
    };
    title: string;
    typeId?: string;
    typeName: string;
    warnings: string[];
  },
  rawOutput: '',
  running: false,
});

type TheaterPreview = NonNullable<typeof generationState.preview>;

const {
  clearPreviewDraft: clearTheaterPreviewDraft,
  discardPreviewDraft: discardTheaterPreviewDraft,
  draft: theaterPreviewDraft,
  openPreviewDraft: openTheaterPreviewDraft,
  persistPreviewDraft: persistTheaterPreviewDraft,
} = usePreviewDraftPersistence<TheaterPreview>({
  appId: 'theater',
  consumeFailedDraft: draftId => theater.deleteFailedDraft(draftId),
  getPreview: () => generationState.preview,
  getRouteParams: () => ({}),
  page: 'preview',
  route,
  setPreview: preview => {
    generationState.preview = preview;
  },
  title: '生成预览',
});

const failedDraftRawOutput = ref('');
const failedDraftRenderMode = ref<TheaterRenderMode>('markdown');
const generationCustomTypeSelected = ref(false);
const selectedReferences = ref<GenerationReferenceItem[]>([]);
const entryContentEl = ref<HTMLElement | null>(null);
const { scrollToBottom, scrollToTop } = useDetailScroll(entryContentEl, '.pc-theater-detail-page .pc-detail-content');
const showCatalogModal = ref(false);

const theaterTypePrompts = computed(() => typePrompts.value.filter(item => item.domain === 'theater'));
const extraTypePrompts = computed(() => typePrompts.value.filter(item => item.domain === 'extras'));
const extraTypeOptions = computed(() =>
  [...extraTypePrompts.value]
    .sort((left, right) => right.usageCount - left.usageCount || left.name.localeCompare(right.name, 'zh-CN'))
    .map(item => ({ label: item.name, value: item.id })),
);
const conversionTypeValue = computed(() => conversionDraft.typeId || conversionDraft.typeName);
const activeEntry = computed(() => {
  const entryId = route.value.params?.entryId;
  return entryId ? theater.getEntry(entryId) : null;
});
const detailEntries = computed(() =>
  [...entries.value].sort((left, right) => {
    const compare = left.createdAt.localeCompare(right.createdAt);
    return sortDesc.value ? -compare : compare;
  }),
);
const activeEntryIndex = computed(() =>
  activeEntry.value ? detailEntries.value.findIndex(entry => entry.id === activeEntry.value?.id) : -1,
);
const previousEntryId = computed(() =>
  activeEntryIndex.value > 0 ? detailEntries.value[activeEntryIndex.value - 1]?.id || '' : '',
);
const nextEntryId = computed(() =>
  activeEntryIndex.value >= 0 ? detailEntries.value[activeEntryIndex.value + 1]?.id || '' : '',
);
const entryCatalogItems = computed(() =>
  detailEntries.value.map(entry => ({
    id: entry.id,
    title: entry.title,
  })),
);
const editingEntry = computed(() => (route.value.params?.entryId && activeEntry.value ? activeEntry.value : null));
const activeFailedDraft = computed(() => {
  const draftId = route.value.params?.draftId;
  return draftId ? theater.getFailedDraft(draftId) : null;
});
const formattedReferences = computed(() => formatGenerationReferences(selectedReferences.value));
const selectedEditorTypePrompt = computed(() => (draft.typeId ? prompts.getTypePrompt(draft.typeId) : null));
const selectedGenerationTypePrompt = computed(() =>
  generationDraft.typeId ? prompts.getTypePrompt(generationDraft.typeId) : null,
);
const theaterTypeComboboxOptions = computed(() => [
  { label: '+ 自定义', value: CUSTOM_THEATER_TYPE_VALUE },
  ...theaterTypePrompts.value.map(typePrompt => ({ label: typePrompt.name, value: typePrompt.id })),
]);
const typeUsageCounts = computed(() => {
  const counts = new Map<string, number>();
  for (const entry of entries.value) {
    counts.set(entry.typeId || entry.typeName, (counts.get(entry.typeId || entry.typeName) || 0) + 1);
  }
  return counts;
});
const historyTypeTabs = computed(() => {
  const groups = new Map<
    string,
    {
      count: number;
      key: string;
      label: string;
      latest: string;
    }
  >();
  for (const entry of entries.value) {
    const label = entry.typeName.trim() || '未分类小剧场';
    const key = label;
    const current = groups.get(key);
    if (current) {
      current.count += 1;
      if (entry.updatedAt > current.latest) current.latest = entry.updatedAt;
      continue;
    }
    groups.set(key, {
      count: 1,
      key,
      label,
      latest: entry.updatedAt,
    });
  }
  return [...groups.values()].sort(
    (left, right) =>
      right.count - left.count ||
      right.latest.localeCompare(left.latest) ||
      left.label.localeCompare(right.label, 'zh-CN'),
  );
});
const generationTypeChoice = computed({
  get() {
    return generationCustomTypeSelected.value ? CUSTOM_THEATER_TYPE_VALUE : generationDraft.typeId;
  },
  set(value: string) {
    if (value === CUSTOM_THEATER_TYPE_VALUE) {
      startCustomGenerationType();
      return;
    }
    selectGenerationTypePrompt(value);
  },
});
const showGenerationCustomTypeField = computed(() => generationCustomTypeSelected.value);
const filteredTypePrompts = computed(() => {
  const normalized = query.value.trim().toLowerCase();
  const source = normalized
    ? theaterTypePrompts.value.filter(prompt => {
        if (prompt.name.toLowerCase().includes(normalized)) return true;
        return entries.value.some(
          entry =>
            (entry.typeId === prompt.id || entry.typeName === prompt.name) &&
            `${entry.title}\n${entry.content}`.toLowerCase().includes(normalized),
        );
      })
    : theaterTypePrompts.value;

  return [...source].sort((left, right) => {
    const leftCount = typeUsageCounts.value.get(left.id) || typeUsageCounts.value.get(left.name) || 0;
    const rightCount = typeUsageCounts.value.get(right.id) || typeUsageCounts.value.get(right.name) || 0;
    return rightCount - leftCount || left.name.localeCompare(right.name, 'zh-CN');
  });
});
const filteredEntries = computed(() => {
  const normalized = query.value.trim().toLowerCase();
  const activeTypeKeys = selectedHistoryTypeKeys.value;
  const source = entries.value.filter(entry => {
    const typeKey = entry.typeName.trim() || '未分类小剧场';
    if (activeTypeKeys.size && !activeTypeKeys.has(typeKey)) return false;
    if (!normalized) return true;
    return (
      entry.title.toLowerCase().includes(normalized) ||
      entry.typeName.toLowerCase().includes(normalized) ||
      entry.participants.some(item => item.name.toLowerCase().includes(normalized))
    );
  });

  return [...source].sort((left, right) => {
    const compare = left.createdAt.localeCompare(right.createdAt);
    return sortDesc.value ? -compare : compare;
  });
});
const generationPromptPreview = computed(() => {
  try {
    return buildGenerationPreview(
      theaterGenerationAdapter,
      {
        appPrompt: appPrompts.value.theater,
        outputFormat: buildOutputFormat(generationDraft.renderMode),
        renderMode: generationDraft.renderMode,
        typeId: generationDraft.typeId,
        typeName: generationDraft.typeName,
        typePrompt: generationDraft.typePrompt,
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

function captureTheaterPrompt() {
  return captureGenerationPrompt(
    theaterGenerationAdapter,
    {
      appPrompt: appPrompts.value.theater,
      outputFormat: buildOutputFormat(generationDraft.renderMode),
      renderMode: generationDraft.renderMode,
      typeId: generationDraft.typeId,
      typeName: generationDraft.typeName,
      typePrompt: generationDraft.typePrompt,
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
    if (current.appId !== 'theater') return;
    if (current.page === 'editor') {
      draft.content = activeEntry.value?.content || '';
      draft.participants = participantsToText(activeEntry.value?.participants || []);
      draft.renderMode = activeEntry.value?.renderMode || 'markdown';
      draft.title = activeEntry.value?.title || '';
      draft.typeId = activeEntry.value?.typeId || '';
      draft.typeName = activeEntry.value?.typeName || '';
    }

    if (current.page === 'generate' && previous?.page !== 'preview') {
      const initialTypePrompt = prompts.getTypePrompt(current.params?.typeId || '');
      const continuationEntry = current.params?.entryId ? theater.getEntry(current.params.entryId) : null;
      const customTypeName =
        typeof current.params?.customTypeName === 'string' ? current.params.customTypeName.trim() : '';
      selectedReferences.value = [];
      generationDraft.fromStartEnd = 20;
      generationDraft.rangeText = '';
      generationDraft.recentCount = 20;
      generationDraft.renderMode =
        continuationEntry?.renderMode || (initialTypePrompt?.renderMode === 'frontend' ? 'frontend' : 'markdown');
      generationDraft.singleMessageId = 0;
      generationDraft.typeId = current.params?.typeId || '';
      generationDraft.typeName = initialTypePrompt?.name || customTypeName;
      generationDraft.typePrompt = initialTypePrompt?.prompt || '';
      generationDraft.userRequirement = '';
      generationCustomTypeSelected.value = Boolean(customTypeName && !initialTypePrompt);
      generationState.error = '';
      generationState.preview = null;
      generationState.rawOutput = '';
    }

    if (current.page === 'convert-extra') {
      fillConversionDraft();
    }

    if (current.page === 'failed-draft') {
      failedDraftRawOutput.value = activeFailedDraft.value?.rawOutput || '';
      failedDraftRenderMode.value =
        activeFailedDraft.value?.context.renderMode === 'frontend' ? 'frontend' : 'markdown';
    }
  },
  { immediate: true, deep: true },
);

useInvalidRouteFallback({
  source: () => ({
    appId: route.value.appId,
    hasEntry: Boolean(activeEntry.value),
    hasFailedDraft: Boolean(activeFailedDraft.value),
    hasPreview: Boolean(generationState.preview),
    page: route.value.page,
  }),
  isInvalid: current =>
    current.appId === 'theater' &&
    ((current.page === 'preview' && !current.hasPreview) ||
      (['entry', 'bagu-scan', 'convert-extra'].includes(current.page) && !current.hasEntry) ||
      (current.page === 'failed-draft' && !current.hasFailedDraft)),
  fallback: () => {
    if (route.value.appId !== 'theater') return;
    phone.replacePage(entries.value.length ? 'history' : 'root', entries.value.length ? '小剧场记录' : '小剧场');
  },
});

onScopeDispose(() => {
  if (generationState.running && generationState.generationId) {
    stopGenerationByIdSafe(generationState.generationId);
  }
});

function participantsToText(participants: CharacterRef[]) {
  return participants.map(item => item.name).join('，');
}

function parseParticipants(raw: string) {
  const seen = new Set<string>();
  return raw
    .split(/[\n,，]/g)
    .map(item => item.trim())
    .filter(Boolean)
    .filter(item => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(name => ({ name }));
}

function draftContextSummary(context: Record<string, unknown>) {
  return typeof context.typeName === 'string' && context.typeName.trim() ? context.typeName : '未分类小剧场';
}

function failedDraftContextSummary(draft: FailedGenerationDraft) {
  return draftContextSummary(draft.context);
}

function selectGenerationTypePrompt(promptId: string) {
  const prompt = prompts.getTypePrompt(promptId);
  generationCustomTypeSelected.value = false;
  generationDraft.typeId = promptId;
  if (prompt) {
    generationDraft.typeName = prompt.name;
    generationDraft.typePrompt = prompt.prompt;
    generationDraft.renderMode = prompt.renderMode === 'frontend' ? 'frontend' : 'markdown';
  }
}

function startCustomGenerationType() {
  generationCustomTypeSelected.value = true;
  generationDraft.typeId = '';
  generationDraft.typeName = '';
  generationDraft.typePrompt = '';
  generationDraft.renderMode = 'markdown';
}

function openEditEntry(entryId: string) {
  phone.pushPage('editor', '编辑小剧场', { entryId });
}

function openConvertToExtra(entryId: string) {
  phone.pushPage('convert-extra', '转为番外', { entryId });
}

function extractFrontendText(content: string) {
  const document = new DOMParser().parseFromString(content, 'text/html');
  document.querySelectorAll('script, style, noscript').forEach(node => node.remove());
  document.querySelectorAll('br').forEach(node => node.replaceWith('\n'));
  document
    .querySelectorAll(
      'address, article, aside, blockquote, div, footer, h1, h2, h3, h4, h5, h6, header, li, main, p, section',
    )
    .forEach(node => node.append('\n'));
  return (document.body.textContent || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function fillConversionDraft() {
  const entry = activeEntry.value;
  if (!entry) return;
  const matchedExtraType = extraTypePrompts.value.find(item => item.name === entry.typeName);
  conversionDraft.bookTitle = entry.title;
  conversionDraft.chapterTitle = entry.title;
  conversionDraft.content = entry.renderMode === 'frontend' ? extractFrontendText(entry.content) : entry.content;
  conversionDraft.typeId = matchedExtraType?.id || '';
  conversionDraft.typeName = matchedExtraType?.name || entry.typeName || '未分类番外';
}

function selectConversionType(value: string) {
  const typePrompt = prompts.getTypePrompt(value);
  conversionDraft.typeId = typePrompt?.domain === 'extras' ? typePrompt.id : '';
  conversionDraft.typeName = typePrompt?.domain === 'extras' ? typePrompt.name : value.trim();
}

function convertToExtra() {
  if (!activeEntry.value) return;
  if (!conversionDraft.bookTitle.trim()) {
    toastr.warning('请先填写番外书名');
    return;
  }
  if (!conversionDraft.content.trim()) {
    toastr.warning('第一章正文不能为空');
    return;
  }

  const book = extras.createBook({
    title: conversionDraft.bookTitle,
    typeId: conversionDraft.typeId || undefined,
    typeName: conversionDraft.typeName,
  });
  const chapter = extras.createChapter(book.id, {
    content: conversionDraft.content,
    title: conversionDraft.chapterTitle,
  });
  if (!chapter) {
    extras.deleteBook(book.id);
    toastr.warning('创建番外章节失败');
    return;
  }

  toastr.success('已新建番外，原小剧场已保留');
  phone.pushRoute('extras', 'chapter', chapter.title, { bookId: book.id, chapterId: chapter.id });
}

function openEntry(entryId: string) {
  if (!entryId) return;
  const entry = theater.getEntry(entryId);
  if (!entry) return;
  phone.pushPage('entry', entry.title, { entryId });
  void nextTick(() => scrollToTop('auto'));
}

function openTheaterBaguScan() {
  if (!activeEntry.value) return;
  if (!canOpenBaguScan(activeEntry.value.content)) return;
  phone.pushPage('bagu-scan', '八股检测', {
    entryId: activeEntry.value.id,
  });
}

function selectCatalogEntry(entryId: string) {
  showCatalogModal.value = false;
  openEntry(entryId);
}

function openGenerate(typeId?: string, entryId?: string) {
  const params: Record<string, string> = {};
  if (typeId) params.typeId = typeId;
  if (entryId) params.entryId = entryId;
  phone.pushPage('generate', '小剧场配置', Object.keys(params).length ? params : undefined);
}

function openCustomGenerate() {
  const name = customTypeName.value.trim();
  if (!name) return;
  customTypeOpen.value = false;
  customTypeName.value = '';
  phone.pushPage('generate', '小剧场配置', { customTypeName: name });
}

function openHistory() {
  phone.pushPage('history', '小剧场记录');
}

function filterTheaterRecords(label: string) {
  const normalized = label.trim();
  if (!normalized) return;
  const matchedTab = historyTypeTabs.value.find(tab => tab.label === normalized);
  selectedHistoryTypeKeys.value = new Set(matchedTab ? [matchedTab.key] : []);
  if (route.value.page === 'history') return;
  phone.pushPage('history', '小剧场记录');
}

function clearHistoryTypeFilters() {
  selectedHistoryTypeKeys.value = new Set();
}

function toggleHistoryTypeFilter(key: string) {
  const next = new Set(selectedHistoryTypeKeys.value);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  selectedHistoryTypeKeys.value = next;
}

function openFailedDraft(draftId: string) {
  const failedDraft = theater.getFailedDraft(draftId);
  if (!failedDraft) return;
  phone.pushPage('failed-draft', '解析失败草稿', { draftId });
}

function selectFailedDraftRenderMode(renderMode: TheaterRenderMode) {
  failedDraftRenderMode.value = renderMode;
  if (!activeFailedDraft.value) return;
  theater.updateFailedDraftRenderMode(activeFailedDraft.value.id, renderMode);
}

function submitEntry() {
  const input = {
    content: draft.content,
    participants: parseParticipants(draft.participants),
    renderMode: draft.renderMode,
    title: draft.title,
    typeId: draft.typeId,
    typeName: draft.typeName,
  };

  if (editingEntry.value && route.value.params?.entryId) {
    const entry = theater.updateEntry(route.value.params.entryId, input);
    if (!entry) return;
    phone.replacePage('entry', entry.title, { entryId: entry.id });
    return;
  }

  const entry = theater.createEntry(input);
  phone.replacePage('entry', entry.title, { entryId: entry.id });
}

function applyTheaterBaguContent(content: string) {
  if (!activeEntry.value) return false;
  const entry = theater.updateEntry(activeEntry.value.id, {
    content,
    participants: [...activeEntry.value.participants],
    renderMode: activeEntry.value.renderMode,
    title: activeEntry.value.title,
    typeId: activeEntry.value.typeId,
    typeName: activeEntry.value.typeName,
  });
  return Boolean(entry);
}

function buildOutputFormat(renderMode: TheaterRenderMode) {
  return prompts.resolveOutputFormat(renderMode === 'frontend' ? 'theater.frontend' : 'theater.markdown');
}

function returnToGenerate() {
  if (generationState.preview?.draftId) {
    phone.replacePage('failed-draft', '解析失败草稿', { draftId: generationState.preview.draftId });
    return;
  }
  phone.replacePage(
    'generate',
    '小剧场配置',
    generationState.preview?.typeId ? { typeId: generationState.preview.typeId } : undefined,
  );
}

function saveGenerationTypePrompt() {
  const name = generationDraft.typeName.trim();
  const promptText = generationDraft.typePrompt.trim();
  if (!name && !promptText) return null;
  if (generationDraft.typeId) {
    const updated = prompts.updateTypePrompt(generationDraft.typeId, {
      domain: 'theater',
      name: name || selectedGenerationTypePrompt.value?.name || '未分类小剧场',
      prompt: promptText,
      renderMode: selectedGenerationTypePrompt.value?.renderMode === 'frontend' ? 'frontend' : 'markdown',
    });
    if (!updated) return null;
    generationDraft.typeName = updated.name;
    generationDraft.typePrompt = updated.prompt;
    generationCustomTypeSelected.value = false;
    return updated;
  }
  const created = prompts.createTypePrompt({
    domain: 'theater',
    name: name || '未分类小剧场',
    prompt: promptText,
    renderMode: generationDraft.renderMode,
  });
  generationDraft.typeId = created.id;
  generationDraft.typeName = created.name;
  generationDraft.typePrompt = created.prompt;
  generationCustomTypeSelected.value = false;
  return created;
}

async function runGeneration() {
  generationState.error = '';
  clearTheaterPreviewDraft();
  generationState.preview = null;
  generationState.rawOutput = '';
  const savedTypePrompt = saveGenerationTypePrompt();

  try {
    const result = await generateContent(
      theaterGenerationAdapter,
      {
        appPrompt: appPrompts.value.theater,
        outputFormat: buildOutputFormat(generationDraft.renderMode),
        renderMode: generationDraft.renderMode,
        typeId: savedTypePrompt?.id || generationDraft.typeId,
        typeName: generationDraft.typeName,
        typePrompt: generationDraft.typePrompt,
        userRequirement: generationDraft.userRequirement,
      },
      {
        createFailedDraft: input => theater.createFailedDraft(input),
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
      generationState.error = result.warnings.join('；') || '模型没有返回可解析的小剧场 XML';
      failedDraftRawOutput.value = result.rawOutput;
      toastr.warning('XML 解析失败，已保存到失败草稿');
      void phone.presentGeneratedPage('theater', 'failed-draft', '解析失败草稿', { draftId: result.draft.id });
      return;
    }

    if (result.status === 'saved') {
      toastr.success('已生成并保存小剧场');
      void phone.presentGeneratedPage('theater', 'entry', result.saved.entry.title, {
        entryId: result.saved.entry.id,
      });
      return;
    }

    generationState.preview = {
      content: result.data.content,
      draftId: null,
      raw: result.rawOutput,
      renderMode: generationDraft.renderMode,
      source: {
        label: result.source.label,
      },
      title: result.data.title,
      typeId: generationDraft.typeId || undefined,
      typeName: generationDraft.typeName.trim() || '未分类小剧场',
      warnings: result.warnings,
    };
    persistTheaterPreviewDraft();
    void phone.presentGeneratedPage('theater', 'preview', '生成预览');
  } catch (error) {
    generationState.error = error instanceof Error ? error.message : '生成失败，请稍后再试';
  }
}

function savePreview() {
  const preview = generationState.preview;
  if (!preview) return;

  const entry = theater.createEntry({
    content: preview.content,
    participants: [],
    renderMode: preview.renderMode,
    title: preview.title,
    typeId: preview.typeId,
    typeName: preview.typeName,
  });
  if (preview.draftId) {
    theater.deleteFailedDraft(preview.draftId);
  }
  clearTheaterPreviewDraft();
  generationState.preview = null;
  toastr.success('已保存小剧场');
  phone.replacePage('entry', entry.title, { entryId: entry.id });
}

function reparsePreviewAs(renderMode: TheaterRenderMode, successMessage: string) {
  const preview = generationState.preview;
  if (!preview) return false;
  const rawOutput = preview.raw.trim();
  if (!rawOutput) {
    toastr.warning('先补一点可解析的 XML 内容');
    return false;
  }

  const parsed = parseTheaterXmlResult(
    rawOutput,
    renderMode === 'frontend' ? { preserveContentMarkup: true } : undefined,
  );
  if (!parsed.ok) {
    preview.raw = rawOutput;
    preview.warnings = parsed.warnings;
    toastr.warning(parsed.warnings.join('；') || '还是没能解析成功');
    return false;
  }

  preview.content = parsed.data.content;
  preview.raw = parsed.raw;
  preview.renderMode = renderMode;
  preview.title = parsed.data.title;
  preview.warnings = parsed.warnings;
  persistTheaterPreviewDraft();
  toastr.success(successMessage);
  return true;
}

function reparsePreviewRaw() {
  const preview = generationState.preview;
  if (!preview) return false;
  return reparsePreviewAs(preview.renderMode, '已按原始输出重新解析');
}

function switchPreviewRenderMode(renderMode: TheaterRenderMode) {
  const preview = generationState.preview;
  if (!preview || preview.renderMode === renderMode) return;
  reparsePreviewAs(renderMode, renderMode === 'frontend' ? '已切换为网页渲染' : '已切换为 Markdown');
}

function stopGeneration() {
  if (!generationState.generationId) return;
  stopGenerationByIdSafe(generationState.generationId);
  generationState.running = false;
  generationState.error = '生成已停止';
}

async function removeEntry(entryId: string) {
  const entry = theater.getEntry(entryId);
  const shouldDelete = await phone.confirmNotice(`要删除小剧场“${entry?.title || '未命名条目'}”吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!shouldDelete) return;
  theater.deleteEntry(entryId);
  if (route.value.page === 'entry' || route.value.page === 'editor') {
    phone.replacePage(entries.value.length ? 'history' : 'root', entries.value.length ? '小剧场记录' : '小剧场');
  }
  toastr.success('已删除小剧场');
}

async function removeFailedDraft(draftId: string) {
  const shouldDelete = await phone.confirmNotice('要删除这条解析失败草稿吗？原始输出也会一并移除。', {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!shouldDelete) return;
  theater.deleteFailedDraft(draftId);
  failedDraftRawOutput.value = '';
  if (route.value.page === 'failed-draft') {
    phone.replacePage(entries.value.length ? 'history' : 'root', entries.value.length ? '小剧场记录' : '小剧场');
  }
  toastr.success('已删除失败草稿');
}

function reparseFailedDraft() {
  const failedDraft = activeFailedDraft.value;
  if (!failedDraft) return;

  const rawOutput = failedDraftRawOutput.value.trim();
  if (!rawOutput) {
    toastr.warning('先补一点可解析的 XML 内容');
    return;
  }

  const renderMode = failedDraftRenderMode.value;
  const parsed = parseTheaterXmlResult(
    rawOutput,
    renderMode === 'frontend' ? { preserveContentMarkup: true } : undefined,
  );
  if (!parsed.ok) {
    theater.updateFailedDraft(failedDraft.id, {
      rawOutput,
      warnings: parsed.warnings,
    });
    failedDraftRawOutput.value = rawOutput;
    toastr.warning(parsed.warnings.join('；') || '还是没能解析成功');
    return;
  }

  theater.updateFailedDraft(failedDraft.id, {
    rawOutput: parsed.raw,
    warnings: parsed.warnings,
  });
  generationState.preview = {
    content: parsed.data.content,
    draftId: null,
    raw: parsed.raw,
    renderMode,
    source: {
      label: failedDraft.source.label,
    },
    title: parsed.data.title,
    typeId: typeof failedDraft.context.typeId === 'string' ? failedDraft.context.typeId : undefined,
    typeName:
      typeof failedDraft.context.typeName === 'string' && failedDraft.context.typeName.trim()
        ? failedDraft.context.typeName
        : '未分类小剧场',
    warnings: parsed.warnings,
  };
  persistTheaterPreviewDraft();
  theater.deleteFailedDraft(failedDraft.id);
  failedDraftRawOutput.value = '';
  phone.replacePage('preview', '生成预览');
}

function handleFrameNavigateBlocked() {
  toastr.warning('检测到 Frontend 视图尝试重新加载，已按安全策略卸载 iframe');
}
</script>

<style scoped>
.pc-theater-app,
.pc-theater-page {
  min-height: 100%;
}

.pc-theater-app {
  height: 100%;
  min-height: 0;
}

.pc-theater-page {
  display: grid;
  align-content: start;
  gap: 14px;
}

.pc-theater-detail-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 10px;
}

.pc-editor-card,
.pc-detail-card {
  display: grid;
  align-content: start;
  gap: 14px;
}

.pc-theater-detail-page .pc-detail-card {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-family: var(--pc-reader-font-family);
}

.pc-theater-detail-page .pc-detail-content,
.pc-theater-detail-page :deep(.pc-frame-shell) {
  flex: 1 1 auto;
  min-height: 0;
}

.pc-theater-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-theater-hero h2,
.pc-editor-card h2,
.pc-detail-card h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
}

.pc-kicker,
.pc-entry-card p,
.pc-detail-meta,
.pc-status-card p,
.pc-raw-head span,
.pc-preview-card p,
.pc-field-label,
.pc-entry-head span {
  color: var(--pc-muted);
}

.pc-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
}

.pc-toolbar .pc-soft-btn {
  justify-self: start;
  width: auto;
  margin-bottom: 4px;
}

.pc-generation-aliases {
  display: grid;
  gap: 10px;
}

.pc-generation-aliases-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pc-alias-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: end;
  gap: 8px;
}

.pc-alias-swap {
  margin-bottom: 0;
}

.pc-tag-cloud {
  display: flex;
  align-items: center;
  align-content: flex-start;
  gap: 8px;
  flex-wrap: wrap;
  max-height: none;
  overflow-y: visible;
  overscroll-behavior: contain;
  padding: 10px;
  border: 0.5px solid var(--pc-border);
  border-radius: 12px;
  background: var(--pc-bg);
}

.pc-theater-filter-tabs {
  display: flex;
  gap: 8px;
  min-width: 0;
  overflow-x: auto;
  padding: 2px 0 6px;
  scrollbar-width: none;
}

.pc-theater-filter-tabs::-webkit-scrollbar {
  display: none;
}

.pc-theater-filter-tabs :deep(.pc-capsule-tag) {
  flex: 0 0 auto;
}

.pc-custom-type-row {
  display: flex;
  gap: 8px;
}

.pc-custom-type-row .pc-field {
  flex: 1;
}

.pc-entry-list {
  display: grid;
  gap: 10px;
}

.pc-entry-card,
.pc-status-card,
.pc-detail-content,
.pc-preview-card {
  border: 0.5px solid var(--pc-border);
  border-radius: 12px;
  background: var(--pc-bg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.pc-entry-card,
.pc-status-card,
.pc-preview-card,
.pc-detail-content {
  padding: 13px;
}

.pc-entry-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}

.pc-entry-main {
  min-width: 0;
  text-align: left;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
}

.pc-entry-head,
.pc-detail-meta,
.pc-section-head,
.pc-raw-head,
.pc-hero-actions,
.pc-entry-tags {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pc-entry-main strong {
  display: block;
  min-width: 0;
  overflow: hidden;
  font-size: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-entry-head,
.pc-detail-meta,
.pc-section-head,
.pc-raw-head {
  justify-content: space-between;
}

.pc-entry-head {
  align-items: flex-start;
}

.pc-entry-tags {
  flex-wrap: wrap;
}

.pc-mode-selector {
  max-width: 100%;
}

.pc-preview-render-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.pc-entry-main p {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.5;
}

.pc-entry-main p.preview {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pc-search {
  width: 100%;
  border: 0.5px solid var(--pc-border);
  border-radius: 10px;
  outline: none;
  background: var(--pc-bg);
  color: var(--pc-text);
  padding: 11px 12px;
  font-size: 14px;
}

.pc-search {
  height: 40px;
  min-height: 40px;
  line-height: normal;
}

.pc-theater-app .pc-area {
  min-height: 96px;
  resize: vertical;
}

.pc-theater-app .pc-area.compact {
  min-height: 96px;
}

.pc-theater-app :is(.pc-primary-btn.compact, .pc-soft-btn.compact) {
  min-width: 0;
  width: auto;
}

.pc-soft-btn.danger,
.pc-icon-btn.danger {
  color: var(--pc-danger);
}

.pc-detail-content {
  margin: 0;
  white-space: pre-wrap;
  color: var(--pc-text);
  font-family: var(--pc-reader-font-family);
  font-size: var(--pc-reader-font-size);
  line-height: var(--pc-reader-line-height);
  overflow: auto;
}

.pc-detail-content :deep(*) {
  font-family: inherit;
}

.pc-theater-app .pc-form-actions {
  justify-content: flex-start;
  margin-top: 0;
}

.pc-raw-output,
.pc-number-field {
  display: grid;
  gap: 8px;
}

.pc-mini-grid,
.pc-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.pc-status-card.warning {
  border-color: color-mix(in srgb, #f5a623 42%, var(--pc-border) 58%);
}

.pc-status-card.danger {
  border-color: color-mix(in srgb, var(--pc-danger) 42%, var(--pc-border) 58%);
}

.pc-status-card p {
  margin: 6px 0 0;
  line-height: 1.5;
}

.pc-raw-area {
  min-height: 180px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}
</style>
