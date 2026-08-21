/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../../src/components/PhoneHome.vue', import.meta.url), 'utf8');

test('home reserves page zero for transient activity and defaults to the first desktop page', () => {
  assert.match(source, /const homePageIndex = ref\(1\)/u);
  assert.match(source, /v-if="homePageIndex === 0" class="pc-home-activity-page"/u);
  assert.match(source, /homePages\.value\[homePageIndex\.value - 1\]/u);
  assert.match(source, /v-for="\(_, pageIndex\) in homePages\.length \+ 1"/u);
});

test('activity is never a drag destination and home re-entry returns to desktop', () => {
  assert.match(source, /nextPage < 1 \|\| nextPage > homePages\.value\.length/u);
  assert.match(source, /homePageIndex\.value = 1;/u);
});

test('activity routes drafts and recovery items through their registered app and keeps saved-task cleanup explicit', () => {
  assert.match(source, /phone\.openApp\(item\.appId, item\.routePage, item\.title, item\.routeParams\)/u);
  assert.match(source, /generationTasks\.getClearableTasks\(viewingScopeKey\.value\)/u);
  assert.match(source, /generationTasks\.clearPureSavedTasks\(viewingScopeKey\.value\)/u);
  assert.match(source, /item\.kind !== 'active-task'/u);
});

test('late recovery-provider results cannot overwrite activity from a newer chat scope', () => {
  assert.match(source, /const requestSequence = \+\+activityRefreshSequence;/u);
  assert.match(source, /requestSequence !== activityRefreshSequence \|\| scopeKey !== viewingScopeKey\.value/u);
});

test('home organize mode is explicit and Dock rejects unsupported drops instead of displacing items', () => {
  assert.match(source, /isOrganizing = ref\(false\)/u);
  assert.match(source, /\{\{ isOrganizing \? '完成' : '整理' \}\}/u);
  assert.match(source, /Dock 只能放置 App，文件夹请留在主界面/u);
  assert.match(source, /Dock 已满，请先移出一个 App/u);
  assert.match(source, /height: calc\(100% - 20px\)/u);
  assert.match(source, /event\.button !== 0 \|\| homePages\.value\.length < 1 \|\| isOrganizing\.value/u);
});
