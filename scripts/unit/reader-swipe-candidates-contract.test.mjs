/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
const [readerStore, readerSession, readerApp, runtime, scenario] = await Promise.all([
  readSource('src/store/reader.ts'),
  readSource('src/apps/reader/useReaderChatSession.ts'),
  readSource('src/apps/reader/ReaderApp.vue'),
  readSource('src/util/runtime.ts'),
  readSource('src/testing/visual/readerScenarios.ts'),
]);

test('Reader loads and normalizes every swipe while retaining the Tavern active selection', () => {
  assert.match(readerSession, /getChatMessagesSafe\('0-\{\{lastMessageId\}\}', \{ include_swipes: true \}\)/u);
  assert.match(readerStore, /export interface ReaderSwipeCandidate/u);
  assert.match(readerStore, /activeSwipeIndex: number;/u);
  assert.match(readerStore, /swipeCandidates: ReaderSwipeCandidate\[\];/u);
  assert.match(readerStore, /extractSwipeCandidates/u);
  assert.match(
    runtime,
    /options\?\.include_swipes \? \{ swipe_id: swipeId, swipes, swipes_data: swipesData, swipes_info: swipesInfo \}/u,
  );
});

test('Reader swipe selection remains page-local and suppresses write-capable tools for non-active candidates', () => {
  assert.match(readerApp, /const selectedSwipeIndex = ref\(0\)/u);
  assert.match(readerApp, /const isViewingActiveSwipe = computed/u);
  assert.match(readerApp, /:bagu-enabled="isReadingCurrentChat && isViewingActiveSwipe"/u);
  assert.match(readerApp, /:favorite-enabled="isViewingActiveSwipe"/u);
  assert.match(readerApp, /v-if="isReadingCurrentChat && isViewingActiveSwipe"/u);
  assert.match(scenario, /reader-swipe-candidates/u);
  assert.match(scenario, /Non-active swipe must disable every content-writing reader tool/u);
});
