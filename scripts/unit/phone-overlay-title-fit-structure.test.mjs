/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = await readFile(new URL('../../src/components/PhoneOverlay.vue', import.meta.url), 'utf8');
const owner = await readFile(new URL('../../src/composables/usePhoneTitleFit.ts', import.meta.url), 'utf8');

test('PhoneOverlay delegates title measurement and listeners to one internal composable', () => {
  assert.match(root, /import \{ usePhoneTitleFit \} from '@\/composables\/usePhoneTitleFit'/u);
  assert.match(
    root,
    /usePhoneTitleFit\(\{[\s\S]*currentTitle,[\s\S]*fontFamily:[\s\S]*isOpen,[\s\S]*topbarEl,[\s\S]*\}\)/u,
  );

  for (const legacyOwner of ['titleFitFrame', 'titleResizeObserver', 'fitTopTitle']) {
    assert.doesNotMatch(root, new RegExp(`\\b${legacyOwner}\\b`, 'u'), `${legacyOwner} leaked back into PhoneOverlay`);
    assert.match(owner, new RegExp(`\\b${legacyOwner}\\b`, 'u'), `${legacyOwner} is missing from the title owner`);
  }

  assert.match(owner, /const maximumSize = 14/u);
  assert.match(owner, /const minimumSize = 11/u);
  assert.match(owner, /document\.fonts\?\.addEventListener\?\.\('loadingdone'/u);
});
