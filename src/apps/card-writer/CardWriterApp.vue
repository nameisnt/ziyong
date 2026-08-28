<template>
  <section class="pc-card-writer-app">
    <section v-if="route.page === 'root'" class="pc-card-writer-page">
      <div class="pc-card-writer-task-row">
        <div class="pc-field-group">
          <label class="pc-field-label">
            本次任务
            <InfoHint :text="selectedTask.description" />
          </label>
          <SearchableCombobox
            :model-value="taskId"
            :options="taskOptions"
            input-label="选择写卡任务"
            placeholder="选择写卡任务"
            toggle-title="展开写卡任务"
            @update:model-value="taskId = $event as CardWriterTaskId"
          />
        </div>
        <button
          class="pc-icon-btn"
          type="button"
          aria-label="查看已保存成品"
          title="查看已保存成品"
          @click="openLibrary"
        >
          <i class="fa-solid fa-box-archive"></i>
        </button>
      </div>

      <PreviewDraftNotice
        :draft="writerPreviewDraft"
        @discard="discardWriterPreviewDraft"
        @open="openWriterPreviewDraft"
        @open-id="openWriterPreviewDraft"
      />

      <GenerationPanel
        :error="generationError"
        :from-start-end="generationDraft.fromStartEnd"
        :generate-disabled="generateDisabled"
        :range-text="generationDraft.rangeText"
        :raw-output="rawOutput"
        :recent-count="generationDraft.recentCount"
        :references="references"
        requirement-label="写卡要求"
        requirement-placeholder="填写角色、世界或 NPC 的设定；也可以主要使用所选聊天楼层。"
        :running="running"
        :show-preset-selector="false"
        :show-prompt-capture="false"
        :show-requirement-field="taskId !== 'full-card'"
        :single-message-id="generationDraft.singleMessageId"
        :source-mode="activeSourceMode"
        :user-requirement="generationDraft.userRequirement"
        @cancel="resetGeneration"
        @generate="runWriter"
        @stop="stopWriter"
        @update:from-start-end="generationDraft.fromStartEnd = $event"
        @update:range-text="generationDraft.rangeText = $event"
        @update:recent-count="generationDraft.recentCount = $event"
        @update:references="references = $event"
        @update:single-message-id="generationDraft.singleMessageId = $event"
        @update:source-mode="activeSourceMode = $event"
        @update:user-requirement="generationDraft.userRequirement = $event"
      >
        <template #before-fields>
          <div v-if="taskId === 'persona'" class="pc-field-group">
            <label class="pc-field-label">人设模式</label>
            <div class="pc-card-writer-persona-modes">
              <button
                :class="['pc-segment-btn', { active: personaMode === 'normal' }]"
                type="button"
                @click="personaMode = 'normal'"
              >
                普通调色盘
              </button>
              <button
                :class="['pc-segment-btn', { active: personaMode === 'multistage' }]"
                type="button"
                @click="personaMode = 'multistage'"
              >
                多阶段调色盘
              </button>
            </div>
          </div>

          <div class="pc-card-writer-worldbook">
            <div>
              <strong>
                使用世界书素材
                <InfoHint text="把当前聊天生效且已启用的世界书条目加入生成上下文；不会决定成品是否写入世界书。" />
              </strong>
            </div>
            <label class="pc-toggle" :title="includeWorldbook ? '不使用世界书素材' : '使用世界书素材'">
              <input v-model="includeWorldbook" type="checkbox" aria-label="使用世界书素材" />
              <span aria-hidden="true"></span>
            </label>
          </div>

          <div class="pc-field-group">
            <label class="pc-field-label">
              写入世界书（可选）
              <InfoHint text="保存成品时直接新增为世界书条目；不选择则只保存到写卡成品库。" />
            </label>
            <div class="pc-card-writer-worldbook-select">
              <SearchableCombobox
                allow-custom
                empty-label="没有匹配的世界书，可直接输入新名称"
                input-label="选择或输入目标世界书"
                :model-value="targetWorldbookName"
                :options="worldbookOptions"
                placeholder="选择或输入世界书名称"
                toggle-title="展开世界书列表"
                @update:model-value="targetWorldbookName = $event"
              />
              <button
                class="pc-icon-btn"
                type="button"
                aria-label="刷新世界书列表"
                title="刷新世界书列表"
                @click="refreshWorldbooks"
              >
                <i class="fa-solid fa-rotate"></i>
              </button>
            </div>
          </div>
        </template>

        <template #before-requirement="{ disabled }">
          <section v-if="taskId === 'full-card'" class="pc-card-writer-brief" aria-label="一键写卡需求">
            <header class="pc-card-writer-brief-head">
              <div>
                <strong>
                  一键写卡需求
                  <InfoHint
                    :text="
                      fullCardMode === 'blank'
                        ? '核心点子必填，其余内容可以留空交给 AI 补全。'
                        : '主角必填；按剧情写卡至少还要选择聊天楼层、引用或世界书中的一种素材。'
                    "
                  />
                </strong>
              </div>
              <button class="pc-soft-btn compact" type="button" :disabled="disabled" @click="fillBriefExample">
                填入示例
              </button>
            </header>

            <div class="pc-card-writer-full-modes" role="tablist" aria-label="一键写卡模式">
              <button
                :class="['pc-segment-btn', { active: fullCardMode === 'blank' }]"
                type="button"
                role="tab"
                :aria-selected="fullCardMode === 'blank'"
                :disabled="disabled"
                @click="fullCardMode = 'blank'"
              >
                空白卡
              </button>
              <button
                :class="['pc-segment-btn', { active: fullCardMode === 'plot' }]"
                type="button"
                role="tab"
                :aria-selected="fullCardMode === 'plot'"
                :disabled="disabled"
                @click="fullCardMode = 'plot'"
              >
                按剧情写卡
              </button>
            </div>

            <template v-if="fullCardMode === 'blank'">
              <div class="pc-card-writer-question">
                <label class="pc-field-group">
                  <strong><span>01</span>角色最核心的点子是什么？</strong>
                  <textarea
                    v-model="brief.concept"
                    class="pc-area compact"
                    :disabled="disabled"
                    placeholder="例如：表面温柔可靠，实际上很怕被抛下的狐妖医生。"
                  ></textarea>
                </label>
              </div>

              <div class="pc-card-writer-question">
                <label class="pc-field-group">
                  <strong><span>02</span>角色和玩家是什么关系？</strong>
                  <input
                    v-model="brief.relationship"
                    class="pc-field"
                    :disabled="disabled"
                    placeholder="例如：刚签订契约的御主、重逢旧友"
                  />
                </label>
              </div>

              <div class="pc-card-writer-question">
                <div class="pc-field-group">
                  <strong><span>03</span>希望聊天时有什么感觉？</strong>
                  <div class="pc-card-writer-experience-options">
                    <button
                      v-for="option in experienceOptions"
                      :key="option"
                      :class="['pc-soft-btn', 'compact', { active: brief.experience === option }]"
                      type="button"
                      :disabled="disabled"
                      @click="brief.experience = option"
                    >
                      {{ option }}
                    </button>
                  </div>
                  <textarea
                    v-model="brief.experience"
                    class="pc-area compact"
                    :disabled="disabled"
                    placeholder="例如：前期互相试探，熟悉后嘴硬心软。"
                  ></textarea>
                </div>
              </div>

              <div class="pc-card-writer-world-setting">
                <strong>
                  故事发生在哪里？
                  <InfoHint text="默认由 AI 自动安排，也可以指定已有作品或自定义世界。" />
                </strong>
                <div class="pc-card-writer-world-modes">
                  <button
                    v-for="option in worldModeOptions"
                    :key="option.value"
                    :class="['pc-segment-btn', { active: brief.worldMode === option.value }]"
                    type="button"
                    :disabled="disabled"
                    @click="brief.worldMode = option.value"
                  >
                    {{ option.label }}
                  </button>
                </div>
                <textarea
                  v-if="brief.worldMode !== 'auto'"
                  v-model="brief.worldHint"
                  class="pc-area compact"
                  :disabled="disabled"
                  :placeholder="brief.worldMode === 'existing' ? '例如：FGO 第七特异点' : '写下一句话世界设定'"
                ></textarea>
              </div>
            </template>

            <template v-else>
              <div class="pc-card-writer-question">
                <label class="pc-field-group">
                  <strong><span>01</span>主角是谁？</strong>
                  <input
                    v-model="plotBrief.protagonists"
                    class="pc-field"
                    :disabled="disabled"
                    placeholder="输入姓名，用空格或逗号分开；也可只填数量，如 2"
                  />
                </label>
                <small v-if="protagonistInputError" class="pc-card-writer-field-error">{{
                  protagonistInputError
                }}</small>
              </div>
              <div class="pc-card-writer-question">
                <label class="pc-field-group">
                  <strong><span>02</span>需要哪些 NPC？</strong>
                  <input
                    v-model="plotBrief.npcs"
                    class="pc-field"
                    :disabled="disabled"
                    placeholder="可留空；输入姓名列表或只填数量，如 3"
                  />
                </label>
                <small v-if="npcInputError" class="pc-card-writer-field-error">{{ npcInputError }}</small>
              </div>
              <div class="pc-card-writer-question">
                <label class="pc-field-group">
                  <strong><span>03</span>剧情与写卡要求</strong>
                  <textarea
                    v-model="plotBrief.requirement"
                    class="pc-area compact"
                    :disabled="disabled"
                    placeholder="说明当前剧情、角色经历、关系进展，以及希望生成的方向。"
                  ></textarea>
                </label>
              </div>
            </template>
          </section>
        </template>

        <template #after-references="{ disabled }">
          <div class="pc-card-writer-option-row">
            <strong>
              使用助手预填
              <InfoHint
                text="在用户任务后追加一条 assistant 开头。默认关闭；仅在确认当前模型需要预填时开启，部分模型可能拒绝预填或误判任务。"
              />
            </strong>
            <label class="pc-toggle" :title="writerSettings.assistantPrefillEnabled ? '关闭助手预填' : '开启助手预填'">
              <input
                v-model="writerSettings.assistantPrefillEnabled"
                type="checkbox"
                aria-label="使用助手预填"
                :disabled="disabled"
              />
              <span aria-hidden="true"></span>
            </label>
          </div>
        </template>

        <template v-if="running || stageStates.length" #after-requirement>
          <section class="pc-section-card pc-card-writer-progress">
            <header>
              <strong>生成进度</strong>
              <span>{{ completedStageCount }}/{{ stageStates.length }}</span>
            </header>
            <div class="pc-card-writer-stage-list">
              <div v-for="stage in stageStates" :key="stage.id" :class="['pc-card-writer-stage', stage.status]">
                <i :class="stageIcon(stage.status)"></i>
                <span
                  >{{ stage.label }}<small v-if="stage.error">{{ stage.error }}</small></span
                >
              </div>
            </div>
          </section>
        </template>
      </GenerationPanel>
    </section>

    <section v-else-if="route.page === 'preview'" class="pc-card-writer-page pc-card-writer-preview-page">
      <nav v-if="previewStages.length > 1" class="pc-card-writer-preview-stages" aria-label="生成阶段">
        <button
          v-for="stage in previewStages"
          :key="stage.id"
          :class="['pc-segment-btn', stage.status, { active: activePreviewStageId === stage.id }]"
          type="button"
          :title="stage.error || stage.label"
          @click="activePreviewStageId = stage.id"
        >
          <i :class="stageIcon(stage.status)"></i>
          <span>{{ stage.label }}</span>
        </button>
      </nav>
      <GenerationPreviewPanel
        :key="activePreviewStage?.id || 'preview'"
        :content="activePreviewStage?.content || ''"
        :raw="activePreviewStage?.raw || ''"
        :editable="true"
        copy-enabled
        :raw-editable="true"
        :save-disabled="savingPreview || running"
        :scan-enabled="true"
        :short-content-guard="false"
        :source-label="preview.sourceLabel"
        :text-provider-summary="preview.providerSummary"
        :title="activePreviewStage?.label || preview.title"
        :warnings="activePreviewWarnings"
        :save-label="previewSaveLabel"
        :reparse-handler="reparseActiveStage"
        :reasoning="activePreviewStage?.reasoning || ''"
        reasoning-editable
        @update:content="updateActiveStageContent"
        @update:raw="updateActiveStageRaw"
        @update:reasoning="updateActiveStageReasoning"
        @save="savePreview"
      />
    </section>

    <section v-else-if="route.page === 'library'" class="pc-card-writer-page">
      <header class="pc-directory-toolbar pc-card-writer-head">
        <span class="pc-directory-count">{{ filteredDocuments.length }}/{{ documents.length }} 个成品</span>
        <SearchableCombobox
          class="pc-card-writer-chat-filter"
          input-label="筛选来源聊天"
          :model-value="libraryChatFilter"
          :options="libraryChatOptions"
          placeholder="全部聊天"
          toggle-title="展开来源聊天筛选"
          @update:model-value="libraryChatFilter = $event"
        />
        <button
          class="pc-icon-btn"
          type="button"
          :class="{ active: documentBulkMode }"
          :disabled="!filteredDocuments.length"
          aria-label="批量删除写卡成品"
          title="批量删除写卡成品"
          @click="documentBulkMode ? cancelDocumentBulk() : startDocumentBulk()"
        >
          <i class="fa-solid fa-list-check"></i>
        </button>
      </header>
      <BulkSelectionBar
        v-if="documentBulkMode"
        :all-selected="allDocumentsSelected"
        :selected-count="selectedDocumentIds.length"
        :total-count="filteredDocuments.length"
        @cancel="cancelDocumentBulk"
        @remove="deleteSelectedDocuments"
        @toggle-all="toggleAllDocuments"
      />
      <div v-if="filteredDocuments.length" class="pc-directory-list pc-card-writer-library">
        <article v-for="document in filteredDocuments" :key="document.id" class="pc-list-row pc-card-writer-document">
          <BulkSelectionCheckbox
            v-if="documentBulkMode"
            :model-value="selectedDocumentIdSet.has(document.id)"
            :label="`选择 ${document.title}`"
            @update:model-value="setDocumentSelected(document.id, $event)"
          />
          <button
            type="button"
            class="pc-card-writer-document-open"
            @click="
              documentBulkMode
                ? setDocumentSelected(document.id, !selectedDocumentIdSet.has(document.id))
                : openDocument(document)
            "
          >
            <strong :title="document.title">{{ document.title }}</strong>
            <small :title="formatDocumentMeta(document)">{{ formatDocumentMeta(document) }}</small>
          </button>
          <button
            v-if="!documentBulkMode"
            class="pc-icon-btn"
            type="button"
            aria-label="复制成品"
            title="复制成品"
            @click="copyDocument(document)"
          >
            <i class="fa-solid fa-copy"></i>
          </button>
          <button
            v-if="!documentBulkMode"
            class="pc-icon-btn"
            type="button"
            aria-label="导入资料表"
            title="导入资料表"
            @click="openProfileImport(document)"
          >
            <i class="fa-solid fa-table-list"></i>
          </button>
          <button
            v-if="!documentBulkMode"
            class="pc-icon-btn danger"
            type="button"
            aria-label="删除成品"
            title="删除成品"
            @click="deleteDocument(document)"
          >
            <i class="fa-solid fa-trash"></i>
          </button>
        </article>
      </div>
      <EmptyState v-else :title="documents.length ? '当前筛选下没有写卡成品' : '还没有保存写卡成品'" />
    </section>

    <section v-else-if="route.page === 'profile-import'" class="pc-card-writer-page">
      <article class="pc-section-card pc-card-writer-import-summary">
        <div>
          <span class="pc-kicker">
            导入目标
            <InfoHint text="成品按 XML 标签拆分。世界观区域、详情和事件会成为独立资料；同名人物的基础与性格会合并。" />
          </span>
          <strong>{{ phone.viewingScopeMeta.ownerName }} / {{ phone.viewingScopeMeta.chatTitle }}</strong>
          <small>只会写入上方聊天的资料表，不会改动写卡成品或创建聊天文件。</small>
        </div>
      </article>

      <div class="pc-field-group">
        <label class="pc-field-label">遇到相同来源资料</label>
        <div class="pc-card-writer-conflict-modes">
          <button
            v-for="option in importConflictOptions"
            :key="option.value"
            :class="['pc-segment-btn', { active: importConflictMode === option.value }]"
            type="button"
            @click="importConflictMode = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <p v-if="profileImportError" class="pc-card-writer-import-error">{{ profileImportError }}</p>

      <div v-if="profileImportItems.length" class="pc-directory-list pc-card-writer-import-list">
        <article v-for="item in profileImportItems" :key="item.candidate.sourceKey" class="pc-list-row">
          <input v-model="item.selected" type="checkbox" :aria-label="`选择 ${item.candidate.title}`" />
          <span class="pc-card-writer-import-copy">
            <strong>{{ item.candidate.title }}</strong>
            <small>{{ profileKindLabel(item.candidate.kind) }} · &lt;{{ item.candidate.tagName }}&gt;</small>
          </span>
          <span v-if="findImportConflict(item)" class="pc-card-writer-import-conflict">已存在</span>
          <SearchableCombobox
            class="pc-card-writer-import-mapping"
            input-label="目标资料表"
            :model-value="item.sheetKey"
            :options="profileTableOptions"
            placeholder="选择资料表"
            @update:model-value="onImportTableChange(item, $event)"
          />
        </article>
      </div>
      <EmptyState
        v-else
        title="没有识别到可导入的 XML 标签"
        description="请在成品中使用世界观、角色基础、性格或 NPC 标签。"
      />

      <div class="pc-form-actions">
        <button class="pc-soft-btn" type="button" :disabled="!profileImportItems.length" @click="toggleAllImportItems">
          {{ allImportItemsSelected ? '取消全选' : '全选' }}
        </button>
        <button class="pc-primary-btn" type="button" :disabled="!selectedImportCount" @click="importSelectedProfiles">
          导入 {{ selectedImportCount }} 项
        </button>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import BulkSelectionBar from '@/components/BulkSelectionBar.vue';
