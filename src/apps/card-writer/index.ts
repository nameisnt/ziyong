const CardWriterApp = defineAsyncComponent(() => import('./CardWriterApp.vue'));
import { createCardWriterReferenceTree } from './references';
import { CardWriterSettingsSchema, cardWriterField, useCardWriterStore } from './store';
import { definePhoneApp } from '@/core/appRegistry';
import { extension_settings } from '@sillytavern/scripts/extensions';

export default definePhoneApp({
  id: 'card-writer',
  name: '写卡工坊',
  icon: 'fa-id-card',
  description: '秋青子预设一键写卡与模块生成',
  accent: '#c94f7c',
  defaultRoute: 'root',
  defaultOrder: 117,
  backupDomains: [
    {
      category: 'configuration',
      key: 'card-writer',
      exportData: () => _.get(extension_settings, cardWriterField, {}),
      importData: data => _.set(extension_settings, cardWriterField, data),
      rehydrateFromSettings: () => useCardWriterStore().rehydrateFromSettings(),
      schema: CardWriterSettingsSchema,
      schemaVersion: 1,
      scope: 'global',
    },
  ],
  component: CardWriterApp,
  referenceProvider: () => createCardWriterReferenceTree(useCardWriterStore().documents),
});
