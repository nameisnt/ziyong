import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import { generateContent } from '@/core/generationService';
import { resumeWorkbenchTask } from '@/apps/workbench/runner';
import { useWorkbenchStore } from '@/apps/workbench/store';
import { getCurrentChatScopeKey } from '@/store/chatScoped';
import { useDiaryStore } from '@/store/diary';
import { useGenerationTaskStore } from '@/store/generationTasks';
import { usePhoneStore } from '@/store/phone';
import { useSummaryStore } from '@/store/summary';
import type {
  GenerationReplaySnapshot,
  HiddenGenerationRecord,
  RawOutputSemantics,
  SourceSelection,
} from '@/type/generation';
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
  previews?: ManualBatchPreviewItem[];
};

export type ManualBatchPreviewItem = {
  content: string;
  generationRecord: HiddenGenerationRecord;
  jobId: string;
  label: string;
  occurredAt?: string;
  rawOutput: string;
  rawOutputSemantics: RawOutputSemantics;
  replay: GenerationReplaySnapshot;
  source: SourceSelection;
  title: string;
  warnings: string[];
};

export type ManualBatchPreviewEdit = Pick<ManualBatchPreviewItem, 'content' | 'jobId' | 'title'> & {
  occurredAt?: string;
  reasoning: string;
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
    id: `job_${index}_${job.fromStartEnd || job.singleMessageId || job.rangeText}`,
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

function buildAdapterConfig(task: GenerationTask, config: ManualBatchTaskConfig) {
  return task.kind === 'diary-batch'
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
      };
}

function storePreview(taskId: string, preview: ManualBatchPreviewItem) {
  const tasks = useGenerationTaskStore();
  const task = tasks.getTask(taskId);
  if (!task) return;
  const config = getConfig(task);
  tasks.patchTask(taskId, {
    config: {
      ...config,
      previews: [...(config.previews || []).filter(item => item.jobId !== preview.jobId), preview],
    },
  });
}

export function getManualBatchPreviews(taskId: string) {
  const task = useGenerationTaskStore().getTask(taskId);
  if (!task) return [];
  const previewJobIds = new Set(task.jobs.filter(job => job.status === 'preview').map(job => job.id));
  return (getConfig(task).previews || []).filter(item => previewJobIds.has(item.jobId));
}

export function updateManualBatchPreviews(taskId: string, edits: ManualBatchPreviewEdit[]) {
  const tasks = useGenerationTaskStore();
  const task = tasks.getTask(taskId);
  if (!task) return;
  const config = getConfig(task);
  const editByJobId = new Map(edits.map(edit => [edit.jobId, edit]));
  tasks.patchTask(taskId, {
    config: {
      ...config,
      previews: (config.previews || []).map(item => {
        const patch = editByJobId.get(item.jobId);
        return patch
          ? {
              ...item,
              content: patch.content,
              generationRecord: { ...item.generationRecord, reasoning: patch.reasoning },
              occurredAt: patch.occurredAt,
              title: patch.title,
            }
          : item;
      }),
    },
  });
}

