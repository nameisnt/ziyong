import { parsePrettified } from '@/util/zod';
import { getOptionalGlobalFunction, getOptionalGlobalValue, onTavernEvent } from '@/util/runtime';
// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';
import type { ZodType } from 'zod';

interface ChatScopedEnvelope {
  __chatScoped: true;
  legacyScopeMigrations: Record<string, string>;
  scopes: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function readChatScopedEnvelope(field: string, currentScopeKey: string): ChatScopedEnvelope {
  const raw = _.get(extension_settings, field);

  if (isRecord(raw) && raw.__chatScoped === true && isRecord(raw.scopes)) {
    const legacyScopeMigrations = isRecord(raw.legacyScopeMigrations)
      ? Object.fromEntries(
          Object.entries(raw.legacyScopeMigrations).filter(
            (entry): entry is [string, string] => typeof entry[1] === 'string',
          ),
        )
      : {};
    return {
      __chatScoped: true,
      legacyScopeMigrations,
      scopes: { ...raw.scopes },
    };
  }

  if (typeof raw === 'undefined') {
    return {
      __chatScoped: true,
      legacyScopeMigrations: {},
      scopes: {},
    };
  }

  return {
    __chatScoped: true,
    legacyScopeMigrations: {},
    scopes: {
      [currentScopeKey]: raw,
    },
  };
}

export function getCurrentChatScopeKey() {
  const getCurrentChatId = getOptionalGlobalFunction<() => number | string | null | undefined>('getCurrentChatId');
  const chatId = normalizeChatScopeId(
    normalizeScopePart(
      getCurrentChatId?.() ??
        getOptionalGlobalValue('chatId') ??
        getOptionalGlobalValue('currentChatId') ??
        SillyTavern.getCurrentChatId?.() ??
        SillyTavern.chatId,
      '__no_chat__',
    ),
  );

  const groupId = normalizeScopePart(getOptionalGlobalValue('groupId') ?? SillyTavern.groupId, '');
  if (groupId) {
    return `group:${groupId}:chat:${chatId}`;
  }

  const getCurrentCharacterId =
    getOptionalGlobalFunction<() => number | string | null | undefined>('getCurrentCharacterId');
  const getCurrentCharacterName = getOptionalGlobalFunction<() => string | null | undefined>('getCurrentCharacterName');
  const characterId = normalizeScopePart(
    getCurrentCharacterId?.() ??
      getOptionalGlobalValue('this_chid') ??
      getOptionalGlobalValue('characterId') ??
      getCurrentCharacterName?.(),
    '__no_character__',
  );
  return `char:${characterId}:chat:${chatId}`;
}

export function normalizeChatScopeId(value: string) {
  return value.trim().replace(/\.jsonl$/i, '');
}

function normalizeScopePart(value: unknown, fallback: string) {
  if (value === null || typeof value === 'undefined') return fallback;
  const normalized = String(value).trim();
  if (!normalized || normalized === '-1' || normalized === 'undefined' || normalized === 'null') return fallback;
  return normalized;
}

export function isPlaceholderChatScopeKey(scopeKey: string) {
  return scopeKey.includes('__no_chat__') || scopeKey.includes('__no_character__');
}

export interface ParsedChatScopeKey {
  chatId: string;
  kind: 'char' | 'group' | 'unknown';
  ownerId: string;
}

export function parseChatScopeKey(scopeKey: string): ParsedChatScopeKey {
  const marker = ':chat:';
  const index = scopeKey.lastIndexOf(marker);
  if (index < 0) return { chatId: '', kind: 'unknown', ownerId: scopeKey };
  const owner = scopeKey.slice(0, index);
  const separator = owner.indexOf(':');
  const kind = owner.slice(0, separator);
  return {
    chatId: normalizeChatScopeId(scopeKey.slice(index + marker.length)),
    kind: kind === 'char' || kind === 'group' ? kind : 'unknown',
    ownerId: separator >= 0 ? owner.slice(separator + 1) : owner,
  };
}

export function buildChatScopeKey(kind: 'char' | 'group', ownerId: string, chatId: string) {
  return `${kind}:${ownerId}:chat:${normalizeChatScopeId(chatId)}`;
}

export function getCurrentOwnerAliases(scope: ParsedChatScopeKey) {
  const aliases = new Set([scope.ownerId].filter(Boolean));
  if (scope.kind === 'group') {
    const groupId = getOptionalGlobalValue('groupId');
    if (typeof groupId !== 'undefined' && groupId !== null) aliases.add(String(groupId));
    return aliases;
  }
  if (scope.kind !== 'char') return aliases;

  const getCurrentCharacterId =
    getOptionalGlobalFunction<() => number | string | null | undefined>('getCurrentCharacterId');
  const getCurrentCharacterName = getOptionalGlobalFunction<() => string | null | undefined>('getCurrentCharacterName');
  [
    getCurrentCharacterId?.(),
    getOptionalGlobalValue('this_chid'),
    getOptionalGlobalValue('characterId'),
    getCurrentCharacterName?.(),
  ].forEach(alias => {
    const normalized = typeof alias === 'undefined' || alias === null ? '' : String(alias).trim();
    if (normalized && normalized !== '-1') aliases.add(normalized);
  });

  const characterIndex = Number(getOptionalGlobalValue('this_chid') ?? getCurrentCharacterId?.());
  const characters = getOptionalGlobalValue<unknown[]>('characters');
  const currentCharacter =
    Number.isInteger(characterIndex) && characterIndex >= 0 && Array.isArray(characters)
      ? characters[characterIndex]
      : null;
  if (currentCharacter && typeof currentCharacter === 'object') {
    const record = currentCharacter as Record<string, unknown>;
    const name = typeof record.name === 'string' ? record.name.trim() : '';
    const avatar = typeof record.avatar === 'string' ? record.avatar.trim() : '';
    [name, avatar, avatar.replace(/\.[^/.]+$/, '')].filter(Boolean).forEach(alias => aliases.add(alias));
  }
  return aliases;
}

export function areChatScopeKeysEquivalent(leftScopeKey: string, rightScopeKey: string) {
  if (leftScopeKey === rightScopeKey) return true;
  const left = parseChatScopeKey(leftScopeKey);
  const right = parseChatScopeKey(rightScopeKey);
  if (!left.chatId || left.kind === 'unknown') return false;
  if (left.kind !== right.kind || left.chatId !== right.chatId) return false;
  if (left.ownerId === right.ownerId) return true;

  const current = parseChatScopeKey(getCurrentChatScopeKey());
  if (current.kind !== left.kind || current.chatId !== left.chatId) return false;
  const aliases = getCurrentOwnerAliases(current);
  return aliases.has(left.ownerId) && aliases.has(right.ownerId);
}

export function getLegacyNoChatScopeKeys(scopeKey: string) {
  const scope = parseChatScopeKey(scopeKey);
  if ((scope.kind !== 'char' && scope.kind !== 'group') || isPlaceholderChatScopeKey(scopeKey)) return [];
  return [...getCurrentOwnerAliases(scope)]
    .map(alias => buildChatScopeKey(scope.kind as 'char' | 'group', alias, '__no_chat__'))
    .filter(legacyScopeKey => legacyScopeKey !== scopeKey);
}

function getCurrentScopeCompatibilityKeys(
  scopeKey: string,
  storedScopeKeys: string[],
  legacyScopeMigrations: Record<string, string>,
) {
  if (scopeKey !== getCurrentChatScopeKey() || isPlaceholderChatScopeKey(scopeKey)) return [];
  const scope = parseChatScopeKey(scopeKey);
  if (scope.kind !== 'char' && scope.kind !== 'group') return [];

  const candidates = new Set<string>();
  const ownerAliases = getCurrentOwnerAliases(scope);
  ownerAliases.forEach(alias => {
    candidates.add(buildChatScopeKey(scope.kind as 'char' | 'group', alias, scope.chatId));
  });
  getLegacyNoChatScopeKeys(scopeKey)
    .filter(candidate => !legacyScopeMigrations[candidate])
    .forEach(candidate => candidates.add(candidate));

  storedScopeKeys.forEach(candidate => {
    const parsed = parseChatScopeKey(candidate);
    if (parsed.kind !== scope.kind || parsed.chatId !== scope.chatId || !ownerAliases.has(parsed.ownerId)) return;
    candidates.add(candidate);
  });
  candidates.delete(scopeKey);
  return [...candidates];
}

export function useChatScopedDomain<T>(options: { field: string; schema: ZodType<T>; createDefault: () => T }) {
  const scopeKey = ref(getCurrentChatScopeKey());
  const envelope = ref<ChatScopedEnvelope>(readChatScopedEnvelope(options.field, scopeKey.value));
  const hydrating = ref(false);
  const configError = ref('');
  const rawConfig = shallowRef<unknown>(undefined);

  function parseScopeData(raw: unknown, targetScopeKey: string, defaultData: T) {
    try {
      return parsePrettified(options.schema, klona(raw));
    } catch (error) {
      configError.value = `聊天数据“${targetScopeKey}”校验失败：${error instanceof Error ? error.message : '数据格式无效'}`;
      rawConfig.value = klona(raw);
      return defaultData;
    }
  }

  function markLegacyScopesMigrated(targetScopeKey: string) {
    getLegacyNoChatScopeKeys(targetScopeKey).forEach(legacyScopeKey => {
      if (typeof envelope.value.scopes[legacyScopeKey] === 'undefined') return;
      envelope.value.legacyScopeMigrations[legacyScopeKey] = targetScopeKey;
    });
  }

  function loadScopeData(targetScopeKey: string) {
    const defaultData = options.createDefault();
    const raw = envelope.value.scopes[targetScopeKey];
    if (typeof raw !== 'undefined') {
      const parsed = parseScopeData(raw, targetScopeKey, defaultData);
      if (configError.value) return defaultData;
      if (!_.isEqual(parsed, defaultData)) {
        markLegacyScopesMigrated(targetScopeKey);
        return parsed;
      }
    }

    const compatibilityKeys = getCurrentScopeCompatibilityKeys(
      targetScopeKey,
      Object.keys(envelope.value.scopes),
      envelope.value.legacyScopeMigrations,
    );
    for (const compatibilityKey of compatibilityKeys) {
      const compatibilityRaw = envelope.value.scopes[compatibilityKey];
      if (typeof compatibilityRaw === 'undefined') continue;
      const compatibilityData = parseScopeData(compatibilityRaw, compatibilityKey, defaultData);
      if (configError.value) return defaultData;
      if (!_.isEqual(compatibilityData, defaultData)) {
        markLegacyScopesMigrated(targetScopeKey);
        return compatibilityData;
      }
    }
    return typeof raw === 'undefined' ? defaultData : parseScopeData(raw, targetScopeKey, defaultData);
  }

  const data = ref<T>(loadScopeData(scopeKey.value));

  function persistEnvelope() {
    _.set(extension_settings, options.field, {
      __chatScoped: true,
      legacyScopeMigrations: envelope.value.legacyScopeMigrations,
      scopes: envelope.value.scopes,
    } satisfies ChatScopedEnvelope);
    void saveSettingsDebounced();
  }

  function persistCurrentScope() {
    if (configError.value) return;
    const parsed = parsePrettified(options.schema, klona(data.value));
    envelope.value.scopes = {
      ...envelope.value.scopes,
      [scopeKey.value]: parsed,
    };
    persistEnvelope();
  }

  function switchScope(nextScopeKey: string) {
    if (nextScopeKey === scopeKey.value) return;

    persistCurrentScope();

    hydrating.value = true;
    configError.value = '';
    rawConfig.value = undefined;
    scopeKey.value = nextScopeKey;
    data.value = loadScopeData(nextScopeKey);
    hydrating.value = false;
    persistCurrentScope();
  }

  function resetCurrentScope() {
    hydrating.value = true;
    configError.value = '';
    rawConfig.value = undefined;
    data.value = options.createDefault();
    hydrating.value = false;
    persistCurrentScope();
  }

  function rehydrateFromSettings() {
    hydrating.value = true;
    configError.value = '';
    rawConfig.value = undefined;
    envelope.value = readChatScopedEnvelope(options.field, scopeKey.value);
    data.value = loadScopeData(scopeKey.value);
    hydrating.value = false;
    persistCurrentScope();
  }

  watch(
    data,
    () => {
      if (hydrating.value) return;
      persistCurrentScope();
    },
    { deep: true },
  );

  const stopChatChanged = onTavernEvent('CHAT_CHANGED', () => {
    switchScope(getCurrentChatScopeKey());
  });
  onScopeDispose(() => {
    stopChatChanged.stop();
  });

  persistCurrentScope();

  return {
    configError,
    data,
    rawConfig,
    rehydrateFromSettings,
    resetCurrentScope,
    scopeKey,
    switchScope,
  };
}
