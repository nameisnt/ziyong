/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../src/global.css', import.meta.url), 'utf8');

function rulesFor(selector) {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(match => match[1].split(',').some(item => item.trim() === selector))
    .map(match => match[2]);
}

function hasDeclaration(selector, property, value) {
  const declaration = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*${value}\\s*(?:;|$)`);
  return rulesFor(selector).some(body => declaration.test(body));
}

test('shared fields use explicit readable density independent of the host page', () => {
  const failures = [];

  for (const selector of ['.pc-phone-root .pc-field', '.pc-phone-root .pc-select', '.pc-phone-root .pc-area']) {
    if (!hasDeclaration(selector, 'font-size', '14px')) {
      failures.push(`${selector} does not explicitly use the 14px shared control font size`);
    }
  }

  for (const selector of ['.pc-phone-root .pc-field', '.pc-phone-root .pc-select']) {
    if (!hasDeclaration(selector, 'min-height', '40px')) {
      failures.push(`${selector} does not explicitly guarantee the 40px minimum control height`);
    }
  }

  assert.deepEqual(failures, []);
});
