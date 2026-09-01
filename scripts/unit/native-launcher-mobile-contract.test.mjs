/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const launcher = await readFile(new URL('../../src/core/nativeLauncher.ts', import.meta.url), 'utf8');

test('native launcher uses visual viewport top-left coordinates on mobile', () => {
  assert.match(launcher, /window\.visualViewport/u);
  assert.match(launcher, /launcher\.style\.left/u);
  assert.match(launcher, /launcher\.style\.top/u);
  assert.doesNotMatch(launcher, /launcher\.style\.bottom/u);
  assert.doesNotMatch(launcher, /'bottom:86px'/u);
});

test('native launcher stays synchronized with mobile viewport changes', () => {
  assert.match(launcher, /window\.addEventListener\('orientationchange', syncPosition\)/u);
  assert.match(launcher, /window\.visualViewport\?\.addEventListener\('resize', syncPosition\)/u);
  assert.match(launcher, /clampLauncherPosition/u);
});
