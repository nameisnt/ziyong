import {
  createManualBatchTask,
  resumeGenerationTask,
  runManualBatchTask,
  type ManualBatchTaskConfig,
} from '@/core/manualBatchRunner';
import { getCurrentChatScopeKey } from '@/store/chatScoped';
import { useGenerationTaskStore } from '@/store/generationTasks';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import { useSummaryStore } from '@/store/summary';
import { getChatMessagesSafe } from '@/util/runtime';
import { klona } from 'klona';
import { storeToRefs } from 'pinia';
import type { ComputedRef } from 'vue';

interface SummaryBatchSessionOptions {
  buildOutputFormat: () => string;
  formattedReferences: ComputedRef<string>;
  getRouteBookId: () => string;
}

/** Owns batch form parsing, task creation, resume, stop and reset. */
export function useSummaryBatchSession(options: SummaryBatchSessionOptions) {
  const generationTasks = useGenerationTaskStore();
  const prompts = usePromptStore();
  const settingsStore = useSettingsStore();
  const summary = useSummaryStore();
  const { settings } = storeToRefs(settingsStore);
  const draft = reactive({
    bookId: '',
    floorMode: 'custom' as 'all' | 'custom',
    floorText: '',
    groupMode: false,
    groupSize: 5,
    includeAi: true,
    includeUser: true,
    rpmLimit: 10,
    userRequirement: '',
  });
  const formError = ref('');
  const task = computed(
    () =>
      generationTasks.tasks.find(
        item =>
          item.kind === 'summary-batch' &&
          item.scopeKey === getCurrentChatScopeKey() &&
          (!options.getRouteBookId() || item.routeParams.bookId === options.getRouteBookId()),
      ) ?? null,
  );
  const state = computed(() => {
    const current = task.value;
    const running = current?.status === 'running' || current?.status === 'pause-requested';
    const resumeAvailable = Boolean(current && ['paused', 'interrupted'].includes(current.status));
    return {
      currentLabel: current?.currentLabel || '',
      done: current?.savedCount || 0,
      error: current?.error || formError.value,
      failed: current?.draftCount || 0,
      generationId: current?.activeGenerationId || '',
      nextJobIndex: current?.currentJobIndex || 0,
      rawOutput: current?.rawOutput || '',
      resumeAvailable,
      running,
      stopRequested: current?.status === 'paused',
      total: current?.total || 0,
    };
  });
  const inputsLocked = computed(() => state.value.running || state.value.resumeAvailable);

  function parseFloorText(rawValue: string) {
    const normalized = rawValue.trim();
    if (!normalized) throw new Error('请先填写楼层范围，例如 1-30,35,40-45');
    const floorSet = new Set<number>();
    for (const segment of normalized
      .split(/[\s,，;；\n]+/)
      .map(item => item.trim())
      .filter(Boolean)) {
      const singleMatch = segment.match(/^(\d+)$/);
      if (singleMatch) {
        floorSet.add(Number(singleMatch[1]));
        continue;
      }
      const rangeMatch = segment.match(/^(\d+)\s*-\s*(\d+)$/);
      if (!rangeMatch) throw new Error(`无法识别楼层片段：${segment}`);
      const start = Math.min(Number(rangeMatch[1]), Number(rangeMatch[2]));
      const end = Math.max(Number(rangeMatch[1]), Number(rangeMatch[2]));
      for (let floor = start; floor <= end; floor += 1) floorSet.add(floor);
    }
    return [...floorSet].sort((left, right) => left - right);
  }

  function formatRange(floors: number[]) {
    if (!floors.length) return '';
    const sorted = [...floors].sort((left, right) => left - right);
    const ranges: Array<{ end: number; start: number }> = [];
    let start = sorted[0];
    let end = sorted[0];
    for (let index = 1; index < sorted.length; index += 1) {
      const current = sorted[index];
      if (current === end + 1) {
        end = current;
        continue;
      }
      ranges.push({ end, start });
      start = current;
      end = current;
    }
    ranges.push({ end, start });
    return ranges
      .map(range => (range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`))
      .join(', ');
  }

  function getVisibleFloors() {
    if (!draft.includeAi && !draft.includeUser) throw new Error('请至少选择 AI 楼层或用户楼层');
    const visibleMessages = getChatMessagesSafe('0-{{lastMessageId}}', { hide_state: 'unhidden' });
    const visibleById = new Map(visibleMessages.map(message => [message.message_id, message]));
    const requestedFloors =
      draft.floorMode === 'all' ? visibleMessages.map(message => message.message_id) : parseFloorText(draft.floorText);
    const floors = requestedFloors
      .filter(floor => {
        const message = visibleById.get(floor);
        if (!message) return false;
        if (message.role === 'assistant') return draft.includeAi;
        if (message.role === 'user') return draft.includeUser;
        return false;
      })
      .sort((left, right) => left - right);
    if (!floors.length) {
      throw new Error(
        draft.floorMode === 'all'
          ? '当前聊天没有符合条件的可见 AI/用户楼层'
          : '给定范围内没有符合条件的可见 AI/用户楼层',
      );
    }
    return floors;
  }

  function buildJobs() {
    const floors = getVisibleFloors();
    if (!draft.groupMode) {
      return floors.map(floor => ({
        fromStartEnd: 0,
        label: `第 ${floor} 楼`,
        mode: 'single' as const,
        rangeText: '',
        singleMessageId: floor,
      }));
    }
    const groupSize = Math.min(50, Math.max(1, Math.round(draft.groupSize || 1)));
    const jobs: Array<{
      fromStartEnd: number;
      label: string;
      mode: 'range';
      rangeText: string;
      singleMessageId: number;
    }> = [];
    for (let index = 0; index < floors.length; index += groupSize) {
      const rangeText = formatRange(floors.slice(index, index + groupSize));
      jobs.push({ fromStartEnd: 0, label: `第 ${rangeText} 楼`, mode: 'range', rangeText, singleMessageId: 0 });
    }
    return jobs;
  }

  async function run() {
    const existingTask = task.value;
    if (existingTask && ['paused', 'interrupted'].includes(existingTask.status)) {
      await resumeGenerationTask(existingTask.id);
      return;
    }
    if (existingTask && ['running', 'pause-requested'].includes(existingTask.status)) return;
    const book = summary.getBook(draft.bookId);
    if (!book) {
      formError.value = '请先选择要保存到的总结集';
      return;
    }
    let jobs: ReturnType<typeof buildJobs>;
    try {
      jobs = buildJobs();
    } catch (error) {
      formError.value = error instanceof Error ? error.message : '无法解析批量楼层';
      return;
    }
    formError.value = '';
    const created = createManualBatchTask({
      config: {
        appPrompt: prompts.appPrompts.summaries,
        bookId: book.id,
        floorMode: draft.floorMode,
        floorText: draft.floorText,
        groupMode: draft.groupMode,
        groupSize: draft.groupSize,
        includeAi: draft.includeAi,
        includeUser: draft.includeUser,
        outputFormat: options.buildOutputFormat(),
        references: options.formattedReferences.value,
        rpmLimit: draft.rpmLimit,
        stream: settings.value.generation.stream,
        tavernPresetName: settings.value.generation.tavernPresetName,
        textProvider: klona(settings.value.textProvider),
        userRequirement: draft.userRequirement,
      },
      jobs,
      kind: 'summary-batch',
      routeParams: { bookId: book.id },
      title: `批量总结 · ${book.title}`,
    });
    await runManualBatchTask(created.id);
  }

  function hydrate(config: ManualBatchTaskConfig) {
    draft.bookId = config.bookId;
    draft.floorMode = config.floorMode || 'custom';
    draft.floorText = config.floorText || '';
    draft.groupMode = config.groupMode ?? false;
    draft.groupSize = config.groupSize ?? 5;
    draft.includeAi = config.includeAi ?? true;
    draft.includeUser = config.includeUser ?? true;
    draft.rpmLimit = config.rpmLimit;
    draft.userRequirement = config.userRequirement;
  }

  function initialize(bookId: string) {
    draft.bookId = bookId;
    draft.floorMode = 'custom';
    draft.floorText = '';
    draft.groupMode = false;
    draft.groupSize = 5;
    draft.includeAi = true;
    draft.includeUser = true;
    draft.rpmLimit = settings.value.generation.rpmLimit;
    draft.userRequirement = '';
    formError.value = '';
  }

  function resetProgress() {
    if (task.value) generationTasks.removeTask(task.value.id);
    formError.value = '';
  }

  function stop() {
    if (task.value) generationTasks.stopNow(task.value.id);
  }

  return { draft, formError, hydrate, initialize, inputsLocked, resetProgress, run, state, stop, task };
}
