/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

const [rawEditor, forumPreview, forumBoard, forumApp, builtinPrompts, forumGeneration, theaterGeneration, promptStore] =
  await Promise.all([
    readSource('src/components/RawOutputEditor.vue'),
    readSource('src/apps/forum/ForumPreviewPage.vue'),
    readSource('src/apps/forum/ForumBoardPage.vue'),
    readSource('src/apps/forum/ForumApp.vue'),
    readSource('src/apps/builtinPrompts.ts'),
    readSource('src/core/forumGeneration.ts'),
    readSource('src/core/theaterGeneration.ts'),
    readSource('src/store/prompts.ts'),
  ]);

test('shared raw output editor forwards the declared props binding without cleaning before reparsing', () => {
  assert.match(rawEditor, /const props = withDefaults\(/);
  assert.match(rawEditor, /emit\('reparse'\);/);
  assert.doesNotMatch(rawEditor, /cleanGenerationOutput\(props\.modelValue,/);
});

test('forum preview opens Bagu only through the shared preview view', () => {
  assert.match(forumPreview, /:scan-enabled="action === 'thread'"/);
  assert.match(forumPreview, /@update:content="\$emit\('apply-thread-content', \$event\)"/);
  assert.doesNotMatch(forumPreview, /<BaguScanPanel\b/);
  assert.doesNotMatch(forumPreview, /import BaguScanPanel/);
});

test('forum board keeps latest reply ordering without exposing a sort selector', () => {
  assert.doesNotMatch(forumBoard, /pc-sort-group|sortOptions|sortMode|帖子排序/);
  assert.doesNotMatch(forumApp, /sortOptions|sortMode|sortedThreads|ThreadSortMode/);
  assert.match(forumApp, /const filteredThreads = computed/);
  assert.match(forumApp, /return rightLatestReplyAt\.localeCompare\(leftLatestReplyAt\)/);
});

test('forum board description and theater type name are editable task-template variables', () => {
  assert.match(
    builtinPrompts,
    /defaultTemplate: lines\('\{\{boardInstruction\}\}', '\{\{boardDescriptionInstruction\}\}'\)/,
  );
  assert.match(builtinPrompts, /key: 'boardDescription', label: '板块说明正文'/);
  assert.match(builtinPrompts, /defaultTemplate: '本次小剧场类型为“\{\{typeName\}\}”。'/);
  assert.match(builtinPrompts, /key: 'typeName', label: '小剧场类型名称'/);

  assert.match(forumGeneration, /boardDescriptionInstruction: buildBoardDescriptionInstruction\(config\)/);
  assert.match(forumGeneration, /context: ''/);
  assert.match(theaterGeneration, /taskTemplateVariables:\s*\{\s*typeInstruction,\s*typeName,/);
  assert.match(theaterGeneration, /typePrompt: config\.typePrompt\.trim\(\)/);
  assert.doesNotMatch(theaterGeneration, /config\.typePrompt\.trim\(\) \|\|/);
});

test('legacy generated task defaults migrate without repeatedly replacing later blank theater templates', () => {
  assert.match(promptStore, /hasLegacyForumAndTheaterDefaults/);
  assert.match(promptStore, /needsTaskTemplateCoverageMigration/);
  assert.match(promptStore, /settings\.taskTemplates\['forum\.generate-thread'\] = currentForumThreadTaskTemplate/);
  assert.match(promptStore, /hasLegacyForumAndTheaterDefaults \|\| needsTaskTemplateCoverageMigration/);
  assert.match(promptStore, /settings\.taskTemplates\['theater\.generate'\] = currentTheaterTaskTemplate/);
  assert.match(promptStore, /settings\.taskTemplates\['theater\.generate'\]\?\.trim\(\) === legacyTheaterTaskTemplate/);
  assert.match(
    promptStore,
    /settings\.taskTemplates\['relationship\.generate'\]\?\.trim\(\) === legacyRelationshipTaskTemplate/,
  );
});
