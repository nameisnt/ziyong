import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import { generateContent } from '@/core/generationService';
import { getCurrentChatScopeKey } from '@/store/chatScoped';
import { useDiaryStore } from '@/store/diary';
import { useGenerationTaskStore } from '@/store/generationTasks';
import { useSummaryStore } from '@/store/summary';
import type { GenerationTask, GenerationTaskJob, GenerationTaskKind } from '@/type/generationTask';
import type { TextProviderSettings } from '@/type/settings';

export type ManualBatchTaskConfig = {
  appPrompt: string;
  bookId: string;
  bookTitle?: string;
  floorMode?: 'all' | 'custom';
  floorText?: string;
  groupMode?: boolean;
  groupSize?: number;
  includeAi?: boolean;
  includeUser?: boolean;
  occurredAt?: string;
  outputFormat: string;
  perspective?: {
    id?: string;
    name: string;
  };
  references: string;
  rpmLimit: number;
  stream: boolean;
  tavernPresetName: string;
  textProvider: TextProviderSettings;
  userRequirement: string;
};

type CreateManualBatchTaskInput = {
  config: ManualBatchTaskConfig;
  jobs: Array<Omit<GenerationTaskJob, 'error' | 'id' | 'status'>>;
  kind: Extract<GenerationTaskKind, 'diary-batch' | 'summary-batch'>;
  routeParams?: Record<string, string>;
  title: string;
};

function buildTaskJobs(jobs: CreateManualBatchTaskInput['jobs']): GenerationTaskJob[] {
  return jobs.map((job, index) => ({
    ...job,
    error: '',
    id: `job_${index}_${job.singleMessageId || job.rangeText}`,
    status: 'pending',
  }));
}

export function createManualBatchTask(input: CreateManualBatchTaskInput) {
  const tasks = useGenerationTaskStore();
  return tasks.createTask({
    appId: input.kind === 'diary-batch' ? 'diary' : 'summary',
    config: input.config,
    jobs: buildTaskJobs(input.jobs),
    kind: input.kind,
    routePage: 'batch-generate',
    routeParams: input.routeParams,
    title: input.title,
  });
}

function getConfig(task: GenerationTask) {
  return task.config as ManualBatchTaskConfig;
}

export async function runManualBatchTask(taskId: string) {
  const tasks = useGenerationTaskStore();
  const task = tasks.getTask(taskId);
  if (!task || !['diary-batch', 'summary-batch'].includes(task.kind)) return;
  if (!tasks.beginExecution(taskId)) return;

  tasks.markRunning(taskId);
  try {
    if (task.scopeKey !== getCurrentChatScopeKey()) {
      tasks.setStatus(taskId, 'interrupted', '请先切回创建任务时的聊天，再继续生成');
      return;
    }

    const config = getConfig(task);
    const isDiary = task.kind === 'diary-batch';
    const adapter = getRegisteredPhoneGenerationAdapter(isDiary ? 'diary' : 'summary', 'generate');

    for (let index = 0; index < task.jobs.length; index += 1) {
      const currentTask = tasks.getTask(taskId);
      const job = currentTask?.jobs[index];
      if (!currentTask || !job) return;
      if (job.status === 'saved' || job.status === 'draft') continue;
      if (currentTask.status === 'pause-requested') {
        tasks.setStatus(taskId, 'paused', '已在上一项完成后暂停');
        return;
      }
      if (currentTask.status !== 'running') return;

      tasks.startJob(taskId, index, job.label);
      try {
        const result = await generateContent(
          adapter,
          isDiary
            ? {
                appPrompt: config.appPrompt,
                bookId: config.bookId,
                bookTitle: config.bookTitle || '',
                occurredAt: config.occurredAt || '',
                outputFormat: config.outputFormat,
                perspective: config.perspective,
                userRequirement: config.userRequirement,
              }
            : {
                appPrompt: config.appPrompt,
                bookId: config.bookId,
                outputFormat: config.outputFormat,
                userRequirement: config.userRequirement,
              },
          {
            createFailedDraft: input =>
              isDiary ? useDiaryStore().createFailedDraft(input) : useSummaryStore().createFailedDraft(input),
            generationDefaults: {
              resultMode: 'save',
              stream: config.stream,
              tavernPresetName: config.tavernPresetName,
            },
            lifecycle: {
              onFinish() {
                tasks.commitRawOutput(taskId);
                tasks.setActiveGeneration(taskId, '');
              },
              onRawOutput(rawOutput) {
                tasks.updateRawOutput(taskId, rawOutput);
              },
              onSaved() {
                tasks.finishJob(taskId, index, 'saved');
              },
              onStart(generationId) {
                tasks.setActiveGeneration(taskId, generationId);
              },
            },
            rateLimitRpm: config.rpmLimit,
            references: config.references,
            source: {
              mode: job.mode ?? 'single',
              rangeText: job.rangeText,
              singleMessageId: job.singleMessageId,
            },
            textProvider: config.textProvider,
          },
        );

        tasks.finishJob(
          taskId,
          index,
          result.status === 'failed' ? 'draft' : 'saved',
          result.status === 'failed' ? result.warnings.join('；') : '',
        );
      } catch (error) {
        const latest = tasks.getTask(taskId);
        if (!latest || ['paused', 'interrupted', 'cancelled'].includes(latest.status)) return;
        const message = error instanceof Error ? error.message : '批量生成失败';
        tasks.setStatus(taskId, 'paused', `${job.label}生成失败：${message}。可继续重试当前项`);
        return;
      }
    }

    const completed = tasks.getTask(taskId);
    if (!completed) return;
    tasks.completeTask(taskId);
    if (completed.draftCount) {
      toastr.warning(`批量生成完成：成功 ${completed.savedCount} 项，保留 ${completed.draftCount} 条解析失败草稿`);
    } else {
      toastr.success(`批量生成完成，共保存 ${completed.savedCount} 项`);
    }
  } finally {
    tasks.setActiveGeneration(taskId, '');
    tasks.endExecution(taskId);
  }
}

export async function resumeGenerationTask(taskId: string) {
  const task = useGenerationTaskStore().getTask(taskId);
  if (!task) return;
  if (task.kind === 'workbench') {
    const { resumeWorkbenchTask } = await import('@/apps/workbench/runner');
    await resumeWorkbenchTask(taskId);
    return;
  }
  await runManualBatchTask(taskId);
}

export async function discardGenerationTask(taskId: string) {
  const tasks = useGenerationTaskStore();
  const task = tasks.getTask(taskId);
  if (!task) return;
  if (task.kind === 'workbench') {
    const workflowId = typeof task.config.workflowId === 'string' ? task.config.workflowId : '';
    const { useWorkbenchStore } = await import('@/apps/workbench/store');
    const workbench = useWorkbenchStore();
    const workflow = workbench.getWorkflow(workflowId);
    const pendingRun = workflow?.pendingRuns[task.scopeKey];
    if (workflow && pendingRun) {
      workbench.setCheckpoint(workflow.id, task.scopeKey, {
        ...pendingRun.checkpoint,
        hasSuccessfulRun: true,
      });
      workbench.clearPendingRun(workflow.id, task.scopeKey);
    }
  }
  tasks.removeTask(taskId);
}
