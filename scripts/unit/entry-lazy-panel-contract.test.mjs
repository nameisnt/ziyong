/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const entry = await readFile(new URL('../../src/index.ts', import.meta.url), 'utf8');

test('phone panel loads once through a shared dynamic import', () => {
  assert.doesNotMatch(entry, /import \{ initPanel \} from '@\/panel'/u);
  assert.match(entry, /panelLoadPromise = import\('@\/panel'\)/u);
  assert.match(entry, /if \(panelLoadPromise\) return panelLoadPromise/u);
  assert.match(entry, /await loadPanel\(\)/u);
});

test('automatic initialization waits for shared idle scheduling', () => {
  assert.match(entry, /import \{ scheduleIdleTask \} from '@\/util\/idleTask'/u);
  assert.match(entry, /scheduleIdleTask\(\(\) => void loadPanel\(\)\.catch/u);
  assert.doesNotMatch(entry, /ensureNativeLauncher\([\s\S]*?\n\s*void loadPanel\(\);/u);
});
