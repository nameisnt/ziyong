/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = await readFile(new URL('../../src/components/PhoneOverlay.vue', import.meta.url), 'utf8');
const home = await readFile(new URL('../../src/components/PhoneHome.vue', import.meta.url), 'utf8');
const contextBar = await readFile(new URL('../../src/components/home/HomeContextBar.vue', import.meta.url), 'utf8');

test('PhoneOverlay delegates the complete home and folder surface to PhoneHome', () => {
  assert.match(root, /import PhoneHome from '@\/components\/PhoneHome\.vue'/u);
  assert.match(root, /<PhoneHome[\s\S]*:get-display-app-icon[\s\S]*:get-display-app-style/u);

  for (const homeOwner of [
    'pc-home-group-manager-dialog',
    'HomeDisplayItem',
    'appDrag',
    'onAppPointerDown',
    'activeHomeGroupId',
    'moveSelectedApps',
  ]) {
    assert.doesNotMatch(root, new RegExp(homeOwner, 'u'), `${homeOwner} leaked back into PhoneOverlay`);
    assert.match(home, new RegExp(homeOwner, 'u'), `${homeOwner} is missing from PhoneHome`);
  }
  assert.doesNotMatch(root, /pc-home-context|refreshPhoneData/u);
  assert.doesNotMatch(home, /class="pc-home-context"|async function refreshPhoneData/u);
  assert.match(contextBar, /class="pc-home-context"/u);
  assert.match(contextBar, /async function refreshPhoneData/u);
  assert.match(home, /<HomeContextBar/u);
});
