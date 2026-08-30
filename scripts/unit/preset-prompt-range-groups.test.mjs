/* eslint-disable import-x/no-named-as-default-member, import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../../src/apps/preset-manager/promptGroups.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const groups = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

function legacyRoot() {
  return {
    extensions: {
      baibaiToolkit: {
        presetPromptGroups: {
          groups: [{ collapsed: false, enabled: true, id: 'story', name: '正文' }],
          prompts: {
            first: { groupId: 'story' },
            third: { groupId: 'story' },
          },
        },
      },
    },
  };
}

test('legacy assignments become one inclusive ordered range', () => {
  const promptIds = ['first', 'second', 'third', 'fourth'];
  const root = legacyRoot();
  const [group] = groups.readPresetPromptGroups(root, promptIds);

  assert.equal(group.startPromptId, 'first');
  assert.equal(group.endPromptId, 'third');
  assert.equal(group.selectionMode, 'multiple');
  assert.deepEqual([...groups.buildPresetPromptGroupIds([group], promptIds).keys()], ['first', 'second', 'third']);

  const written = groups.writePresetPromptGroups(root, promptIds);
  assert.equal(written.version, 2);
  assert.equal(written.prompts, undefined);
});

test('range updates reject reversed and overlapping boundaries', () => {
  const promptIds = ['first', 'second', 'third', 'fourth'];
  const root = legacyRoot();
  groups.writePresetPromptGroups(root, promptIds);
  root.extensions.baibaiToolkit.presetPromptGroups.groups.push({
    collapsed: false,
    enabled: true,
    endPromptId: '',
    id: 'tail',
    name: '收尾',
    startPromptId: '',
  });

  assert.throws(() => groups.setPresetPromptGroupRange(root, promptIds, 'tail', 'fourth', 'second'), /之后/u);
  assert.throws(() => groups.setPresetPromptGroupRange(root, promptIds, 'tail', 'second', 'fourth'), /重叠/u);
  groups.setPresetPromptGroupRange(root, promptIds, 'tail', 'fourth', 'fourth');
  assert.equal(root.extensions.baibaiToolkit.presetPromptGroups.groups[1].startPromptId, 'fourth');
});

test('copying the range end extends it and deleting either boundary dissolves the group', () => {
  const root = legacyRoot();
  const copiedIds = ['first', 'second', 'third', 'copy', 'fourth'];
  groups.extendPresetPromptGroupAfterDuplicate(root, copiedIds, 'third', 'copy');
  assert.equal(root.extensions.baibaiToolkit.presetPromptGroups.groups[0].endPromptId, 'copy');

  groups.removePresetPromptBoundaryGroups(root, copiedIds, 'copy');
  assert.deepEqual(root.extensions.baibaiToolkit.presetPromptGroups.groups, []);
});

test('reordering inside a group keeps the same prompts inside its boundaries', () => {
  const root = legacyRoot();
  groups.rebasePresetPromptGroupRanges(
    root,
    ['first', 'second', 'third', 'fourth'],
    ['third', 'second', 'first', 'fourth'],
  );
  const [group] = root.extensions.baibaiToolkit.presetPromptGroups.groups;
  assert.equal(group.startPromptId, 'third');
  assert.equal(group.endPromptId, 'first');
});

test('single-select groups enable one prompt atomically and still allow none', () => {
  const root = legacyRoot();
  const prompts = [
    { enabled: true, id: 'first' },
    { enabled: true, id: 'second' },
    { enabled: false, id: 'third' },
    { enabled: true, id: 'fourth' },
  ];

  assert.throws(
    () => groups.setPresetPromptGroupSelectionMode(root, prompts, 'story', 'single'),
    /选择一个保留/u,
  );
  groups.setPresetPromptGroupSelectionMode(root, prompts, 'story', 'single', 'second');
  assert.deepEqual(
    prompts.map(prompt => prompt.enabled),
    [false, true, false, true],
  );

  groups.applyPresetPromptSelection(root, prompts, 'third', true);
  assert.deepEqual(
    prompts.map(prompt => prompt.enabled),
    [false, false, true, true],
  );
  groups.applyPresetPromptSelection(root, prompts, 'third', false);
  assert.deepEqual(
    prompts.map(prompt => prompt.enabled),
    [false, false, false, true],
  );
});
