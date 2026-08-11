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

export const PresetLinkSettingsSchema = z.object({
  bindings: z.record(z.string(), PresetChatBindingSchema).default({}),
  version: z.literal(1).default(1),
});
export type PresetLinkSettings = z.infer<typeof PresetLinkSettingsSchema>;

function readSettings(raw: unknown) {
  return validateInplace(PresetLinkSettingsSchema, raw && typeof raw === 'object' ? raw : {});
}

function assertScope(scopeKey: string) {
  if (isPlaceholderChatScopeKey(scopeKey)) throw new Error('当前聊天标识尚未就绪');
}

export const usePresetLinkStore = defineStore('preset-link', () => {
  const settings = ref<PresetLinkSettings>(readSettings(_.get(extension_settings, presetLinkField, {})));
  const applying = ref(false);
  const lastAppliedScopeKey = ref('');
  const revision = ref(0);
  let sequence = 0;
  let recentReloadKey = '';
  let recentReloadExpiresAt = 0;

  watch(
    settings,
    value => {
      _.set(extension_settings, presetLinkField, readSettings(klona(value)));
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

  function saveBinding(scopeKey: string, input: Pick<PresetChatBinding, 'presetName' | 'reloadRegex'>) {
    assertScope(scopeKey);
    const presetName = input.presetName.trim();
    if (!presetName) throw new Error('请先选择要绑定的预设');
    const existingEntry = resolveBindingEntry(scopeKey);
    if (existingEntry && existingEntry[0] !== scopeKey) delete settings.value.bindings[existingEntry[0]];
    settings.value.bindings[scopeKey] = {
      presetName,
      reloadRegex: input.reloadRegex,
      updatedAt: new Date().toISOString(),
    };
    revision.value += 1;
    return settings.value.bindings[scopeKey];
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
    const presetName = input.presetName.trim();
    if (!presetName) throw new Error('请先选择要应用的预设');
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
    importBackup,
    inheritBinding,
    lastAppliedScopeKey,
    rehydrateFromSettings,
    removeBinding,
    resetCurrentScope,
    revision,
    saveBinding,
    settings,
    switchScope,
  };
});
