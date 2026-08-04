<template>
  <section class="pc-profiles-app">
    <section v-if="route.page === 'root'" class="pc-profiles-page">
      <section class="pc-profiles-toolbar">
        <div class="pc-profile-context-row">
          <div class="pc-profile-table-switcher">
            <i :class="['fa-solid', profileKindIcon(selectedTable?.kind || 'note')]"></i>
            <SearchableCombobox
              v-model="selectedTableId"
              :input-label="t`当前资料表`"
              :menu-max-height="260"
              :options="profileTableOptions"
              :placeholder="t`选择或搜索资料表`"
              :toggle-title="t`展开资料表`"
            />
          </div>
          <button class="pc-icon-btn" type="button" :title="t`管理资料表`" @click="openTableManager">
            <i class="fa-solid fa-gear"></i>
          </button>
        </div>
        <label class="pc-search-field">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="query" type="search" :placeholder="t`搜索当前表`" />
        </label>
        <div v-if="tableEntries.length" class="pc-profiles-toolbar-bottom">
          <span class="pc-segment pc-profile-view-toggle" role="group" :aria-label="t`资料显示方式`">
            <button
              :class="['pc-segment-btn', { active: profileViewMode === 'list' }]"
              type="button"
              :title="t`列表显示`"
              :aria-label="t`列表显示`"
              @click="profileViewMode = 'list'"
            >
              <i class="fa-solid fa-list"></i>
            </button>
            <button
              :class="['pc-segment-btn', { active: profileViewMode === 'table' }]"
              type="button"
              :title="t`表格显示`"
              :aria-label="t`表格显示`"
              @click="profileViewMode = 'table'"
            >
              <i class="fa-solid fa-table"></i>
            </button>
          </span>
          <div class="pc-profile-primary-actions">
            <button class="pc-soft-btn compact" type="button" @click="openEditor()">
              <i class="fa-solid fa-plus"></i>
              <span>{{ t`新增` }}</span>
            </button>
            <button class="pc-primary-btn compact" type="button" @click="openGenerate">
              <i class="fa-solid fa-wand-magic-sparkles"></i>
              <span>{{ t`AI 生成` }}</span>
            </button>
          </div>
        </div>
      </section>

      <section
        v-if="selectedTable && profileViewMode === 'list'"
        class="pc-profile-list"
        :aria-label="selectedTable.name"
      >
        <button
          v-for="entry in filteredEntries"
          :key="entry.id"
          class="pc-profile-list-row"
          type="button"
          @click="openEntry(entry.id)"
        >
          <i :class="['fa-solid', 'pc-profile-list-icon', profileKindIcon(entry.kind)]"></i>
          <span class="pc-profile-list-main">
            <strong>{{ entry.title }}</strong>
            <small>{{ entryListPreview(entry) || t`未填写资料` }}</small>
            <span v-if="entry.tags.length" class="pc-profile-list-tags">
              <em v-for="tag in entry.tags.slice(0, 3)" :key="tag">{{ tag }}</em>
            </span>
          </span>
          <i class="fa-solid fa-chevron-right pc-profile-list-arrow"></i>
        </button>
      </section>

      <section v-else-if="selectedTable" class="pc-profile-table-wrap" :aria-label="selectedTable.name">
        <div
          class="pc-profile-table"
          :style="{
            '--pc-profile-grid-template': profileTableGridTemplate,
            '--pc-profile-table-min-width': `${profileTableMinWidth}px`,
          }"
        >
          <div class="pc-profile-table-header" role="row">
            <span v-for="column in visibleTableColumns" :key="column.id" role="columnheader">{{ column.label }}</span>
          </div>
          <button
            v-for="entry in filteredEntries"
            :key="entry.id"
            class="pc-profile-table-row"
            type="button"
            @click="openEntry(entry.id)"
          >
            <span
              v-for="column in visibleTableColumns"
              :key="column.id"
              :class="['pc-profile-table-cell', { 'is-status': isStatusColumn(column) }]"
              :title="profiles.getEntryField(entry, column.id)"
            >
              <template v-if="column.id === 'tags' && profiles.getEntryField(entry, column.id)">
                <em v-for="tag in entry.tags.slice(0, 2)" :key="tag">{{ tag }}</em>
              </template>
              <template v-else>
                <i
                  v-if="isStatusColumn(column) && profiles.getEntryField(entry, column.id)"
                  class="pc-profile-status-dot"
                ></i>
                {{ profiles.getEntryField(entry, column.id) || t`未填写` }}
              </template>
            </span>
            <i v-if="entry.favorite" class="fa-solid fa-heart pc-profile-table-favorite"></i>
          </button>
        </div>
      </section>
      <EmptyState
        v-if="!filteredEntries.length"
        class="pc-profile-empty"
        :title="tableEntries.length ? t`没有匹配的资料` : t`当前表还没有条目`"
      >
        <div v-if="!tableEntries.length" class="pc-profile-empty-actions">
          <button class="pc-soft-btn compact" type="button" @click="openEditor()">
            <i class="fa-solid fa-plus"></i>
            <span>{{ t`新增条目` }}</span>
          </button>
          <button class="pc-primary-btn compact" type="button" @click="openGenerate">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
            <span>{{ t`AI 生成` }}</span>
          </button>
        </div>
        <button v-else class="pc-soft-btn compact pc-profile-clear-search" type="button" @click="query = ''">
          {{ t`清除搜索` }}
        </button>
      </EmptyState>

      <FailedDraftList
        :drafts="failedDrafts"
        :get-context="failedDraftSourceLabel"
        :get-title="failedDraftTitle"
        @open="openFailedDraft"
        @remove="removeFailedDraft"
      />

      <PreviewDraftNotice
        :draft="profilesPreviewDraft"
        @discard="discardProfilesPreviewDraft"
        @open="openProfilesPreviewDraft"
      />
    </section>

    <section v-else-if="route.page === 'tables'" class="pc-profiles-page">
      <section class="pc-section-card pc-profile-table-manager">
        <div class="pc-profile-table-manager-head">
          <div>
            <span class="pc-kicker">{{ t`资料表` }}</span>
            <h2>{{ t`表格类型` }}</h2>
          </div>
          <button class="pc-icon-btn primary" type="button" :title="t`新建资料表`" @click="createTable">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
        <button
          v-for="table in tables"
          :key="table.id"
          class="pc-profile-table-manager-row"
          type="button"
          @click="openTableEditor(table.id)"
        >
          <i :class="['fa-solid', 'pc-profile-table-manager-icon', profileKindIcon(table.kind)]"></i>
          <span>
            <strong>{{ table.name }}</strong>
            <small
              >{{ table.builtIn ? t`内置` : t`自定义` }} · {{ table.columns.length }} {{ t`个字段` }} ·
              {{ tableEntryCount(table.id) }} {{ t`条` }}</small
            >
          </span>
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </section>
    </section>

    <section v-else-if="route.page === 'table-editor' && editingTable" class="pc-profiles-page">
      <article class="pc-editor-card pc-profile-table-editor">
        <span class="pc-kicker">{{ editingTable.builtIn ? t`内置资料表` : t`自定义资料表` }}</span>
        <input v-model="tableDraft.name" class="pc-field" type="text" :placeholder="t`表格名称`" />
        <label class="pc-field-group">
          <span>{{ t`关联资料类型` }}</span>
          <select v-model="tableDraft.kind" class="pc-field pc-select">
            <option v-for="option in profileKindOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
          </select>
        </label>
        <details class="pc-profile-display-format">
          <summary>
            <span>
              <strong>{{ t`资料展示` }}</strong>
              <small>{{ tableDraft.renderMode === 'frontend' ? t`网页渲染` : 'Markdown' }}</small>
            </span>
            <i class="fa-solid fa-chevron-down"></i>
          </summary>
          <div class="pc-profile-display-format-body">
            <span class="pc-segment">
              <button
                :class="['pc-segment-btn', { active: tableDraft.renderMode === 'markdown' }]"
                type="button"
                @click="tableDraft.renderMode = 'markdown'"
              >
                Markdown
              </button>
              <button
                :class="['pc-segment-btn', { active: tableDraft.renderMode === 'frontend' }]"
                type="button"
                @click="tableDraft.renderMode = 'frontend'"
              >
                {{ t`网页渲染` }}
              </button>
            </span>
            <textarea
              v-model="tableDraft.displayFormat"
              class="pc-area compact mono"
              :placeholder="t`<character>\n身份：{{identity}}\n</character>`"
            ></textarea>
            <button class="pc-soft-btn compact" type="button" @click="resetTableDisplayFormat">
              <i class="fa-solid fa-rotate-left"></i>{{ t`重置格式` }}
            </button>
          </div>
        </details>

        <section class="pc-profile-fields-editor">
          <div class="pc-profile-fields-head">
            <span>
              <strong>{{ t`字段` }}</strong>
              <small>{{ tableDraft.columns.length }}</small>
            </span>
            <button class="pc-icon-btn" type="button" :title="t`添加字段`" @click="openNewTableColumn">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>
          <div class="pc-profile-column-list">
            <article
              v-for="column in tableDraft.columns"
              :key="column.id"
              class="pc-profile-column-row"
              :class="{
                disabled: !column.enabled,
                dragging: tableColumnDrag.isDragging && tableColumnDrag.columnId === column.id,
                'drop-before': tableColumnDrag.isDragging && tableColumnDrag.insertBeforeId === column.id,
              }"
              :data-profile-column-id="column.id"
            >
              <button
                class="pc-icon-btn pc-profile-column-drag-handle"
                type="button"
                :title="t`拖拽排序`"
                @click.prevent
                @pointercancel="cancelTableColumnDrag"
                @pointerdown="startTableColumnDrag($event, column.id)"
                @pointermove="moveTableColumnDrag"
                @pointerup="finishTableColumnDrag"
              >
                <i class="fa-solid fa-grip-lines"></i>
              </button>
              <button class="pc-profile-column-main" type="button" @click="openTableColumn(column.id)">
                <strong>{{ column.label }}</strong>
                <span>
                  <i v-if="isProtectedColumn(column.id)" class="fa-solid fa-lock" :title="t`固定字段`"></i>
                  <i v-if="!column.enabled" class="fa-solid fa-eye-slash" :title="t`字段已停用`"></i>
                  <i class="fa-solid fa-chevron-right"></i>
                </span>
              </button>
            </article>
          </div>
        </section>
        <div class="pc-form-actions">
          <button
            v-if="!editingTable.builtIn"
            class="pc-soft-btn danger"
            type="button"
            @click="removeTable(editingTable.id)"
          >
            {{ t`删除表格` }}
          </button>
          <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
          <button class="pc-primary-btn" type="button" @click="saveTableDraft">{{ t`保存` }}</button>
        </div>
      </article>
    </section>

    <ProfileFieldEditorPage
      v-else-if="route.page === 'table-column-editor' && editingTable"
      :column="editingTableColumn"
      :new-field="route.params?.columnId === newTableColumnRouteId"
      :protected-field="Boolean(editingTableColumn && isProtectedColumn(editingTableColumn.id))"
      @cancel="phone.goBack()"
      @remove="removeEditingTableColumn"
      @save="saveEditingTableColumn"
    />

    <section v-else-if="route.page === 'entry' && activeEntry" class="pc-profiles-page pc-profiles-detail-page">
      <article class="pc-detail-card pc-profile-detail-archive">
        <div class="pc-detail-title-row">
          <div>
            <span class="pc-kicker"
              ><i :class="['fa-solid', profileKindIcon(activeEntry.kind)]"></i>{{ entryTableName(activeEntry) }}</span
            >
            <h2>{{ activeEntry.title }}</h2>
          </div>
          <button class="pc-detail-mini-btn" type="button" :title="t`编辑`" @click="openEditor(activeEntry.id)">
            <i class="fa-solid fa-pen"></i>
          </button>
        </div>
        <FrontendFrame
          v-if="activeEntryTable?.renderMode === 'frontend'"
          :active="route.page === 'entry'"
          :content="profileFrontend.content"
          :theme="settings.theme"
          :title="activeEntry.title"
        />
        <div v-if="profileFrontend.errors.length" class="pc-status-card warning">
          <strong>{{ t`资料表格式提示` }}</strong>
          <p>{{ profileFrontend.errors.join('；') }}</p>
        </div>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <article
          v-else
          ref="entryContentEl"
          class="pc-detail-content pc-rendered-markdown"
          v-html="renderMarkdown(profileMarkdownContent)"
        ></article>
      </article>
      <DetailFooter
        catalog-label="列表"
        next-label="下一条"
        previous-label="上一条"
        :next-disabled="!nextEntryId"
        :previous-disabled="!previousEntryId"
        @bottom="scrollToBottom"
        @catalog="phone.replacePage('root', '资料表')"
        @next="openEntry(nextEntryId)"
        @previous="openEntry(previousEntryId)"
        @top="scrollToTop"
      >
        <template #actions>
          <button
            v-if="profileBaguContent"
            class="pc-soft-btn"
            type="button"
            :title="t`八股检测`"
            @click="openProfilesBaguScan"
          >
            <i class="fa-solid fa-filter-circle-xmark"></i>
          </button>
          <button
            :class="['pc-soft-btn', { active: activeEntry.favorite }]"
            type="button"
            :title="activeEntry.favorite ? t`取消收藏` : t`收藏`"
            @click="profiles.toggleFavorite(activeEntry.id)"
          >
            <i class="fa-solid fa-heart"></i>
          </button>
          <button class="pc-soft-btn" type="button" :title="t`编辑`" @click="openEditor(activeEntry.id)">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="pc-soft-btn danger" type="button" :title="t`删除`" @click="removeEntry(activeEntry.id)">
            <i class="fa-solid fa-trash"></i>
          </button>
        </template>
      </DetailFooter>
    </section>

    <section v-else-if="route.page === 'bagu-scan' && activeEntry" class="pc-profiles-page">
      <article class="pc-detail-card">
        <div class="pc-detail-title-row">
          <div>
            <span class="pc-kicker">{{ getProfileKindLabel(activeEntry.kind) }}</span>
            <h2>{{ activeEntry.title }}</h2>
          </div>
        </div>
        <BaguScanPanel
          auto-scan
          class="pc-detail-bagu-panel"
          :content="profileBaguContent"
          :apply-handler="applyProfilesBaguContent"
        />
      </article>
    </section>

    <section v-else-if="route.page === 'editor'" class="pc-profiles-page">
      <article class="pc-editor-card">
        <span class="pc-kicker">{{ editingEntry ? t`编辑资料` : t`新增资料` }}</span>
        <h2>{{ editingEntry?.title || t`资料卡片` }}</h2>
        <input v-model="draft.title" class="pc-field" type="text" :placeholder="t`标题`" />
        <select v-model="draft.tableId" class="pc-field pc-select" @change="syncDraftTable">
          <option v-for="table in tables" :key="table.id" :value="table.id">{{ table.name }}</option>
        </select>
        <input
          v-if="isDraftColumnEnabled('summary')"
          v-model="draft.summary"
          class="pc-field"
          type="text"
          :placeholder="t`一句话摘要，可留空`"
        />
        <input
          v-if="isDraftColumnEnabled('tags')"
          v-model="draft.tagsText"
          class="pc-field"
          type="text"
          :placeholder="t`标签，用逗号分隔`"
        />
        <template v-for="column in editableDraftColumns" :key="column.id">
          <label class="pc-field-group">
            <span>{{ column.label }}</span>
            <textarea
              v-if="column.type === 'textarea'"
              v-model="draft.fields[column.id]"
              class="pc-area compact"
            ></textarea>
            <select
              v-else-if="column.type === 'select' || column.type === 'boolean'"
              v-model="draft.fields[column.id]"
              class="pc-field pc-select"
            >
              <option value="">{{ t`未填写` }}</option>
              <option
                v-for="option in column.type === 'boolean' ? booleanOptions : column.options"
                :key="option"
                :value="option"
              >
                {{ option }}
              </option>
            </select>
            <input
              v-else
              v-model="draft.fields[column.id]"
              class="pc-field"
              type="text"
              :placeholder="column.type === 'tags' ? t`用逗号分隔` : t`可留空`"
            />
          </label>
        </template>
        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
          <button class="pc-primary-btn" type="button" @click="saveDraft">{{ t`保存` }}</button>
        </div>
      </article>
    </section>

    <section v-else-if="route.page === 'generate'" class="pc-profiles-page">
      <article class="pc-editor-card">
        <span class="pc-kicker">{{ t`AI 资料` }}</span>
        <h2>{{ t`生成资料卡片` }}</h2>
        <label class="pc-field-group">
          <span>{{ t`目标资料表` }}</span>
          <select v-model="generationDraft.tableId" class="pc-field pc-select" @change="syncGenerationTable">
            <option v-for="table in tables" :key="table.id" :value="table.id">{{ table.name }}</option>
          </select>
        </label>
        <input
          v-model="generationDraft.titleHint"
          class="pc-field"
          type="text"
          :placeholder="t`标题或对象名，可留空`"
        />
        <GenerationPanel
          :capture="captureProfilePrompt"
          :capture-reset-key="profilePromptPreview"
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
          requirement-placeholder="例如：整理沐辞的人物资料，只保留已发生和已确认的信息。"
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
      </article>
    </section>

    <section
      v-else-if="route.page === 'preview' && generationState.preview"
      class="pc-profiles-page pc-generation-preview-page"
    >
      <article class="pc-detail-card pc-generation-preview-card">
        <GenerationPreviewPanel
          :content="generationState.preview.content"
          :raw="generationState.preview.raw"
          raw-editable
          :reparse-handler="reparsePreviewRaw"
          :scan-enabled="false"
          :source-label="generationState.preview.source.label"
          :text-provider-summary="textProviderSummary"
          :title="generationState.preview.title"
          :warnings="generationState.preview.warnings"
          save-label="保存资料"
          @back="returnToGenerate"
          @reparse="reparsePreviewRaw"
          @save="savePreview"
          @update:raw="generationState.preview.raw = $event"
        />
      </article>
    </section>

    <section v-else-if="route.page === 'failed-draft' && activeFailedDraft" class="pc-profiles-page pc-repair-page">
      <article class="pc-editor-card pc-repair-card">
        <span class="pc-kicker">{{ activeFailedDraft.source.label }}</span>
        <h2>{{ t`修复解析失败草稿` }}</h2>
        <div v-if="activeFailedDraft.warnings.length" class="pc-status-card warning">
          <strong>{{ t`上次解析提示` }}</strong>
          <p>{{ activeFailedDraft.warnings.join('；') }}</p>
        </div>
        <label class="pc-number-field pc-repair-raw-field">
          <span class="pc-field-label">{{ t`原始输出` }}</span>
          <RawOutputEditor
            v-model="failedDraftRawOutput"
            :placeholder="t`在这里修 XML 结构或补 title / content。`"
            @reparse="reparseFailedDraft"
          />
        </label>
        <div class="pc-form-actions">
          <button class="pc-soft-btn danger" type="button" @click="removeFailedDraft(activeFailedDraft.id)">
            {{ t`删除草稿` }}
          </button>
          <button class="pc-soft-btn" type="button" @click="reparseFailedDraft">{{ t`重新解析` }}</button>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import BaguScanPanel from '@/components/BaguScanPanel.vue';
