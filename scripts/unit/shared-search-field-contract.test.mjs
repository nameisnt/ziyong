/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const targets = [
  {
    file: '../../src/apps/app-builder/AppBuilderApp.vue',
    wrapper: 'pc-search-wrap',
  },
  {
    file: '../../src/apps/entry-library/pages/EntryLibraryCollectPage.vue',
    wrapper: 'pc-entry-library-search',
  },
  {
    file: '../../src/apps/tutorial/TutorialApp.vue',
    wrapper: 'pc-tutorial-search',
  },
  {
    file: '../../src/apps/tutorial/TutorialAppDirectory.vue',
    wrapper: 'pc-tutorial-directory-search',
  },
];

function rulesFor(source, selector) {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(match =>
    match[1].split(',').some(item => item.trim() === selector),
  );
}

test('search inputs reuse the shared search field instead of redrawing pc-field', async () => {
  const failures = [];

  for (const target of targets) {
    const source = await readFile(new URL(target.file, import.meta.url), 'utf8');
    const label = target.file.split('/').at(-1);
    const wrapperPattern = new RegExp(
      `class="[^"]*pc-search-field[^"]*${target.wrapper}|class="[^"]*${target.wrapper}[^"]*pc-search-field`,
    );

    if (!wrapperPattern.test(source)) failures.push(`${label} does not reuse pc-search-field on ${target.wrapper}`);
    if (
      new RegExp(
        `<input[^>]*class="[^"]*pc-field[^"]*"[^>]*type="search"|<input[^>]*type="search"[^>]*class="[^"]*pc-field`,
      ).test(source)
    ) {
      failures.push(`${label} still applies pc-field to its shared search input`);
    }

    for (const selector of [`.${target.wrapper}`, `.${target.wrapper} > i`, `.${target.wrapper} .pc-field`]) {
      if (rulesFor(source, selector).length) failures.push(`${label} still keeps the local search rule ${selector}`);
    }
  }

  assert.deepEqual(failures, []);
});
