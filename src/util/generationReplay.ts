import { getRegisteredPhoneAppReferenceTrees, type PhoneReferenceTreeNode } from '@/core/appRegistry';
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

export function formatMessageIdsAsRanges(messageIds: number[]) {
  const sortedIds = [...new Set(messageIds.filter(id => Number.isInteger(id) && id >= 0))].sort(
    (left, right) => left - right,
  );
  if (!sortedIds.length) return '';

  const ranges: Array<{ end: number; start: number }> = [];
  let start = sortedIds[0]!;
  let end = start;
  sortedIds.slice(1).forEach(id => {
    if (id === end + 1) {
      end = id;
      return;
    }
    ranges.push({ end, start });
    start = id;
    end = id;
  });
  ranges.push({ end, start });
  return ranges
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

function collectReferenceItems(nodes: PhoneReferenceTreeNode[], target: Map<string, GenerationReferenceItem>) {
  nodes.forEach(node => {
    if (node.kind === 'leaf') {
      target.set(node.item.id, node.item);
      return;
    }
    collectReferenceItems(node.children, target);
  });
}

export function resolveSavedGenerationReferences(
  references: GenerationReplaySnapshot['references'],
): GenerationReferenceItem[] {
  const availableItems = new Map<string, GenerationReferenceItem>();
  collectReferenceItems(getRegisteredPhoneAppReferenceTrees(), availableItems);

  return references.map(reference => {
    const current = availableItems.get(reference.id);
    const resolved = current || reference;
    return {
      ...resolved,
      sourcePath: [...resolved.sourcePath],
      unavailable: !current,
    };
  });
}

export function resolveGenerationReplayReferences(replay: GenerationReplaySnapshot): GenerationReferenceItem[] {
  return resolveSavedGenerationReferences(replay.references);
}
