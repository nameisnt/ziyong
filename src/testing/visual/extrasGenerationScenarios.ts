import { useRegexDisplayStore } from '@/apps/regex-display/store';
import { useExtrasStore } from '@/store/extras';
import { usePreviewDraftStore } from '@/store/previewDrafts';
import { useGenerationTaskStore } from '@/store/generationTasks';
import { useSettingsStore } from '@/store/settings';

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
  async function verifyTaskState(actionId: string, bookId: string) {
    const tasks = useGenerationTaskStore();
    const task = tasks.createTask({
      appId: 'extras',
      kind: 'single',
      title: 'Generation state fixture',
      total: 1,
      routePage: actionId === 'chapter-generate' ? 'chapter-generate' : 'summary-generate',
      config: {
        actionId,
        resultPage: '',
        resultParams: {},
        resultState: 'pending',
        resultTitle: '',
        sourcePage: '',
        sourceParams: { bookId },
      },
    });
    for (const theme of ['light', 'dark'] as const) {
      useSettingsStore().setTheme(theme);
      tasks.patchTask(task.id, { status: 'running', rawOutput: 'Live chapter output' });
      await context.waitForPaint();
      const panel = document.querySelector('.pc-extras-generation-panel')!;
      const button = [...panel.querySelectorAll<HTMLButtonElement>('button')].find(
        item => item.textContent?.trim() === '生成中',
      );
      if (!button?.disabled) throw new Error('Extras live task did not disable generation button');
      for (const toggle of panel.querySelectorAll<HTMLInputElement>(
        '.pc-extras-summary-options input[type="checkbox"]',
      ))
        if (!toggle.disabled) throw new Error('Extras summary settings remained editable during generation');
      const output = panel.querySelector<HTMLTextAreaElement>('.pc-raw-output textarea');
      if (output?.value !== 'Live chapter output') throw new Error('Extras live task output missing');
      tasks.patchTask(task.id, { status: 'failed', error: 'Fixture failure' });
      await context.waitForPaint();
      if (panel.textContent?.includes('生成中') || !panel.textContent?.includes('Fixture failure'))
        throw new Error('Extras failed task state did not update');
    }
    tasks.removeTask(task.id);
    useSettingsStore().setTheme('light');
    await context.waitForPaint();
  }
  if (name === 'extras-chapter-preview-summary') {
    const extras = useExtrasStore();
    extras.resetCurrentScope();
    const book = extras.createBook({ title: '自动摘要视觉测试', typeName: 'IF线' });
    usePreviewDraftStore().upsertPreviewDraft({
      appId: 'extras',
      page: 'chapter-preview',
      preview: {
        bookId: book.id,
        chapterId: '',
        content: '番外章节正文，用于确认自动摘要文本域与长正文编辑区保持各自的共享高度。',
        draftId: null,
        mode: '续写上一章',
        raw: '<title>自动摘要测试</title><content>番外章节正文</content>',
        summary: '这是自动解析出的章节摘要。\n第二行用于确认多行摘要高度。',
        title: '自动摘要测试',
        warnings: [],
      },
      routeParams: { bookId: book.id },
      title: '番外预览',
    });
    context.resetPhoneToRoute('extras', 'chapter-preview', '番外预览', { bookId: book.id });
    await context.waitForPaint();
    const summary = document.querySelector<HTMLTextAreaElement>('.pc-extras-preview-summary .pc-area');
    if (!summary) throw new Error('Extras chapter preview summary is missing');
    summary.scrollIntoView({ block: 'center' });
    await context.waitForPaint();
    return true;
  }

  if (name === 'extras-book-generate') {
    context.resetPhoneToRoute('extras', 'book-editor', '新建番外');
    await context.waitForPaint();
    const typeSelector = document.querySelector<HTMLInputElement>('.pc-combobox-input');
    if (!typeSelector) throw new Error('Extras type selector is missing');
    typeSelector.click();
    await context.waitForPaint();
    const customOption = [...document.querySelectorAll<HTMLButtonElement>('.pc-combobox-option')].find(button =>
      button.textContent?.includes('+ 自定义'),
    );
    if (!customOption) throw new Error('Extras custom type option is missing');
    customOption.click();
    await context.waitForPaint();
    const customName = document.querySelector<HTMLInputElement>('input[placeholder="自定义类型名称"]');
    const groupField = document.querySelector('.pc-theater-type-group-field');
    const saveSection = [...document.querySelectorAll<HTMLElement>('.pc-section-head')].find(section =>
      section.textContent?.includes('保存到类型库'),
    );
    const saveToggle = saveSection?.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (!customName || !groupField || !saveToggle?.checked) {
      throw new Error('Extras custom type did not expose its name, group, and default library save');
    }
    const screen = document.querySelector<HTMLElement>('.pc-screen');
    screen?.scrollTo({ top: screen.scrollHeight });
    return true;
  }

  if (name === 'extras-summary-rule-select') {
    const extras = useExtrasStore();
    extras.resetCurrentScope();
    const book = extras.createBook({ title: '摘要规则选择测试', typeName: 'IF线' });
    useRegexDisplayStore().addRule({
      id: 'visual-extras-summary-rule',
      name: '用于番外章节摘要提取的超长用户自定义正则规则',
      operation: 'extract',
      pattern: '/<summary>([\\s\\S]*?)<\\/summary>/i',
      replacement: '$1',
    });
    context.resetPhoneToRoute('extras', 'chapter-generate', '生成章节', { bookId: book.id });
    await context.waitForPaint();
    await verifyTaskState('chapter-generate', book.id);
    const parseToggle = document.querySelector<HTMLInputElement>('.pc-extras-summary-options .pc-toggle input');
    if (!parseToggle) throw new Error('Extras summary parser toggle is missing');
    if (!parseToggle.checked) parseToggle.click();
    await context.waitForPaint();
    const removeToggle = document.querySelector<HTMLInputElement>('.pc-extras-summary-remove-row input')!;
    if (removeToggle.disabled) throw new Error('Default summary removal is disabled');
    const before = removeToggle.checked;
    removeToggle.click();
    await context.waitForPaint();
    if (removeToggle.checked === before) throw new Error('Default summary removal did not toggle');
    removeToggle.click();
    const ruleGroup = [...document.querySelectorAll<HTMLElement>('.pc-extras-summary-options .pc-field-group')].find(
      group => group.textContent?.includes('摘要提取规则'),
    );
    const ruleControl = ruleGroup?.querySelector<HTMLElement>('select, .pc-combobox');
    if (!ruleControl) throw new Error('Extras summary rule selector is missing');
    ruleControl.scrollIntoView({ block: 'center' });
    const ruleInput = ruleControl.querySelector<HTMLInputElement>('.pc-combobox-input');
    ruleInput?.click();
    await context.waitForPaint();
    if (ruleInput && !document.querySelector('.pc-combobox-menu')?.textContent?.includes('超长用户自定义正则规则')) {
      throw new Error('Extras summary rule combobox omitted the user-created long rule');
    }
    return true;
  }

  if (name === 'extras-summary-generate') {
    const { book, chapters } = createExtrasSummaryFixture();
    context.resetPhoneToRoute('extras', 'summary-generate', '生成章节总结', { bookId: book.id });
    await context.waitForPaint();
    await verifyTaskState('chapter-summary', book.id);
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
