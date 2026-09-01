import { normalizeBrief, normalizeArchivedMessage, type ChatReaderRegexRule, type ChatReaderSettings, type ReaderMessage } from '@/store/reader';
import { usePhoneStore } from '@/store/phone';
import { normalizeChatArchiveId } from '@/util/chatArchive';
import { resolveReaderBodySourceRange, transformReaderMessages } from '@/util/readerRegex';
import { getChatMessagesSafe } from '@/util/runtime';
import { getCharacterChatHistory } from '@/util/tavernChatHistory';
import type { ComputedRef } from 'vue';

export function useReaderChatSession(options: {
  activeBodyRule: ComputedRef<ChatReaderRegexRule>;
  activeTitleRule: ComputedRef<ChatReaderRegexRule>;
  applyReaderCleanupRules: (body: string) => string;
  contentRuleId: ComputedRef<string>;
  getPastCharacterChats: (characterId: number) => Promise<unknown[] | null | undefined>;
  normalizeTitle: (title: string, messageIndex: number, isUser?: boolean) => string;
  readerSettings: ComputedRef<ChatReaderSettings>;
  syncCurrentTavernPresetName: () => void;
  target: ComputedRef<ReaderChatTarget | null>;
}) {
  const phone = usePhoneStore();
  const currentMessages = ref<ReaderMessage[]>([]);
  const loadedScopeKey = ref('');
  const error = ref('');
  const loadingDetail = ref(false);
  let readerLoadSerial = 0;

  function resetReaderChatSession() {
    currentMessages.value = [];
    loadedScopeKey.value = '';
    error.value = '';
  }

  async function loadCurrentChat(force = false) {
    const targetAtStart = options.target.value;
    if (!targetAtStart) {
      resetReaderChatSession();
      return [];
    }
    if (targetAtStart.isCurrent) options.syncCurrentTavernPresetName();
    const scopeKeyAtStart = targetAtStart.scopeKey;
    if (currentMessages.value.length && loadedScopeKey.value === scopeKeyAtStart && !force) return currentMessages.value;
    const loadSerial = ++readerLoadSerial;
    loadingDetail.value = true;
    error.value = '';
    try {
      const sourceMessages = await loadViewingSourceMessages(targetAtStart);
      const transformed = await transformReaderMessages(
        sourceMessages.flatMap(item =>
          item.swipeCandidates.map(candidate => ({
            messageIndex: item.messageIndex,
            rawText: candidate.rawText,
          })),
        ),
        options.activeTitleRule.value,
        options.activeBodyRule.value,
      );

      let transformedIndex = 0;
      const normalized = sourceMessages
        .map(item => {
          const swipeCandidates = item.swipeCandidates.map(candidate => {
            const transformedCandidate = transformed[transformedIndex++];
            const sourceBody = transformedCandidate?.body || candidate.rawText;
            return {
              body: options.applyReaderCleanupRules(sourceBody),
              bodySourceRange: resolveReaderBodySourceRange(
                candidate.rawText,
                sourceBody,
                options.activeBodyRule.value,
                options.contentRuleId.value,
              ),
              ...candidate,
              sourceBody,
              title: options.normalizeTitle(transformedCandidate?.title || '', item.messageIndex, item.isUser),
            };
          });
          const activeSwipe =
            swipeCandidates.find(candidate => candidate.index === item.activeSwipeIndex) ?? swipeCandidates[0];
          if (!activeSwipe) return null;
          return {
            ...item,
            body: activeSwipe.body,
            bodySourceRange: activeSwipe.bodySourceRange,
            rawText: activeSwipe.rawText,
            reasoning: activeSwipe.reasoning,
            sourceBody: activeSwipe.sourceBody,
            swipeCandidates,
            title: activeSwipe.title,
          };
        })
        .filter((item): item is NonNullable<typeof item> => {
          if (!item) return false;
          return (
            (options.readerSettings.value.showHiddenAssistantMessages || !item.isHidden) &&
            (!options.readerSettings.value.hideEmptyAfterCleanup || Boolean(item.body.trim()))
          );
        });

      if (loadSerial !== readerLoadSerial || options.target.value?.scopeKey !== scopeKeyAtStart) return currentMessages.value;
      currentMessages.value = normalized;
      loadedScopeKey.value = scopeKeyAtStart;
      if (phone.currentRoute.appId === 'reader' && phone.currentRoute.page === 'detail') {
        const currentMessageId = phone.currentRoute.params?.messageId;
        const exists = normalized.some(item => item.id === currentMessageId);
        if (!exists && normalized[0]) {
          phone.replacePage('detail', normalized[0].title, {
            ...(phone.currentRoute.params || {}),
            messageId: normalized[0].id,
          });
        }
      }
      return normalized;
    } catch (caughtError) {
      if (loadSerial === readerLoadSerial && options.target.value?.scopeKey === scopeKeyAtStart) {
        error.value = caughtError instanceof Error ? caughtError.message : '读取聊天失败';
        loadedScopeKey.value = scopeKeyAtStart;
      }
      return [];
    } finally {
      if (loadSerial === readerLoadSerial) loadingDetail.value = false;
    }
  }

  async function loadViewingSourceMessages(target: ReaderChatTarget) {
    const rawMessages = target.isCurrent
      ? getChatMessagesSafe('0-{{lastMessageId}}', { include_swipes: true })
      : await loadHistoryMessagesFromTarget(target);
    return rawMessages
      .map((item, index) => normalizeArchivedMessage(item, index, options.readerSettings.value))
      .filter((item): item is NonNullable<ReturnType<typeof normalizeArchivedMessage>> => Boolean(item));
  }

  async function loadHistoryMessagesFromTarget(target: ReaderChatTarget) {
    if (!target.chatId || target.chatId === '__no_chat__') {
      throw new Error('这个档案没有可读取的酒馆聊天文件');
    }
    if (target.characterId === null) {
      throw new Error('无法在酒馆角色列表中找到这个角色卡');
    }

    const briefs = await options.getPastCharacterChats(target.characterId);
    const normalizedBriefs = (briefs || [])
      .map(normalizeBrief)
      .filter((item): item is NonNullable<ReturnType<typeof normalizeBrief>> => Boolean(item));
    const targetChatId = normalizeChatArchiveId(target.chatId);
    const brief = normalizedBriefs.find(item => isHistoryBriefMatch(item, targetChatId));
    if (!brief) {
      throw new Error('无法找到这个历史聊天文件');
    }

    return getCharacterChatHistory({ avatar: target.ownerAvatar, name: target.ownerName }, brief.fileName);
  }

  function isHistoryBriefMatch(brief: NonNullable<ReturnType<typeof normalizeBrief>>, targetChatId: string) {
    const candidates = [brief.id, brief.fileName, brief.title]
      .map(value => normalizeChatArchiveId(value))
      .filter(Boolean);
    return candidates.includes(targetChatId);
  }

  return {
    currentMessages: readonly(currentMessages),
    error: readonly(error),
    loadingDetail: readonly(loadingDetail),
    loadCurrentChat,
    resetReaderChatSession,
  };
}

export interface ReaderChatTarget {
  characterId: number | null;
  chatId: string;
  chatTitle: string;
  isCurrent: boolean;
  ownerAvatar: string;
  ownerName: string;
  scopeKey: string;
}
