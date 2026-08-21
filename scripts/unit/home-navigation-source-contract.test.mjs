/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const phoneStore = await readFile(new URL('../../src/store/phone.ts', import.meta.url), 'utf8');
const phoneHome = await readFile(new URL('../../src/components/PhoneHome.vue', import.meta.url), 'utf8');
const harness = await readFile(new URL('../../src/testing/visual-harness.ts', import.meta.url), 'utf8');

test('home source context belongs to the shared navigation route instead of App-local patches', () => {
  assert.match(phoneStore, /export interface PhoneHomeSourceContext/);
  assert.match(phoneStore, /homeSource\?: PhoneHomeSourceContext/);
  assert.match(phoneStore, /function recordHomeSource\(/);
  assert.match(phoneHome, /phone\.recordHomeSource\(/);
  assert.match(phoneHome, /route\.homeSource/);
  assert.doesNotMatch(phoneHome, /route\.appId !== 'home'[\s\S]{0,260}homePageIndex\.value = 1/);
});

test('the formal home scenario verifies folder, page, nested detail, close-reopen and Home semantics', () => {
  for (const evidence of [
    'Home source page was not restored',
    'Home source folder was not restored',
    'Activity page source was not restored',
    'Nested App detail did not return to its root',
    'Closed phone lost its App route',
    'Home action did not reset the desktop source',
  ]) {
    assert.match(harness, new RegExp(evidence));
  }
});
