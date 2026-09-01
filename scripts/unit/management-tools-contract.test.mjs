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
  assert.match(scriptApi, /runScriptScopeTransaction\(snapshot =>/u);
  assert.match(scriptApi, /pruneScriptTrees\(snapshot\[scope\.id\], ids\)/u);
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
  assert.match(scriptApi, /replaceTrees\(snapshot\[scope\], \{ type: scope \}\)/u);
  assert.match(scriptApi, /new AggregateError\(\[error, \.\.\.rollbackErrors\]/u);
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
  assert.match(extensionApp, /notifyExtensionReloadRequired\('扩展更新完成'/u);
  assert.match(extensionApp, /if \(installedCount\) notifyExtensionReloadRequired\('扩展安装完成'/u);
  assert.match(extensionApp, /请手动刷新整个 SillyTavern 页面，让扩展重新加载/u);
  assert.match(extensionApp, /timeoutMs: 0/u);
  assert.doesNotMatch(extensionApp, /location\.reload\(\)/u);
});

test('extension transfer exposes update availability and opens details in a modal', () => {
  assert.match(extensionApi, /updateStatus: ExtensionUpdateStatus/u);
  assert.match(extensionApi, /version\.isUpToDate === false/u);
  assert.match(extensionApp, /可更新/u);
  assert.match(extensionApp, /已是最新/u);
  assert.match(extensionApp, /无法检查/u);
  assert.match(extensionApp, /pc-modal-backdrop pc-extension-detail-backdrop/u);
  assert.match(extensionApp, /role="dialog" aria-modal="true"/u);
});

test('extension transfer scrolls only the extension list and keeps batch actions outside it', () => {
  assert.ok((extensionApp.match(/class="pc-extension-list-viewport"/gu) || []).length >= 2);
  assert.match(extensionApp, /\.pc-extension-transfer-app\s*\{[\s\S]*grid-template-rows:\s*auto minmax\(0, 1fr\)/u);
  assert.match(extensionApp, /\.pc-extension-list-viewport\s*\{[\s\S]*overflow-y:\s*auto/u);
  assert.match(extensionApp, /\.pc-extension-detail-trigger\s*\{[\s\S]*text-overflow:\s*ellipsis/u);
  assert.match(extensionApp, /class="pc-extension-list-viewport"[\s\S]*?<div class="pc-form-actions">/u);
});
