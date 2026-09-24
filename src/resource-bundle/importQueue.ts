import type { ImportRow, ResourceBundle } from './model';

export async function runBundleImport(
  bundle: ResourceBundle,
  rows: ImportRow[],
  hasCharacterTarget: () => boolean,
  apply: (row: ImportRow) => Promise<{ skipped?: boolean; message: string }>,
  progress: (name: string) => void,
) {
  const root = rows.find(row => !row.item.parentId)!;
  // A preset and its selected attachments are a single write, so partial attachment writes cannot occur.
  const queue = [root, ...rows.filter(row => row !== root)];
  for (const row of queue) {
    if (!row.selected || row.status === 'success' || row.status === 'skipped') continue;
    if (bundle.manifest.kind === 'preset' && row !== root) continue;
    progress(row.item.name);
    try {
      if (row !== root && bundle.manifest.kind === 'worldbook' && root.status === 'failed')
        throw new Error('世界书未导入成功，请先重试世界书');
      if (row.item.kind === 'chat' && !hasCharacterTarget())
        throw new Error('角色卡未导入成功，请选择已有目标角色卡或重试主体');
      const result = await apply(row);
      row.status = result.skipped ? 'skipped' : 'success';
      row.message = result.message;
    } catch (error) {
      row.status = 'failed';
      row.message = error instanceof Error ? error.message : String(error);
    }
    if (bundle.manifest.kind === 'preset') {
      for (const child of rows.filter(child => child.selected && child.item.parentId === root.item.id)) {
        child.status = root.status;
        child.message = root.status === 'success' ? '已随预设导入' : root.message;
      }
    }
  }
}
