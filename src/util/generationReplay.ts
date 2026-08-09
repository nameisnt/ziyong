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
  const sourceMode = replay.source.mode;
  const lastMessageId = replay.source.messageIds.at(-1);
  draft.fromStartEnd = numberFromConfig(
    replay.sourceInput || replay.config,
    'fromStartEnd',
    sourceMode === 'fromStart' && typeof lastMessageId === 'number' ? lastMessageId : draft.fromStartEnd,
  );
  draft.rangeText = sourceMode === 'range' ? replay.sourceInput?.rangeText?.trim() || formatReplayRanges(replay) : '';
  draft.recentCount = numberFromConfig(
    replay.sourceInput || replay.config,
    'recentCount',
    sourceMode === 'recent' && replay.source.messageIds.length ? replay.source.messageIds.length : draft.recentCount,
  );
  draft.singleMessageId = numberFromConfig(
    replay.sourceInput || replay.config,
    'singleMessageId',
    sourceMode === 'single' ? (replay.source.messageIds[0] ?? draft.singleMessageId) : draft.singleMessageId,
  );
  const replayRequirement = replay.request.userRequirement;
  const legacyRequirement = replay.config.userRequirement;
  draft.userRequirement =
    typeof replayRequirement === 'string'
      ? replayRequirement
      : typeof legacyRequirement === 'string'
        ? legacyRequirement
        : '';

  return sourceMode as GenerationSourceMode;
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
