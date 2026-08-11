import TimekeeperApp from './TimekeeperApp.vue';
import { TimekeeperSettingsSchema, timekeeperField, useTimekeeperStore } from './store';
import { definePhoneApp } from '@/core/appRegistry';
import { getCurrentChatScopeKey, readChatScopedEnvelope } from '@/store/chatScoped';
import { extension_settings } from '@sillytavern/scripts/extensions';
import { createChatScopedBackupSchema } from '@/type/backup';

export default definePhoneApp({
  id: 'timekeeper',
  name: '时间确认',
  icon: 'fa-clock',
  description: '世界时间与年龄换算',
  accent: '#2d9cdb',
  defaultRoute: 'root',
  defaultOrder: 130,
  backupDomains: [
    {
      category: 'configuration',
      key: 'timekeeper',
      exportData: currentScopeKey =>
        readChatScopedEnvelope(timekeeperField, currentScopeKey || getCurrentChatScopeKey()),
      importData: data => {
        _.set(extension_settings, timekeeperField, data);
      },
      rehydrateFromSettings: () => useTimekeeperStore().rehydrateFromSettings(),
      schema: createChatScopedBackupSchema(TimekeeperSettingsSchema),
      schemaVersion: 1,
      scope: 'chat',
    },
  ],
  component: TimekeeperApp,
  resetCurrentScope: () => useTimekeeperStore().resetCurrentScope(),
  scopeSwitchHandler: scopeKey => useTimekeeperStore().switchScope(scopeKey),
});
