/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [home, layoutProjection, harness] = await Promise.all([
  readFile(new URL('../../src/components/PhoneHome.vue', import.meta.url), 'utf8'),
  readFile(new URL('../../src/components/home/useHomeLayoutProjection.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../src/testing/visual-harness.ts', import.meta.url), 'utf8'),
]);

test('saved folders render as group tabs with full direct App grids', () => {
  assert.match(home, /class="pc-home-group-tabs"/u);
  assert.match(home, /v-for="group in homeGroups"/u);
  assert.match(home, /class="pc-home-app-grid"/u);
  assert.match(home, /apps: activeHomeGroupApps\.value/u);
  assert.doesNotMatch(home, /独立 App|standaloneHomeApps/u);
  assert.doesNotMatch(home, /pc-home-folder-tile|pc-page-dot|pc-home-folder-shortcut/u);
  assert.doesNotMatch(layoutProjection, /packHomeGridPages|getFolderShortcutApps|getFolderRemainingApps/u);
});

test('home browser scenario verifies group switching, search, direct opening and management', () => {
  assert.match(harness, /Home did not render the saved folders as direct group tabs/u);
  assert.match(harness, /Selected home group did not expose every App directly/u);
  assert.match(harness, /Home group source was not restored without reopening its management dialog/u);
  assert.match(harness, /Home App search did not find chat archive in the fixed Dock/u);
  assert.match(harness, /Home group management action did not open the selected group/u);
});
