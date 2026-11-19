/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const catalogSource = await readFile(new URL('../../src/components/CatalogModal.vue', import.meta.url), 'utf8');
const readerShellSource = await readFile(
  new URL('../../src/components/ReaderDetailShell.vue', import.meta.url),
  'utf8',
);

test('opening the catalog modal does not scroll the reading position behind it', () => {
  const failures = [];

  if (catalogSource.includes('.scrollIntoView(')) {
    failures.push(
      'CatalogModal still uses scrollIntoView, which also scrolls scrollable ancestors such as the reader body',
    );
  }
  const scrollStart = catalogSource.indexOf('function scrollActiveIntoView');
  const scrollEnd = scrollStart < 0 ? -1 : catalogSource.indexOf('\n}', scrollStart);
  const scrollBody = scrollStart < 0 || scrollEnd < 0 ? '' : catalogSource.slice(scrollStart, scrollEnd);
  if (!scrollBody.includes('list.scrollTop +=')) {
    failures.push('CatalogModal should center the active item by changing only its own list scroll');
  }

  const catalogCaseStart = readerShellSource.indexOf("case 'catalog':");
  if (catalogCaseStart < 0) {
    failures.push("ReaderDetailShell is missing the footer 'catalog' action");
  } else {
    const catalogCase = readerShellSource.slice(catalogCaseStart);
    const catalogCaseBody = catalogCase.slice(0, catalogCase.indexOf('break;'));
    if (catalogCaseBody.includes('scrollContentToTop')) {
      failures.push('ReaderDetailShell catalog action still resets the reading position to the top');
    }
    if (!catalogCaseBody.includes("emit('catalog')")) {
      failures.push('ReaderDetailShell catalog action no longer opens the catalog');
    }
  }

  assert.deepEqual(failures, []);
});
