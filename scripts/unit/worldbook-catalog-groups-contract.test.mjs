/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [app, catalog, detail, store] = await Promise.all([
  readFile(new URL('../../src/apps/worldbook-link/WorldbookLinkApp.vue', import.meta.url), 'utf8'),
  readFile(new URL('../../src/apps/worldbook-link/pages/WorldbookCatalogPage.vue', import.meta.url), 'utf8'),
  readFile(new URL('../../src/apps/worldbook-link/pages/WorldbookDetailPage.vue', import.meta.url), 'utf8'),
  readFile(new URL('../../src/store/worldbookCatalogGroups.ts', import.meta.url), 'utf8'),
]);

test('worldbooks and their entries use plugin-private display groups', () => {
  assert.match(store, /sillytavern_phone_worldbook_catalog_groups/u);
  assert.match(store, /bookAssignments/u);
  assert.match(store, /entryAssignments/u);
  assert.match(app, /catalogGroups\.bookGroupOf/u);
  assert.match(app, /catalogGroups\.entryGroupOf/u);
  assert.match(catalog, /新建世界书分组/u);
  assert.match(catalog, /设置世界书分组/u);
  assert.match(detail, /新建条目分组/u);
  assert.match(detail, /设置条目分组/u);
});

test('rename, copy and delete keep display-group metadata aligned', () => {
  assert.match(app, /catalogGroups\.migrateBook\(oldName, newName\)/u);
  assert.match(app, /catalogGroups\.copyEntryGroup/u);
  assert.match(app, /catalogGroups\.removeEntry/u);
});
