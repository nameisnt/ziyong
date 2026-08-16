/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const harness = await readFile(new URL('../../src/testing/visual-harness.ts', import.meta.url), 'utf8');
const fixture = await readFile(new URL('../../src/testing/visual/archiveScenarios.ts', import.meta.url), 'utf8');
const scenario = harness.match(/\} else if \(name === 'archive-floor-backup'\) \{([\s\S]*?)\n {2}\} else if/u)?.[1] ?? '';

test('archive floor backup scenario always seeds and opens a readable backup', () => {
  assert.match(fixture, /buildChatFloorBackupKey/u);
  assert.match(fixture, /saveChatFloorBackup/u);
  assert.match(fixture, /reasoning/u);
  assert.match(scenario, /await seedArchiveFloorBackupFixture\(\)/u);
  assert.match(scenario, /setTimeout\(resolve, 1000\)[\s\S]*await seedArchiveFloorBackupFixture/u);
  assert.match(scenario, /resetPhoneToRoute\('settings'[\s\S]*resetPhoneToRoute\('archive'/u);
  assert.match(scenario, /unusedTab\.click\(\)[\s\S]*refresh\.click\(\)/u);
  assert.match(scenario, /chatRefresh\.click\(\)/u);
  assert.doesNotMatch(scenario, /if \(readBackup && !readBackup\.disabled\)/u);
  assert.match(scenario, /if \(!readBackup \|\| readBackup\.disabled\) throw/u);
  assert.match(scenario, /\.pc-floor-message details/u);
  assert.match(scenario, /\.pc-floor-backup-footer/u);
});
