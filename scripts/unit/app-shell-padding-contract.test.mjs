/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const rootPages = [
  ['macro builder', '../../src/apps/macro-builder/MacroBuilderApp.vue', /\.pc-macro-builder-app\s*\{[^}]*padding:/su],
  [
    'script manager',
    '../../src/apps/script-manager/ScriptManagerApp.vue',
    /\.pc-script-manager-app\s*\{[^}]*padding:/su,
  ],
  [
    'extension transfer',
    '../../src/apps/extension-transfer/ExtensionTransferApp.vue',
    /\.pc-extension-transfer-app\s*\{[^}]*padding:/su,
  ],
  ['tutorial', '../../src/apps/tutorial/TutorialApp.vue', /\.pc-tutorial-page\s*\{[^}]*padding:/su],
  ['regex wizard', '../../src/apps/regex-wizard/RegexWizardApp.vue', /\.pc-regex-wizard-app\s*\{[^}]*padding:/su],
  [
    'status display settings',
    '../../src/apps/status-display/StatusDisplaySettingsApp.vue',
    /\.pc-status-settings-page[^}]*\{[^}]*padding:/su,
  ],
];

test('apps inside the shared phone screen do not add a second root padding', async () => {
  for (const [label, path, pattern] of rootPages) {
    const source = await readFile(new URL(path, import.meta.url), 'utf8');
    assert.doesNotMatch(source, pattern, label);
  }
});
