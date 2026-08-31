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
  assert.match(globalCss, /data-paper='graphite'[\s\S]*?filter:\s*brightness/u);
  assert.match(globalCss, /data-paper='graphite'[\s\S]*?var\(--pc-icon-material-accent\)/u);
  assert.doesNotMatch(globalCss, /data-paper='graphite'[\s\S]*?filter:\s*grayscale/u);
});

test('prompt App choices reuse the same theme-aware AppIcon entry as the home screen', () => {
  assert.ok((prompts.match(/<AppIcon/gu) || []).length >= 3);
  assert.match(prompts, /:asset-path="group\.assetPath"/u);
  assert.match(prompts, /:default-icon="activeAppPromptGroup\.defaultIcon"/u);
});

test('paper artwork stays unframed on home navigation and prompt App choices', () => {
  assert.match(
    globalCss,
    /\.pc-home :is\(\.pc-app-tile, \.pc-dock-tile\)[\s\S]*?:has\(> \.pc-app-identity-image\)[\s\S]*?border:\s*0;[\s\S]*?background:\s*transparent;[\s\S]*?box-shadow:\s*none;/u,
  );
  assert.match(globalCss, /\.pc-app-prompt-icon:has\(> \.pc-app-identity-image\)/u);
  assert.match(prompts, /\.pc-app-prompt-tile\s*\{[\s\S]*?border:\s*0;[\s\S]*?background:\s*transparent;/u);
  assert.match(prompts, /\.pc-app-prompt-tile:focus-visible/u);
});

test('shared bookshelves derive covers from paper identity without business gradients', () => {
  assert.ok((bookShelf.match(/:data-paper="paper"/gu) || []).length >= 2);
  assert.match(bookShelf, /pc-book-cover pc-add-cover" :data-paper="paper"/u);
  assert.match(bookShelf, /\.pc-add-cover\s*\{[\s\S]*?border-style:\s*dashed;[\s\S]*?box-shadow:\s*none;/u);
  assert.doesNotMatch(bookShelf, /\.pc-add-cover\s*\{[\s\S]*?background:\s*var\(--pc-surface-strong\)/u);
  assert.match(bookShelf, /settingsStore\.settings\.visualTheme\.paperTextureId/u);
  assert.doesNotMatch(bookShelf, /book\.gradient/u);
  for (const source of [diary, extras, letters, summary]) assert.doesNotMatch(source, /gradient:\s*'linear-gradient/u);
});

test('bookshelves play a short reduced-motion-aware opening transition before navigation', () => {
  assert.match(bookShelf, /openingBookId\.value = id/u);
  assert.match(bookShelf, /prefers-reduced-motion:\s*reduce/u);
  assert.match(bookShelf, /window\.setTimeout\(\(\) => \{[\s\S]*emit\('select', id\);[\s\S]*\}, 210\)/u);
  assert.match(bookShelf, /\.pc-book-item\.opening \.pc-book-cover\s*\{[\s\S]*rotateY\(-28deg\)/u);
});
