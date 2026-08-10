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
        <button class="pc-icon-btn" type="button" title="查看已保存成品" @click="openLibrary">
          <i class="fa-solid fa-box-archive"></i>
        </button>
      </div>

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
        :source-mode="settings.generation.sourceMode"
        :user-requirement="generationDraft.userRequirement"
        @cancel="resetGeneration"
        @generate="runWriter"
        @stop="stopWriter"
        @update:from-start-end="generationDraft.fromStartEnd = $event"
        @update:range-text="generationDraft.rangeText = $event"
        @update:recent-count="generationDraft.recentCount = $event"
        @update:references="references = $event"
        @update:single-message-id="generationDraft.singleMessageId = $event"
        @update:source-mode="settings.generation.sourceMode = $event"
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
              <button class="pc-icon-btn" type="button" title="刷新世界书列表" @click="refreshWorldbooks">
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
                  <InfoHint text="核心点子必填，其余内容可以留空交给 AI 补全。" />
                </strong>
              </div>
              <button class="pc-soft-btn compact" type="button" :disabled="disabled" @click="fillBriefExample">
                填入示例
              </button>
            </header>

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
                <span>{{ stage.label }}</span>
              </div>
            </div>
          </section>
        </template>
      </GenerationPanel>
    </section>

    <section v-else-if="route.page === 'preview'" class="pc-card-writer-page pc-card-writer-preview-page">
      <GenerationPreviewPanel
        v-model:content="preview.content"
        v-model:raw="preview.raw"
        :editable="true"
        copy-enabled
        :raw-editable="true"
        :save-disabled="savingPreview"
        :scan-enabled="true"
        :short-content-guard="false"
        :source-label="preview.sourceLabel"
        :text-provider-summary="preview.providerSummary"
        :title="preview.title"
        :warnings="preview.warnings"
        :save-label="previewSaveLabel"
        @save="savePreview"
      />
    </section>

    <section v-else-if="route.page === 'library'" class="pc-card-writer-page">
      <header class="pc-directory-toolbar pc-card-writer-head">
        <span class="pc-directory-count">{{ documents.length }} 个成品</span>
      </header>
      <div v-if="documents.length" class="pc-directory-list pc-card-writer-library">
        <article v-for="document in documents" :key="document.id" class="pc-list-row pc-card-writer-document">
          <button type="button" class="pc-card-writer-document-open" @click="openDocument(document)">
            <strong :title="document.title">{{ document.title }}</strong>
            <small>{{ document.taskLabel }} · {{ formatDate(document.updatedAt) }}</small>
          </button>
          <button class="pc-icon-btn" type="button" title="复制成品" @click="copyDocument(document)">
            <i class="fa-solid fa-copy"></i>
          </button>
          <button class="pc-icon-btn danger" type="button" title="删除成品" @click="deleteDocument(document)">
            <i class="fa-solid fa-trash"></i>
          </button>
        </article>
      </div>
      <EmptyState v-else title="还没有保存写卡成品" />
    </section>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import GenerationPanel from '@/components/GenerationPanel.vue';
import GenerationPreviewPanel from '@/components/GenerationPreviewPanel.vue';
import InfoHint from '@/components/InfoHint.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
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
import { useSettingsStore } from '@/store/settings';
import { getCurrentChatScopeKey } from '@/store/chatScoped';
import { buildSourceSelection } from '@/util/generationSource';
import type { GenerationReferenceItem } from '@/util/references';
import { getChatMessagesSafe, stopGenerationByIdSafe } from '@/util/runtime';
import {
  buildCardWriterOrderedPrompts,
  CARD_WRITER_TASKS,
  getCardWriterTaskStages,
  parseCardWriterArtifact,
  type CardWriterTaskId,
} from './preset';
import { useCardWriterStore, type CardWriterDocument } from './store';
import { storeToRefs } from 'pinia';

type StageState = {
  id: string;
  label: string;
  status: 'completed' | 'pending' | 'running';
};

type PersonaMode = 'multistage' | 'normal';
type WorldMode = 'auto' | 'custom' | 'existing';

