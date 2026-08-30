/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../src/apps/theater/TheaterApp.vue', import.meta.url), 'utf8');

test('theater directory and detail navigation sort by the active version time', () => {
  assert.match(
    source,
    /function getActiveVersionCreatedAt\(entry: TheaterEntry\)[\s\S]*?resolveContentVersion\(entry\.versions, entry\.activeVersionId\)\?\.createdAt \|\| entry\.createdAt/u,
  );
  assert.match(
    source,
    /const detailEntries = computed\([\s\S]*?getActiveVersionCreatedAt\(left\)\.localeCompare\(getActiveVersionCreatedAt\(right\)\)[\s\S]*?sortDesc\.value/u,
  );
  assert.match(source, /const filteredEntries = computed\([\s\S]*?return detailEntries\.value\.filter/u);
});
