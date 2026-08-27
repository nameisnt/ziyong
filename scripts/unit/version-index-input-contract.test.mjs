/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const componentSource = await readFile(new URL('../../src/components/VersionNavigator.vue', import.meta.url), 'utf8');
const catalogSource = await readFile(new URL('../../src/testing/visual/scenarioCatalog.ts', import.meta.url), 'utf8');
const harnessSource = await readFile(new URL('../../src/testing/visual-harness.ts', import.meta.url), 'utf8');

test('version navigator exposes compact previous and next actions with a current count', () => {
  const failures = [];
  for (const behavior of [
    'class="pc-icon-btn pc-version-step"',
    ':aria-label="t`上一个版本`"',
    ':aria-label="t`下一个版本`"',
    'class="pc-version-status"',
    'selectOffset(-1)',
    'selectOffset(1)',
  ]) {
    if (!componentSource.includes(behavior))
      failures.push(`version navigator behavior contract is missing: ${behavior}`);
  }

  if (componentSource.includes('type="number"')) failures.push('version navigator restored the removed numeric input');

  if (!catalogSource.includes("'version-navigator-stepper'"))
    failures.push('isolated version-stepper scenario is not registered');
  if (!harnessSource.includes("name === 'version-navigator-stepper'"))
    failures.push('isolated version-stepper scenario has no harness branch');

  assert.deepEqual(failures, []);
});
