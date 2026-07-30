import { validateInplace } from '@/util/zod';
import { transformReaderMessages } from '@/util/readerRegex';
import { getChatHistoryBriefSafe, getChatHistoryDetailSafe, onTavernEvent } from '@/util/runtime';
// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

export const ChatReaderRegexRuleSchema = z.object({
  find: z.string().default(''),
  replace: z.string().default(''),
  flags: z.string().default(''),
});
export type ChatReaderRegexRule = z.infer<typeof ChatReaderRegexRuleSchema>;

export const defaultReaderBodyRule: ChatReaderRegexRule = {
  find: '/<content>([\\s\\S]*?)<\\/content>/i',
  replace: '$1',
  flags: '',
};

export const ChatReaderRegexPresetSchema = z.object({
  id: z.string(),
  name: z.string().default('未命名规则'),
  title: ChatReaderRegexRuleSchema.default({ find: '', replace: '', flags: '' }),
  body: ChatReaderRegexRuleSchema.default({ find: '', replace: '', flags: '' }),
});
export type ChatReaderRegexPreset = z.infer<typeof ChatReaderRegexPresetSchema>;

export const ReaderFavoriteSchema = z.object({
  id: z.string(),
  scopeKey: z.string(),
  scopeTitle: z.string().default('当前聊天'),
  messageId: z.string(),
  sourceMessageId: z.number().default(0),
  title: z.string().default('未命名楼层'),
  content: z.string().default(''),
  sourceLabel: z.string().default(''),
  createdAt: z.string().default(''),
  updatedAt: z.string().default(''),
});
export type ReaderFavorite = z.infer<typeof ReaderFavoriteSchema>;

export const ChatReaderSettingsSchema = z.object({
  bodyRuleId: z.string().default('__default_body__'),
  cleanupRuleIds: z.array(z.string()).default([]),
  favorites: z.array(ReaderFavoriteSchema).default([]),
  hideEmptyAfterCleanup: z.boolean().default(true),
  presets: z.array(ChatReaderRegexPresetSchema).default([]),
  showUserMessages: z.boolean().default(false),
  titleRuleId: z.string().default('__default_title__'),
  showHiddenAssistantMessages: z.boolean().default(true),
});
export type ChatReaderSettings = z.infer<typeof ChatReaderSettingsSchema>;

export const defaultReaderSettings: ChatReaderSettings = {
  bodyRuleId: '__default_body__',
  cleanupRuleIds: [],
  favorites: [],
  hideEmptyAfterCleanup: true,
  presets: [
    {
      id: 'reader_regex_default',
      name: '默认规则',
      title: { find: '', replace: '', flags: '' },
      body: { ...defaultReaderBodyRule },
    },
  ],
  showUserMessages: false,
  titleRuleId: '__default_title__',
  showHiddenAssistantMessages: true,
};

export interface ChatHistoryBriefItem {
  id: string;
  fileName: string;
  title: string;
  updatedAt: string;
  messageCount: number | null;
  preview: string;
  raw: unknown;
}

export interface ReaderMessage {
  id: string;
  messageIndex: number;
  sourceMessageId: number;
  title: string;
  body: string;
  rawText: string;
  name: string;
  isHidden: boolean;
  isUser: boolean;
  swipeCount: number;
  timeLabel: string;
}

export const readerSettingsField = 'sillytavern_phone_chat_reader_settings';

interface PendingReaderMessage {
  id: string;
  isHidden: boolean;
  isUser: boolean;
  messageIndex: number;
  sourceMessageId: number;
  name: string;
  rawText: string;
  swipeCount: number;
  timeLabel: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function pickNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  }
  return null;
}

function pickBoolean(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'boolean') return value;
  }
  return false;
}

function compactPreview(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, 96);
}

