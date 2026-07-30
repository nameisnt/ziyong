import { useChatScopedDomain } from '@/store/chatScoped';
import { createFailedDraftCollection } from '@/store/failedDrafts';
import { type ForumBoard, type ForumReply, type ForumThread, ForumScopeDataSchema } from '@/type/forum';
import { validateInplace } from '@/util/zod';

export const forumField = 'sillytavern_phone_forum';

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

export const useForumStore = defineStore('forum', () => {
  const { data, rehydrateFromSettings, resetCurrentScope, scopeKey, switchScope } = useChatScopedDomain({
    field: forumField,
    schema: ForumScopeDataSchema,
    createDefault: () => validateInplace(ForumScopeDataSchema, {}),
  });

  const boards = computed(() => data.value.boards);
  const { createFailedDraft, deleteFailedDraft, failedDrafts, getFailedDraft, updateFailedDraft } =
    createFailedDraftCollection(data, 'forum_failed');

  function getBoard(boardId: string) {
    return boards.value.find(board => board.id === boardId) ?? null;
  }

  function getThread(boardId: string, threadId: string) {
    return getBoard(boardId)?.threads.find(thread => thread.id === threadId) ?? null;
  }

  function getReply(boardId: string, threadId: string, replyId: string) {
    return getThread(boardId, threadId)?.replies.find(reply => reply.id === replyId) ?? null;
  }

  function findBoardByName(name: string) {
    const normalized = normalizeName(name);
    return boards.value.find(board => normalizeName(board.name) === normalized) ?? null;
  }

  function createBoard(input: Pick<ForumBoard, 'name'> & Partial<Pick<ForumBoard, 'description'>>) {
    const timestamp = nowIso();
    const board: ForumBoard = {
      id: createId('forum_board'),
      name: input.name.trim() || '未命名板块',
      description: input.description?.trim() || undefined,
      threads: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.value.boards = [board, ...data.value.boards];
    return board;
  }

  function ensureBoard(name: string, description?: string) {
    const existing = findBoardByName(name);
    if (existing) return existing;
    return createBoard({ description, name });
  }

  function updateBoard(boardId: string, input: Pick<ForumBoard, 'name'> & Partial<Pick<ForumBoard, 'description'>>) {
    const board = getBoard(boardId);
    if (!board) return null;
    board.name = input.name.trim() || board.name;
    board.description = input.description?.trim() || undefined;
    board.updatedAt = nowIso();
    return board;
  }

  function deleteBoard(boardId: string) {
    data.value.boards = data.value.boards.filter(board => board.id !== boardId);
  }

  function createThread(
    boardId: string,
    input: Pick<ForumThread, 'title' | 'author' | 'content'> & Partial<Pick<ForumThread, 'favorite'>>,
  ) {
    const board = getBoard(boardId);
    if (!board) return null;
    const timestamp = nowIso();
    const thread: ForumThread = {
      id: createId('forum_thread'),
      boardId,
      title: input.title.trim() || '未命名帖子',
      author: input.author.trim() || '匿名',
      content: input.content.trim(),
      favorite: Boolean(input.favorite),
      replies: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    board.threads = [thread, ...board.threads];
    board.updatedAt = timestamp;
    return { board, thread };
  }

  function updateThread(boardId: string, threadId: string, input: Pick<ForumThread, 'title' | 'author' | 'content'>) {
    const board = getBoard(boardId);
    const thread = getThread(boardId, threadId);
    if (!board || !thread) return null;
    const timestamp = nowIso();
    thread.title = input.title.trim() || thread.title;
    thread.author = input.author.trim() || thread.author;
    thread.content = input.content.trim();
    thread.updatedAt = timestamp;
    board.updatedAt = timestamp;
    return thread;
  }

  function deleteThread(boardId: string, threadId: string) {
    const board = getBoard(boardId);
    if (!board) return;
    board.threads = board.threads.filter(thread => thread.id !== threadId);
    board.updatedAt = nowIso();
  }

  function toggleFavorite(boardId: string, threadId: string) {
    const board = getBoard(boardId);
    const thread = getThread(boardId, threadId);
    if (!board || !thread) return;
    const timestamp = nowIso();
    thread.favorite = !thread.favorite;
    board.updatedAt = timestamp;
  }

  function createReply(
    boardId: string,
    threadId: string,
    input: Pick<ForumReply, 'author' | 'content'> & Partial<Pick<ForumReply, 'parentReplyId' | 'source'>>,
  ) {
    const board = getBoard(boardId);
    const thread = getThread(boardId, threadId);
    if (!board || !thread) return null;
    const timestamp = nowIso();
    const reply: ForumReply = {
      id: createId('forum_reply'),
      author: input.author.trim() || '匿名',
      content: input.content.trim(),
      parentReplyId: input.parentReplyId?.trim() || undefined,
      source: input.source,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    thread.replies = [...thread.replies, reply];
    thread.updatedAt = timestamp;
    board.updatedAt = timestamp;
    return reply;
  }

  function appendReplies(
    boardId: string,
    threadId: string,
    replies: Array<Pick<ForumReply, 'author' | 'content'> & Partial<Pick<ForumReply, 'parentReplyId' | 'source'>>>,
  ) {
    const createdReplies: ForumReply[] = [];
    replies.forEach(reply => {
      const created = createReply(boardId, threadId, reply);
      if (created) createdReplies.push(created);
    });
    return createdReplies;
  }

  function updateReply(
    boardId: string,
    threadId: string,
    replyId: string,
    input: Pick<ForumReply, 'author' | 'content'> & Partial<Pick<ForumReply, 'parentReplyId'>>,
  ) {
    const board = getBoard(boardId);
    const thread = getThread(boardId, threadId);
    const reply = getReply(boardId, threadId, replyId);
    if (!board || !thread || !reply) return null;
    const timestamp = nowIso();
    reply.author = input.author.trim() || reply.author;
    reply.content = input.content.trim();
    reply.parentReplyId = input.parentReplyId?.trim() || undefined;
    reply.updatedAt = timestamp;
    thread.updatedAt = timestamp;
    board.updatedAt = timestamp;
    return reply;
  }

  function deleteReply(boardId: string, threadId: string, replyId: string) {
    const board = getBoard(boardId);
    const thread = getThread(boardId, threadId);
    if (!board || !thread) return;
    thread.replies = thread.replies
      .filter(reply => reply.id !== replyId)
      .map(reply => (reply.parentReplyId === replyId ? { ...reply, parentReplyId: undefined } : reply));
    thread.updatedAt = nowIso();
    board.updatedAt = thread.updatedAt;
  }

  return {
    appendReplies,
    boards,
    createBoard,
    createFailedDraft,
    createReply,
    createThread,
    data,
    deleteBoard,
    deleteFailedDraft,
    deleteReply,
    deleteThread,
    ensureBoard,
    failedDrafts,
    findBoardByName,
    getBoard,
    getFailedDraft,
    getReply,
    getThread,
    rehydrateFromSettings,
    resetCurrentScope,
    scopeKey,
    switchScope,
    toggleFavorite,
    updateBoard,
    updateFailedDraft,
    updateReply,
    updateThread,
  };
});
