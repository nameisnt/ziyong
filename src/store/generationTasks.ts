import { getCurrentChatScopeKey } from '@/store/chatScoped';
import { stripRetiredMediaGenerationTasks } from '@/core/retiredMedia';
import {
  GenerationTaskSchema,
  GenerationTaskSettingsSchema,
  SingleGenerationTaskConfigSchema,
  type GenerationTask,
  type GenerationTaskJob,
  type GenerationTaskKind,
  type GenerationTaskSettings,
  type GenerationTaskStatus,
} from '@/type/generationTask';
import { onTavernEvent, stopGenerationByIdSafe } from '@/util/runtime';
import { validateInplace } from '@/util/zod';
// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

export const generationTasksField = 'sillytavern_phone_generation_tasks';

const executingTaskIds = new Set<string>();
const terminalStatuses = new Set<GenerationTaskStatus>(['completed', 'cancelled', 'failed']);
const pendingRawOutputs = new Map<string, string>();
const rawOutputTimers = new Map<string, number>();
const RAW_OUTPUT_PERSIST_INTERVAL_MS = 500;
const MAX_TERMINAL_TASKS = 40;

export function isPureSavedGenerationTask(task: GenerationTask) {
  if (task.status !== 'completed' || task.draftCount !== 0) return false;
  if (task.kind === 'single') {
    const config = SingleGenerationTaskConfigSchema.safeParse(task.config);
    return config.success && config.data.resultState === 'saved';
  }
  return task.total > 0 && task.jobs.length === task.total && task.jobs.every(job => job.status === 'saved');
}

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizePersistedGenerationTasks(raw: unknown): GenerationTaskSettings {
  const parsed = validateInplace(GenerationTaskSettingsSchema, raw);
  stripRetiredMediaGenerationTasks(parsed);
  parsed.tasks = parsed.tasks.map(task => {
    if (!['queued', 'running', 'pause-requested'].includes(task.status)) return task;
    const isSingle = task.kind === 'single';
    return {
      ...task,
      activeGenerationId: '',
      error: isSingle
        ? '插件重新载入后请求已中断，已保留原始输出；请返回来源页重新生成'
        : '插件重新载入后任务已暂停，可从任务中心继续',
      jobs: isSingle
        ? task.jobs
        : task.jobs.map(job => (job.status === 'running' ? { ...job, status: 'pending' as const } : job)),
      status: 'interrupted' as const,
      updatedAt: nowIso(),
    };
  });
  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** Adds explicit raw-output semantics to supported legacy generation-task backup payloads. */
export function migrateGenerationTasksBackupData(raw: unknown, fromVersion: number): unknown {
  if (fromVersion !== 1 && fromVersion !== 2) throw new Error(`不支持从 generation-tasks v${fromVersion} 迁移`);
  if (!isRecord(raw) || !isRecord(raw.scopes)) return raw;
  return {
    ...raw,
    scopes: Object.fromEntries(
      Object.entries(raw.scopes).map(([scopeKey, scope]) => {
        if (!isRecord(scope) || !Array.isArray(scope.tasks)) return [scopeKey, scope];
        return [
          scopeKey,
          {
            ...scope,
            tasks: scope.tasks.map(task =>
              isRecord(task) ? { ...task, rawOutputSemantics: task.rawOutputSemantics ?? 'legacy-unknown' } : task,
            ),
          },
        ];
      }),
    ),
  };
}

export const useGenerationTaskStore = defineStore('generationTasks', () => {
  const settings = ref<GenerationTaskSettings>(
    normalizePersistedGenerationTasks(_.get(extension_settings, generationTasksField, {})),
  );
  const currentScopeKey = ref(getCurrentChatScopeKey());

  const tasks = computed(() => settings.value.tasks);
  const currentScopeTasks = computed(() => {
    return settings.value.tasks.filter(task => task.scopeKey === currentScopeKey.value);
  });
  const activeTasks = computed(() => currentScopeTasks.value.filter(task => !terminalStatuses.has(task.status)));
  const runningTasks = computed(() =>
    currentScopeTasks.value.filter(task => task.status === 'running' || task.status === 'pause-requested'),
  );
  const hasRunningTasks = computed(() =>
    settings.value.tasks.some(task => task.status === 'running' || task.status === 'pause-requested'),
  );

  function persist() {
    const parsed = validateInplace(GenerationTaskSettingsSchema, klona(settings.value));
    _.set(extension_settings, generationTasksField, parsed);
    void saveSettingsDebounced();
  }

  watch(settings, persist, { deep: true });

  function getTask(taskId: string) {
    return settings.value.tasks.find(task => task.id === taskId) ?? null;
  }

  function getLatestTask(kind: GenerationTaskKind, scopeKey = getCurrentChatScopeKey()) {
    return settings.value.tasks.find(task => task.kind === kind && task.scopeKey === scopeKey) ?? null;
  }

  function getWorkbenchTask(workflowId: string, scopeKey = getCurrentChatScopeKey()) {
    return (
      settings.value.tasks.find(
        task =>
          task.kind === 'workbench' &&
          task.scopeKey === scopeKey &&
          task.config.workflowId === workflowId &&
          !terminalStatuses.has(task.status),
      ) ?? null
    );
  }

  function getSingleTask(appId: string, actionId: string, scopeKey = getCurrentChatScopeKey()) {
    return (
      settings.value.tasks.find(
        task =>
          task.kind === 'single' &&
          task.appId === appId &&
          task.scopeKey === scopeKey &&
          task.config.actionId === actionId,
      ) ?? null
    );
  }

  function createTask(input: {
    appId: string;
    automatic?: boolean;
    config?: Record<string, unknown>;
    jobs?: GenerationTaskJob[];
    kind: GenerationTaskKind;
    routePage?: string;
    routeParams?: Record<string, string>;
    scopeKey?: string;
    title: string;
    total?: number;
  }) {
    const timestamp = nowIso();
    const task = validateInplace(GenerationTaskSchema, {
      activeGenerationId: '',
      appId: input.appId,
      automatic: input.automatic ?? false,
      config: input.config ?? {},
      createdAt: timestamp,
      currentJobIndex: 0,
      currentLabel: '',
      draftCount: 0,
      error: '',
      finishedAt: '',
      id: createId('generation_task'),
      jobs: input.jobs ?? [],
      kind: input.kind,
      previewCount: 0,
      rawOutput: '',
      rawOutputSemantics: 'original-v1',
      routePage: input.routePage ?? 'root',
      routeParams: input.routeParams ?? {},
      savedCount: 0,
      scopeKey: input.scopeKey ?? getCurrentChatScopeKey(),
      status: 'queued',
      title: input.title,
      total: input.total ?? input.jobs?.length ?? 0,
      updatedAt: timestamp,
    });
    const allTasks = [task, ...settings.value.tasks];
    const active = allTasks.filter(item => !terminalStatuses.has(item.status));
    const terminal = allTasks.filter(item => terminalStatuses.has(item.status)).slice(0, MAX_TERMINAL_TASKS);
    settings.value.tasks = [...active, ...terminal];
    return task;
  }

  function patchTask(taskId: string, patch: Partial<GenerationTask>) {
    const task = getTask(taskId);
    if (!task) return null;
    Object.assign(task, patch, { updatedAt: nowIso() });
    return task;
  }

  function setStatus(taskId: string, status: GenerationTaskStatus, error = '') {
    const task = patchTask(taskId, {
      activeGenerationId: status === 'running' ? getTask(taskId)?.activeGenerationId || '' : '',
      error,
      finishedAt: terminalStatuses.has(status) ? nowIso() : '',
      status,
    });
    if (task && status !== 'running' && task.jobs[task.currentJobIndex]?.status === 'running') {
      task.jobs[task.currentJobIndex].status = 'pending';
    }
    return task;
  }

  function markRunning(taskId: string) {
    return patchTask(taskId, {
      activeGenerationId: '',
      error: '',
      finishedAt: '',
      status: 'running',
    });
  }

  function setActiveGeneration(taskId: string, generationId: string) {
    return patchTask(taskId, { activeGenerationId: generationId });
  }

  function commitRawOutput(taskId: string) {
    const timer = rawOutputTimers.get(taskId);
    if (typeof timer === 'number') window.clearTimeout(timer);
    rawOutputTimers.delete(taskId);

    const rawOutput = pendingRawOutputs.get(taskId);
    pendingRawOutputs.delete(taskId);
    if (typeof rawOutput !== 'string') return getTask(taskId);
    return patchTask(taskId, { rawOutput });
  }

  function updateRawOutput(taskId: string, rawOutput: string) {
    pendingRawOutputs.set(taskId, rawOutput);
    if (rawOutputTimers.has(taskId)) return getTask(taskId);
    rawOutputTimers.set(
      taskId,
      window.setTimeout(() => {
        commitRawOutput(taskId);
      }, RAW_OUTPUT_PERSIST_INTERVAL_MS),
    );
    return getTask(taskId);
  }

  function startJob(taskId: string, jobIndex: number, label: string) {
    const task = getTask(taskId);
    if (!task || !task.jobs[jobIndex]) return null;
    task.currentJobIndex = jobIndex;
    task.currentLabel = label;
    task.jobs[jobIndex].error = '';
    task.jobs[jobIndex].status = 'running';
    task.updatedAt = nowIso();
    return task;
  }

  function finishJob(taskId: string, jobIndex: number, status: 'preview' | 'saved' | 'draft', error = '') {
    const task = getTask(taskId);
    if (!task || !task.jobs[jobIndex]) return null;
    const previousStatus = task.jobs[jobIndex].status;
    task.jobs[jobIndex].status = status;
    task.jobs[jobIndex].error = error;
    task.currentJobIndex = Math.min(jobIndex + 1, task.jobs.length);
    if (previousStatus === 'preview') task.previewCount = Math.max(0, task.previewCount - 1);
    if (previousStatus === 'saved') task.savedCount = Math.max(0, task.savedCount - 1);
    if (previousStatus === 'draft') task.draftCount = Math.max(0, task.draftCount - 1);
    if (status === 'preview') task.previewCount += 1;
    if (status === 'saved') task.savedCount += 1;
    if (status === 'draft') task.draftCount += 1;
    task.updatedAt = nowIso();
    return task;
  }

  function requestPause(taskId: string) {
    const task = getTask(taskId);
    if (!task || task.kind === 'single' || task.status !== 'running') return;
    task.status = 'pause-requested';
    task.error = '将在当前生成完成后暂停';
    task.updatedAt = nowIso();
  }

  function stopNow(taskId: string) {
    const task = getTask(taskId);
    if (!task || terminalStatuses.has(task.status)) return;
    if (task.activeGenerationId) stopGenerationByIdSafe(task.activeGenerationId);
    if (task.kind === 'single') {
      commitRawOutput(taskId);
      setStatus(taskId, 'cancelled', '已停止单次生成，已保留原始输出');
      return;
    }
    setStatus(taskId, 'paused', '已停止当前生成，进度已保留');
  }

  function cancelTask(taskId: string) {
    const task = getTask(taskId);
    if (!task) return;
    if (task.activeGenerationId) stopGenerationByIdSafe(task.activeGenerationId);
    setStatus(taskId, 'cancelled');
  }

  function completeTask(taskId: string) {
    const task = getTask(taskId);
    if (!task) return;
    patchTask(taskId, {
      activeGenerationId: '',
      currentJobIndex: task.jobs.length || task.total,
      currentLabel: '',
      error: '',
      finishedAt: nowIso(),
      status: 'completed',
    });
  }

  function removeTask(taskId: string) {
    const task = getTask(taskId);
    if (task?.activeGenerationId) stopGenerationByIdSafe(task.activeGenerationId);
    const rawOutputTimer = rawOutputTimers.get(taskId);
    if (typeof rawOutputTimer === 'number') window.clearTimeout(rawOutputTimer);
    rawOutputTimers.delete(taskId);
    pendingRawOutputs.delete(taskId);
    executingTaskIds.delete(taskId);
    settings.value.tasks = settings.value.tasks.filter(item => item.id !== taskId);
  }

  function clearScopeTasks(scopeKey = getCurrentChatScopeKey()) {
    settings.value.tasks.filter(task => task.scopeKey === scopeKey).forEach(task => removeTask(task.id));
  }

  function getClearableTasks(scopeKey = getCurrentChatScopeKey()) {
    return settings.value.tasks.filter(task => task.scopeKey === scopeKey && isPureSavedGenerationTask(task));
  }

  function clearPureSavedTasks(scopeKey = getCurrentChatScopeKey()) {
    const taskIds = getClearableTasks(scopeKey).map(task => task.id);
    taskIds.forEach(taskId => removeTask(taskId));
    return taskIds;
  }

  function beginExecution(taskId: string) {
    if (executingTaskIds.has(taskId)) return false;
    executingTaskIds.add(taskId);
    return true;
  }

  function endExecution(taskId: string) {
    executingTaskIds.delete(taskId);
  }

  function rehydrateFromSettings() {
    if (hasRunningTasks.value || executingTaskIds.size) {
      throw new Error('生成任务运行中，暂时不能刷新插件数据');
    }
    settings.value.tasks.forEach(task => {
      if (task.activeGenerationId) stopGenerationByIdSafe(task.activeGenerationId);
    });
    rawOutputTimers.forEach(timer => window.clearTimeout(timer));
    rawOutputTimers.clear();
    pendingRawOutputs.clear();
    settings.value = normalizePersistedGenerationTasks(_.get(extension_settings, generationTasksField, {}));
    currentScopeKey.value = getCurrentChatScopeKey();
    executingTaskIds.clear();
  }

  const stopChatChanged = onTavernEvent('CHAT_CHANGED', () => {
    window.setTimeout(() => {
      currentScopeKey.value = getCurrentChatScopeKey();
      settings.value.tasks.forEach(task => {
        if (task.scopeKey === currentScopeKey.value || !['queued', 'running', 'pause-requested'].includes(task.status))
          return;
        if (task.activeGenerationId) stopGenerationByIdSafe(task.activeGenerationId);
        setStatus(
          task.id,
          'interrupted',
          task.kind === 'single'
            ? '聊天已切换，单次生成请求已中断并保留原始输出，以避免写入错误聊天'
            : '聊天已切换，任务已暂停以避免写入错误聊天',
        );
      });
    }, 0);
  });

  onScopeDispose(() => {
    stopChatChanged.stop();
  });

  return {
    activeTasks,
    beginExecution,
    cancelTask,
    clearScopeTasks,
    clearPureSavedTasks,
    commitRawOutput,
    completeTask,
    createTask,
    currentScopeTasks,
    endExecution,
    finishJob,
    getLatestTask,
    getClearableTasks,
    getSingleTask,
    getTask,
    getWorkbenchTask,
    hasRunningTasks,
    markRunning,
    patchTask,
    rehydrateFromSettings,
    removeTask,
    requestPause,
    runningTasks,
    setActiveGeneration,
    setStatus,
    startJob,
    stopNow,
    tasks,
    updateRawOutput,
  };
});
