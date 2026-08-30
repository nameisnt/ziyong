/* eslint-disable import-x/no-named-as-default-member, import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function loadAppLayout({ includeMiniGames = false } = {}) {
  let source = await readFile(new URL('../../src/core/appLayout.ts', import.meta.url), 'utf8');
  const miniGameIds = [
    'game-2048',
    'game-snake',
    'game-minesweeper',
    'game-sudoku',
    'game-sliding-puzzle',
    'game-guess-number',
    'game-gomoku',
    'game-reversi',
    'game-solitaire',
  ];
  source = source
    .replace(
      "import { getRegisteredPhoneApp, getRegisteredPhoneApps } from '@/core/appRegistry';",
      `const apps = [
        { id: 'a', defaultDock: false },
        { id: 'b', defaultDock: false },
        { id: 'c', defaultDock: false },
        { id: 'archive', defaultDock: false },
        { id: 'favorites', defaultDock: true },
        { id: 'prompts', defaultDock: true },
        { id: 'tutorial', defaultDock: true },
        { id: 'settings', defaultDock: true },
        ...${includeMiniGames ? JSON.stringify(miniGameIds) : '[]'}.map(id => ({ id, defaultDock: false })),
      ];
      const getRegisteredPhoneApps = () => apps;
      const getRegisteredPhoneApp = id => apps.find(app => app.id === id);`,
    )
    .replace("import type { HomeFolder, HomeScreenLayout } from '@/type/settings';", '')
    .replace(
      "import { MINI_GAME_APP_IDS } from '@/data/miniGameApps';",
      `const MINI_GAME_APP_IDS = ${JSON.stringify(miniGameIds)};`,
    );
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: 'appLayout.ts',
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

const {
  buildDefaultHomeLayout,
  createHomeFolder,
  homeFolderToken,
  moveHomeAppsToFolder,
  moveHomeLayoutItem,
  normalizeHomeLayout,
  putHomeAppInFolder,
  renameHomeFolder,
  reorderHomeFolderApp,
} = await loadAppLayout();
const { normalizeHomeLayout: normalizeMiniGameLayout } = await loadAppLayout({ includeMiniGames: true });

test('legacy layouts reset once to grouped layout v4 with the fixed Dock', () => {
  const layout = normalizeHomeLayout({ appOrder: ['a'], dockOrder: ['favorites'], folders: [], version: 3 });
  assert.equal(layout.version, 4);
  assert.deepEqual(layout.dockOrder, ['archive', 'favorites', 'prompts', 'tutorial', 'settings']);
  assert.deepEqual(
    layout.appOrder,
    layout.folders.map(folder => homeFolderToken(folder.id)),
  );
  assert.deepEqual(layout.folders.find(folder => folder.id === 'home_default_tools')?.appIds, ['a', 'b', 'c']);
  assert.deepEqual(buildDefaultHomeLayout(), layout);
});

test('v4 normalization keeps custom groups and assigns every ungrouped App to plugin tools', () => {
  const layout = normalizeHomeLayout({
    appOrder: [homeFolderToken('custom'), 'b'],
    dockOrder: ['settings', 'archive', 'favorites'],
    folders: [{ appIds: ['a'], id: 'custom', name: '我的分组' }],
    version: 4,
  });
  assert.deepEqual(layout.dockOrder, ['settings', 'archive', 'favorites', 'prompts', 'tutorial']);
  assert.deepEqual(layout.appOrder, [homeFolderToken('custom'), homeFolderToken('home_default_tools')]);
  assert.deepEqual(layout.folders.find(folder => folder.id === 'custom')?.appIds, ['a']);
  assert.deepEqual(layout.folders.find(folder => folder.id === 'home_default_tools')?.appIds, ['b', 'c']);
});

test('Dock drag only reorders the fixed five apps', () => {
  const layout = buildDefaultHomeLayout();
  const moved = moveHomeLayoutItem(layout, 'settings', 'dock', 0, 5);
  assert.deepEqual(moved.dockOrder, ['settings', 'archive', 'favorites', 'prompts', 'tutorial']);
  assert.deepEqual(moveHomeLayoutItem(moved, 'a', 'dock', 0, 5), moved);
});

test('moving a grouped app targets another existing group without creating standalone entries', () => {
  const layout = normalizeHomeLayout({
    appOrder: [homeFolderToken('one'), homeFolderToken('two')],
    dockOrder: ['archive', 'favorites', 'prompts', 'tutorial', 'settings'],
    folders: [
      { appIds: ['a', 'b'], id: 'one', name: '一' },
      { appIds: ['c'], id: 'two', name: '二' },
    ],
    version: 4,
  });
  const moved = putHomeAppInFolder(layout, 'b', homeFolderToken('two'));
  assert.deepEqual(moved.folders.find(folder => folder.id === 'one')?.appIds, ['a']);
  assert.deepEqual(moved.folders.find(folder => folder.id === 'two')?.appIds, ['c', 'b']);
  assert.ok(moved.appOrder.every(token => token.startsWith('folder:')));
});

test('explicit group creation moves selected apps out of their existing groups', () => {
  const created = createHomeFolder(buildDefaultHomeLayout(), {
    appIds: ['c', 'a'],
    id: 'custom',
    name: '我的分组',
  });
  assert.deepEqual(created.folders.find(folder => folder.id === 'custom')?.appIds, ['c', 'a']);
  assert.equal(
    created.folders.flatMap(folder => folder.appIds).filter(appId => appId === 'a' || appId === 'c').length,
    2,
  );
});

test('group management moves every selected app to one existing group', () => {
  const created = createHomeFolder(buildDefaultHomeLayout(), {
    appIds: ['a', 'b'],
    id: 'custom',
    name: '我的分组',
  });
  const targetId = created.folders.find(folder => folder.id !== 'custom' && folder.appIds.includes('c'))?.id;
  const moved = moveHomeAppsToFolder(created, ['a', 'c'], targetId);
  assert.deepEqual(moved.folders.find(folder => folder.id === 'custom')?.appIds, ['b']);
  assert.deepEqual(moved.folders.find(folder => folder.id === targetId)?.appIds.slice(-2), ['a', 'c']);
});

test('renaming a group preserves its identity, apps, icon, and order', () => {
  const layout = normalizeHomeLayout({
    appOrder: [homeFolderToken('one'), homeFolderToken('two')],
    dockOrder: ['archive', 'favorites', 'prompts', 'tutorial', 'settings'],
    folders: [
      { appIds: ['a', 'b'], iconAssetId: 'paper', id: 'one', name: '原分组' },
      { appIds: ['c'], iconAssetId: '', id: 'two', name: '第二组' },
    ],
    version: 4,
  });
  const renamed = renameHomeFolder(layout, 'one', '  新分组  ');
  assert.deepEqual(renamed.appOrder, layout.appOrder);
  assert.deepEqual(
    renamed.folders.find(folder => folder.id === 'one'),
    {
      appIds: ['a', 'b'],
      iconAssetId: 'paper',
      id: 'one',
      name: '新分组',
    },
  );
  assert.deepEqual(renameHomeFolder(renamed, 'one', '第二组'), renamed);
});

test('folder reordering remains inside grouped layout', () => {
  const created = createHomeFolder(buildDefaultHomeLayout(), {
    appIds: ['a', 'b'],
    id: 'custom',
    name: '我的分组',
  });
  const reordered = reorderHomeFolderApp(created, 'custom', 'a', 1);
  assert.deepEqual(reordered.folders.find(folder => folder.id === 'custom')?.appIds, ['b', 'a']);
  assert.ok(reordered.appOrder.every(token => token.startsWith('folder:')));
});

test('all minigames occupy one dedicated default group', () => {
  const layout = normalizeMiniGameLayout({ appOrder: [], dockOrder: [], folders: [], version: 3 });
  const folder = layout.folders.find(item => item.name === '小游戏');
  assert.equal(folder?.appIds.length, 9);
  assert.equal(layout.appOrder.filter(token => token === homeFolderToken(folder.id)).length, 1);
});

test('default grouping is declared by stable product categories', async () => {
  const source = await readFile(new URL('../../src/core/appLayout.ts', import.meta.url), 'utf8');
  assert.match(source, /name: '阅读与记录',/u);
  assert.match(source, /name: '生成',/u);
  assert.match(source, /name: '预设与世界书',/u);
  assert.match(source, /name: '酒馆工具',/u);
  assert.match(source, /name: '小游戏', appIds: MINI_GAME_APP_IDS/u);
  assert.match(source, /DEFAULT_DOCK_APP_IDS = \['archive', 'favorites', 'prompts', 'tutorial', 'settings'\]/u);
});
