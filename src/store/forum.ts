import { useChatScopedDomain } from '@/store/chatScoped';
import { createFailedDraftCollection } from '@/store/failedDrafts';
import {
  type ForumBoard,
  type ForumReply,
  type ForumThread,
  type ForumThreadVersion,
  ForumScopeDataSchema,
} from '@/type/forum';
import {
  createContentVersion,
  ensureContentVersions,
  removeContentVersion,
  resolveContentVersion,
} from '@/util/contentVersions';
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

type ForumBoardInput = Pick<ForumBoard, 'name'> & Partial<Pick<ForumBoard, 'typeId' | 'typeName' | 'typePrompt'>>;

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

  function getReply(boardId: string, threadId: string, replyId: string, versionId = '') {
    const thread = getThread(boardId, threadId);
    const version = versionId ? thread?.versions.find(item => item.id === versionId) : null;
    return (version?.replies || thread?.replies || []).find(reply => reply.id === replyId) ?? null;
  }

  function findBoardByName(name: string) {
    const normalized = normalizeName(name);
    return boards.value.find(board => normalizeName(board.name) === normalized) ?? null;
  }

  function createBoard(input: ForumBoardInput) {
    const timestamp = nowIso();
    const typePrompt = input.typePrompt?.trim() || '';
    const board: ForumBoard = {
      id: createId('forum_board'),
      name: input.name.trim() || '未命名板块',
      typeId: input.typeId?.trim() || '',
      typeName: input.typeName?.trim() || (typePrompt ? '自定义' : ''),
      typePrompt,
      threads: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.value.boards = [board, ...data.value.boards];
    return board;
  }

  function ensureBoard(name: string, typePrompt?: string, type?: Partial<Pick<ForumBoard, 'typeId' | 'typeName'>>) {
    const existing = findBoardByName(name);
    if (existing) return existing;
    return createBoard({ name, typeId: type?.typeId, typeName: type?.typeName, typePrompt });
  }

  function updateBoard(boardId: string, input: ForumBoardInput) {
    const board = getBoard(boardId);
    if (!board) return null;
    board.name = input.name.trim() || board.name;
    board.typeId = input.typeId?.trim() || '';
    board.typePrompt = input.typePrompt?.trim() || '';
    board.typeName = input.typeName?.trim() || (board.typePrompt ? '自定义' : '');
    board.updatedAt = nowIso();
    return board;
  }

  function deleteBoard(boardId: string) {
    data.value.boards = data.value.boards.filter(board => board.id !== boardId);
  }

  function createThread(
    boardId: string,
    input: Pick<ForumThread, 'title' | 'author' | 'content'> &
      Partial<Pick<ForumThread, 'favorite' | 'generationReplay' | 'replies'>>,
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
      replies: (input.replies || []).map(reply => ({ ...reply })),
      generationReplay: input.generationReplay,
      activeVersionId: '',
      versions: [],
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
    const activeVersion = resolveContentVersion(thread.versions, thread.activeVersionId);
    if (activeVersion) {
      activeVersion.author = thread.author;
      activeVersion.title = thread.title;
      activeVersion.content = thread.content;
    }
    thread.updatedAt = timestamp;
    board.updatedAt = timestamp;
    return thread;
  }

  function appendThreadVersion(
    boardId: string,
    threadId: string,
    input: Pick<ForumThreadVersion, 'title' | 'author' | 'content'> &
      Partial<Pick<ForumThreadVersion, 'generationReplay' | 'replies'>>,
  ) {
    const board = getBoard(boardId);
    const thread = getThread(boardId, threadId);
    if (!board || !thread) return null;
    const state = ensureContentVersions<ForumThreadVersion>(
      thread.versions,
      thread.activeVersionId,
      () => ({
        author: thread.author,
        content: thread.content,
        createdAt: thread.createdAt,
        generationReplay: thread.generationReplay,
        replies: thread.replies.map(reply => ({ ...reply })),
        title: thread.title,
      }),
      'forum_thread_version',
    );
    const version = createContentVersion<ForumThreadVersion>('forum_thread_version', {
      author: input.author.trim() || thread.author,
      content: input.content.trim(),
      generationReplay: input.generationReplay,
      replies: (input.replies || thread.replies).map(reply => ({ ...reply })),
      title: input.title.trim() || thread.title,
    });
    thread.versions = [...state.versions, version];
    thread.activeVersionId = state.activeVersionId;
    return { board, thread, version };
  }

  function activateThreadVersion(boardId: string, threadId: string, versionId: string) {
    const board = getBoard(boardId);
    const thread = getThread(boardId, threadId);
    const version = thread?.versions.find(item => item.id === versionId);
    if (!board || !thread || !version) return null;
    const timestamp = nowIso();
    thread.activeVersionId = version.id;
    thread.author = version.author;
    thread.title = version.title;
    thread.content = version.content;
    thread.generationReplay = version.generationReplay;
    thread.replies = version.replies.map(reply => ({ ...reply }));
    thread.updatedAt = timestamp;
    board.updatedAt = timestamp;
    return thread;
  }

  function updateThreadVersion(
    boardId: string,
    threadId: string,
    versionId: string,
    input: Pick<ForumThreadVersion, 'title' | 'author' | 'content'>,
  ) {
    const board = getBoard(boardId);
    const thread = getThread(boardId, threadId);
    const version = thread?.versions.find(item => item.id === versionId);
    if (!board || !thread || !version) return null;
    const timestamp = nowIso();
    version.author = input.author.trim() || version.author;
    version.title = input.title.trim() || version.title;
    version.content = input.content.trim();
    if (thread.activeVersionId === version.id) {
      thread.author = version.author;
      thread.title = version.title;
      thread.content = version.content;
      thread.updatedAt = timestamp;
      board.updatedAt = timestamp;
    }
    return thread;
  }

  function deleteThreadVersion(boardId: string, threadId: string, versionId: string) {
    const board = getBoard(boardId);
    const thread = getThread(boardId, threadId);
    if (!board || !thread) return null;
    const state = removeContentVersion(thread.versions, thread.activeVersionId, versionId);
    if (!state) return null;
    const timestamp = nowIso();
    thread.versions = state.versions;
    thread.activeVersionId = state.activeVersionId;
    thread.author = state.activeVersion.author;
    thread.title = state.activeVersion.title;
    thread.content = state.activeVersion.content;
    thread.generationReplay = state.activeVersion.generationReplay;
    thread.replies = state.activeVersion.replies.map(reply => ({ ...reply }));
    thread.updatedAt = timestamp;
    board.updatedAt = timestamp;
    return { activeVersion: state.activeVersion, thread };
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
    versionId = '',
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
    const version = versionId ? thread.versions.find(item => item.id === versionId) : null;
    if (version) {
      version.replies = [...version.replies, reply];
      if (version.id === thread.activeVersionId) thread.replies = version.replies.map(item => ({ ...item }));
    } else {
      thread.replies = [...thread.replies, reply];
      const activeVersion = thread.versions.find(item => item.id === thread.activeVersionId);
      if (activeVersion) activeVersion.replies = thread.replies.map(item => ({ ...item }));
    }
    if (!version || version.id === thread.activeVersionId) {
      thread.updatedAt = timestamp;
      board.updatedAt = timestamp;
    }
    return reply;
  }

  function appendReplies(
    boardId: string,
    threadId: string,
    replies: Array<Pick<ForumReply, 'author' | 'content'> & Partial<Pick<ForumReply, 'parentReplyId' | 'source'>>>,
    versionId = '',
  ) {
    const createdReplies: ForumReply[] = [];
    replies.forEach(reply => {
      const created = createReply(boardId, threadId, reply, versionId);
      if (created) createdReplies.push(created);
    });
    return createdReplies;
  }

  function updateReply(
    boardId: string,
    threadId: string,
    replyId: string,
    input: Pick<ForumReply, 'author' | 'content'> & Partial<Pick<ForumReply, 'parentReplyId'>>,
    versionId = '',
  ) {
    const board = getBoard(boardId);
    const thread = getThread(boardId, threadId);
    const reply = getReply(boardId, threadId, replyId, versionId);
    if (!board || !thread || !reply) return null;
    const timestamp = nowIso();
    reply.author = input.author.trim() || reply.author;
    reply.content = input.content.trim();
    reply.parentReplyId = input.parentReplyId?.trim() || undefined;
    reply.updatedAt = timestamp;
    const version = versionId ? thread.versions.find(item => item.id === versionId) : null;
    if (version?.id === thread.activeVersionId) thread.replies = version.replies.map(item => ({ ...item }));
    if (!version || version.id === thread.activeVersionId) {
      const activeVersion = thread.versions.find(item => item.id === thread.activeVersionId);
      if (!version && activeVersion) activeVersion.replies = thread.replies.map(item => ({ ...item }));
      thread.updatedAt = timestamp;
      board.updatedAt = timestamp;
    }
    return reply;
  }

  function deleteReply(boardId: string, threadId: string, replyId: string, versionId = '') {
    const board = getBoard(boardId);
    const thread = getThread(boardId, threadId);
    if (!board || !thread) return;
    const version = versionId ? thread.versions.find(item => item.id === versionId) : null;
    const replies = version?.replies || thread.replies;
    const nextReplies = replies
      .filter(reply => reply.id !== replyId)
      .map(reply => (reply.parentReplyId === replyId ? { ...reply, parentReplyId: undefined } : reply));
    if (version) {
      version.replies = nextReplies;
      if (version.id === thread.activeVersionId) thread.replies = nextReplies.map(reply => ({ ...reply }));
    } else {
      thread.replies = nextReplies;
      const activeVersion = thread.versions.find(item => item.id === thread.activeVersionId);
      if (activeVersion) activeVersion.replies = nextReplies.map(reply => ({ ...reply }));
    }
    if (!version || version.id === thread.activeVersionId) {
      thread.updatedAt = nowIso();
      board.updatedAt = thread.updatedAt;
    }
  }

  return {
    activateThreadVersion,
    appendThreadVersion,
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
    deleteThreadVersion,
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
    updateThreadVersion,
  };
});
