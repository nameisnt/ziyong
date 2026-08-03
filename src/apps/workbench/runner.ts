import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import {
  generateContent,
  hasActivePhoneGeneration,
  isPhoneGenerationEvent,
  type GenerateContentOptions,
} from '@/core/generationService';
import { useDigestStore } from '@/apps/digest/store';
import { buildAvailableComfyParams } from '@/apps/comfy/generation';
import { useComfyStore } from '@/apps/comfy/store';
import { useMediaStore } from '@/apps/media/store';
import { useProfilesStore } from '@/apps/profiles/store';
import { useRelationshipStore } from '@/apps/relationship/store';
import { useDiaryStore } from '@/store/diary';
import { useExtrasStore } from '@/store/extras';
import { useForumStore } from '@/store/forum';
import { useGenerationTaskStore } from '@/store/generationTasks';
import { useLettersStore } from '@/store/letters';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import { useSummaryStore } from '@/store/summary';
import { useTheaterStore } from '@/store/theater';
import type { CharacterRef } from '@/type/diary';
import { resolveForumBoardTypePrompt } from '@/type/forum';
import { getCurrentChatScopeKey } from '@/store/chatScoped';
import { formatChatInsertTemplate } from '@/util/chatInsert';
import {
  getChatMessagesSafe,
  getGenerationIdFromEventArgs,
  getOptionalGlobalFunction,
  getOptionalGlobalValue,
  onTavernEvent,
} from '@/util/runtime';
import type {
  WorkbenchCheckpoint,
  WorkbenchPendingRun,
  WorkbenchRunSource,
  WorkbenchStep,
  WorkbenchWorkflow,
} from './store';
import { captureCurrentWorkbenchCheckpoint, captureDelayedWorkbenchCheckpoint, useWorkbenchStore } from './store';

type SupportedWorkbenchAction = {
  actionId: string;
  appId: string;
  label: string;
};

export const supportedWorkbenchActions: SupportedWorkbenchAction[] = [
  { appId: 'summary', actionId: 'generate', label: '总结' },
  { appId: 'diary', actionId: 'generate', label: '日记' },
  { appId: 'extras', actionId: 'chapter-generate', label: '番外' },
  { appId: 'forum', actionId: 'generate-thread', label: '论坛帖子' },
  { appId: 'theater', actionId: 'generate', label: '小剧场' },
  { appId: 'letters', actionId: 'generate', label: '书信' },
  { appId: 'digest', actionId: 'generate', label: '摘抄' },
  { appId: 'relationship', actionId: 'generate', label: '关系网' },
  { appId: 'profiles', actionId: 'generate', label: '资料表' },
  { appId: 'comfy', actionId: 'generate-prompt', label: 'ComfyUI 媒体' },
];

const autoBookTitle = '工作台自动生成';

function stepHasExistingContent(step: WorkbenchStep) {
  if (step.appId === 'summary') return useSummaryStore().books.some(book => book.entries.length);
  if (step.appId === 'diary') return useDiaryStore().books.some(book => book.entries.length);
  if (step.appId === 'extras') {
    return useExtrasStore().books.some(book => book.chapters.length || book.summaries.length);
  }
  if (step.appId === 'forum') return useForumStore().boards.some(board => board.threads.length);
  if (step.appId === 'theater') return useTheaterStore().entries.length > 0;
  if (step.appId === 'letters') return useLettersStore().books.some(book => book.entries.length);
  if (step.appId === 'digest') return useDigestStore().entries.length > 0;
  if (step.appId === 'relationship') {
    const relationship = useRelationshipStore();
    return relationship.data.characters.length > 0 || relationship.data.links.length > 0;
  }
  if (step.appId === 'profiles') return useProfilesStore().entries.length > 0;
  if (step.appId === 'comfy') return useMediaStore().entries.length > 0;
  return false;
}

export function getWorkbenchManualRunNotice(workflow: WorkbenchWorkflow) {
  const scopeKey = getCurrentChatScopeKey();
  const checkpoint = workflow.checkpoints[scopeKey];
  if (workflow.pendingRuns[scopeKey] || checkpoint?.hasSuccessfulRun) return '';
  const existingLabels = workflow.steps
    .filter(step => step.enabled && stepHasExistingContent(step))
    .map(step => supportedWorkbenchActions.find(action => action.appId === step.appId)?.label || step.appId);
  if (!existingLabels.length) return '';
  const eligibleCount = captureDelayedWorkbenchCheckpoint(workflow.delayAiReplies).lastAiReplyCount;
  const batchCount = Math.ceil(eligibleCount / Math.max(1, workflow.triggerAiReplies));
  return [
    `将从聊天开头按每 ${workflow.triggerAiReplies} 个 AI 回复处理${batchCount ? `，预计 ${batchCount} 批` : ''}。`,
    `以下目标已有内容：${[...new Set(existingLabels)].join('、')}。继续可能生成重复条目。`,
  ].join('\n');
}

