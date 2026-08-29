import { getCurrentChatScopeKey, parseChatScopeKey, useChatScopedDomain } from '@/store/chatScoped';
import { useGenerationTaskStore } from '@/store/generationTasks';
import { getChatMessagesSafe } from '@/util/runtime';
import { validateInplace } from '@/util/zod';
// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

export const workbenchField = 'sillytavern_phone_workbench';

const WorkbenchStepConfigPersistedSchema = z.object({
  diaryBookId: z.string().default(''),
  diaryBookTitle: z.string().default(''),
  diaryOccurredAt: z.string().default(''),
  diaryPerspectiveName: z.string().default(''),
  extrasBookId: z.string().default(''),
  extrasChapterMode: z.enum(['续写上一章', '新开一本书', '重写当前章节']).default('续写上一章'),
  extrasTypeId: z.string().default(''),
  extrasTypeName: z.string().default(''),
  extrasTypePrompt: z.string().default(''),
  forumBoardDescription: z.string().optional(),
  forumBoardId: z.string().default(''),
  forumBoardName: z.string().default('工作台'),
  forumBoardTypeId: z.string().default(''),
  forumBoardTypeName: z.string().default(''),
  forumBoardTypePrompt: z.string().default(''),
  letterBookId: z.string().default(''),
  letterBookTitle: z.string().default(''),
  letterFormat: z.enum(['formal', 'sms', 'email', 'note']).default('formal'),
  letterReceiverName: z.string().default(''),
  letterRecentCount: z.number().int().min(0).max(20).default(6),
  letterSenderName: z.string().default(''),
  profileSheetKey: z.string().default(''),
  profileTitleColumn: z.string().default(''),
  profileTitleHint: z.string().default(''),
  relationshipCharacterNames: z.string().default(''),
  summaryBookId: z.string().default(''),
  theaterParticipants: z.string().default(''),
  theaterRenderMode: z.enum(['markdown', 'frontend']).default('markdown'),
  theaterTypeId: z.string().default(''),
  theaterTypeName: z.string().default(''),
  theaterTypePrompt: z.string().default(''),
});
export const WorkbenchStepConfigSchema = WorkbenchStepConfigPersistedSchema.transform(
  ({ forumBoardDescription, ...config }) => ({
    ...config,
    forumBoardTypePrompt: config.forumBoardTypePrompt.trim() || forumBoardDescription?.trim() || '',
  }),
);
export type WorkbenchStepConfig = z.infer<typeof WorkbenchStepConfigSchema>;

export const WorkbenchStepSchema = z.object({
  id: z.string(),
  appId: z.string(),
  actionId: z.string(),
  apiMode: z.enum(['tavern', 'external']).default('tavern'),
  config: WorkbenchStepConfigSchema.default(() => WorkbenchStepConfigSchema.parse({})),
  enabled: z.boolean().default(true),
  externalProfileId: z.string().default(''),
  formatTemplate: z.string().default(''),
  generationMode: z.enum(['workflow', 'global', 'custom']).default('workflow'),
  includeInInsert: z.boolean().default(true),
  inputMode: z.enum(['chat', 'previous']).default('chat'),
  tavernPresetName: z.string().default(''),
  userRequirement: z.string().default(''),
});
export type WorkbenchStep = z.infer<typeof WorkbenchStepSchema>;

export const WorkbenchCheckpointSchema = z.object({
  hasSuccessfulRun: z.boolean().default(false),
  lastAiReplyCount: z.number().int().nonnegative().default(0),
  lastMessageId: z.number().int().nonnegative().default(0),
  lastRunAt: z.string().default(''),
});
export type WorkbenchCheckpoint = z.infer<typeof WorkbenchCheckpointSchema>;

export interface WorkbenchProgress {
  accumulatedAiReplies: number;
  currentAiReplies: number;
  lastRunAt: string;
  nextInAiReplies: number;
  pending: boolean;
}

export const WorkbenchRunSourceSchema = z.object({
  fromStartEnd: z.number().int().nonnegative().optional(),
  mode: z.enum(['all', 'fromStart', 'range', 'recent']),
  rangeText: z.string().optional(),
  recentCount: z.number().int().min(1).max(200).optional(),
});
export type WorkbenchRunSource = z.infer<typeof WorkbenchRunSourceSchema>;

