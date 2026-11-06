/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const comboboxSource = await readFile(new URL('../../src/components/SearchableCombobox.vue', import.meta.url), 'utf8');
const overlaySource = await readFile(new URL('../../src/components/SearchableSelectOverlay.vue', import.meta.url), 'utf8');
const sourceFieldsSource = await readFile(new URL('../../src/components/GenerationSourceFields.vue', import.meta.url), 'utf8');

test('the shared combobox can run as an option-only select without a search keyboard', () => {
  const failures = [];
  if (!/searchable\?: boolean;/.test(comboboxSource)) failures.push('searchable prop is missing');
  if (!/searchable: true,/.test(comboboxSource)) failures.push('searchable must default to the current search behaviour');
  if (!/:readonly="!searchable"/.test(comboboxSource))
    failures.push('option-only mode must drop native typing by rendering the field readonly');
  if (!/:aria-autocomplete="searchable \? 'list' : undefined"/.test(comboboxSource))
    failures.push('option-only mode must not advertise a filtered autocomplete list');
  if (!/if \(!props\.searchable\) return props\.options;/.test(comboboxSource))
    failures.push('option-only mode must keep every option instead of filtering it');
  if (!/if \(!props\.searchable\) return;/.test(comboboxSource))
    failures.push('option-only mode must ignore typed input');
  if (!/'pc-combobox-plain': !searchable/.test(comboboxSource))
    failures.push('option-only mode needs its own cursor styling hook');
  assert.deepEqual(failures, []);
});

test('the shared select overlay keeps the combobox menu and visual viewport clamping', () => {
  const failures = [];
  if (!/comboboxEl\.value\?\.focusAndOpen\(true\)/.test(overlaySource))
    failures.push('selects must keep their focus-and-select behaviour');
  if (!/const viewport = window\.visualViewport;/.test(overlaySource))
    failures.push('overlay placement must respect the visual viewport');
  if (
    !/const visibleBottom = viewport \? Math\.min\(shellRect\.bottom, viewport\.offsetTop \+ viewport\.height\)/.test(
      overlaySource,
    )
  )
    failures.push('available menu space must be clamped to the visible bottom edge');
  if (!/import SearchableCombobox from '@\/components\/SearchableCombobox\.vue'/.test(overlaySource))
    failures.push('selects must reuse the shared combobox instead of a second menu implementation');
  if (/pcSelectPlain|isPlainSelect/.test(overlaySource))
    failures.push('overlay must not carry a per-field plain-select escape hatch');
  assert.deepEqual(failures, []);
});

test('the source-mode field uses the shared combobox in option-only mode', () => {
  const failures = [];
  if (/<select\b/.test(sourceFieldsSource)) failures.push('source-mode field must not render a native select');
  if (!/import SearchableCombobox from '@\/components\/SearchableCombobox\.vue'/.test(sourceFieldsSource))
    failures.push('source-mode field must reuse the shared combobox');
  const comboboxTag = sourceFieldsSource.match(/<SearchableCombobox\b[^>]*>/s)?.[0] ?? '';
  if (!/:searchable="false"/.test(comboboxTag))
    failures.push('source-mode field must run the combobox in option-only mode');
  if (!/:model-value="mode"/.test(comboboxTag)) failures.push('source-mode field must show the current mode');
  if (!/@update:model-value="onModeChange"/.test(comboboxTag))
    failures.push('source-mode field must forward selections');
  const optionCount = (sourceFieldsSource.match(/\{ label: '[^']+', value: '[^']+' \}/g) ?? []).length;
  if (optionCount !== 7) failures.push(`expected 7 source-mode options, found ${optionCount}`);
  if (!/emit\('update:mode', value as SourceMode\)/.test(sourceFieldsSource))
    failures.push('selection must still emit update:mode');
  assert.deepEqual(failures, []);
});
