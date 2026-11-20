/** 带 id 的版本记录，五类写作 App 的版本结构都满足。 */
export interface ContentVersionRef {
  id: string;
}

export type DeleteContentVersionOutcome<TResult> =
  | { previousVersionId: string; result: TResult; status: 'deleted' }
  | { status: 'cancelled' }
  | { status: 'rejected' };

export interface DeleteContentVersionWithFallbackOptions<TVersion extends ContentVersionRef, TResult> {
  /** 删除成功后切到的相邻版本（通常是前一版）。 */
  activate?: (previous: TVersion) => void;
  /** 用户确认框；返回 true 才继续删除。 */
  confirm: (message: string, confirmLabel: string) => Promise<boolean>;
  confirmLabel?: string;
  /** 确认文案，或按「第几个 / 共几个」生成的文案。 */
  confirmMessage: (position: { index: number; total: number }) => string;
  /** 删除成功后跳转；调用方可从 result 里取新的当前版本 id。 */
  navigate?: (result: TResult, previous: TVersion) => void;
  notifySuccess?: (message: string) => void;
  /** 真正删除版本的 store 调用；返回 null 表示 store 拒绝（例如只剩一版）。 */
  remove: () => TResult | null;
  successMessage?: string;
  versionId: string;
  versions: TVersion[];
}

/**
 * 删除单个版本的统一流程：校验版本数量 → 确认 → 删除 → 切到前一版 → 跳转 → 提示。
 * 各 App 只需提供自己的 store 调用、文案和路由。
 */
export async function deleteContentVersionWithFallback<TVersion extends ContentVersionRef, TResult>(
  options: DeleteContentVersionWithFallbackOptions<TVersion, TResult>,
): Promise<DeleteContentVersionOutcome<TResult>> {
  const { versionId, versions } = options;
  if (versions.length <= 1) return { status: 'rejected' };
  const removedIndex = versions.findIndex(version => version.id === versionId);
  if (removedIndex < 0) return { status: 'rejected' };
  const previous = versions[(removedIndex - 1 + versions.length) % versions.length];
  const confirmed = await options.confirm(
    options.confirmMessage({ index: removedIndex + 1, total: versions.length }),
    options.confirmLabel ?? '删除此版本',
  );
  if (!confirmed) return { status: 'cancelled' };
  const result = options.remove();
  if (!result) return { status: 'rejected' };
  options.activate?.(previous);
  options.navigate?.(result, previous);
  if (options.successMessage) options.notifySuccess?.(options.successMessage);
  return { previousVersionId: previous.id, result, status: 'deleted' };
}
