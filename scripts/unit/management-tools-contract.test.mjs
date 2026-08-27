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
  assert.match(scriptApi, /moveAssistantScriptsToFolder/u);
  assert.match(scriptApi, /createAssistantScriptFolder/u);
  assert.match(scriptApi, /renameAssistantScriptFolder/u);
  assert.match(scriptModel, /groupScriptTrees/u);
  assert.match(scriptApp, /<BulkSelectionBar/u);
  assert.match(scriptApp, /v-for="group in section\.groups"/u);
  assert.doesNotMatch(scriptApp, /<small>\{\{ item\.folder/u);
  assert.match(scriptApp, /phone\.confirmNotice/u);
});

test('assistant script manager round-trips all scoped trees through the plugin bundle', () => {
  assert.match(scriptApi, /script_trees: readAllScriptTrees\(\)/u);
  assert.match(scriptApi, /getOptionalGlobalFunction<ReplaceScriptTrees>\('replaceScriptTrees'\)/u);
  assert.match(scriptApi, /replaceTrees\(trees, \{ type: scope\.id \}\)/u);
  assert.match(scriptApi, /importAssistantScriptBundle/u);
  assert.match(scriptApp, /importAssistantScriptFile/u);
  assert.match(scriptApi, /prepareImportedTree/u);
  assert.match(scriptApi, /structuredClone\(folder\)/u);
  assert.match(scriptApp, /酒馆助手脚本文件夹-/u);
  assert.match(scriptApp, /导出全部/u);
});

test('extension transfer parses legacy scope and previews each installation scope', () => {
  assert.match(extensionModel, /item\.scope \?\? \(item\.global \? 'global' : 'local'\)/u);
  assert.match(extensionApp, /v-model="row\.scope"/u);
  assert.match(extensionApp, /parseExtensionManifest/u);
});

test('extension installation and updates retain scope and refresh the list once after each batch', () => {
  assert.match(extensionApi, /global: item\.scope === 'global'/u);
  assert.doesNotMatch(extensionApi, /downgrade|重试|tryInstall\(false\)/u);
  assert.match(extensionApp, /phone\.confirmNotice/u);
  assert.match(
    extensionApp,
    /for \(const row of rows\) await updateThirdPartyExtension\(row\);[\s\S]*await refreshInstalled\(\)/u,
  );
  assert.match(extensionApp, /await runInstallWorkers\(rows\);[\s\S]*await refreshInstalled\(\)/u);
  assert.match(extensionApp, /sillytavern_phone_extension_metadata/u);
  assert.doesNotMatch(extensionApp, /location\.reload\(\)/u);
});
