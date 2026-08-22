import { getProfileKindLabel, profilesField, ProfilesScopeDataSchema, type ProfileEntry } from './store';
import { worldSlotsField } from '@/apps/world-slots/store';
import { areChatScopeKeysEquivalent, getCurrentChatScopeKey } from '@/store/chatScoped';
// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

export { profilesField };

interface ChatScopedEnvelope {
  __chatScoped: true;
  legacyScopeMigrations: Record<string, string>;
  scopes: Record<string, unknown>;
}

export interface LegacyProfilesCleanupPlan {
  embeddedEntries: number;
  migratedSlots: number;
  nextWorldSlots: unknown;
  profilesFound: boolean;
  unresolvedReferences: number;
  worldSlotsChanged: boolean;
}

export interface LegacyProfilesCleanupResult extends LegacyProfilesCleanupPlan {
  deleted: boolean;
  error: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readEnvelopeValue(raw: unknown, currentScopeKey: string): ChatScopedEnvelope {
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
      scopes: klona(raw.scopes),
    };
  }

  return {
    __chatScoped: true,
    legacyScopeMigrations: {},
    scopes: typeof raw === 'undefined' ? {} : { [currentScopeKey]: klona(raw) },
  };
}

function buildProfileContent(entry: ProfileEntry, columns: Array<{ enabled: boolean; id: string; label: string }>) {
  const enabledColumnIds = new Set(columns.filter(column => column.enabled).map(column => column.id));
  const fieldLines = columns
    .filter(column => column.enabled && !['title', 'summary', 'tags', 'content'].includes(column.id))
    .map(column => (entry.fields[column.id]?.trim() ? `${column.label}：${entry.fields[column.id].trim()}` : ''))
    .filter(Boolean);
  return [
    `## ${entry.title}`,
    `类型：${getProfileKindLabel(entry.kind)}`,
    enabledColumnIds.has('summary') && entry.summary ? `摘要：${entry.summary}` : '',
    enabledColumnIds.has('tags') && entry.tags.length ? `标签：${entry.tags.join('、')}` : '',
    ...fieldLines,
  ]
    .filter(Boolean)
    .join('\n');
}

function findProfileScope(profileEnvelope: ChatScopedEnvelope, scopeKey: string) {
  return Object.entries(profileEnvelope.scopes).find(
    ([candidateScopeKey]) => candidateScopeKey === scopeKey || areChatScopeKeysEquivalent(candidateScopeKey, scopeKey),
  )?.[1];
}

export function planLegacyProfilesCleanup(
  rawProfiles: unknown,
  rawWorldSlots: unknown,
  currentScopeKey = getCurrentChatScopeKey(),
): LegacyProfilesCleanupPlan {
  if (typeof rawProfiles === 'undefined') {
    return {
      embeddedEntries: 0,
      migratedSlots: 0,
      nextWorldSlots: rawWorldSlots,
      profilesFound: false,
      unresolvedReferences: 0,
      worldSlotsChanged: false,
    };
  }

  const profileEnvelope = readEnvelopeValue(rawProfiles, currentScopeKey);
  const worldEnvelope = readEnvelopeValue(rawWorldSlots, currentScopeKey);
  let embeddedEntries = 0;
  let migratedSlots = 0;
  let unresolvedReferences = 0;
  let worldSlotsChanged = false;

  Object.entries(worldEnvelope.scopes).forEach(([scopeKey, rawScope]) => {
    if (!isRecord(rawScope)) throw new Error(`世界书槽位“${scopeKey}”不是有效对象`);
    if (typeof rawScope.slots === 'undefined') return;
    if (!Array.isArray(rawScope.slots)) throw new Error(`世界书槽位“${scopeKey}”的 slots 不是数组`);

    const hasProfileReferences = rawScope.slots.some(
      rawSlot => isRecord(rawSlot) && Array.isArray(rawSlot.profileEntryIds) && rawSlot.profileEntryIds.length > 0,
    );
    const rawProfileScope = hasProfileReferences ? findProfileScope(profileEnvelope, scopeKey) : undefined;
    const profileResult = hasProfileReferences
      ? ProfilesScopeDataSchema.safeParse(rawProfileScope ?? {})
      : ProfilesScopeDataSchema.safeParse({});
    if (!profileResult.success) {
      throw new Error(`旧资料“${scopeKey}”无法解析：${profileResult.error.issues[0]?.message || '格式无效'}`);
    }
    const profilesById = new Map(profileResult.data.entries.map(entry => [entry.id, entry]));
    const tablesById = new Map(profileResult.data.tables.map(table => [table.id, table]));

    const slots = rawScope.slots.map((rawSlot, index) => {
      if (!isRecord(rawSlot)) throw new Error(`世界书槽位“${scopeKey}”第 ${index + 1} 项不是有效对象`);
      const profileEntryIds = Array.isArray(rawSlot.profileEntryIds)
        ? rawSlot.profileEntryIds.filter((id): id is string => typeof id === 'string')
        : [];
      const profileBlocks = profileEntryIds
        .map(id => profilesById.get(id))
        .filter((entry): entry is ProfileEntry => Boolean(entry))
        .map(entry => buildProfileContent(entry, tablesById.get(entry.tableId)?.columns ?? []));
      embeddedEntries += profileBlocks.length;
      unresolvedReferences += Math.max(0, profileEntryIds.length - profileBlocks.length);

      const slot = { ...rawSlot };
      const hadLegacyFields = 'profileEntryIds' in slot || 'type' in slot;
      if ('profileEntryIds' in slot) delete slot.profileEntryIds;
      if ('type' in slot) delete slot.type;
      if (slot.strategyType !== 'constant' && slot.strategyType !== 'selective') {
        slot.strategyType = Array.isArray(slot.keys) && slot.keys.length ? 'selective' : 'constant';
      }
      if (hadLegacyFields) {
        slot.content = [typeof rawSlot.content === 'string' ? rawSlot.content.trim() : '', ...profileBlocks]
          .filter(Boolean)
          .join('\n\n');
        migratedSlots += 1;
        worldSlotsChanged = true;
      }
      return slot;
    });

    const nextScope: Record<string, unknown> = { ...rawScope, slots };
    if ('bookName' in nextScope) {
      delete nextScope.bookName;
      worldSlotsChanged = true;
    }
    worldEnvelope.scopes[scopeKey] = nextScope;
  });

  return {
    embeddedEntries,
    migratedSlots,
    nextWorldSlots: worldEnvelope,
    profilesFound: true,
    unresolvedReferences,
    worldSlotsChanged,
  };
}

export function runLegacyProfilesCleanup(): LegacyProfilesCleanupResult {
  const rawProfiles = _.get(extension_settings, profilesField);
  const rawWorldSlots = _.get(extension_settings, worldSlotsField);
  try {
    const plan = planLegacyProfilesCleanup(rawProfiles, rawWorldSlots);
    if (!plan.profilesFound) return { ...plan, deleted: false, error: '' };
    if (plan.worldSlotsChanged) _.set(extension_settings, worldSlotsField, plan.nextWorldSlots);
    delete extension_settings[profilesField];
    void saveSettingsDebounced();
    return { ...plan, deleted: true, error: '' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[功能性阅读器] 旧资料删除已停止', error);
    toastr?.error?.(`旧资料删除已停止：${message}`);
    return {
      deleted: false,
      embeddedEntries: 0,
      error: message,
      migratedSlots: 0,
      nextWorldSlots: rawWorldSlots,
      profilesFound: typeof rawProfiles !== 'undefined',
      unresolvedReferences: 0,
      worldSlotsChanged: false,
    };
  }
}
