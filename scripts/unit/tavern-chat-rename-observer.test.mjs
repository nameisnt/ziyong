/* eslint-disable import-x/no-named-as-default-member, import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const app = await readFile(new URL('../../src/App.vue', import.meta.url), 'utf8');
const floorBackup = await readFile(new URL('../../src/util/chatFloorBackup.ts', import.meta.url), 'utf8');
const phoneRename = await readFile(new URL('../../src/util/tavernChatRename.ts', import.meta.url), 'utf8');
const reader = await readFile(new URL('../../src/apps/reader/ReaderApp.vue', import.meta.url), 'utf8');

async function loadObserver() {
  let source = await readFile(new URL('../../src/util/tavernChatRenameObserver.ts', import.meta.url), 'utf8');
  source = source.replace("import type { TavernChatRenamedEvent } from '@/util/chatScopeRename';", '');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: 'tavernChatRenameObserver.ts',
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}#${Date.now()}-${Math.random()}`);
}

test('observes successful native chat rename requests and uses the sanitized name', async () => {
  const originalFetch = globalThis.fetch;
  const mockedFetch = async () =>
    new Response(JSON.stringify({ sanitizedFileName: 'sanitized.jsonl' }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  globalThis.fetch = mockedFetch;
  try {
    const observer = await loadObserver();
    const events = [];
    const handle = observer.onTavernChatRename(event => events.push(event));
    await fetch('/api/chats/rename', {
      body: JSON.stringify({
        avatar_url: 'visual.png',
        is_group: false,
        original_file: 'old.jsonl',
        renamed_file: 'requested.jsonl',
      }),
      method: 'POST',
    });
    handle.stop();

    assert.deepEqual(events, [
      {
        avatarId: 'visual.png',
        groupId: undefined,
        newFileName: 'sanitized.jsonl',
        oldFileName: 'old.jsonl',
      },
    ]);
    assert.equal(globalThis.fetch, mockedFetch);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('ignores phone-owned rename requests to prevent duplicate migrations', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({}), { status: 200 });
  try {
    const observer = await loadObserver();
    const events = [];
    const handle = observer.onTavernChatRename(event => events.push(event));
    await fetch('/api/chats/rename', {
      body: JSON.stringify({
        avatar_url: 'visual.png',
        is_group: false,
        original_file: 'old.jsonl',
        renamed_file: 'new.jsonl',
      }),
      headers: { [observer.phoneChatRenameRequestHeader]: '1' },
      method: 'POST',
    });
    handle.stop();

    assert.deepEqual(events, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('waits for asynchronous rename consumers in registration order', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({}), { status: 200 });
  try {
    const observer = await loadObserver();
    const calls = [];
    const first = observer.onTavernChatRename(async () => {
      await new Promise(resolve => setTimeout(resolve, 5));
      calls.push('first');
    });
    const second = observer.onTavernChatRename(() => calls.push('second'));
    await fetch('/api/chats/rename', {
      body: JSON.stringify({ original_file: 'old.jsonl', renamed_file: 'new.jsonl' }),
      method: 'POST',
    });
    first.stop();
    second.stop();
    assert.deepEqual(calls, ['first', 'second']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('all rename consumers use the shared observer while phone-owned requests carry the skip marker', () => {
  const phoneRenameRequest = phoneRename.slice(
    phoneRename.indexOf("fetch('/api/chats/rename'"),
    phoneRename.indexOf('const result =', phoneRename.indexOf("fetch('/api/chats/rename'")),
  );
  assert.match(app, /onTavernChatRename\(payload =>/u);
  assert.match(floorBackup, /onTavernChatRename\((?:async )?payload =>/u);
  assert.match(reader, /onTavernChatRename\(\(\) =>/u);
  assert.match(phoneRenameRequest, /\[phoneChatRenameRequestHeader\]: '1'/u);
  assert.match(phoneRename, /openWelcomeScreen\(\{ force: true \}\)/u);
  for (const source of [app, floorBackup, reader]) {
    assert.doesNotMatch(source, /onTavernEvent\('CHAT_RENAMED'/u);
  }
});

test('phone rename updates local pointers only after the server and runs follow-ups independently', () => {
  const pointerStart = phoneRename.indexOf('async function updateCurrentCharacterChat');
  const renameStart = phoneRename.indexOf('export async function renameTavernCharacterChat');
  const pointerSource = phoneRename.slice(pointerStart, renameStart);
  assert.ok(
    pointerSource.indexOf("fetch('/api/characters/merge-attributes'") < pointerSource.indexOf('.chat = chatName'),
  );
  assert.match(phoneRename, /Promise\.allSettled\(followUps\.map\(item => item\.run\(\)\)\)/u);
  assert.match(phoneRename, /聊天文件已改名为/u);
});
