/* eslint-disable import-x/no-named-as-default-member, import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function loadBridge() {
  let source = await readFile(new URL('../../src/apps/profiles/externalBridge.ts', import.meta.url), 'utf8');
  source = source.replace(
    "import { getOptionalGlobalValue } from '@/util/runtime';",
    'const getOptionalGlobalValue = () => null;',
  );
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: 'externalBridge.ts',
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

const bridgeModule = await loadBridge();
const profilesApp = await readFile(new URL('../../src/apps/profiles/ProfilesApp.vue', import.meta.url), 'utf8');

test('external profiles normalize sheet headers and rows without creating phone profile entries', () => {
  const circular = {};
  circular.self = circular;
  const tables = bridgeModule.normalizeExternalProfilesData({
    mate: { type: 'chatSheets', version: 1 },
    ignored_metadata: { name: '不是表格' },
    sheet_people: {
      content: [
        ['row_id', '姓名', '姓名', ''],
        [1, '李沐晨', '别名', { status: '在场' }],
        [2, '沈知遥', '', circular],
      ],
      name: '重要人物表',
      uid: 'people',
    },
  });

  assert.equal(tables.length, 1);
  assert.deepEqual(
    tables[0].columns.map(column => column.label),
    ['row_id', '姓名', '姓名（2）', '第 4 列'],
  );
  assert.deepEqual(tables[0].rows[0].cells, ['1', '李沐晨', '别名', '{"status":"在场"}']);
  assert.equal(bridgeModule.getExternalProfileRowLabel(tables[0], tables[0].rows[0]), '李沐晨');
  assert.equal(tables[0].rows[1].cells[3], '[无法读取的结构化内容]');
  assert.equal(tables[0].key, 'sheet_people');
  assert.equal(tables[0].uid, 'people');
});

test('external profiles reject a non-table root instead of silently showing old phone data', () => {
  assert.throws(() => bridgeModule.normalizeExternalProfilesData([]), /不是表格对象/u);
  assert.throws(() => bridgeModule.normalizeExternalProfilesData(null), /不是表格对象/u);
});

test('external profiles bridge registers one update callback, rereads, opens and unregisters', async () => {
  let callback = null;
  let exportCount = 0;
  let openCount = 0;
  let unregisterCount = 0;
  const api = {
    exportTableAsJson() {
      exportCount += 1;
      return {
        mate: { type: 'chatSheets' },
        sheet_main: {
          name: '状态表',
          content: [
            ['row_id', '状态'],
            [1, exportCount === 1 ? '初始' : '更新'],
          ],
        },
      };
    },
    openVisualizer() {
      openCount += 1;
    },
    registerTableUpdateCallback(nextCallback) {
      callback = nextCallback;
    },
    unregisterTableUpdateCallback(nextCallback) {
      assert.equal(nextCallback, callback);
      unregisterCount += 1;
    },
    updateRow() {
      return true;
    },
  };
  const states = [];
  const bridge = bridgeModule.createExternalProfilesBridge(() => api);
  const handle = bridge.start(state => states.push(state));

  assert.equal(bridge.getState().status, 'ready');
  assert.equal(bridge.getState().canUpdateRows, true);
  assert.equal(bridge.getState().tables[0].rows[0].cells[1], '初始');
  callback({ stale: '回调参数不作为事实来源' });
  assert.equal(bridge.getState().tables[0].rows[0].cells[1], '更新');
  assert.equal(exportCount, 2);
  assert.equal(await bridge.openVisualizer(), true);
  assert.equal(openCount, 1);
  assert.ok(states.some(state => state.status === 'loading'));

  handle.stop();
  assert.equal(unregisterCount, 1);
});

test('external profiles bridge exposes missing and read errors without fallback tables', () => {
  const missing = bridgeModule.createExternalProfilesBridge(() => null);
  missing.start(() => {});
  assert.deepEqual(missing.getState().tables, []);
  assert.equal(missing.getState().status, 'missing');

  const broken = bridgeModule.createExternalProfilesBridge(() => ({
    exportTableAsJson() {
      throw new Error('外部读取失败');
    },
  }));
  broken.start(() => {});
  assert.deepEqual(broken.getState().tables, []);
  assert.equal(broken.getState().status, 'error');
  assert.match(broken.getState().message, /外部读取失败/u);
});

test('Profiles App reads and writes external tables without legacy phone profile entries', () => {
  assert.match(profilesApp, /createExternalProfilesBridge\(\)/u);
  assert.match(profilesApp, /createExternalProfilesRepository\(\)/u);
  assert.match(profilesApp, /onTavernEvent\('CHAT_CHANGED', refresh\)/u);
  assert.match(profilesApp, /stopBridge\?\.stop\(\)/u);
  assert.match(profilesApp, /repository\.updateRow/u);
  assert.match(profilesApp, /JSON\.stringify\(currentRow\.cells\) !== JSON\.stringify\(rowEditOriginalCells\.value\)/u);
  assert.match(profilesApp, /route\.page === 'row-edit'/u);
  assert.doesNotMatch(profilesApp, /legacyProfiles\.(?:entries|tables|createEntry|updateEntry|deleteEntry)/u);
});
