/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const viewer = await readFile(new URL('../../src/apps/status-display/StatusDisplayApp.vue', import.meta.url), 'utf8');
const settings = await readFile(
  new URL('../../src/apps/status-display/StatusDisplaySettingsApp.vue', import.meta.url),
  'utf8',
);
const viewerModule = await readFile(new URL('../../src/apps/status-display/index.ts', import.meta.url), 'utf8');
const settingsModule = await readFile(
  new URL('../../src/apps/status-display-settings/index.ts', import.meta.url),
  'utf8',
);
const frontend = await readFile(new URL('../../src/util/theaterFrontend.ts', import.meta.url), 'utf8');
const frontendFrame = await readFile(new URL('../../src/components/FrontendFrame.vue', import.meta.url), 'utf8');

test('MVU status templates stay interactive while regex output remains safe', () => {
  assert.match(viewer, /:security-mode="activeScheme\.source === 'mvu' \? 'trusted' : 'safe'"/u);
  assert.match(viewer, /:host-bridge="activeScheme\.source === 'mvu'"/u);
  assert.match(viewer, /flush-content[\s\S]*?frameless/u);
  assert.match(settings, /:content="editorPreviewHtml"[\s\S]*?security-mode="trusted"/u);
  assert.match(settings, /flush-content[\s\S]*?host-bridge/u);
  assert.match(frontend, /window\.TavernHelper = helper/u);
  assert.match(frontend, /window\[name\] = helper\[name\]\.bind\(helper\)/u);
  assert.match(frontend, /window\.Mvu = parentWin\.__th_ufb_bridge__\?\.Mvu \|\| parentWin\.Mvu/u);
  assert.match(frontendFrame, /'allow-scripts allow-same-origin' : 'allow-scripts'/u);
  assert.doesNotMatch(viewer, /mvu-data|mvuSnapshot/u);
});

test('status viewer and settings are separate apps with one configuration owner', () => {
  assert.match(viewer, /pushRoute\('status-display-settings', 'root', '状态栏设置'\)/u);
  assert.doesNotMatch(viewer, /SearchableCombobox|createScheme|deleteScheme/u);
  assert.match(settings, /SearchableCombobox/u);
  assert.match(settings, /function createScheme\(/u);
  assert.match(settings, /function deleteScheme\(/u);
  assert.doesNotMatch(viewerModule, /backupDomains|registerRegexTargetProvider/u);
  assert.match(settingsModule, /backupDomains/u);
  assert.match(settingsModule, /registerRegexTargetProvider/u);
});
