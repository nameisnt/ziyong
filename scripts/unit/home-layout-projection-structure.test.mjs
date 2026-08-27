/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const home = await readFile(new URL('../../src/components/PhoneHome.vue', import.meta.url), 'utf8');
const projection = await readFile(
  new URL('../../src/components/home/useHomeLayoutProjection.ts', import.meta.url),
  'utf8',
);

test('home layout projection owns the complete read-only desktop projection', () => {
  for (const evidence of [
    'export type HomeDisplayItem',
    'const homeLayout = computed',
    'const phoneAppById = computed',
    'const dockItems = computed',
    'function resolveHomeDisplayItem',
  ]) {
    assert.ok(projection.includes(evidence), `${evidence} is missing from the layout projection`);
    assert.ok(!home.includes(evidence), `${evidence} is duplicated in PhoneHome`);
  }
  assert.match(home, /useHomeLayoutProjection\(\)/u);
});

test('projection reuses the existing pure layout utilities without changing their ownership', () => {
  assert.match(projection, /normalizeHomeLayout\(settings\.value\.layout\)/u);
  assert.match(projection, /export function useHomeLayoutProjection\(\)/u);
  assert.doesNotMatch(projection, /packHomeGridPages|homePageIndex|homePages/u);
  assert.doesNotMatch(projection, /setHomeLayout|createHomeFolder|moveHomeLayoutItem|putHomeAppInFolder/u);
});

test('PhoneHome keeps every writable interaction and route boundary', () => {
  for (const evidence of [
    'const appDrag = reactive',
    'const folderDrag = reactive',
    'const activeHomeGroupId = ref',
    'function commitAppDrag',
    'function createSelectedHomeFolder',
    'function moveSelectedApps',
    'settingsStore.setHomeLayout',
  ]) {
    assert.ok(home.includes(evidence), `${evidence} is missing from PhoneHome`);
    assert.ok(!projection.includes(evidence), `${evidence} leaked into the read-only projection`);
  }
  assert.doesNotMatch(projection, /PointerEvent|document\.|window\.setTimeout|pushRoute|recordHomeSource/u);
});
