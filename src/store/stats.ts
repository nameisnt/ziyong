import {
  getRegisteredPhoneContentStats,
  type PhoneContentDomainStat,
  type PhoneContentOverview,
} from '@/core/appRegistry';
import { getCurrentChatScopeKey } from '@/store/chatScoped';
import { getChatMessagesSafe, getLastMessageIdSafe, getOptionalGlobalFunction, getOptionalGlobalValue, onTavernEvent } from '@/util/runtime';

export interface ChatRoleStat {
  name: string;
  count: number;
  chars: number;
  role: 'assistant' | 'user';
}

export interface ChatLengthPoint {
  messageId: number;
  role: ChatSpeakerRole;
  name: string;
  chars: number;
  preview: string;
}

type ChatSpeakerRole = 'assistant' | 'user';

interface CountableChatMessage {
  message: string;
  message_id: number;
  name?: string;
  role: ChatSpeakerRole;
}

export type ContentOverview = PhoneContentOverview;
export type ContentDomainStat = PhoneContentDomainStat;

function normalizeName(message: Pick<CountableChatMessage, 'name' | 'role'>) {
  if (message.name?.trim()) return message.name.trim();
  return message.role === 'user' ? '用户' : 'AI';
}

function compactPreview(message: string) {
  return message.replace(/\s+/g, ' ').trim().slice(0, 72);
}

function createContentOverview(): ContentOverview {
  return {
    chars: 0,
    collections: 0,
    items: 0,
    averageChars: 0,
    latestUpdatedAt: '',
    scopeCount: 0,
  };
}

function getLatestIso(left: string, right?: string) {
  if (!right) return left;
  if (!left) return right;
  return right.localeCompare(left) > 0 ? right : left;
}

function mergeContentOverview(target: ContentOverview, source: ContentOverview) {
  target.collections += source.collections;
  target.items += source.items;
  target.chars += source.chars;
  target.latestUpdatedAt = getLatestIso(target.latestUpdatedAt, source.latestUpdatedAt);
  target.averageChars = target.items ? Math.round(target.chars / target.items) : 0;
}

function hasContentOverview(overview: ContentOverview) {
  return overview.collections > 0 || overview.items > 0 || overview.chars > 0;
}

function collectStoredContentStats(currentScopeKey: string) {
  const ownerScopeKeys = new Set<string>();
  const currentContent = createContentOverview();
  const totalContent = createContentOverview();
  const contributions = getRegisteredPhoneContentStats(currentScopeKey);

  contributions.forEach(contribution => {
    contribution.scopeKeys.forEach(scopeKey => ownerScopeKeys.add(scopeKey));
    mergeContentOverview(currentContent, contribution.current);
    mergeContentOverview(totalContent, contribution.overview);
  });
  currentContent.scopeCount = hasContentOverview(currentContent) ? 1 : 0;
  totalContent.scopeCount = ownerScopeKeys.size;

  return {
    current: currentContent,
    domains: contributions.map(contribution => contribution.domain),
    overview: totalContent,
    warnings: contributions.flatMap(contribution => contribution.warnings),
  };
}

function getContentScopeTitle() {
  return getOptionalGlobalValue<unknown>('groupId') ? '当前群组所有聊天内容' : '当前角色所有聊天内容';
}

