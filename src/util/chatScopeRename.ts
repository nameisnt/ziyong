import { getRegisteredPhoneBackupRehydrateHandlers } from '@/core/appRegistry';
import {
  buildChatScopeKey,
  getCurrentChatScopeKey,
  getCurrentOwnerAliases,
  normalizeChatScopeId,
  parseChatScopeKey,
} from '@/store/chatScoped';
import { getOptionalGlobalValue } from '@/util/runtime';
// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

export interface TavernChatRenamedEvent {
  avatarId?: string;
  groupId?: number | string;
  newFileName?: string;
  oldFileName?: string;
}

export interface ChatScopeMigrationResult {
  migrated: boolean;
  replacements: number;
  sourceScopeKeys: string[];
  targetScopeKey: string;
}

interface RewriteResult {
  replacements: number;
  value: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isPhoneSettingField(field: string) {
  return field === 'sillytavern_phone' || field.startsWith('sillytavern_phone_');
}

function rewriteScopeReferences(
  value: unknown,
  sourceScopeKeys: readonly string[],
  targetScopeKey: string,
  visited = new WeakSet<object>(),
): RewriteResult {
  const sourceSet = new Set(sourceScopeKeys);
  if (typeof value === 'string') {
    return sourceSet.has(value) ? { replacements: 1, value: targetScopeKey } : { replacements: 0, value };
  }
  if (!value || typeof value !== 'object') return { replacements: 0, value };
  if (visited.has(value)) return { replacements: 0, value };
  visited.add(value);

  if (Array.isArray(value)) {
    let replacements = 0;
    value.forEach((item, index) => {
      const result = rewriteScopeReferences(item, sourceScopeKeys, targetScopeKey, visited);
      value[index] = result.value;
      replacements += result.replacements;
    });
    return { replacements, value };
  }

  const record = value as Record<string, unknown>;
  let replacements = 0;
  Object.keys(record).forEach(key => {
    const result = rewriteScopeReferences(record[key], sourceScopeKeys, targetScopeKey, visited);
    record[key] = result.value;
    replacements += result.replacements;
  });

  const matchedKeys = sourceScopeKeys.filter(
    key => key !== targetScopeKey && Object.prototype.hasOwnProperty.call(record, key),
  );
  if (matchedKeys.length) {
    const sourceValue = record[matchedKeys[0]];
    matchedKeys.forEach(key => {
      delete record[key];
      replacements += 1;
    });
    // SillyTavern reloads the renamed chat before CHAT_RENAMED, so a target scope may
    // already contain freshly-created defaults. The source scope is the authoritative data.
    record[targetScopeKey] = sourceValue;
  }

  return { replacements, value: record };
}

function getCharacterAliases(avatarId: string) {
  const aliases = new Set<string>();
  const normalizedAvatar = avatarId.trim();

  const characters = getOptionalGlobalValue<unknown[]>('characters');
  if (!Array.isArray(characters)) {
    [normalizedAvatar, normalizedAvatar.replace(/\.[^/.]+$/, '')].filter(Boolean).forEach(alias => aliases.add(alias));
    return aliases;
  }
  const characterIndex = characters.findIndex(character => {
    if (!isRecord(character)) return false;
    return typeof character.avatar === 'string' && character.avatar.trim() === normalizedAvatar;
  });
  if (characterIndex < 0) {
    [normalizedAvatar, normalizedAvatar.replace(/\.[^/.]+$/, '')].filter(Boolean).forEach(alias => aliases.add(alias));
    return aliases;
  }

  aliases.add(String(characterIndex));
  const character = characters[characterIndex];
  if (isRecord(character) && typeof character.name === 'string' && character.name.trim()) {
    aliases.add(character.name.trim());
  }
  [normalizedAvatar, normalizedAvatar.replace(/\.[^/.]+$/, '')].filter(Boolean).forEach(alias => aliases.add(alias));
  return aliases;
}

function getRenameScopeKeys(event: TavernChatRenamedEvent) {
  const oldChatId = normalizeChatScopeId(event.oldFileName ?? '');
  const newChatId = normalizeChatScopeId(event.newFileName ?? '');
  if (!oldChatId || !newChatId || oldChatId === newChatId) return null;

  const currentScopeKey = getCurrentChatScopeKey();
  const currentScope = parseChatScopeKey(currentScopeKey);
  const groupId = event.groupId === null || typeof event.groupId === 'undefined' ? '' : String(event.groupId).trim();
  const kind = groupId ? 'group' : 'char';
  const aliases = groupId ? new Set([groupId]) : getCharacterAliases(event.avatarId ?? '');

  const isCurrentRename =
    currentScope.kind === kind && (currentScope.chatId === oldChatId || currentScope.chatId === newChatId);
  if (isCurrentRename) {
    getCurrentOwnerAliases(currentScope).forEach(alias => aliases.add(alias));
  }
  if (!aliases.size || (kind === 'char' && aliases.size === 1 && aliases.has(''))) return null;

  const avatarId = (event.avatarId ?? '').trim();
  const targetOwnerId = isCurrentRename
    ? currentScope.ownerId
    : kind === 'group'
      ? groupId
      : avatarId || [...aliases][0];
  const targetScopeKey = buildChatScopeKey(kind, targetOwnerId, newChatId);
  const sourceScopeKeys = [...aliases].map(alias => buildChatScopeKey(kind, alias, oldChatId));
  return { sourceScopeKeys, targetScopeKey };
}

function rehydratePhoneStores() {
  getRegisteredPhoneBackupRehydrateHandlers().forEach(handler => {
    try {
      handler();
    } catch (error) {
      console.warn('[SillyTavern Phone] Failed to rehydrate a store after chat rename.', error);
    }
  });
}

export function migratePhoneChatScopes(
  sourceScopeKeys: readonly string[],
  targetScopeKey: string,
): ChatScopeMigrationResult {
  const normalizedSources = [...new Set(sourceScopeKeys.filter(Boolean))].filter(key => key !== targetScopeKey);
  if (!normalizedSources.length || !targetScopeKey) {
    return { migrated: false, replacements: 0, sourceScopeKeys: normalizedSources, targetScopeKey };
  }

  let replacements = 0;
  Object.keys(extension_settings)
    .filter(isPhoneSettingField)
    .forEach(field => {
      const result = rewriteScopeReferences(extension_settings[field], normalizedSources, targetScopeKey);
      extension_settings[field] = result.value;
      replacements += result.replacements;
    });

  if (replacements) {
    void saveSettingsDebounced();
    rehydratePhoneStores();
  }
  return {
    migrated: replacements > 0,
    replacements,
    sourceScopeKeys: normalizedSources,
    targetScopeKey,
  };
}

export function getChatScopeMigrationSourceKeys(sourceScopeKey: string, targetScopeKey: string) {
  const source = parseChatScopeKey(sourceScopeKey);
  const target = parseChatScopeKey(targetScopeKey);
  if (
    !source.chatId ||
    !target.chatId ||
    source.chatId === target.chatId ||
    source.kind === 'unknown' ||
    source.kind !== target.kind
  ) {
    return [];
  }

  const aliases = new Set([target.ownerId]);
  const currentScope = parseChatScopeKey(getCurrentChatScopeKey());
  if (currentScope.kind === target.kind && currentScope.chatId === target.chatId) {
    getCurrentOwnerAliases(currentScope).forEach(alias => aliases.add(alias));
  }
  if (!aliases.has(source.ownerId)) return [];
  aliases.add(source.ownerId);
  return [...aliases].map(alias => buildChatScopeKey(source.kind as 'char' | 'group', alias, source.chatId));
}

export function migratePhoneChatRename(event: TavernChatRenamedEvent) {
  const scopeKeys = getRenameScopeKeys(event);
  if (!scopeKeys) {
    return { migrated: false, replacements: 0, sourceScopeKeys: [], targetScopeKey: '' };
  }
  return migratePhoneChatScopes(scopeKeys.sourceScopeKeys, scopeKeys.targetScopeKey);
}
