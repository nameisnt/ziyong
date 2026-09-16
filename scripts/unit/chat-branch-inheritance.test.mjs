/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { createSourceFile, ScriptTarget, transpileModule } from 'typescript';

const source = await readFile(new URL('../../src/util/chatBranchInheritance.ts', import.meta.url), 'utf8');
const ast = createSourceFile('branch.ts', source, ScriptTarget.Latest, true);
const functions = ast.statements
  .filter(n => ['getBranchSource', 'installChatBranchInheritance'].includes(n.name?.getText(ast)))
  .map(n => n.getText(ast).replace(/^export /u, ''))
  .join('\n');
const code = transpileModule(functions, { compilerOptions: { target: ScriptTarget.ES2022 } }).outputText;
const scope = name => `char:card.png:chat:${name}`;
const saveFunction = ast.statements.find(n => n.name?.getText(ast) === 'saveInheritedSettings').getText(ast);

test('inheritance requires a native settings-save acknowledgement before completion', async () => {
  let listener;
  let acknowledge = false;
  const f = runInNewContext(
    transpileModule(saveFunction, { compilerOptions: { target: ScriptTarget.ES2022 } }).outputText +
      '\nsaveInheritedSettings',
    {
      getSillyTavernContext: () => ({
        eventSource: {
          on: (_name, fn) => {
            listener = fn;
          },
          off: () => {
            listener = null;
          },
        },
      }),
      getTavernEventName: () => 'saved',
      saveSettings: async () => {
        if (acknowledge) listener();
      },
    },
  );
  await assert.rejects(f(), /尚未成功保存/u);
  assert.equal(listener, null);
  acknowledge = true;
  await f();
  assert.equal(listener, null);
});
const context = {
  metadataKey: 'phone_branch_origin',
  parseChatScopeKey: key => ({ kind: 'char', ownerId: key.split(':chat:')[0], chatId: key.split(':chat:')[1] }),
  normalizeChatScopeId: x => x.replace(/\.jsonl$/u, ''),
};

test('branch origin identifies copied stamps, not old chats or ordinary navigation', () => {
  const f = runInNewContext(code + '\ngetBranchSource', context);
  assert.equal(f(undefined, scope('B'), 'A'), undefined);
  assert.equal(f({ scope: scope('A') }, scope('B'), 'A'), scope('A'));
  assert.equal(f({ scope: scope('A') }, scope('B'), 'X'), undefined);
  assert.equal(f({ scope: scope('A') }, scope('A'), 'A'), undefined);
  assert.equal(f({ scope: scope('B'), source: scope('A'), completed: ['preset'] }, scope('B'), 'A'), scope('A'));
  assert.equal(f({ scope: scope('A') }, 'char:other.png:chat:B', 'A'), undefined);
});

test('native listener copies only five domains, resumes failure and never repeats completed copies', async () => {
  let handler;
  let fail = true;
  const calls = [];
  const metadata = { main_chat: 'A', phone_branch_origin: { scope: scope('A') } };
  const runtime = {
    chatMetadata: metadata,
    saveMetadata: async () => {},
    eventSource: {
      makeFirst: (name, fn) => {
        handler = fn;
      },
      off: () => {},
    },
  };
  const copy = id => () => {
    calls.push(id);
    if (id === 'slots' && fail) throw new Error('test failure');
  };
  const install = runInNewContext(code + '\ninstallChatBranchInheritance', {
    ...context,
    getCurrentChatScopeKey: () => scope('B'),
    isPlaceholderChatScopeKey: () => false,
    getSillyTavernContext: () => runtime,
    getTavernEventName: () => 'changed',
    nextTick: async () => {},
    saveInheritedSettings: async () => {},
    toastr: { success: () => {}, error: () => {} },
    usePresetLinkStore: () => ({ inheritBinding: copy('preset') }),
    useWorldbookLinkStore: () => ({ inheritProfiles: copy('worldbook') }),
    useWorldSlotsStore: () => ({ inheritScope: copy('slots') }),
    useGenerationAliasesStore: () => ({ inheritScope: copy('aliases') }),
    useStatusDisplayStore: () => ({ inheritScope: copy('status') }),
  });
  let applied = 0;
  install({}, async () => {
    applied += 1;
  });
  assert.deepEqual(calls, ['preset', 'worldbook', 'slots']);
  fail = false;
  await handler();
  assert.deepEqual(calls, ['preset', 'worldbook', 'slots', 'slots', 'aliases', 'status']);
  await handler();
  assert.equal(calls.length, 6);
  assert.equal(applied, 1);
  assert.equal(metadata.phone_branch_origin.scope, scope('B'));
  assert.equal(metadata.phone_branch_origin.source, undefined);
});
