/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { createSourceFile, ScriptTarget, transpileModule, ModuleKind } from 'typescript';

const source = await readFile(new URL('../../src/apps/preset-manager/api.ts', import.meta.url), 'utf8');
const groupsSource = await readFile(new URL('../../src/apps/preset-manager/promptGroups.ts', import.meta.url), 'utf8');
const compilerOptions = { target: ScriptTarget.ES2022, module: ModuleKind.ESNext };
const groups = await import(
  'data:text/javascript;base64,' +
    Buffer.from(transpileModule(groupsSource, { compilerOptions }).outputText).toString('base64')
);
const ast = createSourceFile('api.ts', source, ScriptTarget.Latest, true);
const names = ['removePrompt', 'removePresetPrompts', 'deleteTavernPresetPrompts'];
const code = transpileModule(
  ast.statements
    .filter(node => names.includes(node.name?.getText(ast)))
    .map(node => node.getText(ast).replace(/^export /u, ''))
    .join('\n'),
  { compilerOptions },
).outputText;
function fixture({ liveFail = false, missing = false } = {}) {
  const preset = {
    prompts: ['a', 'b', 'c', 'd'].map(id => ({ id, content: id, enabled: true })),
    extensions: {
      baibaiToolkit: {
        presetPromptGroups: { groups: [{ id: 'g', name: 'Group', startPromptId: 'a', endPromptId: 'c' }] },
      },
    },
  };
  const stored = structuredClone(preset);
  if (missing) stored.prompts = stored.prompts.filter(p => p.id !== 'c');
  const calls = [];
  const api = runInNewContext(code + '\n({deleteTavernPresetPrompts})', {
    removePresetPromptBoundaryGroups: groups.removePresetPromptBoundaryGroups,
    normalizeInChatPromptOrder: () => {},
    enqueuePresetMutation: (_name, task) => task(),
    getCurrentTavernPresetName: () => 'Test',
    assertPreset: value => value,
    requirePresetFunction: () => async (name, update) => {
      calls.push(name);
      if (name === 'in_use' && liveFail) throw Error('live fail');
      return update(name === 'in_use' ? preset : stored);
    },
  });
  return { run: ids => api.deleteTavernPresetPrompts('Test', ids), calls, stored };
}
test('batch saves once per stored/live copy and shrinks group without absorbing neighbors', async () => {
  const f = fixture();
  const result = await f.run(['a', 'c']);
  assert.deepEqual(f.calls, ['Test', 'in_use']);
  assert.deepEqual(
    result.preset.prompts.map(p => p.id),
    ['b', 'd'],
  );
  const [group] = groups.readPresetPromptGroups(result.preset, ['b', 'd']);
  assert.equal(group.startPromptId, 'b');
  assert.equal(group.endPromptId, 'b');
});
test('missing target rejects before any in-memory removal', async () => {
  const f = fixture({ missing: true });
  await assert.rejects(f.run(['a', 'c']), /发生变化/u);
  assert.deepEqual(
    f.stored.prompts.map(p => p.id),
    ['a', 'b', 'd'],
  );
});
test('live failure reports partial success after stored mutation', async () => {
  const f = fixture({ liveFail: true });
  const result = await f.run(['a', 'b', 'c']);
  assert.equal(result.liveSynced, false);
  assert.deepEqual(
    result.preset.prompts.map(p => p.id),
    ['d'],
  );
  assert.deepEqual(groups.readPresetPromptGroups(result.preset, ['d']), []);
});
