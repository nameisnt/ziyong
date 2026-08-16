import type { GenerationLifecycle } from '@/core/generationService';
import { getCurrentChatScopeKey } from '@/store/chatScoped';
import { useGenerationTaskStore } from '@/store/generationTasks';
import type {
  GenerationTask,
  SingleGenerationTaskConfig,
  SingleGenerationTaskResult,
} from '@/type/generationTask';

export interface SingleGenerationTaskDescriptor {
  actionId: string;
  appId: string;
  sourcePage: string;
  sourceParams?: Record<string, string>;
  title: string;
}

export interface SingleGenerationTaskCompletion {
  currentLabel?: string;
  resultPage: string;
  resultParams?: Record<string, string>;
  resultState: Exclude<SingleGenerationTaskResult, 'pending'>;
  resultTitle: string;
}

export type SingleGenerationTaskCreateOverrides = Partial<
  Pick<SingleGenerationTaskDescriptor, 'sourcePage' | 'sourceParams' | 'title'>
>;

/**
 * Keeps request lifecycle facts in the persistent task store. Business configuration,
 * result materialization and preview persistence remain owned by the calling App.
 */
export function useSingleGenerationTaskSession(descriptor: SingleGenerationTaskDescriptor) {
  const tasks = useGenerationTaskStore();
  const taskId = ref('');

  const task = computed<GenerationTask | null>(() => {
    const direct = taskId.value ? tasks.getTask(taskId.value) : null;
    return direct ?? tasks.getSingleTask(descriptor.appId, descriptor.actionId);
  });
  const running = computed(() => task.value?.status === 'queued' || task.value?.status === 'running');
  const rawOutput = computed(() => task.value?.rawOutput ?? '');
  const error = computed(() => task.value?.error ?? '');

  function create(overrides: SingleGenerationTaskCreateOverrides = {}) {
    const scopeKey = getCurrentChatScopeKey();
    const existing = tasks.getSingleTask(descriptor.appId, descriptor.actionId, scopeKey);
    if (existing && ['queued', 'running', 'pause-requested'].includes(existing.status)) {
      throw new Error('该单次生成任务仍在运行');
    }

    const sourcePage = overrides.sourcePage ?? descriptor.sourcePage;
    const sourceParams = overrides.sourceParams ?? descriptor.sourceParams ?? {};
    const title = overrides.title ?? descriptor.title;
    const config: SingleGenerationTaskConfig = {
      actionId: descriptor.actionId,
      resultPage: '',
      resultParams: {},
      resultState: 'pending',
      resultTitle: '',
      sourcePage,
      sourceParams,
    };
    const created = tasks.createTask({
      appId: descriptor.appId,
      config,
      kind: 'single',
      routePage: sourcePage,
      routeParams: sourceParams,
      scopeKey,
      title,
      total: 1,
    });
    if (!tasks.beginExecution(created.id)) {
      tasks.removeTask(created.id);
      throw new Error('无法建立单次生成运行会话');
    }
    taskId.value = created.id;
    return created;
  }

  function lifecycle(id = taskId.value): GenerationLifecycle {
    return {
      onFinish() {
        tasks.commitRawOutput(id);
        tasks.setActiveGeneration(id, '');
      },
      onRawOutput(value) {
        tasks.updateRawOutput(id, value);
      },
      onStart(generationId) {
        tasks.markRunning(id);
        tasks.setActiveGeneration(id, generationId);
      },
    };
  }

  function setRawOutput(value: string, id = taskId.value) {
    if (!id) return;
    tasks.updateRawOutput(id, value);
  }

  function complete(id: string, result: SingleGenerationTaskCompletion) {
    const current = tasks.getTask(id);
    if (!current || current.kind !== 'single') return null;
    if (current.scopeKey !== getCurrentChatScopeKey()) {
      tasks.setStatus(id, 'interrupted', '聊天已切换，单次生成结果未写入当前聊天');
      tasks.endExecution(id);
      return current;
    }
    if (current.status === 'interrupted' || current.status === 'cancelled') {
      tasks.endExecution(id);
      return current;
    }

    tasks.commitRawOutput(id);
    const sourceConfig = current.config as SingleGenerationTaskConfig;
    const config: SingleGenerationTaskConfig = {
      actionId: sourceConfig.actionId,
      resultPage: result.resultPage,
      resultParams: result.resultParams ?? {},
      resultState: result.resultState,
      resultTitle: result.resultTitle,
      sourcePage: sourceConfig.sourcePage,
      sourceParams: sourceConfig.sourceParams,
    };
    tasks.completeTask(id);
    const completed = tasks.patchTask(id, {
      config,
      currentLabel: result.currentLabel ?? '生成完成',
      draftCount: result.resultState === 'failed-draft' ? 1 : 0,
      routePage: result.resultPage,
      routeParams: result.resultParams ?? {},
      savedCount: result.resultState === 'saved' ? 1 : 0,
    });
    tasks.endExecution(id);
    return completed;
  }

  function fail(id: string, reason: unknown) {
    const current = tasks.getTask(id);
    if (!current || current.kind !== 'single') return null;
    tasks.commitRawOutput(id);
    if (current.scopeKey !== getCurrentChatScopeKey()) {
      tasks.setStatus(id, 'interrupted', '聊天已切换，单次生成请求已中断并保留原始输出');
      tasks.endExecution(id);
      return current;
    }
    if (current.status === 'interrupted' || current.status === 'cancelled') {
      tasks.endExecution(id);
      return current;
    }
    const message = reason instanceof Error ? reason.message : String(reason || '生成失败');
    tasks.setStatus(id, 'failed', message);
    const failed = tasks.patchTask(id, { currentLabel: '生成失败' });
    tasks.endExecution(id);
    return failed;
  }

  function stop(id = task.value?.id ?? taskId.value) {
    if (!id) return;
    tasks.stopNow(id);
    tasks.endExecution(id);
  }

  return {
    complete,
    create,
    error,
    fail,
    lifecycle,
    rawOutput,
    running,
    setRawOutput,
    stop,
    task,
    taskId,
  };
}
