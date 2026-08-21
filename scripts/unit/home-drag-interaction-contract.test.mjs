/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('home layout drag has a real browser interaction contract', async () => {
  const [contracts, catalog, harness] = await Promise.all([
    import('../ui-interaction-contracts.mjs'),
    readFile(new URL('../../src/testing/visual/scenarioCatalog.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../src/testing/visual-harness.ts', import.meta.url), 'utf8'),
  ]);

  const dragContract = contracts.UI_INTERACTION_CONTRACTS.find(contract => contract.id === 'home-layout-drag');
  assert.equal(dragContract?.scenario, 'home-layout-drag');
  assert.match(catalog, /['"]home-layout-drag['"]/);
  assert.match(harness, /name\s*===\s*['"]home-layout-drag['"]/);
  assert.match(harness, /new PointerEvent\(['"]pointerdown['"]/);
  assert.match(harness, /new PointerEvent\(['"]pointermove['"]/);
  assert.match(harness, /new PointerEvent\(['"]pointerup['"]/);
  assert.match(harness, /Home drag did not create the expected folder/);
  assert.match(harness, /Home folder rename was not persisted/);
  assert.match(harness, /Home folder removal did not preserve the one-item folder/);
  assert.match(harness, /Explicit one-App folder creation did not persist through the layout transaction/);
  assert.match(harness, /Explicit folder creation left the home interaction locked/);
  assert.match(harness, /Folder dissolution left a modal backdrop or the App route locked/);
  assert.match(harness, /Folder dissolution left desktop dragging locked/);
});
