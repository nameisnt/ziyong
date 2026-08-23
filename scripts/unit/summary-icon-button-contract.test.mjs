/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { scanVueUiContracts } from '../ui-contract-check.mjs';

const components = [
  {
    file: 'src/apps/summary/SummaryBookPage.vue',
    url: new URL('../../src/apps/summary/SummaryBookPage.vue', import.meta.url),
    count: 2,
  },
  {
    file: 'src/apps/summary/SummaryImportPage.vue',
    url: new URL('../../src/apps/summary/SummaryImportPage.vue', import.meta.url),
    count: 1,
  },
];

test('every Summary icon button has the same accessible name as its title', async () => {
  const sources = await Promise.all(
    components.map(async component => ({ component, source: await readFile(component.url, 'utf8') })),
  );
  const nameFindings = sources.flatMap(({ component, source }) =>
    scanVueUiContracts(source, component.file).filter(finding => finding.ruleId === 'icon-button-aria-label'),
  );
  assert.deepEqual(nameFindings, []);

  for (const { component, source } of sources) {
    const iconButtons = [...source.matchAll(/<button\b(?:[^>"']|"[^"]*"|'[^']*')*>/g)]
      .map(match => match[0])
      .filter(tag => /\bclass="[^"]*\bpc-icon-btn\b[^"]*"/.test(tag));
    assert.equal(iconButtons.length, component.count, component.file);

    for (const tag of iconButtons) {
      const title = tag.match(/\s(:?)title="([^"]+)"/);
      const ariaLabel = tag.match(/\s(:?)aria-label="([^"]+)"/);
      assert.ok(title, `missing title in ${component.file}: ${tag}`);
      assert.ok(ariaLabel, `missing aria-label in ${component.file}: ${tag}`);
      assert.deepEqual(ariaLabel.slice(1), title.slice(1), component.file);
    }
  }
});
