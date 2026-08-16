/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { scanVueUiContracts } from '../ui-contract-check.mjs';

const components = [
  {
    file: 'src/apps/tutorial/TutorialApp.vue',
    url: new URL('../../src/apps/tutorial/TutorialApp.vue', import.meta.url),
  },
  {
    file: 'src/apps/tutorial/TutorialAppDirectory.vue',
    url: new URL('../../src/apps/tutorial/TutorialAppDirectory.vue', import.meta.url),
  },
];

test('every Tutorial icon button has the same accessible name as its title', async () => {
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
    assert.equal(iconButtons.length, 1, component.file);

    const title = iconButtons[0].match(/\s(:?)title="([^"]+)"/);
    const ariaLabel = iconButtons[0].match(/\s(:?)aria-label="([^"]+)"/);
    assert.ok(title, `missing title in ${component.file}: ${iconButtons[0]}`);
    assert.ok(ariaLabel, `missing aria-label in ${component.file}: ${iconButtons[0]}`);
    assert.deepEqual(ariaLabel.slice(1), title.slice(1), component.file);
  }
});
