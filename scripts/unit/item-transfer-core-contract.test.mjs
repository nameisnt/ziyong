/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const registry = await readFile(new URL('../../src/core/appRegistry.ts', import.meta.url), 'utf8');
const transfer = await readFile(new URL('../../src/util/itemTransfer.ts', import.meta.url), 'utf8');
const providers = await readFile(new URL('../../src/item-transfer/providers.ts', import.meta.url), 'utf8');
const profileProvider = await readFile(new URL('../../src/apps/profiles/itemTransfer.ts', import.meta.url), 'utf8');

test('item transfer is an explicit App capability with one versioned file envelope', () => {
  assert.match(registry, /export interface PhoneItemTransferProvider/u);
  assert.match(registry, /itemTransferProvider\?: PhoneItemTransferProvider/u);
  assert.match(registry, /invalid item transfer schema version/u);
  for (const field of ['appId', 'itemType', 'itemSchemaVersion', 'itemId', 'title', 'exportedAt', 'data']) {
    assert.match(transfer, new RegExp(`${field}:`, 'u'));
  }
  assert.match(transfer, /sillytavern-phone-item-transfer/u);
  assert.match(transfer, /payload\.version !== 1/u);
  assert.match(transfer, /payload\.itemSchemaVersion > provider\.schemaVersion/u);
});

test('copy import remaps nested ids while replacement stays conflict-gated and transactional', () => {
  assert.match(transfer, /export function cloneItemWithFreshIds/u);
  assert.match(transfer, /mode === 'replace' && !preview\.conflict/u);
  assert.match(transfer, /const snapshot = provider\.captureSnapshot\(\)/u);
  assert.match(transfer, /provider\.restoreSnapshot\(snapshot\)/u);
  assert.match(registry, /importTransaction\?: 'provider-owned' \| 'shared-snapshot'/u);
  assert.match(transfer, /provider\.importTransaction === 'provider-owned'/u);
});

test('the first item batch registers exactly the nine approved detail object types', () => {
  for (const type of [
    'summary-entry',
    'diary-entry',
    'extras-chapter',
    'forum-thread',
    'theater-entry',
    'letter-entry',
    'digest-entry',
    'scene-plan',
  ]) {
    assert.match(providers, new RegExp(`itemType: '${type}'`, 'u'));
  }
  assert.match(profileProvider, /itemType: 'external-profile-row'/u);
  assert.doesNotMatch(profileProvider, /useProfilesStore|ProfileEntrySchema/u);
});
