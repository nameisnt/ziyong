/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const api = await readFile(new URL('../src/apps/recovery/api.ts', import.meta.url), 'utf8');
const model = await readFile(new URL('../src/apps/recovery/model.ts', import.meta.url), 'utf8');
const store = await readFile(new URL('../src/apps/recovery/store.ts', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/apps/recovery/RecoveryApp.vue', import.meta.url), 'utf8');
const builtins = await readFile(new URL('../src/apps/builtin.ts', import.meta.url), 'utf8');
const scenarios = await readFile(new URL('../src/testing/visual/recoveryScenarios.ts', import.meta.url), 'utf8');
const combined = `${api}\n${store}\n${app}`;

assert.match(api, /\/api\/backups\/chat\/get/);
assert.match(api, /\/api\/backups\/chat\/download/);
assert.match(api, /\/api\/backups\/chat\/delete/);
assert.match(api, /\/api\/settings\/get-snapshots/);
assert.match(api, /\/api\/settings\/load-snapshot/);
assert.match(api, /\/api\/settings\/make-snapshot/);
assert.match(api, /\/api\/settings\/restore-snapshot/);
assert.match(api, /\/api\/data-maid\/report/);
assert.match(api, /\/api\/data-maid\/delete/);
assert.match(api, /importCharacterChat\(formData, \{ refresh: false \}\)/);
assert.match(api, /new File\(\[blob\]/);
assert.doesNotMatch(combined, /\/api\/chats\/save/);
assert.doesNotMatch(combined, /createChatMessages|setChatMessages|deleteCharacterChat|closeCurrentChat/);
assert.doesNotMatch(combined, /\/api\/chats\/(?:delete|save)/);
assert.doesNotMatch(combined, /localStorage|extension_settings/);
assert.match(model, /createSingleFlight/);
assert.match(model, /备份第 \$\{index \+ 1\} 行无法解析/);
assert.match(store, /loaded\.blob/);
assert.match(store, /loaded\.messageCountMismatch/);
assert.match(store, /目标角色卡在确认后发生变化/);
assert.match(store, /这份备份只有 metadata/);
assert.match(store, /Native import already succeeded/);
assert.match(store, /scanCleanup/);
assert.match(store, /deleteCleanupCandidates/);
assert.match(store, /scanDuplicateBackups/);
assert.match(store, /deleteDuplicateBackups/);
assert.match(store, /crypto\.subtle\.digest\('SHA-256'/);
assert.match(store, /预定保留的备份内容已经变化/);
assert.match(store, /await deleteNativeChatBackup\(current\)/);
assert.match(store, /scanDuplicateSettingsSnapshots/);
assert.match(store, /deleteSettingsSnapshots/);
assert.match(store, /deleteSettingsSnapshot/);
assert.match(store, /酒馆没有删除这份设置快照/);
assert.match(store, /预定保留的设置快照内容已经变化/);
assert.match(app, /将作为一份新聊天导入，不覆盖当前聊天/);
assert.match(app, /实际楼层数小于或等于/);
assert.match(app, /永久删除备份/);
assert.match(app, /只匹配同一角色分组内原始 JSONL 字节长度和 SHA-256 都完全一致/);
assert.match(app, /每组固定保留备份时间最新的一份/);
assert.match(app, /酒馆备份管理/);
assert.match(app, /聊天备份/);
assert.match(app, /设置快照/);
assert.doesNotMatch(app, /settings-reader|设置快照只读预览/);
assert.match(app, /confirmDeleteSettingsSnapshot/);
assert.match(app, /pc-recovery-settings-row/);
assert.match(app, /恢复会用这份快照覆盖酒馆当前 settings\.json/);
assert.match(builtins, /RecoveryModule/);
for (const scenario of [
  'recovery-shelf',
  'recovery-group',
  'recovery-cleanup',
  'recovery-duplicates',
  'recovery-reader',
  'recovery-confirm',
  'recovery-result',
  'recovery-settings',
]) {
  assert.match(scenarios, new RegExp(scenario));
}

console.log('Chat recovery safety safeguards are present.');
