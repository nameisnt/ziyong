import { useDiaryStore } from '@/store/diary';
import { useGenerationAliasesStore } from '@/store/generationAliases';
import { useGenerationTaskStore } from '@/store/generationTasks';
import { useLettersStore } from '@/store/letters';
import { usePreviewDraftStore } from '@/store/previewDrafts';
import { useSettingsStore } from '@/store/settings';
import { useSummaryStore } from '@/store/summary';
import type { HiddenGenerationRecord } from '@/type/generation';
import { buildItemTransfer, previewItemTransfer } from '@/util/itemTransfer';

interface ContentBookScenarioDependencies {
  createHiddenGenerationRecord: (
    actionId: string,
    userRequirement: string,
    config?: Record<string, unknown>,
  ) => HiddenGenerationRecord;
  openReaderCatalog: () => Promise<void>;
  resetPhoneToRoute: (appId: string, page: string, title: string, params?: Record<string, string>) => void;
  waitForCondition: (condition: () => boolean, timeout?: number) => Promise<boolean>;
  waitForPaint: () => Promise<void>;
}

export function createSummaryFixture() {
  const summary = useSummaryStore();
  summary.resetCurrentScope();
  const book = summary.createBook('第一卷剧情总结');
  summary.createEntry(book.id, {
    content: '主角在雨夜确认了新的线索，但尚未知道线索来自谁。',
    rangeLabel: '第 1-12 楼',
    title: '雨夜线索',
  });
  summary.createEntry(book.id, {
    content: '两人的关系因一次隐瞒出现裂痕，重要物品暂时由配角保管。',
    rangeLabel: '第 13-24 楼',
    title: '关系转折',
  });
  return book;
}

export function createDiaryFixture() {
  const diary = useDiaryStore();
  diary.resetCurrentScope();
  const book = diary.ensureBook({ name: '林见夏' }, '林见夏的日记');
  diary.createEntry({
    bookId: book.id,
    content: '雨停以后，我终于把那封信从抽屉里拿了出来。',
    kind: 'normal',
    occurredAt: '第三日 · 夜晚',
    perspective: { name: '林见夏' },
    readers: [],
    title: '雨后的信',
  });
  diary.createEntry({
    bookId: book.id,
    content: '港口的灯一盏一盏熄灭，我仍然没有等到约定的人。',
    kind: 'normal',
    occurredAt: '第四日 · 凌晨',
    perspective: { name: '林见夏' },
    readers: [],
    title: '没有赴约的人',
  });
  return book;
}

export function createLettersFixture() {
  const letters = useLettersStore();
  letters.resetCurrentScope();
  const book = letters.ensureBook([{ name: '林见夏' }, { name: '周临川' }], '未寄出的往来信');
  letters.createEntry({
    bookId: book.id,
    content: '你说雨停后会回来，所以我一直把窗边那盏灯留着。',
    format: 'formal',
    receiver: { name: '周临川' },
    sender: { name: '林见夏' },
    title: '第一封信',
  });
  letters.createEntry({
    bookId: book.id,
    content: '港口的事已经办完。等我回去，再告诉你那晚没有说完的话。',
    format: 'formal',
    receiver: { name: '林见夏' },
    sender: { name: '周临川' },
    title: '迟来的回信',
  });
  return book;
}

