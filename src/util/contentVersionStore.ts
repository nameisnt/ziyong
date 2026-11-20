import type { ContentVersionBase } from '@/type/contentVersion';
import { createContentVersion, ensureContentVersions, removeContentVersion } from '@/util/contentVersions';

/** 带版本的记录：正文、标题等展示字段从当前版本同步而来。 */
export interface VersionedContentHolder<TVersion extends ContentVersionBase> {
  activeVersionId: string;
  versions: TVersion[];
}

/** 新版本草稿：id、创建时间、来源由 createContentVersion 统一补齐。 */
export type ContentVersionDraft<TVersion extends ContentVersionBase> = Omit<TVersion, 'createdAt' | 'id' | 'origin'> &
  Partial<Pick<TVersion, 'createdAt' | 'origin'>>;

export interface AppendVersionOptions<TVersion extends ContentVersionBase> {
  /** 旧记录没有版本时，用当前正文补出的原始版本。 */
  createOriginal: () => ContentVersionDraft<TVersion>;
  /** 本次要追加的新版本内容。 */
  buildVersion: () => ContentVersionDraft<TVersion>;
  /** 版本数量变化后同步外部关联数据，例如正则显示规则的用法迁移。 */
  onVersionsChanged?: (versions: TVersion[]) => void;
  /** 把某个版本的内容同步到记录本身（标题、正文、生成记录等）。 */
  syncFromVersion: (version: TVersion) => void;
}

/** 追加新版本并激活；旧记录会自动补一条原始版本。 */
export function appendContentVersion<TVersion extends ContentVersionBase>(
  holder: VersionedContentHolder<TVersion>,
  prefix: string,
  options: AppendVersionOptions<TVersion>,
): TVersion {
  const state = ensureContentVersions<TVersion>(holder.versions, holder.activeVersionId, options.createOriginal, prefix);
  const version = createContentVersion<TVersion>(prefix, options.buildVersion());
  holder.versions = [...state.versions, version];
  holder.activeVersionId = version.id;
  options.onVersionsChanged?.(holder.versions);
  options.syncFromVersion(version);
  return version;
}

/** 切换当前版本；找不到版本时返回 null。 */
export function activateContentVersion<TVersion extends ContentVersionBase>(
  holder: VersionedContentHolder<TVersion>,
  versionId: string,
  syncFromVersion: (version: TVersion) => void,
): TVersion | null {
  const version = holder.versions.find(item => item.id === versionId);
  if (!version) return null;
  holder.activeVersionId = version.id;
  syncFromVersion(version);
  return version;
}

/** 修改指定版本；改的是当前版本时同步记录本身。 */
export function updateContentVersion<TVersion extends ContentVersionBase>(
  holder: VersionedContentHolder<TVersion>,
  versionId: string,
  patch: Partial<TVersion>,
  syncFromVersion: (version: TVersion) => void,
): TVersion | null {
  const version = holder.versions.find(item => item.id === versionId);
  if (!version) return null;
  Object.assign(version, patch);
  if (holder.activeVersionId === version.id) syncFromVersion(version);
  return version;
}

export interface DeleteVersionOptions {
  /** 删除版本时清理与该版本绑定的外部数据，例如正则显示规则用法。 */
  onVersionRemoved?: (versionId: string) => void;
}

/** 删除指定版本并切到相邻版本；只剩一个版本时返回 null。 */
export function deleteContentVersion<TVersion extends ContentVersionBase>(
  holder: VersionedContentHolder<TVersion>,
  versionId: string,
  syncFromVersion: (version: TVersion) => void,
  options: DeleteVersionOptions = {},
): TVersion | null {
  const state = removeContentVersion(holder.versions, holder.activeVersionId, versionId);
  if (!state) return null;
  options.onVersionRemoved?.(versionId);
  holder.versions = state.versions;
  holder.activeVersionId = state.activeVersionId;
  syncFromVersion(state.activeVersion);
  return state.activeVersion;
}
