import { referenceText } from './referenceText';
import { type ContentCleanupSnapshot } from '@/type/contentVersion';
import { applyContentCleanup } from './contentCleanupApply';

export type GenerationReferenceItem = {
  cleanup?: ContentCleanupSnapshot;
  content: string;
  floorEnd?: number;
  id: string;
  sourcePath: string[];
  timeLabel?: string;
  title: string;
  unavailable?: boolean;
  updatedAt?: string;
};

function normalizeContent(value: string) {
  return referenceText(value);
}

/** 引用候选是否还留有正文：正文清理把它清空的条目不应出现在候选里。 */
export function referenceHasContent(item: Pick<GenerationReferenceItem, 'cleanup' | 'content'>) {
  if (!normalizeContent(item.content)) return false;
  return Boolean(applyContentCleanup(item.content, item.cleanup).content.trim());
}

export function formatGenerationReferences(items: GenerationReferenceItem[]) {
  const normalizedItems = items
    .filter(referenceHasContent)
    .map(item => ({
      ...item,
      content: normalizeContent(item.content),
      sourcePath: item.sourcePath.filter(Boolean),
      timeLabel: item.timeLabel?.trim() || '',
      title: item.title.trim(),
    }))
    .filter(item => item.content);

  if (!normalizedItems.length) return '';

  return normalizedItems.map(item => item.content).join('\n\n');
}
