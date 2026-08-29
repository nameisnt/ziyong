/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [settingsType, settingsPanel, home, scenarios] = await Promise.all([
  readFile(new URL('../../src/type/settings.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../src/apps/settings/SettingsInterfacePanel.vue', import.meta.url), 'utf8'),
  readFile(new URL('../../src/components/PhoneHome.vue', import.meta.url), 'utf8'),
  readFile(new URL('../../src/testing/visual/settingsScenarios.ts', import.meta.url), 'utf8'),
]);

test('home App labels default to visible and are controlled from interface settings', () => {
  assert.match(settingsType, /showHomeAppLabels:\s*z\.boolean\(\)\.default\(true\)/u);
  assert.match(settingsPanel, /v-model="settings\.showHomeAppLabels"/u);
  assert.match(settingsPanel, /aria-label="显示 App 名称"/u);
});

test('hidden home labels compact both App grids while preserving accessible names', () => {
  assert.match(home, /'labels-hidden':\s*!settings\.showHomeAppLabels/u);
  assert.ok((home.match(/:aria-label=/gu) || []).length >= 2);
  assert.ok((home.match(/v-if="settings\.showHomeAppLabels"/gu) || []).length >= 2);
  assert.match(home, /\.pc-home\.labels-hidden \.pc-app-tile/u);
  assert.match(home, /\.pc-home\.labels-hidden \.pc-dock-tile \.pc-app-icon/u);
});

test('App label visibility has real light and dark browser scenarios', () => {
  assert.match(scenarios, /'settings-interface-app-labels'/u);
  assert.match(scenarios, /'settings-interface-app-labels-dark'/u);
  assert.match(scenarios, /toggle\.click\(\)/u);
  assert.match(scenarios, /snapshot\?\.showHomeAppLabels !== false/u);
  assert.match(scenarios, /settings\.rehydrateFromSettings\(\)/u);
  assert.match(scenarios, /Hidden App labels removed the accessible App name/u);
});
