import type { SettingsDuplicateGroup, SettingsSnapshotFingerprint, SettingsSnapshotSummary } from './model';

export interface SettingsSignature extends SettingsSnapshotFingerprint {
  fields: Map<string, string>;
}

export async function hashSettingsBytes(bytes: ArrayBuffer) {
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, '0')).join('');
}

export async function createSettingsSignature(
  bytes: ArrayBuffer,
  summary: SettingsSnapshotSummary,
): Promise<SettingsSignature> {
  const contentHash = await hashSettingsBytes(bytes);
  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('设置快照根节点不是 JSON 对象');
  const fields = new Map<string, string>();
  async function visit(value: unknown, path: string): Promise<void> {
    if (value !== null && typeof value === 'object') {
      const entries = Object.entries(value);
      fields.set(path, Array.isArray(value) ? 'array' : 'object');
      for (const [key, child] of entries) {
        await visit(child, `${path}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`);
      }
    } else {
      const token = JSON.stringify(value);
      // Large embedded scripts/images must not remain in memory for every snapshot.
      fields.set(
        path,
        token.length > 256 ? `sha256:${await hashSettingsBytes(new TextEncoder().encode(token).buffer)}` : token,
      );
    }
  }
  await visit(parsed, '');
  return { contentHash, fields, summary };
}

export function compareSettingsFields(a: SettingsSignature, b: SettingsSignature) {
  let equal = 0;
  let total = a.fields.size;
  const paths: string[] = [];
  for (const [path, value] of a.fields) {
    if (b.fields.get(path) === value) equal += 1;
    else if (paths.length < 8) paths.push(path || '/');
  }
  for (const path of b.fields.keys()) {
    if (!a.fields.has(path)) {
      total += 1;
      if (paths.length < 8) paths.push(path || '/');
    }
  }
  return { similarity: (equal / total) * 100, paths };
}

export function createSimilarSettingsGroups(items: SettingsSignature[], threshold: number): SettingsDuplicateGroup[] {
  if (!Number.isFinite(threshold) || threshold < 1 || threshold > 100) throw new Error('相似度须为 1 到 100');
  const clusters: SettingsSignature[][] = [];
  const ordered = [...items].sort(
    (a, b) => b.summary.date - a.summary.date || b.summary.name.localeCompare(a.summary.name),
  );
  for (const item of ordered) {
    // Complete-link grouping permits any member to be the single retained snapshot.
    const group = clusters.find(members =>
      members.every(member => compareSettingsFields(member, item).similarity >= threshold),
    );
    if (group) group.push(item);
    else clusters.push([item]);
  }
  const compact = ({ contentHash, summary }: SettingsSignature): SettingsSnapshotFingerprint => ({
    contentHash,
    summary,
  });
  return clusters
    .filter(group => group.length > 1)
    .map(group => {
      let minimumSimilarity = 100;
      const differingPaths = new Set<string>();
      for (let i = 0; i < group.length; i += 1) {
        for (let j = i + 1; j < group.length; j += 1) {
          const comparison = compareSettingsFields(group[i]!, group[j]!);
          minimumSimilarity = Math.min(minimumSimilarity, comparison.similarity);
          for (const path of comparison.paths) if (differingPaths.size < 8) differingPaths.add(path);
        }
      }
      const [keeper, ...duplicates] = group.map(compact);
      return {
        id: keeper!.summary.name,
        keeper: keeper!,
        duplicates,
        minimumSimilarity,
        differingPaths: [...differingPaths],
        reclaimBytes: duplicates.reduce((sum, item) => sum + item.summary.size, 0),
      };
    });
}

export function selectSettingsCleanup(groups: SettingsDuplicateGroup[], keepers: Record<string, string>) {
  return groups.map(group => {
    const members = [group.keeper, ...group.duplicates];
    const keeper = members.find(item => item.summary.name === keepers[group.id]);
    if (!keeper) throw new Error('每组必须选择一份保留快照');
    return { keeper, candidates: members.filter(item => item !== keeper) };
  });
}
