import type { ContentVersionBase, ContentVersionOrigin } from '@/type/contentVersion';

export function createContentVersionId(prefix = 'content_version') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createContentVersion<TVersion extends ContentVersionBase>(
  prefix: string,
  input: Omit<TVersion, 'createdAt' | 'id' | 'origin'> & Partial<Pick<TVersion, 'createdAt' | 'origin'>>,
): TVersion {
  return {
    ...input,
    createdAt: input.createdAt || new Date().toISOString(),
    id: createContentVersionId(prefix),
    origin: input.origin || ('rewrite' satisfies ContentVersionOrigin),
  } as TVersion;
}

export function ensureContentVersions<TVersion extends ContentVersionBase>(
  versions: TVersion[],
  activeVersionId: string,
  createOriginal: () => Omit<TVersion, 'createdAt' | 'id' | 'origin'> & Partial<Pick<TVersion, 'createdAt'>>,
  prefix: string,
) {
  const normalized = [...versions];
  if (!normalized.length) {
    normalized.push(
      createContentVersion<TVersion>(prefix, {
        ...createOriginal(),
        origin: 'original',
      }),
    );
  }
  return {
    activeVersionId: normalized.some(version => version.id === activeVersionId) ? activeVersionId : normalized[0].id,
    versions: normalized,
  };
}

export function resolveContentVersion<TVersion extends ContentVersionBase>(
  versions: TVersion[],
  activeVersionId: string,
  viewedVersionId = '',
) {
  return (
    versions.find(version => version.id === viewedVersionId) ||
    versions.find(version => version.id === activeVersionId) ||
    versions[0] ||
    null
  );
}

export function removeContentVersion<TVersion extends ContentVersionBase>(
  versions: TVersion[],
  activeVersionId: string,
  versionId: string,
) {
  if (versions.length <= 1) return null;
  const removedIndex = versions.findIndex(version => version.id === versionId);
  if (removedIndex < 0) return null;

  const normalizedActiveId = versions.some(version => version.id === activeVersionId)
    ? activeVersionId
    : versions[0].id;
  const remainingVersions = versions.filter(version => version.id !== versionId);
  let nextActiveVersionId = normalizedActiveId;

  if (versionId === normalizedActiveId) {
    const replacementIndex = removedIndex > 0 ? removedIndex - 1 : 0;
    nextActiveVersionId = remainingVersions[replacementIndex]?.id || remainingVersions[0].id;
  }

  const activeVersion = remainingVersions.find(version => version.id === nextActiveVersionId) || remainingVersions[0];
  return {
    activeVersion,
    activeVersionId: activeVersion.id,
    removedVersion: versions[removedIndex],
    versions: remainingVersions,
  };
}
