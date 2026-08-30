/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const scriptApi = await readFile(new URL('../../src/apps/script-manager/api.ts', import.meta.url), 'utf8');
const scriptApp = await readFile(new URL('../../src/apps/script-manager/ScriptManagerApp.vue', import.meta.url), 'utf8');
const regexStore = await readFile(new URL('../../src/apps/regex-display/store.ts', import.meta.url), 'utf8');
const regexApp = await readFile(new URL('../../src/apps/regex-display/RegexDisplayApp.vue', import.meta.url), 'utf8');
const workbenchApp = await readFile(new URL('../../src/apps/workbench/WorkbenchApp.vue', import.meta.url), 'utf8');

test('assistant script folders and scripts expose direct enabled mutations', () => {
  assert.match(scriptApi, /export function setAssistantScriptFolderEnabled/u);
  assert.match(scriptApi, /export function setAssistantScriptEnabled/u);
  assert.match(scriptApp, /@change="toggleFolderEnabled\(group, \$event\)"/u);
  assert.match(scriptApp, /@change="toggleScriptEnabled\(item, \$event\)"/u);
  assert.match(scriptApp, /class="pc-toggle"/u);
});

test('regex rules expose their enabled state in the directory', () => {
  assert.match(regexStore, /function setRuleEnabled\(ruleId: string, enabled: boolean\)/u);
  assert.match(regexStore, /setRuleEnabled,/u);
  assert.match(regexApp, /@change="toggleRuleEnabled\(rule\.id, \$event\)"/u);
});

test('workflows expose one direct header toggle without a duplicate expanded toggle', () => {
  assert.match(workbenchApp, /@change="toggleWorkflowEnabled\(workflow\.id, \$event\)"/u);
  assert.doesNotMatch(workbenchApp, /t`启用自动触发`/u);
  assert.doesNotMatch(workbenchApp, /workflow\.enabled \? t`自动触发` : t`已停用`/u);
});
