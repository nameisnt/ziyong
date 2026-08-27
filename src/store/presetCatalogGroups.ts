// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

export type PresetCatalogSource = 'plugin' | 'tavern';
type PresetCatalogGroupSettings = {
  assignments: Record<string, string>;
  groups: string[];
};

const field = 'sillytavern_phone_preset_catalog_groups';

function readSettings(): PresetCatalogGroupSettings {
  const raw = _.get(extension_settings, field, {}) as Partial<PresetCatalogGroupSettings>;
  return {
    assignments: raw.assignments && typeof raw.assignments === 'object' ? { ...raw.assignments } : {},
    groups: Array.isArray(raw.groups) ? raw.groups.map(String).filter(Boolean) : [],
  };
}

export const usePresetCatalogGroupStore = defineStore('presetCatalogGroups', () => {
  const settings = ref(readSettings());

  function persist() {
    _.set(extension_settings, field, settings.value);
    void saveSettingsDebounced();
  }

  function itemKey(source: PresetCatalogSource, id: string) {
    return `${source}:${id}`;
  }

  function groupOf(source: PresetCatalogSource, id: string) {
    return settings.value.assignments[itemKey(source, id)] || '';
  }

  function assign(source: PresetCatalogSource, id: string, requestedGroup: string) {
    const group = requestedGroup.trim();
    const key = itemKey(source, id);
    if (!group || group === '-') delete settings.value.assignments[key];
    else {
      if (!settings.value.groups.includes(group)) settings.value.groups.push(group);
      settings.value.assignments[key] = group;
    }
    persist();
  }

  function createGroup(name: string) {
    const group = name.trim();
    if (group && !settings.value.groups.includes(group)) {
      settings.value.groups.push(group);
      persist();
    }
  }

  return { assign, createGroup, groupOf, groups: computed(() => settings.value.groups) };
});
