import WorkbenchApp from './WorkbenchApp.vue';
import { useWorkbenchStore, WorkbenchSettingsSchema } from './store';
import { definePhoneApp } from '@/core/appRegistry';
import { getCurrentChatScopeKey, readChatScopedEnvelope } from '@/store/chatScoped';
import { createChatScopedBackupSchema } from '@/type/backup';
import { extension_settings } from '@sillytavern/scripts/extensions';

function migrateWorkbenchBackupData(data: unknown) {
  if (data && typeof data === 'object' && (data as Record<string, unknown>).__chatScoped === true) return data;
  return {
    __chatScoped: true,
    legacyScopeMigrations: {},
    scopes: {},
  };
}

export default definePhoneApp({
  id: 'workbench',
  name: '工作台',
  icon: 'fa-briefcase',
  description: '按 AI 回复数自动运行保存流程',
  accent: '#5856d6',
  defaultRoute: 'root',
  defaultOrder: 65,
  component: WorkbenchApp,
  resetCurrentScope: () => useWorkbenchStore().resetCurrentScope(),
  scopeSwitchHandler: scopeKey => useWorkbenchStore().switchScope(scopeKey),
  backupDomains: [
    {
      category: 'configuration',
      key: 'workbench',
      exportData: currentScopeKey =>
        readChatScopedEnvelope('sillytavern_phone_workbench', currentScopeKey || getCurrentChatScopeKey()),
      importData: data => {
        _.set(extension_settings, 'sillytavern_phone_workbench', data);
      },
      rehydrateFromSettings: () => useWorkbenchStore().rehydrateFromSettings(),
      schema: createChatScopedBackupSchema(WorkbenchSettingsSchema),
      schemaVersion: 3,
      migrateImport: migrateWorkbenchBackupData,
      scope: 'chat',
    },
  ],
});
