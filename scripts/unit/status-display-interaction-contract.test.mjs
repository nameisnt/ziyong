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

test('MVU status templates stay interactive while regex output remains safe', () => {
  assert.match(viewer, /:security-mode="activeScheme\.source === 'mvu' \? 'trusted' : 'safe'"/u);
  assert.match(viewer, /:mvu-data="mvuSnapshot"/u);
  assert.match(settings, /:content="editorPreviewHtml"[\s\S]*?security-mode="trusted"/u);
  assert.match(settings, /:mvu-data="editorMvuData"/u);
  assert.match(frontend, /window\.getLatestMvuData = \(\) => data/u);
  assert.match(frontend, /window\.getLatestMvuStatData = \(\) => statData/u);
  assert.match(frontend, /window\.Mvu = \{ getMvuData: \(\) => data \}/u);
  assert.match(frontend, /window\.MVU = \{ data: \(\) => data, stat: \(\) => statData \}/u);
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
