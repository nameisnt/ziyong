/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../src/apps/reader/ReaderApp.vue', import.meta.url), 'utf8');

test('reader message button owns the visible card padding so the whole card is clickable', () => {
  assert.match(source, /\.pc-message-card\s*\{\s*padding:\s*0;/u);
  assert.match(source, /\.pc-message-main\s*\{[\s\S]*?width:\s*100%;[\s\S]*?padding:\s*14px;/u);
  assert.match(source, /\.pc-message-main\s*\{[\s\S]*?border-radius:\s*inherit;/u);
});
