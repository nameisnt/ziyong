import { getCurrentWorldbookGroups, getWorldbookEntries, setWorldbookEntryStates } from './api';
import type { PhoneAppResetContext } from '@/core/appRegistry';
import { areChatScopeKeysEquivalent, getCurrentChatScopeKey, isPlaceholderChatScopeKey } from '@/store/chatScoped';
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

export const WorldbookLinkSettingsSchema = z.object({
  activeScopes: z.record(z.string(), z.string()).default({}),
  baselines: z.record(z.string(), WorldbookStateSnapshotSchema).default({}),
  profiles: z.record(z.string(), z.record(z.string(), WorldbookStateSnapshotSchema)).default({}),
  version: z.literal(1).default(1),
});
export type WorldbookLinkSettings = z.infer<typeof WorldbookLinkSettingsSchema>;
type WorldbookScopeRequest = { scopeKey: string; sequence: number };

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
  const lastAppliedScopeKey = ref('');
  const scopeApplyRevision = ref(0);
  let scopeSequence = 0;
  let worldbookMutationTail: Promise<void> = Promise.resolve();
  let pendingScopeRequest: WorldbookScopeRequest | null = null;
  let scopeWorker: Promise<void> | null = null;

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

  async function applyProfileNow(scopeKey: string, bookName: string, isCurrent = () => true) {
    assertUsableChatScope(scopeKey);
    const profile = getProfile(scopeKey, bookName);
    if (!profile) throw new Error('当前聊天还没有保存这本世界书的条目配置');
    const before = await getWorldbookEntries(bookName);
    if (!isCurrent()) return null;
    mergeUnknownBaselineEntries(bookName, before);
    const result = await setWorldbookEntryStates(bookName, stateMap(profile), true);
    if (!isCurrent()) return null;
    settings.value.activeScopes[bookName] = scopeKey;
    return { ...result, status: getStatus(scopeKey, bookName, result.entries) };
  }

  async function restoreBaselineNow(bookName: string, isCurrent = () => true) {
    const baseline = settings.value.baselines[bookName];
    if (!baseline) {
      const entries = await getWorldbookEntries(bookName);
      if (!isCurrent()) return null;
      delete settings.value.activeScopes[bookName];
      return { changed: 0, entries };
    }
    const result = await setWorldbookEntryStates(bookName, stateMap(baseline), false);
    if (!isCurrent()) return null;
    delete settings.value.activeScopes[bookName];
    return result;
  }

  async function removeProfileNow(scopeKey: string, bookName: string) {
    if (settings.value.activeScopes[bookName] === scopeKey) {
      await restoreBaselineNow(bookName);
    }
    const profiles = settings.value.profiles[scopeKey];
    if (!profiles) return;
    delete profiles[bookName];
    if (!Object.keys(profiles).length) delete settings.value.profiles[scopeKey];
  }

  function enqueueWorldbookMutation<T>(operation: () => Promise<T>) {
    const task = worldbookMutationTail.then(operation);
    worldbookMutationTail = task.then(
      () => undefined,
      () => undefined,
    );
    return task;
  }

  function applyProfile(scopeKey: string, bookName: string) {
    return enqueueWorldbookMutation(async () => {
      const result = await applyProfileNow(scopeKey, bookName);
      if (!result) throw new Error('当前聊天已经切换');
      return result;
    });
  }

  function restoreBaseline(bookName: string) {
    return enqueueWorldbookMutation(async () => {
      const result = await restoreBaselineNow(bookName);
      if (!result) throw new Error('当前聊天已经切换');
      return result;
    });
  }

  function removeProfile(scopeKey: string, bookName: string) {
    return enqueueWorldbookMutation(() => removeProfileNow(scopeKey, bookName));
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

  function removeEntryReferences(bookName: string, uid: number) {
    const baseline = settings.value.baselines[bookName];
    if (baseline) {
      baseline.entries = baseline.entries.filter(entry => entry.uid !== uid);
      baseline.updatedAt = nowIso();
    }
    Object.values(settings.value.profiles).forEach(scopeProfiles => {
      const profile = scopeProfiles[bookName];
      if (!profile) return;
      profile.entries = profile.entries.filter(entry => entry.uid !== uid);
      profile.updatedAt = nowIso();
    });
  }

  function migrateWorldbookName(oldName: string, newName: string) {
    const source = oldName.trim();
    const target = newName.trim();
    if (!source || !target || source === target) return 0;
    let changed = 0;
    if (settings.value.baselines[source]) {
      settings.value.baselines[target] = settings.value.baselines[source];
      delete settings.value.baselines[source];
      changed += 1;
    }
    if (settings.value.activeScopes[source]) {
      settings.value.activeScopes[target] = settings.value.activeScopes[source];
      delete settings.value.activeScopes[source];
      changed += 1;
    }
    Object.values(settings.value.profiles).forEach(scopeProfiles => {
      if (!scopeProfiles[source]) return;
      scopeProfiles[target] = scopeProfiles[source];
      delete scopeProfiles[source];
      changed += 1;
    });
    return changed;
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

  async function applyScopeNow(scopeKey: string, isCurrent: () => boolean) {
    const boundBooks = currentBoundBookNames();
    const targetProfiles = settings.value.profiles[scopeKey] ?? {};
    const previousBooks = Object.keys(settings.value.activeScopes);
    const failures = new Map<string, string>();

    for (const bookName of previousBooks) {
      if (!isCurrent()) return false;
      if (boundBooks.has(bookName) && targetProfiles[bookName]) continue;
      try {
        await restoreBaselineNow(bookName, isCurrent);
        if (!isCurrent()) return false;
      } catch (error) {
        failures.set(bookName, error instanceof Error ? error.message : '恢复原始状态失败');
      }
    }

    for (const bookName of boundBooks) {
      if (!isCurrent()) return false;
      if (!targetProfiles[bookName]) continue;
      try {
        await applyProfileNow(scopeKey, bookName, isCurrent);
        if (!isCurrent()) return false;
      } catch (error) {
        failures.set(bookName, error instanceof Error ? error.message : '应用聊天配置失败');
      }
    }

    if (failures.size) {
      throw new Error([...failures.entries()].map(([bookName, message]) => `${bookName}（${message}）`).join('、'));
    }
    return true;
  }

  function isScopeRequestCurrent(request: WorldbookScopeRequest) {
    return (
      request.sequence === scopeSequence &&
      areChatScopeKeysEquivalent(request.scopeKey, getCurrentChatScopeKey())
    );
  }

  async function drainScopeRequests() {
    while (pendingScopeRequest) {
      const request = pendingScopeRequest;
      pendingScopeRequest = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        await waitForBindings(attempt === 0 ? 900 : 700);
        if (!isScopeRequestCurrent(request)) break;
        try {
          const applied = await enqueueWorldbookMutation(() =>
            applyScopeNow(request.scopeKey, () => isScopeRequestCurrent(request)),
          );
          if (!applied || !isScopeRequestCurrent(request)) break;
          lastAppliedScopeKey.value = request.scopeKey;
          scopeApplyRevision.value += 1;
          break;
        } catch (error) {
          if (!isScopeRequestCurrent(request)) break;
          if (attempt < 2) continue;
          const message = error instanceof Error ? error.message : '世界书绑定尚未就绪';
          toastr.warning(`当前聊天的世界书联动未应用：${message}`);
        }
      }
    }
  }

  function startScopeWorker() {
    if (!scopeWorker) {
      scopeWorker = drainScopeRequests().finally(() => {
        scopeWorker = null;
        if (pendingScopeRequest) void startScopeWorker();
      });
    }
    return scopeWorker;
  }

  function switchScope(scopeKey: string) {
    if (!areChatScopeKeysEquivalent(scopeKey, getCurrentChatScopeKey())) return Promise.resolve();
    pendingScopeRequest = { scopeKey, sequence: ++scopeSequence };
    return startScopeWorker();
  }

  async function resetCurrentScope(transaction: PhoneAppResetContext) {
    const scopeKey = getCurrentChatScopeKey();
    const bookNames = Object.keys(settings.value.profiles[scopeKey] ?? {});
    for (const bookName of bookNames) {
      const wasActive = settings.value.activeScopes[bookName] === scopeKey;
      const previousEntries = wasActive ? await getWorldbookEntries(bookName) : [];
      if (wasActive) {
        transaction.addRollback(() =>
          setWorldbookEntryStates(
            bookName,
            new Map(previousEntries.map(entry => [entry.uid, entry.enabled])),
            false,
          ).then(() => undefined),
        );
      }
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
    lastAppliedScopeKey,
    migrateWorldbookName,
    rehydrateFromSettings,
    removeEntryReferences,
    removeProfile,
    resetCurrentScope,
    restoreBaseline,
    scopeApplyRevision,
    settings,
    switchScope,
  };
});
