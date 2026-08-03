import type { GenerationReplaySnapshot } from '@/type/generation';
import type { GenerationSourceMode } from '@/type/settings';
import type { GenerationReferenceItem } from '@/util/references';

export type ReplayGenerationDraft = {
  fromStartEnd: number;
  rangeText: string;
  recentCount: number;
  singleMessageId: number;
  userRequirement: string;
};

function numberFromConfig(config: Record<string, unknown>, key: string, fallback: number) {
  const value = config[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function formatReplayRanges(replay: GenerationReplaySnapshot) {
  return replay.source.ranges
    .map(range => (range.start === range.end ? String(range.start) : `${range.start}-${range.end}`))
    .join(', ');
}

export function restoreGenerationReplayDraft(replay: GenerationReplaySnapshot, draft: ReplayGenerationDraft) {
  const rangeText = formatReplayRanges(replay);
  draft.fromStartEnd = numberFromConfig(replay.config, 'fromStartEnd', draft.fromStartEnd);
  draft.rangeText = rangeText;
  draft.recentCount = numberFromConfig(replay.config, 'recentCount', draft.recentCount);
  draft.singleMessageId = numberFromConfig(replay.config, 'singleMessageId', draft.singleMessageId);
  draft.userRequirement = replay.request.userRequirement || '';

  return (rangeText ? 'range' : replay.source.mode) as GenerationSourceMode;
}

export function cloneReplayReferences(replay: GenerationReplaySnapshot): GenerationReferenceItem[] {
  return replay.references.map(reference => ({
    ...reference,
    sourcePath: [...reference.sourcePath],
  }));
}
