/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import test from 'node:test';
import { access, readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const manager = await readFile(new URL('src/apps/preset-manager/PresetManagerApp.vue', root), 'utf8');
const detail = await readFile(new URL('src/apps/preset-manager/pages/PresetDetailPage.vue', root), 'utf8');
const editor = await readFile(new URL('src/apps/preset-manager/pages/PresetPromptEditorPage.vue', root), 'utf8');
const api = await readFile(new URL('src/apps/preset-manager/api.ts', root), 'utf8');
const managerIndex = await readFile(new URL('src/apps/preset-manager/index.ts', root), 'utf8');
const layout = await readFile(new URL('src/core/appLayout.ts', root), 'utf8');

test('preset management is the single owner of chat binding and reader-rule controls', async () => {
  assert.match(detail, /PresetOwnershipPanel/u);
  assert.match(detail, /v-if="[^"]*!pluginPreset"/u);
  assert.match(managerIndex, /key: 'preset-link'/u);
  assert.match(managerIndex, /scopeSwitchHandler:/u);
  assert.doesNotMatch(layout, /'preset-link'/u);
  await assert.rejects(access(new URL('src/apps/preset-link/index.ts', root)));
  await assert.rejects(access(new URL('src/apps/preset-link/PresetLinkApp.vue', root)));
});

test('saved preset prompts edit name, role, enabled state, and content through existing mutation paths', () => {
  assert.match(manager, /v-model:role-draft="editorRoleDraft"/u);
  assert.match(manager, /editorRoleDraft\.value !== activePrompt\.value\.role/u);
  assert.match(manager, /role: editorRoleDraft\.value/u);
  assert.match(editor, /class="pc-select"/u);
  assert.match(editor, /<option value="system">系统消息<\/option>/u);
  assert.match(editor, /<option value="assistant">AI 消息<\/option>/u);
  assert.match(editor, /<option value="user">用户消息<\/option>/u);
  assert.match(api, /Partial<Pick<TavernPresetPrompt, 'content' \| 'enabled' \| 'name' \| 'role'>>/u);
});
