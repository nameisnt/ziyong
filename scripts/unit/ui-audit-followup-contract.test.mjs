/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [horizontalFrame, horizontalDrag, taskCenter, home, settingsApp, connectionPanel, providerFields, mermaidGraph] =
  await Promise.all([
    readFile(new URL('../../src/components/HorizontalScrollFrame.vue', import.meta.url), 'utf8'),
    readFile(new URL('../../src/composables/useHorizontalDragScroll.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../src/components/GenerationTaskCenter.vue', import.meta.url), 'utf8'),
    readFile(new URL('../../src/components/PhoneHome.vue', import.meta.url), 'utf8'),
    readFile(new URL('../../src/apps/settings/SettingsApp.vue', import.meta.url), 'utf8'),
    readFile(new URL('../../src/apps/settings/SettingsConnectionPanel.vue', import.meta.url), 'utf8'),
    readFile(new URL('../../src/components/GenerationProviderFields.vue', import.meta.url), 'utf8'),
    readFile(new URL('../../src/apps/relationship/MermaidRelationshipGraph.vue', import.meta.url), 'utf8'),
  ]);

test('home categories and generation tasks share one discoverable horizontal scroller', () => {
  assert.match(taskCenter, /<HorizontalScrollFrame class="pc-task-list">/u);
  assert.match(home, /<HorizontalScrollFrame[\s\S]*?class="pc-home-group-tabs"/u);
  assert.match(horizontalFrame, /aria-label="向左浏览"/u);
  assert.match(horizontalFrame, /aria-label="向右浏览"/u);
  assert.match(horizontalDrag, /canScrollBackward/u);
  assert.match(horizontalDrag, /canScrollForward/u);
  assert.match(horizontalDrag, /event\.shiftKey/u);
  assert.match(taskCenter, /touch-action:\s*pan-x pan-y/u);
});

test('API settings use one ordered list without switching providers when a profile is only opened', () => {
  assert.match(settingsApp, /label: 'API 设置'/u);
  assert.doesNotMatch(connectionPanel, /pc-segment/u);
  assert.match(connectionPanel, /<strong>酒馆当前 API<\/strong>/u);
  assert.match(connectionPanel, /v-for="profile in settings\.textProvider\.externalProfiles"/u);
  assert.match(connectionPanel, /createExternalApiProfile\('custom', false\)/u);
  assert.match(connectionPanel, /phone\.pushPage\('external-api',[\s\S]*?\{ profileId \}/u);
  assert.match(providerFields, /buildTextProviderSelectionOptions/u);
});

test('relationship graph lazy-loads local Mermaid and exposes a real retry state', () => {
  assert.match(mermaidGraph, /import\('mermaid'\)/u);
  assert.doesNotMatch(mermaidGraph, /cdn\.jsdelivr\.net/u);
  assert.match(mermaidGraph, /mermaidPromise = null/u);
  assert.match(mermaidGraph, />重新加载</u);
  assert.match(mermaidGraph, /正在加载关系图/u);
});