import DetailFooter from '@/components/DetailFooter.vue';
import EmptyState from '@/components/EmptyState.vue';
import FailedDraftList from '@/components/FailedDraftList.vue';
import FrontendFrame from '@/components/FrontendFrame.vue';
import GenerationPanel from '@/components/GenerationPanel.vue';
import GenerationPreviewPanel from '@/components/GenerationPreviewPanel.vue';
import PreviewDraftNotice from '@/components/PreviewDraftNotice.vue';
import RawOutputEditor from '@/components/RawOutputEditor.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import ProfileFieldEditorPage from './ProfileFieldEditorPage.vue';
import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import { captureGenerationPrompt, generateContent } from '@/core/generationService';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import type { FailedGenerationDraft } from '@/type/generation';
import { canOpenBaguScan } from '@/util/baguScanGate';
import { useDetailScroll } from '@/util/detailScroll';
import { renderMarkdown } from '@/util/markdown';
import { usePreviewDraftPersistence } from '@/util/previewDrafts';
import type { GenerationReferenceItem } from '@/util/references';
import { formatGenerationReferences } from '@/util/references';
import { useInvalidRouteFallback } from '@/util/routeFallback';
import { stopGenerationByIdSafe } from '@/util/runtime';
import { formatTextProviderSummary } from '@/util/textProvider';
import { regexDisplayProfilesTarget, useRegexDisplayStore } from '@/apps/regex-display/store';
import {
  getProfileKindLabel,
  profileKindOptions,
  type ProfileTableColumn,
  type ProfileEntry,
  type ProfileKind,
  type ProfileRenderMode,
  useProfilesStore,
} from './store';
import { parseProfileXmlResult } from './generation';
import {
  createDefaultProfileDisplayFormat,
  formatProfileMarkdown,
  getProfileListPreview,
  renderProfileFrontend,
} from './rendering';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const profiles = useProfilesStore();
const regexDisplay = useRegexDisplayStore();
const prompts = usePromptStore();
const settingsStore = useSettingsStore();
const adapter = getRegisteredPhoneGenerationAdapter('profiles', 'generate');
const { entries, failedDrafts, tables } = storeToRefs(profiles);
const { rules: regexDisplayRules } = storeToRefs(regexDisplay);
const { settings } = storeToRefs(settingsStore);

