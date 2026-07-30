import { getCurrentWorldbookGroups, getWorldbookEntries, setWorldbookEntryStates } from './api';
import { getCurrentChatScopeKey, isPlaceholderChatScopeKey } from '@/store/chatScoped';
import { validateInplace } from '@/util/zod';
// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

export const worldbookLinkField = 'sillytavern_phone_worldbook_links';

const WorldbookEntryStateSchema = z.object({
  enabled: z.boolean().default(false),
  name: z.string().default('未命名条目'),
  uid: z.number().int().nonnegative(),
});
export type WorldbookEntryState = z.infer<typeof WorldbookEntryStateSchema>;

const WorldbookStateSnapshotSchema = z.object({
  entries: z.array(WorldbookEntryStateSchema).default([]),
  updatedAt: z.string().default(''),
});
export type WorldbookStateSnapshot = z.infer<typeof WorldbookStateSnapshotSchema>;

const WorldbookLinkSettingsSchema = z.object({
  activeScopes: z.record(z.string(), z.string()).default({}),
  baselines: z.record(z.string(), WorldbookStateSnapshotSchema).default({}),
  profiles: z.record(z.string(), z.record(z.string(), WorldbookStateSnapshotSchema)).default({}),
  version: z.literal(1).default(1),
});
export type WorldbookLinkSettings = z.infer<typeof WorldbookLinkSettingsSchema>;

export interface WorldbookLinkStatus {
  currentEntries: WorldbookEntry[];
  enabledCount: number;
  matchesCurrent: boolean;
  missingCount: number;
  profile: WorldbookStateSnapshot | null;
}

function nowIso() {
  return new Date().toISOString();
}

function readSettings(raw: unknown) {
  return validateInplace(WorldbookLinkSettingsSchema, raw && typeof raw === 'object' ? raw : {});
}

function snapshotEntries(entries: WorldbookEntry[]): WorldbookEntryState[] {
  return entries.map(entry => ({
    enabled: entry.enabled,
    name: entry.name || `条目 #${entry.uid}`,
    uid: entry.uid,
  }));
}

function stateMap(snapshot: WorldbookStateSnapshot) {
  return new Map(snapshot.entries.map(entry => [entry.uid, entry.enabled]));
}

function currentBoundBookNames() {
  const groups = getCurrentWorldbookGroups();
  return new Set([...groups.globalEnabled, ...groups.character, ...groups.additional, ...groups.chat]);
}

function waitForBindings(delayMs = 900) {
  return new Promise<void>(resolve => window.setTimeout(resolve, delayMs));
}

function assertUsableChatScope(scopeKey: string) {
  if (isPlaceholderChatScopeKey(scopeKey) && scopeKey.includes('__no_chat__')) {
    throw new Error('当前聊天标识尚未就绪，请重新进入聊天后再关联');
  }
}

