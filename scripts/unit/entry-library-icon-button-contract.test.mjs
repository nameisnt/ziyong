/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { scanVueUiContracts } from '../ui-contract-check.mjs';

const expectedCounts = new Map([
  ['EntryLibraryBindingsPage.vue', 2],
  ['EntryLibraryCatalogPage.vue', 4],
  ['EntryLibraryDedupePage.vue', 1],
]);
const sources = await Promise.all(
  [...expectedCounts].map(async ([name, expectedCount]) => ({
    expectedCount,
    file: `src/apps/entry-library/pages/${name}`,
    source: await readFile(new URL(`../../src/apps/entry-library/pages/${name}`, import.meta.url), 'utf8'),
  })),
);

test('every entry library icon button has the same accessible name as its title', () => {
  const nameFindings = sources.flatMap(({ file, source }) =>
    scanVueUiContracts(source, file).filter(finding => finding.ruleId === 'icon-button-aria-label'),
  );
  assert.deepEqual(nameFindings, []);

  for (const { expectedCount, file, source } of sources) {
    const iconButtons = [...source.matchAll(/<button\b[\s\S]*?>/g)]
      .map(match => match[0])
      .filter(tag => /(?:\bclass|:class)="[^"]*\bpc-icon-btn\b[^"]*"/.test(tag));
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
