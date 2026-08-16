import MvuModifierApp from './MvuModifierApp.vue';
import { definePhoneApp } from '@/core/appRegistry';
import {
  MvuModifierSettingsSchema,
  mvuModifierField,
  useMvuModifierPersistenceStore,
} from '@/store/mvuModifier';
import { extension_settings } from '@sillytavern/scripts/extensions';

export default definePhoneApp({
  id: 'mvu-modifier',
  name: 'MVU 修改器',
  icon: 'fa-sliders',
  description: '查看与修改 MVU 变量',
  accent: '#00a896',
  defaultRoute: 'root',
  defaultOrder: 118,
  component: MvuModifierApp,
  backupDomains: [
    {
      category: 'configuration',
      key: 'mvu-modifier',
      exportData: () => {
        const store = useMvuModifierPersistenceStore();
        return klona(_.get(extension_settings, mvuModifierField, store.settings));
      },
      importData: data => _.set(extension_settings, mvuModifierField, klona(data)),
      rehydrateFromSettings: () => useMvuModifierPersistenceStore().rehydrateFromSettings(),
      schema: MvuModifierSettingsSchema,
      schemaVersion: 1,
      scope: 'global',
    },
  ],
});
