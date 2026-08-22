/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../src/apps/contentReceivers.ts', import.meta.url), 'utf8');

test('separate reader conversion resolves the exact previous user floor and its active swipe', () => {
  assert.match(source, /context\.batchMode !== 'separate'/u);
  assert.match(source, /source\.appId !== 'reader'/u);
  assert.match(source, /source\.sourceFloorEnd - 1/u);
  assert.match(source, /previous\.role !== 'user'/u);
  assert.match(source, /swipes\[activeSwipeIndex\]/u);
  assert.match(source, /\.trim\(\)/u);
});

test('extras and theater conversion persist the requirement through their existing generation records', () => {
  const extrasReceiver = source.match(/export function createExtrasContentReceiver[\s\S]*?export function createDiaryContentReceiver/u)?.[0] ?? '';
  const theaterReceiver = source.match(/export function createTheaterContentReceiver[\s\S]*?export function createForumContentReceiver/u)?.[0] ?? '';

  assert.match(extrasReceiver, /createExtraChapterGenerationRecord/u);
  assert.match(extrasReceiver, /generationRecord/u);
  assert.match(theaterReceiver, /createHiddenGenerationRecord\('generate'/u);
  assert.match(theaterReceiver, /generationRecord/u);
});

test('merge conversion does not infer one user requirement for combined floors', () => {
  assert.match(source, /if \(context\.batchMode !== 'separate'\) return requirements;/u);
});
