import { definePhoneApp } from '@/core/appRegistry';
import { extension_settings } from '@sillytavern/scripts/extensions';
import RegexDisplayApp from './RegexDisplayApp.vue';
import { RegexDisplaySettingsSchema, regexDisplayField, useRegexDisplayStore } from './store';

export default definePhoneApp({
  id: 'regex-display',
  name: '正则替换',
  icon: 'fa-code',
  description: '集中管理 App 的提取与显示替换规则',
  accent: '#8e44ad',
  defaultRoute: 'root',
  defaultOrder: 125,
  backupDomains: [
    {
      category: 'configuration',
      key: 'regex-display',
      exportData: () => _.get(extension_settings, regexDisplayField, {}),
      importData: data => {
        _.set(extension_settings, regexDisplayField, data);
      },
      rehydrateFromSettings: () => useRegexDisplayStore().rehydrateFromSettings(),
      schema: RegexDisplaySettingsSchema,
      schemaVersion: 1,
      scope: 'global',
    },
  ],
  component: RegexDisplayApp,
});