function getCurrentCharacterName() {
  return (
    getOptionalGlobalFunction<() => string | null | undefined>('getCurrentCharacterName')?.()?.trim() ||
    String(getOptionalGlobalValue('name1') || '').trim() ||
    '角色'
  );
}

function getUserName() {
  return String(getOptionalGlobalValue('name2') || '').trim() || '用户';
}

function currentCharacterRef(): CharacterRef {
  return {
    id:
      String(
        getOptionalGlobalFunction<() => number | string | null | undefined>('getCurrentCharacterId')?.() ??
          getOptionalGlobalValue('this_chid') ??
          '',
      ).trim() || undefined,
    name: getCurrentCharacterName(),
  };
}

function ensureSummaryBook() {
  const store = useSummaryStore();
  return store.books.find(book => book.title === autoBookTitle) ?? store.createBook(autoBookTitle);
}

function ensureExtrasBook() {
  const store = useExtrasStore();
  return (
    store.books.find(book => book.title === autoBookTitle) ??
    store.createBook({ title: autoBookTitle, typeName: '工作台' })
  );
}

function parseNameList(text: string) {
  return text
    .split(/[,，、\n]/g)
    .map(item => item.trim())
    .filter(Boolean);
}

function getRecentLettersContext(bookId: string, count: number) {
  const book = useLettersStore().getBook(bookId);
  if (!book || count <= 0) return '';
  return book.entries
    .slice(0, count)
    .reverse()
    .map(entry => [`${entry.sender.name} → ${entry.receiver.name} · ${entry.title}`, entry.content].join('\n'))
    .join('\n\n');
}

function getPrompt(key: string) {
  const prompts = usePromptStore();
  return prompts.appPrompts[key] || '';
}

function getOutputFormat(outputId: string) {
  return usePromptStore().resolveOutputFormat(outputId);
}

function getExtrasPromptKey(mode: WorkbenchStep['config']['extrasChapterMode']) {
  if (mode === '新开一本书') return 'extras';
  if (mode === '重写当前章节') return 'extrasRewrite';
  return 'extrasContinue';
}

