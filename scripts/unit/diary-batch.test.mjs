/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDiaryBatchJobs,
  formatDiaryBatchRange,
  parseDiaryBatchFloorText,
  selectDiaryBatchFloors,
} from '../../src/apps/diary/batch.ts';

test('parseDiaryBatchFloorText accepts ranges, singles, and mixed separators', () => {
  assert.deepEqual(parseDiaryBatchFloorText('1-3, 5'), [1, 2, 3, 5]);
  assert.deepEqual(parseDiaryBatchFloorText('9-7'), [7, 8, 9]);
  assert.deepEqual(parseDiaryBatchFloorText('2 2 4'), [2, 4]);
  assert.deepEqual(parseDiaryBatchFloorText('1，2；3\n4'), [1, 2, 3, 4]);
});

test('parseDiaryBatchFloorText rejects empty or malformed input', () => {
  assert.throws(() => parseDiaryBatchFloorText('   '), /请先填写楼层范围/u);
  assert.throws(() => parseDiaryBatchFloorText('1-a'), /无法识别楼层片段：1-a/u);
});

test('formatDiaryBatchRange compresses consecutive floors', () => {
  assert.equal(formatDiaryBatchRange([]), '');
  assert.equal(formatDiaryBatchRange([3]), '3');
  assert.equal(formatDiaryBatchRange([1, 2, 3, 7]), '1-3, 7');
  assert.equal(formatDiaryBatchRange([5, 4, 3, 9, 10]), '3-5, 9-10');
});

test('selectDiaryBatchFloors keeps only allowed visible roles', () => {
  const messages = [
    { message_id: 0, role: 'user' },
    { message_id: 1, role: 'assistant' },
    { message_id: 2, role: 'system' },
    { message_id: 3, role: 'assistant' },
  ];
  assert.deepEqual(
    selectDiaryBatchFloors(messages, { floorMode: 'all', floorText: '', includeAi: true, includeUser: false }),
    [1, 3],
  );
  assert.deepEqual(
    selectDiaryBatchFloors(messages, { floorMode: 'custom', floorText: '0-1', includeAi: true, includeUser: true }),
    [0, 1],
  );
  assert.deepEqual(
    selectDiaryBatchFloors(messages, { floorMode: 'custom', floorText: '0,2', includeAi: false, includeUser: true }),
    [0],
  );
});

test('selectDiaryBatchFloors reports the same failures as the app', () => {
  const messages = [{ message_id: 0, role: 'user' }];
  assert.throws(
    () => selectDiaryBatchFloors(messages, { floorMode: 'all', floorText: '', includeAi: false, includeUser: false }),
    /请至少选择 AI 楼层或用户楼层/u,
  );
  assert.throws(
    () => selectDiaryBatchFloors(messages, { floorMode: 'all', floorText: '', includeAi: true, includeUser: false }),
    /当前聊天没有符合条件的可见 AI\/用户楼层/u,
  );
  assert.throws(
    () =>
      selectDiaryBatchFloors(messages, { floorMode: 'custom', floorText: '5', includeAi: true, includeUser: true }),
    /给定范围内没有符合条件的可见 AI\/用户楼层/u,
  );
});

test('buildDiaryBatchJobs groups floors for both modes', () => {
  assert.deepEqual(buildDiaryBatchJobs([1, 2, 3, 4, 5], false, 2), [
    { fromStartEnd: 2, label: '第 0-2 楼', mode: 'fromStart', rangeText: '', singleMessageId: 0 },
    { fromStartEnd: 4, label: '第 0-4 楼', mode: 'fromStart', rangeText: '', singleMessageId: 0 },
    { fromStartEnd: 5, label: '第 0-5 楼', mode: 'fromStart', rangeText: '', singleMessageId: 0 },
  ]);
  assert.deepEqual(buildDiaryBatchJobs([1, 2, 3, 4, 5], true, 2), [
    { fromStartEnd: 0, label: '第 1-2 楼', mode: 'range', rangeText: '1-2', singleMessageId: 0 },
    { fromStartEnd: 0, label: '第 3-4 楼', mode: 'range', rangeText: '3-4', singleMessageId: 0 },
    { fromStartEnd: 0, label: '第 5 楼', mode: 'range', rangeText: '5', singleMessageId: 0 },
  ]);
});

test('buildDiaryBatchJobs clamps the group size', () => {
  assert.equal(buildDiaryBatchJobs([1, 2], true, 0).length, 2);
  assert.equal(buildDiaryBatchJobs([1, 2, 3], true, 0.4).length, 3);
  assert.equal(buildDiaryBatchJobs(Array.from({ length: 120 }, (_, index) => index), true, 999).length, 3);
});
