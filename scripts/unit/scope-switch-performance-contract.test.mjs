/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [registry, phone, presetLink, worldbookLink, worldSlots, builtin, workbench, extras] = await Promise.all([
  readFile(new URL('../../src/core/appRegistry.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../src/store/phone.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../src/apps/preset-link/index.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../src/apps/worldbook-link/index.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../src/apps/world-slots/index.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../src/apps/builtin.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../src/apps/workbench/index.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../src/apps/extras/ExtrasApp.vue', import.meta.url), 'utf8'),
]);

test('scope switching distinguishes background links from Apps activated on demand', () => {
  assert.match(registry, /scopeSwitchMode\?: 'always' \| 'on-open'/u);
  assert.match(registry, /item\.app\.scopeSwitchMode === 'always' \|\| item\.app\.id === appId/u);
  assert.match(registry, /getRegisteredPhoneAppScopeSwitchHandler\(appId: string\)/u);

  for (const source of [presetLink, worldbookLink, worldSlots]) {
    assert.match(source, /scopeSwitchMode:\s*'always'/u);
  }
  assert.doesNotMatch(builtin, /scopeSwitchMode:\s*'always'/u);
  assert.doesNotMatch(workbench, /scopeSwitchMode:\s*'always'/u);
});

test('chat changes switch background links and every App that was opened, but never instantiate the rest', () => {
  assert.match(phone, /const activatedAppIds = new Set<string>\(\)/u);
  assert.match(phone, /for \(const appId of \[currentRoute\.value\.appId, \.\.\.activatedAppIds\]\)/u);
  assert.match(phone, /activatedAppIds\.add\(appId\)/u);
  assert.match(phone, /function activateAppScope\(appId: string\)/u);
  assert.match(phone, /getRegisteredPhoneAppScopeSwitchHandler\(appId\)/u);
  assert.match(phone, /function openApp[\s\S]*activateAppScope\(appId\)[\s\S]*stack\.value/u);
  assert.match(phone, /async function goBack[\s\S]*activateAppScope\(currentRoute\.value\.appId\)/u);
  assert.match(phone, /function pushRoute[\s\S]*activateAppScope\(appId\)[\s\S]*stack\.value/u);
  assert.match(phone, /function replaceRoute[\s\S]*activateAppScope\(appId\)[\s\S]*stack\.value/u);
  assert.match(phone, /function openPhone[\s\S]*activateAppScope\(currentRoute\.value\.appId\)/u);
});

test('the extras app drops stale generation state when the viewing scope changes', () => {
  assert.match(extras, /watch\(\s*\(\) => extras\.scopeKey/u);
  assert.match(extras, /chapterGenerationState\.preview = null;/u);
  assert.match(extras, /generationState\.preview = null;/u);
  assert.match(extras, /phone\.replacePage\('root', '番外书架'\)/u);
});
