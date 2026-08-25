/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { scanVueUiContracts } from '../ui-contract-check.mjs';

const files = [
  'src/apps/recovery/RecoveryApp.vue',
  'src/apps/recovery/RecoveryMaintenanceFlow.vue',
  'src/apps/recovery/RecoveryReadImportFlow.vue',
  'src/apps/recovery/RecoverySettingsFlow.vue',
];
const sources = await Promise.all(
  files.map(file => readFile(new URL(`../../${file}`, import.meta.url), 'utf8').then(source => ({ file, source }))),
);

test('every recovery icon button has the same accessible name as its title', () => {
  const nameFindings = sources.flatMap(({ file, source }) =>
    scanVueUiContracts(source, file).filter(finding => finding.ruleId === 'icon-button-aria-label'),
  );
  assert.deepEqual(nameFindings, []);

  const iconButtons = sources.flatMap(({ source }) =>
    [...source.matchAll(/<button\b[\s\S]*?>/g)]
      .map(match => match[0])
      .filter(tag => /\bclass="[^"]*\bpc-icon-btn\b[^"]*"/.test(tag)),
  );
  assert.equal(iconButtons.length, 7);

  for (const tag of iconButtons) {
    const title = tag.match(/\s(:?)title="([^"]+)"/);
    const ariaLabel = tag.match(/\s(:?)aria-label="([^"]+)"/);
    assert.ok(title, `missing title in ${tag}`);
    assert.ok(ariaLabel, `missing aria-label in ${tag}`);
    assert.deepEqual(ariaLabel.slice(1), title.slice(1));
  }
});
