import { RUNNING_VERSION } from '@/core/releaseInfo';
import type { BundleManifest, BundleSource, ExportRow } from './model';

export type ExportChoice = {
  key: string;
  source: BundleSource;
  selected: boolean;
  expanded: boolean;
  chats: ExportRow[] | null;
};

export async function buildSelectedExport(
  choices: ExportChoice[],
  plan: (source: BundleSource) => Promise<{ rows: ExportRow[] }>,
  progress: (name: string) => void,
) {
  const rows: ExportRow[] = [];
  for (const choice of choices.filter(choice => choice.selected)) {
    progress(choice.source.name);
    const current = await plan(choice.source);
    const selectedChats = new Set(choice.chats?.filter(row => row.selected).map(row => row.item.name));
    if ([...selectedChats].some(name => !current.rows.some(row => row.item.kind === 'chat' && row.item.name === name)))
      throw new Error(`${choice.source.name}：所选聊天已不存在，请刷新目录`);
    const selected = current.rows.filter(row => row.item.kind !== 'chat' || selectedChats.has(row.item.name));
    const ids = new Map(selected.map((row, index) => [row.item.id, String(rows.length + index)]));
    for (const row of selected) {
      const id = ids.get(row.item.id)!;
      rows.push({
        ...row,
        selected: true,
        item: {
          ...row.item,
          id,
          path: `resources/${id}.${row.item.path.split('.').pop()}`,
          ...(row.item.parentId ? { parentId: ids.get(row.item.parentId)! } : {}),
        },
      });
    }
  }
  const manifest: BundleManifest = {
    format: 'phone-resource-bundle',
    version: 1,
    pluginVersion: RUNNING_VERSION,
    kind: 'mixed',
    name: '组合导出',
    items: rows.map(row => row.item),
  };
  return { manifest, rows };
}