const route = computed(() => phone.currentRoute);
const query = ref('');
const selectedTableId = ref('');
const profileViewMode = ref<'list' | 'table'>('list');
const selectedReferences = ref<GenerationReferenceItem[]>([]);
const entryContentEl = ref<HTMLElement | null>(null);
const failedDraftRawOutput = ref('');
const draft = reactive({
  fields: {} as Record<string, string>,
  kind: 'character' as ProfileKind,
  summary: '',
  tableId: '',
  tagsText: '',
  title: '',
});
const generationDraft = reactive({
  fromStartEnd: 20,
  kind: 'character' as ProfileKind,
  rangeText: '',
  recentCount: 20,
  singleMessageId: 0,
  tableId: '',
  titleHint: '',
  userRequirement: '',
});
const generationState = reactive({
  error: '',
  generationId: '',
  preview: null as null | {
    content: string;
    draftId: null | string;
    fields: Record<string, string>;
    kind: ProfileKind;
    raw: string;
    source: { label: string };
    summary: string;
    tags: string[];
    tableId: string;
    title: string;
    warnings: string[];
  },
  rawOutput: '',
  running: false,
});
type ProfilesPreview = NonNullable<typeof generationState.preview>;

const tableDraft = reactive({
  columns: [] as ProfileTableColumn[],
  displayFormat: '',
  kind: 'note' as ProfileKind,
  name: '',
  renderMode: 'markdown' as ProfileRenderMode,
});
const newTableColumnRouteId = '__new__';
const tableDraftTableId = ref('');
const tableColumnDrag = reactive({
  columnId: '',
  insertBeforeId: '',
  isDragging: false,
  pointerId: -1,
  startY: 0,
});
const booleanOptions = ['否', '是'];

