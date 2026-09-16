/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { createSourceFile, ScriptTarget, transpileModule, ModuleKind } from 'typescript';

async function functions(path, names, context) {
  let source = await readFile(new URL('../../' + path, import.meta.url), 'utf8');
  if (path.endsWith('.vue')) source = source.split('<script setup lang="ts">')[1].split('</script>')[0];
  const ast = createSourceFile(path, source, ScriptTarget.Latest, true);
  const code = ast.statements
    .filter(n => names.includes(n.name?.getText(ast)))
    .map(n => n.getText(ast).replace(/^export /u, ''))
    .join('\n');
  return runInNewContext(
    transpileModule(code, {
      compilerOptions: { target: ScriptTarget.ES2022, module: ModuleKind.ESNext },
    }).outputText +
      '\n({' +
      names.join(',') +
      '})',
    context,
  );
}
const ref = value => ({ value });
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};

test('entry library ignores late source output, keeps loaded source identity, and blocks stale collection', async () => {
  const a = deferred(),
    b = deferred(),
    messages = [];
  const c = {
    sourceRevision: 0,
    loadedSource: null,
    selectedSourceName: ref('A'),
    sourceType: ref('worldbook'),
    sourceLoading: ref(false),
    sourceEntries: ref([]),
    selectedSourceKeys: ref(new Set()),
    getWorldbookEntries: name => (name === 'A' ? a.promise : b.promise),
    toastr: { error: x => messages.push(x), warning: x => messages.push(x) },
  };
  const f = await functions('src/apps/entry-library/EntryLibraryApp.vue', ['loadSourceEntries', 'collectSelected'], c);
  const first = f.loadSourceEntries();
  c.selectedSourceName.value = 'B';
  const second = f.loadSourceEntries();
  b.resolve([{ uid: 2, name: 'B', content: 'B' }]);
  await second;
  a.resolve([{ uid: 1, name: 'A', content: 'A' }]);
  await first;
  assert.equal(c.sourceEntries.value[0].content, 'B');
  assert.equal(c.loadedSource.name, 'B');
  c.selectedSourceName.value = 'C';
  await f.collectSelected();
  assert.match(messages[0], /来源已变化/);
});

test('snapshot detail accepts only the last request including loading and errors', async () => {
  const a = deferred(),
    b = deferred(),
    errors = [];
  const c = {
    detailRevision: 0,
    activeSnapshotId: ref('A'),
    route: ref({ page: 'detail' }),
    detailPayload: ref(null),
    detailLoading: ref(false),
    repository: { readSnapshot: id => (id === 'A' ? a.promise : b.promise) },
    toastr: { error: x => errors.push(x) },
  };
  const f = await functions('src/apps/file-repository/FileRepositoryApp.vue', ['loadDetail'], c);
  const first = f.loadDetail();
  c.activeSnapshotId.value = 'B';
  const second = f.loadDetail();
  a.reject(new Error('old failure'));
  await first;
  assert.equal(c.detailLoading.value, true);
  assert.equal(errors.length, 0);
  b.resolve({ id: 'B' });
  await second;
  assert.equal(c.detailPayload.value.id, 'B');
  assert.equal(c.detailLoading.value, false);
});

for (const action of ['restoreActive', 'removeActive']) {
  test(`${action} keeps the confirmed snapshot ID after navigation`, async () => {
    const confirm = deferred(),
      written = [];
    const c = {
      activeSnapshot: ref({ id: 'A', createdAt: 'date' }),
      activeSnapshotId: ref('A'),
      detailPayload: ref({}),
      detailLoading: ref(false),
      formatDate: x => x,
      phone: { confirmNotice: () => confirm.promise, goHome() {}, goBack() {} },
      repository: {
        snapshots: [{ id: 'A' }, { id: 'B' }],
        restoreSnapshot: id => written.push(id),
        removeSnapshot: id => written.push(id),
      },
      toastr: {
        success() {},
        error: error => {
          throw error;
        },
      },
    };
    const f = await functions('src/apps/file-repository/FileRepositoryApp.vue', [action], c);
    const pending = f[action]();
    c.activeSnapshot.value = { id: 'B' };
    c.activeSnapshotId.value = 'B';
    confirm.resolve(true);
    await pending;
    assert.deepEqual(written, ['A']);
  });
}

test('extension update continues after failure and notifies reload after partial success', async () => {
  const calls = [],
    notices = [],
    reload = [];
  const c = {
    selectedUpdateRows: ref([{ name: 'A' }, { name: 'B' }, { name: 'C' }]),
    updating: ref(false),
    updateThirdPartyExtension: async row => {
      calls.push(row.name);
      if (row.name === 'B') throw new Error('offline');
    },
    phone: { noticeInfo: (...x) => notices.push(x) },
    notifyExtensionReloadRequired: (...x) => reload.push(x),
    refreshInstalled: async () => calls.push('refresh'),
  };
  const f = await functions('src/apps/extension-transfer/ExtensionTransferApp.vue', ['updateSelected'], c);
  await f.updateSelected();
  assert.deepEqual(calls, ['A', 'B', 'C', 'refresh']);
  assert.equal(c.updating.value, false);
  assert.match(notices[0][0], /B/);
  assert.match(reload[0][1], /成功 2，失败 1/);
});