const phone = usePhoneStore();
const settingsStore = useSettingsStore();
const writerStore = useCardWriterStore();
const { settings } = storeToRefs(settingsStore);
const { documents, settings: writerSettings } = storeToRefs(writerStore);
const route = computed(() => phone.currentRoute);
const taskId = ref<CardWriterTaskId>('full-card');
const personaMode = ref<PersonaMode>('normal');
const includeWorldbook = ref(false);
const targetWorldbookName = ref('');
const worldbookOptions = ref<Array<{ group?: string; label: string; value: string }>>([]);
const references = ref<GenerationReferenceItem[]>([]);
const running = ref(false);
const savingPreview = ref(false);
const rawOutput = ref('');
const generationError = ref('');
const activeGenerationId = ref('');
const stageStates = ref<StageState[]>([]);
const activeDocumentId = ref('');
const brief = reactive({
  concept: '',
  experience: '',
  relationship: '',
  worldHint: '',
  worldMode: 'auto' as WorldMode,
});
const generationDraft = reactive({
  fromStartEnd: 20,
  rangeText: '',
  recentCount: 20,
  singleMessageId: 0,
  userRequirement: '',
});
const preview = reactive({
  content: '',
  providerSummary: '酒馆当前 API',
  raw: '',
  sourceLabel: '',
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
const selectedStages = computed(() => getCardWriterTaskStages(selectedTask.value, personaMode.value));
const completedStageCount = computed(() => stageStates.value.filter(stage => stage.status === 'completed').length);
const generateDisabled = computed(() => taskId.value === 'full-card' && !brief.concept.trim());
const previewSaveLabel = computed(() => {
  if (!preview.targetWorldbookName) return '保存成品';
  return preview.worldbookWritten ? '更新成品' : '保存并写入世界书';
});
usePreviewSession({
  appId: 'card-writer',
  getStatus: () => {
    if (!preview.content.trim() && !preview.raw.trim()) return null;
    if (!savedPreviewBaseline.value) return 'unsaved';
    return savedPreviewBaseline.value.content === preview.content && savedPreviewBaseline.value.raw === preview.raw
      ? 'saved'
      : 'dirty';
  },
  page: 'preview',
});

function markPreviewSaved() {
  savedPreviewBaseline.value = {
    content: preview.content,
    raw: preview.raw,
  };
}

function stageIcon(status: StageState['status']) {
  if (status === 'completed') return 'fa-solid fa-check';
  if (status === 'running') return 'fa-solid fa-spinner fa-spin';
  return 'fa-regular fa-circle';
}

function fillBriefExample() {
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
    generationError.value = error instanceof Error ? error.message : '读取世界书列表失败';
  }
}

function getSelectedChatMessages() {
  const visibleMessages = getChatMessagesSafe('0-{{lastMessageId}}', { hide_state: 'unhidden' });
  const source = buildSourceSelection({
    chatIdAtGeneration: String(SillyTavern.getCurrentChatId?.() || SillyTavern.chatId || ''),
    fromStartEnd: generationDraft.fromStartEnd,
    mode: settings.value.generation.sourceMode,
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
) {
  const requirement = buildRequirementText();
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

function providerSummary(result: Awaited<ReturnType<typeof generateOrderedPromptContent>>['textProvider']) {
  return result.mode === 'external' ? `${result.profileName} · ${result.model}` : '酒馆当前 API';
}

async function runWriter() {
  if (running.value) return;
  running.value = true;
  generationError.value = '';
  rawOutput.value = '';
  activeDocumentId.value = '';
  const task = selectedTask.value;
  const stages = selectedStages.value;
  stageStates.value = stages.map(stage => ({ id: stage.id, label: stage.label, status: 'pending' }));

  try {
    const { messages: chatMessages, sourceLabel } = getSelectedChatMessages();
    const worldbookContent = await buildWorldbookText();
    const completed: Array<{ label: string; content: string }> = [];
    const rawSections: string[] = [];
    let latestProviderSummary = '酒馆当前 API';

    for (const [stageIndex, stage] of stages.entries()) {
      stageStates.value[stageIndex].status = 'running';
      const userInput = buildStageUserInput(stage.label, stage.instruction, completed);
      const messagesForStage: RawOrderedPrompt[] = buildCardWriterOrderedPrompts({
        assistantPrefillEnabled: writerSettings.value.assistantPrefillEnabled,
        chatMessages,
        modules: stage.modules,
        userInput,
        worldbookContent,
      });
      let liveStageOutput = '';
      const result = await generateOrderedPromptContent({
        appId: 'card-writer',
        lifecycle: {
          onFinish: () => {
            activeGenerationId.value = '';
          },
          onRawOutput: output => {
            liveStageOutput = output;
            rawOutput.value = [...rawSections, `【${stage.label}】\n${output}`].join('\n\n');
          },
          onStart: generationId => {
            activeGenerationId.value = generationId;
          },
        },
        messages: messagesForStage,
        shouldStream: settings.value.generation.stream,
        textProvider: settings.value.textProvider,
        userInput,
      });
      const stageRaw = result.rawOutput || liveStageOutput;
      const artifact = parseCardWriterArtifact(stageRaw);
      if (!artifact) throw new Error(`${stage.label}没有生成可用内容`);
      rawSections.push(`【${stage.label}】\n${stageRaw}`);
      rawOutput.value = rawSections.join('\n\n');
      completed.push({ label: stage.label, content: artifact });
      latestProviderSummary = providerSummary(result);
      stageStates.value[stageIndex].status = 'completed';
    }

    preview.content =
      completed.length === 1
        ? completed[0].content
        : completed.map(item => `## ${item.label}\n\n${item.content}`).join('\n\n');
    preview.raw = rawOutput.value;
    preview.providerSummary = latestProviderSummary;
    preview.sourceLabel = `${sourceLabel}${includeWorldbook.value ? ' · 已加入世界书' : ' · 未加入世界书'}`;
    preview.taskId = task.id;
    preview.taskLabel = task.label;
    preview.targetWorldbookName = targetWorldbookName.value.trim();
    preview.title = `${task.label}成品`;
    preview.warnings = [];
    preview.worldbookIncluded = includeWorldbook.value;
    preview.worldbookWritten = false;
    savedPreviewBaseline.value = null;
    phone.pushPage('preview', '写卡预览');
  } catch (error) {
    generationError.value = error instanceof Error ? error.message : '写卡生成失败';
  } finally {
    running.value = false;
    activeGenerationId.value = '';
  }
}

function stopWriter() {
  if (activeGenerationId.value) stopGenerationByIdSafe(activeGenerationId.value);
}

function resetGeneration() {
  if (running.value) return;
  generationError.value = '';
  rawOutput.value = '';
  stageStates.value = [];
}

function openLibrary() {
  phone.pushPage('library', '写卡成品');
}

function openDocument(document: CardWriterDocument) {
  activeDocumentId.value = document.id;
  preview.content = document.content;
  preview.raw = document.content;
  preview.providerSummary = '已保存成品';
  preview.sourceLabel = document.sourceLabel;
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

function buildWorldbookDrafts(): WorldbookEntryDraft[] {
  const content = preview.content.trim();
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
  const document = writerStore.saveDocument({
    content: preview.content,
    id: activeDocumentId.value || undefined,
    sourceLabel: preview.sourceLabel,
    targetWorldbookName: preview.targetWorldbookName,
    taskId: preview.taskId,
    taskLabel: preview.taskLabel,
    title: preview.title,
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
    persistPreviewDocument();
    markPreviewSaved();
    if (!preview.targetWorldbookName) {
      toastr.success('写卡成品已保存');
      return;
    }
    if (preview.worldbookWritten) {
      toastr.success('写卡成品已更新；已写入的世界书条目不会重复新增');
      return;
    }
    const count = await appendWorldbookEntries(preview.targetWorldbookName, buildWorldbookDrafts());
    preview.worldbookWritten = true;
    persistPreviewDocument(true);
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

onMounted(refreshWorldbooks);
onBeforeUnmount(stopWriter);
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
.pc-card-writer-world-modes {
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

.pc-card-writer-experience-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.pc-card-writer-experience-options .pc-soft-btn {
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
  height: 100%;
}

.pc-card-writer-preview-page :deep(.pc-generation-preview) {
  min-height: 100%;
}
</style>