import BulkSelectionCheckbox from '@/components/BulkSelectionCheckbox.vue';
import EmptyState from '@/components/EmptyState.vue';
import GenerationPanel from '@/components/GenerationPanel.vue';
import GenerationPreviewPanel from '@/components/GenerationPreviewPanel.vue';
import InfoHint from '@/components/InfoHint.vue';
import PreviewDraftNotice from '@/components/PreviewDraftNotice.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { createExternalProfilesRepository } from '@/apps/profiles/externalCrud';
import { readExternalProfileTables, type ExternalProfileTable } from '@/apps/profiles/externalBridge';
import { useSingleGenerationTaskSession } from '@/composables/useSingleGenerationTaskSession';
import { useBulkSelection } from '@/composables/useBulkSelection';
import { usePreviewSession } from '@/composables/usePreviewSession';
import { generateOrderedPromptContent, type RawOrderedPrompt } from '@/core/generationService';
import {
  appendWorldbookEntries,
  getAllWorldbookNames,
  getCurrentWorldbookGroups,
  getWorldbookEntries,
  type WorldbookEntryDraft,
} from '@/apps/worldbook-link/api';
import { usePhoneStore } from '@/store/phone';
import { usePreviewDraftStore } from '@/store/previewDrafts';
import { useSettingsStore } from '@/store/settings';
import { useGenerationAliasesStore } from '@/store/generationAliases';
import { getCurrentChatScopeKey, parseChatScopeKey } from '@/store/chatScoped';
import { replaceGenerationAliases } from '@/util/generationAliases';
import { buildSourceSelection, type SummaryGenerationSourceMode } from '@/util/generationSource';
import type { GenerationReferenceItem } from '@/util/references';
import { getChatMessagesSafe, getOptionalGlobalFunction, getOptionalGlobalValue } from '@/util/runtime';
import {
  buildCardWriterOrderedPrompts,
  buildFullCardStages,
  CARD_WRITER_TASKS,
  getCardWriterTaskStages,
  parseCardWriterArtifact,
  type CardWriterTaskId,
  type CardWriterStage,
  type FullCardMode,
} from './preset';
import { formatCardWriterDocumentChat, isCardWriterDocumentFromScope } from './references';
import { useCardWriterStore, type CardWriterDocument, type CardWriterStageResult } from './store';
import {
  parseCardWriterProfileCandidates,
  type CardWriterImportCandidate,
  type CardWriterProfileKind,
} from './profileImport';
import { storeToRefs } from 'pinia';

