import { extension_settings } from '@sillytavern/scripts/extensions';
import StatusDisplaySettingsApp from '@/apps/status-display/StatusDisplaySettingsApp.vue';
import {
  readStatusDisplaySettingsSnapshot,
  StatusDisplaySettingsSchema,
  statusDisplayField,
  statusDisplayRegexTargetId,
  useStatusDisplayStore,
} from '@/apps/status-display/store';
import { definePhoneApp } from '@/core/appRegistry';
import { registerRegexTargetProvider, type RegexTargetDefinition } from '@/core/regexTargetRegistry';

registerRegexTargetProvider((): RegexTargetDefinition[] =>
  readStatusDisplaySettingsSnapshot().schemes.flatMap(scheme =>
    scheme.source === 'regex'
      ? [
          {
            appId: 'status-display-settings',
            fields: ['content'],
            id: statusDisplayRegexTargetId(scheme.id),
            label: `状态栏 · ${scheme.name}`,
            operations: ['extract', 'replace'],
          },
        ]
      : [],
  ),
);

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
