import { getCurrentChatScopeKey } from '@/store/chatScoped';
import { useRecoveryStore } from '@/store/recovery';
import type { PendingVisibilityRecovery } from '@/type/recovery';
import { getChatMessagesSafe, getOptionalGlobalFunction, onTavernEvent, setChatMessagesSafe, stopGenerationByIdSafe } from '@/util/runtime';
import { acquireSendGuard } from '@/util/sendGuard';

function nowIso() {
  return new Date().toISOString();
}

function getAllChatMessages() {
  return getChatMessagesSafe('0-{{lastMessageId}}', { hide_state: 'all' });
}

async function hashMessageIdentity(message: Pick<ChatMessage, 'message' | 'name' | 'role'>) {
  const payload = `${message.role}\n${message.name}\n${message.message}`;
  const bytes = new TextEncoder().encode(payload);
  const buffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buffer)).map(item => item.toString(16).padStart(2, '0')).join('');
}

async function createRecoverySnapshot(messages: ChatMessage[]) {
  return Promise.all(messages.map(async message => ({
    contentHash: await hashMessageIdentity(message),
    isHidden: message.is_hidden,
    messageId: message.message_id,
    name: message.name,
    role: message.role,
  })));
}

async function restoreRecoveryIfSafe(item: PendingVisibilityRecovery) {
  if (getCurrentChatScopeKey() !== item.scopeId) {
    return {
      message: '当前聊天作用域已变化，暂时不能自动恢复来源隐藏状态',
      status: 'scope_changed',
    } as const;
  }

  const currentMessages = getAllChatMessages();
  const currentById = new Map(currentMessages.map(message => [message.message_id, message]));
  for (const snapshotMessage of item.messages) {
    const currentMessage = currentById.get(snapshotMessage.messageId);
    if (!currentMessage) {
      return {
        message: `第 ${snapshotMessage.messageId} 楼已经不存在，无法自动恢复`,
        status: 'identity_mismatch',
      } as const;
    }

    const currentHash = await hashMessageIdentity(currentMessage);
    if (
      currentHash !== snapshotMessage.contentHash
      || currentMessage.role !== snapshotMessage.role
      || currentMessage.name !== snapshotMessage.name
    ) {
      return {
        message: `第 ${snapshotMessage.messageId} 楼内容已变化，已保留恢复日志供手动处理`,
        status: 'identity_mismatch',
      } as const;
    }
  }

  const patches = item.messages
    .map(snapshotMessage => {
      const currentMessage = currentById.get(snapshotMessage.messageId);
      if (!currentMessage || currentMessage.is_hidden === snapshotMessage.isHidden) return null;
      return {
        is_hidden: snapshotMessage.isHidden,
        message_id: snapshotMessage.messageId,
      };
    })
    .filter(Boolean) as Array<{ is_hidden: boolean; message_id: number }>;

  if (patches.length) {
    await setChatMessagesSafe(patches, { refresh: 'none' });
  }

  const saveChatFn = getOptionalGlobalFunction<(() => Promise<void>) | (() => void)>('saveChat');
  if (typeof saveChatFn === 'function') {
    await Promise.resolve(saveChatFn());
  }

  return {
    status: 'restored',
  } as const;
}

export async function ensureCurrentScopeRecovery(scopeId: string, options?: {
  discardInvalidRecovery?: boolean;
}) {
  const recovery = useRecoveryStore();
  const item = recovery.data[scopeId];
  if (!item) {
    return {
      status: 'none',
    } as const;
  }

  const result = await restoreRecoveryIfSafe(item);
  if (result.status === 'restored') {
    await recovery.deleteRecovery(scopeId);
    return result;
  }

  if (options?.discardInvalidRecovery !== false && result.status === 'identity_mismatch') {
    await recovery.deleteRecovery(scopeId);
    return {
      message: '检测到旧的来源恢复记录已经失效，已自动丢弃，本次不再阻止继续使用',
      status: 'discarded',
    } as const;
  }

  return result;
}

export async function runWithVisibilityTransaction<T>(options: {
  generationId: string;
  scopeId: string;
  selectedMessageIds: number[];
  task: () => Promise<T>;
}) {
  const recovery = useRecoveryStore();
  const allMessages = getAllChatMessages();
  const visibleMessageIds = new Set(allMessages.filter(message => !message.is_hidden).map(message => message.message_id));
  const selectedMessageIds = new Set(options.selectedMessageIds.filter(messageId => visibleMessageIds.has(messageId)));
  if (!selectedMessageIds.size) {
    throw new Error('来源范围内没有可用的可见楼层');
  }

  const toHide = allMessages
    .filter(message => !message.is_hidden && !selectedMessageIds.has(message.message_id))
    .map(message => ({
      is_hidden: true,
      message_id: message.message_id,
    }));

  if (!toHide.length) {
    return options.task();
  }

  const assertSelectedMessagesVisible = () => {
    const actualVisibleIds = getChatMessagesSafe('0-{{lastMessageId}}', { hide_state: 'unhidden' })
      .map(message => message.message_id);
    const expectedIds = [...selectedMessageIds].sort((left, right) => left - right);
    const actualIds = actualVisibleIds.sort((left, right) => left - right);
    const sameLength = actualIds.length === expectedIds.length;
    const sameIds = sameLength && actualIds.every((messageId, index) => messageId === expectedIds[index]);
    if (!sameIds) {
      throw new Error(`来源楼层隐藏未生效，期望可见楼层：${expectedIds.join(', ')}；实际可见楼层：${actualIds.join(', ')}`);
    }
  };

  const recoveryItem: PendingVisibilityRecovery = {
    createdAt: nowIso(),
    generationId: options.generationId,
    messages: await createRecoverySnapshot(allMessages),
    scopeId: options.scopeId,
  };
  await recovery.setRecovery(recoveryItem);

  let scopeChanged = false;
  const stopChatChanged = onTavernEvent('CHAT_CHANGED', () => {
    if (getCurrentChatScopeKey() === options.scopeId) return;
    scopeChanged = true;
    stopGenerationByIdSafe(options.generationId);
  });
  const sendGuard = acquireSendGuard('手机生成进行中，请先等待当前任务完成');

  let taskResult: T | undefined;
  let taskError: unknown;
  let restoreError: Error | null = null;

  try {
    await setChatMessagesSafe(toHide, { refresh: 'none' });
    assertSelectedMessagesVisible();
    taskResult = await options.task();
  } catch (error) {
    taskError = error;
  } finally {
    stopChatChanged.stop();
    sendGuard.release();

    if (!scopeChanged) {
      const restoreResult = await ensureCurrentScopeRecovery(options.scopeId, { discardInvalidRecovery: false });
      if (restoreResult.status !== 'none' && restoreResult.status !== 'restored') {
        restoreError = new Error(restoreResult.message);
      }
    }
  }

  if (taskError) {
    throw taskError;
  }

  if (scopeChanged) {
    throw new Error('生成期间聊天已切换，来源恢复日志已保留，请回到原聊天后处理');
  }

  if (restoreError) {
    throw restoreError;
  }

  return taskResult as T;
}
