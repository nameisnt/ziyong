/* eslint-disable import-x/no-nodejs-modules, import-x/no-dynamic-require */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createRequire } from 'node:module';
import { transpileModule, ModuleKind, ScriptTarget } from 'typescript';
const require = createRequire(import.meta.url);
async function load(file, dependencies = {}) {
  const code = transpileModule(await readFile(new URL(`../../src/${file}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function('exports', 'require', code)(exports, id => dependencies[id] ?? require(id));
  return exports;
}
const model = await load('resource-bundle/model.ts');
async function hostFixture() {
  const settings = { regex: [] };
  const worldInfoCache = new Map();
  const characters = [{ avatar: 'existing.png', name: 'Existing' }];
  const plugins = {
    items: [],
    whenReady: async () => {},
    exportPreset: () => raw,
    importPreset: async (data, name) => {
      plugins.items.push({ name, data });
    },
  };
  const listeners = new Set();
  let saveConfirmed = true,
    refreshFails = false;
  const native = { presets: [raw], preset_names: { Other: 0 } };
  const manager = {
    getPresetList: () => native,
    getCompletionPresetByName: name => {
      assert.equal(name, 'Other');
      return raw;
    },
    savePreset: async (_name, _data, options) => {
      assert.deepEqual(options, { skipUpdate: true });
    },
    select: [{ add: () => {} }],
  };
  const globals = {
    getWorldbookNames: () => ['Existing world'],
    getPresetManager: () => manager,
    loadWorldInfo: async () => ({ entries: { 0: { uid: 0, content: 'world' } } }),
    updateWorldInfoList: async () => {
      if (refreshFails) throw new Error('refresh failed');
    },
  };
  const host = await load('resource-bundle/host.ts', {
    './model': model,
    '@/core/releaseInfo': { RUNNING_VERSION: '1' },
    '@/store/pluginPresets': { usePluginPresetStore: () => plugins },
    '@/apps/preset-manager/api': { getCurrentTavernPresetName: () => 'Current' },
    '@/apps/worldbook-link/api': { getAllWorldbookNames: () => ['Existing world'] },
    '@/util/runtime': {
      getOptionalGlobalFunction: name => globals[name],
      getTavernEventName: () => 'saved',
      getSillyTavernContext: () => ({
        eventSource: { on: (_, fn) => listeners.add(fn), off: (_, fn) => listeners.delete(fn) },
      }),
    },
    '@sillytavern/scripts/extensions': { extension_settings: settings },
    '@sillytavern/scripts/world-info': { worldInfoCache },
    '@sillytavern/script': {
      characters,
      name1: 'User',
      getRequestHeaders: () => ({ 'Content-Type': 'application/json', 'X-CSRF-Token': 'test' }),
      getCharacters: async () => {
        if (refreshFails) throw new Error('refresh failed');
        return characters;
      },
      getPastCharacterChats: async () => [{ file_name: 'existing.jsonl' }],
      saveSettings: async () => {
        if (saveConfirmed) listeners.forEach(fn => fn());
      },
    },
  });
  return {
    host,
    settings,
    plugins,
    characters,
    listeners,
    native,
    worldInfoCache,
    setSaved: value => {
      saveConfirmed = value;
    },
    setRefreshFails: value => {
      refreshFails = value;
    },
  };
}
const { runBundleImport } = await load('resource-bundle/importQueue.ts');
const { runSerialInstall, repositoryIdentity } = await load('apps/extension-transfer/installQueue.ts');
const raw = {
  prompts: [{ identifier: 'a', content: 'A' }],
  prompt_order: [{ character_id: 100001, order: [{ identifier: 'a', enabled: true }] }],
  extensions: {
    grouping: { first: 'a', last: 'a' },
    regex_scripts: [{ id: 'r', scriptName: 'R', findRegex: 'foo' }],
    tavern_helper: {
      variables: { retained: true },
      scripts: [
        { type: 'folder', name: 'folder', enabled: true, scripts: [{ type: 'script', content: 'x', enabled: true }] },
      ],
    },
  },
};
function presetBundle() {
  const split = model.splitPreset(raw);
  const manifest = {
    format: 'phone-resource-bundle',
    version: 1,
    pluginVersion: '1',
    kind: 'preset',
    name: 'test',
    items: [
      { id: '0', name: 'test', kind: 'preset', path: 'resources/0.json' },
      { id: '1', name: 'R', kind: 'regex', parentId: '0', path: 'resources/1.json' },
      { id: '2', name: 'scripts', kind: 'script', parentId: '0', path: 'resources/2.json' },
    ],
  };
  return {
    manifest,
    files: {
      'manifest.json': model.encodeJson(manifest),
      'resources/0.json': model.encodeJson(split.raw),
      'resources/1.json': model.encodeJson(split.regexes[0]),
      'resources/2.json': model.encodeJson(split.scripts[0]),
    },
  };
}
function rows(bundle) {
  return bundle.manifest.items.map(item => ({
    item,
    name: item.name,
    selected: true,
    mode: 'skip',
    status: 'pending',
    conflict: false,
    replaceable: false,
    message: '',
  }));
}
test('preset bundle preserves grouping/order/helper data and selected attachment trees without changing the source', () => {
  const before = structuredClone(raw);
  const split = model.splitPreset(raw);
  const result = model.assemblePreset(split.raw, [], split.scripts);
  assert.deepEqual(raw, before);
  assert.deepEqual(result.prompt_order, raw.prompt_order);
  assert.deepEqual(result.extensions.grouping, raw.extensions.grouping);
  assert.deepEqual(result.extensions.regex_scripts, []);
  assert.equal(result.extensions.tavern_helper.variables.retained, true);
  assert.equal(result.extensions.tavern_helper.scripts[0].enabled, false);
  assert.equal(result.extensions.tavern_helper.scripts[0].scripts[0].enabled, false);
});
test('ZIP round trip retains preset resources; broken paths, missing files and bad dependencies are rejected before writes', () => {
  const { zipSync, unzipSync } = require('fflate');
  const original = presetBundle();
  assert.deepEqual(model.validateBundle(unzipSync(zipSync(original.files))).manifest, original.manifest);
  const missing = { ...original.files };
  delete missing['resources/1.json'];
  assert.throws(() => model.validateBundle(missing), /缺少文件/);
  for (const mutate of [
    m => (m.items[1].parentId = 'wrong'),
    m => (m.items[1].path = '../escape.json'),
    m => (m.items[1].id = '0'),
    m => (m.version = 2),
  ]) {
    const manifest = structuredClone(original.manifest);
    mutate(manifest);
    assert.throws(() => model.validateBundle({ ...original.files, 'manifest.json': model.encodeJson(manifest) }));
  }
});
test('chat import keeps messages, swipes and variables, clears foreign branch origin and reports absent world binding', () => {
  const records = [
    {
      user_name: 'user',
      chat_metadata: {
        phone_branch_origin: { scope: 'old' },
        main_chat: 'old',
        world_info: 'missing',
        variables: { hp: 7 },
      },
    },
    { name: 'char', mes: 'A', swipes: ['A', 'B'], swipe_id: 1 },
  ];
  const bytes = new TextEncoder().encode(records.map(JSON.stringify).join('\n'));
  const prepared = model.prepareChat(bytes, []);
  const result = model.readChat(prepared.bytes);
  assert.deepEqual(result[1], records[1]);
  assert.deepEqual(result[0].chat_metadata, { variables: { hp: 7 } });
  assert.equal(prepared.warnings.length, 2);
  assert.equal(model.readChat(bytes)[0].chat_metadata.main_chat, 'old');
  assert.throws(() => model.readChat(new TextEncoder().encode('{"user_name":"u"}\nbad')), /第 2 行/);
});
test('preset attachments are written once with the parent; failure retry does not repeat successful resources', async () => {
  const bundle = presetBundle();
  const items = rows(bundle);
  let calls = 0;
  await runBundleImport(
    bundle,
    items,
    () => false,
    async () => {
      calls++;
      throw new Error('offline');
    },
    () => {},
  );
  assert.ok(items.every(row => row.status === 'failed'));
  await runBundleImport(
    bundle,
    items,
    () => false,
    async () => {
      calls++;
      return { message: 'ok' };
    },
    () => {},
  );
  await runBundleImport(
    bundle,
    items,
    () => false,
    async () => {
      calls++;
      return { message: 'ok' };
    },
    () => {},
  );
  assert.equal(calls, 2);
  assert.ok(items.every(row => row.status === 'success'));
});
test('worldbook failure pauses dependent regex, while successful parent is not written on child retry', async () => {
  const bundle = presetBundle();
  bundle.manifest.kind = 'worldbook';
  bundle.manifest.items[0].kind = 'worldbook';
  bundle.manifest.items.pop();
  const items = rows(bundle);
  const calls = [];
  await runBundleImport(
    bundle,
    items,
    () => false,
    async row => {
      calls.push(row.item.id);
      throw new Error('failed');
    },
    () => {},
  );
  assert.deepEqual(calls, ['0']);
  await runBundleImport(
    bundle,
    items,
    () => false,
    async row => {
      calls.push(row.item.id);
      if (row.item.id === '1') throw new Error('failed');
      return { message: 'ok' };
    },
    () => {},
  );
  await runBundleImport(
    bundle,
    items,
    () => false,
    async row => {
      calls.push(row.item.id);
      return { message: 'ok' };
    },
    () => {},
  );
  assert.deepEqual(calls, ['0', '0', '1', '1']);
});
test('extension installation has only one active request and keeps walking after a handled failure', async () => {
  let active = 0,
    max = 0;
  const order = [];
  await runSerialInstall([1, 2, 3], async value => {
    active++;
    max = Math.max(active, max);
    order.push(value);
    await new Promise(resolve => setTimeout(resolve, 5));
    active--;
  });
  assert.equal(max, 1);
  assert.deepEqual(order, [1, 2, 3]);
  assert.equal(repositoryIdentity('https://github.com/a/repo.git/'), repositoryIdentity('https://github.com/a/repo'));
});
test('HTTP 409 is skipped only when a discovered extension has the same remote and a valid commit', async () => {
  const api = await load('apps/extension-transfer/api.ts', {
    '@sillytavern/script': { getRequestHeaders: () => ({}) },
    './installQueue': { repositoryIdentity },
  });
  const previous = globalThis.fetch;
  const item = { url: 'https://github.com/a/repo', scope: 'local', branch: '' };
  try {
    let remote = 'https://github.com/a/repo.git';
    globalThis.fetch = async path =>
      path.endsWith('/install')
        ? new Response('Directory already exists', { status: 409 })
        : Response.json(
            path.endsWith('/discover')
              ? [{ name: 'third-party/repo', type: 'local' }]
              : { remoteUrl: remote, currentCommitHash: 'abc' },
          );
    assert.equal(await api.installThirdPartyExtension(item), 'skipped');
    remote = 'https://github.com/b/repo';
    await assert.rejects(api.installThirdPartyExtension(item), /Directory already exists/);
  } finally {
    globalThis.fetch = previous;
  }
});

test('export reads the named non-current preset and selects only its attachments', async () => {
  const { host } = await hostFixture();
  const plan = await host.planExport({ kind: 'preset', name: 'Other' });
  assert.equal(plan.rows.length, 3);
  assert.equal(plan.manifest.items[0].presetSource, 'tavern');
  assert.deepEqual(model.decodeJson(await plan.rows[0].read()).prompt_order, raw.prompt_order);
  assert.equal(model.decodeJson(await plan.rows[1].read()).scriptName, 'R');
});
test('worldbook regex export is opt-in and detached from later settings edits', async () => {
  const { host, settings } = await hostFixture();
  settings.regex.push({ id: 'r', scriptName: 'Before', findRegex: 'x' });
  const plan = await host.planExport({ kind: 'worldbook', name: 'World' });
  assert.equal(plan.rows[1].selected, false);
  settings.regex[0].scriptName = 'After';
  assert.equal(model.decodeJson(await plan.rows[1].read()).scriptName, 'Before');
});
test('global regex import requires save confirmation and restores memory when persistence fails', async () => {
  const fixture = await hostFixture();
  const bundle = presetBundle();
  const item = rows(bundle)[1];
  const context = { presetTarget: 'plugin', characterAvatar: '', characterName: '' };
  fixture.setSaved(false);
  await assert.rejects(fixture.host.importResource(bundle, item, [item], context), /未确认/);
  assert.equal(fixture.settings.regex.length, 0);
  assert.equal(fixture.listeners.size, 0);
  fixture.setSaved(true);
  await fixture.host.importResource(bundle, item, [item], context);
  assert.equal(fixture.settings.regex.length, 1);
  assert.equal(fixture.settings.regex[0].disabled, true);
  assert.notEqual(fixture.settings.regex[0].id, 'r');
});
test('character response determines chat target, and a post-write refresh failure does not cause a duplicate retry', async () => {
  const fixture = await hostFixture();
  fixture.setRefreshFails(true);
  const bundle = presetBundle();
  bundle.manifest.kind = 'character';
  bundle.manifest.items = [{ id: '0', kind: 'character', name: 'Imported', path: 'resources/0.png' }];
  bundle.files['resources/0.png'] = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const items = rows(bundle);
  const context = { presetTarget: 'plugin', characterAvatar: '', characterName: '' };
  let calls = 0;
  const previous = globalThis.fetch;
  globalThis.fetch = async (path, init) => {
    calls++;
    assert.equal(path, '/api/characters/import');
    assert.equal(init.headers.has('Content-Type'), false);
    assert.equal(init.headers.get('X-CSRF-Token'), 'test');
    assert.equal(init.body.get('file_type'), 'png');
    return Response.json({ file_name: 'new-card' });
  };
  try {
    const apply = row => fixture.host.importResource(bundle, row, items, context);
    await runBundleImport(
      bundle,
      items,
      () => !!context.characterAvatar,
      apply,
      () => {},
    );
    await runBundleImport(
      bundle,
      items,
      () => !!context.characterAvatar,
      apply,
      () => {},
    );
    assert.equal(context.characterAvatar, 'new-card.png');
    assert.equal(items[0].status, 'success');
    assert.match(items[0].message, /刷新失败/);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = previous;
  }
});
test('chat copy uses the explicitly selected character and skips same-name chats without writing', async () => {
  const { host } = await hostFixture();
  const bundle = presetBundle();
  const item = {
    item: { id: '1', kind: 'chat', name: 'existing.jsonl', path: 'resources/1.jsonl', parentId: '0' },
    name: 'existing.jsonl',
    mode: 'skip',
    selected: true,
  };
  bundle.files[item.item.path] = new TextEncoder().encode('{"user_name":"u","chat_metadata":{}}\n{"mes":"original"}');
  const context = { presetTarget: 'plugin', characterAvatar: 'existing.png', characterName: 'Existing' };
  assert.equal((await host.importResource(bundle, item, [item], context)).skipped, true);
  const previous = globalThis.fetch;
  let directoryReady = false;
  globalThis.fetch = async (path, init) => {
    if (path === '/api/chats/get') {
      assert.deepEqual(JSON.parse(init.body), { avatar_url: 'existing.png' });
      directoryReady = true;
      return Response.json({});
    }
    if (path === '/api/chats/rename') {
      const data = JSON.parse(init.body);
      assert.equal(data.avatar_url, 'existing.png');
      assert.equal(data.original_file, 'new-chat.jsonl');
      assert.equal(data.renamed_file, 'existing 2.jsonl');
      return Response.json({ ok: true, sanitizedFileName: 'existing 2' });
    }
    assert.equal(path, '/api/chats/import');
    assert.equal(directoryReady, true, 'initialize a new character chat directory before importing');
    assert.equal(init.body.get('avatar_url'), 'existing.png');
    assert.match(await init.body.get('avatar').text(), /original/);
    return Response.json({ res: true, fileNames: ['new-chat.jsonl'] });
  };
  try {
    item.mode = 'copy';
    assert.equal((await host.importResource(bundle, item, [item], context)).message, '已创建聊天 existing 2.jsonl');
  } finally {
    globalThis.fetch = previous;
  }
});
test('native preset import adds the catalog entry without activating it and preserves selected attachments', async () => {
  const { host, native } = await hostFixture();
  const bundle = presetBundle();
  const items = rows(bundle);
  const previous = globalThis.Option;
  globalThis.Option = class {
    constructor(text, value, defaultSelected, selected) {
      assert.equal(selected, false);
    }
  };
  try {
    await host.importResource(bundle, items[0], items, {
      presetTarget: 'tavern',
      characterAvatar: '',
      characterName: '',
    });
    assert.equal(native.preset_names.test, 1);
    assert.equal(native.presets[1].extensions.regex_scripts[0].scriptName, 'R');
    assert.equal(native.presets[1].extensions.tavern_helper.scripts[0].enabled, false);
  } finally {
    globalThis.Option = previous;
  }
});

test('worldbook replacement updates the host cache only after the server confirms import', async () => {
  const { host, worldInfoCache } = await hostFixture();
  const bundle = presetBundle();
  bundle.manifest.kind = 'worldbook';
  bundle.manifest.items = [{ id: '0', kind: 'worldbook', name: 'Existing world', path: 'resources/0.json' }];
  const data = { entries: { 7: { uid: 7, content: 'new text' } }, metadata: { retained: true } };
  bundle.files['resources/0.json'] = model.encodeJson(data);
  const item = rows(bundle)[0];
  item.mode = 'replace';
  item.replaceable = true;
  const context = { presetTarget: 'plugin', characterAvatar: '', characterName: '' };
  worldInfoCache.set(item.name, 'old data');
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('offline', { status: 500 });
    await assert.rejects(host.importResource(bundle, item, [item], context), /offline/);
    assert.equal(worldInfoCache.get(item.name), 'old data');
    globalThis.fetch = async (path, init) => {
      assert.equal(path, '/api/worldinfo/import');
      assert.deepEqual(JSON.parse(await init.body.get('avatar').text()), data);
      return Response.json({ name: item.name });
    };
    await host.importResource(bundle, item, [item], context);
    assert.deepEqual(worldInfoCache.get(item.name), data);
  } finally {
    globalThis.fetch = previous;
  }
});
