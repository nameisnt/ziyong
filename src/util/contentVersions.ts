import type { ContentVersionBase, ContentVersionOrigin } from '@/type/contentVersion';

export function createContentVersionId(prefix = 'content_version') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createContentVersion<TVersion extends ContentVersionBase>(
  prefix: string,
  input: Omit<TVersion, 'createdAt' | 'id' | 'origin'> &
    Partial<Pick<TVersion, 'createdAt' | 'origin'>>,
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
    activeVersionId: normalized.some(version => version.id === activeVersionId)
      ? activeVersionId
      : normalized[0].id,
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