function buildStepConfig(step: WorkbenchStep) {
  const requirement = step.userRequirement.trim();
  if (step.appId === 'summary') {
    const selectedBook = step.config.summaryBookId ? useSummaryStore().getBook(step.config.summaryBookId) : null;
    return {
      appPrompt: getPrompt('summaries'),
      bookId: selectedBook?.id || ensureSummaryBook().id,
      outputFormat: getOutputFormat('summary.generate'),
      userRequirement: requirement,
    };
  }

  if (step.appId === 'diary') {
    const diary = useDiaryStore();
    const selectedBook = step.config.diaryBookId ? diary.getBook(step.config.diaryBookId) : null;
    const perspective = selectedBook?.perspective || {
      name: step.config.diaryPerspectiveName.trim() || currentCharacterRef().name,
    };
    return {
      appPrompt: getPrompt('diary'),
      bookId: selectedBook?.id || '',
      bookTitle: selectedBook?.title || step.config.diaryBookTitle.trim() || `${perspective.name}的日记`,
      occurredAt: step.config.diaryOccurredAt,
      outputFormat: getOutputFormat('diary.generate'),
      perspective,
      userRequirement: requirement,
    };
  }

  if (step.appId === 'extras') {
    const extras = useExtrasStore();
    const book = step.config.extrasBookId
      ? extras.getBook(step.config.extrasBookId) || ensureExtrasBook()
      : ensureExtrasBook();
    const targetChapter = book.chapters.at(-1) || null;
    const selectedType = step.config.extrasTypeId ? usePromptStore().getTypePrompt(step.config.extrasTypeId) : null;
    if (step.config.extrasTypeId && !selectedType && !step.config.extrasTypePrompt.trim()) {
      throw new Error('番外类型提示词已不存在，请在工作台重新选择');
    }
    const typeName = selectedType?.name || step.config.extrasTypeName.trim() || book.typeName;
    return {
      appPrompt: getPrompt(getExtrasPromptKey(step.config.extrasChapterMode)),
      bookId: book.id,
      chapterId: step.config.extrasChapterMode === '重写当前章节' ? targetChapter?.id || '' : '',
      chapterMode: step.config.extrasChapterMode,
      outputFormat: getOutputFormat('extras.chapter'),
      previousChapterContext: targetChapter ? [`上一章：${targetChapter.title}`, targetChapter.content].join('\n') : '',
      typeName,
      typePrompt: selectedType?.prompt || step.config.extrasTypePrompt,
      userRequirement: requirement,
    };
  }

  if (step.appId === 'forum') {
    const forum = useForumStore();
    const board = step.config.forumBoardId ? forum.getBoard(step.config.forumBoardId) : null;
    const selectedType = step.config.forumBoardTypeId
      ? usePromptStore().getTypePrompt(step.config.forumBoardTypeId)
      : null;
    if (step.config.forumBoardTypeId && !selectedType && !step.config.forumBoardTypePrompt.trim()) {
      throw new Error('论坛板块类型提示词已不存在，请在工作台重新选择');
    }
    return {
      appPrompt: getPrompt('forum'),
      boardTypePrompt: board
        ? resolveForumBoardTypePrompt(board)
        : selectedType?.prompt || step.config.forumBoardTypePrompt,
      boardId: board?.id || '',
      boardName: board?.name || step.config.forumBoardName.trim() || '工作台',
      boardTypeId: board?.typeId || selectedType?.id || '',
      boardTypeName:
        board?.typeName ||
        selectedType?.name ||
        step.config.forumBoardTypeName.trim() ||
        (step.config.forumBoardTypePrompt.trim() ? '自定义' : ''),
      outputFormat: getOutputFormat('forum.thread'),
      userRequirement: requirement,
    };
  }

  if (step.appId === 'theater') {
    const selectedType = step.config.theaterTypeId ? usePromptStore().getTypePrompt(step.config.theaterTypeId) : null;
    if (step.config.theaterTypeId && !selectedType && !step.config.theaterTypePrompt.trim()) {
      throw new Error('小剧场类型提示词已不存在，请在工作台重新选择');
    }
    return {
      appPrompt: getPrompt('theater'),
      outputFormat: getOutputFormat(
        step.config.theaterRenderMode === 'frontend' ? 'theater.frontend' : 'theater.markdown',
      ),
      participants: parseNameList(step.config.theaterParticipants).map(name => ({ name })),
      renderMode: step.config.theaterRenderMode,
      typeId: selectedType?.id || '',
      typeName: selectedType?.name || step.config.theaterTypeName,
      typePrompt: selectedType?.prompt || step.config.theaterTypePrompt,
      userRequirement: requirement,
    };
  }

  if (step.appId === 'letters') {
    const letters = useLettersStore();
    const selectedBook = step.config.letterBookId ? letters.getBook(step.config.letterBookId) : null;
    const sender = {
      name: step.config.letterSenderName.trim() || selectedBook?.participants[0]?.name || currentCharacterRef().name,
    };
    const receiver = {
      name: step.config.letterReceiverName.trim() || selectedBook?.participants[1]?.name || getUserName(),
    };
    return {
      appPrompt: getPrompt('letters'),
      bookId: selectedBook?.id || '',
      bookTitle:
        selectedBook?.title || step.config.letterBookTitle.trim() || `${sender.name} 与 ${receiver.name}的书信`,
      format: step.config.letterFormat,
      outputFormat: getOutputFormat('letters.generate'),
      recentLettersContext: selectedBook ? getRecentLettersContext(selectedBook.id, step.config.letterRecentCount) : '',
      receiver,
      sender,
      userRequirement: requirement,
    };
  }

  if (step.appId === 'digest') {
    return {
      appPrompt: getPrompt('digest'),
      outputFormat: getOutputFormat('digest.generate'),
      userRequirement: ['必须摘录文内原句，不要改写。', requirement].filter(Boolean).join('\n'),
    };
  }

  if (step.appId === 'relationship') {
    const relationship = useRelationshipStore();
    return {
      appPrompt: getPrompt('relationship'),
      characterNames:
        step.config.relationshipCharacterNames.trim() ||
        relationship.data.characters.map(character => character.name).join('、'),
      outputFormat: getOutputFormat('relationship.generate'),
      userRequirement: requirement,
    };
  }

  if (step.appId === 'profiles') {
    return {
      appPrompt: getPrompt('profiles'),
      kind: step.config.profileKind,
      outputFormat: getOutputFormat('profiles.generate'),
      tableId: step.config.profileTableId,
      titleHint: step.config.profileTitleHint,
      userRequirement: requirement,
    };
  }

  if (step.appId === 'comfy') {
    const comfy = useComfyStore();
    const workflow = comfy.settings.workflows.find(item => item.id === step.config.comfyWorkflowId);
    if (!workflow) {
      throw new Error('请选择有效的 ComfyUI 工作流');
    }
    comfy.setActiveWorkflow(workflow.id);
    return {
      appPrompt: getPrompt('comfy'),
      availableParams: buildAvailableComfyParams(workflow, comfy.workflowInputs),
      kind: workflow.kind,
      outputFormat: getOutputFormat('comfy.generate'),
      userRequirement: requirement,
      workflowId: workflow.id,
      workflowName: workflow.name,
    };
  }

  throw new Error(`暂不支持工作台步骤：${step.appId}/${step.actionId}`);
}

