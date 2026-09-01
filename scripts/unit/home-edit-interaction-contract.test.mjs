/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const home = await readFile(new URL('../../src/components/PhoneHome.vue', import.meta.url), 'utf8');
const contextBar = await readFile(new URL('../../src/components/home/HomeContextBar.vue', import.meta.url), 'utf8');
const horizontalDrag = await readFile(
  new URL('../../src/composables/useHorizontalDragScroll.ts', import.meta.url),
  'utf8',
);
const layout = await readFile(new URL('../../src/core/appLayout.ts', import.meta.url), 'utf8');

test('home status keeps low-frequency actions in the shared action menu', () => {
  assert.match(contextBar, /<ActionMenu[\s\S]*?align="start"[\s\S]*?icon-only[\s\S]*?label="操作"/u);
  const actionIndex = contextBar.indexOf('<ActionMenu');
  const contextCopyIndex = contextBar.indexOf('<div class="pc-home-context-copy">');
  assert.ok(actionIndex >= 0 && actionIndex < contextCopyIndex, 'the menu trigger must precede the chat label');
  assert.match(contextBar, />新建分组</u);
  assert.doesNotMatch(contextBar, /class="pc-home-context-btn"/u);
});

test('group management assigns selected Apps and keeps ordering on the home grid', () => {
  assert.match(layout, /export function createHomeFolder/u);
  assert.match(layout, /export function moveHomeAppsToFolder/u);
  assert.match(layout, /export function renameHomeFolder/u);
  assert.match(layout, /export function moveHomeFolder/u);
  assert.match(layout, /export function reorderHomeFolderApp/u);
  assert.match(home, /<BulkSelectionCheckbox/u);
  assert.match(home, /@click="moveSelectedApps"/u);
  assert.match(home, /@click="createSelectedHomeFolder"/u);
  assert.match(home, /v-model="managedHomeGroupId"[\s\S]*aria-label="当前管理分组"/u);
  assert.match(home, /v-model="folderMoveTargetId" class="pc-select" aria-label="目标分组"/u);
  assert.match(home, /@click="renameManagedHomeGroup"/u);
  assert.match(home, /aria-label="分组前移"[\s\S]*@click="moveManagedHomeGroup\(-1\)"/u);
  assert.match(home, /aria-label="分组后移"[\s\S]*@click="moveManagedHomeGroup\(1\)"/u);
  assert.match(home, />\s*本组\s*</u);
  assert.match(home, />\s*全部 App\s*</u);
  assert.match(home, /onFolderAppPointerDown/u);
  assert.match(home, /onFolderAppPointerMove/u);
  assert.match(home, /pc-app-tile\[data-folder-index\][\s\S]*getBoundingClientRect/u);
  assert.doesNotMatch(
    home,
    /elementFromPoint\(event\.clientX, event\.clientY\)\?\.closest<HTMLElement>\('\[data-folder-index\]'\)/u,
  );
  assert.doesNotMatch(home, /pc-home-folder-remove|dissolveActiveHomeFolder/u);
});

test('group tabs swipe horizontally and drag motion follows the home contract', () => {
  assert.match(home, /grid-template-columns:\s*repeat\(var\(--pc-home-columns\)/u);
  assert.match(home, /:deep\(\.pc-home-group-tabs\)\s*\{[\s\S]*overflow-x:\s*auto[\s\S]*touch-action:\s*pan-x/u);
  assert.match(home, /Transition name="pc-home-folder"/u);
  assert.match(home, /prefers-reduced-motion:\s*reduce/u);
  assert.match(home, /translate3d\(var\(--pc-drag-x/u);
});

test('desktop group tabs and Apps preserve clicks until a real drag starts', () => {
  const pointerDownBody =
    horizontalDrag.match(/function onPointerDown\(event: PointerEvent\) \{([\s\S]*?)\n {2}\}/u)?.[1] || '';
  const folderPointerUpBody =
    home.match(/function onFolderAppPointerUp\(event: PointerEvent\) \{([\s\S]*?)\n\}/u)?.[1] || '';
  assert.doesNotMatch(pointerDownBody, /setPointerCapture/u);
  assert.match(horizontalDrag, /Math\.abs\(delta\) > 4 && !dragged[\s\S]*setPointerCapture/u);
  assert.match(home, /event\.pointerType === 'mouse'[\s\S]*appDrag\.longPressReady = true/u);
  assert.match(folderPointerUpBody, /folderDrag\.isDragging/u);
  assert.match(folderPointerUpBody, /suppressHomeClickUntil\.value = Date\.now\(\) \+ 250/u);
  assert.doesNotMatch(home, /if \(folderDrag\.longPressReady\) suppressHomeClickUntil/u);
  assert.doesNotMatch(home, /if \(appDrag\.longPressReady \|\| appDrag\.isDragging\) suppressHomeClickUntil/u);
});

test('closing group management releases every transient manager state', () => {
  const closeBody = home.match(/function closeFolderCreator\(\) \{([\s\S]*?)\n\}/u)?.[1] || '';
  for (const evidence of [
    'folderCreateOpen.value = false',
    "folderCreateName.value = ''",
    'folderCreateAppIds.value = []',
    "folderManagerQuery.value = ''",
    'folderNewGroupOpen.value = false',
    "folderMoveTargetId.value = ''",
    "managedHomeGroupId.value = ''",
  ]) {
    assert.match(
      closeBody,
      new RegExp(evidence.replaceAll('.', '\\.').replaceAll('[', '\\[').replaceAll(']', '\\]'), 'u'),
    );
  }
});
