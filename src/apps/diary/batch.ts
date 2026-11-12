export interface DiaryBatchFloorMessage {
  message_id: number;
  role: string;
}

export interface DiaryBatchFloorOptions {
  floorMode: 'all' | 'custom';
  floorText: string;
  includeAi: boolean;
  includeUser: boolean;
}

export interface DiaryBatchJob {
  fromStartEnd: number;
  label: string;
  mode: 'fromStart' | 'range';
  rangeText: string;
  singleMessageId: number;
}

export function parseDiaryBatchFloorText(rawValue: string): number[] {
  const normalized = rawValue.trim();
  if (!normalized) {
    throw new Error('请先填写楼层范围，例如 1-30,35,40-45');
  }

  const segments = normalized
    .split(/[\s,，;；\n]+/)
    .map(item => item.trim())
    .filter(Boolean);
  const floorSet = new Set<number>();

  for (const segment of segments) {
    const singleMatch = segment.match(/^(\d+)$/);
    if (singleMatch) {
      floorSet.add(Number(singleMatch[1]));
      continue;
    }

    const rangeMatch = segment.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!rangeMatch) {
      throw new Error(`无法识别楼层片段：${segment}`);
    }

    const left = Number(rangeMatch[1]);
    const right = Number(rangeMatch[2]);
    const start = Math.min(left, right);
    const end = Math.max(left, right);
    for (let floor = start; floor <= end; floor += 1) {
      floorSet.add(floor);
    }
  }

  return [...floorSet].sort((left, right) => left - right);
}

export function formatDiaryBatchRange(floors: number[]): string {
  if (!floors.length) return '';
  const sorted = [...floors].sort((left, right) => left - right);
  const ranges: Array<{ start: number; end: number }> = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    if (current === end + 1) {
      end = current;
      continue;
    }
    ranges.push({ start, end });
    start = current;
    end = current;
  }
  ranges.push({ start, end });

  return ranges.map(range => (range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`)).join(', ');
}

export function selectDiaryBatchFloors(
  messages: DiaryBatchFloorMessage[],
  options: DiaryBatchFloorOptions,
): number[] {
  if (!options.includeAi && !options.includeUser) {
    throw new Error('请至少选择 AI 楼层或用户楼层');
  }

  const requestedFloors =
    options.floorMode === 'all'
      ? messages.map(message => message.message_id)
      : parseDiaryBatchFloorText(options.floorText);
  const visibleById = new Map(messages.map(message => [message.message_id, message]));
  const floors = requestedFloors.filter(floor => {
    const message = visibleById.get(floor);
    if (!message) return false;
    if (message.role === 'assistant') return options.includeAi;
    if (message.role === 'user') return options.includeUser;
    return false;
  });

  if (!floors.length) {
    throw new Error(
      options.floorMode === 'all'
        ? '当前聊天没有符合条件的可见 AI/用户楼层'
        : '给定范围内没有符合条件的可见 AI/用户楼层',
    );
  }
  return floors;
}

export function buildDiaryBatchJobs(floors: number[], groupMode: boolean, groupSizeInput: number): DiaryBatchJob[] {
  const groupSize = Math.min(50, Math.max(1, Math.round(groupSizeInput || 1)));
  const jobs: DiaryBatchJob[] = [];
  for (let index = 0; index < floors.length; index += groupSize) {
    const group = floors.slice(index, index + groupSize);
    if (!groupMode) {
      const endFloor = group.at(-1)!;
      jobs.push({
        fromStartEnd: endFloor,
        label: `第 0-${endFloor} 楼`,
        mode: 'fromStart',
        rangeText: '',
        singleMessageId: 0,
      });
      continue;
    }
    const rangeText = formatDiaryBatchRange(group);
    jobs.push({
      fromStartEnd: 0,
      label: `第 ${rangeText} 楼`,
      mode: 'range',
      rangeText,
      singleMessageId: 0,
    });
  }
  return jobs;
}
