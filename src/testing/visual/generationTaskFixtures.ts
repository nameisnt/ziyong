import { useGenerationTaskStore } from '@/store/generationTasks';

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
}
