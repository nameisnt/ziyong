/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const globalCss = await readFile(new URL('../../src/global.css', import.meta.url), 'utf8');

test('shared directory toolbar keeps the divider close to its controls', () => {
  assert.match(
    globalCss,
    /\.pc-phone-root \.pc-directory-toolbar\s*\{[^}]*padding-bottom:\s*4px;[^}]*border-bottom:\s*1px solid var\(--pc-border\);/su,
  );
});
