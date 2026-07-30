import WorldbookLinkApp from './WorldbookLinkApp.vue';
import { useWorldbookLinkStore, worldbookLinkField } from './store';
import { definePhoneApp } from '@/core/appRegistry';
import { extension_settings } from '@sillytavern/scripts/extensions';

export default definePhoneApp({
  id: 'worldbook-link',
  name: '世界书联动',
  icon: 'fa-book-open-reader',
  description: '按当前聊天切换世界书条目状态',
  accent: '#2a9d8f',
  defaultRoute: 'root',
  defaultOrder: 116,
  backupDomains: [{
    key: 'worldbook-link',
    exportData: () => _.get(extension_settings, worldbookLinkField, {}),
    importData: data => {
      _.set(extension_settings, worldbookLinkField, data);
    },
    rehydrateFromSettings: () => useWorldbookLinkStore().rehydrateFromSettings(),
  }],
  component: WorldbookLinkApp,
  resetCurrentScope: () => useWorldbookLinkStore().resetCurrentScope(),
  scopeSwitchHandler: scopeKey => useWorldbookLinkStore().switchScope(scopeKey),
});
