import { useForumStore } from '@/store/forum';
import { usePreviewDraftStore } from '@/store/previewDrafts';
import type { HiddenGenerationRecord } from '@/type/generation';
import { buildItemTransfer, importItemTransfer } from '@/util/itemTransfer';

export function createForumFixture() {
  const forum = useForumStore();
  forum.resetCurrentScope();
  const longTypePrompt =
    '这是只应提供给模型的长板块类型提示词。它故意包含很多详细要求，用来确认论坛板块卡片和板块页头不会因为提示词过长而被持续撑高。';
  const board = forum.createBoard({
    name: '各个',
    typeName: '视觉自定义类型',
    typePrompt: longTypePrompt,
  });
  const longThread = forum.createThread(board.id, {
    author: '楼主',
    content: [
      '这是一个用于 UI 检查的主楼。',
      '正文故意写长一点，方便观察卡片、详情页和底部按钮会不会挤压或遮挡。',
      '如果这里出现横向滚动、按钮变形或内容压住底部，就应该被截图报告标出来。',
    ].join('\n\n'),
    title: '视觉测试帖子：按钮不应该被拉高，正文也不应该横向溢出',
  });
  if (!longThread) throw new Error('Forum visual fixture did not create a thread');
  forum.appendReplies(board.id, longThread.thread.id, [
    { author: '一楼', content: '第一条回复，只显示楼层，不显示现实时间。', isOriginalPoster: false },
    {
      author: '二楼',
      content: '第二条回复，文字稍微长一点，用来检测回复卡片换行和底部按钮。',
      isOriginalPoster: false,
    },
    { author: '三楼', content: '第三条回复。', isOriginalPoster: false },
  ]);
  return {
    board,
    longTypePrompt,
    thread: longThread.thread,
  };
}

type ForumGenerationScenarioContext = {
  createHiddenGenerationRecord: (
    actionId: string,
    userRequirement: string,
    config?: Record<string, unknown>,
  ) => HiddenGenerationRecord;
  resetPhoneToRoute: (appId: string, page: string, title: string, params?: Record<string, string>) => void;
  waitForPaint: () => Promise<void>;
};

