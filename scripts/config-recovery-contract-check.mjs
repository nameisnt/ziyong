// eslint-disable-next-line import-x/no-nodejs-modules
import assert from 'node:assert/strict';
// eslint-disable-next-line import-x/no-nodejs-modules
import { readFile } from 'node:fs/promises';

const files = await Promise.all(
  [
    '../src/store/chatScoped.ts',
    '../src/apps/timekeeper/store.ts',
    '../src/apps/chat-insert/store.ts',
    '../src/apps/workbench/store.ts',
    '../src/components/ConfigurationRecoveryNotice.vue',
  ].map(path => readFile(new URL(path, import.meta.url), 'utf8')),
);
const [chatScoped, timekeeper, chatInsert, workbench, notice] = files;

assert.match(chatScoped, /if \(configError\.value\) return;/);
assert.match(chatScoped, /rawConfig\.value = klona\(raw\)/);
const normalizeSettingsSource = timekeeper.slice(
  timekeeper.indexOf('function normalizeSettings'),
  timekeeper.indexOf('const TimekeeperStorageSchema'),
);
assert.doesNotMatch(normalizeSettingsSource, /catch \{/);
for (const source of [chatInsert, workbench]) {
  assert.match(source, /if \(configError\.value\) return;/);
  assert.match(source, /function resetCorruptedSettings/);
  assert.match(source, /rawConfig/);
}
assert.match(notice, /原始数据仍保留在本地/);
assert.match(notice, /导出原始数据/);

console.log('Configuration recovery safeguards are present.');
