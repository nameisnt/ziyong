/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const catalogSource = await readFile(new URL('../../src/components/CatalogModal.vue', import.meta.url), 'utf8');
const lifecycleUrl = new URL('../../src/composables/usePhoneModalLifecycle.ts', import.meta.url);
let lifecycleSource = '';
try {
  lifecycleSource = await readFile(lifecycleUrl, 'utf8');
} catch {
  lifecycleSource = '';
}
const runnerSource = await readFile(new URL('../ui-visual-check.mjs', import.meta.url), 'utf8');

test('catalog modal uses one shared focus, keyboard, phone-back and scroll-lock lifecycle', () => {
  const failures = [];
  for (const evidence of [
    'usePhoneModalLifecycle',
    'modalStack',
    "'phone-before-back'",
    "event.key !== 'Escape'",
    "screen.style.overflow = 'hidden'",
    'dialogRef.value?.focus',
  ]) {
    if (!lifecycleSource.includes(evidence)) failures.push(`shared modal lifecycle missing: ${evidence}`);
  }
  for (const evidence of [
    "import { usePhoneModalLifecycle } from '@/composables/usePhoneModalLifecycle';",
    'ref="dialogRef"',
    'tabindex="-1"',
    'usePhoneModalLifecycle({',
    'class="pc-icon-btn"',
    ':aria-label="t`关闭`"',
  ]) {
    if (!catalogSource.includes(evidence)) failures.push(`CatalogModal integration missing: ${evidence}`);
  }
  if (catalogSource.includes('pc-catalog-close')) failures.push('CatalogModal still redraws a private close button');
  for (const evidence of [
    "page.keyboard.press('Escape')",
    "new Event('phone-before-back'",
    ".pc-catalog-mask').click",
    'document.activeElement',
    ")) !== 'hidden'",
  ]) {
    if (!runnerSource.includes(evidence)) failures.push(`catalog lifecycle interaction evidence missing: ${evidence}`);
  }
  assert.deepEqual(failures, []);
});