type StageState = CardWriterStageResult;

type PersonaMode = 'multistage' | 'normal';
type WorldMode = 'auto' | 'custom' | 'existing';

interface CardWriterPreviewState {
  content: string;
  providerSummary: string;
  raw: string;
  sourceLabel: string;
  sourceOwnerLabel: string;
  sourceScopeKey: string;
  taskId: CardWriterTaskId;
  taskLabel: string;
  targetWorldbookName: string;
  title: string;
  warnings: string[];
  worldbookIncluded: boolean;
  worldbookWritten: boolean;
}

interface CardWriterPreviewDraftPayload {
  activePreviewStageId: string;
  definitions: CardWriterStage[];
  preview: CardWriterPreviewState;
  stages: StageState[];
}

const phone = usePhoneStore();
const settingsStore = useSettingsStore();
const generationAliases = useGenerationAliasesStore();
const writerStore = useCardWriterStore();
const profileRepository = createExternalProfilesRepository();
const previewDraftStore = usePreviewDraftStore();
const generationSession = useSingleGenerationTaskSession({
  actionId: 'generate-sequence',
  appId: 'card-writer',
  sourcePage: 'root',
  title: '写卡工坊 · 多阶段生成',
});
const { settings } = storeToRefs(settingsStore);
const { documents, settings: writerSettings } = storeToRefs(writerStore);
const route = computed(() => phone.currentRoute);
const currentChatScopeKey = computed(() => phone.currentTavernScopeKey || getCurrentChatScopeKey());
const taskId = ref<CardWriterTaskId>('full-card');
const personaMode = ref<PersonaMode>('normal');
const fullCardMode = ref<FullCardMode>('blank');
const includeWorldbook = ref(false);
const targetWorldbookName = ref('');
const worldbookOptions = ref<Array<{ group?: string; label: string; value: string }>>([]);
const references = ref<GenerationReferenceItem[]>([]);
const savingPreview = ref(false);
const generationFormError = ref('');
const running = generationSession.running;
const rawOutput = generationSession.rawOutput;
const generationError = computed(() => generationFormError.value || generationSession.error.value);
const stageStates = ref<StageState[]>([]);
const activeStageDefinitions = ref<CardWriterStage[]>([]);
const activePreviewStageId = ref('');
const writerPreviewDraftId = ref('');
const activeDocumentId = ref('');
const libraryChatFilter = ref('__all__');
const importDocumentId = ref('');
const importConflictMode = ref<'copy' | 'skip' | 'update'>('update');
type CardWriterProfileImportItem = { candidate: CardWriterImportCandidate; selected: boolean; sheetKey: string };
const profileImportItems = ref<CardWriterProfileImportItem[]>([]);
const profileImportTables = ref<ExternalProfileTable[]>([]);
const profileImportError = ref('');
const importConflictOptions = [
  { label: '更新', value: 'update' as const },
  { label: '建副本', value: 'copy' as const },
  { label: '跳过', value: 'skip' as const },
];
const brief = reactive({
  concept: '',
  experience: '',
  relationship: '',
  worldHint: '',
  worldMode: 'auto' as WorldMode,
});
const plotBrief = reactive({
  npcs: '',
  protagonists: '',
  requirement: '',
});
const generationDraft = reactive({
  fromStartEnd: 20,
  rangeText: '',
  recentCount: 20,
  singleMessageId: 0,
  userRequirement: '',
});
const preview = reactive<CardWriterPreviewState>({
  content: '',
  providerSummary: '酒馆当前 API',
  raw: '',
  sourceLabel: '',
  sourceOwnerLabel: '',
  sourceScopeKey: '',
  taskId: 'full-card' as CardWriterTaskId,
  taskLabel: '一键写卡',
  targetWorldbookName: '',
  title: '',
  warnings: [] as string[],
  worldbookIncluded: false,
  worldbookWritten: false,
});
const savedPreviewBaseline = ref<{ content: string; raw: string } | null>(null);

const experienceOptions = ['温柔陪伴', '欢喜冤家', '危险拉扯', '冒险搭档', '慢热治愈'];
const worldModeOptions: Array<{ label: string; value: WorldMode }> = [
  { label: '自动安排', value: 'auto' },
  { label: '已有世界', value: 'existing' },
  { label: '自定义', value: 'custom' },
];