test('script move uses latest content and refuses missing selected scripts', async () => {
  let snapshot = { global: [{ type: 'script', id: 'a', content: 'NEW' }], preset: [], character: [] };
  let saved;
  const c = {
    SCRIPT_SCOPES: ['global', 'preset', 'character'].map(id => ({ id })),
    runScriptScopeTransaction: fn => {
      saved = fn(snapshot);
    },
    pruneScriptTrees: (trees, ids) => trees.filter(x => !ids.has(x.id)),
  };
  const f = await functions('src/apps/script-manager/api.ts', ['moveAssistantScriptsToFolder'], c);
  const items = [{ scope: 'global', id: 'a', name: 'A', script: { type: 'script', id: 'a', content: 'OLD' } }];
  f.moveAssistantScriptsToFolder(items, 'Folder');
  assert.equal(saved.global[0].scripts[0].content, 'NEW');
  snapshot = { global: [], preset: [], character: [] };
  assert.throws(() => f.moveAssistantScriptsToFolder(items, 'Folder'), /已不存在/);
});

test('chat insertion rejects changed scope before calling the host', async () => {
  let wrote = false;
  const c = {
    getCurrentChatScopeKey: () => 'B',
    isPlaceholderChatScopeKey: () => false,
    areChatScopeKeysEquivalent: (a, b) => a === b,
    getOptionalGlobalFunction: () => () => {
      wrote = true;
    },
  };
  const f = await functions('src/util/chatInsert.ts', ['applyChatInsert'], c);
  await assert.rejects(f.applyChatInsert({ scopeKey: 'A' }), /聊天已切换/);
  assert.equal(wrote, false);
});

test('chat changes after host insertion do not save the new chat or claim the write was cancelled', async () => {
  let scope = 'A';
  let saved = false;
  const c = {
    getCurrentChatScopeKey: () => scope,
    isPlaceholderChatScopeKey: () => false,
    areChatScopeKeysEquivalent: (a, b) => a === b,
    formatChatInsertTemplate: () => 'inserted',
    resolveAppendTarget: () => 'end',
    getOptionalGlobalFunction: () => async () => {
      scope = 'B';
    },
    saveChatIfAvailable: async () => {
      saved = true;
    },
  };
  const f = await functions('src/util/chatInsert.ts', ['applyChatInsert'], c);
  await assert.rejects(f.applyChatInsert({ scopeKey: 'A', mode: 'new-end' }), /写入后聊天已切换/);
  assert.equal(saved, false);
});

test('MVU patches preserve unrelated latest fields, and undo checks field conflicts', async () => {
  const c = {
    cloneMvuStatData: x => JSON.parse(JSON.stringify(x)),
    formatMvuPath: path => path.join('.'),
    getMvuPathValue: (x, path) => path.reduce((o, k) => o?.[k], x),
  };
  const f = await functions('src/apps/mvu-modifier/patches.ts', ['isObject', 'diffMvuFields', 'applyMvuFields'], c);
  const patches = f.diffMvuFields({ player: { hp: 1, gold: 2 } }, { player: { hp: 5, gold: 2 } });
  const latest = { player: { hp: 3, gold: 99 }, newField: true };
  const updated = f.applyMvuFields(latest, patches, false);
  assert.equal(updated.player.hp, 5);
  assert.equal(updated.player.gold, 99);
  assert.equal(updated.newField, true);
  const actualPatch = f.diffMvuFields(latest, updated);
  const reverse = actualPatch.map(p => ({ ...p, before: p.after, after: p.before }));
  assert.equal(f.applyMvuFields(updated, reverse, true).player.hp, 3);
  assert.throws(() => f.applyMvuFields({ player: { hp: 8 } }, reverse, true), /已被修改/);
  const arrayPatch = f.diffMvuFields({ a: [1, 2] }, { a: [2] });
  assert.throws(() => f.applyMvuFields({ a: [1, 2, 3] }, arrayPatch, false), /已被修改/);
});

