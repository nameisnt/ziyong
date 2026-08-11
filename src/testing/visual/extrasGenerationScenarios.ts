import { useExtrasStore } from '@/store/extras';

export function createExtrasSummaryFixture() {
  const extras = useExtrasStore();
  extras.resetCurrentScope();
  const book = extras.createBook({ title: '章节总结顺序测试', typeName: 'IF线' });
  const chapters = Array.from({ length: 5 }, (_, index) =>
    extras.createChapter(book.id, {
      content: `第 ${index + 1} 章原文，不应在目录中消失。`,
      title: `章节 ${index + 1}`,
    }),
  );
  if (chapters.some(chapter => !chapter)) throw new Error('Extras summary fixture creation failed');
  const completeChapters = chapters.filter((chapter): chapter is NonNullable<typeof chapter> => Boolean(chapter));
  extras.createSummary(book.id, {
    content: '第 1-2 章压缩总结。',
    coveredChapterIds: completeChapters.slice(0, 2).map(chapter => chapter.id),
    enabled: true,
  });
  extras.createSummary(book.id, {
    content: '第 4-5 章压缩总结。',
    coveredChapterIds: completeChapters.slice(3, 5).map(chapter => chapter.id),
    enabled: true,
  });
  return { book, chapters: completeChapters };
}

type ExtrasGenerationScenarioContext = {
  resetPhoneToRoute: (appId: string, page: string, title: string, params?: Record<string, string>) => void;
  waitForPaint: () => Promise<void>;
};

export async function applyExtrasGenerationVisualScenario(name: string, context: ExtrasGenerationScenarioContext) {
  if (name === 'extras-book-generate') {
    context.resetPhoneToRoute('extras', 'book-editor', '新建番外');
    await context.waitForPaint();
    const screen = document.querySelector<HTMLElement>('.pc-screen');
    screen?.scrollTo({ top: screen.scrollHeight });
    return true;
  }

  if (name === 'extras-summary-generate') {
    const { book, chapters } = createExtrasSummaryFixture();
    context.resetPhoneToRoute('extras', 'summary-generate', '生成章节总结', { bookId: book.id });
    await context.waitForPaint();
    const chapterOptions = [...document.querySelectorAll<HTMLElement>('.pc-chapter-picks .pc-check-item')];
    const selectedOptions = document.querySelectorAll<HTMLInputElement>('.pc-chapter-picks input:checked');
    if (
      chapterOptions.length !== 1 ||
      !chapterOptions[0]?.textContent?.includes(`第 ${chapters[2]?.chapterNumber} 章`) ||
      selectedOptions.length > 0
    ) {
      throw new Error('Extra summary generation did not show only unprocessed chapters with an empty selection');
    }
    return true;
  }

  return false;
}
