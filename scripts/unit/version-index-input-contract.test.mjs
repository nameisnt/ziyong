/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const componentSource = await readFile(new URL('../../src/components/VersionNavigator.vue', import.meta.url), 'utf8');
const globalSource = await readFile(new URL('../../src/global.css', import.meta.url), 'utf8');
const catalogSource = await readFile(new URL('../../src/testing/visual/scenarioCatalog.ts', import.meta.url), 'utf8');
const harnessSource = await readFile(new URL('../../src/testing/visual-harness.ts', import.meta.url), 'utf8');

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

test('version navigator uses a shared fixed index input without redrawing pc-field locally', () => {
  const failures = [];
  const semanticRules = rulesFor(globalSource, '.pc-phone-root .pc-field.pc-version-index-input');
  if (semanticRules.length !== 1) {
    failures.push(`expected one global version-index semantic rule, found ${semanticRules.length}`);
  } else {
    assert.deepEqual(declarationsFor(semanticRules[0]), {
      height: '42px',
      'line-height': '40px',
      'min-height': '42px',
      padding: '0 8px',
      'text-align': 'center',
      width: '42px',
    });
  }

  if (!/class="[^"]*pc-field[^"]*pc-version-index-input[^"]*"/.test(componentSource)) {
    failures.push('version index input does not use pc-version-index-input beside pc-field');
  }
  if (rulesFor(componentSource, '.pc-version-status .pc-field').length) {
    failures.push('VersionNavigator still redraws the protected pc-field in scoped CSS');
  }

  for (const behavior of [
    'v-model="requestedIndex"',
    'type="number"',
    'inputmode="numeric"',
    ':max="versions.length"',
    '@blur="commitRequestedIndex"',
    '@keydown.enter.prevent="commitRequestedIndex"',
  ]) {
    if (!componentSource.includes(behavior)) failures.push(`version-index behavior contract is missing: ${behavior}`);
  }

  if (!catalogSource.includes("'version-navigator-stepper'")) failures.push('isolated version-stepper scenario is not registered');
  if (!harnessSource.includes("name === 'version-navigator-stepper'")) failures.push('isolated version-stepper scenario has no harness branch');

  assert.deepEqual(failures, []);
});
