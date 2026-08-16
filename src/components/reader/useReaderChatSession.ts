import { normalizeBrief, normalizeArchivedMessage, type ChatReaderRegexRule, type ChatReaderSettings, type ReaderMessage } from '@/store/reader';
import { usePhoneStore } from '@/store/phone';
import { normalizeChatArchiveId, parseChatScopeKey } from '@/util/chatArchive';
import { resolveReaderBodySourceRange, transformReaderMessages } from '@/util/readerRegex';
import { getChatHistoryDetailSafe, getChatMessagesSafe } from '@/util/runtime';
import type { ComputedRef } from 'vue';

export function useReaderChatSession(options: {
  activeBodyRule: ComputedRef<ChatReaderRegexRule>;
  activeTitleRule: ComputedRef<ChatReaderRegexRule>;
  applyReaderCleanupRules: (body: string) => string;
  contentRuleId: ComputedRef<string>;
  getCharacterRecords: () => unknown[];
  getCharacters: () => Promise<unknown> | unknown;
  getPastCharacterChats: (characterId: number) => Promise<unknown[] | null | undefined>;
  normalizeTitle: (title: string, messageIndex: number, isUser?: boolean) => string;
  readerSettings: ComputedRef<ChatReaderSettings>;
  syncCurrentTavernPresetName: () => void;
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
    if (phone.isViewingCurrentChat) options.syncCurrentTavernPresetName();
    const scopeKeyAtStart = phone.viewingScopeKey;
    const isViewingCurrentAtStart = phone.isViewingCurrentChat;
    if (currentMessages.value.length && loadedScopeKey.value === scopeKeyAtStart && !force) return currentMessages.value;
    const loadSerial = ++readerLoadSerial;
    loadingDetail.value = true;
    error.value = '';
    try {
      const sourceMessages = await loadViewingSourceMessages(scopeKeyAtStart, isViewingCurrentAtStart);
      const transformed = await transformReaderMessages(
        sourceMessages.map(item => ({
          messageIndex: item.messageIndex,
          rawText: item.rawText,
        })),
        options.activeTitleRule.value,
        options.activeBodyRule.value,
      );

      const normalized = sourceMessages
        .map((item, index) => {
          const sourceBody = transformed[index]?.body || item.rawText;
          const body = options.applyReaderCleanupRules(sourceBody);
          return {
            ...item,
            bodySourceRange: resolveReaderBodySourceRange(
              item.rawText,
              sourceBody,
              options.activeBodyRule.value,
              options.contentRuleId.value,
            ),
            title: options.normalizeTitle(transformed[index]?.title || '', item.messageIndex, item.isUser),
            body,
            sourceBody,
          };
        })
        .filter(
          item =>
            (options.readerSettings.value.showHiddenAssistantMessages || !item.isHidden) &&
            (!options.readerSettings.value.hideEmptyAfterCleanup || item.body.trim()),
        );

      if (loadSerial !== readerLoadSerial || phone.viewingScopeKey !== scopeKeyAtStart) return currentMessages.value;
      currentMessages.value = normalized;
      loadedScopeKey.value = scopeKeyAtStart;
      if (phone.currentRoute.page === 'detail') {
        const currentMessageId = phone.currentRoute.params?.messageId;
        const exists = normalized.some(item => item.id === currentMessageId);
        if (!exists && normalized[0]) {
          phone.replacePage('detail', normalized[0].title, {
            messageId: normalized[0].id,
          });
        }
      }
      return normalized;
    } catch (caughtError) {
      if (loadSerial === readerLoadSerial && phone.viewingScopeKey === scopeKeyAtStart) {
        error.value = caughtError instanceof Error ? caughtError.message : '读取聊天失败';
        loadedScopeKey.value = scopeKeyAtStart;
      }
      return [];
    } finally {
      if (loadSerial === readerLoadSerial) loadingDetail.value = false;
    }
  }

  async function loadViewingSourceMessages(scopeKey: string, isViewingCurrent: boolean) {
    const rawMessages = isViewingCurrent
      ? getChatMessagesSafe('0-{{lastMessageId}}')
      : await loadHistoryMessagesFromViewingScope(scopeKey);
    return rawMessages
      .map((item, index) => normalizeArchivedMessage(item, index, options.readerSettings.value))
      .filter((item): item is NonNullable<ReturnType<typeof normalizeArchivedMessage>> => Boolean(item));
  }

  async function loadHistoryMessagesFromViewingScope(scopeKey: string) {
    const scope = parseChatScopeKey(scopeKey);
    if (!scope.chatId || scope.chatId === '__no_chat__') {
      throw new Error('这个档案没有可读取的酒馆聊天文件');
    }
    if (scope.kind !== 'char') {
      throw new Error('当前只支持读取角色卡聊天历史');
    }

    await options.getCharacters();
    const characterId = resolveViewingCharacterId(scope.ownerId, phone.viewingScopeMeta.ownerName);
    if (characterId < 0) {
      throw new Error('无法在酒馆角色列表中找到这个角色卡');
    }

    const briefs = await options.getPastCharacterChats(characterId);
    const normalizedBriefs = (briefs || [])
      .map(normalizeBrief)
      .filter((item): item is NonNullable<ReturnType<typeof normalizeBrief>> => Boolean(item));
    const targetChatId = normalizeChatArchiveId(scope.chatId);
    const brief = normalizedBriefs.find(item => isHistoryBriefMatch(item, targetChatId));
    if (!brief) {
      throw new Error('无法找到这个历史聊天文件');
    }

    const result = await getChatHistoryDetailSafe([brief.raw], false);
    const detailArray =
      result && typeof result === 'object'
        ? (Object.entries(result).find(([key]) => normalizeChatArchiveId(key) === targetChatId)?.[1] ??
          Object.values(result)[0])
        : null;
    if (!Array.isArray(detailArray)) return [];
    return detailArray;
  }

  function isHistoryBriefMatch(brief: NonNullable<ReturnType<typeof normalizeBrief>>, targetChatId: string) {
    const candidates = [brief.id, brief.fileName, brief.title]
      .map(value => normalizeChatArchiveId(value))
      .filter(Boolean);
    return candidates.includes(targetChatId);
  }

  function resolveViewingCharacterId(ownerId: string, ownerName: string) {
    const characterRecords = options.getCharacterRecords();
    const numericOwnerId = Number(ownerId);
    if (
      Number.isInteger(numericOwnerId) &&
      numericOwnerId >= 0 &&
      Array.isArray(characterRecords) &&
      characterRecords[numericOwnerId]
    ) {
      return numericOwnerId;
    }

    if (!Array.isArray(characterRecords)) return -1;
    const ownerNameLower = ownerName.trim().toLowerCase();
    const ownerIdLower = ownerId.trim().toLowerCase();
    return characterRecords.findIndex(character => {
      if (!character || typeof character !== 'object') return false;
      const record = character as Record<string, unknown>;
      const name = typeof record.name === 'string' ? record.name.trim().toLowerCase() : '';
      const avatar = typeof record.avatar === 'string' ? record.avatar.trim().toLowerCase() : '';
      const avatarStem = avatar.replace(/\.[^/.]+$/, '');
      return Boolean(
        (ownerNameLower && name === ownerNameLower) ||
        (ownerIdLower && (name === ownerIdLower || avatar === ownerIdLower || avatarStem === ownerIdLower)),
      );
    });
  }

  return {
    currentMessages: readonly(currentMessages),
    error: readonly(error),
    loadingDetail: readonly(loadingDetail),
    loadCurrentChat,
    resetReaderChatSession,
  };
}
