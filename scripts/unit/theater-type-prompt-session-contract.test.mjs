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

const formSource = await readMaybe(new URL('../../src/components/GenerationFormPage.vue', import.meta.url));
const theaterSource = await readMaybe(new URL('../../src/apps/theater/TheaterApp.vue', import.meta.url));
const scenarioCatalogSource = await readMaybe(new URL('../../src/testing/visual/scenarioCatalog.ts', import.meta.url));
const theaterScenarioSource = await readMaybe(new URL('../../src/testing/visual/theaterScenarios.ts', import.meta.url));

test('generation form exposes one optional disabled pass-through without changing its default consumers', () => {
  assert.match(formSource, /generateDisabled\?:\s*boolean/u);
  assert.match(formSource, /generateDisabled:\s*false/u);
  assert.match(formSource, /:generate-disabled="generateDisabled"/u);
});

test('theater generation never writes the type library unless an explicit control requests it', () => {
  const runStart = theaterSource.indexOf('async function runGeneration()');
  const runEnd = theaterSource.indexOf('\nfunction savePreview()', runStart);
  const runSource = theaterSource.slice(runStart, runEnd);
  assert.ok(runStart >= 0 && runEnd > runStart, 'missing Theater generation function');
  assert.doesNotMatch(runSource, /saveGenerationTypePrompt\(\)/u);
  assert.match(theaterSource, /saveExistingGenerationTypePrompt/u);
  assert.match(theaterSource, /saveCustomTypeToLibrary/u);
  assert.match(theaterSource, /保存到类型库/u);
  assert.match(theaterSource, /保存为新类型/u);
});

test('theater rewrite prioritizes replay text and explicitly handles both legacy fallback states', () => {
  assert.match(theaterSource, /replay\.config\.typePrompt/u);
  assert.match(theaterSource, /legacyTypePromptNotice/u);
  assert.match(theaterSource, /legacyTypeSelectionRequired/u);
  assert.match(theaterSource, /:generate-disabled="theaterGenerateDisabled"/u);
  assert.match(theaterSource, /旧版本没有生成回放/u);
  assert.match(theaterSource, /重新选择类型或填写本次类型提示词/u);
});

test('theater type prompt lifecycle has an isolated browser scenario', () => {
  assert.match(scenarioCatalogSource, /theater-type-prompt-session/u);
  assert.match(theaterScenarioSource, /name === 'theater-type-prompt-session'/u);
  assert.match(theaterScenarioSource, /保存到类型库/u);
  assert.match(theaterScenarioSource, /保存为新类型/u);
});
