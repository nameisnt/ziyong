import Game2048App from './Game2048App.vue';
import { miniGameFields } from './fields';
import { MiniGamesBackupSchema } from './backupSchemas';
import { useGame2048Store } from './store';
import { definePhoneApp, type PhoneBackupDomain } from '@/core/appRegistry';
import { extension_settings } from '@sillytavern/scripts/extensions';

const backupDomain: PhoneBackupDomain = {
  category: 'configuration',
  key: 'mini-games',
  exportData: () => _.mapValues(miniGameFields, field => _.get(extension_settings, field, {})),
  importData: data => {
    if (!data || typeof data !== 'object') return;
    Object.entries(miniGameFields).forEach(([key, field]) => {
      _.set(extension_settings, field, _.get(data, key, {}));
    });
  },
  rehydrateFromSettings: () => useGame2048Store().rehydrateFromSettings(),
  schema: MiniGamesBackupSchema,
  schemaVersion: 1,
  scope: 'global',
};

export default definePhoneApp({
  id: 'games',
  name: '小游戏',
  icon: 'fa-gamepad',
  description: '等待生成时玩的轻量小游戏合集',
  accent: '#f4a261',
  defaultRoute: 'root',
  defaultOrder: 145,
  backupDomains: [backupDomain],
  component: Game2048App,
});
