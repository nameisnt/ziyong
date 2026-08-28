/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [globalCss, home, overlay, theme] = await Promise.all([
  readFile(new URL('../../src/global.css', import.meta.url), 'utf8'),
  readFile(new URL('../../src/components/PhoneHome.vue', import.meta.url), 'utf8'),
  readFile(new URL('../../src/components/PhoneOverlay.vue', import.meta.url), 'utf8'),
  readFile(new URL('../../src/apps/theme/ThemeApp.vue', import.meta.url), 'utf8'),
]);

test('one shared material styles home, Dock, group management and theme-preview App icons', () => {
  assert.match(globalCss, /\.pc-phone-root \.pc-app-icon-material\s*\{/u);
  assert.match(globalCss, /\.pc-app-icon-material::before/u);
  assert.match(globalCss, /\.pc-app-icon-material:has\(> img\)/u);
  assert.ok((home.match(/pc-app-icon-material/gu) || []).length >= 3);
  assert.match(theme, /pc-preview-app-icon pc-app-icon-material/u);
});

test('material colors derive from existing App theme variables without a new setting', () => {
  assert.match(overlay, /'--pc-icon-material-accent':\s*accent/u);
  assert.match(overlay, /'--pc-icon-material-base':/u);
  assert.match(theme, /'--pc-icon-material-accent':\s*accent/u);
  assert.doesNotMatch(globalCss, /animation:\s*[^;]*(shine|glow|liquid|glass)/iu);
});

test('paper identity strokes are injected by the shared overlay theme', () => {
  assert.match(overlay, /APP_SVG_STROKE_PROFILES\[visualTheme\.paperTextureId\]/u);
  assert.match(overlay, /'--pc-app-svg-primary-width'/u);
  assert.match(overlay, /'--pc-app-svg-detail-width'/u);
  assert.match(overlay, /'--pc-app-svg-accent-width'/u);
  assert.match(overlay, /'--pc-app-svg-echo-opacity'/u);
});

test('each paper theme gives the shared semantic glyph its own rendering profile', () => {
  for (const paper of ['a4', 'xuan', 'parchment', 'cardstock']) {
    assert.match(globalCss, new RegExp(`data-paper='${paper}'\\] \\.pc-app-icon-material > i`, 'u'));
  }
  assert.match(globalCss, /data-paper='xuan'[\s\S]*?filter:\s*contrast/u);
  assert.match(globalCss, /data-paper='parchment'[\s\S]*?filter:\s*sepia/u);
  assert.match(globalCss, /data-paper='cardstock'[\s\S]*?-webkit-text-stroke/u);
  for (const paper of ['xuan', 'parchment', 'cardstock']) {
    assert.match(globalCss, new RegExp(`data-paper='${paper}'\\] \\.pc-svg-icon-echo`, 'u'));
  }
});