const taskOptions = CARD_WRITER_TASKS.map(task => ({
  label: task.label,
  value: task.id,
}));
const selectedTask = computed(() => CARD_WRITER_TASKS.find(task => task.id === taskId.value) ?? CARD_WRITER_TASKS[0]);
const parsedProtagonists = computed(() => parseActorInput(plotBrief.protagonists, '主角'));
const parsedNpcs = computed(() => parseActorInput(plotBrief.npcs, 'NPC', true));
const protagonistInputError = computed(() => parsedProtagonists.value.error);
const npcInputError = computed(() => parsedNpcs.value.error);
const selectedStages = computed(() =>
  taskId.value === 'full-card'
    ? buildFullCardStages(fullCardMode.value, parsedProtagonists.value.names, parsedNpcs.value.names)
    : getCardWriterTaskStages(selectedTask.value, personaMode.value),
);
const activeSourceMode = computed<SummaryGenerationSourceMode>({
  get: () => {
    if (taskId.value !== 'full-card') return writerSettings.value.otherTaskSourceMode;
    return fullCardMode.value === 'blank' ? writerSettings.value.blankSourceMode : writerSettings.value.plotSourceMode;
  },
  set: value => {
    if (taskId.value !== 'full-card') writerSettings.value.otherTaskSourceMode = value;
    else if (fullCardMode.value === 'blank') writerSettings.value.blankSourceMode = value;
    else writerSettings.value.plotSourceMode = value;
  },
});
const libraryChatOptions = computed(() => {
  const options: Array<{ group?: string; label: string; value: string }> = [
    { group: '范围', label: '全部聊天', value: '__all__' },
    { group: '范围', label: '当前聊天', value: '__current__' },
  ];
  const seen = new Set<string>();
  documents.value.forEach(document => {
    if (!document.sourceScopeKey || seen.has(document.sourceScopeKey)) return;
    seen.add(document.sourceScopeKey);
    options.push({
      group: '来源聊天',
      label: formatCardWriterDocumentChat(document),
      value: document.sourceScopeKey,
    });
  });
  return options;
});
const filteredDocuments = computed(() => {
  if (libraryChatFilter.value === '__all__') return documents.value;
  if (libraryChatFilter.value === '__current__') {
    return documents.value.filter(document => isCurrentChatDocument(document));
  }
  return documents.value.filter(document => document.sourceScopeKey === libraryChatFilter.value);
});
const {
  active: documentBulkMode,
  allSelected: allDocumentsSelected,
  cancel: cancelDocumentBulk,
  selectedIds: selectedDocumentIds,
  selectedIdSet: selectedDocumentIdSet,
  setSelected: setDocumentSelected,
  start: startDocumentBulk,
  toggleAll: toggleAllDocuments,
} = useBulkSelection(() => filteredDocuments.value.map(document => document.id));
const selectedImportCount = computed(() => profileImportItems.value.filter(item => item.selected).length);
const allImportItemsSelected = computed(
  () => Boolean(profileImportItems.value.length) && profileImportItems.value.every(item => item.selected),
);
const profileTableOptions = computed(() =>
  profileImportTables.value.map(table => ({
    label: table.name,
    value: table.key,
  })),
);
const completedStageCount = computed(() => stageStates.value.filter(stage => stage.status === 'completed').length);
const plotHasSource = computed(
  () => activeSourceMode.value !== 'none' || references.value.length > 0 || includeWorldbook.value,
);
const generateDisabled = computed(() => {
  if (taskId.value !== 'full-card') return false;
  if (fullCardMode.value === 'blank') return !brief.concept.trim();
  return Boolean(
    parsedProtagonists.value.error ||
    parsedNpcs.value.error ||
    !parsedProtagonists.value.names.length ||
    !plotHasSource.value,
  );
});
const previewStages = computed(() => stageStates.value);
const writerPreviewDraft = computed(() => previewDraftStore.getPreviewDraft('card-writer', 'preview'));
const activePreviewStage = computed(
  () => previewStages.value.find(stage => stage.id === activePreviewStageId.value) ?? previewStages.value[0] ?? null,
);
const activePreviewWarnings = computed(() => {
  const stage = activePreviewStage.value;
  if (!stage) return preview.warnings;
  if (stage.error) return [stage.error];
  if (stage.status === 'pending') return ['此阶段尚未生成'];
  return [];
});
const hasIncompleteStages = computed(() =>
  stageStates.value.some(stage => stage.status !== 'completed' || !stage.content.trim()),
);
const previewSaveLabel = computed(() => {
  if (hasIncompleteStages.value) return '继续生成';
  if (!preview.targetWorldbookName) return '保存成品';
  return preview.worldbookWritten ? '更新成品' : '保存并写入世界书';
});
usePreviewSession({
  appId: 'card-writer',
  getStatus: () => {
    const content = buildPreviewContent();
    const raw = buildPreviewRaw();
    if (!content.trim() && !raw.trim()) return null;
    if (!savedPreviewBaseline.value) return 'unsaved';
    return savedPreviewBaseline.value.content === content && savedPreviewBaseline.value.raw === raw ? 'saved' : 'dirty';
  },
  page: 'preview',
});

function buildPreviewContent() {
  const completed = stageStates.value.filter(stage => stage.status === 'completed' && stage.content.trim());
  if (completed.length === 1) return completed[0].content.trim();
  return completed.map(stage => `## ${stage.label}\n\n${stage.content.trim()}`).join('\n\n');
}

function buildPreviewRaw() {
  return stageStates.value
    .filter(stage => stage.raw.trim())
    .map(stage => `【${stage.label}】\n${stage.raw.trim()}`)
    .join('\n\n');
}

function updatePreviewAggregate() {
  preview.content = buildPreviewContent();
  preview.raw = buildPreviewRaw();
}

function persistWriterPreviewDraft() {
  const input = {
    appId: 'card-writer',
    page: 'preview',
    preview: {
      activePreviewStageId: activePreviewStageId.value,
      definitions: activeStageDefinitions.value.map(stage => ({
        ...stage,
        dependencyIds: stage.dependencyIds?.slice(),
        modules: stage.modules.slice(),
      })),
      preview: klona(preview),
      stages: stageStates.value.map(stage => ({ ...stage })),
    } satisfies CardWriterPreviewDraftPayload,
    routeParams: {},
    title: '写卡预览',
  };
  const saved = writerPreviewDraftId.value
    ? previewDraftStore.updatePreviewDraft(writerPreviewDraftId.value, input)
    : previewDraftStore.createPreviewDraft(input);
  if (saved) writerPreviewDraftId.value = saved.id;
}

function restoreWriterPreviewDraft(id = writerPreviewDraft.value?.id || '') {
  const draft = id ? previewDraftStore.getPreviewDraftById(id) : null;
  if (draft?.appId !== 'card-writer' || draft.page !== 'preview') return false;
  if (!draft?.preview || typeof draft.preview !== 'object') return false;
  const payload = draft.preview as Partial<CardWriterPreviewDraftPayload>;
  if (!Array.isArray(payload.stages) || !Array.isArray(payload.definitions) || !payload.preview) return false;
  stageStates.value = klona(payload.stages);
  activeStageDefinitions.value = klona(payload.definitions);
  activePreviewStageId.value = payload.activePreviewStageId || stageStates.value[0]?.id || '';
  Object.assign(preview, klona(payload.preview));
  writerPreviewDraftId.value = draft.id;
  activeDocumentId.value = '';
  savedPreviewBaseline.value = null;
  return true;
}

function clearWriterPreviewDraft() {
  if (!writerPreviewDraftId.value) return;
  previewDraftStore.deletePreviewDraft(writerPreviewDraftId.value);
  writerPreviewDraftId.value = '';
}

function openWriterPreviewDraft(id?: string) {
  if (!restoreWriterPreviewDraft(id)) return;
  phone.pushPage('preview', '写卡预览');
}

function discardWriterPreviewDraft(id?: string) {
  const draftId = id || writerPreviewDraftId.value || writerPreviewDraft.value?.id || '';
  if (!draftId) return;
  previewDraftStore.deletePreviewDraft(draftId);
  if (writerPreviewDraftId.value === draftId) writerPreviewDraftId.value = '';
}