export async function applyContentBookVisualScenario(name: string, dependencies: ContentBookScenarioDependencies) {
  const { openReaderCatalog, resetPhoneToRoute, waitForCondition, waitForPaint } = dependencies;
  if (!/^(summary|diary|letters)-/.test(name)) return false;

  if (name === 'summary-create') {
    resetPhoneToRoute('summary', 'create-book', '生成总结');
  } else if (name === 'summary-book') {
    const book = createSummaryFixture();
    resetPhoneToRoute('summary', 'book', book.title, { bookId: book.id });
    await waitForPaint();
    document
      .querySelector<HTMLButtonElement>('.pc-summary-book-page > .pc-directory-toolbar .pc-action-menu > summary')
      ?.click();
    await waitForPaint();
    const importButton = [
      ...document.querySelectorAll<HTMLButtonElement>('.pc-summary-book-page > .pc-directory-toolbar button'),
    ].find(button => button.textContent?.includes('导入单条总结'));
    if (!importButton) throw new Error('Summary list did not expose the shared single-item import action');
    importButton.click();
    await waitForPaint();
    if (!document.querySelector('.pc-item-transfer-dialog')) {
      throw new Error('Summary single-item import action did not open the shared import dialog');
    }
    const fileInput = document.querySelector<HTMLInputElement>('.pc-item-transfer-dialog input[type="file"]');
    const sourceEntry = book.entries[0];
    if (!fileInput || !sourceEntry)
      throw new Error('Summary import dialog did not expose its file input or fixture item');
    const file = new File(
      [JSON.stringify(buildItemTransfer('summary', { bookId: book.id, entryId: sourceEntry.id }))],
      'summary-item.json',
      { type: 'application/json' },
    );
    Object.defineProperty(fileInput, 'files', { configurable: true, value: [file] });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    if (
      !(await waitForCondition(
        () => document.querySelectorAll('.pc-item-transfer-dialog .pc-segment-btn').length === 2,
      ))
    ) {
      throw new Error('Summary import dialog did not preview its same-id copy/replace choices');
    }
    document.querySelector<HTMLButtonElement>('.pc-item-transfer-dialog button[aria-label="关闭"]')?.click();
    await waitForPaint();
  } else if (name === 'summary-entry-detail' || name === 'summary-entry-editor' || name === 'summary-bagu') {
    const book = createSummaryFixture();
    const entry = book.entries[0];
    if (!entry) throw new Error('Summary fixture did not create an entry');
    const page = name === 'summary-entry-detail' ? 'entry' : name === 'summary-entry-editor' ? 'editor' : 'bagu-scan';
    const title =
      name === 'summary-entry-detail' ? entry.title : name === 'summary-entry-editor' ? '编辑总结' : '八股检测';
    resetPhoneToRoute('summary', page, title, { bookId: book.id, entryId: entry.id });
    if (name === 'summary-entry-detail') {
      await waitForPaint();
      document.querySelector<HTMLButtonElement>('.pc-reader-tool-trigger')?.click();
      await waitForPaint();
      const exportButton = [...document.querySelectorAll<HTMLButtonElement>('.pc-reader-tool-menu button')].find(
        button => button.textContent?.includes('导出本条'),
      );
      if (!exportButton) throw new Error('Summary detail did not expose its single-item export action');
      const payload = buildItemTransfer('summary', { bookId: book.id, entryId: entry.id });
      if (!previewItemTransfer('summary', payload, { bookId: book.id }).conflict) {
        throw new Error('Summary transfer preview did not detect the same-id target conflict');
      }
      document.querySelector<HTMLButtonElement>('.pc-reader-tool-trigger')?.click();
      await waitForPaint();
      await openReaderCatalog();
    }
  } else if (name === 'summary-import' || name === 'summary-generate' || name === 'summary-batch') {
    const book = createSummaryFixture();
    if (name === 'summary-batch') {
      const generationRecord = dependencies.createHiddenGenerationRecord('generate', '批量中途预览');
      generationRecord.reasoning = '先整理楼层事件，再归纳本段剧情推进。';
      const firstJobId = 'visual_summary_batch_1_5';
      const tasks = useGenerationTaskStore();
      const task = tasks.createTask({
        appId: 'summary',
        config: {
          bookId: book.id,
          previews: [
            {
              content: '第一批已经生成，但整批任务仍在继续。',
              generationRecord,
              jobId: firstJobId,
              label: '第 1-5 楼',
              rawOutput:
                '<result><title>第一批预览</title><content>第一批已经生成，但整批任务仍在继续。</content></result>',
              rawOutputSemantics: 'original-v1',
              replay: generationRecord.replay,
              source: generationRecord.replay.source,
              title: '第一批预览',
              warnings: [],
            },
          ],
        },
        jobs: [
          {
            error: '',
            fromStartEnd: 0,
            id: firstJobId,
            label: '第 1-5 楼',
            mode: 'range',
            rangeText: '1-5',
            singleMessageId: 0,
            status: 'preview',
          },
          {
            error: '',
            fromStartEnd: 0,
            id: 'visual_summary_batch_6_10',
            label: '第 6-10 楼',
            mode: 'range',
            rangeText: '6-10',
            singleMessageId: 0,
            status: 'pending',
          },
        ],
        kind: 'summary-batch',
        routePage: 'batch-generate',
        routeParams: { bookId: book.id },
        title: `批量总结 · ${book.title}`,
      });
      tasks.patchTask(task.id, {
        currentJobIndex: 1,
        currentLabel: '第 6-10 楼',
        previewCount: 1,
        status: 'running',
      });
    }
    const page =
      name === 'summary-import' ? 'import-chat' : name === 'summary-generate' ? 'generate' : 'batch-generate';
    const title =
      name === 'summary-import' ? '导入 AI 楼层' : name === 'summary-generate' ? '生成总结' : '批量生成总结';
    resetPhoneToRoute('summary', page, title, { bookId: book.id });
    if (name === 'summary-generate') {
      await waitForPaint();
      if (!document.querySelector('.pc-generation-form-page .pc-generation-panel')) {
        throw new Error('Summary generate page did not render the shared generation panel after extraction');
      }
    }
  } else if (name === 'summary-preview') {
    const book = createSummaryFixture();
    usePreviewDraftStore().upsertPreviewDraft({
      appId: 'summary',
      page: 'preview',
      preview: {
        bookId: book.id,
        content: '雨夜之后，角色关系发生了明确转折。',
        draftId: null,
        raw: '<summary><title>雨夜转折</title><content>雨夜之后，角色关系发生了明确转折。</content></summary>',
        source: { floorEnd: 24, label: '第 13-24 楼' },
        title: '雨夜转折',
        warnings: [],
      },
      routeParams: { bookId: book.id },
      title: '生成预览',
    });
    resetPhoneToRoute('summary', 'preview', '生成预览', { bookId: book.id });
    if (!(await waitForCondition(() => Boolean(document.querySelector('.pc-shared-generation-preview-page'))))) {
      throw new Error('Summary preview page did not restore its persisted preview after extraction');
    }
  } else if (name === 'summary-failed-draft' || name === 'summary-failed-draft-reparse') {
    const book = createSummaryFixture();
    const draft = useSummaryStore().createFailedDraft({
      actionId: 'generate',
      appId: 'summary',
      context: { bookId: book.id },
      rawOutput: '<summary><title>未闭合标题</title><content>等待修复的正文',
      source: visualSource('visual-summary-chat', 5, 12),
      warnings: ['缺少结束标签'],
    });
    resetPhoneToRoute('summary', 'failed-draft', '解析失败草稿', { bookId: book.id, draftId: draft.id });
  } else if (name === 'diary-perspective-alias' || name === 'diary-perspective-alias-dark') {
    const diary = useDiaryStore();
    const aliases = useGenerationAliasesStore();
    useSettingsStore().setTheme(name.endsWith('-dark') ? 'dark' : 'light');
    diary.resetCurrentScope();
    aliases.charReplacement = '';
    const book = diary.ensureBook({ name: '{{char}}' });
    const created = diary.createEntry({
      bookId: book.id,
      content: '用于确认旧日记视角宏会修正为当前角色名。',
      kind: 'normal',
      occurredAt: '',
      perspective: { name: '{{char}}' },
      readers: [{ name: '{{char}}' }],
      title: '视角宏修复',
    });
    if (!created) throw new Error('Diary perspective alias fixture did not create its entry');
    const entryId = created.entry.id;
    resetPhoneToRoute('diary', 'root', '日记');
    if (
      !(await waitForCondition(() => {
        const currentBook = diary.getBook(book.id);
        const currentEntry = currentBook?.entries.find(candidate => candidate.id === entryId);
        return (
          currentBook?.title === '测试角色的日记' &&
          currentBook.perspective.name === '测试角色' &&
          currentEntry?.perspective.name === '测试角色' &&
          currentEntry.readers?.[0]?.name === '测试角色' &&
          Boolean(document.querySelector('.pc-bookshelf')?.textContent?.includes('测试角色的日记'))
        );
      }))
    ) {
      const currentBook = diary.getBook(book.id);
      const currentEntry = currentBook?.entries.find(candidate => candidate.id === entryId);
      throw new Error(
        `Diary perspective alias did not repair the stored book and entry identity: ${JSON.stringify({
          alias: aliases.charReplacement,
          book: currentBook
            ? {
                entryPerspective: currentEntry?.perspective.name,
                perspective: currentBook.perspective.name,
                reader: currentEntry?.readers?.[0]?.name,
                title: currentBook.title,
              }
            : null,
          scopeKey: diary.scopeKey,
          shelf: document.querySelector('.pc-bookshelf')?.textContent?.trim() || '',
        })}`,
      );
    }
  } else if (name === 'diary-creation-mode' || name === 'diary-batch') {
    if (name === 'diary-batch') {
      resetPhoneToRoute('diary', 'batch-generate', '批量生成日记');
    } else {
      resetPhoneToRoute('diary', 'root', '日记');
      await waitForPaint();
      document.querySelector<HTMLButtonElement>('.pc-diary-catalog-page .pc-book-item:last-child')?.click();
      await waitForPaint();
      if (!document.querySelector('.pc-creation-modal')) throw new Error('Diary creation modal did not open');
    }
  } else if (
    name === 'diary-book' ||
    name === 'diary-entry-editor' ||
    name === 'diary-entry-editor-dark' ||
    name === 'diary-bagu' ||
    name === 'diary-generate' ||
    name === 'diary-entry-detail'
  ) {
    const book = createDiaryFixture();
    const entry = book.entries[0];
    if (name === 'diary-entry-detail' && entry) {
      entry.generationRecord = dependencies.createHiddenGenerationRecord('generate', '日记来源可视化夹具');
    }
    const page =
      name === 'diary-book'
        ? 'book'
        : name === 'diary-entry-editor' || name === 'diary-entry-editor-dark'
          ? 'editor'
          : name === 'diary-bagu'
            ? 'bagu-scan'
            : name === 'diary-generate'
              ? 'generate'
              : 'entry';
    const title =
      name === 'diary-book'
        ? book.title
        : name === 'diary-entry-editor' || name === 'diary-entry-editor-dark'
          ? '编辑日记'
          : name === 'diary-bagu'
            ? '八股检测'
            : name === 'diary-generate'
              ? '生成日记'
              : entry?.title || '日记';
    resetPhoneToRoute(
      'diary',
      page,
      title,
      page === 'book' || page === 'generate' ? { bookId: book.id } : { bookId: book.id, entryId: entry?.id || '' },
    );
    if (name === 'diary-entry-detail') {
      await waitForPaint();
      if (!document.querySelector('.pc-reader-source-label')?.textContent?.includes('最近 7 楼')) {
        throw new Error('Diary detail omitted its generation source label');
      }
      await openReaderCatalog();
    }
  } else if (name === 'diary-preview') {
    const book = createDiaryFixture();
    usePreviewDraftStore().upsertPreviewDraft({
      appId: 'diary',
      page: 'preview',
      preview: {
        action: 'generate',
        bookId: book.id,
        bookTitle: book.title,
        content: '雨停以后，她终于写下了没有说出口的话。',
        draftId: null,
        occurredAt: '昨夜 23:10',
        perspective: book.perspective,
        raw: '<diary><title>雨停以后</title><content>雨停以后，她终于写下了没有说出口的话。</content></diary>',
        sourceBookId: '',
        sourceEntryId: '',
        sourceFloorEnd: 18,
        title: '雨停以后',
        warnings: [],
      },
      routeParams: { bookId: book.id },
      title: '日记预览',
    });
    resetPhoneToRoute('diary', 'preview', '日记预览', { bookId: book.id });
  } else if (name === 'diary-failed-draft' || name === 'diary-failed-draft-reparse') {
    const book = createDiaryFixture();
    const draft = useDiaryStore().createFailedDraft({
      actionId: 'generate',
      appId: 'diary',
      context: { bookId: book.id },
      rawOutput: '<diary><title>未闭合</title><content>等待修复的日记',
      source: visualSource('visual-diary-chat', 8, 18),
      warnings: ['缺少结束标签'],
    });
    resetPhoneToRoute('diary', 'failed-draft', '解析失败草稿', { bookId: book.id, draftId: draft.id });
  } else if (name === 'letters-generate') {
    resetPhoneToRoute('letters', 'generate', '生成书信');
  } else if (name.startsWith('letters-')) {
    await applyLettersScenario(name, dependencies);
  } else {
    return false;
  }
  return true;
}

