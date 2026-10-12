/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { parse } from 'vue/compiler-sfc';

test('help buttons are never implicitly associated with wrapper labels', async () => {
  const root = new URL('../../src/', import.meta.url);
  const files = await readdir(root, { recursive: true });
  const findings = [];
  function contains(node, tag) {
    return node.tag === tag || (node.children || []).some(child => contains(child, tag));
  }
  for (const file of files.filter(file => file.endsWith('.vue'))) {
    const { descriptor } = parse(await readFile(new URL(file.replaceAll('\\', '/'), root), 'utf8'));
    function visit(node) {
      if (!node) return;
      if (node.tag === 'label' && contains(node, 'InfoHint')) findings.push(file);
      for (const child of node.children || []) visit(child);
    }
    visit(descriptor.template?.ast);
  }
  assert.deepEqual(findings, []);
});

test('binding template title targets the textarea instead of the insertion button', async () => {
  const source = await readFile(
    new URL('../../src/apps/entry-library/pages/EntryLibraryBindingsPage.vue', import.meta.url),
    'utf8',
  );
  assert.match(source, /<div class="pc-field-group pc-entry-binding-template"/);
  assert.match(source, /<label :for="templateFieldId">绑定内容<\/label/);
  assert.match(source, /:id="templateFieldId"/);
  assert.match(source, /const templateFieldId = useId\(\)/);
});

test('shared checkbox does not nest labels and retains native change and disabled handling', async () => {
  const source = await readFile(new URL('../../src/components/BulkSelectionCheckbox.vue', import.meta.url), 'utf8');
  const { descriptor } = parse(source);
  assert.equal(descriptor.template.ast.children[0].tag, 'span');
  assert.doesNotMatch(descriptor.template.content, /<label\b/);
  assert.match(source, /:disabled="disabled"/);
  assert.match(source, /@change="\$emit\('update:modelValue'/);
  const timekeeper = await readFile(new URL('../../src/apps/timekeeper/TimekeeperApp.vue', import.meta.url), 'utf8');
  assert.match(timekeeper, /<div class="pc-check-row">/);
});

test('output cleaning checkbox keeps an accessible name and the original persisted model', async () => {
  const source = await readFile(
    new URL('../../src/apps/settings/SettingsGenerationPanel.vue', import.meta.url),
    'utf8',
  );
  assert.match(source, /v-model="settings.generation.outputCleaningEnabled"/);
  assert.match(source, /aria-label="解析前清理思维链"/);
});
