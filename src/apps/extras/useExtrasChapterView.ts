import type { ExtraBook, ExtraChapter } from '@/type/extra';
import type { ComputedRef } from 'vue';

export function useExtrasChapterView(
  activeBook: ComputedRef<ExtraBook | null>,
  activeChapter: ComputedRef<ExtraChapter | null>,
) {
  const orderedChapters = computed(() =>
    [...(activeBook.value?.chapters || [])].sort((left, right) => left.chapterNumber - right.chapterNumber),
  );
  const activeChapterIndex = computed(() =>
    orderedChapters.value.findIndex(chapter => chapter.id === activeChapter.value?.id),
  );
  const previousId = computed(() =>
    activeChapterIndex.value > 0 ? orderedChapters.value[activeChapterIndex.value - 1]?.id || '' : '',
  );
  const nextId = computed(() =>
    activeChapterIndex.value >= 0 ? orderedChapters.value[activeChapterIndex.value + 1]?.id || '' : '',
  );
  const catalogItems = computed(() =>
    orderedChapters.value.map(chapter => ({
      id: chapter.id,
      title: `第 ${chapter.chapterNumber} 章 · ${chapter.title}`,
      versionCount: Math.max(1, chapter.versions.length),
    })),
  );

  return {
    catalogItems,
    nextId,
    orderedChapters,
    previousId,
  };
}
