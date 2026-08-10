<template>
  <section class="pc-card-writer-app">
    <section v-if="route.page === 'root'" class="pc-card-writer-page">
      <header class="pc-card-writer-head">
        <div>
          <span class="pc-kicker">秋青子写卡预设</span>
          <h2>写卡工坊</h2>
        </div>
        <button class="pc-icon-btn" type="button" title="查看已保存成品" @click="openLibrary">
          <i class="fa-solid fa-box-archive"></i>
        </button>
      </header>

      <GenerationPanel
        :error="generationError"
        :from-start-end="generationDraft.fromStartEnd"
        :range-text="generationDraft.rangeText"
        :raw-output="rawOutput"
        :recent-count="generationDraft.recentCount"
        :references="references"
        requirement-label="写卡要求"
        requirement-placeholder="填写角色、世界或 NPC 的设定；也可以主要使用所选聊天楼层。"
        :running="running"
        :show-preset-selector="false"
        :show-prompt-capture="false"
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
          <div class="pc-field-group">
            <label class="pc-field-label">本次任务</label>
            <SearchableCombobox
              :model-value="taskId"
              :options="taskOptions"
              input-label="选择写卡任务"
              placeholder="选择写卡任务"
              toggle-title="展开写卡任务"
              @update:model-value="taskId = $event as CardWriterTaskId"
            />
            <small class="pc-card-writer-task-note">{{ selectedTask.description }}</small>
          </div>
        </template>

        <template #after-references>
          <div class="pc-card-writer-worldbook">
            <div>
              <strong>加入当前世界书</strong>
              <small>自动读取当前聊天生效且已启用的世界书条目</small>
            </div>
            <label class="pc-toggle" :title="includeWorldbook ? '不加入世界书内容' : '加入世界书内容'">
              <input v-model="includeWorldbook" type="checkbox" aria-label="加入当前世界书内容" />
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
        :raw-editable="true"
        :scan-enabled="true"
        :short-content-guard="false"
        :source-label="preview.sourceLabel"
        :text-provider-summary="preview.providerSummary"
        :title="preview.title"
        :warnings="preview.warnings"
        save-label="保存成品"
        @save="savePreview"
      />
    </section>

    <section v-else-if="route.page === 'library'" class="pc-card-writer-page">
      <header class="pc-card-writer-head">
        <div>
          <span class="pc-kicker">写卡工坊</span>
          <h2>已保存成品</h2>
        </div>
        <span class="pc-card-writer-count">{{ documents.length }}</span>
      </header>
      <div v-if="documents.length" class="pc-card-writer-library">
        <article v-for="document in documents" :key="document.id" class="pc-section-card pc-card-writer-document">
          <button type="button" class="pc-card-writer-document-open" @click="openDocument(document)">
            <strong :title="document.title">{{ document.title }}</strong>
            <small>{{ document.taskLabel }} · {{ formatDate(document.updatedAt) }}</small>
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
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { generateOrderedPromptContent, type RawOrderedPrompt } from '@/core/generationService';
import { getWorldbookEntries, getCurrentWorldbookGroups } from '@/apps/worldbook-link/api';
import { usePhoneStore } from '@/store/phone';
import { useSettingsStore } from '@/store/settings';
import { getCurrentChatScopeKey } from '@/store/chatScoped';
import { buildSourceSelection } from '@/util/generationSource';
import type { GenerationReferenceItem } from '@/util/references';
import { getChatMessagesSafe, stopGenerationByIdSafe } from '@/util/runtime';
import {
  buildCardWriterOrderedPrompts,
  CARD_WRITER_TASKS,
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

const phone = usePhoneStore();
const settingsStore = useSettingsStore();
const writerStore = useCardWriterStore();
const { settings } = storeToRefs(settingsStore);
const { documents } = storeToRefs(writerStore);
const route = computed(() => phone.currentRoute);
const taskId = ref<CardWriterTaskId>('full-card');
const includeWorldbook = ref(false);
const references = ref<GenerationReferenceItem[]>([]);
const running = ref(false);
const rawOutput = ref('');
const generationError = ref('');
const activeGenerationId = ref('');
const stageStates = ref<StageState[]>([]);
const activeDocumentId = ref('');
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
  title: '',
  warnings: [] as string[],
  worldbookIncluded: false,
});

const taskOptions = CARD_WRITER_TASKS.map(task => ({
  label: `${task.label} · ${task.description}`,
  value: task.id,
}));
const selectedTask = computed(() => CARD_WRITER_TASKS.find(task => task.id === taskId.value) ?? CARD_WRITER_TASKS[0]);
const completedStageCount = computed(() => stageStates.value.filter(stage => stage.status === 'completed').length);

function stageIcon(status: StageState['status']) {
  if (status === 'completed') return 'fa-solid fa-check';
  if (status === 'running') return 'fa-solid fa-spinner fa-spin';
  return 'fa-regular fa-circle';
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
  const requirement = generationDraft.userRequirement.trim() || '请根据已选择的聊天、引用与世界书素材完成创作。';
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
  stageStates.value = task.stages.map(stage => ({ id: stage.id, label: stage.label, status: 'pending' }));

  try {
    const { messages: chatMessages, sourceLabel } = getSelectedChatMessages();
    const worldbookContent = await buildWorldbookText();
    const completed: Array<{ label: string; content: string }> = [];
    const rawSections: string[] = [];
    let latestProviderSummary = '酒馆当前 API';

    for (const [stageIndex, stage] of task.stages.entries()) {
      stageStates.value[stageIndex].status = 'running';
      const userInput = buildStageUserInput(stage.label, stage.instruction, completed);
      const messagesForStage: RawOrderedPrompt[] = buildCardWriterOrderedPrompts({
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
    preview.title = `${task.label}成品`;
    preview.warnings = [];
    preview.worldbookIncluded = includeWorldbook.value;
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
  preview.title = document.title;
  preview.warnings = [];
  preview.worldbookIncluded = document.worldbookIncluded;
  phone.pushPage('preview', '写卡预览', { documentId: document.id });
}

function savePreview() {
  const document = writerStore.saveDocument({
    content: preview.content,
    id: activeDocumentId.value || undefined,
    sourceLabel: preview.sourceLabel,
    taskId: preview.taskId,
    taskLabel: preview.taskLabel,
    title: preview.title,
    worldbookIncluded: preview.worldbookIncluded,
  });
  activeDocumentId.value = document.id;
  toastr.success('写卡成品已保存');
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
.pc-card-writer-worldbook,
.pc-card-writer-progress header,
.pc-card-writer-document {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pc-card-writer-head h2 {
  margin: 4px 0 0;
  font-size: 22px;
}

.pc-card-writer-task-note,
.pc-card-writer-worldbook small,
.pc-card-writer-document small {
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.45;
}

.pc-card-writer-worldbook {
  padding: 12px 0;
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
  gap: 8px;
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
