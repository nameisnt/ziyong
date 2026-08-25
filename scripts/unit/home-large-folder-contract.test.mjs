/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [home, layoutProjection, harness] = await Promise.all([
  readFile(new URL('../../src/components/PhoneHome.vue', import.meta.url), 'utf8'),
  readFile(new URL('../../src/components/home/useHomeLayoutProjection.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../src/testing/visual-harness.ts', import.meta.url), 'utf8'),
]);

test('desktop folders expose exactly three direct shortcuts and one full-folder preview', () => {
  assert.match(home, /class="pc-home-folder-tile"|pc-app-tile pc-home-folder-tile/u);
  assert.match(layoutProjection, /getFolderApps\(item\)\.slice\(0, 3\)/u);
  assert.match(layoutProjection, /getFolderApps\(item\)\.slice\(3, 7\)/u);
  assert.match(home, /class="pc-home-folder-shortcut"[\s\S]*@click\.stop="openFolderShortcut\(app\.id\)"/u);
  assert.match(home, /class="pc-home-folder-more"[\s\S]*@click\.stop="openHomeFolderItem\(item\)"/u);
});

test('large folder browser scenario verifies geometry and both navigation paths', () => {
  assert.match(harness, /Large home folder does not expose three shortcuts and a remaining-App preview/u);
  assert.match(harness, /Large home folder does not occupy a 2x2 grid area/u);
  assert.match(harness, /Large home folder shortcut did not open its App directly/u);
  assert.match(harness, /Large home folder remaining preview did not open the full folder/u);
});
