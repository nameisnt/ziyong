/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

test('reader side padding is persisted once and applied by the shared detail shell', async () => {
  const [schema, store, settingsPanel, overlay, shell] = await Promise.all([
    read('src/type/settings.ts'),
    read('src/store/settings.ts'),
    read('src/apps/settings/SettingsReaderPanel.vue'),
    read('src/components/PhoneOverlay.vue'),
    read('src/components/ReaderDetailShell.vue'),
  ]);

  assert.match(schema, /sidePadding: z\.number\(\)\.int\(\)\.min\(0\)\.max\(32\)\.default\(0\)/u);
  assert.match(store, /function setReaderSidePadding\(sidePadding: number\)/u);
  assert.match(settingsPanel, /正文左右边距[\s\S]*?settings\.reader\.sidePadding/u);
  assert.match(overlay, /'--pc-reader-side-padding': `\$\{settings\.value\.reader\.sidePadding\}px`/u);
  assert.match(
    shell,
    /\.pc-reader-detail-shell :deep\(\.pc-reader-content\)[\s\S]*?padding-inline: var\(--pc-reader-side-padding, 0px\)/u,
  );
});
