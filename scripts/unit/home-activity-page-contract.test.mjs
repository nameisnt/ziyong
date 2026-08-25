/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../../src/components/PhoneHome.vue', import.meta.url), 'utf8');
const activityPage = await readFile(new URL('../../src/components/home/HomeActivityPage.vue', import.meta.url), 'utf8');
const layoutProjection = await readFile(
  new URL('../../src/components/home/useHomeLayoutProjection.ts', import.meta.url),
  'utf8',
);
const taskCenter = await readFile(new URL('../../src/components/GenerationTaskCenter.vue', import.meta.url), 'utf8');

test('home reserves page zero for transient activity and defaults to the first desktop page', () => {
  assert.match(source, /const homePageIndex = ref\(1\)/u);
  assert.match(source, /<HomeActivityPage :active="homePageIndex === 0" @open="openHomeActivityItem"/u);
  assert.match(activityPage, /<section v-if="active" class="pc-home-activity-page"/u);
  assert.match(layoutProjection, /homePages\.value\[homePageIndex\.value - 1\]/u);
  assert.match(source, /v-for="\(_, pageIndex\) in homePages\.length \+ 1"/u);
});

test('activity is never a drag destination and home re-entry restores the recorded source page', () => {
  assert.match(source, /nextPage < 1 \|\| nextPage > homePages\.value\.length/u);
  assert.match(source, /homePageIndex\.value = clampHomePageIndex\(route\.homeSource\?\.pageIndex \?\? 1\)/u);
});

test('activity routes drafts and recovery items through their registered app and keeps saved-task cleanup in TaskCenter', () => {
  assert.match(source, /function openHomeActivityItem\(item: GenerationActivityItem\)/u);
  assert.match(
    source,
    /rememberHomeSource\(\);\s+phone\.pushRoute\(item\.appId, item\.routePage, item\.title, item\.routeParams\)/u,
  );
  assert.doesNotMatch(source, /clearSavedTaskRecords|pc-home-saved-tasks/u);
  assert.match(taskCenter, /generationTasks\.getClearableTasks\(\)/u);
  assert.match(taskCenter, /generationTasks\.clearPureSavedTasks\(\)/u);
  assert.match(taskCenter, /aria-label="清理已保存任务"/u);
  assert.match(taskCenter, /:disabled="!clearableTaskCount"/u);
  assert.doesNotMatch(taskCenter, /slice\(0, 5\)|pc-task-center-toggle|v-if="visibleTasks\.length"/u);
  assert.match(activityPage, /emit\('open', item\)/u);
  assert.match(activityPage, /item\.kind !== 'active-task'/u);
});

test('late recovery-provider results cannot overwrite activity from a newer chat scope', () => {
  assert.match(activityPage, /const requestSequence = \+\+activityRefreshSequence;/u);
  assert.match(activityPage, /requestSequence !== activityRefreshSequence \|\| scopeKey !== viewingScopeKey\.value/u);
});

test('activity page owns its asynchronous state without duplicating desktop state in PhoneHome', () => {
  for (const evidence of [
    'activityItems',
    'activityRefreshSequence',
    'getRegisteredPhoneGenerationRecoveryItems',
    'usePreviewDraftStore',
    'collectGenerationActivity',
  ]) {
    assert.match(activityPage, new RegExp(evidence, 'u'));
    assert.doesNotMatch(source, new RegExp(evidence, 'u'));
  }
  assert.match(activityPage, /watch\(viewingScopeKey,[\s\S]*\{ immediate: true \}/u);
  assert.match(activityPage, /watch\(\[\(\) => generationTasks\.currentScopeTasks, \(\) => previewDrafts\.drafts\]/u);
});

test('home organize mode is explicit and Dock rejects unsupported drops instead of displacing items', () => {
  assert.match(source, /isOrganizing = ref\(false\)/u);
  assert.match(source, /\{\{ isOrganizing \? '完成' : '整理' \}\}/u);
  assert.match(source, /Dock 只能放置 App，文件夹请留在主界面/u);
  assert.match(source, /Dock 已满，请先移出一个 App/u);
  assert.match(source, /height: calc\(100% - 20px\)/u);
  assert.match(source, /event\.button !== 0 \|\| homePages\.value\.length < 1 \|\| isOrganizing\.value/u);
});
