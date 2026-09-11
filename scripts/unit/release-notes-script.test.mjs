/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';
import { parseReleaseArgs, updateReleaseNotes } from '../release-notes.mjs';

const files = ['manifest.json', 'package.json', 'src/core/releaseInfo.ts'];
async function fixture(t, committed = false) {
  const base = resolve(tmpdir());
  const root = await mkdtemp(join(base, 'release-notes-'));
  t.after(async () => {
    assert.equal(dirname(resolve(root)), base);
    assert.ok(basename(root).startsWith('release-notes-'));
    await rm(root, { recursive: true, force: true });
  });
  await mkdir(join(root, 'src/core'), { recursive: true });
  await writeFile(
    join(root, files[0]),
    JSON.stringify({ version: '1.2.1', display_name: '测试插件' }, null, 2) + '\r\n',
  );
  await writeFile(
    join(root, files[1]),
    JSON.stringify({ name: 'fixture', version: '1.2.1', scripts: { test: 'keep' } }, null, 2) + '\r\n',
  );
  await writeFile(
    join(root, files[2]),
    "// Keep this comment.\r\nexport const RELEASE_HISTORY = [\r\n {version: '1.2.1', notes: ['已发布说明']},\r\n {version: '1.2.0', notes: ['更早的记录']}\r\n] as const;\r\nexport function untouched() { return 'unchanged'; }\r\n",
  );
  if (committed) {
    git(root, ['init']);
    git(root, ['add', '.']);
    git(root, [
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.invalid',
      '-c',
      'commit.gpgSign=false',
      'commit',
      '-m',
      'fixture',
    ]);
  }
  return root;
}
function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}
async function contents(root) {
  const result = [];
  for (const file of files) result.push(await readFile(join(root, file), 'utf8'));
  return result;
}
async function history(root) {
  const raw = await readFile(join(root, files[2]), 'utf8');
  const code = transpileModule(raw, {
    compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

test('release script creates next patch, preserves history and escapes note text', async t => {
  const root = await fixture(t);
  const notes = ['说明包含 "引号"、\'单引号\'、\\路径、`代码` 和 ${text}', '第一行\n第二行'];
  const result = await updateReleaseNotes({ root, notes });
  assert.equal(result.version, '1.2.2');
  const [manifest, pkg, source] = await contents(root);
  assert.deepEqual(JSON.parse(manifest), { version: '1.2.2', display_name: '测试插件' });
  assert.deepEqual(JSON.parse(pkg), { name: 'fixture', version: '1.2.2', scripts: { test: 'keep' } });
  const module = await history(root);
  assert.deepEqual(module.RELEASE_HISTORY, [
    { version: '1.2.2', notes },
    { version: '1.2.1', notes: ['已发布说明'] },
    { version: '1.2.0', notes: ['更早的记录'] },
  ]);
  assert.equal(module.untouched(), 'unchanged');
  assert.ok(source.includes('// Keep this comment.'));
  assert.ok(source.includes('\r\n'));
});

test('explicit version and dry run do not change files until applied', async t => {
  const root = await fixture(t);
  const before = await contents(root);
  const result = await updateReleaseNotes({ root, notes: ['新功能'], version: '1.3.0', dryRun: true });
  assert.equal(result.version, '1.3.0');
  assert.equal(result.changedFiles.length, 3);
  assert.deepEqual(await contents(root), before);
  await updateReleaseNotes({ root, notes: ['新功能'], version: '1.3.0' });
  assert.equal((await history(root)).RELEASE_HISTORY[0].version, '1.3.0');
});

test('append updates only the uncommitted current release, without bumping or committing', async t => {
  const root = await fixture(t, true);
  const head = git(root, ['rev-parse', 'HEAD']);
  await assert.rejects(updateReleaseNotes({ root, notes: ['禁止改已提交版本'], append: true }), /已进入 Git 提交/);
  await updateReleaseNotes({ root, notes: ['新版本'] });
  const before = await contents(root);
  await updateReleaseNotes({ root, notes: ['补充说明'], append: true, dryRun: true });
  assert.deepEqual(await contents(root), before);
  const result = await updateReleaseNotes({ root, notes: ['补充说明'], append: true });
  assert.equal(result.version, '1.2.2');
  assert.deepEqual((await history(root)).RELEASE_HISTORY[0].notes, ['新版本', '补充说明']);
  const after = await contents(root);
  assert.deepEqual(after.slice(0, 2), before.slice(0, 2));
  assert.equal(git(root, ['rev-parse', 'HEAD']), head);
  await assert.rejects(updateReleaseNotes({ root, notes: ['补充说明'], append: true }), /已包含/);
  assert.deepEqual(await contents(root), after);
});

test('invalid notes and versions fail before writing', async t => {
  const root = await fixture(t);
  const before = await contents(root);
  for (const options of [
    { notes: [] },
    { notes: [' '] },
    { notes: ['重复', '重复'] },
    { notes: [12] },
    { notes: ['x'], version: '1.2.1' },
    { notes: ['x'], version: '1.0.0' },
    { notes: ['x'], version: '01.2.3' },
    { notes: ['x'], version: '1.2' },
    { notes: ['x'], append: true, version: '1.3.0' },
    { notes: ['x'], append: true },
  ]) {
    await assert.rejects(updateReleaseNotes({ root, ...options }));
    assert.deepEqual(await contents(root), before);
  }
});

test('inconsistent versions and duplicate history are rejected without partial writes', async t => {
  const root = await fixture(t);
  await writeFile(join(root, files[1]), '{"version":"1.2.0"}');
  let before = await contents(root);
  await assert.rejects(updateReleaseNotes({ root, notes: ['x'] }), /版本号不一致/);
  assert.deepEqual(await contents(root), before);
  await writeFile(join(root, files[1]), '{"version":"1.2.1"}');
  await writeFile(join(root, files[2]), before[2].replace("version: '1.2.0'", "version: '1.2.1'"));
  before = await contents(root);
  await assert.rejects(updateReleaseNotes({ root, notes: ['x'] }), /重复/);
  assert.deepEqual(await contents(root), before);
});

test('release CLI accepts repeated notes and rejects ambiguous arguments', () => {
  assert.deepEqual(parseReleaseArgs(['--', '--append', '--note', '甲', '--note', '乙', '--dry-run']), {
    notes: ['甲', '乙'],
    append: true,
    dryRun: true,
    help: false,
  });
  assert.equal(parseReleaseArgs(['--version', '2.0.0', '--note', 'x']).version, '2.0.0');
  assert.throws(() => parseReleaseArgs(['--note']), /缺少/);
  assert.throws(() => parseReleaseArgs(['--unknown']), /未知/);
  assert.throws(() => parseReleaseArgs(['--append', '--version', '2.0.0']), /不能同时/);
});
