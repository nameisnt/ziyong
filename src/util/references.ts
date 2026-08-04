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

  return [
    '[引用内容]',
    '以下内容是本次生成的额外引用资料。请结合来源楼层使用，但不要把引用内容原封不动复制到输出中。',
    ...normalizedItems.map((item, index) =>
      [
        `引用 ${index + 1}`,
        `来源：${item.sourcePath.join(' / ') || '未标注来源'}`,
        item.title ? `标题：${item.title}` : '',
        item.timeLabel ? `时间：${item.timeLabel}` : '',
        '内容：',
        item.content,
      ]
        .filter(Boolean)
        .join('\n'),
    ),
  ].join('\n\n');
}
