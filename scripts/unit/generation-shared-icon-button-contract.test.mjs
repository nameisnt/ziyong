/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { scanVueUiContracts } from '../ui-contract-check.mjs';

const expectedCounts = new Map([
  ['GenerationPanel.vue', 2],
  ['GenerationProviderFields.vue', 1],
  ['GenerationTaskCenter.vue', 6],
]);
const sources = await Promise.all(
  [...expectedCounts].map(async ([name, expectedCount]) => ({
    expectedCount,
    file: `src/components/${name}`,
    source: await readFile(new URL(`../../src/components/${name}`, import.meta.url), 'utf8'),
  })),
);

test('every shared generation icon button has the same accessible name as its title', () => {
  const nameFindings = sources.flatMap(({ file, source }) =>
    scanVueUiContracts(source, file).filter(finding => finding.ruleId === 'icon-button-aria-label'),
  );
  assert.deepEqual(nameFindings, []);

  for (const { expectedCount, file, source } of sources) {
    const iconButtons = [...source.matchAll(/<button\b[\s\S]*?>/g)]
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

test('preset refresh belongs to the preset field heading and gives visible feedback', () => {
  const provider = sources.find(item => item.file.endsWith('GenerationProviderFields.vue'))?.source || '';
  assert.match(
    provider,
    /class="pc-field-head"[\s\S]*<label class="pc-field-label">本次预设<\/label>[\s\S]*@click="handleRefreshPresetNames"/u,
  );
  assert.doesNotMatch(provider, /pc-preset-select-row/u);
  assert.match(provider, /refreshingPresetNames/u);
  assert.match(provider, /toastr\.success\(`预设列表已刷新，共 \$\{[^}]+\} 个预设`\)/u);
});
