/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [registry, tutorial] = await Promise.all([
  readFile(new URL('../../src/data/apps.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../src/apps/tutorial/TutorialApp.vue', import.meta.url), 'utf8'),
]);

test('App registration does not load the tutorial article corpus', () => {
  assert.doesNotMatch(registry, /apps\/tutorial\/(?:data|validation)/u);
  assert.doesNotMatch(registry, /tutorialArticles|tutorialCategories|assertTutorialRegistry/u);
});

test('the tutorial validates its article corpus when its lazy component loads', () => {
  assert.match(tutorial, /import \{ assertTutorialRegistry \} from '\.\/validation'/u);
  assert.match(tutorial, /const appDefinitions = getPhoneAppDefinitions\(\)/u);
  assert.match(tutorial, /assertTutorialRegistry\(appDefinitions, tutorialArticles, tutorialCategories\)/u);
});
