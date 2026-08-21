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
    'game-nonogram',
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
        { id: 'c', defaultDock: true },
        { id: 'd', defaultDock: true },
        { id: 'e', defaultDock: false },
        ...${includeMiniGames ? JSON.stringify(miniGameIds) : '[]'}.map(id => ({ id, defaultDock: false })),
      ];
      const getRegisteredPhoneApps = () => apps;
      const getRegisteredPhoneApp = id => apps.find(app => app.id === id);`,
    )
    .replace("import type { HomeFolder, HomeScreenLayout } from '@/type/settings';", '')
    .replace("import { MINI_GAME_APP_IDS } from '@/data/miniGameApps';", `const MINI_GAME_APP_IDS = ${JSON.stringify(miniGameIds)};`);
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: 'appLayout.ts',
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

const { buildDefaultHomeLayout, createHomeFolder, homeFolderToken, migrateHomeLayoutDockCapacity, moveHomeLayoutItem, normalizeHomeLayout, putHomeAppInFolder, reorderHomeFolderApp } =
  await loadAppLayout();
const { normalizeHomeLayout: normalizeMiniGameLayout } = await loadAppLayout({ includeMiniGames: true });

test('legacy desktop layout migrates default dock ownership once', () => {
  const layout = normalizeHomeLayout({ appOrder: ['e', 'c', 'a', 'b', 'd'], dockOrder: [], folders: [], version: 1 });
  assert.deepEqual(layout.dockOrder, ['c', 'd']);
  assert.deepEqual(layout.appOrder, ['e', 'a', 'b']);
  assert.equal(layout.version, 2);
  assert.deepEqual(buildDefaultHomeLayout().dockOrder, ['c', 'd']);
});

test('full dock pushes its last item back to the source home position', () => {
  const layout = normalizeHomeLayout({ appOrder: ['a', 'b', 'e'], dockOrder: ['c', 'd'], folders: [], version: 2 });
  const moved = moveHomeLayoutItem(layout, 'b', 'dock', 0, 2);
  assert.deepEqual(moved.dockOrder, ['b', 'c']);
  assert.deepEqual(moved.appOrder, ['a', 'd', 'e']);
  assert.deepEqual([...moved.appOrder, ...moved.dockOrder].sort(), ['a', 'b', 'c', 'd', 'e']);
});

test('dropping an app on another app creates one folder without losing apps', () => {
  const layout = normalizeHomeLayout({ appOrder: ['a', 'b', 'e'], dockOrder: ['c', 'd'], folders: [], version: 2 });
  const moved = putHomeAppInFolder(layout, 'b', 'a');
  assert.equal(moved.folders.length, 1);
  assert.deepEqual(moved.folders[0].appIds, ['a', 'b']);
  assert.ok(moved.appOrder.includes(homeFolderToken(moved.folders[0].id)));
  assert.deepEqual(
    [...moved.folders[0].appIds, ...moved.appOrder.filter(token => !token.startsWith('folder:')), ...moved.dockOrder].sort(),
    ['a', 'b', 'c', 'd', 'e'],
  );
});

test('normalization keeps a single-app folder instead of silently dissolving it', () => {
  const layout = normalizeHomeLayout({
    appOrder: [homeFolderToken('games')],
    dockOrder: ['c', 'd'],
    folders: [{ appIds: ['a'], id: 'games', name: '娱乐' }],
    version: 2,
  });
  assert.deepEqual(layout.folders, [{ appIds: ['a'], id: 'games', iconAssetId: '', name: '娱乐' }]);
  assert.deepEqual(layout.appOrder, [homeFolderToken('games'), 'b', 'e']);
});

test('recommended default grouping is declared by stable app IDs, with unknown apps left outside folders', async () => {
  const source = await readFile(new URL('../../src/core/appLayout.ts', import.meta.url), 'utf8');
  assert.match(source, /name: '创作', appIds: \['diary', 'extras', 'theater', 'forum', 'letters', 'card-writer', 'scene-planner'\]/u);
  assert.match(source, /name: '小游戏', appIds: MINI_GAME_APP_IDS/u);
  assert.match(source, /filter\(appId => !resolvedDockOrder\.includes\(appId\) && !folderAppIds\.has\(appId\)\)/u);
});

test('legacy standalone games entry becomes a minigame folder at the same desktop position', () => {
  const layout = normalizeMiniGameLayout({
    appOrder: ['a', 'games', 'b'],
    dockOrder: ['c', 'd'],
    folders: [],
    version: 2,
  });
  const folder = layout.folders.find(item => item.name === '小游戏');
  assert.ok(folder);
  assert.equal(layout.appOrder[1], homeFolderToken(folder.id));
  assert.deepEqual(folder.appIds, [
    'game-2048',
    'game-snake',
    'game-minesweeper',
    'game-sudoku',
    'game-nonogram',
    'game-sliding-puzzle',
    'game-guess-number',
    'game-gomoku',
    'game-reversi',
    'game-solitaire',
  ]);
});

test('legacy default entertainment folder is reused and renamed without changing its token', () => {
  const layout = normalizeMiniGameLayout({
    appOrder: [homeFolderToken('home_default_games'), 'a'],
    dockOrder: ['c', 'd'],
    folders: [{ appIds: ['games'], id: 'home_default_games', name: '娱乐' }],
    version: 2,
  });
  const folder = layout.folders.find(item => item.id === 'home_default_games');
  assert.equal(folder?.name, '小游戏');
  assert.equal(layout.appOrder[0], homeFolderToken('home_default_games'));
  assert.equal(folder?.appIds.length, 10);
});

test('legacy games member in a custom folder becomes a separate following minigame folder', () => {
  const layout = normalizeMiniGameLayout({
    appOrder: [homeFolderToken('custom'), 'b'],
    dockOrder: ['c', 'd'],
    folders: [{ appIds: ['a', 'games'], id: 'custom', name: '收藏夹' }],
    version: 2,
  });
  const gameFolder = layout.folders.find(item => item.name === '小游戏');
  assert.deepEqual(layout.folders.find(item => item.id === 'custom')?.appIds, ['a']);
  assert.ok(gameFolder);
  assert.deepEqual(layout.appOrder.slice(0, 2), [homeFolderToken('custom'), homeFolderToken(gameFolder.id)]);
});

test('legacy games Dock entry frees its slot and appends the minigame folder to desktop', () => {
  const layout = normalizeMiniGameLayout({
    appOrder: ['a', 'b', 'e'],
    dockOrder: ['c', 'games', 'd'],
    folders: [],
    version: 2,
  });
  const gameFolder = layout.folders.find(item => item.name === '小游戏');
  assert.deepEqual(layout.dockOrder, ['c', 'd']);
  assert.ok(gameFolder);
  assert.equal(layout.appOrder.at(-1), homeFolderToken(gameFolder.id));
});

test('layout without a legacy token receives one minigame folder once and remains user-editable', () => {
  const migrated = normalizeMiniGameLayout({ appOrder: ['a', 'b'], dockOrder: ['c', 'd'], folders: [], version: 2 });
  const gameFolder = migrated.folders.find(item => item.name === '小游戏');
  assert.ok(gameFolder);

  const dissolved = normalizeMiniGameLayout({
    ...migrated,
    appOrder: migrated.appOrder.filter(token => token !== homeFolderToken(gameFolder.id)).concat(gameFolder.appIds),
    folders: migrated.folders.filter(folder => folder.id !== gameFolder.id),
  });
  assert.equal(dissolved.folders.some(folder => folder.name === '小游戏'), false);
  assert.deepEqual(normalizeMiniGameLayout(dissolved), dissolved);
});

test('dock migration keeps four apps and appends overflow and folder tokens to desktop in Dock order', () => {
  const migrated = migrateHomeLayoutDockCapacity({
    appOrder: [],
    dockOrder: ['c', homeFolderToken('keep'), 'd', 'a', 'b'],
    folders: [{ appIds: ['e'], id: 'keep', name: '保留' }],
    version: 2,
  });
  assert.deepEqual(migrated.dockOrder, ['c', 'd', 'a', 'b']);
  assert.deepEqual(migrated.appOrder, [homeFolderToken('keep')]);
  assert.deepEqual(migrated.folders, [{ appIds: ['e'], id: 'keep', iconAssetId: '', name: '保留' }]);
});

test('explicit folder creation preserves selected desktop order and permits one app', () => {
  const created = createHomeFolder(
    { appOrder: ['a', 'b', 'c'], dockOrder: ['d'], folders: [], version: 2 },
    { appIds: ['c', 'a'], id: 'custom', name: '我的文件夹' },
  );
  assert.deepEqual(created.appOrder.slice(0, 2), [homeFolderToken('custom'), 'b']);
  assert.deepEqual(created.folders, [{ appIds: ['c', 'a'], iconAssetId: '', id: 'custom', name: '我的文件夹' }]);

  const single = createHomeFolder(created, { appIds: ['b'], id: 'single', name: '' });
  assert.deepEqual(single.folders.find(folder => folder.id === 'single')?.appIds, ['b']);
});

test('folder app reordering stays inside the selected folder', () => {
  const reordered = reorderHomeFolderApp(
    {
      appOrder: [homeFolderToken('custom'), 'd'],
      dockOrder: [],
      folders: [{ appIds: ['a', 'b', 'c'], iconAssetId: '', id: 'custom', name: '我的文件夹' }],
      version: 2,
    },
    'custom',
    'a',
    2,
  );
  assert.deepEqual(reordered.folders[0].appIds, ['b', 'c', 'a']);
  assert.deepEqual(reordered.appOrder, [homeFolderToken('custom'), 'd', 'e']);
});
