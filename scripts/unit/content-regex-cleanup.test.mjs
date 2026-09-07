/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { createSourceFile, isFunctionDeclaration, ScriptTarget, transpileModule, ModuleKind } from 'typescript';

const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
async function moduleAt(path) {
  const code = transpileModule(await read(path), {
    compilerOptions: { target: ScriptTarget.ES2022, module: ModuleKind.ESNext },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}
const { deleteContentRegexUsages, contentRegexUsageKey: key } = await moduleAt('src/util/regexDisplay.ts');
const { removeContentVersion } = await moduleAt('src/util/contentVersions.ts');
async function functionsAt(path, names, context) {
  const ast = createSourceFile(path, await read(path), ScriptTarget.Latest, true);
  const functions = [];
  function visit(node) {
    if (isFunctionDeclaration(node) && names.includes(node.name?.text)) functions.push(node.getText(ast));
    node.forEachChild(visit);
  }
  visit(ast);
  assert.equal(functions.length, names.length);
  const code = transpileModule(functions.join('\n'), { compilerOptions: { target: ScriptTarget.ES2022 } }).outputText;
  return runInNewContext(`${code}; ({ ${names.join(',')} })`, context);
}

for (const [app, path, deleteOne, deleteVersion, deleteParent, collection] of [
  ['theater', 'src/store/theater.ts', 'deleteEntry', 'deleteEntryVersion', null, 'entries'],
  ['extras', 'src/store/extras.ts', 'deleteChapter', 'deleteChapterVersion', 'deleteBook', 'chapters'],
  ['letters', 'src/store/letters.ts', 'deleteEntry', 'deleteEntryVersion', 'deleteBook', 'entries'],
  ['forum', 'src/store/forum.ts', 'deleteThread', 'deleteThreadVersion', 'deleteBoard', 'threads'],
  ['diary', 'src/store/diary.ts', 'deleteEntry', null, 'deleteBook', 'entries'],
  ['summary', 'src/store/summary.ts', 'deleteEntry', null, 'deleteBook', 'entries'],
  ['digest', 'src/apps/digest/store.ts', 'deleteEntry', null, null, 'entries'],
  ['custom-test', 'src/apps/app-builder/store.ts', 'deleteEntry', null, null, 'entries'],
]) {
  test(`${app} deletes only the corresponding content selections through its store`, async () => {
    const versions = ['v1', 'v2'].map(id => ({ id, title: id, content: id, replies: [] }));
    const entry = { id: 'e', activeVersionId: 'v1', versions, replies: [] };
    const sibling = { id: 'sibling' };
    const book = { id: 'b', [collection]: [entry, sibling], summaries: [] };
    const usages = Object.fromEntries(
      [
        key(app, ['e', 'v1']),
        key(app, ['e', 'v2']),
        key(app, ['sibling']),
        key(app, ['unrelated']),
        key('other-app', ['e', 'v1']),
        app,
        ...(app === 'forum' ? [key('forum-reply', ['e', 'v1', 'r']), key('forum-reply', ['e', 'v2', 'r'])] : []),
      ].map(k => [k, {}]),
    );
    const regexStore = await functionsAt('src/apps/regex-display/store.ts', ['deleteContentUsages'], {
      settings: { value: { usages } },
      deleteContentRegexUsages,
    });
    const context = {
      data: { value: { entries: [entry], books: [book], boards: [book] } },
      getBook: () => book,
      getBoard: () => book,
      getEntry: () => entry,
      getChapter: () => entry,
      getThread: () => entry,
      getDefinition: () => ({}),
      getData: () => book,
      nowIso: () => 'now',
      normalizeChapterNumbers: value => value,
      resolveExtraChapterGenerationRecords: () => [],
      removeContentVersion,
      useRegexDisplayStore: () => regexStore,
    };
    const methods = await functionsAt(path, [deleteOne, deleteVersion, deleteParent].filter(Boolean), context);
    if (deleteVersion) {
      const args = app === 'theater' ? ['e', 'v1'] : ['b', 'e', 'v1'];
      methods[deleteVersion](...args);
      assert.equal(usages[key(app, ['e', 'v1'])], undefined);
      assert.ok(usages[key(app, ['e', 'v2'])]);
      assert.equal(entry.activeVersionId, 'v2');
      if (app === 'forum') assert.equal(usages[key('forum-reply', ['e', 'v1', 'r'])], undefined);
      methods[deleteVersion](...args.slice(0, -1), 'v2');
      assert.ok(usages[key(app, ['e', 'v2'])], 'refused final-version deletion must preserve selections');
    }
    methods[deleteOne](...(app === 'theater' || app === 'digest' ? ['e'] : [app === 'custom-test' ? app : 'b', 'e']));
    assert.equal(usages[key(app, ['e', 'v2'])], undefined);
    assert.ok(usages[key(app, ['sibling'])]);
    assert.ok(usages[key(app, ['unrelated'])]);
    assert.ok(usages[key('other-app', ['e', 'v1'])]);
    assert.ok(usages[app], 'App-wide rules must remain');
    if (app === 'forum') assert.equal(usages[key('forum-reply', ['e', 'v2', 'r'])], undefined);
    if (deleteParent) {
      methods[deleteParent]('b');
      assert.equal(usages[key(app, ['sibling'])], undefined);
      assert.ok(usages[key(app, ['unrelated'])]);
    }
  });
}

test('deleting a forum reply only clears the selected version reply usage', async () => {
  const usages = { [key('forum-reply', ['t', 'v1', 'r'])]: {}, [key('forum-reply', ['t', 'v2', 'r'])]: {} };
  const thread = { activeVersionId: 'v1', versions: ['v1', 'v2'].map(id => ({ id, replies: [{ id: 'r' }] })) };
  const methods = await functionsAt('src/store/forum.ts', ['deleteReply'], {
    getBoard: () => ({}),
    getThread: () => thread,
    nowIso: () => 'now',
    useRegexDisplayStore: () => ({
      deleteContentUsages: (app, identity) => deleteContentRegexUsages(usages, app, identity),
    }),
  });
  methods.deleteReply('b', 't', 'r', 'v1');
  assert.equal(usages[key('forum-reply', ['t', 'v1', 'r'])], undefined);
  assert.ok(usages[key('forum-reply', ['t', 'v2', 'r'])]);
  assert.equal(thread.versions[1].replies.length, 1);
});

test('splitting a theater version removes only its old identity selection', async () => {
  const entry = {
    id: 'e',
    activeVersionId: 'v1',
    versions: ['v1', 'v2'].map(id => ({ id, title: id, content: id, renderMode: 'text' })),
  };
  const usages = { [key('theater', ['e', 'v1'])]: {}, [key('theater', ['e', 'v2'])]: {} };
  const data = { value: { entries: [entry] } };
  const methods = await functionsAt('src/store/theater.ts', ['splitEntryVersion'], {
    getEntry: () => entry,
    data,
    nowIso: () => 'now',
    createId: () => 'split',
    removeContentVersion,
    useRegexDisplayStore: () => ({ deleteContentUsages: (app, ids) => deleteContentRegexUsages(usages, app, ids) }),
  });
  const result = methods.splitEntryVersion('e', 'v1');
  assert.equal(result.splitEntry.id, 'split');
  assert.equal(data.value.entries.length, 2);
  assert.equal(usages[key('theater', ['e', 'v1'])], undefined);
  assert.ok(usages[key('theater', ['e', 'v2'])]);
});

test('deleting a custom App clears content selections across all its entry identities', async () => {
  const usages = { [key('custom-a', ['e1'])]: {}, [key('custom-a', ['e2'])]: {}, [key('custom-b', ['e1'])]: {} };
  const methods = await functionsAt('src/apps/app-builder/store.ts', ['deleteDefinition'], {
    definitionSettings: { value: { definitions: [{ id: 'custom-a' }] } },
    globalData: { value: { entries: [], failedDrafts: [] } },
    readChatScopedEnvelope: () => ({ scopes: {} }),
    getCurrentChatScopeKey: () => 'scope',
    customAppChatDataField: 'custom-data',
    extension_settings: {},
    _: { set: () => {} },
    chatDomain: { rehydrateFromSettings: () => {} },
    useRegexDisplayStore: () => ({ deleteContentUsages: (app, ids) => deleteContentRegexUsages(usages, app, ids) }),
  });
  methods.deleteDefinition('custom-a');
  assert.deepEqual(Object.keys(usages), [key('custom-b', ['e1'])]);
});
