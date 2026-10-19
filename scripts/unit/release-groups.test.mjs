/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import test from 'node:test';
import { groupReleaseHistory } from '../../src/core/releaseGroups.mjs';

test('release display groups five versions, caps at eight groups and preserves history', () => {
  for (const size of [0, 1, 4, 5, 6, 39, 40, 41, 53]) {
    const history = Array.from({ length: size }, (_, index) => ({ version: `1.0.${size - index}`, notes: ['note'] }));
    const before = structuredClone(history);
    const groups = groupReleaseHistory(history);
    assert.equal(groups.length, Math.min(8, Math.ceil(size / 5)));
    assert.ok(groups.every(group => group.length > 0 && group.length <= 5));
    assert.deepEqual(groups.flat(), history.slice(0, 40));
    assert.deepEqual(history, before);
  }
});
