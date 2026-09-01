/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../src/components/BookShelf.vue', import.meta.url), 'utf8');

test('bookshelf derives evenly distributed rows from its measured container width', () => {
  assert.match(source, /new ResizeObserver/u);
  assert.match(source, /Math\.floor\(\(width \+ 15\) \/ 99\)/u);
  assert.match(source, /shelfItems\.value\.length; index \+= columnCount\.value/u);
  assert.match(source, /repeat\(var\(--pc-shelf-column-count\), minmax\(0, 1fr\)\)/u);
  assert.doesNotMatch(source, /index \+= 3/u);
});

test('bookshelf places the create entry in the same responsive sequence as saved books', () => {
  assert.match(source, /props\.showCreate \? \[\{ key: 'create'/u);
  assert.match(source, /item\.kind === 'create' \? emit\('create'\)/u);
  assert.doesNotMatch(source, /v-if="showCreate" class="pc-shelf-row"/u);
});
