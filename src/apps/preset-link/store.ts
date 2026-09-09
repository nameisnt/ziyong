import { getCurrentTavernPresetName, loadTavernPreset, readTavernPreset } from '@/apps/preset-manager/api';
import {
  checkPromptStates,
  expandSingleGroupRestore,
  missingPromptIds,
  snapshotPromptStates,
  writeLivePromptStates,
  type PresetPromptStates,
} from './promptSwitches';
import { createPresetRegexNoticeGuard, getEnabledPresetRegexCount, reloadCurrentChatForPresetRegex } from './api';
import { areChatScopeKeysEquivalent, getCurrentChatScopeKey, isPlaceholderChatScopeKey } from '@/store/chatScoped';
import { validateInplace } from '@/util/zod';
// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

export const presetLinkField = 'sillytavern_phone_preset_links';

const PresetChatBindingSchema = z.object({
  presetName: z.string().default(''),
  reloadRegex: z.boolean().default(false),
  promptStates: z.record(z.string(), z.boolean()).optional(),
  updatedAt: z.string().default(''),
});
export type PresetChatBinding = z.infer<typeof PresetChatBindingSchema>;

const PresetReaderProfileSchema = z.object({
  readerCleanupRuleIds: z.array(z.string()).default([]),
  readerContentRuleId: z.string().default(''),
  readerTitleRuleId: z.string().default(''),
  updatedAt: z.string().default(''),
});
export type PresetReaderProfile = z.infer<typeof PresetReaderProfileSchema>;

const PresetReaderMigrationCandidateSchema = PresetReaderProfileSchema.extend({
  scopeKeys: z.array(z.string()).default([]),
});
type PresetReaderMigrationCandidate = z.infer<typeof PresetReaderMigrationCandidateSchema>;

const PresetReaderMigrationConflictSchema = z.object({
  candidates: z.array(PresetReaderMigrationCandidateSchema).default([]),
  presetName: z.string(),
});
export type PresetReaderMigrationConflict = z.infer<typeof PresetReaderMigrationConflictSchema>;

const LegacyPresetChatBindingSchema = PresetChatBindingSchema.extend({
  readerContentRuleId: z.string().default(''),
  readerTitleRuleId: z.string().default(''),
});

export const PresetLinkSettingsSchema = z.object({
  activePromptOverride: z
    .object({
      presetName: z.string(),
      states: z.record(z.string(), z.boolean()),
    })
    .optional(),
  bindings: z.record(z.string(), LegacyPresetChatBindingSchema).default({}),
  readerMigrationConflicts: z.array(PresetReaderMigrationConflictSchema).default([]),
  readerProfiles: z.record(z.string(), PresetReaderProfileSchema).default({}),
  version: z.number().int().min(1).max(2).default(2),
});

export type PresetLinkSettings = {
  activePromptOverride?: { presetName: string; states: PresetPromptStates };
  bindings: Record<string, PresetChatBinding>;
  readerMigrationConflicts: PresetReaderMigrationConflict[];
  readerProfiles: Record<string, PresetReaderProfile>;
  version: 2;
};

type PresetApplyResult = { applied: boolean; changed: boolean; reloaded: boolean; missingPromptIds?: string[] };
type PresetScopeRequest = { scopeKey: string; sequence: number };

function compareUpdatedAt(left: string, right: string) {
  return right.localeCompare(left);
}

