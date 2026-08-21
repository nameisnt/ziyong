/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

async function loadHomeGridLayout() {
  const source = await readFile(new URL('../../src/core/homeGridLayout.ts', import.meta.url), 'utf8');
  const output = transpileModule(source, {
    compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 },
    fileName: 'homeGridLayout.ts',
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

const { packHomeGridPages } = await loadHomeGridLayout();

function assertNoOverlap(page, columns, rows) {
  const occupied = new Set();
  page.forEach(item => {
    for (let row = item.row; row < item.row + item.rowSpan; row += 1) {
      for (let column = item.column; column < item.column + item.columnSpan; column += 1) {
        assert.ok(row >= 1 && row <= rows);
        assert.ok(column >= 1 && column <= columns);
        const cell = `${row}:${column}`;
        assert.equal(occupied.has(cell), false, `overlap at ${cell}`);
        occupied.add(cell);
      }
    }
  });
}

test('home grid packs Apps as 1x1 and folders as indivisible 2x2 placements', () => {
  const pages = packHomeGridPages(
    [
      { isFolder: true, token: 'folder:a' },
      { isFolder: false, token: 'app:a' },
      { isFolder: true, token: 'folder:b' },
      { isFolder: false, token: 'app:b' },
      { isFolder: false, token: 'app:c' },
    ],
    4,
    3,
  );
  assert.ok(pages.length >= 1);
  assert.deepEqual(pages.flat().map(item => item.token), ['folder:a', 'app:a', 'folder:b', 'app:b', 'app:c']);
  pages.forEach(page => assertNoOverlap(page, 4, 3));
  pages.flat().filter(item => item.token.startsWith('folder:')).forEach(item => {
    assert.equal(item.columnSpan, 2);
    assert.equal(item.rowSpan, 2);
  });
});

test('narrow two-row pages move whole folders instead of splitting their cells', () => {
  const pages = packHomeGridPages(
    [
      { isFolder: true, token: 'folder:a' },
      { isFolder: true, token: 'folder:b' },
      { isFolder: false, token: 'app:a' },
      { isFolder: false, token: 'app:b' },
    ],
    3,
    2,
  );
  assert.equal(pages.length, 2);
  pages.forEach(page => assertNoOverlap(page, 3, 2));
  assert.deepEqual(pages[0].map(item => item.token), ['folder:a']);
  assert.deepEqual(pages[1].map(item => item.token), ['folder:b', 'app:a', 'app:b']);
});
