import type { TextProviderSelection } from '@/util/textProvider';

export type GenerationPageOverride = {
  connectionSelection: TextProviderSelection;
  tavernPresetName: string;
};

function overrideKey(appId: string, page: string) {
  return `${appId}:${page}`;
}

export const useGenerationOverrideStore = defineStore('generationOverrides', () => {
  const overrides = ref<Record<string, GenerationPageOverride>>({});

  function ensureOverride(appId: string, page: string, tavernPresetName = '') {
    const key = overrideKey(appId, page);
    if (!overrides.value[key]) {
      overrides.value[key] = {
        connectionSelection: 'inherit',
        tavernPresetName,
      };
    }
    return overrides.value[key];
  }

  function getOverride(appId: string, page: string) {
    return overrides.value[overrideKey(appId, page)] ?? null;
  }

  function setConnectionSelection(appId: string, page: string, selection: TextProviderSelection) {
    ensureOverride(appId, page).connectionSelection = selection;
  }

  function setTavernPresetName(appId: string, page: string, tavernPresetName: string) {
    ensureOverride(appId, page).tavernPresetName = tavernPresetName;
  }

  return {
    ensureOverride,
    getOverride,
    overrides,
    setConnectionSelection,
    setTavernPresetName,
  };
});
