import { getCurrentTavernPresetName, loadTavernPreset } from '@/apps/preset-manager/api';
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
  updatedAt: z.string().default(''),
});
export type PresetChatBinding = z.infer<typeof PresetChatBindingSchema>;

const PresetReaderProfileSchema = z.object({
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
  bindings: z.record(z.string(), LegacyPresetChatBindingSchema).default({}),
  readerMigrationConflicts: z.array(PresetReaderMigrationConflictSchema).default([]),
  readerProfiles: z.record(z.string(), PresetReaderProfileSchema).default({}),
  version: z.number().int().min(1).max(2).default(2),
});

export type PresetLinkSettings = {
  bindings: Record<string, PresetChatBinding>;
  readerMigrationConflicts: PresetReaderMigrationConflict[];
  readerProfiles: Record<string, PresetReaderProfile>;
  version: 2;
};

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
  let sequence = 0;
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
      Partial<Pick<PresetReaderProfile, 'readerContentRuleId' | 'readerTitleRuleId'>>,
  ) {
    assertScope(scopeKey);
    const presetName = normalizePresetName(input.presetName);
    const existingEntry = resolveBindingEntry(scopeKey);
    if (existingEntry && existingEntry[0] !== scopeKey) delete settings.value.bindings[existingEntry[0]];
    settings.value.bindings[scopeKey] = {
      presetName,
      reloadRegex: input.reloadRegex,
      updatedAt: new Date().toISOString(),
    };
    if (input.readerContentRuleId !== undefined || input.readerTitleRuleId !== undefined) {
      const existingProfile = getReaderProfile(presetName) ?? PresetReaderProfileSchema.parse({});
      saveReaderProfile(presetName, {
        readerContentRuleId: input.readerContentRuleId ?? existingProfile.readerContentRuleId,
        readerTitleRuleId: input.readerTitleRuleId ?? existingProfile.readerTitleRuleId,
      });
    }
    revision.value += 1;
    return settings.value.bindings[scopeKey];
  }

  function saveReaderProfile(
    presetName: string,
    input: Pick<PresetReaderProfile, 'readerContentRuleId' | 'readerTitleRuleId'>,
  ) {
    const normalizedPresetName = normalizePresetName(presetName);
    settings.value.readerProfiles[normalizedPresetName] = {
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
      readerContentRuleId: field === 'content' ? ruleId : existing.readerContentRuleId,
      readerTitleRuleId: field === 'title' ? ruleId : existing.readerTitleRuleId,
    });
  }

  function removeBinding(scopeKey = getCurrentChatScopeKey()) {
    const storedScopeKey = resolveBindingEntry(scopeKey)?.[0] ?? scopeKey;
    if (!settings.value.bindings[storedScopeKey]) return false;
    delete settings.value.bindings[storedScopeKey];
    revision.value += 1;
    return true;
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
    input: Pick<PresetChatBinding, 'presetName' | 'reloadRegex'>,
    forceReload: boolean,
  ) {
    assertScope(scopeKey);
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

    try {
      if (changed) await loadTavernPreset(presetName);
      if (shouldReload) {
        recentReloadKey = reloadKey;
        recentReloadExpiresAt = Date.now() + 4_000;
        await reloadCurrentChatForPresetRegex();
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
    return { changed, reloaded };
  }

  async function applySelection(
    scopeKey: string,
    input: Pick<PresetChatBinding, 'presetName' | 'reloadRegex'>,
    forceReload = true,
  ) {
    return applyPresetSelection(scopeKey, input, forceReload);
  }

  async function applyScope(scopeKey: string, forceReload = false) {
    const binding = getBinding(scopeKey);
    if (!binding?.presetName) return { changed: false, reloaded: false };
    return applyPresetSelection(scopeKey, binding, forceReload);
  }

  async function switchScope(scopeKey: string) {
    if (!areChatScopeKeysEquivalent(scopeKey, getCurrentChatScopeKey())) return;
    const currentSequence = ++sequence;
    applying.value = true;
    try {
      await new Promise<void>(resolve => window.setTimeout(resolve, 180));
      if (currentSequence !== sequence || !areChatScopeKeysEquivalent(scopeKey, getCurrentChatScopeKey())) return;
      await applyScope(scopeKey);
    } catch (error) {
      toastr.warning(`当前聊天的预设绑定未应用：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (currentSequence === sequence) applying.value = false;
    }
  }

  function resetCurrentScope() {
    removeBinding(getCurrentChatScopeKey());
  }

  function migratePresetReferences(oldName: string, newName: string) {
    const source = oldName.trim();
    const target = newName.trim();
    if (!source || !target || source === target) return 0;
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
    resetCurrentScope,
    revision,
    saveBinding,
    saveReaderProfile,
    setReaderRule,
    settings,
    switchScope,
  };
});
