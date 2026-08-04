import type { SourceSelection } from '@/type/generation';
import type { GenerationSourceMode } from '@/type/settings';

export type SummaryGenerationSourceMode = GenerationSourceMode;

function buildRanges(messageIds: number[]) {
  if (!messageIds.length) return [];

  const ranges: Array<{ start: number; end: number }> = [];
  let start = messageIds[0];
  let end = messageIds[0];

  for (let index = 1; index < messageIds.length; index += 1) {
    const current = messageIds[index];
    if (current === end + 1) {
      end = current;
      continue;
    }
    ranges.push({ start, end });
    start = current;
    end = current;
  }

  ranges.push({ start, end });
  return ranges;
}

function getRecentCount(value: number) {
  return Math.min(200, Math.max(1, Math.round(value)));
}

function normalizeFloorNumber(value: number, fallback: number) {
  const normalized = Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.max(0, normalized);
}

function parseRangeText(rawValue: string) {
  const normalized = rawValue.trim();
  if (!normalized) {
    throw new Error('请先填写来源范围，例如 12-20, 24, 30-32');
  }

  const segments = normalized
    .split(/[\s,，;；\n]+/)
    .map(item => item.trim())
    .filter(Boolean);

  if (!segments.length) {
    throw new Error('没有识别到有效的范围片段');
  }

  const ranges = segments.map(segment => {
    const singleMatch = segment.match(/^(\d+)$/);
    if (singleMatch) {
      const point = Number(singleMatch[1]);
      return { start: point, end: point };
    }

    const rangeMatch = segment.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!rangeMatch) {
      throw new Error(`无法识别范围片段：${segment}`);
    }

    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);
    return start <= end ? { start, end } : { start: end, end: start };
  });

  const sortedRanges = [...ranges].sort((left, right) => left.start - right.start || left.end - right.end);
  return sortedRanges.reduce<Array<{ start: number; end: number }>>((merged, range) => {
    const previous = merged[merged.length - 1];
    if (!previous || range.start > previous.end + 1) {
      merged.push(range);
      return merged;
    }
    previous.end = Math.max(previous.end, range.end);
    return merged;
  }, []);
}

function formatRanges(ranges: Array<{ start: number; end: number }>) {
  return ranges.map(range => (range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`)).join(', ');
}

function buildLabel(
  mode: GenerationSourceMode,
  selectedMessages: ChatMessage[],
  actualRanges: Array<{ start: number; end: number }>,
  options: {
    fromStartEnd?: number;
    rangeText?: string;
    singleMessageId?: number;
  },
) {
  const lastMessageId = selectedMessages[selectedMessages.length - 1]?.message_id ?? 0;
  if (mode === 'none') return '不使用聊天楼层';
  if (mode === 'latest') return `最新楼层 · 第 ${lastMessageId} 楼`;
  if (mode === 'all') return `全部可见楼层 · ${selectedMessages.length} 楼`;
  if (mode === 'recent') return `最近 ${selectedMessages.length} 楼`;
  if (mode === 'single')
    return `单层 · 第 ${normalizeFloorNumber(options.singleMessageId ?? lastMessageId, lastMessageId)} 楼`;
  if (mode === 'fromStart')
    return `从 0 到 ${normalizeFloorNumber(options.fromStartEnd ?? lastMessageId, lastMessageId)} 楼`;
  if (mode === 'range') return `范围 · 第 ${formatRanges(actualRanges)} 楼`;
  return options.rangeText?.trim() || formatRanges(actualRanges);
}

export function buildSourceSelection(options: {
  mode: SummaryGenerationSourceMode;
  recentCount?: number;
  fromStartEnd?: number;
  singleMessageId?: number;
  rangeText?: string;
  scopeId: string;
  chatIdAtGeneration: string;
  visibleMessages: ChatMessage[];
}) {
  const { chatIdAtGeneration, mode, scopeId, visibleMessages } = options;
  if (!visibleMessages.length && mode !== 'none') {
    throw new Error('当前聊天里没有可用的可见楼层');
  }

  const selectedMessages =
    mode === 'none'
      ? []
      : mode === 'latest'
        ? visibleMessages.slice(-1)
        : mode === 'recent'
          ? visibleMessages.slice(-getRecentCount(options.recentCount ?? 20))
          : mode === 'all'
            ? visibleMessages
            : mode === 'single'
              ? visibleMessages.filter(
                  message => message.message_id === normalizeFloorNumber(options.singleMessageId ?? -1, -1),
                )
              : mode === 'fromStart'
                ? visibleMessages.filter(
                    message => message.message_id <= normalizeFloorNumber(options.fromStartEnd ?? -1, -1),
                  )
                : (() => {
                    const requestedRanges = parseRangeText(options.rangeText || '');
                    return visibleMessages.filter(message =>
                      requestedRanges.some(
                        range => message.message_id >= range.start && message.message_id <= range.end,
                      ),
                    );
                  })();

  if (!selectedMessages.length && mode !== 'none') {
    if (mode === 'single') {
      throw new Error(`第 ${normalizeFloorNumber(options.singleMessageId ?? -1, -1)} 楼当前不可见或不存在`);
    }
    if (mode === 'fromStart') {
      throw new Error(`0-${normalizeFloorNumber(options.fromStartEnd ?? -1, -1)} 范围内没有可见楼层`);
    }
    if (mode === 'range') {
      throw new Error('给定范围内没有可见楼层');
    }
    throw new Error('当前来源模式没有选中任何可见楼层');
  }

  const messageIds = selectedMessages.map(message => message.message_id);
  const ranges = buildRanges(messageIds);
  const lastMessageId = messageIds[messageIds.length - 1] ?? 0;
  const label = buildLabel(mode, selectedMessages, ranges, options);

  const selection: SourceSelection = {
    scopeId,
    chatIdAtGeneration,
    mode,
    ranges,
    messageIds,
    label,
    sortKey: lastMessageId,
  };

  return {
    maxChatHistory: mode === 'none' ? 0 : 'all',
    requiresVisibilityTransaction: mode !== 'none' && selectedMessages.length !== visibleMessages.length,
    selection,
  } satisfies {
    maxChatHistory: 'all' | number;
    requiresVisibilityTransaction: boolean;
    selection: SourceSelection;
  };
}
