import type { ImportRow, ResourceBundle } from './model';

export async function runBundleImport(
  _bundle: ResourceBundle,
  rows: ImportRow[],
  hasCharacterTarget: (parentId: string) => boolean,
  apply: (row: ImportRow) => Promise<{ skipped?: boolean; message: string }>,
  progress: (name: string) => void,
) {
  // A preset and its selected attachments are a single write, so partial attachment writes cannot occur.
  // Import worldbooks before chats so bindings can resolve books from this same package.
  const roots = rows.filter(row => !row.item.parentId);
  roots.sort((a, b) => Number(b.item.kind === 'worldbook') - Number(a.item.kind === 'worldbook'));
  // Finish each character's chats before importing the next character.
  const queue = roots.flatMap(root => [root, ...rows.filter(row => row.item.parentId === root.item.id)]);
  for (const row of queue) {
    if (!row.selected || row.status === 'success' || row.status === 'skipped') continue;
    const parent = rows.find(parent => parent.item.id === row.item.parentId);
    if (parent?.item.kind === 'preset') continue;
    progress(row.item.name);
    try {
      if (parent?.item.kind === 'worldbook' && parent.status === 'failed')
        throw new Error('世界书未导入成功，请先重试世界书');
      if (row.item.kind === 'chat' && !hasCharacterTarget(row.item.parentId!))
        throw new Error('角色卡未导入成功，请选择已有目标角色卡或重试主体');
      const result = await apply(row);
      row.status = result.skipped ? 'skipped' : 'success';
      row.message = result.message;
    } catch (error) {
      row.status = 'failed';
      row.message = error instanceof Error ? error.message : String(error);
    }
    if (row.item.kind === 'preset') {
      for (const child of rows.filter(child => child.selected && child.item.parentId === row.item.id)) {
        child.status = row.status;
        child.message = row.status === 'success' ? '已随预设导入' : row.message;
      }
    }
  }
}
