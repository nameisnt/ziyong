/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const globalSource = await readFile(new URL('../../src/global.css', import.meta.url), 'utf8');
const modalSources = await Promise.all(
  [
    ['catalog', '../../src/components/CatalogModal.vue', '.pc-catalog-mask'],
    ['creation', '../../src/components/CreationModeModal.vue', '.pc-creation-modal-mask'],
    ['bagu', '../../src/components/BaguHitDetailsModal.vue', '.pc-bagu-hit-modal-mask'],
    ['preview', '../../src/components/GenerationPreviewPanel.vue', '.pc-preview-dialog-backdrop'],
    ['prompts', '../../src/apps/prompts/PromptsApp.vue', '.pc-prompt-detail-backdrop'],
    ['phone', '../../src/components/PhoneHome.vue', '.pc-home-group-manager-backdrop'],
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

test('every modal backdrop consumes one global structural and theme rule', () => {
  const failures = [];
  const sharedRules = rulesFor(globalSource, '.pc-phone-root .pc-modal-backdrop');
  if (sharedRules.length !== 1) {
    failures.push(`expected one global modal backdrop rule, found ${sharedRules.length}`);
  } else {
    const declarations = declarationsFor(sharedRules[0]);
    const expected = {
      background: 'color-mix(in srgb, var(--pc-text) 30%, transparent 70%)',
      display: 'grid',
      inset: 'var(--pc-modal-inset, 0)',
      padding: '18px',
      'place-items': 'center',
      position: 'absolute',
      'z-index': 'var(--pc-modal-z, 60)',
    };
    for (const [property, value] of Object.entries(expected)) {
      if (declarations[property] !== value) failures.push(`global backdrop ${property} is ${declarations[property] ?? 'missing'}`);
    }
  }

  let consumerCount = 0;
  for (const { key, selector, source } of modalSources) {
    consumerCount += (source.match(/class="[^"]*\bpc-modal-backdrop\b[^"]*"/g) ?? []).length;
    for (const body of rulesFor(scopedStyleFor(source), selector)) {
      const declarations = declarationsFor(body);
      for (const property of ['position', 'inset', 'z-index', 'display', 'place-items', 'padding', 'background']) {
        if (property in declarations) failures.push(`${key} still owns shared backdrop ${property}`);
      }
    }
  }
  if (consumerCount !== 7) failures.push(`expected 7 modal backdrop consumers, found ${consumerCount}`);

  const expectedVariables = {
    bagu: '--pc-modal-z: 70',
    creation: '--pc-modal-z: 70',
    phone: '--pc-modal-z: 30',
    preview: '--pc-modal-z: 20',
    prompts: '--pc-modal-inset: 55px 0 0',
  };
  for (const [key, evidence] of Object.entries(expectedVariables)) {
    const source = modalSources.find(item => item.key === key)?.source ?? '';
    if (!source.includes(evidence)) failures.push(`${key} did not preserve ${evidence}`);
  }

  assert.deepEqual(failures, []);
});
