/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const settingsSource = await readFile(new URL('../../src/components/SettingsApp.vue', import.meta.url), 'utf8');
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

test('settings five-column tabs inherit global density at every viewport width', () => {
  const localRules = rulesFor(settingsSource, '.pc-settings-tabs .pc-segment-btn');
  assert.equal(localRules.length, 2, 'settings tabs must keep one base layout rule and one narrow layout rule');

  const protectedDensity = /^(?:font-size|height|min-height|max-height|line-height|padding(?:-[a-z]+)*|border-radius)$/;
  const densityOverrides = localRules.flatMap((rule, index) =>
    Object.entries(declarationsFor(rule))
      .filter(([property]) => protectedDensity.test(property))
      .map(([property, value]) => `rule ${index + 1}: ${property}: ${value}`),
  );
  assert.deepEqual(densityOverrides, [], 'settings tabs must not override protected global density');

  assert.deepEqual(declarationsFor(localRules[0]), {
    'min-width': '0',
    'min-inline-size': '0',
    gap: '3px',
    'white-space': 'nowrap',
  });
  assert.deepEqual(declarationsFor(localRules[1]), { gap: '2px' });

  const globalRules = rulesFor(globalSource, '.pc-phone-root .pc-segment-btn');
  assert.ok(globalRules.some(rule => /min-height:\s*32px/.test(rule)), 'global segment height must remain 32px');
  assert.ok(globalRules.some(rule => /font-size:\s*13px/.test(rule)), 'global segment text must remain 13px');
});
