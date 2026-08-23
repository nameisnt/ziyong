/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

const movedCandidates = [
  ['src/apps/extras/ExtrasBookOverviewPage.vue', '管理'],
  ['src/apps/diary/DiaryBookPage.vue', '管理'],
  ['src/apps/summary/SummaryBookPage.vue', '管理'],
  ['src/apps/preset-manager/pages/PresetDetailPage.vue', '管理'],
  ['src/apps/scene-planner/ScenePlannerApp.vue', '管理'],
  ['src/apps/entry-library/pages/EntryLibraryCatalogPage.vue', '工具'],
];

test('content-context management menus use the left icon-only trigger contract', async () => {
  for (const [path, label] of movedCandidates) {
    const source = await read(path);
    const menuPattern = new RegExp(
      `<ActionMenu(?=[^>]*\\balign="start")(?=[^>]*\\bicon-only)(?=[^>]*\\blabel=(?:"${label}"|"?[^>]*${label}[^>]*))[^>]*>`,
      'u',
    );
    assert.match(source, menuPattern, `${path} does not use a left icon-only ${label} menu`);
  }
});

test('directory management menus precede context copy while immediate actions stay trailing', async () => {
  for (const path of [
    'src/apps/extras/ExtrasBookOverviewPage.vue',
    'src/apps/diary/DiaryBookPage.vue',
    'src/apps/summary/SummaryBookPage.vue',
  ]) {
    const source = await read(path);
    assert.match(source, /pc-directory-leading[\s\S]*?<ActionMenu[\s\S]*?pc-directory-count/u, path);
    assert.match(source, /pc-directory-leading[\s\S]*?<\/div>[\s\S]*?pc-directory-actions/u, path);
  }

  const preset = await read('src/apps/preset-manager/pages/PresetDetailPage.vue');
  assert.match(preset, /pc-directory-leading[\s\S]*?<ActionMenu[\s\S]*?pc-directory-count/u);
  assert.match(preset, /pc-directory-leading[\s\S]*?<\/div>[\s\S]*?class="pc-icon-btn primary"/u);
});

test('single-action and creation menus are not mechanically moved into the left management slot', async () => {
  const letters = await read('src/apps/letters/LettersBookPage.vue');
  const theater = await read('src/apps/theater/TheaterHistoryPage.vue');
  assert.doesNotMatch(letters, /<ActionMenu[^>]*icon-only[^>]*管理/u);
  assert.doesNotMatch(theater, /<ActionMenu[^>]*icon-only[^>]*管理/u);

  for (const path of [
    'src/apps/forum/ForumBoardPage.vue',
    'src/apps/digest/DigestApp.vue',
    'src/apps/entry-library/pages/EntryLibraryCatalogPage.vue',
    'src/apps/profiles/pages/ProfilesCatalogPage.vue',
    'src/apps/scene-planner/ScenePlannerApp.vue',
  ]) {
    const source = await read(path);
    assert.doesNotMatch(source, /<ActionMenu[^>]*icon-only[^>]*label=(?:"新增"|"?[^>]*新增)/u, path);
  }
});
