/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const settingsSource = await readFile(new URL('../../src/apps/settings/SettingsApp.vue', import.meta.url), 'utf8');
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

test('settings categories use a flat horizontally scrollable paper navigation', () => {
  const localRules = rulesFor(settingsSource, '.pc-settings-tabs .pc-segment-btn');
  assert.equal(localRules.length, 1, 'settings tabs must keep one responsive layout rule');
  assert.deepEqual(declarationsFor(localRules[0]), {
    flex: '0 0 auto',
    gap: '5px',
    'white-space': 'nowrap',
  });
  assert.match(settingsSource, /\.pc-settings-tabs\s*\{[^}]*overflow-x:\s*auto/u);
  assert.doesNotMatch(settingsSource, /grid-template-columns:\s*repeat\(5/u);

  const globalRules = rulesFor(globalSource, '.pc-phone-root .pc-segment-btn');
  assert.ok(globalRules.some(rule => /min-height:\s*30px/.test(rule)), 'global segment height must remain 30px');
  assert.ok(globalRules.some(rule => /font-size:\s*13px/.test(rule)), 'global segment text must remain 13px');
});
