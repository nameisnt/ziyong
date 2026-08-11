import { useForumStore } from '@/store/forum';
import { usePromptStore } from '@/store/prompts';
import type { ForumBoard, ForumThread } from '@/type/forum';

export interface ForumThreadEditorDraft {
  author: string;
  boardId: string;
  boardName: string;
  boardTypeId: string;
  boardTypePrompt: string;
  content: string;
  title: string;
}

type Notice = Pick<typeof toastr, 'warning'>;

export function useForumThreadEditorSession(
  draft: ForumThreadEditorDraft,
  options: {
    customBoardId: string;
    customBoardTypeId: string;
    getActiveBoard: () => ForumBoard | null;
    getEditingThread: () => ForumThread | null;
    getThreadId: () => string | undefined;
    getVersionId: () => string | undefined;
    navigateToThread: (title: string, params: { boardId: string; threadId: string; versionId?: string }) => void;
    notify: Notice;
  },
) {
  const forum = useForumStore();
  const prompts = usePromptStore();

  function findBoardTypePrompt(promptId: string) {
    const prompt = prompts.getTypePrompt(promptId);
    return prompt?.domain === 'forum-board' ? prompt : null;
  }

  function selectBoardType(promptId: string) {
    if (promptId === options.customBoardTypeId) {
      draft.boardTypeId = options.customBoardTypeId;
      draft.boardTypePrompt = '';
      return;
    }
    const prompt = findBoardTypePrompt(promptId);
    if (!prompt) {
      draft.boardTypeId = options.customBoardTypeId;
      return;
    }
    draft.boardTypeId = prompt.id;
    draft.boardTypePrompt = prompt.prompt;
    if (!draft.boardName.trim()) draft.boardName = prompt.name;
  }

  function resolveTargetBoard() {
    const activeBoard = options.getActiveBoard();
    if (activeBoard) return activeBoard;
    if (draft.boardId && draft.boardId !== options.customBoardId) {
      const existing = forum.getBoard(draft.boardId);
      if (existing) return existing;
    }
    const boardName = draft.boardName.trim();
    if (!boardName) throw new Error('请先选择一个板块，或填写新板块名称');
    const selectedType = findBoardTypePrompt(draft.boardTypeId);
    return forum.ensureBoard(boardName, draft.boardTypePrompt, {
      typeId: selectedType?.id || '',
      typeName: selectedType?.name || (draft.boardTypePrompt.trim() ? '自定义' : ''),
    });
  }

  function submit() {
    const activeBoard = options.getActiveBoard();
    const editingThread = options.getEditingThread();
    const threadId = options.getThreadId();
    const versionId = options.getVersionId();
    if (editingThread && activeBoard && threadId) {
      const thread = versionId
        ? forum.updateThreadVersion(activeBoard.id, threadId, versionId, draft)
        : forum.updateThread(activeBoard.id, threadId, draft);
      if (!thread) return;
      options.navigateToThread(versionId ? draft.title : thread.title, {
        boardId: activeBoard.id,
        threadId: thread.id,
        ...(versionId ? { versionId } : {}),
      });
      return;
    }

    try {
      const board = resolveTargetBoard();
      const created = forum.createThread(board.id, draft);
      if (!created) return;
      options.navigateToThread(created.thread.title, { boardId: board.id, threadId: created.thread.id });
    } catch (error) {
      options.notify.warning(error instanceof Error ? error.message : '请先补齐板块信息');
    }
  }

  return { selectBoardType, submit };
}