const {
  clearPreviewDraft: clearProfilesPreviewDraft,
  discardPreviewDraft: discardProfilesPreviewDraft,
  draft: profilesPreviewDraft,
  openPreviewDraft: openProfilesPreviewDraft,
  persistPreviewDraft: persistProfilesPreviewDraft,
} = usePreviewDraftPersistence<ProfilesPreview>({
  appId: 'profiles',
  consumeFailedDraft: draftId => profiles.deleteFailedDraft(draftId),
  getPreview: () => generationState.preview,
  page: 'preview',
  route,
  setPreview: preview => {
    generationState.preview = preview;
  },
  title: '资料预览',
});

const activeEntry = computed(() =>
  route.value.params?.entryId ? profiles.getEntry(route.value.params.entryId) : null,
);
const editingEntry = computed(() =>
  route.value.params?.entryId ? profiles.getEntry(route.value.params.entryId) : null,
);
const editingTable = computed(() =>
  route.value.params?.tableId ? profiles.getTable(route.value.params.tableId) : null,
);
const editingTableColumn = computed(() => {
  const columnId = route.value.params?.columnId;
  if (!columnId || columnId === newTableColumnRouteId) return null;
  return tableDraft.columns.find(column => column.id === columnId) ?? null;
});
const activeFailedDraft = computed(() =>
  route.value.params?.draftId ? profiles.getFailedDraft(route.value.params.draftId) : null,
);
const activeEntryIndex = computed(() => entries.value.findIndex(entry => entry.id === activeEntry.value?.id));
const previousEntryId = computed(() =>
  activeEntryIndex.value > 0 ? entries.value[activeEntryIndex.value - 1]?.id || '' : '',
);
const nextEntryId = computed(() =>
  activeEntryIndex.value >= 0 ? entries.value[activeEntryIndex.value + 1]?.id || '' : '',
);
const normalizedQuery = computed(() => query.value.trim().toLowerCase());
const selectedTable = computed(() => profiles.getTable(selectedTableId.value) ?? tables.value[0] ?? null);
const tableEntries = computed(() => (selectedTable.value ? profiles.getEntriesForTable(selectedTable.value.id) : []));
const activeEntryTable = computed(() => (activeEntry.value ? profiles.getTable(activeEntry.value.tableId) : null));
const visibleTableColumns = computed(() => {
  const columns = selectedTable.value?.columns.filter(column => column.enabled) ?? [];
  return columns.length
    ? columns.slice(0, 3)
    : [
        {
          description: '',
          enabled: true,
          id: 'title',
          label: '名称',
          options: [],
          required: true,
          type: 'text' as const,
        },
      ];
});
const profileTableOptions = computed(() =>
  tables.value.map(table => ({
    group: table.builtIn ? '内置资料表' : '自定义资料表',
    label: `${table.name} · ${tableEntryCount(table.id)} 条`,
    value: table.id,
  })),
);
const profileTableGridTemplate = computed(() => {
  const trailingColumns = Math.max(0, visibleTableColumns.value.length - 1);
  return trailingColumns ? `minmax(128px, 1.25fr) repeat(${trailingColumns}, minmax(110px, 1fr))` : 'minmax(0, 1fr)';
});
const profileTableMinWidth = computed(() =>
  visibleTableColumns.value.length > 1 ? 128 + (visibleTableColumns.value.length - 1) * 110 : 0,
);
const editableDraftColumns = computed(() => {
  const table = profiles.getTable(draft.tableId);
  return table?.columns.filter(column => column.enabled && !isCoreColumn(column.id)) ?? [];
});
const filteredEntries = computed(() =>
  tableEntries.value.filter(entry => {
    const search = normalizedQuery.value;
    if (!search) return true;
    const enabledColumnIds = new Set(
      (selectedTable.value?.columns ?? []).filter(column => column.enabled).map(column => column.id),
    );
    return [
      entry.title,
      enabledColumnIds.has('summary') ? entry.summary : '',
      getProfileKindLabel(entry.kind),
      ...(enabledColumnIds.has('tags') ? entry.tags : []),
      ...Object.entries(entry.fields)
        .filter(([columnId]) => enabledColumnIds.has(columnId))
        .map(([, value]) => value),
    ]
      .join(' ')
      .toLowerCase()
      .includes(search);
  }),
);
const formattedReferences = computed(() => formatGenerationReferences(selectedReferences.value));
const profileBaguContent = computed(() => {
  const detailsEnabled = activeEntryTable.value?.columns.some(column => column.id === 'details' && column.enabled);
  return detailsEnabled ? activeEntry.value?.fields.details || '' : '';
});
const profilePromptPreview = computed(() => buildGenerationConfig());
const profileMarkdownContent = computed(() =>
  activeEntry.value && activeEntryTable.value ? formatProfileMarkdown(activeEntry.value, activeEntryTable.value) : '',
);
const profileFrontend = computed(() =>
  activeEntry.value && activeEntryTable.value
    ? renderProfileFrontend(
        activeEntry.value,
        activeEntryTable.value,
        regexDisplayRules.value.filter(rule => rule.targets.includes(regexDisplayProfilesTarget)),
      )
    : { applied: [], content: '', errors: [], renderMode: 'html' as const },
);
const textProviderSummary = computed(() =>
  settings.value.textProvider.mode === 'external'
    ? formatTextProviderSummary(settings.value.textProvider)
    : `酒馆当前 API · ${settings.value.generation.tavernPresetName.trim() || '跟随当前预设'}`,
);
const { scrollToBottom, scrollToTop } = useDetailScroll(entryContentEl, '.pc-profiles-detail-page .pc-detail-content');

onScopeDispose(() => {
  if (generationState.running && generationState.generationId) {
    stopGenerationByIdSafe(generationState.generationId);
  }
});

watch(
  () => [route.value.appId, route.value.page, route.value.params?.entryId] as const,
  ([appId, page]) => {
    if (appId !== 'profiles' || page !== 'editor') return;
    fillDraft(editingEntry.value);
  },
  { immediate: true },
);

watch(
  tables,
  currentTables => {
    if (!currentTables.length) return;
    if (!currentTables.some(table => table.id === selectedTableId.value)) {
      selectedTableId.value = currentTables[0].id;
    }
    if (!currentTables.some(table => table.id === generationDraft.tableId)) {
      generationDraft.tableId = selectedTableId.value;
      syncGenerationTable();
    }
  },
  { immediate: true },
);

watch(selectedTableId, (nextTableId, previousTableId) => {
  if (previousTableId && nextTableId !== previousTableId) query.value = '';
});

