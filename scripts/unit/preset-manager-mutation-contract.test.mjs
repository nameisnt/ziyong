/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../src/apps/preset-manager/api.ts', import.meta.url), 'utf8');
const appSource = await readFile(
  new URL('../../src/apps/preset-manager/PresetManagerApp.vue', import.meta.url),
  'utf8',
);

test('opening a Tavern preset clears stale plugin route identity', () => {
  const openStart = appSource.indexOf('function openPreset(presetName: string)');
  const openEnd = appSource.indexOf('\nfunction openPluginPreset', openStart);
  const openSource = appSource.slice(openStart, openEnd);

  assert.match(openSource, /presetId:\s*''/u);
  assert.match(openSource, /presetSource:\s*'tavern'/u);
});

test('preset catalog places the current Tavern preset first without mutating source order', () => {
  const visibleStart = appSource.indexOf('const visiblePresetNames = computed');
  const visibleEnd = appSource.indexOf('\nconst editorDirty', visibleStart);
  const visibleSource = appSource.slice(visibleStart, visibleEnd);

  assert.match(visibleSource, /names\.indexOf\(loadedPresetName\.value\)/u);
  assert.match(visibleSource, /\.\.\.presetNames\.value/u);
  assert.match(visibleSource, /names\.slice\(0, currentIndex\)/u);
});

test('preset detail keeps group expansion state per preset while nested prompt pages reload', () => {
  assert.match(appSource, /collapsedGroupsByPreset = new Map<string, Map<string, boolean>>/u);
  assert.match(appSource, /saved\?\.get\(node\.group\.id\) \?\? node\.group\.collapsed/u);
  assert.match(appSource, /saved\.set\(groupId, next\.has\(groupId\)\)/u);
});

test('renaming a Tavern preset is refused before any unsafe host mutation can select it', () => {
  const renameStart = source.indexOf('export async function renameTavernPreset');
  const deleteStart = source.indexOf('export async function deleteTavernPreset');
  const renameSource = source.slice(renameStart, deleteStart);

  assert.match(renameSource, /当前酒馆没有不切换预设、不导入正则的安全改名接口/u);
  assert.doesNotMatch(renameSource, /manager\?\.renamePreset/u);
  assert.doesNotMatch(renameSource, /await manager\.renamePreset/u);
  assert.doesNotMatch(renameSource, /await\s+(?:helper\.)?renamePreset\(sourceName, targetName\)/u);
  assert.doesNotMatch(renameSource, /savePreset/u);
  assert.doesNotMatch(renameSource, /loadTavernPreset|selectPreset/u);
  const handlerStart = appSource.indexOf('async function renamePreset()');
  const handlerEnd = appSource.indexOf('\nasync function removePreset()', handlerStart);
  const handlerSource = appSource.slice(handlerStart, handlerEnd);
  assert.match(handlerSource, /if \(!isPluginDetail\.value\)[\s\S]*插件已阻止本次操作[\s\S]*return;/u);
  assert.doesNotMatch(handlerSource, /renameTavernPreset\(/u);
});

test('deleting a non-current Tavern preset prefers the direct helper and still verifies the result', () => {
  const deleteStart = source.indexOf('export async function deleteTavernPreset');
  const nextFunction = source.indexOf('\nfunction patchPrompt', deleteStart);
  const deleteSource = source.slice(deleteStart, nextFunction);

  assert.match(deleteSource, /getTavernHelperPresetMutationApi\(\)/u);
  assert.match(deleteSource, /helper\?\.deletePreset\?\.bind\(helper\)/u);
  assert.doesNotMatch(deleteSource, /getOptionalGlobalFunction<DeletePresetFn>\('deletePreset'\)/u);
  assert.match(deleteSource, /await deletePreset\(name\)/u);
  assert.match(deleteSource, /listTavernPresets\(\)\.includes\(name\)/u);
  assert.match(deleteSource, /不能直接删除当前正在使用的预设/u);
});

test('preset migration compares serializable raw JSON on both owners instead of runtime editing views', () => {
  const helperStart = appSource.indexOf('function normalizePresetTransferPayload');
  const handlerStart = appSource.indexOf('async function movePreset()', helperStart);
  const helperSource = appSource.slice(helperStart, handlerStart);
  const handlerEnd = appSource.indexOf('\nasync function loadPreset()', handlerStart);
  const handlerSource = appSource.slice(handlerStart, handlerEnd);

  assert.notEqual(helperStart, -1);
  assert.match(helperSource, /pluginPresets\.getById\(presetId\)\?\.raw/u);
  assert.match(helperSource, /JSON\.parse\(JSON\.stringify\(value\)\)/u);
  assert.match(helperSource, /TAVERN_ZERO_NORMALIZED_SETTING_KEYS/u);
  assert.match(helperSource, /preset\.settings\?\.\[key\] === null/u);
  assert.match(helperSource, /preset\.settings\[key\] = 0/u);
  assert.match(helperSource, /readTavernPresetTransferPayload/u);
  assert.match(helperSource, /normalizePresetTransferPayload\(readTavernPreset\(presetName\), '酒馆'\)/u);
  assert.match(handlerSource, /readSource:\s*\(\) => readPluginPresetTransferPayload\(sourceId\)/u);
  assert.match(handlerSource, /readTarget:\s*\(\) => readPluginPresetTransferPayload\(targetId\)/u);
  assert.match(handlerSource, /readSource:\s*\(\) => readTavernPresetTransferPayload\(sourceName\)/u);
  assert.match(handlerSource, /readTarget:\s*\(\) => readTavernPresetTransferPayload\(targetName\)/u);
  assert.doesNotMatch(handlerSource, /read(?:Source|Target):\s*\(\) => pluginPresets\.readPreset/u);
  assert.doesNotMatch(handlerSource, /read(?:Source|Target):\s*\(\) => readTavernPreset\(/u);
});
