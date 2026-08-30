import { extension_settings } from '@sillytavern/scripts/extensions';
const StatusDisplaySettingsApp = defineAsyncComponent(() => import('@/apps/status-display/StatusDisplaySettingsApp.vue'));
import {
  StatusDisplaySettingsSchema,
  statusDisplayField,
  useStatusDisplayStore,
} from '@/apps/status-display/store';
import { definePhoneApp } from '@/core/appRegistry';

export default definePhoneApp({
  id: 'status-display-settings',
  name: '状态栏设置',
  icon: 'fa-sliders',
  description: '管理状态方案以及当前聊天使用的方案',
  accent: '#168a72',
  defaultRoute: 'root',
  defaultOrder: 118,
  backupDomains: [
    {
      category: 'configuration',
      key: 'status-display',
      exportData: () => klona(_.get(extension_settings, statusDisplayField, {})),
      importData: data => _.set(extension_settings, statusDisplayField, klona(data)),
      rehydrateFromSettings: () => useStatusDisplayStore().rehydrateFromSettings(),
      schema: StatusDisplaySettingsSchema,
      schemaVersion: 1,
      scope: 'global',
    },
  ],
  component: StatusDisplaySettingsApp,
});
