/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { scanVueUiContracts } from '../ui-contract-check.mjs';

const files = [
  { path: 'src/apps/card-writer/CardWriterApp.vue', iconButtons: 2 },
  { path: 'src/apps/card-writer/CardWriterLibraryPage.vue', iconButtons: 4 },
];

for (const { iconButtons: expected, path } of files) {
  const source = await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

  test(`every Card Writer icon button in ${path} has the same accessible name as its title`, () => {
    const nameFindings = scanVueUiContracts(source, path).filter(finding => finding.ruleId === 'icon-button-aria-label');
    assert.deepEqual(nameFindings, []);

    const iconButtons = [...source.matchAll(/<button\b[\s\S]*?>/g)]
      .map(match => match[0])
      .filter(tag => /\bclass="[^"]*\bpc-icon-btn\b[^"]*"/.test(tag));
    assert.equal(iconButtons.length, expected, path);

    for (const tag of iconButtons) {
      const title = tag.match(/\s(:?)title="([^"]+)"/);
      const ariaLabel = tag.match(/\s(:?)aria-label="([^"]+)"/);
      assert.ok(title, `missing title in ${path}: ${tag}`);
      assert.ok(ariaLabel, `missing aria-label in ${path}: ${tag}`);
      assert.deepEqual(ariaLabel.slice(1), title.slice(1), path);
    }
  });
}
