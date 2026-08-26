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

test('settings categories use one compact selector while segmented controls keep shared density', () => {
  const localRules = rulesFor(settingsSource, '.pc-settings-category');
  assert.equal(localRules.length, 1, 'settings category selector must keep one responsive layout rule');
  assert.match(settingsSource, /<select v-model="activeSettingsTab" class="pc-select"/u);
  assert.match(settingsSource, /id: 'generation', label: '生成'/u);
  assert.match(settingsSource, /id: 'data', label: '数据'/u);
  assert.doesNotMatch(settingsSource, /pc-settings-tabs/u);

  const globalRules = rulesFor(globalSource, '.pc-phone-root .pc-segment-btn');
  assert.ok(
    globalRules.some(rule => /min-height:\s*30px/.test(rule)),
    'global segment height must remain 30px',
  );
  assert.ok(
    globalRules.some(rule => /font-size:\s*13px/.test(rule)),
    'global segment text must remain 13px',
  );
});
