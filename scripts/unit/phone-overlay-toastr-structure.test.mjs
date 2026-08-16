/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = await readFile(new URL('../../src/components/PhoneOverlay.vue', import.meta.url), 'utf8');
const bridge = await readFile(new URL('../../src/composables/usePhoneToastrBridge.ts', import.meta.url), 'utf8');

test('PhoneOverlay delegates the complete toastr lifecycle to one internal composable', () => {
  assert.match(root, /import \{ usePhoneToastrBridge \} from '@\/composables\/usePhoneToastrBridge'/u);
  assert.match(root, /usePhoneToastrBridge\(\);/u);

  for (const legacyOwner of [
    'toastrOriginals',
    'toastrBridgeInstalled',
    'formatToastrMessage',
    'formatToastrTitle',
    'showPhoneToastr',
    'installToastrBridge',
    'restoreToastrBridge',
  ]) {
    assert.doesNotMatch(root, new RegExp(`\\b${legacyOwner}\\b`, 'u'), `${legacyOwner} leaked back into PhoneOverlay`);
    assert.match(bridge, new RegExp(`\\b${legacyOwner}\\b`, 'u'), `${legacyOwner} is missing from the bridge owner`);
  }

  assert.match(bridge, /onMounted\(installToastrBridge\)/u);
  assert.match(bridge, /onBeforeUnmount\(restoreToastrBridge\)/u);
});