watch(
  () => [route.value.appId, route.value.page, route.value.params?.tableId] as const,
  ([appId, page, tableId]) => {
    if (appId !== 'profiles' || page !== 'table-editor') return;
    if (!tableId || tableDraftTableId.value === tableId) return;
    fillTableDraft(editingTable.value);
  },
  { immediate: true },
);

watch(
  () => [route.value.appId, route.value.page, route.value.params?.draftId] as const,
  ([appId, page]) => {
    if (appId !== 'profiles' || page !== 'failed-draft') return;
    failedDraftRawOutput.value = activeFailedDraft.value?.rawOutput || '';
  },
  { immediate: true },
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
    current.appId === 'profiles' &&
    ((current.page === 'preview' && !current.hasPreview) ||
      (['entry', 'bagu-scan'].includes(current.page) && !current.hasEntry) ||
      (current.page === 'failed-draft' && !current.hasFailedDraft)),
  fallback: () => {
    if (route.value.appId !== 'profiles') return;
    phone.replacePage('root', '资料表');
  },
});

function splitTags(text: string) {
  return text
    .split(/[,，、\n]/g)
    .map(tag => tag.trim())
    .filter(Boolean);
}

function fillDraft(entry: ProfileEntry | null) {
  draft.title = entry?.title || '';
  draft.kind = entry?.kind || selectedTable.value?.kind || 'character';
  draft.tableId = entry?.tableId || selectedTable.value?.id || profiles.getDefaultTable(draft.kind)?.id || '';
  draft.summary = entry?.summary || '';
  draft.tagsText = entry?.tags.join('、') || '';
  draft.fields = { ...(entry?.fields ?? {}) };
}

function fillTableDraft(table: ReturnType<typeof profiles.getTable>) {
  tableDraft.displayFormat = table?.displayFormat || (table ? createDefaultProfileDisplayFormat(table) : '');
  tableDraft.name = table?.name || '';
  tableDraft.kind = table?.kind || 'note';
  tableDraft.renderMode = table?.renderMode || 'markdown';
  tableDraft.columns = (table?.columns ?? []).map(column => ({
    ...column,
    options: [...column.options],
  }));
  tableDraftTableId.value = table?.id || '';
}

function isCoreColumn(columnId: string) {
  return ['title', 'summary', 'tags'].includes(columnId);
}

function isProtectedColumn(columnId: string) {
  return ['title', 'summary', 'tags', 'details'].includes(columnId);
}

function isStatusColumn(column: ProfileTableColumn) {
  return column.type === 'boolean' || column.type === 'select' || /状态|status/i.test(column.label);
}

function profileKindIcon(kind: ProfileKind) {
  const icons: Record<ProfileKind, string> = {
    character: 'fa-user',
    event: 'fa-bolt',
    item: 'fa-cube',
    location: 'fa-location-dot',
    note: 'fa-note-sticky',
    organization: 'fa-people-group',
    rule: 'fa-scale-balanced',
    timeline: 'fa-timeline',
    world: 'fa-earth-asia',
  };
  return icons[kind];
}

function entryTableName(entry: ProfileEntry) {
  return profiles.getTable(entry.tableId)?.name || getProfileKindLabel(entry.kind);
}

function entryListPreview(entry: ProfileEntry) {
  return getProfileListPreview(entry, profiles.getTable(entry.tableId));
}

function tableEntryCount(tableId: string) {
  return profiles.getEntriesForTable(tableId).length;
}

function syncDraftTable() {
  const table = profiles.getTable(draft.tableId);
  if (!table) return;
  draft.kind = table.kind;
  const allowed = new Set(table.columns.map(column => column.id));
  draft.fields = Object.fromEntries(Object.entries(draft.fields).filter(([key]) => allowed.has(key)));
}

function isDraftColumnEnabled(columnId: string) {
  return Boolean(profiles.getTable(draft.tableId)?.columns.some(column => column.id === columnId && column.enabled));
}

function syncGenerationTable() {
  const table = profiles.getTable(generationDraft.tableId);
  if (table) generationDraft.kind = table.kind;
}

function openTableManager() {
  phone.pushPage('tables', '表格类型');
}

function openTableEditor(tableId: string) {
  const table = profiles.getTable(tableId);
  if (!table) return;
  tableDraftTableId.value = '';
  phone.pushPage('table-editor', table.name, { tableId });
}

function createTable() {
  const table = profiles.createTable({ kind: 'note', name: '新资料表' });
  openTableEditor(table.id);
}

function createTableColumnId() {
  const base = 'field';
  let index = tableDraft.columns.length + 1;
  let id = `${base}_${index}`;
  const used = new Set(tableDraft.columns.map(column => column.id));
  while (used.has(id)) {
    index += 1;
    id = `${base}_${index}`;
  }
  return id;
}

function openNewTableColumn() {
  const tableId = editingTable.value?.id;
  if (!tableId) return;
  phone.pushPage('table-column-editor', '新增字段', { columnId: newTableColumnRouteId, tableId });
}

function openTableColumn(columnId: string) {
  const tableId = editingTable.value?.id;
  const column = tableDraft.columns.find(item => item.id === columnId);
  if (!tableId || !column) return;
  phone.pushPage('table-column-editor', column.label, { columnId, tableId });
}

function saveEditingTableColumn(column: ProfileTableColumn) {
  const columnId = route.value.params?.columnId;
  if (columnId === newTableColumnRouteId) {
    tableDraft.columns.push({ ...column, id: createTableColumnId(), options: [...column.options] });
  } else {
    const index = tableDraft.columns.findIndex(item => item.id === columnId);
    if (index < 0) return;
    tableDraft.columns.splice(index, 1, {
      ...column,
      id: columnId || column.id,
      options: [...column.options],
    });
  }
  phone.goBack();
}

async function removeEditingTableColumn() {
  const columnId = route.value.params?.columnId;
  const column = tableDraft.columns.find(item => item.id === columnId);
  const table = editingTable.value;
  if (!column || !table || isProtectedColumn(column.id)) return;
  const valueCount = profiles
    .getEntriesForTable(table.id)
    .filter(entry => Boolean(entry.fields[column.id]?.trim())).length;
  const shouldDelete = await phone.confirmNotice(
    valueCount
      ? `要删除字段“${column.label}”吗？保存资料表后，${valueCount} 条资料中的已有字段值也会被删除。`
      : `要删除字段“${column.label}”吗？`,
    {
      confirmLabel: '删除字段',
      dedupeKey: `profiles-delete-column:${table.id}:${column.id}`,
      kind: 'warning',
    },
  );
  if (!shouldDelete) return;
  tableDraft.columns = tableDraft.columns.filter(item => item.id !== column.id);
  const escapedColumnId = column.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(`\\{\\{\\s*${escapedColumnId}\\s*\\}\\}`).test(tableDraft.displayFormat)) {
    toastr.warning(`资料展示格式仍包含 {{${column.id}}}，保存前可以在“资料展示”中调整`);
  }
  await phone.goBack();
}

function resetTableDisplayFormat() {
  const table = editingTable.value;
  if (!table) return;
  tableDraft.displayFormat = createDefaultProfileDisplayFormat({
    ...table,
    columns: tableDraft.columns,
    kind: tableDraft.kind,
  });
}

function resetTableColumnDrag() {
  tableColumnDrag.columnId = '';
  tableColumnDrag.insertBeforeId = '';
  tableColumnDrag.isDragging = false;
  tableColumnDrag.pointerId = -1;
  tableColumnDrag.startY = 0;
}

