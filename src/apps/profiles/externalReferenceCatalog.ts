import { readExternalMappedRows } from './profileConsumerBridge';
import type { PhoneReferenceProviderResult, PhoneReferenceTreeNode } from '@/core/appRegistry';
import type { ExternalProfileMapping } from './profileMappings';

type ExternalProfileRowReader = typeof readExternalMappedRows;

export function externalProfileReferenceId(mappingId: string, identityValue: string) {
  return `profiles:external:${encodeURIComponent(mappingId)}:${encodeURIComponent(identityValue)}`;
}

function buildReferenceContent(
  mapping: ExternalProfileMapping,
  row: ReturnType<ExternalProfileRowReader>[number],
) {
  const title = row.displayValue.trim() || row.identityValue.trim();
  const fieldLines = mapping.fields
    .map(field => {
      const value = row.fields[field.key]?.trim() || '';
      return value ? `${field.label}：${value}` : '';
    })
    .filter(Boolean);
  return [`## ${title}`, ...fieldLines].join('\n');
}

export function createExternalProfileReferenceCatalog(
  mappings: ExternalProfileMapping[],
  readRows: ExternalProfileRowReader = readExternalMappedRows,
): PhoneReferenceProviderResult {
  const warnings: string[] = [];
  const mappingNodes: PhoneReferenceTreeNode[] = [];

  mappings.forEach(mapping => {
    try {
      const children: PhoneReferenceTreeNode[] = readRows(mapping).map(row => {
        const title = row.displayValue.trim() || row.identityValue.trim();
        const id = externalProfileReferenceId(mapping.id, row.identityValue);
        return {
          id,
          item: {
            content: buildReferenceContent(mapping, row),
            id,
            sourcePath: ['资料表', mapping.name],
            title,
            updatedAt: mapping.updatedAt,
          },
          kind: 'leaf',
        };
      });
      if (children.length) {
        mappingNodes.push({
          children,
          id: `profiles:mapping:${encodeURIComponent(mapping.id)}`,
          kind: 'branch',
          label: mapping.name,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`映射“${mapping.name}”：${message}`);
    }
  });

  return {
    nodes: mappingNodes.length
      ? [
          {
            children: mappingNodes,
            id: 'app:profiles',
            kind: 'branch',
            label: '资料表',
          },
        ]
      : [],
    warnings,
  };
}
