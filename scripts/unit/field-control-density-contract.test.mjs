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

test('single-line fields use compact readable density while multiline editors keep their reading size', () => {
  const failures = [];

  for (const selector of ['.pc-phone-root .pc-field', '.pc-phone-root .pc-select']) {
    if (!hasDeclaration(selector, 'font-size', '13px')) {
      failures.push(`${selector} does not explicitly use the 13px compact control font size`);
    }
    if (!hasDeclaration(selector, 'min-height', '36px')) {
      failures.push(`${selector} does not explicitly guarantee the 36px minimum control height`);
    }
  }

  if (!hasDeclaration('.pc-phone-root .pc-area', 'font-size', '14px')) {
    failures.push('.pc-phone-root .pc-area does not preserve the 14px multiline reading size');
  }

  assert.deepEqual(failures, []);
});
