import WorkbenchApp from './WorkbenchApp.vue';
import { useWorkbenchStore } from './store';
import { definePhoneApp } from '@/core/appRegistry';
import { extension_settings } from '@sillytavern/scripts/extensions';

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
  backupDomains: [
    {
      key: 'workbench',
      exportData: () => _.get(extension_settings, 'sillytavern_phone_workbench', {}),
      importData: data => {
        _.set(extension_settings, 'sillytavern_phone_workbench', data);
      },
      rehydrateFromSettings: () => useWorkbenchStore().rehydrateFromSettings(),
    },
  ],
});
