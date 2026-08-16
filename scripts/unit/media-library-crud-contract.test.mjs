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
const scenario = await readMaybe(new URL('../../src/testing/visual/mediaLibraryScenarios.ts', import.meta.url));

test('the shared media library has one dedicated CRUD scenario', () => {
  assert.match(catalog, /media-library-crud/);
  assert.match(harness, /applyMediaLibraryVisualScenario/);
  assert.match(scenario, /name !== 'media-library-crud'/);
});

test('the media CRUD scenario covers every kind and shared confirmation', () => {
  assert.match(scenario, /kind === 'image'/);
  assert.match(scenario, /kind === 'audio'/);
  assert.match(scenario, /kind === 'video'/);
  assert.match(scenario, /confirmMediaDeletion/);
  assert.match(scenario, /resetCurrentScope\(\)/);
});
