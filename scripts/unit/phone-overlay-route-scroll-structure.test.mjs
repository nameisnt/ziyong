/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = await readFile(new URL('../../src/components/PhoneOverlay.vue', import.meta.url), 'utf8');
const owner = await readFile(new URL('../../src/composables/usePhoneRouteScroll.ts', import.meta.url), 'utf8');

test('PhoneOverlay delegates route scroll snapshots to one internal composable', () => {
  assert.match(root, /import \{ usePhoneRouteScroll \} from '@\/composables\/usePhoneRouteScroll'/u);
  assert.match(root, /usePhoneRouteScroll\(\{\s*currentRoute,\s*mountedAppId,\s*screenEl,?\s*\}\);/su);

  for (const legacyOwner of [
    'RouteScrollSnapshot',
    'routeScrollSnapshots',
    'routeScrollRestoreSequence',
    'getRouteScrollRegions',
    'captureRouteScroll',
    'restoreRouteScroll',
  ]) {
    assert.doesNotMatch(root, new RegExp(`\\b${legacyOwner}\\b`, 'u'), `${legacyOwner} leaked back into PhoneOverlay`);
    assert.match(owner, new RegExp(`\\b${legacyOwner}\\b`, 'u'), `${legacyOwner} is missing from the route owner`);
  }

  assert.match(owner, /window\.setTimeout[\s\S]*80/u);
  assert.match(owner, /window\.setTimeout[\s\S]*240/u);
});
