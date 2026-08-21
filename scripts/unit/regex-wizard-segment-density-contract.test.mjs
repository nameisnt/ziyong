/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const componentSource = await readFile(
  new URL('../../src/apps/regex-wizard/RegexWizardApp.vue', import.meta.url),
  'utf8',
);
const globalSource = await readFile(new URL('../../src/global.css', import.meta.url), 'utf8');

function rulesFor(source, selector) {
  const rules = [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(candidate => candidate[1].split(',').some(item => item.trim() === selector))
    .map(candidate => candidate[2]);
  assert.ok(rules.length > 0, `missing CSS rule for ${selector}`);
  return rules;
}

test('regex wizard purpose uses the global segment density while keeping its three-column layout', () => {
  const localRules = rulesFor(componentSource, '.pc-regex-wizard-purpose .pc-segment-btn');
  const globalRules = rulesFor(globalSource, '.pc-phone-root .pc-segment-btn');

  assert.ok(localRules.some(rule => /min-width:\s*0/.test(rule)), 'the three-column buttons must remain shrinkable');
  assert.ok(
    localRules.every(rule => !/font-size\s*:/.test(rule)),
    'standard segment text must inherit the global font size',
  );
  assert.ok(
    localRules.every(rule => !/min-height\s*:/.test(rule)),
    'standard segment height must inherit the global height',
  );
  assert.ok(
    localRules.every(rule => !/padding(?:-[a-z]+)*\s*:/.test(rule)),
    'standard segment padding must inherit the global spacing',
  );
  assert.ok(globalRules.some(rule => /min-height:\s*30px/.test(rule)), 'global segment height must remain 30px');
  assert.ok(globalRules.some(rule => /font-size:\s*13px/.test(rule)), 'global segment text must remain 13px');
});
