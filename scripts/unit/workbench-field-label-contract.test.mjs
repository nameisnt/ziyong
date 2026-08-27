/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const componentSource = await readFile(new URL('../../src/apps/workbench/WorkbenchApp.vue', import.meta.url), 'utf8');
const globalSource = await readFile(new URL('../../src/global.css', import.meta.url), 'utf8');

function rulesFor(source, selector) {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(match => match[1].split(',').some(item => item.trim() === selector))
    .map(match => match[2]);
}

function declarationsFor(body) {
  return Object.fromEntries(
    [...body.matchAll(/(?:^|;)\s*([a-zA-Z-]+)\s*:\s*([^;{}]+)/g)].map(match => [match[1], match[2].trim()]),
  );
}

test('Workbench field labels inherit shared typography and keep only local spacing', () => {
  const failures = [];
  const localRules = rulesFor(componentSource, '.pc-field-group span');
  if (localRules.length !== 1) {
    failures.push(`expected one Workbench-only field label layout rule, found ${localRules.length}`);
  } else {
    assert.deepEqual(declarationsFor(localRules[0]), {
      display: 'block',
      'margin-bottom': '8px',
    });
  }

  const sharedRules = rulesFor(globalSource, '.pc-phone-root .pc-field-group > span');
  if (
    !sharedRules.some(body => {
      const declarations = declarationsFor(body);
      return (
        declarations.color === 'var(--pc-muted)' &&
        declarations['font-size'] === '12px' &&
        declarations['font-weight'] === '800'
      );
    })
  ) {
    failures.push('the shared direct-child field label typography contract is missing');
  }

  assert.deepEqual(failures, []);
});