export const useWorldbookLinkStore = defineStore('worldbook-link', () => {
  const settings = ref<WorldbookLinkSettings>(readSettings(_.get(extension_settings, worldbookLinkField, {})));
  let scopeSequence = 0;

  watch(
    settings,
    nextSettings => {
      _.set(extension_settings, worldbookLinkField, readSettings(klona(nextSettings)));
      void saveSettingsDebounced();
    },
    { deep: true },
  );

  function getProfile(scopeKey: string, bookName: string) {
    if (scopeKey.includes('__no_chat__')) return null;
    return settings.value.profiles[scopeKey]?.[bookName] ?? null;
  }

  function mergeUnknownBaselineEntries(bookName: string, entries: WorldbookEntry[]) {
    const baseline = settings.value.baselines[bookName];
    if (!baseline) {
      settings.value.baselines[bookName] = { entries: snapshotEntries(entries), updatedAt: nowIso() };
      return;
    }
    const known = new Set(baseline.entries.map(entry => entry.uid));
    const additions = snapshotEntries(entries).filter(entry => !known.has(entry.uid));
    if (!additions.length) return;
    baseline.entries.push(...additions);
    baseline.updatedAt = nowIso();
  }

  async function captureProfile(scopeKey: string, bookName: string) {
    assertUsableChatScope(scopeKey);
    const entries = await getWorldbookEntries(bookName);
    return captureProfileFromEntries(scopeKey, bookName, entries);
  }

  function captureProfileFromEntries(scopeKey: string, bookName: string, entries: WorldbookEntry[]) {
    assertUsableChatScope(scopeKey);
    mergeUnknownBaselineEntries(bookName, entries);
    settings.value.profiles[scopeKey] ??= {};
    settings.value.profiles[scopeKey][bookName] = {
      entries: snapshotEntries(entries),
      updatedAt: nowIso(),
    };
    settings.value.activeScopes[bookName] = scopeKey;
    return getStatus(scopeKey, bookName, entries);
  }

  async function applyProfile(scopeKey: string, bookName: string) {
    assertUsableChatScope(scopeKey);
    const profile = getProfile(scopeKey, bookName);
    if (!profile) throw new Error('当前聊天还没有保存这本世界书的条目配置');
    const before = await getWorldbookEntries(bookName);
    mergeUnknownBaselineEntries(bookName, before);
    const result = await setWorldbookEntryStates(bookName, stateMap(profile), true);
    settings.value.activeScopes[bookName] = scopeKey;
    return { ...result, status: getStatus(scopeKey, bookName, result.entries) };
  }

  async function restoreBaseline(bookName: string) {
    const baseline = settings.value.baselines[bookName];
    if (!baseline) {
      delete settings.value.activeScopes[bookName];
      return { changed: 0, entries: await getWorldbookEntries(bookName) };
    }
    const result = await setWorldbookEntryStates(bookName, stateMap(baseline), false);
    delete settings.value.activeScopes[bookName];
    return result;
  }

  async function removeProfile(scopeKey: string, bookName: string) {
    if (settings.value.activeScopes[bookName] === scopeKey) {
      await restoreBaseline(bookName);
    }
    const profiles = settings.value.profiles[scopeKey];
    if (!profiles) return;
    delete profiles[bookName];
    if (!Object.keys(profiles).length) delete settings.value.profiles[scopeKey];
  }

  function inheritProfiles(sourceScopeKey: string, targetScopeKey: string) {
    assertUsableChatScope(sourceScopeKey);
    assertUsableChatScope(targetScopeKey);
    if (sourceScopeKey === targetScopeKey) return 0;

    const sourceProfiles = settings.value.profiles[sourceScopeKey];
    if (!sourceProfiles || !Object.keys(sourceProfiles).length) return 0;

    // A native chat branch gets a new scope, so its entry switches need their own snapshot.
    settings.value.profiles[targetScopeKey] = klona(sourceProfiles);
    return Object.keys(sourceProfiles).length;
  }

  function getStatus(
    scopeKey: string,
    bookName: string,
    suppliedEntries?: WorldbookEntry[],
  ): Promise<WorldbookLinkStatus> | WorldbookLinkStatus {
    if (!suppliedEntries) {
      return getWorldbookEntries(bookName).then(
        entries => getStatus(scopeKey, bookName, entries) as WorldbookLinkStatus,
      );
    }
    const profile = getProfile(scopeKey, bookName);
    const currentByUid = new Map(suppliedEntries.map(entry => [entry.uid, entry]));
    const configured = profile ? stateMap(profile) : new Map<number, boolean>();
    const missingCount = profile?.entries.filter(entry => !currentByUid.has(entry.uid)).length ?? 0;
    const matchesCurrent =
      Boolean(profile) && suppliedEntries.every(entry => entry.enabled === (configured.get(entry.uid) ?? false));
    return {
      currentEntries: suppliedEntries,
      enabledCount: suppliedEntries.filter(entry => entry.enabled).length,
      matchesCurrent,
      missingCount,
      profile,
    };
  }

  async function applyScope(scopeKey: string) {
    const boundBooks = currentBoundBookNames();
    const targetProfiles = settings.value.profiles[scopeKey] ?? {};
    const previousBooks = Object.keys(settings.value.activeScopes);
    const failures: string[] = [];

    for (const bookName of previousBooks) {
      if (boundBooks.has(bookName) && targetProfiles[bookName]) continue;
      try {
        await restoreBaseline(bookName);
      } catch {
        failures.push(bookName);
      }
    }

    for (const bookName of boundBooks) {
      if (!targetProfiles[bookName]) continue;
      try {
        await applyProfile(scopeKey, bookName);
      } catch {
        failures.push(bookName);
      }
    }

    if (failures.length) {
      toastr.warning(`世界书联动未能更新：${[...new Set(failures)].join('、')}`);
    }
  }

  async function switchScope(scopeKey: string) {
    if (scopeKey !== getCurrentChatScopeKey()) return;
    const sequence = ++scopeSequence;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await waitForBindings(attempt === 0 ? 900 : 700);
      if (sequence !== scopeSequence || scopeKey !== getCurrentChatScopeKey()) return;
      try {
        await applyScope(scopeKey);
        return;
      } catch (error) {
        if (attempt < 2) continue;
        const message = error instanceof Error ? error.message : '世界书绑定尚未就绪';
        toastr.warning(`当前聊天的世界书联动未应用：${message}`);
      }
    }
  }

  async function resetCurrentScope() {
    const scopeKey = getCurrentChatScopeKey();
    const bookNames = Object.keys(settings.value.profiles[scopeKey] ?? {});
    for (const bookName of bookNames) {
      await removeProfile(scopeKey, bookName);
    }
  }

  function importBackup(data: unknown) {
    settings.value = readSettings(data);
  }

  function rehydrateFromSettings() {
    settings.value = readSettings(_.get(extension_settings, worldbookLinkField, {}));
  }

  return {
    applyProfile,
    captureProfile,
    captureProfileFromEntries,
    getProfile,
    getStatus,
    inheritProfiles,
    importBackup,
    rehydrateFromSettings,
    removeProfile,
    resetCurrentScope,
    restoreBaseline,
    settings,
    switchScope,
  };
});
