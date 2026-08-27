/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const catalog = await readFile(new URL('../../src/apps/theater/TheaterCatalogPage.vue', import.meta.url), 'utf8');
const history = await readFile(new URL('../../src/apps/theater/TheaterHistoryPage.vue', import.meta.url), 'utf8');
const detail = await readFile(new URL('../../src/apps/theater/TheaterEntryDetailPage.vue', import.meta.url), 'utf8');
const scenario = await readFile(new URL('../../src/testing/visual/theaterScenarios.ts', import.meta.url), 'utf8');
const scenarioCatalog = await readFile(new URL('../../src/testing/visual/scenarioCatalog.ts', import.meta.url), 'utf8');

test('theater catalog keeps record browsing and single-item import on one explicit row', () => {
  assert.match(catalog, /pc-theater-record-row[\s\S]*?open-history[\s\S]*?ItemTransferImportAction/u);
  assert.match(catalog, /app-id="theater"/u);
  assert.match(catalog, /label="导入单条小剧场"/u);
  assert.match(catalog, /icon-only/u);
});

test('theater history no longer hides a single import action in a management menu', () => {
  assert.doesNotMatch(history, /ActionMenu/u);
  assert.doesNotMatch(history, /ItemTransferImportAction/u);
  assert.doesNotMatch(history, /导入单条小剧场/u);
});

test('theater detail still delegates single-item export to the shared reader shell', () => {
  assert.match(detail, /ReaderDetailShell/u);
  assert.match(detail, /display-app-id="theater"/u);
});

test('theater transfer scenario covers invalid file valid preview and cancellation', () => {
  assert.match(scenarioCatalog, /theater-catalog-transfer/u);
  assert.match(scenario, /invalid-theater-item\.json/u);
  assert.match(scenario, /buildItemTransfer\('theater'/u);
  assert.match(scenario, /pc-item-transfer-preview/u);
  assert.match(scenario, /aria-label="关闭"/u);
  assert.match(scenario, /setTheme\('dark'\)/u);
});