function createFailedDraft(
  step: WorkbenchStep,
  workflow: WorkbenchWorkflow,
  logId: string,
): GenerateContentOptions['createFailedDraft'] {
  return input => {
    const draftInput = {
      ...input,
      context: {
        ...input.context,
        workbenchLogId: logId,
        workflowId: workflow.id,
        workflowName: workflow.name,
      },
      appId: step.appId,
      actionId: step.actionId,
    };

    if (step.appId === 'summary') return useSummaryStore().createFailedDraft(draftInput);
    if (step.appId === 'diary') return useDiaryStore().createFailedDraft(draftInput);
    if (step.appId === 'extras') return useExtrasStore().createFailedDraft(draftInput);
    if (step.appId === 'forum') return useForumStore().createFailedDraft(draftInput);
    if (step.appId === 'theater') return useTheaterStore().createFailedDraft(draftInput);
    if (step.appId === 'letters') return useLettersStore().createFailedDraft(draftInput);
    if (step.appId === 'digest') return useDigestStore().createFailedDraft(draftInput);
    if (step.appId === 'relationship') return useRelationshipStore().createFailedDraft(draftInput);
    if (step.appId === 'profiles') return useProfilesStore().createFailedDraft(draftInput);
    if (step.appId === 'comfy') return useMediaStore().createFailedDraft(draftInput);

    throw new Error(`暂不支持工作台失败草稿：${step.appId}/${step.actionId}`);
  };
}

function deleteFailedDraft(appId: string, draftId: string) {
  if (!draftId) return;
  if (appId === 'summary') return useSummaryStore().deleteFailedDraft(draftId);
  if (appId === 'diary') return useDiaryStore().deleteFailedDraft(draftId);
  if (appId === 'extras') return useExtrasStore().deleteFailedDraft(draftId);
  if (appId === 'forum') return useForumStore().deleteFailedDraft(draftId);
  if (appId === 'theater') return useTheaterStore().deleteFailedDraft(draftId);
  if (appId === 'letters') return useLettersStore().deleteFailedDraft(draftId);
  if (appId === 'digest') return useDigestStore().deleteFailedDraft(draftId);
  if (appId === 'relationship') return useRelationshipStore().deleteFailedDraft(draftId);
  if (appId === 'profiles') return useProfilesStore().deleteFailedDraft(draftId);
  if (appId === 'comfy') return useMediaStore().deleteFailedDraft(draftId);
}

function buildGenerationOptions(
  step: WorkbenchStep,
  workflow: WorkbenchWorkflow,
  logId: string,
  source: GenerateContentOptions['source'],
  previousContent: string,
  taskId: string,
  onSaved?: (result: unknown) => void,
): GenerateContentOptions {
  const settings = useSettingsStore();
  const generationMode = step.generationMode;
  const apiMode =
    generationMode === 'custom' ? step.apiMode : generationMode === 'workflow' ? workflow.apiMode : 'inherit';
  const externalProfileId =
    generationMode === 'custom'
      ? step.externalProfileId
      : generationMode === 'workflow'
        ? workflow.externalProfileId
        : '';
  const configuredPresetName =
    generationMode === 'custom'
      ? step.tavernPresetName
      : generationMode === 'workflow'
        ? workflow.tavernPresetName
        : settings.settings.generation.tavernPresetName;
  const textProvider = (() => {
    if (apiMode === 'inherit') return settings.settings.textProvider;
    if (apiMode === 'tavern') {
      return {
        ...settings.settings.textProvider,
        mode: 'tavern' as const,
      };
    }
    const profile = settings.settings.textProvider.externalProfiles.find(item => item.id === externalProfileId);
    if (!profile) {
      throw new Error('当前步骤选择的外部 API 配置已不存在');
    }
    return {
      ...settings.settings.textProvider,
      activeExternalProfileId: profile.id,
      mode: 'external' as const,
    };
  })();
  return {
    createFailedDraft: createFailedDraft(step, workflow, logId),
    generationDefaults: {
      resultMode: 'save',
      stream: false,
      tavernPresetName: configuredPresetName,
    },
    lifecycle: {
      onFinish() {
        const tasks = useGenerationTaskStore();
        tasks.commitRawOutput(taskId);
        tasks.setActiveGeneration(taskId, '');
      },
      onRawOutput(rawOutput) {
        useGenerationTaskStore().updateRawOutput(taskId, rawOutput);
      },
      onSaved(result) {
        onSaved?.(result);
      },
      onStart(generationId) {
        useGenerationTaskStore().setActiveGeneration(taskId, generationId);
      },
    },
    rateLimitRpm: settings.settings.generation.rpmLimit,
    references: step.inputMode === 'previous' && previousContent ? `【上一步结果】\n${previousContent}` : '',
    source,
    textProvider,
  };
}

type WorkbenchRunContext = {
  checkpoint: WorkbenchCheckpoint;
  pendingRun: WorkbenchPendingRun;
  source: WorkbenchRunSource;
};

function checkpointAtAssistantCount(
  assistantMessages: ReturnType<typeof getChatMessagesSafe>,
  assistantCount: number,
): WorkbenchCheckpoint {
  return {
    hasSuccessfulRun: true,
    lastAiReplyCount: assistantCount,
    lastMessageId: assistantMessages[assistantCount - 1]?.message_id ?? 0,
    lastRunAt: new Date().toISOString(),
  };
}

