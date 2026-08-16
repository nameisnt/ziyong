/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import test from 'node:test';

import { commitSettingsResourceDeletion } from '../../src/util/settingsResourceTransaction.ts';

test('resource reference is removed only after the server file is deleted', async () => {
  const events = [];

  await commitSettingsResourceDeletion({
    deleteResource: async () => events.push('file-deleted'),
    removeReference: () => events.push('reference-removed'),
  });

  assert.deepEqual(events, ['file-deleted', 'reference-removed']);
});

test('server deletion failure preserves the settings reference', async () => {
  let removed = false;

  await assert.rejects(
    commitSettingsResourceDeletion({
      deleteResource: async () => {
        throw new Error('HTTP 500');
      },
      removeReference: () => {
        removed = true;
      },
    }),
    /HTTP 500/,
  );

  assert.equal(removed, false);
});