function startTableColumnDrag(event: PointerEvent, columnId: string) {
  if (event.button !== 0) return;
  resetTableColumnDrag();
  tableColumnDrag.columnId = columnId;
  tableColumnDrag.pointerId = event.pointerId;
  tableColumnDrag.startY = event.clientY;
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
}

function updateTableColumnInsertion(clientY: number) {
  const rows = [...document.querySelectorAll<HTMLElement>('.pc-profile-column-row')].filter(
    row => row.dataset.profileColumnId !== tableColumnDrag.columnId,
  );
  const beforeRow = rows.find(row => {
    const rect = row.getBoundingClientRect();
    return clientY < rect.top + rect.height / 2;
  });
  tableColumnDrag.insertBeforeId = beforeRow?.dataset.profileColumnId || '';
}

function autoScrollTableColumnList(clientY: number) {
  const screen = document.querySelector<HTMLElement>('#tavern-phone-root .pc-screen');
  if (!screen) return;
  const rect = screen.getBoundingClientRect();
  const edge = 52;
  if (clientY < rect.top + edge) screen.scrollTop -= 14;
  else if (clientY > rect.bottom - edge) screen.scrollTop += 14;
}

function moveTableColumnDrag(event: PointerEvent) {
  if (event.pointerId !== tableColumnDrag.pointerId || !tableColumnDrag.columnId) return;
  if (!tableColumnDrag.isDragging && Math.abs(event.clientY - tableColumnDrag.startY) > 4) {
    tableColumnDrag.isDragging = true;
  }
  if (!tableColumnDrag.isDragging) return;
  event.preventDefault();
  autoScrollTableColumnList(event.clientY);
  updateTableColumnInsertion(event.clientY);
}

function finishTableColumnDrag(event: PointerEvent) {
  if (event.pointerId !== tableColumnDrag.pointerId) return;
  if (tableColumnDrag.isDragging && tableColumnDrag.columnId) {
    const dragged = tableDraft.columns.find(column => column.id === tableColumnDrag.columnId);
    if (dragged) {
      const next = tableDraft.columns.filter(column => column.id !== dragged.id);
      const beforeIndex = next.findIndex(column => column.id === tableColumnDrag.insertBeforeId);
      next.splice(beforeIndex < 0 ? next.length : beforeIndex, 0, dragged);
      tableDraft.columns = next;
    }
  }
  resetTableColumnDrag();
}

function cancelTableColumnDrag(event: PointerEvent) {
  if (event.pointerId !== tableColumnDrag.pointerId) return;
  resetTableColumnDrag();
}

function saveTableDraft() {
  const table = editingTable.value;
  if (!table) return;
  const name = tableDraft.name.trim();
  if (!name) {
    toastr.warning('请先填写表格名称');
    return;
  }
  const columns = tableDraft.columns.map(column => ({
    ...column,
    description: column.description.trim(),
    label: column.label.trim() || '未命名字段',
    options: column.type === 'select' ? [...column.options] : [],
  }));
  profiles.updateTable(table.id, {
    columns,
    displayFormat: tableDraft.displayFormat.trim(),
    kind: tableDraft.kind,
    name,
    renderMode: tableDraft.renderMode,
  });
  tableDraftTableId.value = '';
  toastr.success('已保存资料表');
  phone.goBack();
}

async function removeTable(tableId: string) {
  const table = profiles.getTable(tableId);
  if (!table || table.builtIn) return;
  const count = tableEntryCount(tableId);
  const shouldDelete = await phone.confirmNotice(`要删除资料表“${table.name}”吗？其中 ${count} 条资料会移到“其他”。`, {
    confirmLabel: '删除表格',
    kind: 'warning',
  });
  if (!shouldDelete) return;
  profiles.deleteTable(tableId);
  toastr.success('已删除资料表');
  phone.replacePage('tables', '表格类型');
}

function openEntry(entryId: string) {
  const entry = profiles.getEntry(entryId);
  if (!entry) return;
  phone.pushPage('entry', entry.title, { entryId });
}

function openEditor(entryId?: string) {
  phone.pushPage('editor', entryId ? '编辑资料' : '新增资料', entryId ? { entryId } : {});
}

function openProfilesBaguScan() {
  if (!activeEntry.value) return;
  if (!canOpenBaguScan(profileBaguContent.value)) return;
  phone.pushPage('bagu-scan', '八股检测', {
    entryId: activeEntry.value.id,
  });
}

function openGenerate() {
  if (selectedTable.value) {
    generationDraft.tableId = selectedTable.value.id;
    syncGenerationTable();
  }
  phone.pushPage('generate', 'AI 资料');
}

function openFailedDraft(draftId: string) {
  if (!profiles.getFailedDraft(draftId)) return;
  phone.pushPage('failed-draft', '解析失败草稿', { draftId });
}

function failedDraftTitle() {
  return '未解析资料';
}

function failedDraftSourceLabel(draft: FailedGenerationDraft) {
  return draft.source.label;
}

function saveDraft() {
  if (!draft.title.trim()) {
    toastr.warning('请先填写标题');
    return;
  }

  const input = {
    fields: draft.fields,
    kind: draft.kind,
    summary: draft.summary,
    tableId: draft.tableId,
    tags: splitTags(draft.tagsText),
    title: draft.title,
  };
  const entry = editingEntry.value ? profiles.updateEntry(editingEntry.value.id, input) : profiles.createEntry(input);
  if (!entry) return;
  phone.replacePage('entry', entry.title, { entryId: entry.id });
  toastr.success('已保存资料');
}

async function removeEntry(entryId: string) {
  const entry = profiles.getEntry(entryId);
  const shouldDelete = await phone.confirmNotice(`要删除资料“${entry?.title || '未命名资料'}”吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!shouldDelete) return;
  profiles.deleteEntry(entryId);
  phone.goBack();
  toastr.success('已删除资料');
}

function applyProfilesBaguContent(content: string) {
  if (!activeEntry.value) return false;
  const entry = profiles.updateEntry(activeEntry.value.id, {
    fields: { ...activeEntry.value.fields, details: content },
    kind: activeEntry.value.kind,
    summary: activeEntry.value.summary,
    tags: [...activeEntry.value.tags],
    title: activeEntry.value.title,
  });
  return Boolean(entry);
}

function buildGenerationConfig() {
  return {
    appPrompt: prompts.appPrompts.profiles,
    kind: generationDraft.kind,
    outputFormat: prompts.resolveOutputFormat('profiles.generate'),
    tableId: generationDraft.tableId,
    titleHint: generationDraft.titleHint,
    userRequirement: generationDraft.userRequirement,
  };
}

function getGenerationOptions() {
  return {
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
  };
}

function captureProfilePrompt() {
  return captureGenerationPrompt(adapter, buildGenerationConfig(), getGenerationOptions());
}

function formatGeneratedFieldsPreview(
  title: string,
  summary: string,
  tags: string[],
  fields: Record<string, string>,
  tableId: string,
) {
  const table = profiles.getTable(tableId);
  const enabledColumnIds = new Set((table?.columns ?? []).filter(column => column.enabled).map(column => column.id));
  const lines = [
    `# ${title}`,
    enabledColumnIds.has('summary') && summary ? `摘要：${summary}` : '',
    enabledColumnIds.has('tags') && tags.length ? `标签：${tags.join('、')}` : '',
    ...(table?.columns ?? [])
      .filter(column => column.enabled && !['title', 'summary', 'tags', 'content'].includes(column.id))
      .map(column => (fields[column.id]?.trim() ? `${column.label}：${fields[column.id]}` : '')),
  ].filter(Boolean);
  return lines.join('\n\n');
}

