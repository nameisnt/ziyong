import { useForumStore } from '@/store/forum';
import type { ForumBoard, ForumThread } from '@/type/forum';

export function useForumDeletionSession(options: {
  confirmDelete: (message: string, confirmLabel: string) => Promise<boolean>;
  getActiveBoard: () => ForumBoard | null;
  getActiveThread: () => ForumThread | null;
  getViewedVersionId: () => string;
  goHome: () => void;
  navigateToBoard: (board: ForumBoard) => void;
  navigateToThread: (title: string, params: { boardId: string; threadId: string; versionId: string }) => void;
  notifySuccess: (message: string) => void;
}) {
  const forum = useForumStore();

  async function removeForumVersion(versionId: string) {
    const board = options.getActiveBoard();
    const thread = options.getActiveThread();
    if (!board || !thread || thread.versions.length <= 1) return;
    const versionIndex = thread.versions.findIndex(version => version.id === versionId);
    if (versionIndex < 0) return;
    const shouldDelete = await options.confirmDelete(
      `要删除当前查看的主题版本 ${versionIndex + 1}/${thread.versions.length} 吗？该版本的主楼和回复会一起删除。`,
      '删除此版本',
    );
    if (!shouldDelete) return;

    const currentBoard = options.getActiveBoard();
    const currentThread = options.getActiveThread();
    if (!currentBoard || !currentThread) return;
    const versions = [...currentThread.versions];
    const previousVersion = versions[(versionIndex - 1 + versions.length) % versions.length];
    const result = forum.deleteThreadVersion(currentBoard.id, currentThread.id, versionId);
    if (!result) return;
    const nextThread = previousVersion
      ? forum.activateThreadVersion(currentBoard.id, result.thread.id, previousVersion.id)
      : result.thread;
    options.navigateToThread(nextThread?.title || result.activeVersion.title, {
      boardId: currentBoard.id,
      threadId: result.thread.id,
      versionId: previousVersion?.id || result.activeVersion.id,
    });
    options.notifySuccess('已删除当前论坛主题版本');
  }

  async function removeBoard(boardId: string) {
    const board = forum.getBoard(boardId);
    const shouldDelete = await options.confirmDelete(
      `要删除板块“${board?.name || '未命名板块'}”吗？里面的帖子和回复都会一起删除。`,
      '删除',
    );
    if (!shouldDelete) return;
    forum.deleteBoard(boardId);
    options.notifySuccess('已删除板块');
  }

  async function removeBoards(boardIds: string[]) {
    const selected = boardIds.map(boardId => forum.getBoard(boardId)).filter((board): board is ForumBoard => Boolean(board));
    if (!selected.length) return;
    const threadCount = selected.reduce((sum, board) => sum + board.threads.length, 0);
    const shouldDelete = await options.confirmDelete(
      `要删除所选 ${selected.length} 个板块及其中 ${threadCount} 个帖子吗？回复也会一起删除。`,
      '删除所选',
    );
    if (!shouldDelete) return;
    selected.forEach(board => forum.deleteBoard(board.id));
    options.notifySuccess(`已删除 ${selected.length} 个板块`);
  }

  async function removeThread(boardId: string, threadId: string) {
    const thread = forum.getThread(boardId, threadId);
    if (thread && thread.versions.length > 1) {
      await removeForumVersion(options.getViewedVersionId());
      return;
    }
    const shouldDelete = await options.confirmDelete(
      `要删除帖子“${thread?.title || '未命名帖子'}”的最后一个版本吗？主楼、回复和帖子记录会一起移除。`,
      '删除',
    );
    if (!shouldDelete) return;
    forum.deleteThread(boardId, threadId);
    const board = forum.getBoard(boardId);
    if (!board) {
      options.goHome();
      options.notifySuccess('已删帖');
      return;
    }
    options.navigateToBoard(board);
    options.notifySuccess('已删帖');
  }

  return { removeBoard, removeBoards, removeForumVersion, removeThread };
}
