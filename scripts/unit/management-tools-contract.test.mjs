/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const scriptModel = await readFile(new URL('../../src/apps/script-manager/model.ts', import.meta.url), 'utf8');
const scriptApi = await readFile(new URL('../../src/apps/script-manager/api.ts', import.meta.url), 'utf8');
const scriptApp = await readFile(
  new URL('../../src/apps/script-manager/ScriptManagerApp.vue', import.meta.url),
  'utf8',
);
const extensionModel = await readFile(new URL('../../src/apps/extension-transfer/model.ts', import.meta.url), 'utf8');
const extensionApi = await readFile(new URL('../../src/apps/extension-transfer/api.ts', import.meta.url), 'utf8');
const extensionApp = await readFile(
  new URL('../../src/apps/extension-transfer/ExtensionTransferApp.vue', import.meta.url),
  'utf8',
);

test('assistant script manager prunes scripts through the current scope tree and preserves folders', () => {
  assert.match(
    scriptModel,
    /result\.push\(\{ \.\.\.node, scripts: node\.scripts\.filter\(script => !ids\.has\(script\.id\)\) \}\)/u,
  );
  assert.match(scriptApi, /updateTrees\(trees => pruneScriptTrees\(trees, ids\), \{ type: scope\.id \}\)/u);
  assert.match(scriptApi, /getOptionalGlobalFunction<GetScriptTrees>\('getScriptTrees'\)/u);
  assert.match(scriptApi, /getOptionalGlobalFunction<UpdateScriptTrees>\('updateScriptTreesWith'\)/u);
  assert.doesNotMatch(scriptApi, /typeof getScriptTrees|typeof updateScriptTreesWith/u);
  assert.doesNotMatch(scriptApi, /replaceScriptTrees/u);
  assert.match(scriptApp, /<BulkSelectionBar/u);
  assert.match(scriptApp, /phone\.confirmNotice/u);
});

test('assistant script manager exports the current trees without adding an unsupported restore path', () => {
  assert.match(scriptApp, /script_trees: readAllScriptTrees\(\)/u);
  assert.match(scriptApp, /scripts: selected\.map/u);
  assert.doesNotMatch(scriptApp, /导入脚本|replaceScriptTrees/u);
});

test('extension transfer parses legacy scope and previews each installation scope', () => {
  assert.match(extensionModel, /item\.scope \?\? \(item\.global \? 'global' : 'local'\)/u);
  assert.match(extensionApp, /v-model="row\.scope"/u);
  assert.match(extensionApp, /parseExtensionManifest/u);
});

test('extension installation never downgrades global scope and only reloads on explicit action', () => {
  assert.match(extensionApi, /global: item\.scope === 'global'/u);
  assert.doesNotMatch(extensionApi, /downgrade|重试|tryInstall\(false\)/u);
  assert.match(extensionApp, /phone\.confirmNotice/u);
  assert.match(extensionApp, /@click="reloadTavern"/u);
  assert.match(extensionApp, /function reloadTavern\(\)[\s\S]*location\.reload\(\)/u);
  assert.doesNotMatch(extensionApp, /onActivated\(reloadTavern\)|reloadTavern\(\);/u);
  assert.equal(extensionApp.match(/location\.reload\(\)/gu)?.length, 1);
});
