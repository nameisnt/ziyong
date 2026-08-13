/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  APPEARANCE_PERCEPTUAL_HASH_MAX_DISTANCE,
  UI_APPEARANCE_CONTRACTS,
  getAppearanceContractScenarios,
  perceptualHashDistance,
} from '../ui-appearance-contracts.mjs';

const expectedScenarios = [
  'home',
  'home-tasks-dark',
  'theme-form-control-isolation',
  'theater-generate-dark-inputs',
  'reader-theme-appearance',
];

test('appearance evidence uses the five declared light, dark, host-isolation, input, and reader scenarios', () => {
  assert.deepEqual(getAppearanceContractScenarios(), expectedScenarios);
  assert.equal(new Set(getAppearanceContractScenarios()).size, UI_APPEARANCE_CONTRACTS.length);
  for (const contract of UI_APPEARANCE_CONTRACTS) {
    assert.ok(contract.targets.length > 0, `${contract.scenario} must declare computed-style targets`);
    for (const target of contract.targets) {
      assert.ok(target.selector.startsWith('.pc-'));
      assert.ok(target.properties.length > 0);
    }
  }
});

test('the visual runner records screenshot hashes and computed styles through one appearance contract entry', async () => {
  const runner = await readFile(new URL('../ui-visual-check.mjs', import.meta.url), 'utf8');
  const packageJson = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));

  assert.match(runner, /getAppearanceContractScenarios\(\)/);
  assert.match(runner, /screenshotPerceptualHash/);
  assert.match(runner, /getComputedStyle/);
  assert.match(runner, /ui-appearance\.json/);
  assert.match(packageJson.scripts?.['verify:ui'] ?? '', /(?:^|\s)--appearance-contracts(?:\s|$)/);
});

test('perceptual screenshot distance tolerates only a small anti-aliasing drift', () => {
  assert.equal(perceptualHashDistance('0000000000000000', '0000000000000000'), 0);
  assert.equal(perceptualHashDistance('0000000000000000', '0000000000000001'), 1);
  assert.equal(perceptualHashDistance('0000000000000000', 'ffffffffffffffff'), 64);
  assert.equal(APPEARANCE_PERCEPTUAL_HASH_MAX_DISTANCE, 4);
  assert.throws(() => perceptualHashDistance('not-a-hash', '0000000000000000'));
});
