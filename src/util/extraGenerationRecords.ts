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

export function synchronizeExtraChapterGenerationRecords(chapter: ExtraChapter) {
  if (!chapter.versions.length) return false;

  const records = resolveExtraChapterGenerationRecords(chapter).slice(-10);
  const unchanged =
    records.length === chapter.generationRecords.length &&
    records.every((record, index) => record.id === chapter.generationRecords[index]?.id);
  if (unchanged) return false;

  chapter.generationRecords = records;
  return true;
}