export const WorkbenchCompletedStepSchema = z.object({
  content: z.string().default(''),
  insertBlock: z.string().default(''),
});
export type WorkbenchCompletedStep = z.infer<typeof WorkbenchCompletedStepSchema>;

export const WorkbenchPendingRunSchema = z.object({
  checkpoint: WorkbenchCheckpointSchema,
  completedSteps: z.record(z.string(), WorkbenchCompletedStepSchema).default({}),
  createdAt: z.string(),
  failedDraftIds: z.record(z.string(), z.string()).default({}),
  failedStepIds: z.array(z.string()).default([]),
  source: WorkbenchRunSourceSchema,
  steps: z.array(WorkbenchStepSchema).default([]),
});
export type WorkbenchPendingRun = z.infer<typeof WorkbenchPendingRunSchema>;

export const WorkbenchWorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  apiMode: z.enum(['inherit', 'tavern', 'external']).default('inherit'),
  externalProfileId: z.string().default(''),
  enabled: z.boolean().default(true),
  insertAfterRun: z.boolean().default(false),
  insertTemplate: z.string().default('{{content}}'),
  delayAiReplies: z.number().int().min(0).max(20).default(0),
  recentCount: z.number().int().min(1).max(200).default(20),
  sourceMode: z.enum(['new', 'recent', 'all']).default('new'),
  tavernPresetName: z.string().default(''),
  triggerAiReplies: z.number().int().positive().default(5),
  steps: z.array(WorkbenchStepSchema).default([]),
  checkpoints: z.record(z.string(), WorkbenchCheckpointSchema).default({}),
  pendingRuns: z.record(z.string(), WorkbenchPendingRunSchema).default({}),
});
export type WorkbenchWorkflow = z.infer<typeof WorkbenchWorkflowSchema>;

export const WorkbenchRunLogSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  workflowName: z.string(),
  scopeKey: z.string(),
  status: z.enum(['running', 'success', 'failed', 'paused']).default('running'),
  message: z.string().default(''),
  createdAt: z.string(),
  finishedAt: z.string().default(''),
});
export type WorkbenchRunLog = z.infer<typeof WorkbenchRunLogSchema>;

export const WorkbenchInsertDraftSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  workflowName: z.string(),
  scopeKey: z.string(),
  content: z.string(),
  template: z.string().default('{{content}}'),
  createdAt: z.string(),
});
export type WorkbenchInsertDraft = z.infer<typeof WorkbenchInsertDraftSchema>;

export const WorkbenchSettingsSchema = z.object({
  workflows: z.array(WorkbenchWorkflowSchema).default([]),
  logs: z.array(WorkbenchRunLogSchema).default([]),
  insertDrafts: z.array(WorkbenchInsertDraftSchema).default([]),
});
export type WorkbenchSettings = z.infer<typeof WorkbenchSettingsSchema>;

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function isChatScopedEnvelope(raw: unknown) {
  return Boolean(raw && typeof raw === 'object' && (raw as Record<string, unknown>).__chatScoped === true);
}

function discardLegacyGlobalWorkbenchSettings() {
  const raw = _.get(extension_settings, workbenchField);
  if (typeof raw === 'undefined' || isChatScopedEnvelope(raw)) return false;
  _.set(extension_settings, workbenchField, {
    __chatScoped: true,
    legacyScopeMigrations: {},
    scopes: {},
  });
  void saveSettingsDebounced();
  return true;
}

function getCurrentVisibleAssistantMessages() {
  return getChatMessagesSafe('0-{{lastMessageId}}', { hide_state: 'unhidden' }).filter(
    message => message.role === 'assistant' && String(message.message || '').trim(),
  );
}

function countCurrentVisibleAssistantMessages() {
  return getCurrentVisibleAssistantMessages().length;
}

function getCurrentLastVisibleMessageId() {
  return getChatMessagesSafe('0-{{lastMessageId}}', { hide_state: 'unhidden' }).reduce(
    (lastId, message) => Math.max(lastId, message.message_id),
    0,
  );
}

export function captureCurrentWorkbenchCheckpoint(): WorkbenchCheckpoint {
  return {
    hasSuccessfulRun: false,
    lastAiReplyCount: countCurrentVisibleAssistantMessages(),
    lastMessageId: getCurrentLastVisibleMessageId(),
    lastRunAt: nowIso(),
  };
}

