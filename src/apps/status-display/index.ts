import { extension_settings } from '@sillytavern/scripts/extensions';
import { definePhoneApp } from '@/core/appRegistry';
import { registerRegexTargetProvider, type RegexTargetDefinition } from '@/core/regexTargetRegistry';
import StatusDisplayApp from './StatusDisplayApp.vue';
import {
  readStatusDisplaySettingsSnapshot,
  StatusDisplaySettingsSchema,
  statusDisplayField,
  statusDisplayRegexTargetId,
  useStatusDisplayStore,
} from './store';

registerRegexTargetProvider((): RegexTargetDefinition[] =>
  readStatusDisplaySettingsSnapshot().schemes.flatMap(scheme =>
    scheme.source === 'regex'
      ? [
          {
            appId: 'status-display',
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
  id: 'status-display',
  name: '状态栏',
  icon: 'fa-gauge-high',
  description: '把固定格式文字或 MVU 变量显示为网页',
  accent: '#168a72',
  defaultRoute: 'root',
  defaultOrder: 117,
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
  component: StatusDisplayApp,
});
