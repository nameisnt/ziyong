/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { scanVueUiContracts } from '../ui-contract-check.mjs';

const files = [
  ['src/apps/settings/SettingsConnectionPanel.vue', 2],
  ['src/apps/settings/SettingsExternalApiPage.vue', 2],
  ['src/apps/settings/SettingsGenerationPanel.vue', 3],
];

test('every Settings generation and connection icon button has the same accessible name as its title', async () => {
  for (const [file, expectedCount] of files) {
    const source = await readFile(new URL(`../../${file}`, import.meta.url), 'utf8');
    const nameFindings = scanVueUiContracts(source, file).filter(
      finding => finding.ruleId === 'icon-button-aria-label',
    );
    assert.deepEqual(nameFindings, []);

    const iconButtons = [...source.matchAll(/<button\b(?:[^>"']|"[^"]*"|'[^']*')*>/g)]
      .map(match => match[0])
      .filter(tag => /\bclass="[^"]*\bpc-icon-btn\b[^"]*"/.test(tag));
    assert.equal(iconButtons.length, expectedCount, file);

    for (const tag of iconButtons) {
      const title = tag.match(/\s(:?)title="([^"]+)"/);
      const ariaLabel = tag.match(/\s(:?)aria-label="([^"]+)"/);
      assert.ok(title, `missing title in ${file}: ${tag}`);
      assert.ok(ariaLabel, `missing aria-label in ${file}: ${tag}`);
      assert.deepEqual(ariaLabel.slice(1), title.slice(1), file);
    }
  }
});