function migrateLegacyReaderProfiles(
  bindings: Record<string, z.infer<typeof LegacyPresetChatBindingSchema>>,
  existingProfiles: Record<string, PresetReaderProfile>,
) {
  const readerProfiles = klona(existingProfiles);
  const conflicts: PresetReaderMigrationConflict[] = [];
  const grouped = new Map<string, Map<string, PresetReaderMigrationCandidate>>();

  Object.entries(bindings).forEach(([scopeKey, binding]) => {
    const presetName = binding.presetName.trim();
    const readerContentRuleId = binding.readerContentRuleId.trim();
    const readerTitleRuleId = binding.readerTitleRuleId.trim();
    if (!presetName || (!readerContentRuleId && !readerTitleRuleId)) return;
    const signature = `${readerTitleRuleId}\0${readerContentRuleId}`;
    const candidates = grouped.get(presetName) ?? new Map<string, PresetReaderMigrationCandidate>();
    const candidate = candidates.get(signature);
    if (candidate) {
      candidate.scopeKeys.push(scopeKey);
      if (binding.updatedAt.localeCompare(candidate.updatedAt) > 0) candidate.updatedAt = binding.updatedAt;
    } else {
      candidates.set(signature, {
        readerCleanupRuleIds: [],
        readerContentRuleId,
        readerTitleRuleId,
        scopeKeys: [scopeKey],
        updatedAt: binding.updatedAt,
      });
    }
    grouped.set(presetName, candidates);
  });

  grouped.forEach((candidateMap, presetName) => {
    if (readerProfiles[presetName]) return;
    const candidates = [...candidateMap.values()].sort((left, right) =>
      compareUpdatedAt(left.updatedAt, right.updatedAt),
    );
    const selected = candidates[0];
    if (!selected) return;
    readerProfiles[presetName] = PresetReaderProfileSchema.parse(selected);
    if (candidates.length > 1) conflicts.push({ candidates, presetName });
  });

  return { conflicts, readerProfiles };
}

function readSettings(raw: unknown): PresetLinkSettings {
  const parsed = validateInplace(PresetLinkSettingsSchema, raw && typeof raw === 'object' ? raw : {});
  const migrated = migrateLegacyReaderProfiles(parsed.bindings, parsed.readerProfiles);
  return {
    ...(parsed.activePromptOverride ? { activePromptOverride: parsed.activePromptOverride } : {}),
    bindings: Object.fromEntries(
      Object.entries(parsed.bindings).map(([scopeKey, binding]) => [scopeKey, PresetChatBindingSchema.parse(binding)]),
    ),
    readerMigrationConflicts:
      parsed.version >= 2 && parsed.readerMigrationConflicts.length
        ? parsed.readerMigrationConflicts
        : migrated.conflicts,
    readerProfiles: migrated.readerProfiles,
    version: 2,
  };
}

function assertScope(scopeKey: string) {
  if (isPlaceholderChatScopeKey(scopeKey)) throw new Error('当前聊天标识尚未就绪');
}

function normalizePresetName(presetName: string) {
  const normalized = presetName.trim();
  if (!normalized) throw new Error('请先选择预设');
  return normalized;
}

