/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [harness, context, readerNavigation, visualBaseline, appearanceBaseline] = await Promise.all([
  readFile(new URL('../../src/testing/visual-harness.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../src/testing/visual/context.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../src/testing/visual/navigation/readerNavigation.ts', import.meta.url), 'utf8'),
  readFile(new URL('../baselines/ui-visual.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../baselines/ui-appearance.json', import.meta.url), 'utf8').then(JSON.parse),
]);

test('visual harness delegates shared waiting and reader DOM navigation', () => {
  assert.match(harness, /from '@\/testing\/visual\/context'/u);
  assert.match(harness, /from '@\/testing\/visual\/navigation\/readerNavigation'/u);
  assert.doesNotMatch(harness, /function waitForVisualCondition/u);
  assert.doesNotMatch(harness, /function (?:toggleReaderFooter|openReaderTools|openReaderCatalog)/u);

  assert.match(context, /export async function waitForVisualCondition/u);
  assert.match(context, /performance\.now\(\) - startedAt > timeout/u);
  assert.match(readerNavigation, /export async function toggleReaderFooter/u);
  assert.match(readerNavigation, /export async function openReaderTools/u);
  assert.match(readerNavigation, /export async function openReaderCatalog/u);
  assert.match(readerNavigation, /\.pc-reader-detail-shell/u);
  assert.match(readerNavigation, /\.pc-reader-tool-trigger/u);
  assert.match(readerNavigation, /\.pc-detail-nav \.catalog/u);
});

test('navigation extraction keeps the registered visual evidence cardinality', () => {
  assert.equal(visualBaseline.scenarioCount, 303);
  assert.equal(visualBaseline.runs.length, 909);
  assert.deepEqual(visualBaseline.sizes, ['350x700', '390x844', '430x900']);
  assert.equal(appearanceBaseline.evidence.length, 15);
});
