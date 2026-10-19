export const RELEASE_GROUP_SIZE = 5;
export const RELEASE_GROUP_LIMIT = 8;

/**
 * @template T
 * @param {readonly T[]} history Newest first; the complete history is never modified.
 * @returns {T[][]}
 */
export function groupReleaseHistory(history) {
  const groups = [];
  for (
    let start = 0;
    start < Math.min(history.length, RELEASE_GROUP_SIZE * RELEASE_GROUP_LIMIT);
    start += RELEASE_GROUP_SIZE
  )
    groups.push(history.slice(start, start + RELEASE_GROUP_SIZE));
  return groups;
}
