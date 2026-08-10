export type GenerationReferenceItem = {
  content: string;
  id: string;
  sourcePath: string[];
  timeLabel?: string;
  title: string;
  unavailable?: boolean;
  updatedAt?: string;
};

function normalizeContent(value: string) {
  return value.trim();
}

export function formatGenerationReferences(items: GenerationReferenceItem[]) {
  const normalizedItems = items
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
