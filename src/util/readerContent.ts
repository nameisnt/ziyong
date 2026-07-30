import type { ReaderAppearance } from '@/type/settings';

export function formatReaderContent(value: string, reader: Pick<ReaderAppearance, 'blankLineBetweenLines' | 'firstLineIndent'>) {
  const normalized = String(value || '').replace(/\r\n?/g, '\n');
  if (reader.blankLineBetweenLines) {
    return normalized
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .join('\n\n');
  }
  if (reader.firstLineIndent) {
    return normalized.split('\n').map(line => line.trimStart()).join('\n');
  }
  return value;
}
