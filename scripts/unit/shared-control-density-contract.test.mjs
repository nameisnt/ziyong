/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const css = await readFile(new URL('../../src/global.css', import.meta.url), 'utf8');

test('shared text and segment buttons use compact content-driven geometry', () => {
  assert.match(css, /\.pc-phone-root \.pc-soft-btn,\s*\n\.pc-phone-root \.pc-primary-btn \{\s*\n\s*min-height: 34px;/u);
  assert.match(css, /\.pc-phone-root \.pc-soft-btn,\s*\n\.pc-phone-root \.pc-primary-btn \{[\s\S]*?min-inline-size: 0;[\s\S]*?font-weight: 700;/u);
  assert.match(css, /\.pc-phone-root \.pc-segment-btn \{[\s\S]*?min-inline-size: 0;[\s\S]*?padding: 0 8px;/u);
  assert.doesNotMatch(css, /min-inline-size:\s*(?:56|76)px/u);
});

test('shared icon buttons shrink without changing topbar geometry', () => {
  assert.match(css, /\.pc-phone-root \.pc-icon-btn \{\s*\n\s*width: 34px;\s*\n\s*height: 34px;/u);
});
