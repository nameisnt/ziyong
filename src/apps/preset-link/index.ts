import PresetLinkApp from './PresetLinkApp.vue';
import { PresetLinkSettingsSchema, presetLinkField, usePresetLinkStore } from './store';
import { definePhoneApp } from '@/core/appRegistry';
import { extension_settings } from '@sillytavern/scripts/extensions';

export default definePhoneApp({
  id: 'preset-link',
  name: '预设绑定',
  icon: 'fa-link',
  description: '按聊天自动切换预设与正则',
  accent: '#4f8cff',
  defaultRoute: 'root',
  defaultOrder: 116,
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
      schemaVersion: 1,
      scope: 'global',
    },
  ],
  component: PresetLinkApp,
  resetCurrentScope: () => usePresetLinkStore().resetCurrentScope(),
  scopeSwitchHandler: scopeKey => usePresetLinkStore().switchScope(scopeKey),
});