async function applyLettersScenario(name: string, dependencies: ContentBookScenarioDependencies) {
  const book = createLettersFixture();
  const entry = book.entries[0];
  if (!entry) throw new Error('Letters fixture did not create an entry');
  if (name === 'letters-preview') {
    usePreviewDraftStore().upsertPreviewDraft({
      appId: 'letters',
      page: 'preview',
      preview: {
        bookId: book.id,
        bookTitle: book.title,
        content: '这封信写在雨停以后，也许永远不会寄出。',
        draftId: null,
        format: entry.format,
        mode: 'create',
        raw: '<letter><title>雨停以后</title><content>这封信写在雨停以后，也许永远不会寄出。</content></letter>',
        receiver: entry.receiver,
        sender: entry.sender,
        targetEntryId: '',
        targetVersionId: '',
        title: '雨停以后',
        warnings: [],
      },
      routeParams: { bookId: book.id },
      title: '生成预览',
    });
    dependencies.resetPhoneToRoute('letters', 'preview', '生成预览', { bookId: book.id });
    return;
  }
  if (name === 'letters-failed-draft' || name === 'letters-failed-draft-reparse') {
    const draft = useLettersStore().createFailedDraft({
      actionId: 'generate',
      appId: 'letters',
      context: { bookId: book.id },
      rawOutput: '<letter><title>未闭合</title><content>等待修复的书信',
      source: visualSource('visual-letters-chat', 4, 16),
      warnings: ['缺少结束标签'],
    });
    dependencies.resetPhoneToRoute('letters', 'failed-draft', '解析失败草稿', { bookId: book.id, draftId: draft.id });
    return;
  }
  if (name === 'letters-rewrite-generate') {
    const requirement = '书信当前版本的隐藏追加要求。';
    entry.generationRecord = dependencies.createHiddenGenerationRecord('generate', requirement, {
      bookTitle: book.title,
      format: entry.format,
      recentEntryCount: 6,
      receiver: entry.receiver,
      sender: entry.sender,
    });
    dependencies.resetPhoneToRoute('letters', 'generate', '重写书信', { bookId: book.id, rewriteEntryId: entry.id });
    await dependencies.waitForPaint();
    if (document.querySelector<HTMLTextAreaElement>('.pc-requirement-field textarea')?.value !== requirement)
      throw new Error('Letter rewrite did not restore the current version hidden generation record');
    return;
  }
  if (name === 'letters-entry-detail') {
    entry.generationRecord = dependencies.createHiddenGenerationRecord('generate', '书信来源可视化夹具');
  }
  const page =
    name === 'letters-book'
      ? 'book'
      : name === 'letters-entry-editor'
        ? 'editor'
        : name === 'letters-bagu'
          ? 'bagu-scan'
          : 'entry';
  const title =
    name === 'letters-book'
      ? book.title
      : name === 'letters-entry-editor'
        ? '编辑信件'
        : name === 'letters-bagu'
          ? '八股检测'
          : entry.title;
  dependencies.resetPhoneToRoute(
    'letters',
    page,
    title,
    page === 'book' ? { bookId: book.id } : { bookId: book.id, entryId: entry.id },
  );
  if (name === 'letters-entry-detail') {
    await dependencies.waitForPaint();
    if (!document.querySelector('.pc-reader-source-label')?.textContent?.includes('最近 7 楼')) {
      throw new Error('Letters detail omitted its generation source label');
    }
    await dependencies.openReaderCatalog();
  }
}

function visualSource(chatIdAtGeneration: string, start: number, end: number) {
  return {
    chatIdAtGeneration,
    label: `第 ${start}-${end} 楼`,
    messageIds: [],
    mode: 'range' as const,
    ranges: [{ end, start }],
    scopeId: `${chatIdAtGeneration}-scope`,
    sortKey: end,
  };
}
