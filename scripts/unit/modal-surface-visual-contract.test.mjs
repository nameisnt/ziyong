/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const globalSource = await readFile(new URL('../../src/global.css', import.meta.url), 'utf8');
const harnessSource = await readFile(new URL('../../src/testing/visual-harness.ts', import.meta.url), 'utf8');
const modalSources = await Promise.all(
  [
    ['catalog', '../../src/components/CatalogModal.vue', '.pc-catalog-card'],
    ['creation', '../../src/components/CreationModeModal.vue', '.pc-creation-modal'],
    ['bagu', '../../src/components/BaguHitDetailsModal.vue', '.pc-bagu-hit-modal'],
    ['transfer', '../../src/components/ContentTransferOverlay.vue', '.pc-content-transfer-dialog'],
    ['preview', '../../src/components/GenerationPreviewPanel.vue', '.pc-preview-dialog'],
    ['prompts', '../../src/apps/prompts/PromptsApp.vue', '.pc-prompt-detail-dialog'],
    ['phone', '../../src/components/PhoneHome.vue', '.pc-home-folder-dialog'],
  ].map(async ([key, path, selector]) => ({
    key,
    selector,
    source: await readFile(new URL(path, import.meta.url), 'utf8'),
  })),
);

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

function scopedStyleFor(source) {
  return source.split('<style scoped>')[1]?.split('</style>')[0] ?? '';
}

test('every modal dialog consumes one opaque global theme surface', () => {
  const failures = [];
  const sharedRules = rulesFor(globalSource, '.pc-phone-root .pc-modal-dialog');
  if (sharedRules.length !== 1) {
    failures.push(`expected one global modal dialog rule, found ${sharedRules.length}`);
  } else {
    const declarations = declarationsFor(sharedRules[0]);
    const expected = {
      background: 'var(--pc-bg)',
      border: '1px solid var(--pc-border)',
      'box-shadow': '0 18px 44px color-mix(in srgb, var(--pc-text) 22%, transparent 78%)',
      outline: 'none',
    };
    for (const [property, value] of Object.entries(expected)) {
      if (declarations[property] !== value) failures.push(`global dialog ${property} is ${declarations[property] ?? 'missing'}`);
    }
  }

  let consumerCount = 0;
  for (const { key, selector, source } of modalSources) {
    consumerCount += (source.match(/class="[^"]*\bpc-modal-dialog\b[^"]*"/g) ?? []).length;
    for (const body of rulesFor(scopedStyleFor(source), selector)) {
      const declarations = declarationsFor(body);
      for (const property of ['border', 'border-color', 'background', 'box-shadow', 'outline', 'opacity', 'backdrop-filter']) {
        if (property in declarations) failures.push(`${key} still owns shared dialog ${property}`);
      }
    }
  }
  if (consumerCount !== 9) failures.push(`expected 9 modal dialog consumers, found ${consumerCount}`);

  const sectionCardIndex = globalSource.indexOf('.pc-phone-root .pc-section-card');
  const modalDialogIndex = globalSource.indexOf('.pc-phone-root .pc-modal-dialog');
  if (sectionCardIndex < 0 || modalDialogIndex <= sectionCardIndex) {
    failures.push('global modal dialog must follow section-card so its opaque background wins at equal specificity');
  }

  const transferBranch = harnessSource.split("name === 'content-transfer-dialog'")[1]?.split('} else if (')[0] ?? '';
  if (!transferBranch.includes("useSettingsStore().setTheme('dark')")) {
    failures.push('content-transfer visual scenario does not force the dark theme');
  }
  if (!transferBranch.includes('backgroundAlpha < 0.99')) {
    failures.push('content-transfer visual scenario does not assert an opaque computed background');
  }

  assert.deepEqual(failures, []);
});