export function captureDelayedWorkbenchCheckpoint(delayAiReplies: number): WorkbenchCheckpoint {
  const delay = Math.min(20, Math.max(0, Math.round(delayAiReplies)));
  if (!delay) return captureCurrentWorkbenchCheckpoint();
  const assistantMessages = getCurrentVisibleAssistantMessages();
  const eligibleMessages = assistantMessages.slice(0, Math.max(0, assistantMessages.length - delay));
  return {
    hasSuccessfulRun: false,
    lastAiReplyCount: eligibleMessages.length,
    lastMessageId: eligibleMessages.at(-1)?.message_id ?? 0,
    lastRunAt: nowIso(),
  };
}

export const useWorkbenchStore = defineStore('workbench', () => {
  const discardedLegacySettings = discardLegacyGlobalWorkbenchSettings();
  const chatDomain = useChatScopedDomain({
    field: workbenchField,
    schema: WorkbenchSettingsSchema,
    createDefault: () => WorkbenchSettingsSchema.parse({}),
  });
  const settings = chatDomain.data;
  const configError = chatDomain.configError;
  const rawConfig = chatDomain.rawConfig;
  const scopeKey = chatDomain.scopeKey;
  const runningWorkflowIds = ref<string[]>([]);

  if (discardedLegacySettings) {
    const generationTasks = useGenerationTaskStore();
    generationTasks.tasks.filter(task => task.kind === 'workbench').forEach(task => generationTasks.removeTask(task.id));
  }

  const workflows = computed(() => settings.value.workflows);
  const logs = computed(() => settings.value.logs);
  const insertDrafts = computed(() => settings.value.insertDrafts);
  const isRunning = computed(() => runningWorkflowIds.value.length > 0);

  function createWorkflow(name = '') {
    const currentScopeKey = scopeKey.value;
    const workflow: WorkbenchWorkflow = {
      apiMode: 'inherit',
      checkpoints: {
        [currentScopeKey]: captureCurrentWorkbenchCheckpoint(),
      },
      delayAiReplies: 0,
      enabled: true,
      externalProfileId: '',
      id: createId('workbench_workflow'),
      insertAfterRun: false,
      insertTemplate: '{{content}}',
      name: name.trim() || `工作流 ${settings.value.workflows.length + 1}`,
      pendingRuns: {},
      recentCount: 20,
      sourceMode: 'new',
      steps: [],
      tavernPresetName: '',
      triggerAiReplies: 5,
    };
    settings.value.workflows = [workflow, ...settings.value.workflows];
    return workflow;
  }

  function getCopySourceScopes() {
    return chatDomain.scopeKeys.value.flatMap(sourceScopeKey => {
      if (sourceScopeKey === scopeKey.value) return [];
      const source = chatDomain.getScopeData(sourceScopeKey);
      if (!source?.workflows.length) return [];
      const parsed = parseChatScopeKey(sourceScopeKey);
      return [
        {
          label: [parsed.ownerId, parsed.chatId].filter(Boolean).join(' / ') || sourceScopeKey,
          scopeKey: sourceScopeKey,
          workflows: source.workflows.map(workflow => ({
            id: workflow.id,
            name: workflow.name,
            stepCount: workflow.steps.length,
          })),
        },
      ];
    });
  }

  function copyWorkflowsFromScope(sourceScopeKey: string, workflowIds: string[]) {
    const source = chatDomain.getScopeData(sourceScopeKey);
    if (!source) return [];
    const selectedIds = new Set(workflowIds);
    const currentScopeKey = scopeKey.value;
    const copied = source.workflows
      .filter(workflow => selectedIds.has(workflow.id))
      .map(workflow => ({
        ...klona(workflow),
        checkpoints: { [currentScopeKey]: captureCurrentWorkbenchCheckpoint() },
        enabled: false,
        id: createId('workbench_workflow'),
        name: `${workflow.name}（副本）`,
        pendingRuns: {},
        steps: workflow.steps.map(step => ({
          ...klona(step),
          config: {
            ...klona(step.config),
            diaryBookId: '',
            diaryBookTitle: '',
            diaryOccurredAt: '',
            diaryPerspectiveName: '',
            extrasBookId: '',
            forumBoardId: '',
            forumBoardName: '工作台',
            letterBookId: '',
            letterBookTitle: '',
            letterReceiverName: '',
            letterSenderName: '',
            profileSheetKey: '',
            profileTitleColumn: '',
            profileTitleHint: '',
            relationshipCharacterNames: '',
            summaryBookId: '',
            theaterParticipants: '',
          },
          id: createId('workbench_step'),
        })),
      }));
    settings.value.workflows = [...copied, ...settings.value.workflows];
    return copied;
  }

  function updateWorkflow(
    workflowId: string,
    patch: Partial<
      Pick<
        WorkbenchWorkflow,
        | 'apiMode'
        | 'delayAiReplies'
        | 'enabled'
        | 'externalProfileId'
        | 'insertAfterRun'
        | 'insertTemplate'
        | 'name'
        | 'recentCount'
        | 'sourceMode'
        | 'tavernPresetName'
        | 'triggerAiReplies'
      >
    >,
  ) {
    settings.value.workflows = settings.value.workflows.map(workflow => {
      if (workflow.id !== workflowId) return workflow;
      return {
        ...workflow,
        ...patch,
        insertTemplate:
          typeof patch.insertTemplate === 'string'
            ? patch.insertTemplate.trim() || '{{content}}'
            : workflow.insertTemplate,
        delayAiReplies:
          typeof patch.delayAiReplies === 'number'
            ? Math.min(20, Math.max(0, Math.round(patch.delayAiReplies)))
            : workflow.delayAiReplies,
        externalProfileId:
          typeof patch.externalProfileId === 'string' ? patch.externalProfileId.trim() : workflow.externalProfileId,
        name: typeof patch.name === 'string' ? patch.name.trim() || workflow.name : workflow.name,
        recentCount:
          typeof patch.recentCount === 'number'
            ? Math.min(200, Math.max(1, Math.round(patch.recentCount)))
            : workflow.recentCount,
        tavernPresetName:
          typeof patch.tavernPresetName === 'string' ? patch.tavernPresetName.trim() : workflow.tavernPresetName,
        triggerAiReplies:
          typeof patch.triggerAiReplies === 'number'
            ? Math.min(200, Math.max(1, Math.round(patch.triggerAiReplies)))
            : workflow.triggerAiReplies,
      };
    });
  }

  function deleteWorkflow(workflowId: string) {
    settings.value.workflows = settings.value.workflows.filter(workflow => workflow.id !== workflowId);
  }

  function addStep(workflowId: string, input: Pick<WorkbenchStep, 'actionId' | 'appId'>) {
    const step: WorkbenchStep = {
      actionId: input.actionId,
      appId: input.appId,
      apiMode: 'tavern',
      config: validateInplace(WorkbenchStepConfigSchema, {}),
      enabled: true,
      externalProfileId: '',
      formatTemplate: '',
      generationMode: 'workflow',
      id: createId('workbench_step'),
      includeInInsert: true,
      inputMode: 'chat',
      tavernPresetName: '',
      userRequirement: '',
    };
    settings.value.workflows = settings.value.workflows.map(workflow =>
      workflow.id === workflowId ? { ...workflow, steps: [...workflow.steps, step] } : workflow,
    );
    return step;
  }

  function updateStep(
    workflowId: string,
    stepId: string,
    patch: Partial<
      Pick<
        WorkbenchStep,
        'config' | 'enabled' | 'formatTemplate' | 'includeInInsert' | 'inputMode' | 'userRequirement'
      > &
        Pick<WorkbenchStep, 'apiMode' | 'externalProfileId' | 'generationMode' | 'tavernPresetName'>
    >,
  ) {
    settings.value.workflows = settings.value.workflows.map(workflow => {
      if (workflow.id !== workflowId) return workflow;
      return {
        ...workflow,
        steps: workflow.steps.map(step =>
          step.id === stepId
            ? {
                ...step,
                ...patch,
                config: patch.config ? validateInplace(WorkbenchStepConfigSchema, patch.config) : step.config,
                externalProfileId:
                  typeof patch.externalProfileId === 'string' ? patch.externalProfileId.trim() : step.externalProfileId,
                formatTemplate: typeof patch.formatTemplate === 'string' ? patch.formatTemplate : step.formatTemplate,
                tavernPresetName:
                  typeof patch.tavernPresetName === 'string' ? patch.tavernPresetName.trim() : step.tavernPresetName,
                userRequirement:
                  typeof patch.userRequirement === 'string' ? patch.userRequirement : step.userRequirement,
              }
            : step,
        ),
      };
    });
  }

  function deleteStep(workflowId: string, stepId: string) {
    settings.value.workflows = settings.value.workflows.map(workflow =>
      workflow.id === workflowId ? { ...workflow, steps: workflow.steps.filter(step => step.id !== stepId) } : workflow,
    );
  }

  function moveStep(workflowId: string, stepId: string, direction: -1 | 1) {
    settings.value.workflows = settings.value.workflows.map(workflow => {
      if (workflow.id !== workflowId) return workflow;
      const index = workflow.steps.findIndex(step => step.id === stepId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= workflow.steps.length) return workflow;
      const steps = [...workflow.steps];
      [steps[index], steps[target]] = [steps[target], steps[index]];
      return { ...workflow, steps };
    });
  }

  function getWorkflow(workflowId: string) {
    return settings.value.workflows.find(workflow => workflow.id === workflowId) ?? null;
  }

  function setCheckpoint(workflowId: string, scopeKey: string, checkpoint: WorkbenchCheckpoint) {
    settings.value.workflows = settings.value.workflows.map(workflow =>
      workflow.id === workflowId
        ? {
            ...workflow,
            checkpoints: {
              ...workflow.checkpoints,
              [scopeKey]: checkpoint,
            },
          }
        : workflow,
    );
  }

  function markCurrentCheckpoint(workflowId: string, scopeKey = getCurrentChatScopeKey()) {
    setCheckpoint(workflowId, scopeKey, {
      ...captureCurrentWorkbenchCheckpoint(),
      hasSuccessfulRun: true,
    });
    clearPendingRun(workflowId, scopeKey);
  }

  function setPendingRun(workflowId: string, scopeKey: string, pendingRun: WorkbenchPendingRun) {
    settings.value.workflows = settings.value.workflows.map(workflow =>
      workflow.id === workflowId
        ? {
            ...workflow,
            pendingRuns: {
              ...workflow.pendingRuns,
              [scopeKey]: validateInplace(WorkbenchPendingRunSchema, pendingRun),
            },
          }
        : workflow,
    );
  }

  function clearPendingRun(workflowId: string, scopeKey: string) {
    settings.value.workflows = settings.value.workflows.map(workflow => {
      if (workflow.id !== workflowId || !workflow.pendingRuns[scopeKey]) return workflow;
      const pendingRuns = { ...workflow.pendingRuns };
      delete pendingRuns[scopeKey];
      return { ...workflow, pendingRuns };
    });
  }

  function createLog(workflow: WorkbenchWorkflow, scopeKey: string) {
    const log: WorkbenchRunLog = {
      createdAt: nowIso(),
      finishedAt: '',
      id: createId('workbench_log'),
      message: '正在运行',
      scopeKey,
      status: 'running',
      workflowId: workflow.id,
      workflowName: workflow.name,
    };
    settings.value.logs = [log, ...settings.value.logs].slice(0, 30);
    runningWorkflowIds.value = [...new Set([...runningWorkflowIds.value, workflow.id])];
    return log;
  }

  function finishLog(logId: string, status: 'success' | 'failed' | 'paused', message: string) {
    settings.value.logs = settings.value.logs.map(log =>
      log.id === logId
        ? {
            ...log,
            finishedAt: nowIso(),
            message,
            status,
          }
        : log,
    );
    const workflowId = settings.value.logs.find(log => log.id === logId)?.workflowId;
    if (workflowId) {
      runningWorkflowIds.value = runningWorkflowIds.value.filter(id => id !== workflowId);
    }
  }

  function clearLogs() {
    settings.value.logs = [];
  }

  function createInsertDraft(
    workflow: WorkbenchWorkflow,
    scopeKey: string,
    input: { content: string; template: string },
  ) {
    const draft: WorkbenchInsertDraft = {
      content: input.content.trim(),
      createdAt: nowIso(),
      id: createId('workbench_insert'),
      scopeKey,
      template: input.template.trim() || '{{content}}',
      workflowId: workflow.id,
      workflowName: workflow.name,
    };
    if (!draft.content) return null;
    settings.value.insertDrafts = [draft, ...settings.value.insertDrafts].slice(0, 20);
    return draft;
  }

  function deleteInsertDraft(draftId: string) {
    settings.value.insertDrafts = settings.value.insertDrafts.filter(draft => draft.id !== draftId);
  }

  function shouldRunWorkflow(workflow: WorkbenchWorkflow, scopeKey = getCurrentChatScopeKey()) {
    if (scopeKey !== chatDomain.scopeKey.value) return false;
    if (!workflow.enabled || !workflow.steps.some(step => step.enabled)) return false;
    if (runningWorkflowIds.value.includes(workflow.id)) return false;
    if (workflow.pendingRuns[scopeKey]) return true;
    const currentCheckpoint = captureCurrentWorkbenchCheckpoint();
    const eligibleCheckpoint = captureDelayedWorkbenchCheckpoint(workflow.delayAiReplies);
    const checkpoint = workflow.checkpoints[scopeKey];
    if (!checkpoint) {
      setCheckpoint(workflow.id, scopeKey, currentCheckpoint);
      return false;
    }
    if (
      currentCheckpoint.lastAiReplyCount < checkpoint.lastAiReplyCount ||
      currentCheckpoint.lastMessageId < checkpoint.lastMessageId
    ) {
      setCheckpoint(workflow.id, scopeKey, currentCheckpoint);
      return false;
    }
    return eligibleCheckpoint.lastAiReplyCount - checkpoint.lastAiReplyCount >= workflow.triggerAiReplies;
  }

  function syncCurrentScope(scopeKey = getCurrentChatScopeKey()) {
    if (scopeKey !== chatDomain.scopeKey.value) return;
    const currentCheckpoint = captureCurrentWorkbenchCheckpoint();
    settings.value.workflows = settings.value.workflows.map(workflow => {
      const checkpoint = workflow.checkpoints[scopeKey];
      if (
        checkpoint &&
        currentCheckpoint.lastAiReplyCount >= checkpoint.lastAiReplyCount &&
        currentCheckpoint.lastMessageId >= checkpoint.lastMessageId
      )
        return workflow;
      const pendingRuns = { ...workflow.pendingRuns };
      delete pendingRuns[scopeKey];
      return {
        ...workflow,
        checkpoints: {
          ...workflow.checkpoints,
          [scopeKey]: currentCheckpoint,
        },
        pendingRuns,
      };
    });
    runningWorkflowIds.value = [];
  }

  function getWorkflowProgress(workflow: WorkbenchWorkflow, scopeKey = getCurrentChatScopeKey()): WorkbenchProgress {
    const current = captureCurrentWorkbenchCheckpoint();
    const eligible = captureDelayedWorkbenchCheckpoint(workflow.delayAiReplies);
    const checkpoint = workflow.checkpoints[scopeKey];
    const accumulatedAiReplies = checkpoint ? Math.max(0, eligible.lastAiReplyCount - checkpoint.lastAiReplyCount) : 0;
    return {
      accumulatedAiReplies,
      currentAiReplies: current.lastAiReplyCount,
      lastRunAt: checkpoint?.hasSuccessfulRun ? checkpoint.lastRunAt : '',
      nextInAiReplies: Math.max(0, workflow.triggerAiReplies - accumulatedAiReplies),
      pending: Boolean(workflow.pendingRuns[scopeKey]),
    };
  }

  function getDueWorkflows(scopeKey = getCurrentChatScopeKey()) {
    if (scopeKey !== chatDomain.scopeKey.value) return [];
    return settings.value.workflows.filter(workflow => shouldRunWorkflow(workflow, scopeKey));
  }

  function rehydrateFromSettings() {
    chatDomain.rehydrateFromSettings();
    runningWorkflowIds.value = [];
  }

  function resetCorruptedSettings() {
    chatDomain.resetCurrentScope();
    runningWorkflowIds.value = [];
  }

  function resetCurrentScope() {
    chatDomain.resetCurrentScope();
    runningWorkflowIds.value = [];
  }

  function switchScope(nextScopeKey: string) {
    chatDomain.switchScope(nextScopeKey);
    runningWorkflowIds.value = [];
  }

  return {
    configError,
    addStep,
    clearLogs,
    clearPendingRun,
    copyWorkflowsFromScope,
    createLog,
    createInsertDraft,
    createWorkflow,
    deleteInsertDraft,
    deleteStep,
    deleteWorkflow,
    finishLog,
    getCopySourceScopes,
    getDueWorkflows,
    getWorkflowProgress,
    getWorkflow,
    insertDrafts,
    isRunning,
    logs,
    markCurrentCheckpoint,
    moveStep,
    rehydrateFromSettings,
    resetCorruptedSettings,
    rawConfig,
    resetCurrentScope,
    settings,
    shouldRunWorkflow,
    setCheckpoint,
    setPendingRun,
    syncCurrentScope,
    switchScope,
    updateStep,
    updateWorkflow,
    workflows,
  };
});
