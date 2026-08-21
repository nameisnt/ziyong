/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const componentSource = await readFile(new URL('../../src/components/SearchableCombobox.vue', import.meta.url), 'utf8');
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

test('shared searchable options expose complete long labels and formal close/keyboard evidence', () => {
  const failures = [];
  const optionRules = rulesFor(componentSource, '.pc-combobox-option span');
  if (optionRules.length !== 1) {
    failures.push(`expected one combobox option text rule, found ${optionRules.length}`);
  } else {
    const declarations = declarationsFor(optionRules[0]);
    if (declarations['white-space'] !== 'normal') failures.push('combobox option labels are not allowed to wrap');
    if (declarations['overflow-wrap'] !== 'anywhere') failures.push('combobox option labels cannot break an overlong token');
    for (const property of ['overflow', 'text-overflow']) {
      if (property in declarations) failures.push(`combobox option labels still force ${property}: ${declarations[property]}`);
    }
  }

  if (!catalogSource.includes("'searchable-select-dark-long'")) failures.push('dark long-option scenario is not registered');
  for (const evidence of [
    "name === 'searchable-select-dark-long'",
    "key: 'ArrowDown'",
    "key: 'Enter'",
    "key: 'Escape'",
    "new PointerEvent('pointerdown'",
    '这是一个需要在窄屏菜单中完整显示的超长动态分组名称',
  ]) {
    if (!harnessSource.includes(evidence)) failures.push(`searchable-select scenario evidence is missing: ${evidence}`);
  }

  assert.deepEqual(failures, []);
});

test('dynamic searchable selects stay full width with compact internal controls', () => {
  const inputRules = rulesFor(componentSource, '.pc-combobox-input');
  const toggleRules = rulesFor(componentSource, '.pc-combobox-toggle');
  const optionRules = rulesFor(componentSource, '.pc-combobox-option');

  assert.match(componentSource, /\.pc-combobox\s*\{[^}]*width:\s*100%;/su, 'dynamic combobox must keep the parent width');
  assert.ok(inputRules.some(rule => /padding-right:\s*40px/.test(rule)), 'input must reserve only the compact toggle width');
  assert.ok(toggleRules.some(rule => /width:\s*30px/.test(rule) && /height:\s*30px/.test(rule)));
  assert.ok(optionRules.some(rule => /min-height:\s*34px/.test(rule)), 'dynamic options must use compact row height');
});
