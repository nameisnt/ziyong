/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const home = await readFile(new URL('../../src/components/PhoneHome.vue', import.meta.url), 'utf8');
const layout = await readFile(new URL('../../src/core/appLayout.ts', import.meta.url), 'utf8');

test('home status keeps low-frequency actions in the shared action menu', () => {
  assert.match(home, /<ActionMenu[\s\S]*?align="start"[\s\S]*?icon-only[\s\S]*?label="操作"/u);
  const actionIndex = home.indexOf('<ActionMenu');
  const contextCopyIndex = home.indexOf('<div class="pc-home-context-copy">');
  assert.ok(actionIndex >= 0 && actionIndex < contextCopyIndex, 'the menu trigger must precede the chat label');
  assert.match(home, />新建文件夹</u);
  assert.doesNotMatch(home, /class="pc-home-context-btn"/u);
});

test('folder management exposes explicit creation and pointer reordering', () => {
  assert.match(layout, /export function createHomeFolder/u);
  assert.match(layout, /export function reorderHomeFolderApp/u);
  assert.match(home, /onFolderAppPointerDown/u);
  assert.match(home, /onFolderAppPointerMove/u);
  assert.match(home, /pc-home-folder-app\[data-folder-index\][\s\S]*getBoundingClientRect/u);
  assert.doesNotMatch(home, /elementFromPoint\(event\.clientX, event\.clientY\)\?\.closest<HTMLElement>\('\[data-folder-index\]'\)/u);
  assert.match(home, /class="pc-icon-btn pc-home-folder-remove"[\s\S]*@pointerdown\.stop[\s\S]*@click\.stop="removeFolderApp/u);
  assert.match(home, /folderCreateAppIds/u);
  assert.doesNotMatch(home, /title="前移"|title="后移"/u);
});

test('folder density and functional motion follow the home contract', () => {
  assert.match(home, /grid-template-columns:\s*repeat\(var\(--pc-home-columns\)/u);
  assert.match(home, /Transition name="pc-home-folder"/u);
  assert.match(home, /prefers-reduced-motion:\s*reduce/u);
  assert.match(home, /translate3d\(var\(--pc-drag-x/u);
});

test('folder creation and dissolution always release transient home interaction state', () => {
  const createFolderBody = home.match(/function createSelectedHomeFolder\(\) \{([\s\S]*?)\n\}/u)?.[1] || '';
  assert.doesNotMatch(createFolderBody, /isOrganizing\.value\s*=\s*true/u);
  assert.match(createFolderBody, /resetHomeInteractionState\(\)/u);

  const closeFolderBody = home.match(/function closeHomeFolder\(\) \{([\s\S]*?)\n\}/u)?.[1] || '';
  assert.match(closeFolderBody, /resetHomeInteractionState\(\)/u);

  const dissolveFolderBody = home.match(/async function dissolveActiveHomeFolder\(\) \{([\s\S]*?)\n\}/u)?.[1] || '';
  assert.match(dissolveFolderBody, /try\s*\{/u);
  assert.match(dissolveFolderBody, /finally\s*\{/u);
  assert.match(dissolveFolderBody, /resetHomeInteractionState\(\)/u);
});
