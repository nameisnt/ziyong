import type { SourceSelection } from '@/type/generation';

export function getSourceLastFloor(source: Pick<SourceSelection, 'messageIds'> | null | undefined) {
  if (!source?.messageIds.length) return undefined;
  return source.messageIds.reduce((lastFloor, floor) => Math.max(lastFloor, floor), 0);
}