function beginWriterPreviewDraft() {
  writerPreviewDraftId.value = '';
}

function updateActiveStageContent(value: string) {
  const stage = activePreviewStage.value;
  if (!stage) return;
  stage.content = value;
  if (value.trim()) {
    stage.status = 'completed';
    stage.error = '';
  } else {
    stage.status = 'failed';
    stage.error = `${stage.label}内容为空`;
  }
  updatePreviewAggregate();
  persistWriterPreviewDraft();
}

function updateActiveStageRaw(value: string) {
  const stage = activePreviewStage.value;
  if (!stage) return;
  stage.raw = value;
  updatePreviewAggregate();
  generationSession.setRawOutput(preview.raw);
  persistWriterPreviewDraft();
}

function updateActiveStageReasoning(value: string) {
  const stage = activePreviewStage.value;
  if (!stage) return;
  stage.reasoning = value;
  persistWriterPreviewDraft();
}

function reparseActiveStage() {
  const stage = activePreviewStage.value;
  if (!stage) return false;
  try {
    stage.content = parseCardWriterArtifact(stage.raw, stage.label);
    stage.status = 'completed';
    stage.error = '';
    updatePreviewAggregate();
    generationSession.setRawOutput(preview.raw);
    persistWriterPreviewDraft();
    toastr.success(`${stage.label}重新解析成功`);
    return true;
  } catch (error) {
    stage.status = 'failed';
    stage.error = error instanceof Error ? error.message : `${stage.label}解析失败`;
    persistWriterPreviewDraft();
    toastr.error(stage.error);
    return false;
  }
}

function markPreviewSaved() {
  savedPreviewBaseline.value = {
    content: buildPreviewContent(),
    raw: buildPreviewRaw(),
  };
}

function stageIcon(status: StageState['status']) {
  if (status === 'completed') return 'fa-solid fa-check';
  if (status === 'running') return 'fa-solid fa-spinner fa-spin';
  if (status === 'failed') return 'fa-solid fa-triangle-exclamation';
  return 'fa-regular fa-circle';
}

function parseActorInput(value: string, fallbackLabel: string, optional = false) {
  const normalized = value.trim();
  if (!normalized) return { error: optional ? '' : `请填写至少一个${fallbackLabel}`, names: [] as string[] };
  if (/^\d+$/u.test(normalized)) {
    const count = Number(normalized);
    if (count < 1 || count > 20) return { error: `${fallbackLabel}数量需为 1-20`, names: [] as string[] };
    return { error: '', names: Array.from({ length: count }, (_item, index) => `${fallbackLabel}${index + 1}`) };
  }
  const tokens = normalized
    .split(/[\s,，、]+/u)
    .map(name => name.trim())
    .filter(Boolean);
  if (tokens.some(token => /^\d+$/u.test(token))) {
    return { error: '姓名列表和数量不能混填', names: [] as string[] };
  }
  const names = [...new Set(tokens)];
  return names.length
    ? { error: '', names }
    : { error: optional ? '' : `请填写至少一个${fallbackLabel}`, names: [] as string[] };
}

function fillBriefExample() {
  if (fullCardMode.value === 'plot') {
    plotBrief.protagonists = '沈砚 苏晚';
    plotBrief.npcs = '顾医生 老管家';
    plotBrief.requirement = '两位主角在旧宅重逢，正在调查十年前的失踪案；根据已有剧情保留彼此隐瞒秘密的张力。';
    return;
  }
  brief.concept = '表面温柔从容，实际上很害怕再次失去重要之人的狐妖医生。';
  brief.relationship = '刚刚签订契约、还在互相观察的搭档';
  brief.experience = '前期礼貌试探，熟悉后嘴硬心软，亲密后展现明显保护欲。';
  brief.worldMode = 'auto';
  brief.worldHint = '';
}

function addWorldbookOptions(
  target: Array<{ group?: string; label: string; value: string }>,
  seen: Set<string>,
  names: string[],
  group: string,
) {
  names.forEach(name => {
    const normalized = name.trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    target.push({ group, label: normalized, value: normalized });
  });
}

function refreshWorldbooks() {
  try {
    const groups = getCurrentWorldbookGroups();
    const options: Array<{ group?: string; label: string; value: string }> = [];
    const seen = new Set<string>();
    addWorldbookOptions(options, seen, groups.chat, '当前聊天');
    addWorldbookOptions(options, seen, groups.character, '当前角色');
    addWorldbookOptions(options, seen, groups.additional, '附加世界书');
    addWorldbookOptions(options, seen, groups.globalEnabled, '已启用全局');
    addWorldbookOptions(options, seen, groups.globalDisabled, '其他世界书');
    addWorldbookOptions(options, seen, groups.other, '其他角色');
    addWorldbookOptions(options, seen, getAllWorldbookNames(), '其他世界书');
    worldbookOptions.value = options;
  } catch (error) {
    worldbookOptions.value = getAllWorldbookNames().map(name => ({ label: name, value: name }));
    generationFormError.value = error instanceof Error ? error.message : '读取世界书列表失败';
  }
}

function getSelectedChatMessages() {
  const visibleMessages = getChatMessagesSafe('0-{{lastMessageId}}', { hide_state: 'unhidden' });
  const source = buildSourceSelection({
    chatIdAtGeneration: String(SillyTavern.getCurrentChatId?.() || SillyTavern.chatId || ''),
    fromStartEnd: generationDraft.fromStartEnd,
    mode: activeSourceMode.value,
    rangeText: generationDraft.rangeText,
    recentCount: generationDraft.recentCount,
    scopeId: getCurrentChatScopeKey(),
    singleMessageId: generationDraft.singleMessageId,
    visibleMessages,
  });
  const selectedIds = new Set(source.selection.messageIds);
  return {
    messages: visibleMessages.filter(message => selectedIds.has(message.message_id)),
    sourceLabel: source.selection.label,
  };
}

function buildReferenceText() {
  return references.value
    .map(reference => [`【引用：${reference.title}】`, reference.content.trim()].join('\n'))
    .filter(value => value.trim())
    .join('\n\n');
}

function buildRequirementText() {
  if (taskId.value !== 'full-card') {
    return generationDraft.userRequirement.trim() || '请根据已选择的聊天、引用与世界书素材完成创作。';
  }
  if (fullCardMode.value === 'plot') {
    return [
      `主角：${parsedProtagonists.value.names.join('、')}`,
      `NPC：${parsedNpcs.value.names.join('、') || '不额外生成 NPC'}`,
      '写卡依据：优先依据选中的聊天楼层、引用和世界书还原当前剧情，不要擅自改写已经发生的事实。',
      `剧情与要求：${plotBrief.requirement.trim() || '根据所选素材提炼剧情，并补全适合继续互动的角色卡。'}`,
    ].join('\n');
  }
  const worldDescription =
    brief.worldMode === 'auto'
      ? '由 AI 自动安排适合角色发展的世界。'
      : brief.worldHint.trim() || (brief.worldMode === 'existing' ? '沿用用户指定的已有世界。' : '补全自定义世界。');
  return [
    `角色核心点子：${brief.concept.trim()}`,
    `与玩家的关系：${brief.relationship.trim() || '未指定，请安排适合展开故事的初始关系。'}`,
    `期望体验：${brief.experience.trim() || '未指定，请根据角色设定安排自然的互动氛围。'}`,
    `故事世界：${worldDescription}`,
  ].join('\n');
}

