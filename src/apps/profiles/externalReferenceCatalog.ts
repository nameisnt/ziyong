import type { PhoneReferenceProviderResult, PhoneReferenceTreeNode } from '@/core/appRegistry';
import { getExternalProfileRowLabel, readExternalProfileTables, type ExternalProfileTable } from './externalBridge';

export function externalProfileReferenceId(sheetKey: string, rowIndex: number) {
  return `profiles:external:${encodeURIComponent(sheetKey)}:${rowIndex}`;
}

function buildReferenceContent(table: ExternalProfileTable, row: ExternalProfileTable['rows'][number]) {
  const title = getExternalProfileRowLabel(table, row);
  const fieldLines = table.columns
    .map(column => {
      const value = row.cells[column.index]?.trim() || '';
      return value ? `${column.label}：${value}` : '';
    })
    .filter(Boolean);
  return [`## ${title}`, ...fieldLines].join('\n');
}

export function createExternalProfileReferenceCatalog(): PhoneReferenceProviderResult {
  const tableNodes: PhoneReferenceTreeNode[] = readExternalProfileTables()
    .map(table => {
      const children: PhoneReferenceTreeNode[] = table.rows.map(row => {
        const title = getExternalProfileRowLabel(table, row);
        const id = externalProfileReferenceId(table.key, row.index);
        return {
          id,
          item: {
            content: buildReferenceContent(table, row),
            id,
            sourcePath: ['资料表', table.name],
            title,
            updatedAt: '',
          },
          kind: 'leaf',
        };
      });
      return children.length
        ? ({ children, id: `profiles:table:${encodeURIComponent(table.key)}`, kind: 'branch', label: table.name } as const)
        : null;
    })
    .filter((node): node is NonNullable<typeof node> => Boolean(node));

  return {
    nodes: tableNodes.length
      ? [{ children: tableNodes, id: 'app:profiles', kind: 'branch', label: '资料表' }]
      : [],
  };
}