test('MVU writes the latest concrete floor and undo preserves intervening unrelated changes', async () => {
  let floor = 8;
  let latest = { stat_data: { hp: 3, gold: 99 }, metadata: 'keep' };
  const writes = [],
    errors = [];
  const c = {
    sourceData: ref({ stat_data: { hp: 1, gold: 2 } }),
    statData: ref({ hp: 1, gold: 2 }),
    busy: ref(false),
    phone: { isViewingCurrentChat: true },
    contextVersion: ref(1),
    activeChatKey: ref('A'),
    saveRevision: 0,
    savingContextVersion: ref(null),
    scope: ref('message'),
    errorMessage: ref(''),
    undoStack: ref([]),
    redoStack: ref([]),
    HISTORY_LIMIT: 20,
    cloneMvuStatData: structuredClone,
    getLastMessageIdSafe: () => floor,
    isMvuContextCurrent: () => true,
    areChatScopeKeysEquivalent: (a, b) => a === b,
    readMvuStatData: data => structuredClone(data.stat_data),
    mergeMvuStatData: (source, stat_data) => ({ ...source, stat_data }),
    formatMvuPath: path => path.join('.'),
    getMvuPathValue: (x, path) => path.reduce((o, k) => o?.[k], x),
    toastr: { error: e => errors.push(e) },
    resolveMvuRuntime: async () => ({
      getMvuData: options => {
        assert.equal(options.message_id, floor);
        return latest;
      },
      replaceMvuData: async (data, options) => {
        writes.push(options.message_id);
        latest = data;
      },
    }),
  };
  Object.assign(
    c,
    await functions('src/apps/mvu-modifier/patches.ts', ['isObject', 'diffMvuFields', 'applyMvuFields'], c),
  );
  const f = await functions('src/apps/mvu-modifier/MvuModifierApp.vue', ['sameData', 'pushUndo', 'persistSnapshot'], c);
  const before = await f.persistSnapshot({ hp: 5, gold: 2 });
  assert.equal(before.hp, 3);
  assert.equal(latest.stat_data.gold, 99);
  assert.equal(latest.metadata, 'keep');
  const history = c.undoStack.value[0];
  latest.stat_data.gold = 100;
  await f.persistSnapshot(c.statData.value, history, true);
  assert.equal(latest.stat_data.hp, 3);
  assert.equal(latest.stat_data.gold, 100);
  floor = 9;
  assert.equal(await f.persistSnapshot(c.statData.value, history), false);
  assert.deepEqual(writes, [8, 8]);
  assert.match(errors.at(-1), /目标楼层或作用域已变化/);
  c.isMvuContextCurrent = () => false;
  assert.equal(await f.persistSnapshot({ hp: 7 }), false);
  assert.deepEqual(writes, [8, 8]);
});

test('workbench freezes the original template values while confirmation is open', async () => {
  const confirmation = deferred(),
    calls = [];
  const c = {
    areChatScopeKeysEquivalent: (a, b) => a === b,
    getCurrentChatScopeKey: () => 'A',
    previewInsertDraft: () => 'preview',
    phone: { confirmNotice: () => confirmation.promise },
    applyChatInsert: async options => calls.push(options),
    workbench: { deleteInsertDraft() {} },
    toastr: {
      success() {},
      warning() {},
      error: e => {
        throw e;
      },
    },
  };
  const f = await functions('src/apps/workbench/WorkbenchApp.vue', ['confirmInsertDraft'], c);
  const draft = {
    id: 'one',
    scopeKey: 'A',
    content: 'literal {{source}}',
    template: '{{content}}',
    workflowName: 'First',
  };
  const pending = f.confirmInsertDraft(draft);
  Object.assign(draft, { content: 'new', template: 'new', workflowName: 'Second' });
  confirmation.resolve(true);
  await pending;
  assert.equal(calls[0].content, 'literal {{source}}');
  assert.equal(calls[0].title, 'First');
});

test('chat insertion freezes the selected last floor, template and references before confirmation', async () => {
  const confirmation = deferred(),
    calls = [];
  const c = {
    preview: ref('preview'),
    getCurrentChatScopeKey: () => 'A',
    isPlaceholderChatScopeKey: () => false,
    getLastMessageIdSafe: () => 8,
    settings: ref({ mode: 'append-last', template: '{{references}}', role: 'assistant' }),
    referenceTokens: ref([]),
    referenceContents: ref(['original']),
    phone: { confirmNotice: () => confirmation.promise },
    applyChatInsert: async options => {
      calls.push(options);
      return options;
    },
    toastr: {
      success() {},
      warning() {},
      error: e => {
        throw e;
      },
    },
  };
  const f = await functions('src/apps/chat-insert/ChatInsertApp.vue', ['confirmInsert'], c);
  const pending = f.confirmInsert();
  c.getLastMessageIdSafe = () => 9;
  c.settings.value.template = 'changed';
  c.referenceContents.value[0] = 'changed';
  confirmation.resolve(true);
  await pending;
  assert.equal(calls[0].targetMessageId, 8);
  assert.equal(calls[0].template, '{{references}}');
  assert.equal(calls[0].references[0], 'original');
});
