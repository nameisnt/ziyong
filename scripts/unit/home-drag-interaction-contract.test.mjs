/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('home group management has a real browser interaction contract', async () => {
  const [contracts, catalog, harness] = await Promise.all([
    import('../ui-interaction-contracts.mjs'),
    readFile(new URL('../../src/testing/visual/scenarioCatalog.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../src/testing/visual-harness.ts', import.meta.url), 'utf8'),
  ]);

  const contract = contracts.UI_INTERACTION_CONTRACTS.find(item => item.id === 'home-group-management');
  assert.equal(contract?.scenario, 'home');
  assert.match(catalog, /['"]home['"]/u);
  assert.match(harness, /Home did not render the saved folders as direct group tabs/u);
  assert.match(harness, /Home group tabs cannot scroll horizontally/u);
  assert.match(harness, /Home group App long-press drag did not reorder the active group/u);
  assert.match(harness, /Home group management did not open the App assignment list/u);
  assert.match(harness, /Home group management did not move the selected App to the target group/u);
  assert.match(harness, /Home group source was not restored without reopening its management dialog/u);
});