function getCurrentChatIdLabel() {
  const getCurrentChatId = getOptionalGlobalFunction<() => string | null | undefined>('getCurrentChatId');
  return String(getCurrentChatId?.() || getOptionalGlobalValue<string>('chatId') || '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isCountableChatMessage(message: unknown): message is CountableChatMessage {
  if (!isRecord(message)) return false;
  return (message.role === 'assistant' || message.role === 'user')
    && typeof message.message === 'string'
    && typeof message.message_id === 'number'
    && (typeof message.name === 'undefined' || typeof message.name === 'string');
}

export const useStatsStore = defineStore('stats', () => {
  const chatId = ref('');
  const contentDomainStats = ref<ContentDomainStat[]>([]);
  const contentOverview = ref<ContentOverview>(createContentOverview());
  const contentScopeTitle = ref(getContentScopeTitle());
  const contentWarnings = ref<string[]>([]);
  const currentContentOverview = ref<ContentOverview>(createContentOverview());
  const totalMessages = ref(0);
  const userMessages = ref(0);
  const assistantMessages = ref(0);
  const totalChars = ref(0);
  const averageChars = ref(0);
  const longestMessageChars = ref(0);
  const lastUpdatedAt = ref('');
  const roleStats = ref<ChatRoleStat[]>([]);
  const lengthDistribution = ref<ChatLengthPoint[]>([]);
  const loading = ref(false);
  const error = ref('');

  let refreshTimer: number | null = null;

  function refreshStoredContentStats() {
    const currentScopeKey = getCurrentChatScopeKey();
    const result = collectStoredContentStats(currentScopeKey);
    contentDomainStats.value = result.domains;
    contentOverview.value = result.overview;
    contentScopeTitle.value = getContentScopeTitle();
    contentWarnings.value = result.warnings;
    currentContentOverview.value = result.current;
  }

  function refreshCurrentChatStats() {
    const lastMessageId = getLastMessageIdSafe();
    const messages = lastMessageId >= 0 ? getChatMessagesSafe(`0-${lastMessageId}`, { hide_state: 'unhidden' }) : [];
    const visibleMessages = messages.reduce<CountableChatMessage[]>((list, message) => {
      if (isCountableChatMessage(message)) {
        list.push({
          message: message.message,
          message_id: message.message_id,
          name: message.name,
          role: message.role,
        });
      }
      return list;
    }, []);

    const countsByRole: Record<ChatSpeakerRole, number> = {
      user: 0,
      assistant: 0,
    };
    const charsByRoleName = new Map<string, ChatRoleStat>();
    const points: ChatLengthPoint[] = [];

    let chars = 0;
    let longest = 0;

    visibleMessages.forEach(message => {
      const role = message.role === 'user' ? 'user' : 'assistant';
      const normalizedName = normalizeName(message);
      const messageChars = message.message.length;
      chars += messageChars;
      longest = Math.max(longest, messageChars);
      countsByRole[role] += 1;

      const previous = charsByRoleName.get(normalizedName) ?? {
        name: normalizedName,
        count: 0,
        chars: 0,
        role,
      };
      previous.count += 1;
      previous.chars += messageChars;
      charsByRoleName.set(normalizedName, previous);

      points.push({
        messageId: message.message_id,
        role,
        name: normalizedName,
        chars: messageChars,
        preview: compactPreview(message.message),
      });
    });

    chatId.value = getCurrentChatIdLabel();
    totalMessages.value = visibleMessages.length;
    userMessages.value = countsByRole.user;
    assistantMessages.value = countsByRole.assistant;
    totalChars.value = chars;
    averageChars.value = visibleMessages.length ? Math.round(chars / visibleMessages.length) : 0;
    longestMessageChars.value = longest;
    roleStats.value = [...charsByRoleName.values()].sort((left, right) => right.count - left.count || right.chars - left.chars);
    lengthDistribution.value = points.slice(-12).reverse();
  }

  function refresh() {
    loading.value = true;
    error.value = '';

    try {
      refreshStoredContentStats();
    } catch (caughtError) {
      contentWarnings.value = [caughtError instanceof Error ? caughtError.message : '读取内容统计失败'];
    }

    try {
      refreshCurrentChatStats();
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : '读取当前聊天失败';
    } finally {
      lastUpdatedAt.value = new Date().toISOString();
      loading.value = false;
    }
  }

  function scheduleRefresh() {
    if (refreshTimer !== null) window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      refreshTimer = null;
      refresh();
    }, 80);
  }

  const listeners = [
    onTavernEvent('CHAT_CHANGED', scheduleRefresh),
    onTavernEvent('MESSAGE_SENT', scheduleRefresh),
    onTavernEvent('MESSAGE_RECEIVED', scheduleRefresh),
    onTavernEvent('MESSAGE_EDITED', scheduleRefresh),
    onTavernEvent('MESSAGE_UPDATED', scheduleRefresh),
    onTavernEvent('MESSAGE_DELETED', scheduleRefresh),
    onTavernEvent('MESSAGE_SWIPED', scheduleRefresh),
  ];

  onScopeDispose(() => {
    if (refreshTimer !== null) {
      window.clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    listeners.forEach(listener => listener.stop());
  });

  refresh();

  return {
    assistantMessages,
    averageChars,
    chatId,
    contentDomainStats,
    contentOverview,
    contentScopeTitle,
    contentWarnings,
    currentContentOverview,
    error,
    lastUpdatedAt,
    lengthDistribution,
    loading,
    longestMessageChars,
    refresh,
    roleStats,
    totalChars,
    totalMessages,
    userMessages,
  };
});
