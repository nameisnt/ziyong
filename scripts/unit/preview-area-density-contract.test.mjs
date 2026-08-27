/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const display = await readFile(new URL('../../src/apps/regex-display/RegexDisplayApp.vue', import.meta.url), 'utf8');
const globalSource = await readFile(new URL('../../src/global.css', import.meta.url), 'utf8');
const wizard = await readFile(new URL('../../src/apps/regex-wizard/RegexWizardApp.vue', import.meta.url), 'utf8');

function rulesFor(source, selector) {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(match => match[1].split(',').some(item => item.trim() === selector))
    .map(match => match[2]);
}

function hasMinHeight(source, selector) {
  return rulesFor(source, selector).some(body => /(?:^|;)\s*min-height\s*:/.test(body));
}

test('preview and test textareas inherit the shared 160px area height', () => {
  const failures = [];
  if (!rulesFor(globalSource, '.pc-phone-root .pc-area').some(body => /min-height\s*:\s*160px/.test(body))) {
    failures.push('shared textarea does not define min-height: 160px');
  }
  if (hasMinHeight(display, '.pc-area.preview-source'))
    failures.push('regex display preview still overrides min-height');
  if (hasMinHeight(wizard, '.pc-regex-wizard-test .pc-area'))
    failures.push('regex wizard test still overrides min-height');
  if (!rulesFor(wizard, '.pc-regex-wizard-test .pc-area').some(body => /font-family\s*:/.test(body))) {
    failures.push('regex wizard test lost its monospace font identity');
  }
  assert.deepEqual(failures, []);
});