export async function applyForumGenerationVisualScenario(name: string, context: ForumGenerationScenarioContext) {
  if (name === 'forum-type-prompt') {
    useForumStore().resetCurrentScope();
    context.resetPhoneToRoute('forum', 'generate-thread', '板块类型提示词');
    await context.waitForPaint();
    const prompt = document.querySelector<HTMLTextAreaElement>('.pc-forum-type-fields .pc-area');
    if (!prompt) throw new Error('Forum custom board type prompt is missing');
    prompt.value = '视觉测试板块类型提示词\n第二行用于确认多行文本域高度。';
    prompt.dispatchEvent(new Event('input', { bubbles: true }));
    prompt.scrollIntoView({ block: 'center' });
    await context.waitForPaint();
    return true;
  }

  if (name === 'forum-generate-thread') {
    const forum = useForumStore();
    forum.resetCurrentScope();
    context.resetPhoneToRoute('forum', 'generate-thread', '生成帖子');
    await context.waitForPaint();
    const boardSelector = document.querySelector<HTMLInputElement>(
      '.pc-generation-panel > .pc-combobox .pc-combobox-input',
    );
    const typeSelector = document.querySelector<HTMLInputElement>('.pc-forum-type-fields .pc-combobox-input');
    if (!boardSelector?.value.includes('自定义板块') || !typeSelector?.value.includes('自定义')) {
      throw new Error('Forum generation did not expose explicit custom board selections');
    }
    const boardNameInput = document.querySelector<HTMLInputElement>(
      '.pc-forum-type-fields input[placeholder="固定板块名称"]',
    );
    if (!boardNameInput) throw new Error('Forum custom board name input is missing');
    boardNameInput.value = '视觉即时保存板块';
    boardNameInput.dispatchEvent(new Event('input', { bubbles: true }));
    await context.waitForPaint();
    const createBoardButton = document.querySelector<HTMLButtonElement>('.pc-forum-create-board-btn');
    if (!createBoardButton || createBoardButton.disabled) {
      throw new Error('Forum custom board create action is unavailable');
    }
    createBoardButton.click();
    await context.waitForPaint();
    if (!forum.findBoardByName('视觉即时保存板块')) {
      throw new Error('Forum custom board was not persisted immediately');
    }
    return true;
  }

  if (name === 'forum-generate-replies') {
    const { board, thread } = createForumFixture();
    context.resetPhoneToRoute('forum', 'generate-replies', '生成回复', { boardId: board.id, threadId: thread.id });
    return true;
  }

  if (!name.startsWith('forum-')) return false;
  const forum = useForumStore();
  if (name === 'forum-catalog') {
    createForumFixture();
    context.resetPhoneToRoute('forum', 'root', '论坛');
  } else if (name === 'forum-board') {
    const { board, longTypePrompt, thread } = createForumFixture();
    context.resetPhoneToRoute('forum', 'board', board.name, { boardId: board.id });
    await context.waitForPaint();
    const toolbar = document.querySelector<HTMLElement>('.pc-forum-board-toolbar');
    const topTitle = document.querySelector<HTMLElement>('.pc-top-title');
    if (toolbar?.textContent?.includes(longTypePrompt))
      throw new Error('Long forum type prompt leaked into the visible board header');
    if (topTitle?.textContent?.trim() !== board.name)
      throw new Error('Forum board header did not preserve the board name');
    if (toolbar?.textContent?.includes('视觉自定义类型'))
      throw new Error('Forum board header still exposes the removed type label');
    const originalThreadIds = new Set(board.threads.map(item => item.id));
    const originalReplyIds = new Set(thread.replies.map(reply => reply.id));
    const payload = buildItemTransfer('forum', { boardId: board.id, threadId: thread.id });
    const imported = await importItemTransfer('forum', payload, { mode: 'copy', params: { boardId: board.id } });
    const copied = forum.getThread(board.id, imported.itemId);
    if (!copied || originalThreadIds.has(copied.id) || copied.boardId !== board.id) {
      throw new Error('Forum copy import did not create a fresh thread in the selected board');
    }
    if (copied.replies.some(reply => originalReplyIds.has(reply.id))) {
      throw new Error('Forum copy import retained nested reply ids');
    }
    forum.deleteThread(board.id, copied.id);
    await context.waitForPaint();
  } else if (
    name === 'forum-board-editor' ||
    name === 'forum-bagu' ||
    name === 'forum-thread' ||
    name === 'forum-thread-editor'
  ) {
    const { board, thread } = createForumFixture();
    if (name === 'forum-thread') {
      thread.generationRecord = context.createHiddenGenerationRecord('generate-thread', '论坛来源可视化夹具');
    }
    const page =
      name === 'forum-board-editor'
        ? 'board-editor'
        : name === 'forum-bagu'
          ? 'bagu-scan'
          : name === 'forum-thread'
            ? 'thread'
            : 'thread-editor';
    const title =
      name === 'forum-board-editor'
        ? '编辑板块'
        : name === 'forum-bagu'
          ? '八股检测'
          : name === 'forum-thread'
            ? thread.title
            : '编辑帖子';
    context.resetPhoneToRoute(
      'forum',
      page,
      title,
      name === 'forum-board-editor' ? { boardId: board.id } : { boardId: board.id, threadId: thread.id },
    );
    if (name === 'forum-thread') {
      await context.waitForPaint();
      if (!document.querySelector('.pc-reader-source-label')?.textContent?.includes('最近 7 楼')) {
        throw new Error('Forum detail omitted its generation source label');
      }
    }
  } else if (name === 'forum-failed-draft' || name === 'forum-failed-draft-reparse') {
    forum.resetCurrentScope();
    const draft = forum.createFailedDraft({
      actionId: 'generate-thread',
      appId: 'forum',
      context: {},
      rawOutput: '<forum><title>未闭合</title><content>等待修复的主题帖',
      source: visualSource('visual-forum-chat', 3, 15),
      warnings: ['缺少结束标签'],
    });
    context.resetPhoneToRoute('forum', 'failed-draft', '解析失败草稿', { draftId: draft.id });
  } else if (name === 'forum-preview') {
    const { board } = createForumFixture();
    usePreviewDraftStore().upsertPreviewDraft({
      appId: 'forum',
      page: 'preview',
      preview: {
        action: 'thread',
        author: '视觉楼主',
        boardId: board.id,
        boardName: board.name,
        boardTypeId: board.typeId,
        boardTypeName: board.typeName,
        boardTypePrompt: board.typePrompt,
        content: '这是论坛主楼预览正文，用于检查主楼与回复能在同一预览页显示。',
        draftId: null,
        mode: 'create',
        raw: '<forum><title>预览主题</title><content>这是论坛主楼预览正文。</content></forum>',
        replies: [
          { author: '一楼', content: '第一条预览回复。', isOriginalPoster: false },
          { author: '视觉楼主', content: '第二条预览回复。', isOriginalPoster: true },
        ],
        targetThreadId: '',
        targetVersionId: '',
        title: '论坛生成预览',
        warnings: [],
      },
      routeParams: { boardId: board.id },
      title: '生成预览',
    });
    context.resetPhoneToRoute('forum', 'preview', '生成预览', { boardId: board.id });
    await context.waitForPaint();
    const viewTabs = [...document.querySelectorAll<HTMLButtonElement>('.pc-preview-mode-switch [role="tab"]')];
    if (viewTabs.length !== 3) throw new Error('Forum preview must expose compact preview/raw/bagu view tabs');
    const saveActions = document.querySelectorAll('.pc-preview-actions.single .pc-primary-btn');
    if (saveActions.length !== 1 || document.querySelector('.pc-preview-actions .pc-soft-btn')) {
      throw new Error('Forum preview footer must contain only the save action');
    }
    const rawTab = viewTabs.find(button => button.textContent?.includes('原始输出'));
    rawTab?.click();
    await context.waitForPaint();
    if (!document.querySelector('.pc-raw-editor') || !document.querySelector('.pc-raw-editor button')) {
      throw new Error('Forum preview raw-output tab lost its reparsing editor');
    }
  } else if (name === 'forum-thread-versions' || name === 'forum-version-interactions') {
    await applyForumVersionScenario(name, context);
  } else if (name === 'forum-rewrite-generate') {
    const { board, thread } = createForumFixture();
    const requirement = '论坛当前版本的隐藏追加要求。';
    thread.generationRecord = context.createHiddenGenerationRecord('generate-thread', requirement, {
      boardId: board.id,
      boardName: board.name,
      boardTypeId: board.typeId,
      boardTypeName: board.typeName,
      boardTypePrompt: board.typePrompt,
    });
    context.resetPhoneToRoute('forum', 'generate-thread', '重写论坛主帖', {
      boardId: board.id,
      rewriteThreadId: thread.id,
    });
    await context.waitForPaint();
    if (document.querySelector<HTMLTextAreaElement>('.pc-requirement-field textarea')?.value !== requirement) {
      throw new Error('Forum rewrite did not restore the current version hidden generation record');
    }
  } else {
    return false;
  }
  return true;

  async function applyForumVersionScenario(versionScenario: string, scenarioContext: ForumGenerationScenarioContext) {
    const { board, thread } = createForumFixture();
    const originalReplies = JSON.stringify(thread.replies);
    const interaction = versionScenario === 'forum-version-interactions';
    const candidateReplies = thread.replies.map((reply, index) => ({
      ...reply,
      content: `${interaction ? '采用后的候选回复' : '候选版本回复'} ${index + 1}${interaction ? '' : '：与旧版本内容不同。'}`,
      id: `${reply.id}_${interaction ? 'adopted' : 'candidate'}`,
    }));
    if (!interaction) {
      thread.updatedAt = '2000-01-01T00:00:00.000Z';
      board.updatedAt = '2000-01-01T00:00:00.000Z';
    }
    const saved = forum.appendThreadVersion(board.id, thread.id, {
      author: interaction ? '交互测试楼主' : '新版楼主',
      content: interaction
        ? '采用这个主题版本后，应同时采用该版本的回复。'
        : '这是重新生成后的主题候选版本。主楼和回复属于同一个版本快照。',
      replies: candidateReplies,
      title: interaction ? '论坛主帖交互候选版' : '重写后的论坛主帖',
    });
    if (!saved) throw new Error('Forum version fixture did not create a candidate version');
    if (
      thread.content !== saved.version.content ||
      JSON.stringify(thread.replies) !== JSON.stringify(candidateReplies)
    ) {
      throw new Error('Forum rewrite version did not become the active thread snapshot');
    }
    if (
      !interaction &&
      (thread.updatedAt === '2000-01-01T00:00:00.000Z' || board.updatedAt === '2000-01-01T00:00:00.000Z')
    ) {
      throw new Error('Forum active rewrite version did not update ordering timestamps');
    }
    if (JSON.stringify(thread.replies) === originalReplies)
      throw new Error('Forum candidate replies were not distinct');
    scenarioContext.resetPhoneToRoute('forum', 'thread', saved.version.title, {
      boardId: board.id,
      threadId: thread.id,
      versionId: saved.version.id,
    });
    await scenarioContext.waitForPaint();
    if (interaction) {
      if (document.querySelector('.pc-version-navigator .pc-primary-btn'))
        throw new Error('Forum version navigator still exposed a separate adoption action');
      if (
        thread.activeVersionId !== saved.version.id ||
        JSON.stringify(thread.replies) !== JSON.stringify(candidateReplies)
      )
        throw new Error('Forum active version did not include its reply snapshot');
      const replyRewriteButton = Array.from(
        document.querySelectorAll<HTMLButtonElement>('.pc-reply-section button'),
      ).find(button => button.title.includes('重写回复'));
      if (replyRewriteButton) throw new Error('Forum replies unexpectedly exposed a rewrite action');
    } else if (!document.body.textContent?.includes('候选版本回复 1')) {
      throw new Error('Forum candidate version did not render its own reply snapshot');
    }
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