function buildChunkSource(
  workflow: WorkbenchWorkflow,
  previousCheckpoint: WorkbenchCheckpoint,
  targetCheckpoint: WorkbenchCheckpoint,
  visibleMessages: ReturnType<typeof getChatMessagesSafe>,
): WorkbenchRunSource {
  if (workflow.sourceMode === 'new') {
    const start = previousCheckpoint.hasSuccessfulRun ? previousCheckpoint.lastMessageId + 1 : 0;
    if (start > targetCheckpoint.lastMessageId) {
      throw new Error('没有找到上次成功运行后的新增楼层');
    }
    return {
      mode: 'range',
      rangeText: `${start}-${targetCheckpoint.lastMessageId}`,
    };
  }

  if (workflow.sourceMode === 'all') {
    return {
      fromStartEnd: targetCheckpoint.lastMessageId,
      mode: 'fromStart',
    };
  }

  const boundedMessages = visibleMessages.filter(message => message.message_id <= targetCheckpoint.lastMessageId);
  const recentMessages = boundedMessages.slice(-workflow.recentCount);
  const firstMessageId = recentMessages[0]?.message_id;
  if (firstMessageId === undefined) {
    throw new Error('当前批次没有可用于工作台的来源楼层');
  }
  return {
    mode: 'range',
    rangeText: `${firstMessageId}-${targetCheckpoint.lastMessageId}`,
  };
}

