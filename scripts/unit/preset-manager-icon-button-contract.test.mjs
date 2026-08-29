/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { scanVueUiContracts } from '../ui-contract-check.mjs';

const expectedCounts = new Map([
  ['pages/PresetCatalogPage.vue', 7],
  ['pages/PresetPromptEditorPage.vue', 1],
  ['PresetPromptRow.vue', 2],
]);
const sourceFiles = [...expectedCounts.keys(), 'pages/PresetDetailPage.vue'];
const sources = await Promise.all(
  sourceFiles.map(async name => ({
    expectedCount: expectedCounts.get(name),
    file: `src/apps/preset-manager/${name}`,
    source: await readFile(new URL(`../../src/apps/preset-manager/${name}`, import.meta.url), 'utf8'),
  })),
);

test('every preset manager icon button has the same accessible name as its title', () => {
  const nameFindings = sources.flatMap(({ file, source }) =>
    scanVueUiContracts(source, file).filter(finding => finding.ruleId === 'icon-button-aria-label'),
  );
  assert.deepEqual(nameFindings, []);

  for (const { expectedCount, file, source } of sources) {
    const iconButtons = [...source.matchAll(/<button\b[\s\S]*?>/g)]
      .map(match => match[0])
      .filter(tag => /(?:\bclass|:class)="[^"]*\bpc-icon-btn\b[^"]*"/.test(tag));
    if (expectedCount !== undefined) {
      assert.equal(iconButtons.length, expectedCount, file);
    }

    for (const tag of iconButtons) {
      const title = tag.match(/\s(:?)title="([^"]+)"/);
      const ariaLabel = tag.match(/\s(:?)aria-label="([^"]+)"/);
      assert.ok(title, `missing title in ${file}: ${tag}`);
      assert.ok(ariaLabel, `missing aria-label in ${file}: ${tag}`);
      assert.deepEqual(ariaLabel.slice(1), title.slice(1), file);
    }
  }
});

test('preset detail icon actions remain discoverable', () => {
  const detail = sources.find(({ file }) => file.endsWith('pages/PresetDetailPage.vue'));
  assert.ok(detail);

  for (const label of ['使用这个预设', '新建条目分组', '关闭', '分组改名', '删除分组']) {
    assert.match(detail.source, new RegExp(`aria-label="${label}"`), `missing preset detail action: ${label}`);
  }
});
