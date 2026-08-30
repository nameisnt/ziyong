/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const app = await readFile(new URL('../../src/apps/entry-library/EntryLibraryApp.vue', import.meta.url), 'utf8');

test('entry-library sections derive each group item list once', () => {
  const sectionComputation =
    app.match(/const catalogSections = computed\([\s\S]*?const filteredSourceEntries = computed/u)?.[0] ?? '';
  assert.doesNotMatch(app, /const visibleGroups = computed/u);
  assert.match(sectionComputation, /const groupItems = library\.getGroupItems\(group\.id\)/u);
  assert.equal(sectionComputation.match(/library\.getGroupItems\(group\.id\)/gu)?.length, 1);
});
