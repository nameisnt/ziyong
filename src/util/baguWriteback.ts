export type BaguWritebackEntry = {
  content: string;
  versions?: ReadonlyArray<{ content: string; id: string }>;
};

export interface BaguWritebackOptions<TEntry extends BaguWritebackEntry> {
  content: string;
  flush: () => void;
  update: (content: string) => TEntry | null | undefined;
  versionId?: string;
}

/**
 * 把八股检测结果写回目标记录：更新失败返回 false；成功时冲刷聊天作用域，
 * 并返回真正落盘的正文，供 BaguScanPanel 校验是否写入成功。
 */
export function applyBaguWriteback<TEntry extends BaguWritebackEntry>(
  options: BaguWritebackOptions<TEntry>,
): string | false {
  const entry = options.update(options.content);
  if (!entry) return false;
  options.flush();
  const versionId = options.versionId || '';
  if (!versionId) return entry.content;
  return entry.versions?.find(version => version.id === versionId)?.content || false;
}
