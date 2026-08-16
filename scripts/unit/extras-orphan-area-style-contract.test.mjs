/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const extras = await readFile(new URL('../../src/components/ExtrasApp.vue', import.meta.url), 'utf8');
const extrasScenarios = await readFile(
  new URL('../../src/testing/visual/extrasGenerationScenarios.ts', import.meta.url),
  'utf8',
);

function completeTemplateOf(source) {
  const start = source.indexOf('<template>');
  const end = source.indexOf('<script setup');
  return start >= 0 && end > start ? source.slice(start, end) : '';
}

test('Extras parent keeps only its multiline summary area and no orphan long-area rule or probe', () => {
  const failures = [];
  const template = completeTemplateOf(extras);
  if (!template) failures.push('Extras complete parent template could not be read');

  const areaClasses = [...template.matchAll(/class="[^"]*\bpc-area\b[^"]*"/g)].map(match => match[0]);
  if (areaClasses.length !== 1 || !areaClasses[0]?.includes('pc-area-multiline')) {
    failures.push(`Extras parent area consumers changed: ${areaClasses.join(', ') || 'none'}`);
  }
  if (/\.pc-extras-app \.pc-area:not\(\.pc-area-multiline\)\s*\{/.test(extras)) {
    failures.push('Extras orphan 220px long-area rule still exists');
  }
  if (/longAreaProbe|Extras long-form textarea geometry changed/.test(extrasScenarios)) {
    failures.push('Extras visual scenario still creates an artificial long-area consumer');
  }

  assert.deepEqual(failures, []);
});
