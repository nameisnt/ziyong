import { miniGameFields } from '@/apps/game-2048/fields';
import { useGame2048Store } from '@/apps/game-2048/store';
import { MINI_GAME_APPS, type MiniGameId } from '@/data/miniGameApps';
import { extension_settings } from '@sillytavern/scripts/extensions';

type MinigameScenarioContext = {
  resetPhoneToRoute: (appId: string, page: string, title: string, params?: Record<string, string>) => void;
  waitForCondition: (condition: () => boolean) => Promise<boolean>;
  waitForPaint: () => Promise<void>;
};

const gameByScenario: Record<string, MiniGameId> = {
  'game-2048-play': '2048',
  'game-gomoku-play': 'gomoku',
  'game-guess-number-play': 'guess-number',
  'game-minesweeper-play': 'minesweeper',
  'game-reversi-play': 'reversi',
  'game-sliding-puzzle-play': 'sliding-puzzle',
  'game-snake-play': 'snake',
  'game-solitaire-play': 'solitaire',
  'game-sudoku-play': 'sudoku',
};

const fieldByGame: Record<MiniGameId, string> = {
  '2048': miniGameFields.game2048,
  gomoku: miniGameFields.gomoku,
  'guess-number': miniGameFields.guessNumber,
  minesweeper: miniGameFields.minesweeper,
  reversi: miniGameFields.reversi,
  'sliding-puzzle': miniGameFields.slidingPuzzle,
  snake: miniGameFields.snake,
  solitaire: miniGameFields.solitaire,
  sudoku: miniGameFields.sudoku,
};

function setting(field: string) {
  return (extension_settings as Record<string, any>)[field];
}

function resetSetting(field: string) {
  delete (extension_settings as Record<string, any>)[field];
}

function findButton(label: string, root: ParentNode = document) {
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('button')];
  return (
    buttons.find(button => button.title === label || button.getAttribute('aria-label') === label) ??
    buttons.find(button => button.textContent?.trim() === label) ??
    buttons.find(button => button.textContent?.includes(label))
  );
}

async function waitForSelector(selector: string, context: MinigameScenarioContext, message: string) {
  if (!(await context.waitForCondition(() => Boolean(document.querySelector(selector))))) throw new Error(message);
  await context.waitForPaint();
}

