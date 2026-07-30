import { definePhoneApp } from '@/core/appRegistry';
import { extension_settings } from '@sillytavern/scripts/extensions';
import RegexDisplayApp from './RegexDisplayApp.vue';
import { regexDisplayField, useRegexDisplayStore } from './store';

export default definePhoneApp({
  id: 'regex-display',
  name: '正则显示',
  icon: 'fa-code',
  description: '正则替换后的文字或网页显示规则',
  accent: '#8e44ad',
  defaultRoute: 'root',
  defaultOrder: 125,
  backupDomains: [
    {
      key: 'regex-display',
      exportData: () => _.get(extension_settings, regexDisplayField, {}),
      importData: data => {
        _.set(extension_settings, regexDisplayField, data);
      },
      rehydrateFromSettings: () => useRegexDisplayStore().rehydrateFromSettings(),
    },
  ],
  component: RegexDisplayApp,
});
