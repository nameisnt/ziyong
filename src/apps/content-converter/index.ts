import { definePhoneApp } from '@/core/appRegistry';
import ContentConverterApp from './ContentConverterApp.vue';
import {
  ContentConversionHistorySettingsSchema,
  contentConversionHistoryField,
  useContentConversionHistoryStore,
} from './store';
import { extension_settings } from '@sillytavern/scripts/extensions';

export default definePhoneApp({
  id: 'content-converter',
  name: '内容转换',
  icon: 'fa-arrow-right-arrow-left',
  description: '在不同 App 之间复制或合并内容',
  accent: '#0a84ff',
  defaultRoute: 'root',
  defaultOrder: 117,
  backupDomains: [
    {
      category: 'draft',
      key: 'content-converter-history',
      exportData: () => useContentConversionHistoryStore().data,
      importData: data => {
        _.set(extension_settings, contentConversionHistoryField, data);
      },
      rehydrateFromSettings: () => useContentConversionHistoryStore().rehydrateFromSettings(),
      schema: ContentConversionHistorySettingsSchema,
      schemaVersion: 1,
      scope: 'global',
    },
  ],
  component: ContentConverterApp,
});
