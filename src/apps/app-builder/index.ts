const AppBuilderApp = defineAsyncComponent(() => import('./AppBuilderApp.vue'));
import { createCustomAppRuntimeModules } from './runtimeModules';
import {
  CustomAppContentDataSchema,
  CustomAppDefinitionsSettingsSchema,
  customAppChatDataField,
  customAppDefinitionsField,
  customAppGlobalDataField,
} from './schema';
import { useCustomAppsStore } from './store';
import { definePhoneApp, registerPhoneAppProvider } from '@/core/appRegistry';
import { getCurrentChatScopeKey, readChatScopedEnvelope } from '@/store/chatScoped';
import { extension_settings } from '@sillytavern/scripts/extensions';
import { createChatScopedBackupSchema } from '@/type/backup';

registerPhoneAppProvider(createCustomAppRuntimeModules);

export default definePhoneApp({
  id: 'app-builder',
  name: 'App 工坊',
  icon: 'fa-cubes-stacked',
  description: '创建简单的自制内容 App',
  accent: '#00a896',
  defaultRoute: 'root',
  defaultOrder: 126,
  backupDomains: [
    {
      category: 'configuration',
      key: 'custom-app-definitions',
      exportData: () => _.get(extension_settings, customAppDefinitionsField, {}),
      importData: data => _.set(extension_settings, customAppDefinitionsField, data),
      rehydrateFromSettings: () => useCustomAppsStore().rehydrateFromSettings(),
      schema: CustomAppDefinitionsSettingsSchema,
      schemaVersion: 1,
      scope: 'global',
    },
    {
      category: 'configuration',
      key: 'custom-app-global-data',
      exportData: () => _.get(extension_settings, customAppGlobalDataField, {}),
      importData: data => _.set(extension_settings, customAppGlobalDataField, data),
      rehydrateFromSettings: () => useCustomAppsStore().rehydrateFromSettings(),
      schema: CustomAppContentDataSchema,
      schemaVersion: 1,
      scope: 'global',
    },
    {
      category: 'content',
      key: 'custom-app-chat-data',
      exportData: currentScopeKey =>
        readChatScopedEnvelope(customAppChatDataField, currentScopeKey || getCurrentChatScopeKey()),
      importData: data => _.set(extension_settings, customAppChatDataField, data),
      rehydrateFromSettings: () => useCustomAppsStore().rehydrateFromSettings(),
      schema: createChatScopedBackupSchema(CustomAppContentDataSchema),
      schemaVersion: 1,
      scope: 'chat',
    },
  ],
  component: AppBuilderApp,
  resetCurrentScope: () => useCustomAppsStore().resetCurrentScope(),
  scopeSwitchHandler: scopeKey => useCustomAppsStore().switchScope(scopeKey),
});
