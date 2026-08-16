/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readerSource = await readFile(
  new URL('../../src/components/settings/SettingsReaderPanel.vue', import.meta.url),
  'utf8',
);
const themeSource = await readFile(new URL('../../src/apps/theme/ThemeApp.vue', import.meta.url), 'utf8');

test('reader settings expose imported fonts through the shared searchable selector and one live mapping path', () => {
  const failures = [];
  if (/<select\b[^>]*:value="settings\.reader\.fontFamily"/.test(readerSource)) {
    failures.push('reader settings still use the fixed native font select');
  }
  for (const evidence of [
    "import SearchableCombobox from '@/components/SearchableCombobox.vue';",
    'v-model="readerFontSelectionValue"',
    ':options="readerFontSelectionOptions"',
    'settings.value.customFont.fonts.map',
    "group: '自定义字体'",
    "value: `custom:${font.id}`",
    'settingsStore.getCustomFontFamily(value.slice',
    "label: '当前字体资源已失效'",
  ]) {
    if (!readerSource.includes(evidence)) failures.push(`reader font mapping missing: ${evidence}`);
  }
  for (const deadReaderDraft of [
    'readerSelectedCustomFont',
    'readerFontSelectionOptions',
    'readerFontSelectionValue',
    'onReaderFontSelect',
  ]) {
    if (themeSource.includes(deadReaderDraft)) failures.push(`ThemeApp still owns unused reader draft: ${deadReaderDraft}`);
  }
  assert.deepEqual(failures, []);
});
