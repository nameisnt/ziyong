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

const catalogSource = await readMaybe(new URL('../../src/components/theater/TheaterCatalogPage.vue', import.meta.url));
const theaterSource = await readMaybe(new URL('../../src/components/TheaterApp.vue', import.meta.url));
const randomSource = await readMaybe(new URL('../../src/components/theater/theaterTypeRandom.ts', import.meta.url));
const scenarioCatalogSource = await readMaybe(new URL('../../src/testing/visual/scenarioCatalog.ts', import.meta.url));
const theaterScenarioSource = await readMaybe(new URL('../../src/testing/visual/theaterScenarios.ts', import.meta.url));

test('theater catalog places one accessible dice action beside the current range control', () => {
  assert.match(catalogSource, /pc-theater-type-toolbar/u);
  assert.match(catalogSource, /aria-label="随机选择当前可见类型"/u);
  assert.match(catalogSource, /:disabled="!visibleTypePrompts\.length"/u);
  assert.match(catalogSource, /\$emit\('random-type'\)/u);
});

test('random theater type uses only the existing visible pool and the existing generation route', () => {
  assert.match(theaterSource, /@random-type="openRandomVisibleType"/u);
  assert.match(theaterSource, /pickVisibleTheaterType\(visibleTypePrompts\.value/u);
  assert.match(theaterSource, /openGenerate\(typePrompt\.id\)/u);
  assert.doesNotMatch(theaterSource, /pickVisibleTheaterType\(theaterTypePrompts\.value/u);
});

test('random picker is a deterministic injectable pure selection with an explicit empty result', () => {
  assert.match(randomSource, /export function pickVisibleTheaterType/u);
  assert.match(randomSource, /random:\s*\(\)\s*=>\s*number\s*=\s*Math\.random/u);
  assert.match(randomSource, /if \(!items\.length\) return null/u);
  assert.match(randomSource, /Math\.floor\(random\(\) \* items\.length\)/u);
});

test('theater random behavior has an isolated browser scenario', () => {
  assert.match(scenarioCatalogSource, /theater-random-type/u);
  assert.match(theaterScenarioSource, /name === 'theater-random-type'/u);
  assert.match(theaterScenarioSource, /当前可见类型/u);
});
