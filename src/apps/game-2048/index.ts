import './miniGame.css';
import { miniGameFields } from './fields';
import { MiniGamesBackupSchema } from './backupSchemas';
import { useGame2048Store } from './store';
import {
  definePhoneApp,
  registerPhoneAppProvider,
  type PhoneAppModule,
  type PhoneBackupDomain,
} from '@/core/appRegistry';
import { MINI_GAME_APPS } from '@/data/miniGameApps';
// SillyTavern exposes this browser runtime module through the extension bundler.
// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

const retiredNonogramField = 'sillytavern_phone_game_nonogram';
if (retiredNonogramField in extension_settings) {
  delete extension_settings[retiredNonogramField];
  void saveSettingsDebounced();
}

const miniGameComponents = {
  '2048': defineAsyncComponent(() => import('./Game2048App.vue')),
  gomoku: defineAsyncComponent(() => import('./GomokuGame.vue')),
  'guess-number': defineAsyncComponent(() => import('./GuessNumberGame.vue')),
  minesweeper: defineAsyncComponent(() => import('./MinesweeperGame.vue')),
  reversi: defineAsyncComponent(() => import('./ReversiGame.vue')),
  'sliding-puzzle': defineAsyncComponent(() => import('./SlidingPuzzleGame.vue')),
  snake: defineAsyncComponent(() => import('./SnakeGame.vue')),
  solitaire: defineAsyncComponent(() => import('./SolitaireGame.vue')),
  sudoku: defineAsyncComponent(() => import('./SudokuGame.vue')),
};

const backupDomain: PhoneBackupDomain = {
  category: 'configuration',
  key: 'mini-games',
  exportData: () =>
    Object.fromEntries(
      Object.entries(miniGameFields).flatMap(([key, field]) =>
        Object.prototype.hasOwnProperty.call(extension_settings, field)
          ? [[key, _.get(extension_settings, field)]]
          : [],
      ),
    ),
  importData: data => {
    if (!data || typeof data !== 'object') return;
    Object.entries(miniGameFields).forEach(([key, field]) => {
      const value = _.get(data, key);
      if (typeof value === 'undefined') _.unset(extension_settings, field);
      else _.set(extension_settings, field, value);
    });
  },
  rehydrateFromSettings: () => useGame2048Store().rehydrateFromSettings(),
  schema: MiniGamesBackupSchema,
  schemaVersion: 1,
  scope: 'global',
};

const miniGameModules: PhoneAppModule[] = MINI_GAME_APPS.map((game, index) =>
  definePhoneApp({
    id: game.appId,
    name: game.name,
    icon: game.icon,
    description: game.description,
    accent: '#f4a261',
    defaultRoute: 'root',
    defaultOrder: 145 + index,
    backupDomains: index === 0 ? [backupDomain] : undefined,
    component: miniGameComponents[game.gameId],
  }),
);

registerPhoneAppProvider(() => miniGameModules.slice(1));

export default miniGameModules[0];