async function buildWorldbookText() {
  if (!includeWorldbook.value) return '';
  const groups = getCurrentWorldbookGroups();
  const bookNames = [...new Set([...groups.globalEnabled, ...groups.character, ...groups.additional, ...groups.chat])];
  const sections: string[] = [];
  for (const bookName of bookNames) {
    const entries = (await getWorldbookEntries(bookName)).filter(entry => entry.enabled && entry.content.trim());
    if (!entries.length) continue;
    sections.push(
      [
        `【世界书：${bookName}】`,
        ...entries.map(entry => `【${entry.name || `条目 #${entry.uid}`}】\n${entry.content}`),
      ].join('\n\n'),
    );
  }
  return sections.join('\n\n');
}

function buildStageUserInput(
  stageLabel: string,
  instruction: string,
  priorOutputs: Array<{ label: string; content: string }>,
  requirement: string,
) {
  return [
    '【小手机自动写卡任务】',
    `当前阶段：${stageLabel}`,
    instruction,
    '',
    '【用户要求】',
    requirement,
    ...(buildReferenceText() ? ['', '【其他 App 引用】', buildReferenceText()] : []),
    ...priorOutputs.flatMap(item => ['', `【已完成阶段：${item.label}】`, item.content]),
    '',
    '【自动执行约定】',
    '用户已经完成本轮信息提供。不要继续提问，不要声称调用 Write、Edit、Read 或 SetAttribute。',
    '直接生成当前阶段最终成品；用户未明确的细节只做不冲突的最小补足。',
    '最终成品必须放入 <content><artifact>...</artifact></content>，不要输出下一步建议。',
  ].join('\n');
}

function getStagePriorOutputs(stage: CardWriterStage) {
  const completed = stageStates.value.filter(item => item.status === 'completed' && item.content.trim());
  if (!stage.dependencyIds) return completed.map(item => ({ content: item.content, label: item.label }));
  const dependencyIds = new Set(stage.dependencyIds);
  return completed
    .filter(item => dependencyIds.has(item.id))
    .map(item => ({ content: item.content, label: item.label }));
}

function providerSummary(result: Awaited<ReturnType<typeof generateOrderedPromptContent>>['textProvider']) {
  return result.mode === 'external' ? `${result.profileName} · ${result.model}` : '酒馆当前 API';
}

async function runWriter() {
  if (running.value) return;
  if (generateDisabled.value) {
    generationFormError.value =
      fullCardMode.value === 'plot' && !plotHasSource.value
        ? '按剧情写卡至少需要聊天楼层、引用或世界书中的一种素材'
        : protagonistInputError.value || npcInputError.value || '请补全一键写卡的必填内容';
    return;
  }
  generationFormError.value = '';
  activeDocumentId.value = '';
  beginWriterPreviewDraft();
  const writerTask = selectedTask.value;
  const stages = selectedStages.value.map(stage => ({ ...stage, dependencyIds: stage.dependencyIds?.slice() }));
  activeStageDefinitions.value = stages;
  const sourceScopeKey = currentChatScopeKey.value || getCurrentChatScopeKey();
  const sourceOwnerLabel = getCurrentOwnerLabel(sourceScopeKey);
  stageStates.value = stages.map(stage => ({
    content: '',
    error: '',
    id: stage.id,
    label: stage.label,
    raw: '',
    reasoning: '',
    status: 'pending',
  }));
  activePreviewStageId.value = stages[0]?.id || '';

  try {
    const { messages: chatMessages, sourceLabel } = getSelectedChatMessages();
    const worldbookContent = await buildWorldbookText();
    preview.providerSummary = '酒馆当前 API';
    preview.sourceLabel = `${sourceLabel}${includeWorldbook.value ? ' · 已加入世界书' : ' · 未加入世界书'}`;
    preview.sourceOwnerLabel = sourceOwnerLabel;
    preview.sourceScopeKey = sourceScopeKey;
    preview.taskId = writerTask.id;
    preview.taskLabel = writerTask.label;
    preview.targetWorldbookName = targetWorldbookName.value.trim();
    preview.title = `${writerTask.label}成品`;
    preview.warnings = [];
    preview.worldbookIncluded = includeWorldbook.value;
    preview.worldbookWritten = false;
    persistWriterPreviewDraft();
    const task = generationSession.create({
      sourceParams: { taskId: writerTask.id },
      title: `写卡工坊 · ${writerTask.label}`,
    });
    const completed = await runStageSequence(0, chatMessages, worldbookContent, task.id);
    generationSession.complete(task.id, {
      currentLabel: completed ? '多阶段写卡已生成，等待确认' : '部分阶段失败，等待修复',
      resultPage: 'preview',
      resultState: 'preview',
      resultTitle: '写卡预览',
    });
    void phone.presentGeneratedPage('card-writer', 'preview', '写卡预览');
  } catch (error) {
    const task = generationSession.task.value;
    if (task && (task.status === 'queued' || task.status === 'running')) generationSession.fail(task.id, error);
    else generationFormError.value = error instanceof Error ? error.message : '写卡生成失败';
  }
}

async function runStageSequence(
  startIndex: number,
  chatMessages: ChatMessage[],
  worldbookContent: string,
  taskId: string,
) {
  const requirement =
    replaceGenerationAliases(buildRequirementText(), {
      charReplacement: generationAliases.charReplacement,
      userReplacement: generationAliases.userReplacement,
    }) || '';

  for (let stageIndex = startIndex; stageIndex < activeStageDefinitions.value.length; stageIndex += 1) {
    const stage = activeStageDefinitions.value[stageIndex];
    const state = stageStates.value[stageIndex];
    if (!stage || !state || state.status === 'completed') continue;
    state.status = 'running';
    state.error = '';
    activePreviewStageId.value = state.id;
    const userInput = buildStageUserInput(stage.label, stage.instruction, getStagePriorOutputs(stage), requirement);
    try {
      const messagesForStage: RawOrderedPrompt[] = buildCardWriterOrderedPrompts({
        assistantPrefillEnabled: writerSettings.value.assistantPrefillEnabled,
        chatMessages,
        modules: stage.modules,
        userInput,
        worldbookContent,
      });
      const result = await generateOrderedPromptContent({
        appId: 'card-writer',
        lifecycle: generationSession.lifecycle(taskId),
        messages: messagesForStage,
        shouldStream: settings.value.generation.stream,
        textProvider: settings.value.textProvider,
        userInput,
      });
      const stageRaw = result.rawOutput;
      state.raw = stageRaw;
      state.reasoning = result.reasoning;
      state.content = parseCardWriterArtifact(stageRaw, stage.label);
      state.status = 'completed';
      preview.providerSummary = providerSummary(result);
      updatePreviewAggregate();
      generationSession.setRawOutput(preview.raw, taskId);
      persistWriterPreviewDraft();
    } catch (error) {
      state.status = 'failed';
      state.error = error instanceof Error ? error.message : `${stage.label}生成或解析失败`;
      generationFormError.value = state.error;
      updatePreviewAggregate();
      generationSession.setRawOutput(preview.raw, taskId);
      persistWriterPreviewDraft();
      savedPreviewBaseline.value = null;
      return false;
    }
  }
  updatePreviewAggregate();
  generationSession.setRawOutput(preview.raw, taskId);
  persistWriterPreviewDraft();
  savedPreviewBaseline.value = null;
  return true;
}

function stopWriter() {
  generationSession.stop();
}

function resetGeneration() {
  if (running.value) return;
  generationFormError.value = '';
  stageStates.value = [];
  beginWriterPreviewDraft();
}

function openLibrary() {
  phone.pushPage('library', '写卡成品');
}

function openDocument(document: CardWriterDocument) {
  activeDocumentId.value = document.id;
  stageStates.value = document.stages.length
    ? document.stages.map(stage => ({ ...stage, status: stage.status === 'running' ? 'pending' : stage.status }))
    : [
        {
          content: document.content,
          error: '',
          id: 'saved-document',
          label: document.taskLabel,
          raw: document.raw || document.content,
          reasoning: '',
          status: 'completed',
        },
      ];
  activeStageDefinitions.value = [];
  activePreviewStageId.value = stageStates.value[0]?.id || '';
  preview.content = document.content;
  preview.raw = document.raw || buildPreviewRaw();
  preview.providerSummary = '已保存成品';
  preview.sourceLabel = document.sourceLabel;
  preview.sourceOwnerLabel = document.sourceOwnerLabel;
  preview.sourceScopeKey = document.sourceScopeKey;
  preview.taskId = document.taskId as CardWriterTaskId;
  preview.taskLabel = document.taskLabel;
  preview.targetWorldbookName = document.targetWorldbookName;
  preview.title = document.title;
  preview.warnings = [];
  preview.worldbookIncluded = document.worldbookIncluded;
  preview.worldbookWritten = document.worldbookWritten;
  markPreviewSaved();
  phone.pushPage('preview', '写卡预览', { documentId: document.id });
}

async function copyDocument(document: CardWriterDocument) {
  try {
    await navigator.clipboard.writeText(document.content);
    toastr.success('已复制写卡成品');
  } catch {
    toastr.warning('复制失败，请打开成品后手动选择内容');
  }
}

function profileKindLabel(kind: CardWriterProfileKind) {
  return { character: '人物', event: '事件', world: '世界观' }[kind];
}

async function openProfileImport(document: CardWriterDocument) {
  importDocumentId.value = document.id;
  const stages = document.stages.length
    ? document.stages.filter(stage => stage.status === 'completed' && stage.content.trim())
    : [{ content: document.content, id: 'saved-document', label: document.taskLabel }];
  await refreshProfileImportTables();
  const sheetKey = profileImportTables.value.length === 1 ? profileImportTables.value[0]!.key : '';
  profileImportItems.value = parseCardWriterProfileCandidates(stages).map(candidate => ({
    candidate,
    selected: true,
    sheetKey,
  }));
  profileImportError.value = '';
  phone.pushPage('profile-import', '导入资料表', { documentId: document.id });
}

function getImportTable(sheetKey: string) {
  return profileImportTables.value.find(table => table.key === sheetKey) ?? null;
}

function findImportConflict(item: CardWriterProfileImportItem) {
  const table = getImportTable(item.sheetKey);
  const titleColumn = table?.columns[0];
  if (!table || !titleColumn) return null;
  return table.rows.find(row => row.cells[titleColumn.index]?.trim() === item.candidate.title.trim()) ?? null;
}

async function refreshProfileImportTables() {
  try {
    profileImportTables.value = readExternalProfileTables();
    profileImportError.value = '';
  } catch (error) {
    profileImportError.value = error instanceof Error ? error.message : '读取外部资料失败';
  }
}

function onImportTableChange(item: CardWriterProfileImportItem, sheetKey: string) {
  item.sheetKey = sheetKey;
}

function toggleAllImportItems() {
  const selected = !allImportItemsSelected.value;
  profileImportItems.value.forEach(item => {
    item.selected = selected;
  });
}

function createCopyTitle(candidate: CardWriterImportCandidate, table: ExternalProfileTable) {
  const titleColumn = table.columns[0];
  const titles = new Set(table.rows.map(row => (titleColumn ? row.cells[titleColumn.index] : '')));
  if (!titles.has(candidate.title)) return candidate.title;
  let index = 2;
  while (titles.has(`${candidate.title}（${index}）`)) index += 1;
  return `${candidate.title}（${index}）`;
}

function candidateRowValues(candidate: CardWriterImportCandidate, table: ExternalProfileTable, title: string) {
  const titleColumn = table.columns[0];
  if (!titleColumn?.sourceLabel) throw new Error(`“${table.name}”没有可写入的标题列`);
  const columns = new Set(table.columns.map(column => column.sourceLabel).filter(Boolean));
  return {
    ...Object.fromEntries(Object.entries(candidate.fields).filter(([key]) => columns.has(key))),
    [titleColumn.sourceLabel]: title,
  };
}

async function importCandidate(item: CardWriterProfileImportItem) {
  const { candidate, sheetKey } = item;
  const table = getImportTable(sheetKey);
  if (!table) throw new Error(`“${candidate.title}”没有选择有效的资料表`);
  const conflict = findImportConflict(item);
  if (conflict && importConflictMode.value === 'skip') return 'skipped';
  if (conflict && importConflictMode.value === 'update') {
    await profileRepository.updateRow(sheetKey, conflict.index, candidateRowValues(candidate, table, candidate.title));
    return 'updated';
  }
  const title = conflict ? createCopyTitle(candidate, table) : candidate.title;
  await profileRepository.insertRow(sheetKey, candidateRowValues(candidate, table, title));
  return 'created';
}

async function importSelectedProfiles() {
  const selected = profileImportItems.value.filter(item => item.selected);
  if (selected.some(item => !item.sheetKey)) {
    toastr.warning('请为每个选中项目选择资料表');
    return;
  }
  await refreshProfileImportTables();
  if (profileImportError.value) {
    toastr.warning(profileImportError.value);
    return;
  }
  const conflictCount = selected.filter(item => findImportConflict(item)).length;
  const confirmed = await phone.confirmNotice(
    `把 ${selected.length} 项成品导入“${phone.viewingScopeMeta.ownerName} / ${phone.viewingScopeMeta.chatTitle}”的资料表吗？${
      conflictCount
        ? `其中 ${conflictCount} 项存在相同来源资料，将按“${importConflictOptions.find(item => item.value === importConflictMode)?.label}”处理。`
        : ''
    }`,
    {
      confirmLabel: '确认导入',
      kind: conflictCount && importConflictMode.value === 'update' ? 'warning' : 'info',
      title: '确认导入目标',
    },
  );
  if (!confirmed) return;
  const counts = { created: 0, skipped: 0, updated: 0 };
  try {
    for (const item of selected) {
      const result = await importCandidate(item);
      counts[result] += 1;
    }
  } catch (error) {
    const completedCount = counts.created + counts.updated + counts.skipped;
    profileImportError.value = `${error instanceof Error ? error.message : '资料导入失败'}${
      completedCount ? `；失败前已处理 ${completedCount} 项` : ''
    }`;
    toastr.warning(profileImportError.value);
    return;
  }
  const segments = [
    counts.created ? `新增 ${counts.created}` : '',
    counts.updated ? `更新 ${counts.updated}` : '',
    counts.skipped ? `跳过 ${counts.skipped}` : '',
  ].filter(Boolean);
  toastr.success(`资料表导入完成：${segments.join('，')}`);
  void phone.goBack();
}

function buildWorldbookDrafts(): WorldbookEntryDraft[] {
  const content = buildPreviewContent().trim();
  if (!content) return [];
  const headingPattern = /^##\s+(.+)$/gmu;
  const headings = [...content.matchAll(headingPattern)];
  if (!headings.length) return [{ content, name: preview.taskLabel }];
  return headings.flatMap((heading, index) => {
    const start = (heading.index ?? 0) + heading[0].length;
    const end = headings[index + 1]?.index ?? content.length;
    const section = content.slice(start, end).trim();
    return section ? [{ content: section, name: heading[1].trim() }] : [];
  });
}

function persistPreviewDocument(worldbookWritten = preview.worldbookWritten) {
  updatePreviewAggregate();
  const document = writerStore.saveDocument({
    content: preview.content,
    id: activeDocumentId.value || undefined,
    sourceLabel: preview.sourceLabel,
    sourceOwnerLabel: preview.sourceOwnerLabel,
    sourceScopeKey: preview.sourceScopeKey,
    stages: stageStates.value.map(stage => ({ ...stage })),
    targetWorldbookName: preview.targetWorldbookName,
    taskId: preview.taskId,
    taskLabel: preview.taskLabel,
    title: preview.title,
    raw: preview.raw,
    worldbookIncluded: preview.worldbookIncluded,
    worldbookWritten,
  });
  activeDocumentId.value = document.id;
  return document;
}

async function savePreview() {
  if (savingPreview.value) return;
  savingPreview.value = true;
  try {
    if (hasIncompleteStages.value) {
      const failedStage = stageStates.value.find(stage => stage.status === 'failed');
      if (failedStage) {
        activePreviewStageId.value = failedStage.id;
        await nextTick();
        if (!reparseActiveStage()) return;
      }
      const nextIndex = stageStates.value.findIndex(stage => stage.status !== 'completed');
      if (nextIndex >= 0) {
        if (!activeStageDefinitions.value.length) {
          toastr.error('已保存的旧成品缺少阶段生成信息，无法继续生成');
          return;
        }
        generationFormError.value = '';
        const { messages } = getSelectedChatMessages();
        const worldbookContent = await buildWorldbookText();
        const task = generationSession.create({
          sourcePage: 'preview',
          sourceParams: { taskId: preview.taskId },
          title: `写卡工坊 · 继续${preview.taskLabel}`,
        });
        try {
          const completed = await runStageSequence(nextIndex, messages, worldbookContent, task.id);
          generationSession.complete(task.id, {
            currentLabel: completed ? '多阶段写卡已生成，等待确认' : '部分阶段失败，等待修复',
            resultPage: 'preview',
            resultState: 'preview',
            resultTitle: '写卡预览',
          });
          void phone.presentGeneratedPage('card-writer', 'preview', '写卡预览');
        } catch (error) {
          generationSession.fail(task.id, error);
          throw error;
        }
        return;
      }
    }
    persistPreviewDocument();
    markPreviewSaved();
    if (!preview.targetWorldbookName) {
      clearWriterPreviewDraft();
      toastr.success('写卡成品已保存');
      return;
    }
    if (preview.worldbookWritten) {
      clearWriterPreviewDraft();
      toastr.success('写卡成品已更新；已写入的世界书条目不会重复新增');
      return;
    }
    const count = await appendWorldbookEntries(preview.targetWorldbookName, buildWorldbookDrafts());
    preview.worldbookWritten = true;
    persistPreviewDocument(true);
    clearWriterPreviewDraft();
    refreshWorldbooks();
    toastr.success(`已保存，并向世界书“${preview.targetWorldbookName}”写入 ${count} 个条目`);
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '写入世界书失败');
  } finally {
    savingPreview.value = false;
  }
}

