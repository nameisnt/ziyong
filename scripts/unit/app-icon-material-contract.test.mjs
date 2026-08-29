/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [globalCss, home, overlay, theme, prompts, bookShelf, diary, extras, letters, summary] = await Promise.all([
  readFile(new URL('../../src/global.css', import.meta.url), 'utf8'),
  readFile(new URL('../../src/components/PhoneHome.vue', import.meta.url), 'utf8'),
  readFile(new URL('../../src/components/PhoneOverlay.vue', import.meta.url), 'utf8'),
  readFile(new URL('../../src/apps/theme/ThemeApp.vue', import.meta.url), 'utf8'),
  readFile(new URL('../../src/apps/prompts/PromptsApp.vue', import.meta.url), 'utf8'),
  readFile(new URL('../../src/components/BookShelf.vue', import.meta.url), 'utf8'),
  readFile(new URL('../../src/apps/diary/DiaryApp.vue', import.meta.url), 'utf8'),
  readFile(new URL('../../src/apps/extras/ExtrasApp.vue', import.meta.url), 'utf8'),
  readFile(new URL('../../src/apps/letters/LettersApp.vue', import.meta.url), 'utf8'),
  readFile(new URL('../../src/apps/summary/SummaryApp.vue', import.meta.url), 'utf8'),
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
  for (const paper of ['a4', 'graphite', 'parchment', 'velvet', 'xuan', 'cypress', 'sky', 'ocean', 'cardstock']) {
    assert.match(globalCss, new RegExp(`data-paper='${paper}'`, 'u'));
  }
  assert.match(globalCss, /data-paper='xuan'[\s\S]*?filter:\s*contrast/u);
  assert.match(globalCss, /data-paper='parchment'[\s\S]*?filter:\s*sepia/u);
  assert.match(globalCss, /data-paper='cardstock'[\s\S]*?-webkit-text-stroke/u);
  assert.match(globalCss, /data-paper='graphite'[\s\S]*?filter:\s*grayscale/u);
});

test('prompt App choices reuse the same theme-aware AppIcon entry as the home screen', () => {
  assert.ok((prompts.match(/<AppIcon/gu) || []).length >= 3);
  assert.match(prompts, /:asset-path="group\.assetPath"/u);
  assert.match(prompts, /:default-icon="activeAppPromptGroup\.defaultIcon"/u);
});

test('shared bookshelves derive covers from paper identity without business gradients', () => {
  assert.match(bookShelf, /:data-paper="paper"/u);
  assert.match(bookShelf, /settingsStore\.settings\.visualTheme\.paperTextureId/u);
  assert.doesNotMatch(bookShelf, /book\.gradient/u);
  for (const source of [diary, extras, letters, summary]) assert.doesNotMatch(source, /gradient:\s*'linear-gradient/u);
});
