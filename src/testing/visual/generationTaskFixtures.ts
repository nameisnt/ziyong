import { createGenerationTasksBackupDomain } from '@/apps/builtinBackup';
import { normalizePersistedGenerationTasks, useGenerationTaskStore } from '@/store/generationTasks';
import { klona } from 'klona';

/** Seeds the running and paused generation-task states used by visual scenarios. */
export function createGenerationTaskFixture() {
  const tasks = useGenerationTaskStore();
  tasks.tasks.slice().forEach(task => tasks.removeTask(task.id));
  const running = tasks.createTask({
    appId: 'summary',
    jobs: Array.from({ length: 8 }, (_, index) => ({
      error: '',
      fromStartEnd: 0,
      id: `visual_job_${index}`,
      label: `第 ${index * 5 + 1}-${index * 5 + 5} 楼`,
      mode: 'range' as const,
      rangeText: `${index * 5 + 1}-${index * 5 + 5}`,
      singleMessageId: 0,
      status: index < 3 ? ('saved' as const) : ('pending' as const),
    })),
    kind: 'summary-batch',
    routePage: 'batch-generate',
    title: '批量总结 · 第一卷剧情总结',
  });
  tasks.patchTask(running.id, {
    currentJobIndex: 3,
    currentLabel: '第 16-20 楼',
    savedCount: 3,
    status: 'running',
  });
  const paused = tasks.createTask({
    appId: 'workbench',
    config: { workflowId: 'visual_workflow' },
    kind: 'workbench',
    title: '工作台 · 章节收尾整理',
    total: 6,
  });
  tasks.patchTask(paused.id, {
    currentJobIndex: 2,
    currentLabel: '第 1 批 · 日记',
    error: 'API 暂时不可用，进度已保留',
    savedCount: 2,
    status: 'paused',
  });
  const interrupted = tasks.createTask({
    appId: 'storylines',
    config: {
      actionId: 'generate',
      resultPage: '',
      resultParams: {},
      resultState: 'pending',
      resultTitle: '',
      sourcePage: 'generate',
      sourceParams: {},
    },
    kind: 'single',
    routePage: 'generate',
    title: '剧情梳理 · 单次生成',
    total: 1,
  });
  tasks.patchTask(interrupted.id, {
    currentLabel: '请求已中断',
    rawOutput: '<storylines>\n  <line title="风暴前夜">已保留的部分原始输出</line>\n</storylines>',
    status: 'running',
  });
  const rehydrated = normalizePersistedGenerationTasks({ tasks: [klona(tasks.getTask(interrupted.id))] }).tasks[0];
  if (
    rehydrated?.status !== 'interrupted' ||
    !rehydrated.error.includes('请求已中断') ||
    !rehydrated.rawOutput.includes('已保留的部分原始输出')
  ) {
    throw new Error('Single generation reload state did not become interrupted with raw output retained');
  }
  tasks.patchTask(interrupted.id, rehydrated);

  const saved = tasks.createTask({
    appId: 'diary',
    config: {
      actionId: 'visual-saved',
      resultPage: 'detail',
      resultParams: { id: 'visual-saved-diary' },
      resultState: 'saved',
      resultTitle: '已保存日记',
      sourcePage: 'generate',
      sourceParams: {},
    },
    kind: 'single',
    routePage: 'detail',
    routeParams: { id: 'visual-saved-diary' },
    title: '日记 · 已保存任务',
    total: 1,
  });
  tasks.patchTask(saved.id, {
    currentJobIndex: 1,
    currentLabel: '已保存为日记',
    finishedAt: '2026-08-22T00:00:00.000Z',
    savedCount: 1,
    status: 'completed',
  });

  const stopped = tasks.createTask({
    appId: 'storylines',
    config: {
      actionId: 'stop-contract',
      resultPage: '',
      resultParams: {},
      resultState: 'pending',
      resultTitle: '',
      sourcePage: 'generate',
      sourceParams: {},
    },
    kind: 'single',
    title: '停止语义测试',
    total: 1,
  });
  tasks.markRunning(stopped.id);
  tasks.updateRawOutput(stopped.id, '停止前的流式原始输出');
  tasks.stopNow(stopped.id);
  const stoppedResult = tasks.getTask(stopped.id);
  if (stoppedResult?.status !== 'cancelled' || stoppedResult.rawOutput !== '停止前的流式原始输出') {
    throw new Error('Single generation stop did not cancel while retaining pending raw output');
  }
  tasks.removeTask(stopped.id);

  const backupDomain = createGenerationTasksBackupDomain();
  const { rawOutputSemantics: _legacyRawOutputSemantics, ...legacyTask } = rehydrated;
  const v1Data = { __chatScoped: true, legacyScopeMigrations: {}, scopes: { visual: { tasks: [legacyTask] } } };
  const migrated = backupDomain.migrateImport?.(v1Data, 1);
  const migratedTask = (migrated as { scopes?: { visual?: { tasks?: [typeof rehydrated] } } })?.scopes?.visual
    ?.tasks?.[0];
  if (
    !migrated ||
    migrated === v1Data ||
    migratedTask?.rawOutput !== rehydrated.rawOutput ||
    migratedTask?.rawOutputSemantics !== 'legacy-unknown' ||
    !backupDomain.schema.safeParse(migrated).success ||
    backupDomain.schemaVersion !== 3
  ) {
    throw new Error('Generation task v1 backup was not migrated losslessly into schema v3');
  }
}
