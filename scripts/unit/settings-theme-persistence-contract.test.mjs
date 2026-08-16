/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('settings and theme persistence have a real rehydrate interaction contract', async () => {
  const [contracts, scenarios] = await Promise.all([
    import('../ui-interaction-contracts.mjs'),
    readFile(new URL('../../src/testing/visual/settingsScenarios.ts', import.meta.url), 'utf8'),
  ]);

  const persistence = contracts.UI_INTERACTION_CONTRACTS.find(contract => contract.id === 'settings-persistence');
  assert.equal(persistence?.scenario, 'settings-theme-persistence');
  assert.match(scenarios, /['"]settings-theme-persistence['"]/);
  assert.match(scenarios, /settings\.rehydrateFromSettings\(\)/);
  assert.match(scenarios, /Settings interface value did not survive rehydrate/);
  assert.match(scenarios, /Theme pack did not survive rehydrate/);
});
