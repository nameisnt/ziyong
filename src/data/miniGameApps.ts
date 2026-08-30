export const MINI_GAME_APPS = [
  { appId: 'game-2048', description: '合成数字', gameId: '2048', icon: 'fa-table-cells-large', name: '2048' },
  { appId: 'game-snake', description: '滑动吃点', gameId: 'snake', icon: 'fa-route', name: '贪吃蛇' },
  { appId: 'game-minesweeper', description: '排雷开格', gameId: 'minesweeper', icon: 'fa-bomb', name: '扫雷' },
  { appId: 'game-sudoku', description: '填数解题', gameId: 'sudoku', icon: 'fa-border-all', name: '数独' },
  {
    appId: 'game-sliding-puzzle',
    description: '移动排序',
    gameId: 'sliding-puzzle',
    icon: 'fa-grip',
    name: '数字华容道',
  },
  {
    appId: 'game-guess-number',
    description: '数字推理',
    gameId: 'guess-number',
    icon: 'fa-arrow-down-1-9',
    name: '猜数字',
  },
  { appId: 'game-gomoku', description: '人机对弈', gameId: 'gomoku', icon: 'fa-chess-board', name: '五子棋' },
  {
    appId: 'game-reversi',
    description: '翻转棋局',
    gameId: 'reversi',
    icon: 'fa-circle-half-stroke',
    name: '黑白棋',
  },
  { appId: 'game-solitaire', description: '经典牌局', gameId: 'solitaire', icon: 'fa-clone', name: '纸牌接龙' },
] as const;

export type MiniGameId = (typeof MINI_GAME_APPS)[number]['gameId'];

export const MINI_GAME_APP_IDS = MINI_GAME_APPS.map(game => game.appId);

export function getMiniGameIdByAppId(appId: string): MiniGameId | null {
  return MINI_GAME_APPS.find(game => game.appId === appId)?.gameId ?? null;
}
