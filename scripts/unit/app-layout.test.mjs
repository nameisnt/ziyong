/* eslint-disable import-x/no-named-as-default-member, import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function loadAppLayout() {
  let source = await readFile(new URL('../../src/core/appLayout.ts', import.meta.url), 'utf8');
  source = source
    .replace(
      "import { getRegisteredPhoneApp, getRegisteredPhoneApps } from '@/core/appRegistry';",
      `const apps = [
        { id: 'a', defaultDock: false },
        { id: 'b', defaultDock: false },
        { id: 'c', defaultDock: true },
        { id: 'd', defaultDock: true },
        { id: 'e', defaultDock: false },
      ];
      const getRegisteredPhoneApps = () => apps;
      const getRegisteredPhoneApp = id => apps.find(app => app.id === id);`,
    )
    .replace("import type { HomeFolder, HomeScreenLayout } from '@/type/settings';", '');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: 'appLayout.ts',
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

const { buildDefaultHomeLayout, homeFolderToken, moveHomeLayoutItem, normalizeHomeLayout, putHomeAppInFolder } =
  await loadAppLayout();

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