function fieldsForTable(fields: Record<string, string>, tableId: string) {
  const ids = new Set(
    (profiles.getTable(tableId)?.columns ?? [])
      .filter(column => column.enabled && !['title', 'summary', 'tags', 'content'].includes(column.id))
      .map(column => column.id),
  );
  return Object.fromEntries(Object.entries(fields).filter(([fieldId]) => ids.has(fieldId)));
}

async function runGeneration() {
  generationState.error = '';
  clearProfilesPreviewDraft();
  generationState.rawOutput = '';
  generationState.preview = null;
  try {
    const result = await generateContent(adapter, buildGenerationConfig(), {
      ...getGenerationOptions(),
      createFailedDraft: input => profiles.createFailedDraft(input),
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
    });

    if (result.status === 'failed') {
      generationState.error = result.warnings.join('；') || '模型没有返回可解析的资料 XML';
      toastr.warning('XML 解析失败，已保存失败草稿');
      void phone.presentGeneratedPage('profiles', 'failed-draft', '解析失败草稿', { draftId: result.draft.id });
      return;
    }

    if (result.status === 'saved') {
      toastr.success('已生成并保存资料');
      void phone.presentGeneratedPage('profiles', 'entry', result.saved.entry.title, {
        entryId: result.saved.entry.id,
      });
      return;
    }

    generationState.preview = {
      content: formatGeneratedFieldsPreview(
        result.data.title,
        result.data.summary,
        result.data.tags,
        result.data.fields,
        generationDraft.tableId,
      ),
      draftId: null,
      fields: fieldsForTable(result.data.fields, generationDraft.tableId),
      kind: generationDraft.kind,
      raw: result.rawOutput,
      source: { label: result.source.label },
      summary: result.data.summary,
      tags: result.data.tags,
      tableId: generationDraft.tableId,
      title: result.data.title,
      warnings: result.warnings,
    };
    persistProfilesPreviewDraft();
    void phone.presentGeneratedPage('profiles', 'preview', '资料预览');
  } catch (caughtError) {
    generationState.error = caughtError instanceof Error ? caughtError.message : '生成资料失败';
  }
}

function returnToGenerate() {
  if (generationState.preview?.draftId) {
    phone.replacePage('failed-draft', '解析失败草稿', { draftId: generationState.preview.draftId });
    return;
  }
  phone.replacePage('generate', 'AI 资料');
}

function savePreview() {
  const preview = generationState.preview;
  if (!preview) return;
  const entry = profiles.createEntry({
    fields: fieldsForTable(preview.fields, preview.tableId),
    kind: preview.kind,
    summary: preview.summary,
    tableId: preview.tableId,
    tags: preview.tags,
    title: preview.title,
  });
  if (preview.draftId) profiles.deleteFailedDraft(preview.draftId);
  clearProfilesPreviewDraft();
  generationState.preview = null;
  toastr.success('已保存资料');
  phone.replacePage('entry', entry.title, { entryId: entry.id });
}

function reparsePreviewRaw() {
  const preview = generationState.preview;
  if (!preview) return false;
  const rawOutput = preview.raw.trim();
  if (!rawOutput) {
    toastr.warning('先补一点可解析的 XML 内容');
    return false;
  }

  const parsed = parseProfileXmlResult(rawOutput);
  if (!parsed.ok) {
    preview.raw = rawOutput;
    preview.warnings = parsed.warnings;
    toastr.warning(parsed.warnings.join('；') || '还是没能解析成功');
    return false;
  }

  preview.content = formatGeneratedFieldsPreview(
    parsed.data.title,
    parsed.data.summary,
    parsed.data.tags,
    parsed.data.fields,
    preview.tableId,
  );
  preview.fields = fieldsForTable(parsed.data.fields, preview.tableId);
  preview.raw = parsed.raw;
  preview.summary = parsed.data.summary;
  preview.tags = parsed.data.tags;
  preview.title = parsed.data.title;
  preview.warnings = parsed.warnings;
  toastr.success('已按原始输出重新解析');
  return true;
}

function profileKindFromFailedDraft(draft: FailedGenerationDraft) {
  const kind = draft.context.kind;
  return profileKindOptions.some(option => option.id === kind) ? (kind as ProfileKind) : generationDraft.kind;
}

function profileTableIdFromFailedDraft(draft: FailedGenerationDraft) {
  const tableId = typeof draft.context.tableId === 'string' ? draft.context.tableId : '';
  return profiles.getTable(tableId)?.id || profiles.getDefaultTable(profileKindFromFailedDraft(draft))?.id || '';
}

async function removeFailedDraft(draftId: string) {
  const shouldDelete = await phone.confirmNotice('要删除这条解析失败草稿吗？原始输出也会一并移除。', {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!shouldDelete) return;
  profiles.deleteFailedDraft(draftId);
  failedDraftRawOutput.value = '';
  if (route.value.page === 'failed-draft') phone.replacePage('root', '资料表');
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

  const parsed = parseProfileXmlResult(rawOutput);
  if (!parsed.ok) {
    profiles.updateFailedDraft(draft.id, {
      rawOutput,
      warnings: parsed.warnings,
    });
    failedDraftRawOutput.value = rawOutput;
    toastr.warning(parsed.warnings.join('；') || '还是没能解析成功');
    return;
  }

  profiles.updateFailedDraft(draft.id, {
    rawOutput: parsed.raw,
    warnings: parsed.warnings,
  });
  generationState.preview = {
    content: formatGeneratedFieldsPreview(
      parsed.data.title,
      parsed.data.summary,
      parsed.data.tags,
      parsed.data.fields,
      profileTableIdFromFailedDraft(draft),
    ),
    draftId: null,
    fields: fieldsForTable(parsed.data.fields, profileTableIdFromFailedDraft(draft)),
    kind: profileKindFromFailedDraft(draft),
    raw: parsed.raw,
    source: { label: draft.source.label },
    summary: parsed.data.summary,
    tags: parsed.data.tags,
    tableId: profileTableIdFromFailedDraft(draft),
    title: parsed.data.title,
    warnings: parsed.warnings,
  };
  persistProfilesPreviewDraft();
  profiles.deleteFailedDraft(draft.id);
  failedDraftRawOutput.value = '';
  phone.replacePage('preview', '资料预览');
}

function stopGeneration() {
  if (!generationState.generationId) return;
  stopGenerationByIdSafe(generationState.generationId);
  generationState.running = false;
  generationState.error = '生成已停止';
}
</script>

<style scoped>
.pc-profiles-app,
.pc-profiles-page {
  min-height: 100%;
}

.pc-profiles-app {
  height: 100%;
  min-height: 0;
}

.pc-profiles-page {
  display: grid;
  align-content: start;
  gap: 14px;
}

.pc-profiles-detail-page {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
}

.pc-profiles-toolbar,
.pc-profile-table-wrap,
.pc-profile-list,
.pc-profile-display-format {
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  background: var(--pc-surface);
}

.pc-profiles-toolbar {
  display: grid;
  gap: 10px;
  padding: 10px;
}

.pc-profile-context-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.pc-profile-table-switcher {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.pc-profile-table-switcher > i {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--pc-theme-accent) 14%, var(--pc-surface) 86%);
  color: var(--pc-theme-accent);
}

.pc-profile-table-switcher :deep(.pc-combobox) {
  min-width: 0;
}

.pc-profiles-toolbar > .pc-search-field {
  width: 100%;
}

.pc-profiles-toolbar-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-profile-view-toggle {
  flex: 0 0 auto;
}

