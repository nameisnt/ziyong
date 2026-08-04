import type { ExtraChapter, ExtraChapterGenerationRecord } from '@/type/extra';

export function resolveExtraChapterGenerationRecords(chapter: ExtraChapter) {
  const source = chapter.versions.length
    ? chapter.versions
        .map(version => version.generationRecord)
        .filter((record): record is ExtraChapterGenerationRecord => Boolean(record))
    : chapter.generationRecords;
  const records = new Map<string, ExtraChapterGenerationRecord>();
  source.forEach(record => records.set(record.id, record));
  return [...records.values()];
}