function createRegexPresetId() {
  return `reader_regex_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function isEmptyRegexRule(rule: ChatReaderRegexRule) {
  return !rule.find.trim() && !rule.replace.trim() && !rule.flags.trim();
}

function normalizeReaderSettings(settings: ChatReaderSettings): ChatReaderSettings {
  return {
    ...settings,
    presets: settings.presets.map(preset => {
      if (preset.id !== 'reader_regex_default' || !isEmptyRegexRule(preset.body)) return preset;
      return {
        ...preset,
        body: { ...defaultReaderBodyRule },
      };
    }),
  };
}

function readReaderSettings(raw: unknown): ChatReaderSettings {
  try {
    const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const parsed = validateInplace(ChatReaderSettingsSchema, source);
    if (parsed.presets.length) return normalizeReaderSettings(parsed);

    const legacy = source as {
      body?: ChatReaderRegexRule;
      presets?: ChatReaderRegexPreset[];
      title?: ChatReaderRegexRule;
    };
    return normalizeReaderSettings({
      bodyRuleId: parsed.bodyRuleId,
      cleanupRuleIds: parsed.cleanupRuleIds,
      favorites: parsed.favorites,
      hideEmptyAfterCleanup: parsed.hideEmptyAfterCleanup,
      presets: [
        {
          id: 'reader_regex_default',
          name: '默认规则',
          title: validateInplace(ChatReaderRegexRuleSchema, legacy.title ?? {}),
          body: validateInplace(ChatReaderRegexRuleSchema, legacy.body ?? {}),
        },
      ],
      showUserMessages: parsed.showUserMessages,
      titleRuleId: parsed.titleRuleId,
      showHiddenAssistantMessages: parsed.showHiddenAssistantMessages,
    });
  } catch {
    return klona(defaultReaderSettings);
  }
}

export function normalizeBrief(raw: unknown, index: number): ChatHistoryBriefItem | null {
  const record = asRecord(raw);
  if (!record) return null;
  const fileName =
    pickString(record, ['file_name', 'fileName', 'chat_id', 'chatId', 'file', 'name', 'chat']) || `chat-${index + 1}`;
  return {
    id: fileName,
    fileName,
    title: pickString(record, ['title', 'file_name', 'fileName', 'name', 'chat']) || fileName,
    updatedAt: pickString(record, ['last_mes', 'updatedAt', 'create_date', 'date_last_chat', 'date_added']),
    messageCount: pickNumber(record, ['mes_cnt', 'messageCount', 'message_count', 'count']),
    preview: compactPreview(pickString(record, ['mes', 'preview', 'snippet', 'last_mes'])),
    raw,
  };
}

function extractMessageText(record: Record<string, unknown>) {
  const direct = pickString(record, ['mes', 'message']);
  if (direct) return direct;
  const swipeId = typeof record.swipe_id === 'number' ? record.swipe_id : 0;
  if (Array.isArray(record.swipes) && typeof record.swipes[swipeId] === 'string') {
    return String(record.swipes[swipeId]);
  }
  if (Array.isArray(record.swipes)) {
    const firstSwipe = record.swipes.find(item => typeof item === 'string' && item.trim());
    if (typeof firstSwipe === 'string') return firstSwipe.trim();
  }
  return '';
}

export function normalizeArchivedMessage(
  raw: unknown,
  index: number,
  settings: ChatReaderSettings,
): PendingReaderMessage | null {
  const record = asRecord(raw);
  if (!record) return null;
  const extra = asRecord(record.extra);
  const role = pickString(record, ['role']).toLowerCase();
  const isNarrator = extra?.type === 'narrator' || role === 'system';
  const isUser = pickBoolean(record, ['is_user', 'isUser']) || role === 'user';
  const isSystem = pickBoolean(record, ['is_system', 'isSystem']) || extra?.type === 'system';
  if (isNarrator || (isUser && !settings.showUserMessages)) return null;

  const rawText = extractMessageText(record);
  if (!rawText) return null;

  const isHidden = pickBoolean(record, ['is_hidden', 'isHidden']) || isSystem;

  const messageIndex = index + 1;
  const sourceMessageId = pickNumber(record, ['message_id']) ?? index;
  return {
    id: `${sourceMessageId}-${messageIndex}`,
    messageIndex,
    sourceMessageId,
    rawText,
    name: pickString(record, ['name']) || (isUser ? '用户' : 'AI'),
    isHidden,
    isUser,
    swipeCount: Array.isArray(record.swipes) ? record.swipes.length : 1,
    timeLabel: pickString(record, ['send_date', 'sendDate', 'createdAt', 'create_date', 'date', 'timestamp', 'time']),
  };
}

export const useReaderStore = defineStore('reader', () => {
  const settings = ref<ChatReaderSettings>(readReaderSettings(_.get(extension_settings, readerSettingsField, {})));
  const briefs = ref<ChatHistoryBriefItem[]>([]);
  const detailCache = ref<Record<string, ReaderMessage[]>>({});
  const loadingBriefs = ref(false);
  const loadingDetail = ref(false);
  const error = ref('');
  const presets = computed(() =>
    settings.value.presets.length ? settings.value.presets : defaultReaderSettings.presets,
  );

  function persist(nextSettings: typeof settings.value) {
    const parsed = readReaderSettings(klona(nextSettings));
    _.set(extension_settings, readerSettingsField, parsed);
    void saveSettingsDebounced();
  }

  watch(
    settings,
    nextSettings => {
      persist(nextSettings);
    },
    { deep: true },
  );

  async function loadBriefs(force = false) {
    if (briefs.value.length && !force) return briefs.value;
    loadingBriefs.value = true;
    error.value = '';
    try {
      const items = await getChatHistoryBriefSafe('current');
      const itemList = Array.isArray(items) ? items : [];
      briefs.value = itemList
        .map((item, index) => normalizeBrief(item, index))
        .filter((item): item is ChatHistoryBriefItem => Boolean(item));
      return briefs.value;
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : '读取聊天目录失败';
      return [];
    } finally {
      loadingBriefs.value = false;
    }
  }

  async function loadChat(fileName: string, force = false) {
    if (detailCache.value[fileName] && !force) return detailCache.value[fileName];
    loadingDetail.value = true;
    error.value = '';
    try {
      const brief =
        briefs.value.find(item => item.fileName === fileName) ??
        (await loadBriefs()).find(item => item.fileName === fileName);
      if (!brief) return [];
      const result = await getChatHistoryDetailSafe([brief.raw], Boolean(SillyTavern.groupId));
      const resultRecord = result && typeof result === 'object' ? (result as Record<string, unknown>) : null;
      const detailArray = resultRecord
        ? (Object.entries(resultRecord).find(([key]) => key === fileName)?.[1] ?? Object.values(resultRecord)[0])
        : null;
      const baseMessages = Array.isArray(detailArray)
        ? detailArray
            .map((item, index) => normalizeArchivedMessage(item, index, settings.value))
            .filter((item): item is PendingReaderMessage => Boolean(item))
        : [];
      const transformed = await transformReaderMessages(
        baseMessages.map(item => ({
          messageIndex: item.messageIndex,
          rawText: item.rawText,
        })),
        presets.value[0]?.title ?? defaultReaderSettings.presets[0].title,
        presets.value[0]?.body ?? defaultReaderSettings.presets[0].body,
      );
      const normalized = baseMessages.map((item, index) => ({
        ...item,
        title: transformed[index]?.title || `第 ${item.messageIndex} 楼`,
        body: transformed[index]?.body || item.rawText,
      }));
      detailCache.value = {
        ...detailCache.value,
        [fileName]: normalized,
      };
      return normalized;
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : '读取聊天正文失败';
      return [];
    } finally {
      loadingDetail.value = false;
    }
  }

  function clearDetailCache() {
    detailCache.value = {};
  }

  function resetAllCaches() {
    briefs.value = [];
    clearDetailCache();
  }

  function setShowHiddenAssistantMessages(nextValue: boolean) {
    settings.value.showHiddenAssistantMessages = nextValue;
    clearDetailCache();
  }

  function setShowUserMessages(nextValue: boolean) {
    settings.value.showUserMessages = nextValue;
    clearDetailCache();
  }

  function setReaderRegexSelection(kind: 'body' | 'title', ruleId: string) {
    if (kind === 'title') {
      settings.value.titleRuleId = ruleId || '__default_title__';
    } else {
      settings.value.bodyRuleId = ruleId || '__default_body__';
    }
    clearDetailCache();
  }

  function setCleanupRuleEnabled(ruleId: string, enabled: boolean) {
    settings.value.cleanupRuleIds = enabled
      ? [...new Set([...settings.value.cleanupRuleIds, ruleId])]
      : settings.value.cleanupRuleIds.filter(id => id !== ruleId);
    clearDetailCache();
  }

  function setHideEmptyAfterCleanup(nextValue: boolean) {
    settings.value.hideEmptyAfterCleanup = nextValue;
    clearDetailCache();
  }

  function getFavorite(scopeKey: string, messageId: string) {
    return settings.value.favorites.find(item => item.scopeKey === scopeKey && item.messageId === messageId) ?? null;
  }

  function toggleFavorite(input: Omit<ReaderFavorite, 'createdAt' | 'id' | 'updatedAt'>) {
    const existing = getFavorite(input.scopeKey, input.messageId);
    if (existing) {
      settings.value.favorites = settings.value.favorites.filter(item => item.id !== existing.id);
      return null;
    }

    const now = new Date().toISOString();
    const favorite: ReaderFavorite = {
      ...input,
      id: `reader_favorite_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
    settings.value.favorites = [favorite, ...settings.value.favorites];
    return favorite;
  }

  function removeFavorite(favoriteId: string) {
    settings.value.favorites = settings.value.favorites.filter(item => item.id !== favoriteId);
  }

  function rehydrateFromSettings() {
    settings.value = readReaderSettings(_.get(extension_settings, readerSettingsField, {}));
    resetAllCaches();
  }

  function createPreset(name = '') {
    const preset: ChatReaderRegexPreset = {
      id: createRegexPresetId(),
      name: name.trim() || `规则 ${settings.value.presets.length + 1}`,
      title: { find: '', replace: '', flags: '' },
      body: { ...defaultReaderBodyRule },
    };
    settings.value.presets = [...presets.value, preset];
    return preset;
  }

  function updatePreset(presetId: string, patch: Partial<Omit<ChatReaderRegexPreset, 'id'>>) {
    settings.value.presets = presets.value.map(preset => {
      if (preset.id !== presetId) return preset;
      return {
        ...preset,
        ...patch,
        name: typeof patch.name === 'string' ? patch.name.trim() || preset.name : preset.name,
        title: patch.title ? validateInplace(ChatReaderRegexRuleSchema, patch.title) : preset.title,
        body: patch.body ? validateInplace(ChatReaderRegexRuleSchema, patch.body) : preset.body,
      };
    });
    clearDetailCache();
  }

  function deletePreset(presetId: string) {
    const nextPresets = presets.value.filter(preset => preset.id !== presetId);
    settings.value.presets = nextPresets.length ? nextPresets : klona(defaultReaderSettings.presets);
    clearDetailCache();
  }

  const stopChatChanged = onTavernEvent('CHAT_CHANGED', () => {
    resetAllCaches();
  });
  onScopeDispose(() => {
    stopChatChanged.stop();
  });

  return {
    briefs,
    clearDetailCache,
    detailCache,
    createPreset,
    deletePreset,
    error,
    getFavorite,
    loadBriefs,
    loadChat,
    loadingBriefs,
    loadingDetail,
    presets,
    removeFavorite,
    resetAllCaches,
    rehydrateFromSettings,
    setCleanupRuleEnabled,
    setHideEmptyAfterCleanup,
    setShowHiddenAssistantMessages,
    setShowUserMessages,
    setReaderRegexSelection,
    settings,
    toggleFavorite,
    updatePreset,
  };
});
