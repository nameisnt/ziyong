import type { ExtraBook, ExtraChapter, ExtraSummary } from '@/type/extra';

function resolveCoveredChapters(book: ExtraBook, summary: ExtraSummary, includedChapterIds?: Set<string>) {
  const chapterById = new Map(book.chapters.map(chapter => [chapter.id, chapter]));
  const seen = new Set<string>();
  return summary.coveredChapterIds
    .filter(chapterId => {
      if (seen.has(chapterId)) return false;
      seen.add(chapterId);
      return !includedChapterIds || includedChapterIds.has(chapterId);
    })
    .map(chapterId => chapterById.get(chapterId))
    .filter((chapter): chapter is ExtraChapter => Boolean(chapter))
    .sort((left, right) => left.chapterNumber - right.chapterNumber);
}

export function getEnabledSummaryCoveredChapterIds(book: ExtraBook, excludeSummaryId = '') {
  const chapterIds = new Set(book.chapters.map(chapter => chapter.id));
  return new Set(
    book.summaries
      .filter(summary => summary.enabled && summary.id !== excludeSummaryId && summary.content.trim())
      .flatMap(summary => summary.coveredChapterIds.filter(chapterId => chapterIds.has(chapterId))),
  );
}

export function getSummarizableChapters(book: ExtraBook, excludeSummaryId = '') {
  const coveredChapterIds = getEnabledSummaryCoveredChapterIds(book, excludeSummaryId);
  return [...book.chapters]
    .filter(chapter => !coveredChapterIds.has(chapter.id))
    .sort((left, right) => left.chapterNumber - right.chapterNumber);
}

function formatSummaryLabel(chapters: ExtraChapter[]) {
  return `${chapters.map(chapter => `第 ${chapter.chapterNumber} 章`).join('、')}总结`;
}

export function buildExtraHistoryContext(book: ExtraBook, chapters: ExtraChapter[]) {
  const orderedChapters = [...chapters].sort((left, right) => left.chapterNumber - right.chapterNumber);
  const includedChapterIds = new Set(orderedChapters.map(chapter => chapter.id));
  const occupiedChapterIds = new Set<string>();

  // Newer summaries win only when legacy data contains overlapping enabled ranges.
  const acceptedSummaries = [...book.summaries]
    .filter(summary => summary.enabled && summary.content.trim() && summary.coveredChapterIds.length > 0)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .flatMap(summary => {
      const coveredChapters = resolveCoveredChapters(book, summary, includedChapterIds);
      const coversOnlyIncludedChapters =
        coveredChapters.length > 0 && summary.coveredChapterIds.every(chapterId => includedChapterIds.has(chapterId));
      if (!coversOnlyIncludedChapters || coveredChapters.some(chapter => occupiedChapterIds.has(chapter.id))) return [];
      coveredChapters.forEach(chapter => occupiedChapterIds.add(chapter.id));
      return [{ coveredChapters, summary }];
    })
    .sort(
      (left, right) =>
        left.coveredChapters[0]!.chapterNumber - right.coveredChapters[0]!.chapterNumber ||
        left.coveredChapters.at(-1)!.chapterNumber - right.coveredChapters.at(-1)!.chapterNumber,
    );

  const summaryByFirstChapterId = new Map(acceptedSummaries.map(item => [item.coveredChapters[0]!.id, item] as const));
  const blocks: string[] = [];

  orderedChapters.forEach(chapter => {
    const summaryItem = summaryByFirstChapterId.get(chapter.id);
    if (summaryItem) {
      blocks.push(`${formatSummaryLabel(summaryItem.coveredChapters)}\n${summaryItem.summary.content.trim()}`);
      return;
    }
    if (occupiedChapterIds.has(chapter.id)) return;
    blocks.push([`第 ${chapter.chapterNumber} 章 · ${chapter.title}`, chapter.content].join('\n'));
  });

  return blocks.join('\n\n');
}
