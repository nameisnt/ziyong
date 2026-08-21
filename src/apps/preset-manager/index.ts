import { definePhoneApp } from '@/core/appRegistry';
import { PresetLinkSettingsSchema, presetLinkField, usePresetLinkStore } from '@/apps/preset-link/store';
import { extension_settings } from '@sillytavern/scripts/extensions';
import PresetManagerApp from './PresetManagerApp.vue';

export default definePhoneApp({
  id: 'preset-manager',
  name: '预设管理',
  icon: 'fa-list-check',
  description: '管理酒馆预设与插件私有预设',
  accent: '#5b7cfa',
  defaultRoute: 'root',
  defaultOrder: 114,
  backupDomains: [
    {
      category: 'configuration',
      key: 'preset-link',
      exportData: () => _.get(extension_settings, presetLinkField, {}),
      importData: data => {
        _.set(extension_settings, presetLinkField, data);
      },
      rehydrateFromSettings: () => usePresetLinkStore().rehydrateFromSettings(),
      schema: PresetLinkSettingsSchema,
      schemaVersion: 2,
      scope: 'global',
    },
  ],
  component: PresetManagerApp,
  resetCurrentScope: () => usePresetLinkStore().resetCurrentScope(),
  scopeSwitchHandler: scopeKey => usePresetLinkStore().switchScope(scopeKey),
});