.pc-profile-view-toggle .pc-segment-btn {
  width: 40px;
  min-width: 40px;
  padding-inline: 0;
}

.pc-profile-primary-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
}

.pc-profile-table-wrap {
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
}

.pc-profile-list {
  display: grid;
  overflow: hidden;
}

.pc-profile-list-row {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  border: 0;
  border-bottom: 1px solid var(--pc-border);
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
  font: inherit;
  padding: 12px;
  text-align: left;
}

.pc-profile-list-row:last-child {
  border-bottom: 0;
}

.pc-profile-list-row:hover {
  background: color-mix(in srgb, var(--pc-theme-accent) 8%, transparent);
}

.pc-profile-list-icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--pc-theme-accent) 12%, var(--pc-surface) 88%);
  color: var(--pc-theme-accent);
}

.pc-profile-list-main {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.pc-profile-list-main strong,
.pc-profile-list-main small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-profile-list-main small,
.pc-profile-list-arrow {
  color: var(--pc-muted);
}

.pc-profile-list-tags {
  display: flex;
  gap: 4px;
  min-width: 0;
  overflow: hidden;
}

.pc-profile-list-main em {
  display: inline-block;
  width: max-content;
  max-width: 96px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pc-theme-accent) 13%, var(--pc-surface) 87%);
  color: var(--pc-theme-accent);
  font-size: 11px;
  font-style: normal;
  font-weight: 800;
  line-height: 20px;
  padding: 0 7px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-profile-table {
  display: grid;
  width: max(100%, var(--pc-profile-table-min-width, 0px));
  min-width: var(--pc-profile-table-min-width, 0px);
}

.pc-profile-table-header,
.pc-profile-table-row {
  display: grid;
  grid-template-columns: var(--pc-profile-grid-template, minmax(0, 1fr));
  min-width: 0;
}

.pc-profile-table-header {
  position: sticky;
  top: 0;
  z-index: 1;
  border-bottom: 1px solid var(--pc-border);
  background: color-mix(in srgb, var(--pc-surface-strong) 88%, var(--pc-theme-accent) 12%);
  overflow: hidden;
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 800;
}

.pc-profile-table-header span,
.pc-profile-table-row span {
  min-width: 0;
  padding: 12px;
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-profile-table-row {
  position: relative;
  border: 0;
  border-bottom: 1px solid var(--pc-border);
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
  font: inherit;
}

.pc-profile-table-row:last-child {
  border-bottom: 0;
}

.pc-profile-table-row:hover {
  background: color-mix(in srgb, var(--pc-theme-accent) 8%, transparent);
}

.pc-profile-table-row:active {
  background: color-mix(in srgb, var(--pc-theme-accent) 14%, transparent);
}

.pc-profile-table-row span:first-child {
  font-weight: 800;
}

.pc-profile-table-favorite {
  position: absolute;
  top: 50%;
  right: 8px;
  color: var(--pc-danger);
  transform: translateY(-50%);
}

.pc-profile-table-cell.is-status {
  color: var(--pc-muted);
}

.pc-profile-status-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin: 0 5px 1px 0;
  border-radius: 50%;
  background: var(--pc-theme-accent);
}

.pc-profile-table-cell em,
.pc-profile-detail-fields em {
  display: inline-block;
  max-width: 92px;
  margin: -2px 4px -2px 0;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pc-theme-accent) 13%, var(--pc-surface) 87%);
  color: var(--pc-theme-accent);
  font-size: 11px;
  font-style: normal;
  font-weight: 800;
  line-height: 20px;
  padding: 0 7px;
  text-overflow: ellipsis;
  vertical-align: middle;
  white-space: nowrap;
}

.pc-profile-empty-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}

.pc-profile-clear-search {
  margin-top: 12px;
}

.pc-profile-table-manager,
.pc-profile-table-editor,
.pc-profile-column-list,
.pc-profile-display-format,
.pc-profile-fields-editor {
  display: grid;
  gap: 10px;
}

.pc-profile-table-manager-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pc-profile-table-manager-head h2 {
  margin: 4px 0 0;
  font-size: 18px;
}

.pc-profile-table-manager-row {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  cursor: pointer;
  padding: 12px;
  text-align: left;
}

.pc-profile-table-manager-icon {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--pc-theme-accent) 12%, var(--pc-surface) 88%);
  color: var(--pc-theme-accent);
}

.pc-profile-table-manager-row span {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.pc-profile-table-manager-row small {
  color: var(--pc-muted);
}

.pc-profile-column-row {
  position: relative;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  min-height: 56px;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  background: var(--pc-surface-strong);
  padding: 9px 10px;
}

.pc-profile-column-row.drop-before::before {
  position: absolute;
  z-index: 2;
  top: -7px;
  right: 8px;
  left: 8px;
  height: 3px;
  border-radius: 2px;
  background: var(--pc-theme-accent);
  content: '';
}

.pc-profile-column-row.dragging {
  opacity: 0.55;
}

.pc-profile-column-row.disabled {
  color: var(--pc-muted);
}

.pc-profile-column-drag-handle {
  width: 34px;
  min-width: 34px;
  height: 34px;
  color: var(--pc-muted);
  touch-action: none;
}

.pc-profile-column-main {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  padding: 8px 0;
  text-align: left;
}

.pc-profile-column-main strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-profile-column-main span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--pc-muted);
}

.pc-profile-fields-editor {
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  background: var(--pc-surface);
  padding: 10px;
}

.pc-profile-fields-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pc-profile-fields-head > span {
  display: inline-flex;
  align-items: baseline;
  gap: 7px;
}

.pc-profile-fields-head small {
  color: var(--pc-muted);
}

.pc-profile-display-format {
  padding: 12px;
}

.pc-profile-display-format > summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
  list-style: none;
}

.pc-profile-display-format > summary::-webkit-details-marker {
  display: none;
}

.pc-profile-display-format > summary > span {
  display: grid;
  gap: 3px;
}

.pc-profile-display-format > summary small {
  color: var(--pc-muted);
}

.pc-profile-display-format > summary > i {
  color: var(--pc-muted);
  transition: transform 160ms ease;
}

.pc-profile-display-format[open] > summary > i {
  transform: rotate(180deg);
}

.pc-profile-display-format-body {
  display: grid;
  gap: 10px;
  padding-top: 12px;
}

.pc-profile-summary {
  color: var(--pc-muted);
  margin: 0 0 14px;
  line-height: 1.65;
}

.pc-profile-detail-archive .pc-detail-title-row {
  padding-bottom: 12px;
  border-bottom: 1px solid var(--pc-border);
}

.pc-profile-detail-archive .pc-kicker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.pc-profile-detail-fields {
  display: grid;
  grid-template-columns: minmax(84px, 0.55fr) minmax(0, 1fr);
  gap: 0;
  margin: 0 0 14px;
  border-top: 1px solid var(--pc-border);
  border-left: 1px solid var(--pc-border);
}

.pc-profile-detail-fields dt,
.pc-profile-detail-fields dd {
  min-width: 0;
  margin: 0;
  border-right: 1px solid var(--pc-border);
  border-bottom: 1px solid var(--pc-border);
  padding: 10px;
}

.pc-profile-detail-fields dt {
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 800;
}

.pc-profile-detail-fields dd {
  overflow-wrap: anywhere;
}

.pc-profile-detail-fields dd.is-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.pc-profiles-detail-page .pc-detail-card {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  flex-direction: column;
}

.pc-profiles-detail-page .pc-detail-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

.pc-profile-area {
  min-height: 260px;
}

.pc-raw-area {
  min-height: 180px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}
</style>
