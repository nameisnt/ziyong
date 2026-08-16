/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = await readFile(new URL('../../src/components/PhoneOverlay.vue', import.meta.url), 'utf8');
const owner = await readFile(new URL('../../src/composables/usePhoneWindowPosition.ts', import.meta.url), 'utf8');

test('PhoneOverlay delegates window position and pointer drag state to one internal composable', () => {
  assert.match(root, /import \{ usePhoneWindowPosition \} from '@\/composables\/usePhoneWindowPosition'/u);
  assert.match(root, /usePhoneWindowPosition\(isOpen\)/u);

  for (const legacyOwner of [
    'originX',
    'getViewportSize',
    'getShellSize',
    'clampPosition',
    'getDefaultPosition',
    'persistPosition',
  ]) {
    assert.doesNotMatch(root, new RegExp(`\\b${legacyOwner}\\b`, 'u'), `${legacyOwner} leaked back into PhoneOverlay`);
    assert.match(owner, new RegExp(`\\b${legacyOwner}\\b`, 'u'), `${legacyOwner} is missing from the window owner`);
  }

  assert.doesNotMatch(root, /const pointerId = ref/u);
  assert.match(owner, /const pointerId = ref/u);

  assert.match(owner, /Math\.hypot\(deltaX, deltaY\) > 6/u);
  assert.match(owner, /settingsStore\.setPhoneWindowPosition\(positionX\.value, positionY\.value\)/u);
});