function setInputValue(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

export async function applyMinigameVisualScenario(name: string, context: MinigameScenarioContext) {
  const gameId = gameByScenario[name];
  if (!gameId) return false;
  const field = fieldByGame[gameId];
  resetSetting(field);

  if (gameId === '2048') {
    const game = useGame2048Store();
    game.rehydrateFromSettings();
    game.startNewGame();
  }

  const gameDefinition = MINI_GAME_APPS.find(game => game.gameId === gameId);
  if (!gameDefinition) throw new Error(`Missing app definition for ${gameId}`);
  context.resetPhoneToRoute(gameDefinition.appId, 'root', gameDefinition.name);

  if (gameId === '2048') {
    await waitForSelector('.pc-game2048-board', context, '2048 board did not render');
    const game = useGame2048Store();
    for (const key of ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']) {
      window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key }));
      await context.waitForPaint();
      if (game.moves > 0) break;
    }
    if (game.moves < 1 || !game.canUndo) throw new Error('2048 did not accept any keyboard move');
    findButton('撤回', document.querySelector('.pc-game2048-actions') || document)?.click();
    if (!(await context.waitForCondition(() => game.moves === 0 && !game.canUndo))) {
      throw new Error('2048 undo did not restore the previous board');
    }
    for (const key of ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']) {
      window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key }));
      await context.waitForPaint();
      if (game.moves > 0) break;
    }
    findButton('重开', document.querySelector('.pc-game2048-actions') || document)?.click();
    if (!(await context.waitForCondition(() => game.moves === 0 && game.score === 0 && !game.canUndo))) {
      throw new Error('2048 restart did not reset the active round');
    }
    return true;
  }

  await waitForSelector('.pc-minigame-panel', context, `${gameId} panel did not render`);

  if (gameId === 'snake') {
    const speedGroup = document.querySelector('[aria-label="贪吃蛇速度"]');
    const fast = findButton('快', speedGroup || document);
    const start = findButton('开始', document.querySelector('.pc-minigame-actions') || document);
    if (!fast || !start) throw new Error('Snake speed or start action is missing');
    fast.click();
    start.click();
    if (
      !(await context.waitForCondition(() => setting(field)?.speed === 'fast' && setting(field)?.status === 'running'))
    ) {
      throw new Error('Snake start did not persist speed and running state');
    }
    const down = findButton('向下', document.querySelector('[aria-label="贪吃蛇方向控制"]') || document);
    if (!down) throw new Error('Snake direction pad is missing');
    down.click();
    if (!(await context.waitForCondition(() => setting(field)?.direction === 'down'))) {
      throw new Error('Snake direction pad did not change the active direction');
    }
    findButton('暂停', document.querySelector('.pc-minigame-actions') || document)?.click();
    if (!(await context.waitForCondition(() => setting(field)?.status === 'paused'))) {
      throw new Error('Snake pause did not persist');
    }
    return true;
  }

  if (gameId === 'minesweeper') {
    const modeGroup = document.querySelector('[aria-label="扫雷模式"]');
    const flagMode = findButton('插旗', modeGroup || document);
    const cell = document.querySelector<HTMLButtonElement>('.pc-mine-cell');
    if (!flagMode || !cell) throw new Error('Minesweeper flag controls are missing');
    flagMode.click();
    cell.click();
    if (!(await context.waitForCondition(() => setting(field)?.cells?.[0]?.flag === true))) {
      throw new Error('Minesweeper flag action did not persist');
    }
    if (!cell.querySelector('.fa-flag')) throw new Error('Minesweeper flag is not visible on the selected cell');
    return true;
  }

  if (gameId === 'sudoku') {
    const cell = document.querySelector<HTMLButtonElement>('.pc-sudoku-cell:not(.given)');
    const number = [...document.querySelectorAll<HTMLButtonElement>('.pc-sudoku-pad button')].find(
      button => button.textContent?.trim() === '1',
    );
    if (!cell || !number) throw new Error('Sudoku editable cell or number pad is missing');
    const index = [...document.querySelectorAll('.pc-sudoku-cell')].indexOf(cell);
    cell.click();
    number.click();
    if (!(await context.waitForCondition(() => setting(field)?.board?.[index] === 1))) {
      throw new Error('Sudoku number entry did not persist');
    }
    findButton('生成新题', document.querySelector('.pc-minigame-actions') || document)?.click();
    if (!(await context.waitForCondition(() => setting(field)?.puzzleNumber === 2))) {
      throw new Error('Sudoku local generator did not create and persist a new puzzle');
    }
    return true;
  }

  if (gameId === 'sliding-puzzle') {
    const tile = document.querySelector<HTMLButtonElement>('.pc-sliding-tile.movable:not(.blank):not(:disabled)');
    if (!tile) throw new Error('Sliding puzzle has no movable tile');
    tile.click();
    if (!(await context.waitForCondition(() => setting(field)?.moves === 1))) {
      throw new Error('Sliding puzzle move did not persist');
    }
    return true;
  }

  if (gameId === 'guess-number') {
    const statTexts = [...document.querySelectorAll<HTMLElement>('.pc-guess-number-stats :is(span, strong)')];
    if (statTexts.length !== 6) throw new Error('Guess number stats are incomplete');
    const clippedStats = statTexts.filter(item => item.scrollWidth > item.clientWidth + 1);
    if (clippedStats.length) {
      throw new Error(
        `Guess number stats are truncated: ${clippedStats.map(item => item.textContent?.trim()).join(', ')}`,
      );
    }
    const input = document.querySelector<HTMLInputElement>('.pc-guess-number-input');
    const submit = document.querySelector<HTMLButtonElement>('.pc-guess-form .pc-primary-btn');
    const sixDigits = findButton('6 位', document.querySelector('[aria-label="猜数字位数"]') || document);
    if (!input || !submit || !sixDigits) throw new Error('Guess number form or digit selector is incomplete');
    sixDigits.click();
    if (!(await context.waitForCondition(() => setting(field)?.digitCount === 6))) {
      throw new Error('Guess number digit selection did not persist');
    }
    setInputValue(input, '123456');
    submit.click();
    if (!(await context.waitForCondition(() => setting(field)?.guesses?.[0]?.value === '123456'))) {
      throw new Error('Guess number submission did not persist');
    }
    if (
      !setting(field)?.guesses?.[0]?.comment ||
      !document.querySelector('.pc-guess-history')?.textContent?.includes('123456')
    ) {
      throw new Error('Guess number history did not render the submitted guess');
    }
    return true;
  }

  if (gameId === 'gomoku') {
    const cell = document.querySelector<HTMLButtonElement>('.pc-gomoku-cell');
    if (!cell) throw new Error('Gomoku board cell is missing');
    cell.click();
    if (!(await context.waitForCondition(() => setting(field)?.board?.[0] === 1))) {
      throw new Error('Gomoku black move did not persist');
    }
    if (!document.querySelector('.pc-gomoku-cell[data-stone="1"]')) {
      throw new Error('Gomoku black stone did not render');
    }
    return true;
  }

  if (gameId === 'reversi') {
    const legal = document.querySelector<HTMLButtonElement>('.pc-reversi-cell.legal:not(:disabled)');
    if (!legal) throw new Error('Reversi has no legal human move');
    legal.click();
    if (!(await context.waitForCondition(() => setting(field)?.moves >= 1))) {
      throw new Error('Reversi human move did not persist');
    }
    if (document.querySelectorAll('.pc-reversi-cell[data-piece="1"]').length <= 2) {
      throw new Error('Reversi human move did not flip any piece');
    }
    return true;
  }

  const stock = document.querySelector<HTMLButtonElement>('.pc-solitaire-card-slot.stock');
  if (!stock) throw new Error('Solitaire stock is missing');
  const before = Number(stock.querySelector('small')?.textContent || 0);
  stock.click();
  if (!(await context.waitForCondition(() => setting(field)?.moves === 1))) {
    throw new Error('Solitaire draw did not persist');
  }
  const after = Number(document.querySelector('.pc-solitaire-card-slot.stock small')?.textContent || 0);
  if (!(after < before) || !document.querySelector('.pc-solitaire-top .pc-solitaire-card-face')) {
    throw new Error('Solitaire draw did not move a card to waste');
  }
  return true;
}
