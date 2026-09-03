/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import test from 'node:test';

import { compareUiContractBaseline, createUiContractBaseline, scanVueUiContracts } from '../ui-contract-check.mjs';

function ruleIds(source) {
  return scanVueUiContracts(source, 'src/apps/example/ExampleApp.vue').map(finding => finding.ruleId);
}

test('icon buttons require both a tooltip and an accessible name', () => {
  const missingAria = `
    <template>
      <button class="pc-icon-btn" type="button" title="关闭" @click="close"><i class="fa-solid fa-xmark" /></button>
    </template>
  `;
  assert.deepEqual(ruleIds(missingAria), ['icon-button-aria-label']);

  const complete = `
    <template>
      <button class="pc-icon-btn" type="button" title="关闭" aria-label="关闭" @click="close"><i /></button>
    </template>
  `;
  assert.deepEqual(ruleIds(complete), []);
});

test('dynamic icon button classes are checked and missing tooltips are rejected', () => {
  const source = `
    <template>
      <button :class="['pc-icon-btn', { active }]" type="button" :aria-label="label" @click="run"><i /></button>
    </template>
  `;
  assert.deepEqual(ruleIds(source), ['icon-button-title']);
});

test('an inert type=button is rejected while direct and delegated actions remain valid', () => {
  const inert = `<template><button type="button">保存</button></template>`;
  assert.deepEqual(ruleIds(inert), ['button-action']);

  const direct = `<template><button type="button" @click="save">保存</button></template>`;
  assert.deepEqual(ruleIds(direct), []);

  const delegated = `<template><div @click="handleAction"><button type="button" data-action="save">保存</button></div></template>`;
  assert.deepEqual(ruleIds(delegated), []);

  const forwarded = `<template><button type="button" v-bind="$attrs">保存</button></template>`;
  assert.deepEqual(ruleIds(forwarded), []);

  const submit = `<template><form @submit.prevent="save"><button type="submit">保存</button></form></template>`;
  assert.deepEqual(ruleIds(submit), []);
});

test('scoped App styles cannot redefine protected control geometry or theme colors', () => {
  const source = `
    <template><div /></template>
    <style scoped>
    .panel .pc-segment-btn {
      height: 42px;
      font-size: 16px;
      background: #fff;
    }
    </style>
  `;
  assert.deepEqual(ruleIds(source), ['protected-control-geometry', 'protected-control-theme-color']);
});

test('layout-only protected selectors and numbered exceptions remain valid', () => {
  const layoutOnly = `
    <template><div /></template>
    <style scoped>.panel .pc-segment-btn { flex: 1; width: 100%; }</style>
  `;
  assert.deepEqual(ruleIds(layoutOnly), []);

  const allowed = `
    <template><div /></template>
    <style scoped>
    /* ui-reuse-allow: D-EXAMPLE-001 embedded host control cannot inherit the phone theme. */
    .panel .pc-segment-btn { height: 42px; background: #fff; }
    </style>
  `;
  assert.deepEqual(ruleIds(allowed), []);
});

test('unscoped global styles are not mistaken for App-local overrides', () => {
  const source = `
    <template><div /></template>
    <style>.pc-segment-btn { height: 42px; background: #fff; }</style>
  `;
  assert.deepEqual(ruleIds(source), []);
});

test('local class names that only start with a protected class are not rejected', () => {
  const source = `
    <template><div /></template>
    <style scoped>
    .pc-selected-icon-editor { padding-top: 12px; }
    .pc-field-help { font-size: 12px; }
    </style>
  `;
  assert.deepEqual(ruleIds(source), []);
});

test('the legacy baseline allows exact old counts but rejects additions and stale entries', () => {
  const legacy = scanVueUiContracts(
    `<template><button class="pc-icon-btn" type="button" title="旧按钮" @click="run"><i /></button></template>`,
    'src/apps/example/ExampleApp.vue',
  );
  const baseline = createUiContractBaseline(legacy);
  assert.deepEqual(compareUiContractBaseline(legacy, baseline), []);

  const added = [
    ...legacy,
    ...scanVueUiContracts(
      `<template><button class="pc-icon-btn" type="button" title="新按钮" @click="run"><i /></button></template>`,
      'src/apps/example/ExampleApp.vue',
    ),
  ];
  assert.equal(compareUiContractBaseline(added, baseline)[0]?.kind, 'unexpected/current');
  assert.equal(compareUiContractBaseline([], baseline)[0]?.kind, 'missing/stale');

  const replaced = scanVueUiContracts(
    `<template><button class="pc-icon-btn" type="button" title="替换按钮" @click="run"><i /></button></template>`,
    'src/apps/example/ExampleApp.vue',
  );
  assert.deepEqual(
    compareUiContractBaseline(replaced, baseline)
      .map(item => item.kind)
      .sort(),
    ['missing/stale', 'unexpected/current'],
  );
});

test('TypeScript script setup syntax does not create parser findings', () => {
  const source = `
    <template><button type="button" @click="run">运行</button></template>
    <script setup lang="ts">
    type Input = { id: string };
    const run = (input?: Input) => input?.id;
    </script>
  `;
  assert.deepEqual(ruleIds(source), []);
});