async function deleteDocument(document: CardWriterDocument) {
  const confirmed = await phone.confirmNotice(`要删除写卡成品“${document.title}”吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
    title: '删除写卡成品',
  });
  if (!confirmed) return;
  writerStore.deleteDocument(document.id);
}

async function deleteSelectedDocuments() {
  const selected = documents.value.filter(document => selectedDocumentIdSet.value.has(document.id));
  if (!selected.length) return;
  const confirmed = await phone.confirmNotice(`要删除所选 ${selected.length} 个写卡成品吗？`, {
    confirmLabel: '删除所选',
    kind: 'warning',
    title: '批量删除写卡成品',
  });
  if (!confirmed) return;
  selected.forEach(document => writerStore.deleteDocument(document.id));
  cancelDocumentBulk();
  toastr.success(`已删除 ${selected.length} 个写卡成品`);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getCurrentOwnerLabel(scopeKey: string) {
  const scope = parseChatScopeKey(scopeKey);
  if (scope.kind === 'group') {
    const groups = getOptionalGlobalValue<unknown[]>('groups');
    const group = Array.isArray(groups)
      ? groups.find(item => {
          if (!item || typeof item !== 'object') return false;
          const record = item as Record<string, unknown>;
          return String(record.id ?? record.group_id ?? '') === scope.ownerId;
        })
      : null;
    if (group && typeof group === 'object') {
      const record = group as Record<string, unknown>;
      const label = String(record.name ?? record.group_name ?? '').trim();
      if (label) return label;
    }
    return '群聊';
  }
  return (
    getOptionalGlobalFunction<() => string | null | undefined>('getCurrentCharacterName')?.()?.trim() ||
    String(getOptionalGlobalValue('name1') || '').trim() ||
    (scope.ownerId === '__no_character__' ? '未知角色' : scope.ownerId)
  );
}

function isCurrentChatDocument(document: CardWriterDocument) {
  return isCardWriterDocumentFromScope(document, currentChatScopeKey.value);
}

function formatDocumentMeta(document: CardWriterDocument) {
  return `${isCurrentChatDocument(document) ? '当前 · ' : ''}${formatCardWriterDocumentChat(document)} · ${document.taskLabel} · ${formatDate(document.updatedAt)}`;
}

onMounted(() => {
  void refreshWorldbooks();
  if (route.value.page === 'preview' && !activeDocumentId.value) restoreWriterPreviewDraft();
});
</script>

<style scoped>
.pc-card-writer-app,
.pc-card-writer-page {
  min-height: 100%;
}

.pc-card-writer-page {
  display: grid;
  align-content: start;
  gap: 14px;
  padding: 14px;
}

.pc-card-writer-head,
.pc-card-writer-task-row,
.pc-card-writer-worldbook,
.pc-card-writer-option-row,
.pc-card-writer-brief-head,
.pc-card-writer-progress header,
.pc-card-writer-document {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pc-card-writer-head .pc-directory-count {
  flex: 0 0 auto;
}

.pc-card-writer-chat-filter {
  min-width: 0;
  flex: 0 1 230px;
}

.pc-card-writer-task-row {
  align-items: end;
}

.pc-card-writer-task-row > .pc-field-group {
  flex: 1;
  min-width: 0;
}

.pc-card-writer-task-row > .pc-icon-btn {
  flex: 0 0 auto;
}

.pc-card-writer-worldbook-select {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  align-items: center;
  gap: 8px;
}

.pc-card-writer-persona-modes,
.pc-card-writer-world-modes,
.pc-card-writer-full-modes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.pc-card-writer-world-modes {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.pc-card-writer-brief {
  display: grid;
  border-top: 1px solid var(--pc-border);
  border-bottom: 1px solid var(--pc-border);
}

.pc-card-writer-brief-head {
  padding: 14px 0;
}

.pc-card-writer-full-modes {
  padding-bottom: 14px;
}

.pc-card-writer-brief-head .pc-soft-btn {
  flex: 0 0 auto;
  min-width: 76px;
  white-space: nowrap;
}

.pc-card-writer-brief-head > div,
.pc-card-writer-world-setting {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.pc-card-writer-brief-head small,
.pc-card-writer-question small,
.pc-card-writer-world-setting small {
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.45;
}

.pc-card-writer-question {
  display: grid;
  gap: 8px;
  border-top: 1px solid var(--pc-border);
  padding: 14px 0;
}

.pc-card-writer-question strong {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.pc-card-writer-question strong > span {
  color: var(--pc-theme-accent);
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
}

.pc-card-writer-field-error {
  color: var(--pc-danger);
  font-size: 12px;
}

.pc-card-writer-experience-options {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 4px;
}

.pc-card-writer-experience-options .pc-soft-btn {
  min-width: 0;
  min-height: 32px;
  padding: 0 2px;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-card-writer-world-setting {
  border-top: 1px solid var(--pc-border);
  padding: 14px 0;
}

.pc-card-writer-document small {
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.45;
}

.pc-card-writer-worldbook {
  padding: 12px 0;
}

.pc-card-writer-option-row {
  padding: 10px 0;
}

.pc-card-writer-option-row > strong {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
}

.pc-card-writer-worldbook > div,
.pc-card-writer-document-open {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.pc-card-writer-progress {
  display: grid;
  gap: 10px;
}

.pc-card-writer-progress header span,
.pc-card-writer-count {
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 700;
}

.pc-card-writer-stage-list,
.pc-card-writer-library {
  display: grid;
  gap: 0;
}

.pc-card-writer-import-summary,
.pc-card-writer-import-summary > div,
.pc-card-writer-import-copy {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.pc-card-writer-import-summary {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
}

.pc-card-writer-import-summary small,
.pc-card-writer-import-copy small {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-card-writer-conflict-modes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.pc-card-writer-import-list {
  display: grid;
  gap: 0;
}

.pc-card-writer-import-list .pc-list-row {
  grid-template-columns: auto minmax(0, 1fr) auto;
}

.pc-card-writer-import-mapping {
  grid-column: 2 / -1;
  width: 100%;
}

.pc-card-writer-import-error {
  margin: 0;
  color: var(--pc-danger);
  font-size: 12px;
}

.pc-card-writer-import-conflict {
  color: var(--pc-danger);
  font-size: 11px;
  font-weight: 700;
}

.pc-card-writer-stage {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  color: var(--pc-muted);
  font-size: 13px;
}

.pc-card-writer-stage.running {
  color: var(--pc-theme-accent);
}

.pc-card-writer-stage.completed {
  color: var(--pc-text);
}

.pc-card-writer-stage.failed {
  color: var(--pc-danger);
}

.pc-card-writer-stage > span {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.pc-card-writer-stage small {
  overflow: hidden;
  color: var(--pc-danger);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-card-writer-document-open {
  flex: 1;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--pc-text);
  text-align: left;
  cursor: pointer;
}

.pc-card-writer-document-open strong,
.pc-card-writer-document-open small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-card-writer-preview-page {
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
}

.pc-card-writer-preview-stages {
  display: flex;
  min-width: 0;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.pc-card-writer-preview-stages .pc-segment-btn {
  flex: 0 0 auto;
  max-width: 190px;
}

.pc-card-writer-preview-stages .pc-segment-btn span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-card-writer-preview-stages .pc-segment-btn.failed {
  color: var(--pc-danger);
}

.pc-card-writer-preview-page :deep(.pc-generation-preview) {
  min-height: 100%;
}
</style>
