import { definePhoneApp } from '@/core/appRegistry';
import { extension_settings } from '@sillytavern/scripts/extensions';
const PresetLinkApp = defineAsyncComponent(() => import('./PresetLinkApp.vue'));
import { PresetLinkSettingsSchema, presetLinkField, usePresetLinkStore } from './store';

export default definePhoneApp({
  id: 'preset-link',
  name: '预设绑定',
  icon: 'fa-link',
  description: '绑定聊天与酒馆预设',
  accent: '#39836f',
  defaultRoute: 'root',
  defaultOrder: 115,
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
  component: PresetLinkApp,
  resetCurrentScope: () => usePresetLinkStore().resetCurrentScope(),
  scopeSwitchHandler: scopeKey => usePresetLinkStore().switchScope(scopeKey),
});
