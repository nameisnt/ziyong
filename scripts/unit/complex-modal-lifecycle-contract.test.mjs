/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sources = Object.fromEntries(
  await Promise.all(
    [
      ['bagu', '../../src/components/BaguHitDetailsModal.vue'],
      ['transfer', '../../src/components/ContentTransferOverlay.vue'],
      ['phone', '../../src/components/PhoneHome.vue'],
    ].map(async ([key, path]) => [key, await readFile(new URL(path, import.meta.url), 'utf8')]),
  ),
);
const interactionContracts = await readFile(new URL('../ui-interaction-contracts.mjs', import.meta.url), 'utf8');
const runnerSource = await readFile(new URL('../ui-visual-check.mjs', import.meta.url), 'utf8');

test('complex dialogs share lifecycle without bypassing busy guards', () => {
  const failures = [];
  for (const [key, source] of Object.entries(sources)) {
    if (!source.includes("from '@/composables/usePhoneModalLifecycle'")) {
      failures.push(`${key} does not import the shared modal lifecycle`);
    }
  }

  for (const [key, refName] of [
    ['bagu', 'dialogEl'],
    ['transfer', 'dialogRef'],
    ['phone', 'homeFolderDialogRef'],
  ]) {
    const explicitRegistration = sources[key].includes(`dialogRef: ${refName}`);
    const shorthandRegistration =
      refName === 'dialogRef' && /usePhoneModalLifecycle\(\{\s*dialogRef,/.test(sources[key]);
    if (!explicitRegistration && !shorthandRegistration) failures.push(`${key} does not register ${refName}`);
  }
  if (sources.bagu.includes('useEventListener(window') || sources.bagu.includes('dialogEl.value?.focus')) {
    failures.push('Bagu modal still owns duplicate key or focus lifecycle');
  }

  for (const evidence of ['function close()', "if (!busy.value) emit('close')", 'onClose: close']) {
    if (!sources.transfer.includes(evidence)) failures.push(`Content transfer busy close guard missing: ${evidence}`);
  }
  for (const evidence of [
    'ref="homeFolderDialogRef"',
    'aria-label="主页分组管理"',
    'tabindex="-1"',
    'isOpen: () => Boolean(activeHomeFolder.value)',
    'onClose: closeHomeFolder',
  ]) {
    if (!sources.phone.includes(evidence)) failures.push(`Home folder dialog lifecycle missing: ${evidence}`);
  }

  for (const scenario of ['bagu-hit-details', 'content-transfer-dialog']) {
    if (!interactionContracts.includes(`scenario: '${scenario}'`))
      failures.push(`${scenario} is not a formal interaction`);
    if (!runnerSource.includes(`scenario === '${scenario}'`)) failures.push(`${scenario} has no lifecycle assertions`);
  }

  assert.deepEqual(failures, []);
});
