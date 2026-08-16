/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = await readFile(new URL('../../src/components/PhoneOverlay.vue', import.meta.url), 'utf8');
const home = await readFile(new URL('../../src/components/PhoneHome.vue', import.meta.url), 'utf8');

test('PhoneOverlay delegates the complete home and folder surface to PhoneHome', () => {
  assert.match(root, /import PhoneHome from '@\/components\/PhoneHome\.vue'/u);
  assert.match(root, /<PhoneHome[\s\S]*:get-display-app-icon[\s\S]*:get-display-app-style/u);

  for (const legacyOwner of [
    'pc-home-context',
    'pc-home-folder-dialog',
    'HomeDisplayItem',
    'appDrag',
    'onAppPointerDown',
    'onHomeSwipePointerDown',
    'dissolveActiveHomeFolder',
    'refreshPhoneData',
  ]) {
    assert.doesNotMatch(root, new RegExp(legacyOwner, 'u'), `${legacyOwner} leaked back into PhoneOverlay`);
    assert.match(home, new RegExp(legacyOwner, 'u'), `${legacyOwner} is missing from PhoneHome`);
  }
});
