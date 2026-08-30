import { getCurrentChatScopeKey } from '@/store/chatScoped';
import { useRecoveryStore } from '@/store/recovery';
import type { PendingVisibilityRecovery } from '@/type/recovery';
import { getChatMessagesSafe, getOptionalGlobalFunction, setChatMessagesSafe } from '@/util/runtime';

function getAllChatMessages() {
  return getChatMessagesSafe('0-{{lastMessageId}}', { hide_state: 'all' });
}

async function hashMessageIdentity(message: Pick<ChatMessage, 'message' | 'name' | 'role'>) {
  const payload = `${message.role}\n${message.name}\n${message.message}`;
  const bytes = new TextEncoder().encode(payload);
  const buffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buffer))
    .map(item => item.toString(16).padStart(2, '0'))
    .join('');
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
      currentHash !== snapshotMessage.contentHash ||
      currentMessage.role !== snapshotMessage.role ||
      currentMessage.name !== snapshotMessage.name
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

export async function ensureCurrentScopeRecovery(
  scopeId: string,
  options?: {
    discardInvalidRecovery?: boolean;
  },
) {
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