function buildNextWorkflowRunContext(workflow: WorkbenchWorkflow, scopeKey: string, automatic: boolean) {
  const existingPendingRun = workflow.pendingRuns[scopeKey];
  if (existingPendingRun) {
    return {
      checkpoint: existingPendingRun.checkpoint,
      pendingRun: existingPendingRun,
      source: existingPendingRun.source,
    } satisfies WorkbenchRunContext;
  }

  const visibleMessages = getChatMessagesSafe('0-{{lastMessageId}}', { hide_state: 'unhidden' });
  if (!visibleMessages.length) throw new Error('当前聊天没有可用于工作台的可见楼层');
  const assistantMessages = visibleMessages.filter(
    message => message.role === 'assistant' && String(message.message || '').trim(),
  );
  const delayedTarget = captureDelayedWorkbenchCheckpoint(workflow.delayAiReplies);
  const storedCheckpoint = workflow.checkpoints[scopeKey] ?? captureCurrentWorkbenchCheckpoint();
  const previousCheckpoint =
    automatic || storedCheckpoint.hasSuccessfulRun
      ? storedCheckpoint
      : {
          hasSuccessfulRun: false,
          lastAiReplyCount: 0,
          lastMessageId: 0,
          lastRunAt: storedCheckpoint.lastRunAt,
        };
  const pendingAiReplies = delayedTarget.lastAiReplyCount - previousCheckpoint.lastAiReplyCount;
  const batchSize = Math.max(1, workflow.triggerAiReplies);
  if (pendingAiReplies <= 0) {
    throw new Error('没有找到上次成功运行后的新增楼层');
  }
  if (automatic && pendingAiReplies < batchSize) {
    throw new Error('新增 AI 回复尚未达到工作流间隔');
  }

  const targetAiReplyCount = Math.min(delayedTarget.lastAiReplyCount, previousCheckpoint.lastAiReplyCount + batchSize);
  const checkpoint = checkpointAtAssistantCount(assistantMessages, targetAiReplyCount);
  const source = buildChunkSource(workflow, previousCheckpoint, checkpoint, visibleMessages);
  const pendingRun: WorkbenchPendingRun = {
    checkpoint,
    completedSteps: {},
    createdAt: new Date().toISOString(),
    failedDraftIds: {},
    failedStepIds: [],
    source,
    steps: klona(workflow.steps.filter(step => step.enabled)),
  };
  return {
    checkpoint,
    pendingRun,
    source,
  } satisfies WorkbenchRunContext;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function serializeWorkbenchResult(data: unknown) {
  if (typeof data === 'string') return data.trim();
  if (!isRecord(data)) return String(data ?? '').trim();

  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const content = typeof data.content === 'string' ? data.content.trim() : '';
  if (content) return [title, content].filter(Boolean).join('\n');

  if (isRecord(data.fields)) {
    const summary = typeof data.summary === 'string' ? data.summary.trim() : '';
    const fields = Object.entries(data.fields)
      .map(([key, value]) => `${key}：${String(value ?? '').trim()}`)
      .filter(line => !line.endsWith('：'));
    return [title, summary, ...fields].filter(Boolean).join('\n');
  }

  const prompt = typeof data.prompt === 'string' ? data.prompt.trim() : '';
  if (prompt) return [title, prompt].filter(Boolean).join('\n');

  if (Array.isArray(data.relations)) {
    const relations = data.relations
      .filter(isRecord)
      .map(item =>
        [item.from, item.label, item.to]
          .map(value => String(value || '').trim())
          .filter(Boolean)
          .join(' → '),
      )
      .filter(Boolean);
    const characters = Array.isArray(data.characters) ? data.characters.map(String).filter(Boolean) : [];
    return [characters.length ? `人物：${characters.join('、')}` : '', ...relations].filter(Boolean).join('\n');
  }

  if (Array.isArray(data.replies)) {
    return data.replies
      .filter(isRecord)
      .map(item => `${String(item.author || '匿名')}：${String(item.content || '')}`)
      .join('\n');
  }

  return JSON.stringify(data, null, 2);
}

function formatStepInsertBlock(step: WorkbenchStep, label: string, content: string) {
  const formatted = formatChatInsertTemplate(step.formatTemplate.trim() || '{{content}}', {
    content,
    title: label,
  });
  return [`【${label}】`, formatted].join('\n');
}

function formatWorkbenchInsertBlock(workflow: WorkbenchWorkflow, blocks: string[]) {
  const content = blocks
    .map(block => block.trim())
    .filter(Boolean)
    .join('\n\n');
  const template = workflow.insertTemplate.trim() || '{{content}}';
  return { content, template };
}

export async function runWorkbenchWorkflow(
  workflow: WorkbenchWorkflow,
  options: { automatic?: boolean; taskId?: string } = {},
) {
  const workbench = useWorkbenchStore();
  const tasks = useGenerationTaskStore();
  const scopeKey = getCurrentChatScopeKey();
  let task = options.taskId ? tasks.getTask(options.taskId) : null;
  if (!task && !options.automatic) task = tasks.getWorkbenchTask(workflow.id, scopeKey);
  if (!task) {
    task = tasks.createTask({
      appId: 'workbench',
      automatic: Boolean(options.automatic),
      config: { workflowId: workflow.id },
      kind: 'workbench',
      routePage: 'root',
      title: `工作台 · ${workflow.name}`,
    });
  }
  if (task.scopeKey !== scopeKey) {
    tasks.setStatus(task.id, 'interrupted', '请先切回创建任务时的聊天，再继续运行');
    return;
  }
  if (!tasks.beginExecution(task.id)) return;
  tasks.markRunning(task.id);
  const log = workbench.createLog(workflow, scopeKey);

  try {
    if (!workflow.steps.some(step => step.enabled)) {
      throw new Error('工作流没有启用的步骤');
    }
    let batchCount = 0;
    let insertedDraftCount = 0;
    let savedCount = 0;

    while (true) {
      const activeTask = tasks.getTask(task.id);
      if (!activeTask || ['paused', 'interrupted', 'cancelled'].includes(activeTask.status)) {
        workbench.finishLog(log.id, 'paused', activeTask?.error || '任务已暂停');
        return;
      }
      if (activeTask.status === 'pause-requested') {
        tasks.setStatus(task.id, 'paused', '已在上一项完成后暂停');
        workbench.finishLog(log.id, 'paused', '已在上一项完成后暂停');
        return;
      }
      const currentWorkflow = workbench.getWorkflow(workflow.id);
      if (!currentWorkflow) throw new Error('工作流已不存在');

      let runContext: WorkbenchRunContext;
      try {
        runContext = buildNextWorkflowRunContext(currentWorkflow, scopeKey, Boolean(options.automatic));
      } catch (caughtError) {
        if (batchCount > 0 && caughtError instanceof Error && caughtError.message.includes('没有找到')) break;
        if (
          batchCount > 0 &&
          options.automatic &&
          caughtError instanceof Error &&
          caughtError.message.includes('尚未达到')
        ) {
          break;
        }
        throw caughtError;
      }

      workbench.setPendingRun(currentWorkflow.id, scopeKey, runContext.pendingRun);
      const pendingRun = runContext.pendingRun;
      const enabledSteps = pendingRun.steps.length
        ? pendingRun.steps
        : currentWorkflow.steps.filter(step => step.enabled);
      const completedBeforeRun = Object.keys(pendingRun.completedSteps).length;
      const currentProgress = Math.max(tasks.getTask(task.id)?.savedCount || 0, completedBeforeRun);
      tasks.patchTask(task.id, {
        currentJobIndex: currentProgress,
        total: Math.max(tasks.getTask(task.id)?.total || 0, currentProgress + enabledSteps.length - completedBeforeRun),
      });
      let previousContent = '';
      const failures: string[] = [];
      const insertBlocks: string[] = [];

      for (const step of enabledSteps) {
        const stepTask = tasks.getTask(task.id);
        if (!stepTask || ['paused', 'interrupted', 'cancelled'].includes(stepTask.status)) {
          workbench.finishLog(log.id, 'paused', stepTask?.error || '任务已暂停');
          return;
        }
        if (stepTask.status === 'pause-requested') {
          tasks.setStatus(task.id, 'paused', '已在上一项完成后暂停');
          workbench.finishLog(log.id, 'paused', '已在上一项完成后暂停');
          return;
        }
        const completedStep = pendingRun.completedSteps[step.id];
        if (completedStep) {
          previousContent = completedStep.content;
          if (completedStep.insertBlock) insertBlocks.push(completedStep.insertBlock);
          continue;
        }

        try {
          if (step.inputMode === 'previous' && !previousContent) {
            throw new Error('该步骤需要上一步结果，但上一步没有可用内容');
          }
          const adapter = getRegisteredPhoneGenerationAdapter(step.appId, step.actionId);
          const label =
            supportedWorkbenchActions.find(action => action.appId === step.appId && action.actionId === step.actionId)
              ?.label || step.appId;
          tasks.patchTask(task.id, {
            currentLabel: `第 ${batchCount + 1} 批 · ${label}`,
          });
          const commitSavedStep = (data: unknown) => {
            savedCount += 1;
            const latestTask = tasks.getTask(task.id);
            const recoveredFailureIndex = pendingRun.failedStepIds.indexOf(step.id);
            const recoveredFailure = recoveredFailureIndex >= 0;
            if (recoveredFailure) pendingRun.failedStepIds.splice(recoveredFailureIndex, 1);
            const recoveredDraftId = pendingRun.failedDraftIds[step.id] || '';
            if (recoveredDraftId) {
              deleteFailedDraft(step.appId, recoveredDraftId);
              delete pendingRun.failedDraftIds[step.id];
            }
            tasks.patchTask(task.id, {
              currentJobIndex: (latestTask?.currentJobIndex || 0) + 1,
              draftCount: Math.max(0, (latestTask?.draftCount || 0) - (recoveredFailure ? 1 : 0)),
              savedCount: (latestTask?.savedCount || 0) + 1,
            });
            previousContent = serializeWorkbenchResult(data);
            const insertBlock =
              step.includeInInsert && previousContent ? formatStepInsertBlock(step, label, previousContent) : '';
            if (insertBlock) insertBlocks.push(insertBlock);
            pendingRun.completedSteps[step.id] = {
              content: previousContent,
              insertBlock,
            };
            workbench.setPendingRun(currentWorkflow.id, scopeKey, pendingRun);
          };
          const result = await generateContent(
            adapter,
            buildStepConfig(step),
            buildGenerationOptions(
              step,
              currentWorkflow,
              log.id,
              runContext.source,
              previousContent,
              task.id,
              commitSavedStep,
            ),
          );
          if (result.status === 'preview') {
            throw new Error(`${step.appId}/${step.actionId}：工作台步骤意外返回预览结果`);
          }
          if (result.status === 'failed') {
            failures.push(`${step.appId}/${step.actionId}：${result.warnings.join('；') || '未保存'}`);
            const latestTask = tasks.getTask(task.id);
            const firstFailureForStep = !pendingRun.failedStepIds.includes(step.id);
            if (firstFailureForStep) pendingRun.failedStepIds.push(step.id);
            const previousDraftId = pendingRun.failedDraftIds[step.id] || '';
            if (previousDraftId && previousDraftId !== result.draft.id) {
              deleteFailedDraft(step.appId, previousDraftId);
            }
            pendingRun.failedDraftIds[step.id] = result.draft.id;
            tasks.patchTask(task.id, {
              draftCount: (latestTask?.draftCount || 0) + (firstFailureForStep ? 1 : 0),
            });
            workbench.setPendingRun(currentWorkflow.id, scopeKey, pendingRun);
            previousContent = '';
            continue;
          }
        } catch (caughtError) {
          const latestTask = tasks.getTask(task.id);
          if (!latestTask || ['paused', 'interrupted', 'cancelled'].includes(latestTask.status)) {
            workbench.finishLog(log.id, 'paused', latestTask?.error || '任务已暂停');
            return;
          }
          previousContent = '';
          failures.push(
            `${step.appId}/${step.actionId}：${caughtError instanceof Error ? caughtError.message : String(caughtError)}`,
          );
        }
      }

      if (failures.length) {
        const message = `完成 ${batchCount} 批，本次保存 ${savedCount} 项；当前批次已记住成功步骤；失败：${failures.join('；')}`;
        tasks.setStatus(task.id, 'paused', `${message}。可继续重试未完成步骤`);
        workbench.finishLog(log.id, 'paused', message);
        return;
      }

      if (currentWorkflow.insertAfterRun && insertBlocks.length) {
        const insert = formatWorkbenchInsertBlock(currentWorkflow, insertBlocks);
        workbench.createInsertDraft(currentWorkflow, scopeKey, insert);
        insertedDraftCount += 1;
      }
      workbench.setCheckpoint(currentWorkflow.id, scopeKey, {
        ...runContext.checkpoint,
        hasSuccessfulRun: true,
      });
      workbench.clearPendingRun(currentWorkflow.id, scopeKey);
      batchCount += 1;
    }

    const insertMessage = insertedDraftCount ? `，生成 ${insertedDraftCount} 条待插入草稿` : '';
    tasks.completeTask(task.id);
    workbench.finishLog(log.id, 'success', `完成 ${batchCount} 批，保存 ${savedCount} 项${insertMessage}`);
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : String(caughtError);
    const latestTask = tasks.getTask(task.id);
    if (latestTask && !['paused', 'interrupted', 'cancelled'].includes(latestTask.status)) {
      tasks.setStatus(task.id, 'paused', `${message}。进度已保留`);
    }
    workbench.finishLog(log.id, latestTask?.status === 'cancelled' ? 'failed' : 'paused', message);
  } finally {
    tasks.setActiveGeneration(task.id, '');
    tasks.endExecution(task.id);
  }
}

export async function resumeWorkbenchTask(taskId: string) {
  const tasks = useGenerationTaskStore();
  const task = tasks.getTask(taskId);
  const workflowId = typeof task?.config.workflowId === 'string' ? task.config.workflowId : '';
  const workflow = useWorkbenchStore().getWorkflow(workflowId);
  if (!task || !workflow) {
    if (task) tasks.setStatus(task.id, 'cancelled', '对应工作流已不存在');
    return;
  }
  await runWorkbenchWorkflow(workflow, { taskId });
}

export async function runDueWorkbenchWorkflows() {
  const workbench = useWorkbenchStore();
  const tasks = useGenerationTaskStore();
  const due = workbench
    .getDueWorkflows()
    .filter(workflow => !tasks.getWorkbenchTask(workflow.id)?.status.match(/paused|interrupted/));
  for (const workflow of due) {
    await runWorkbenchWorkflow(workflow, { automatic: true });
  }
}

let autoRunnerInstalled = false;
let autoRunnerTimer: ReturnType<typeof window.setTimeout> | null = null;
let autoRunnerStops: Array<ReturnType<typeof onTavernEvent>> = [];
const backgroundGenerationIds = new Set<string>();
const anonymousGenerationKinds: boolean[] = [];

function isQuietGenerationEvent(eventArgs: unknown[]) {
  const quietKeys = new Set(['dryRun', 'dry_run', 'for_ui', 'quiet', 'shouldSilence', 'should_silence']);
  const visited = new Set<object>();
  const inspect = (value: unknown, depth: number): boolean => {
    if (!value || typeof value !== 'object' || depth > 3 || visited.has(value)) return false;
    visited.add(value);
    return Object.entries(value as Record<string, unknown>).some(
      ([key, nested]) => (quietKeys.has(key) && nested === true) || inspect(nested, depth + 1),
    );
  };
  return eventArgs[2] === true || eventArgs.some(value => inspect(value, 0));
}

export function installWorkbenchAutoRunner() {
  if (autoRunnerInstalled || typeof window === 'undefined') return;

  const scheduleRun = () => {
    if (autoRunnerTimer) window.clearTimeout(autoRunnerTimer);
    autoRunnerTimer = window.setTimeout(() => {
      autoRunnerTimer = null;
      void runDueWorkbenchWorkflows();
    }, 1800);
  };

  const handleGenerationStarted = (...eventArgs: unknown[]) => {
    const isBackground =
      hasActivePhoneGeneration() || isPhoneGenerationEvent(...eventArgs) || isQuietGenerationEvent(eventArgs);
    const generationId = getGenerationIdFromEventArgs(...eventArgs);
    if (generationId) {
      if (isBackground) backgroundGenerationIds.add(generationId);
      return;
    }
    anonymousGenerationKinds.push(isBackground);
  };
  const handleGenerationEnded = (...eventArgs: unknown[]) => {
    const generationId = getGenerationIdFromEventArgs(...eventArgs);
    const hadAnonymousStart = anonymousGenerationKinds.length > 0;
    let trackedBackground = generationId
      ? backgroundGenerationIds.delete(generationId)
      : anonymousGenerationKinds.shift() === true;
    if (generationId && !trackedBackground && anonymousGenerationKinds.length) {
      trackedBackground = anonymousGenerationKinds.shift() === true;
    } else if (!generationId && !hadAnonymousStart && backgroundGenerationIds.size === 1) {
      backgroundGenerationIds.clear();
      trackedBackground = true;
    }
    const shouldIgnore =
      trackedBackground ||
      hasActivePhoneGeneration() ||
      isPhoneGenerationEvent(...eventArgs) ||
      isQuietGenerationEvent(eventArgs);
    if (!shouldIgnore) scheduleRun();
  };
  const handleMessageFallback = (...eventArgs: unknown[]) => {
    if (
      backgroundGenerationIds.size ||
      anonymousGenerationKinds.includes(true) ||
      hasActivePhoneGeneration() ||
      isPhoneGenerationEvent(...eventArgs) ||
      isQuietGenerationEvent(eventArgs)
    )
      return;
    scheduleRun();
  };

  autoRunnerStops = [
    onTavernEvent('GENERATION_STARTED', handleGenerationStarted),
    onTavernEvent('GENERATION_ENDED', handleGenerationEnded),
    onTavernEvent('MESSAGE_RECEIVED', handleMessageFallback),
    onTavernEvent('MESSAGE_SWIPED', handleMessageFallback),
    onTavernEvent('CHAT_CHANGED', scheduleRun),
  ];
  autoRunnerInstalled = true;
}

export function uninstallWorkbenchAutoRunner() {
  autoRunnerStops.forEach(handle => handle.stop());
  autoRunnerStops = [];
  backgroundGenerationIds.clear();
  anonymousGenerationKinds.length = 0;
  if (autoRunnerTimer) {
    window.clearTimeout(autoRunnerTimer);
    autoRunnerTimer = null;
  }
  autoRunnerInstalled = false;
}
