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