export async function saveManualBatchPreviews(taskId: string) {
  const tasks = useGenerationTaskStore();
  const task = tasks.getTask(taskId);
  if (!task || !['diary-batch', 'summary-batch'].includes(task.kind)) return null;
  if (task.scopeKey !== getCurrentChatScopeKey()) throw new Error('请先切回创建任务时的聊天，再保存批量结果');
  if (!tasks.beginExecution(taskId)) return null;
  try {
    const config = getConfig(task);
    const isDiary = task.kind === 'diary-batch';
    const adapter = getRegisteredPhoneGenerationAdapter(isDiary ? 'diary' : 'summary', 'generate');
    const adapterConfig = buildAdapterConfig(task, config);
    let targetBookId = config.bookId;
    let savedNow = 0;

    for (const preview of getManualBatchPreviews(taskId)) {
      const jobIndex = task.jobs.findIndex(job => job.id === preview.jobId);
      if (jobIndex < 0 || task.jobs[jobIndex].status !== 'preview') continue;
      const saved = await adapter.save(
        isDiary
          ? { content: preview.content, occurredAt: preview.occurredAt || '', title: preview.title }
          : { content: preview.content, title: preview.title },
        {
          config: adapterConfig,
          generationRecord: preview.generationRecord,
          rawOutput: preview.rawOutput,
          rawOutputSemantics: preview.rawOutputSemantics,
          replay: preview.replay,
          scopeId: task.scopeKey,
          source: preview.source,
          warnings: preview.warnings,
        },
      );
      if (isDiary && saved && typeof saved === 'object' && 'bookId' in saved) {
        targetBookId = String(saved.bookId);
        adapterConfig.bookId = targetBookId;
      }
      tasks.finishJob(taskId, jobIndex, 'saved');
      savedNow += 1;
      const latest = tasks.getTask(taskId);
      if (latest) {
        const latestConfig = getConfig(latest);
        tasks.patchTask(taskId, {
          config: {
            ...latestConfig,
            bookId: targetBookId,
            previews: (latestConfig.previews || []).filter(item => item.jobId !== preview.jobId),
          },
        });
      }
    }

    tasks.patchTask(taskId, {
      currentLabel: '批量结果已保存',
      routePage: 'book',
      routeParams: targetBookId ? { bookId: targetBookId } : {},
    });
    return { bookId: targetBookId, savedCount: savedNow };
  } finally {
    tasks.endExecution(taskId);
  }
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
      if (job.status === 'preview' || job.status === 'saved' || job.status === 'draft') continue;
      if (currentTask.status === 'pause-requested') {
        tasks.setStatus(taskId, 'paused', '已在上一项完成后暂停');
        return;
      }
      if (currentTask.status !== 'running') return;

      tasks.startJob(taskId, index, job.label);
      try {
        const result = await generateContent(
          adapter,
          buildAdapterConfig(task, config),
          {
            createFailedDraft: input =>
              isDiary ? useDiaryStore().createFailedDraft(input) : useSummaryStore().createFailedDraft(input),
            generationDefaults: {
              resultMode: 'preview',
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
              onStart(generationId) {
                tasks.setActiveGeneration(taskId, generationId);
              },
            },
            rateLimitRpm: config.rpmLimit,
            references: config.references,
            source: {
              fromStartEnd: job.fromStartEnd,
              mode: job.mode ?? 'single',
              rangeText: job.rangeText,
              singleMessageId: job.singleMessageId,
            },
            textProvider: config.textProvider,
          },
        );

        if (result.status === 'failed') {
          tasks.finishJob(taskId, index, 'draft', result.warnings.join('；'));
        } else if (result.status === 'preview') {
          storePreview(taskId, {
            content: result.data.content,
            generationRecord: result.generationRecord,
            jobId: job.id,
            label: job.label,
            occurredAt: isDiary ? result.data.occurredAt : undefined,
            rawOutput: result.rawOutput,
            rawOutputSemantics: result.rawOutputSemantics,
            replay: result.replay,
            source: result.source,
            title: result.data.title,
            warnings: result.warnings,
          });
          tasks.finishJob(taskId, index, 'preview');
        } else {
          tasks.finishJob(taskId, index, 'saved');
        }
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
    tasks.patchTask(taskId, {
      currentLabel: completed.previewCount ? '批量结果等待确认' : '批量生成完成',
      routePage: completed.previewCount ? 'batch-preview' : completed.routePage,
      routeParams: completed.previewCount ? { ...completed.routeParams, taskId } : completed.routeParams,
    });
    if (completed.draftCount) {
      toastr.warning(
        `批量生成完成：待确认 ${completed.previewCount} 项，保留 ${completed.draftCount} 条解析失败草稿`,
      );
    } else {
      toastr.success(`批量生成完成，共 ${completed.previewCount} 项等待确认`);
    }
    if (completed.previewCount) {
      void usePhoneStore().presentGeneratedPage(completed.appId, 'batch-preview', '批量生成预览', {
        ...completed.routeParams,
        taskId,
      });
    }
  } finally {
    tasks.setActiveGeneration(taskId, '');
    tasks.endExecution(taskId);
  }
}

export async function resumeGenerationTask(taskId: string) {
  const task = useGenerationTaskStore().getTask(taskId);
  if (!task) return;
  if (task.kind === 'single') return;
  if (task.kind === 'workbench') {
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