export const usePresetLinkStore = defineStore('preset-link', () => {
  const rawSettings = _.get(extension_settings, presetLinkField, {});
  const initialSettings = readSettings(rawSettings);
  const settings = ref<PresetLinkSettings>(initialSettings);
  if (_.get(rawSettings, 'version') !== 2) {
    _.set(extension_settings, presetLinkField, klona(initialSettings));
    void saveSettingsDebounced();
  }
  const applying = ref(false);
  const lastAppliedScopeKey = ref('');
  const revision = ref(0);
  let scopeSequence = 0;
  // One visit includes rename aliases until the host adopts the new name.
  // Track attempts, not successes, so navigation cannot retry/reset a binding.
  let scopeVisitKeys: string[] = [];
  let presetMutationTail: Promise<void> = Promise.resolve();
  let presetMutationActive = false;
  let pendingScopeRequest: PresetScopeRequest | null = null;
  let scopeWorker: Promise<void> | null = null;
  let recentReloadKey = '';
  let recentReloadExpiresAt = 0;

  watch(
    settings,
    value => {
      _.set(extension_settings, presetLinkField, klona(value));
      void saveSettingsDebounced();
    },
    { deep: true },
  );

  function resolveBindingEntry(scopeKey: string): [string, PresetChatBinding] | null {
    const exact = settings.value.bindings[scopeKey];
    if (exact) return [scopeKey, exact];
    if (!areChatScopeKeysEquivalent(scopeKey, getCurrentChatScopeKey())) return null;
    return (
      Object.entries(settings.value.bindings).find(([storedScopeKey]) =>
        areChatScopeKeysEquivalent(storedScopeKey, scopeKey),
      ) ?? null
    );
  }

  function getBinding(scopeKey = getCurrentChatScopeKey()) {
    return resolveBindingEntry(scopeKey)?.[1] ?? null;
  }

  function getReaderProfile(presetName: string) {
    return settings.value.readerProfiles[presetName.trim()] ?? null;
  }

  function getReaderMigrationConflict(presetName: string) {
    return settings.value.readerMigrationConflicts.find(item => item.presetName === presetName.trim()) ?? null;
  }

  function saveBinding(
    scopeKey: string,
    input: Pick<PresetChatBinding, 'presetName' | 'reloadRegex'> &
      Pick<PresetChatBinding, 'promptStates'> &
      Partial<Pick<PresetReaderProfile, 'readerContentRuleId' | 'readerTitleRuleId'>>,
  ) {
    assertScope(scopeKey);
    const presetName = normalizePresetName(input.presetName);
    if (input.promptStates) checkPromptStates(readTavernPreset(presetName), input.promptStates);
    const existingEntry = resolveBindingEntry(scopeKey);
    if (existingEntry && existingEntry[0] !== scopeKey) delete settings.value.bindings[existingEntry[0]];
    settings.value.bindings[scopeKey] = {
      presetName,
      reloadRegex: input.reloadRegex,
      ...(input.promptStates ? { promptStates: { ...input.promptStates } } : {}),
      updatedAt: new Date().toISOString(),
    };
    if (input.readerContentRuleId !== undefined || input.readerTitleRuleId !== undefined) {
      const existingProfile = getReaderProfile(presetName) ?? PresetReaderProfileSchema.parse({});
      saveReaderProfile(presetName, {
        readerCleanupRuleIds: existingProfile.readerCleanupRuleIds,
        readerContentRuleId: input.readerContentRuleId ?? existingProfile.readerContentRuleId,
        readerTitleRuleId: input.readerTitleRuleId ?? existingProfile.readerTitleRuleId,
      });
    }
    revision.value += 1;
    return settings.value.bindings[scopeKey];
  }

  function saveReaderProfile(
    presetName: string,
    input: Pick<PresetReaderProfile, 'readerCleanupRuleIds' | 'readerContentRuleId' | 'readerTitleRuleId'>,
  ) {
    const normalizedPresetName = normalizePresetName(presetName);
    settings.value.readerProfiles[normalizedPresetName] = {
      readerCleanupRuleIds: [...input.readerCleanupRuleIds],
      readerContentRuleId: input.readerContentRuleId.trim(),
      readerTitleRuleId: input.readerTitleRuleId.trim(),
      updatedAt: new Date().toISOString(),
    };
    settings.value.readerMigrationConflicts = settings.value.readerMigrationConflicts.filter(
      item => item.presetName !== normalizedPresetName,
    );
    revision.value += 1;
    return settings.value.readerProfiles[normalizedPresetName];
  }

  function setReaderRule(presetName: string, field: 'content' | 'title', ruleId: string) {
    const normalizedPresetName = normalizePresetName(presetName);
    const existing = getReaderProfile(normalizedPresetName) ?? PresetReaderProfileSchema.parse({});
    return saveReaderProfile(normalizedPresetName, {
      readerCleanupRuleIds: existing.readerCleanupRuleIds,
      readerContentRuleId: field === 'content' ? ruleId : existing.readerContentRuleId,
      readerTitleRuleId: field === 'title' ? ruleId : existing.readerTitleRuleId,
    });
  }

  async function removeBinding(scopeKey = getCurrentChatScopeKey()) {
    return enqueuePresetMutation(async () => {
      const storedScopeKey = resolveBindingEntry(scopeKey)?.[0] ?? scopeKey;
      if (!settings.value.bindings[storedScopeKey]) return false;
      if (areChatScopeKeysEquivalent(scopeKey, getCurrentChatScopeKey())) {
        await restorePromptOverride(() => areChatScopeKeysEquivalent(scopeKey, getCurrentChatScopeKey()));
      }
      delete settings.value.bindings[storedScopeKey];
      revision.value += 1;
      return true;
    });
  }

  async function restorePromptOverride(isCurrent: () => boolean) {
    const active = settings.value.activePromptOverride;
    if (!active || !isCurrent()) return;
    if (getCurrentTavernPresetName() === active.presetName) {
      checkPromptStates(readTavernPreset('in_use'), active.states, true);
      if (!(await writeLivePromptStates(active.states, isCurrent))) return;
    }
    delete settings.value.activePromptOverride;
  }

  async function applyPromptOverride(states: PresetPromptStates, presetName: string, isCurrent: () => boolean) {
    const live = readTavernPreset('in_use');
    const source = readTavernPreset(presetName);
    const desired = { ...snapshotPromptStates(source), ...states };
    checkPromptStates(live, desired);
    const before = snapshotPromptStates(live);
    const restore = Object.fromEntries(
      Object.entries(before).filter(([id, enabled]) => Object.hasOwn(desired, id) && desired[id] !== enabled),
    );
    if (Object.keys(restore).length) {
      // Persist before the host write: a reload or failed write must not lose the restoration state.
      settings.value.activePromptOverride = { presetName, states: expandSingleGroupRestore(live, restore) };
      await writeLivePromptStates(desired, isCurrent);
    }
    return missingPromptIds(live, states);
  }

  function retainNativeGroupRestore(states: PresetPromptStates) {
    if (presetMutationActive || applying.value) throw new Error('正在应用预设绑定，请稍后再切换条目');
    const active = settings.value.activePromptOverride;
    const presetName = getCurrentTavernPresetName();
    if (!active) {
      const binding = getBinding(getCurrentChatScopeKey());
      if (binding?.presetName === presetName && binding.promptStates) {
        settings.value.activePromptOverride = { presetName, states: { ...states } };
      }
      return;
    }
    if (active.presetName !== presetName) return;
    // Keep the pre-binding values already captured; include newly touched peers before the native click.
    active.states = { ...states, ...active.states };
  }

  function inheritBinding(sourceScopeKey: string, targetScopeKey: string) {
    const source = getBinding(sourceScopeKey);
    if (!source || sourceScopeKey === targetScopeKey) return false;
    assertScope(targetScopeKey);
    settings.value.bindings[targetScopeKey] = {
      ...klona(source),
      updatedAt: new Date().toISOString(),
    };
    revision.value += 1;
    return true;
  }

  async function applyPresetSelection(
    scopeKey: string,
    input: Pick<PresetChatBinding, 'presetName' | 'reloadRegex' | 'promptStates'>,
    forceReload: boolean,
    isCurrent = () => areChatScopeKeysEquivalent(scopeKey, getCurrentChatScopeKey()),
  ): Promise<PresetApplyResult> {
    assertScope(scopeKey);
    if (!isCurrent()) return { applied: false, changed: false, reloaded: false };
    if (!areChatScopeKeysEquivalent(scopeKey, getCurrentChatScopeKey())) {
      throw new Error('只能把预设应用到酒馆当前打开的聊天');
    }
    const presetName = normalizePresetName(input.presetName);
    const currentPresetName = getCurrentTavernPresetName();
    const changed = currentPresetName !== presetName;
    const reloadKey = `${getCurrentChatScopeKey()}\0${presetName}`;
    const reloadBlocked = recentReloadKey === reloadKey && recentReloadExpiresAt > Date.now();
    const shouldReload =
      !reloadBlocked && input.reloadRegex && (changed || forceReload) && getEnabledPresetRegexCount(presetName) > 0;
    const noticeGuard = changed && shouldReload ? createPresetRegexNoticeGuard(presetName) : null;
    let reloaded = false;
    let missing: string[] = [];

    try {
      if (input.promptStates) checkPromptStates(readTavernPreset(presetName), input.promptStates);
      await restorePromptOverride(isCurrent);
      if (!isCurrent() || getCurrentTavernPresetName() !== currentPresetName)
        return { applied: false, changed: false, reloaded: false };
      if (changed) await loadTavernPreset(presetName);
      if (!isCurrent()) {
        noticeGuard?.restore();
        return { applied: false, changed: false, reloaded: false };
      }
      if (input.promptStates) {
        missing = await applyPromptOverride(input.promptStates, presetName, isCurrent);
        if (!isCurrent() || getCurrentTavernPresetName() !== presetName)
          return { applied: false, changed: false, reloaded: false };
      }
      if (shouldReload) {
        recentReloadKey = reloadKey;
        recentReloadExpiresAt = Date.now() + 4_000;
        await reloadCurrentChatForPresetRegex();
        if (!isCurrent()) {
          noticeGuard?.restore();
          return { applied: false, changed: false, reloaded: false };
        }
        reloaded = true;
        noticeGuard?.dismiss();
      }
    } catch (error) {
      if (recentReloadKey === reloadKey) {
        recentReloadKey = '';
        recentReloadExpiresAt = 0;
      }
      noticeGuard?.restore();
      throw error;
    } finally {
      noticeGuard?.stop();
    }

    lastAppliedScopeKey.value = scopeKey;
    revision.value += 1;
    if (missing.length) toastr.warning(`预设绑定中有 ${missing.length} 个条目已不存在，请检查条目开关`);
    return { applied: true, changed, reloaded, missingPromptIds: missing };
  }

  function enqueuePresetMutation<T>(operation: () => Promise<T>) {
    const task = presetMutationTail.then(async () => {
      presetMutationActive = true;
      try {
        return await operation();
      } finally {
        presetMutationActive = false;
      }
    });
    presetMutationTail = task.then(
      () => undefined,
      () => undefined,
    );
    return task;
  }

  async function applySelection(
    scopeKey: string,
    input: Pick<PresetChatBinding, 'presetName' | 'reloadRegex' | 'promptStates'>,
    forceReload = true,
  ) {
    const request = beginExplicitScopeRequest(scopeKey);
    if (!request) return { applied: false, changed: false, reloaded: false };
    return enqueuePresetMutation(() =>
      applyPresetSelection(getCurrentChatScopeKey(), input, forceReload, () => isScopeRequestCurrent(request)),
    );
  }

  async function applyScopeNow(
    scopeKey: string,
    forceReload = false,
    isCurrent = () => areChatScopeKeysEquivalent(scopeKey, getCurrentChatScopeKey()),
  ) {
    const binding = getBinding(scopeKey);
    if (!binding?.presetName) {
      await restorePromptOverride(isCurrent);
      return { applied: isCurrent(), changed: false, reloaded: false };
    }
    return applyPresetSelection(scopeKey, binding, forceReload, isCurrent);
  }

  function applyScope(scopeKey: string, forceReload = false) {
    const request = beginExplicitScopeRequest(scopeKey);
    if (!request) return Promise.resolve({ applied: false, changed: false, reloaded: false });
    return enqueuePresetMutation(() =>
      applyScopeNow(getCurrentChatScopeKey(), forceReload, () => isScopeRequestCurrent(request)),
    );
  }

  function isVisitedScope(scopeKey: string) {
    return scopeVisitKeys.some(key => areChatScopeKeysEquivalent(key, scopeKey));
  }

  function beginExplicitScopeRequest(scopeKey: string) {
    assertScope(scopeKey);
    if (!areChatScopeKeysEquivalent(scopeKey, getCurrentChatScopeKey())) return null;
    if (!isVisitedScope(scopeKey)) scopeVisitKeys = [scopeKey];
    pendingScopeRequest = null;
    return { scopeKey, sequence: ++scopeSequence };
  }

  function isScopeRequestCurrent(request: PresetScopeRequest) {
    return request.sequence === scopeSequence && isVisitedScope(getCurrentChatScopeKey());
  }

  async function drainScopeRequests() {
    applying.value = true;
    try {
      while (pendingScopeRequest) {
        const request = pendingScopeRequest;
        pendingScopeRequest = null;
        await new Promise<void>(resolve => window.setTimeout(resolve, 180));
        if (!isScopeRequestCurrent(request)) continue;
        try {
          await enqueuePresetMutation(() =>
            applyScopeNow(getCurrentChatScopeKey(), false, () => isScopeRequestCurrent(request)),
          );
        } catch (error) {
          if (!isScopeRequestCurrent(request)) continue;
          toastr.warning(`当前聊天的预设绑定未应用：${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } finally {
      applying.value = false;
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
    if (isPlaceholderChatScopeKey(scopeKey) || !areChatScopeKeysEquivalent(scopeKey, getCurrentChatScopeKey()))
      return Promise.resolve();
    if (isVisitedScope(scopeKey)) {
      if (areChatScopeKeysEquivalent(scopeVisitKeys[0]!, scopeKey)) scopeVisitKeys = [scopeKey];
      return scopeWorker ?? Promise.resolve();
    }
    scopeVisitKeys = [scopeKey];
    pendingScopeRequest = { scopeKey, sequence: ++scopeSequence };
    return startScopeWorker();
  }

  function renameScope(sourceScopeKeys: readonly string[], targetScopeKey: string) {
    if (!scopeVisitKeys.some(key => sourceScopeKeys.includes(key))) return;
    scopeVisitKeys = [...new Set([targetScopeKey, ...scopeVisitKeys, ...sourceScopeKeys])];
    if (sourceScopeKeys.includes(lastAppliedScopeKey.value)) lastAppliedScopeKey.value = targetScopeKey;
  }

  async function resetCurrentScope() {
    await removeBinding(getCurrentChatScopeKey());
  }

  function migratePresetReferences(oldName: string, newName: string) {
    const source = oldName.trim();
    const target = newName.trim();
    if (!source || !target || source === target) return 0;
    if (settings.value.activePromptOverride?.presetName === source)
      settings.value.activePromptOverride.presetName = target;
    let changed = 0;
    Object.values(settings.value.bindings).forEach(binding => {
      if (binding.presetName !== source) return;
      binding.presetName = target;
      binding.updatedAt = new Date().toISOString();
      changed += 1;
    });
    if (settings.value.readerProfiles[source]) {
      settings.value.readerProfiles[target] = settings.value.readerProfiles[source];
      delete settings.value.readerProfiles[source];
      changed += 1;
    }
    settings.value.readerMigrationConflicts.forEach(conflict => {
      if (conflict.presetName === source) conflict.presetName = target;
    });
    revision.value += 1;
    return changed;
  }

  function removePresetReferences(presetName: string) {
    const name = presetName.trim();
    let changed = 0;
    Object.entries(settings.value.bindings).forEach(([scopeKey, binding]) => {
      if (binding.presetName !== name) return;
      delete settings.value.bindings[scopeKey];
      changed += 1;
    });
    if (settings.value.readerProfiles[name]) {
      delete settings.value.readerProfiles[name];
      changed += 1;
    }
    settings.value.readerMigrationConflicts = settings.value.readerMigrationConflicts.filter(
      conflict => conflict.presetName !== name,
    );
    revision.value += 1;
    return changed;
  }

  function importBackup(data: unknown) {
    settings.value = readSettings(data);
    revision.value += 1;
  }

  function rehydrateFromSettings() {
    settings.value = readSettings(_.get(extension_settings, presetLinkField, {}));
    revision.value += 1;
  }

  return {
    retainNativeGroupRestore,
    applySelection,
    applyScope,
    applying,
    getBinding,
    getReaderMigrationConflict,
    getReaderProfile,
    importBackup,
    inheritBinding,
    lastAppliedScopeKey,
    rehydrateFromSettings,
    migratePresetReferences,
    removeBinding,
    removePresetReferences,
    renameScope,
    resetCurrentScope,
    revision,
    saveBinding,
    saveReaderProfile,
    setReaderRule,
    settings,
    switchScope,
  };
});
