/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function readMaybe(url) {
  try {
    return await readFile(url, 'utf8');
  } catch {
    return '';
  }
}

const catalog = await readMaybe(new URL('../../src/testing/visual/scenarioCatalog.ts', import.meta.url));
const harness = await readMaybe(new URL('../../src/testing/visual-harness.ts', import.meta.url));
const scenario = await readMaybe(new URL('../../src/testing/visual/minigameScenarios.ts', import.meta.url));
const definitions = await readMaybe(new URL('../../src/data/miniGameApps.ts', import.meta.url));
const registration = await readMaybe(new URL('../../src/apps/game-2048/index.ts', import.meta.url));
const backupSchemas = await readMaybe(new URL('../../src/apps/game-2048/backupSchemas.ts', import.meta.url));
const component = await readMaybe(new URL('../../src/apps/game-2048/Game2048App.vue', import.meta.url));
const snake = await readMaybe(new URL('../../src/apps/game-2048/SnakeGame.vue', import.meta.url));
const audio = await readMaybe(new URL('../../src/apps/game-2048/miniGameAudio.ts', import.meta.url));

const gameIds = [
  '2048',
  'snake',
  'minesweeper',
  'sudoku',
  'sliding-puzzle',
  'guess-number',
  'gomoku',
  'reversi',
  'solitaire',
];

test('every independent minigame has a dedicated play scenario', () => {
  for (const gameId of gameIds) assert.match(catalog, new RegExp(`game-${gameId}-play`));
  assert.match(harness, /Minigame group did not expose all nine App entries/);
  assert.match(harness, /applyMinigameVisualScenario/);
});

test('the minigame fixture isolates all nine durable fields and real board actions', () => {
  for (const gameId of gameIds) assert.match(scenario, new RegExp(`'${gameId}'`));
  assert.match(scenario, /miniGameFields/);
  assert.match(scenario, /extension_settings/);
  assert.match(scenario, /pc-game2048-board/);
  assert.match(scenario, /pc-mine-cell/);
  assert.match(scenario, /pc-solitaire-card-slot\.stock/);
});

test('minigame backups round-trip games that have never been initialized', () => {
  assert.match(backupSchemas, /EmptyGameSettingsSchema/u);
  assert.match(backupSchemas, /optionalGameSettings/u);
  assert.match(registration, /hasOwnProperty\.call\(extension_settings, field\)/u);
  assert.match(registration, /_\.unset\(extension_settings, field\)/u);
});

test('all nine minigames are registered as direct, independently loaded apps', () => {
  for (const gameId of gameIds) assert.match(definitions, new RegExp(`appId: 'game-${gameId}'`));
  assert.match(registration, /registerPhoneAppProvider/);
  assert.doesNotMatch(registration, /id: 'games'/);
  assert.equal((registration.match(/defineAsyncComponent\(\(\) => import\(/gu) || []).length, gameIds.length);
  for (const name of [
    'Game2048App',
    'GomokuGame',
    'GuessNumberGame',
    'MinesweeperGame',
    'ReversiGame',
    'SlidingPuzzleGame',
    'SnakeGame',
    'SolitaireGame',
    'SudokuGame',
  ]) {
    assert.match(registration, new RegExp(`import\\('./${name}\\.vue'\\)`));
  }
  assert.doesNotMatch(component, /SnakeGame|MinesweeperGame|getMiniGameIdByAppId/u);
  assert.match(component, /<span>\{\{ t`重开` \}\}<\/span>/u);
  assert.doesNotMatch(component, /openMiniGame|pushPage\('play'/);
  assert.match(scenario, /resetPhoneToRoute\(gameDefinition\.appId, 'root', gameDefinition\.name\)/);
  assert.match(snake, /aria-label="贪吃蛇方向控制"/u);
  for (const direction of ['up', 'down', 'left', 'right']) {
    assert.match(snake, new RegExp(`@click="setDirection\\('${direction}'\\)"`, 'u'));
  }
});

test('all minigames share synthesized audio and expose one mute control', async () => {
  assert.match(audio, /new AudioContext\(\)/u);
  assert.match(audio, /export function playMiniGameSound/u);
  const files = [
    'Game2048App.vue',
    'SnakeGame.vue',
    'MinesweeperGame.vue',
    'SudokuGame.vue',
    'SlidingPuzzleGame.vue',
    'GuessNumberGame.vue',
    'GomokuGame.vue',
    'ReversiGame.vue',
    'SolitaireGame.vue',
  ];
  for (const file of files) {
    const source = await readMaybe(new URL(`../../src/apps/game-2048/${file}`, import.meta.url));
    assert.match(source, /<MiniGameSoundButton\s*\/>/u, file);
    assert.match(source, /playMiniGameSound/u, file);
  }
});
