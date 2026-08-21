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
const component = await readMaybe(new URL('../../src/apps/game-2048/Game2048App.vue', import.meta.url));

const gameIds = [
  '2048',
  'snake',
  'minesweeper',
  'sudoku',
  'nonogram',
  'sliding-puzzle',
  'guess-number',
  'gomoku',
  'reversi',
  'solitaire',
];

test('every independent minigame has a dedicated play scenario', () => {
  for (const gameId of gameIds) assert.match(catalog, new RegExp(`game-${gameId}-play`));
  assert.match(harness, /Default desktop does not contain one ten-App minigame folder/);
  assert.match(harness, /applyMinigameVisualScenario/);
});

test('the minigame fixture isolates all ten durable fields and real board actions', () => {
  for (const gameId of gameIds) assert.match(scenario, new RegExp(`'${gameId}'`));
  assert.match(scenario, /miniGameFields/);
  assert.match(scenario, /extension_settings/);
  assert.match(scenario, /pc-game2048-board/);
  assert.match(scenario, /pc-mine-cell/);
  assert.match(scenario, /pc-solitaire-card-slot\.stock/);
});

test('all ten minigames are registered as direct apps without a legacy aggregate route', () => {
  for (const gameId of gameIds) assert.match(definitions, new RegExp(`appId: 'game-${gameId}'`));
  assert.match(registration, /registerPhoneAppProvider/);
  assert.doesNotMatch(registration, /id: 'games'/);
  assert.match(component, /getMiniGameIdByAppId\(currentRoute\.value\.appId\)/);
  assert.doesNotMatch(component, /openMiniGame|pushPage\('play'/);
  assert.match(scenario, /resetPhoneToRoute\(gameDefinition\.appId, 'root', gameDefinition\.name\)/);
});
