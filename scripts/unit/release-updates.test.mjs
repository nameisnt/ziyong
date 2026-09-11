/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

const manifest = JSON.parse(await readFile(new URL('../../manifest.json', import.meta.url), 'utf8'));
const pkg = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
const source = (await readFile(new URL('../../src/core/releaseInfo.ts', import.meta.url), 'utf8')).replace(
  /import manifest from [^;]+;/,
  `const manifest = ${JSON.stringify(manifest)};`,
);
const code = transpileModule(source, {
  compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 },
}).outputText;
const { RUNNING_VERSION, acknowledgeRelease, RELEASE_SEEN_FIELD, RELEASE_HISTORY } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
);

test('public manifests agree and runtime version comes from the bundled manifest', () => {
  assert.equal(manifest.version, pkg.version);
  assert.equal(RUNNING_VERSION, manifest.version);
  assert.equal(RELEASE_HISTORY[0].version, RUNNING_VERSION);
  const snapshotNotes = RELEASE_HISTORY.find(release => release.version === '1.2.2').notes;
  assert.ok(snapshotNotes.some(note => note.includes('默认 100%')));
  assert.ok(snapshotNotes.some(note => note.includes('保留项只能单选')));
  assert.ok(snapshotNotes.some(note => note.includes('不会自动清理备份')));
  assert.ok(snapshotNotes.some(note => note.includes('支持取消扫描')));
  const mvuNotes = RELEASE_HISTORY.find(release => release.version === '1.2.1').notes;
  assert.ok(mvuNotes.some(note => note.includes('双向查找最近快照')));
  assert.ok(mvuNotes.some(note => note.includes('不影响酒馆普通聊天')));
  const notes = RELEASE_HISTORY.find(release => release.version === '1.2.0').notes;
  assert.ok(notes.some(note => note.includes('酒馆原生开关')));
  assert.ok(notes.some(note => note.includes('两行可见标签页')));
  assert.ok(notes.some(note => note.includes('同一聊天重载不再重置')));
});

test('release history has unique descending versions and preserves the published 1.1.0 notes', () => {
  const versions = RELEASE_HISTORY.map(release => release.version);
  assert.equal(new Set(versions).size, versions.length);
  for (let i = 0; i < versions.length; i++) {
    assert.match(versions[i], /^\d+\.\d+\.\d+$/u);
    assert.ok(RELEASE_HISTORY[i].notes.length > 0);
    if (!i) continue;
    const newer = versions[i - 1].split('.').map(Number),
      older = versions[i].split('.').map(Number);
    const different = newer.findIndex((part, index) => part !== older[index]);
    assert.ok(different >= 0 && newer[different] > older[different]);
  }
  assert.deepEqual(RELEASE_HISTORY.find(release => release.version === '1.1.0').notes, [
    '状态栏方案默认仅当前聊天可用，可主动开启跨聊天共用；共用方案仍需在各聊天中手动启用。',
    '旧状态栏方案按原绑定聊天转为私有，多聊天绑定分别保留独立副本；没有当前聊天时暂缓处理。',
    '修复手动保存的 MVU 状态栏网页加载失败，支持内嵌 data 模块，补齐 MVU、楼层和事件桥接；切换楼层、聊天或关闭网页时清理桥接监听器，其他生成网页限制不变。',
    '插件内的角色和用户替换称呼可选择用于酒馆普通聊天，默认关闭，仅当前聊天生效，需启用酒馆新版宏引擎。',
    '设置新增版本与更新，可查看本版说明并手动检查更新。',
  ]);
});

test('notice is once per release, independent of chat, with numeric version ordering', () => {
  const settings = {};
  assert.equal(acknowledgeRelease(settings, '1.1.0'), true);
  assert.equal(settings[RELEASE_SEEN_FIELD], '1.1.0');
  assert.equal(acknowledgeRelease(settings, '1.1.0'), false);
  assert.equal(acknowledgeRelease(settings, '1.2.0'), true);
  assert.equal(acknowledgeRelease(settings, '1.2.0'), false);
  assert.equal(acknowledgeRelease(settings, '1.2.1'), true);
  assert.equal(acknowledgeRelease(settings, '1.2.1'), false);
  assert.equal(acknowledgeRelease(settings, '1.2.2'), true);
  assert.equal(acknowledgeRelease(settings, '1.2.2'), false);
  assert.equal(acknowledgeRelease(settings, '1.0.1'), false);
  assert.equal(acknowledgeRelease(settings, '1.10.0'), true);
  assert.equal(acknowledgeRelease(settings, '1.9.0'), false);
  assert.equal(acknowledgeRelease(settings, '2.0.0'), true);
});

const apiSource = (
  await readFile(new URL('../../src/apps/extension-transfer/api.ts', import.meta.url), 'utf8')
).replace(/import \{ getRequestHeaders \} from [^;]+;/, 'const getRequestHeaders = () => ({});');
const apiCode = transpileModule(apiSource, {
  compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 },
}).outputText;
const { checkExtensionUpdate } = await import(`data:text/javascript;base64,${Buffer.from(apiCode).toString('base64')}`);

test('update check resolves renamed installation and queries only that extension in the correct scope', async () => {
  const originalFetch = globalThis.fetch;
  try {
    for (const scope of ['global', 'local']) {
      const calls = [];
      globalThis.fetch = async (url, init) => {
        calls.push([url, init]);
        return Response.json(
          url.endsWith('/discover')
            ? [
                { name: 'third-party/other', type: 'global' },
                { name: 'third-party/reader test', type: scope },
              ]
            : { currentCommitHash: 'abc123', isUpToDate: false },
        );
      };
      assert.equal(
        await checkExtensionUpdate('https://host/scripts/extensions/third-party/reader%20test/dist/settings.chunk.js'),
        'update-available',
      );
      assert.equal(calls.length, 2);
      assert.equal(calls[1][0], '/api/extensions/version');
      assert.deepEqual(JSON.parse(calls[1][1].body), { extensionName: 'reader test', global: scope === 'global' });
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('current, unknown git state, HTTP failure and missing installation are distinct', async () => {
  const originalFetch = globalThis.fetch;
  const url = 'https://host/scripts/extensions/third-party/reader/dist/index.js';
  try {
    for (const [version, expected] of [
      [{ currentCommitHash: 'abc', isUpToDate: true }, 'current'],
      [{ currentCommitHash: 'abc' }, 'unavailable'],
      [{ isUpToDate: false }, 'unavailable'],
    ]) {
      globalThis.fetch = async path =>
        Response.json(path.endsWith('/discover') ? [{ name: 'third-party/reader', type: 'local' }] : version);
      assert.equal(await checkExtensionUpdate(url), expected);
    }
    globalThis.fetch = async () => new Response('permission denied', { status: 403 });
    await assert.rejects(checkExtensionUpdate(url), /permission denied/);
    globalThis.fetch = async () => Response.json([]);
    await assert.rejects(checkExtensionUpdate(url), /安装信息/);
    globalThis.fetch = async () => {
      throw new Error('must not fetch');
    };
    await assert.rejects(checkExtensionUpdate('https://host/src/settings.vue'), /安装目录/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
