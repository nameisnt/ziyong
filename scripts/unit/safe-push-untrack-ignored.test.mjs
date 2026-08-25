/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const sourceSafePushPath = fileURLToPath(new URL('../safe-push-dist.ps1', import.meta.url));
const referenceDirectory = '可参考拓展';
const referencePath = `${referenceDirectory}/sample.txt`;

function run(command, args, cwd, expectSuccess = true) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (expectSuccess && result.status !== 0) {
    assert.fail(`${command} ${args.join(' ')} failed (${result.status}):\n${output}`);
  }
  return { ...result, output };
}

function git(cwd, ...args) {
  return run('git', args, cwd).stdout.trim();
}

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), 'safe-push-untrack-'));
  await mkdir(join(root, 'docs'), { recursive: true });
  await mkdir(join(root, 'dist'), { recursive: true });
  await mkdir(join(root, 'scripts'), { recursive: true });
  await mkdir(join(root, referenceDirectory), { recursive: true });
  await writeFile(join(root, '.gitignore'), `${referenceDirectory}/\n`, 'utf8');
  await writeFile(join(root, 'docs', 'CURRENT.md'), '# Current\n', 'utf8');
  await writeFile(join(root, 'docs', 'DECISIONS.md'), '# Decisions\n', 'utf8');
  await writeFile(join(root, 'docs', 'CODEMAP.md'), '# Codemap\n', 'utf8');
  await writeFile(join(root, 'dist', 'index.css'), 'body {}\n', 'utf8');
  await writeFile(join(root, 'dist', 'index.js'), 'export {};\n', 'utf8');
  await writeFile(join(root, referencePath), 'preserve me\n', 'utf8');
  await copyFile(sourceSafePushPath, join(root, 'scripts', 'safe-push-dist.ps1'));

  git(root, 'init', '-b', 'main');
  git(root, 'config', 'user.name', 'Repository Contract');
  git(root, 'config', 'user.email', 'contract@example.invalid');
  git(root, 'remote', 'add', 'origin', 'https://github.com/nameisnt/ziyong.git');
  git(root, 'add', '--', '.gitignore', 'docs', 'dist', 'scripts');
  git(root, 'add', '-f', '--', referencePath);
  git(root, 'commit', '-m', 'fixture');
  git(root, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  return root;
}

function runSafePush(root, ...extraArgs) {
  const fixtureSafePushPath = join(root, 'scripts', 'safe-push-dist.ps1');
  const quotePowerShell = value => `'${value.replaceAll("'", "''")}'`;
  const forwardedArgs = extraArgs
    .map(value => (value.startsWith('-') ? value : quotePowerShell(value)))
    .join(' ');
  const invocation = [
    `Set-Location -LiteralPath ${quotePowerShell(root)}`,
    `& ${quotePowerShell(fixtureSafePushPath)} -DryRun -SkipBuild ${forwardedArgs}`,
  ].join('; ');
  return run(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', invocation],
    root,
    false,
  );
}

function runSafePushActual(root) {
  const fixtureSafePushPath = join(root, 'scripts', 'safe-push-dist.ps1');
  const invocation = `chcp 936>nul & powershell.exe -NoProfile -ExecutionPolicy Bypass -File ${fixtureSafePushPath} -SkipBuild`;
  return run(
    'cmd.exe',
    ['/d', '/c', invocation],
    root,
    false,
  );
}

test('ignored tracked removals stay excluded unless explicitly requested', async () => {
  const root = await createFixture();
  try {
    git(root, 'rm', '--cached', '--', referencePath);
    const result = runSafePush(root);
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /There are no tracked changes compared with the publish parent/u);
    assert.equal(
      git(root, '-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=D'),
      referencePath,
    );
    assert.equal(await readFile(join(root, referencePath), 'utf8'), 'preserve me\n');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('remote-ahead dry run preserves staged ignored removals and the local branch', async () => {
  const root = await createFixture();
  try {
    const localHead = git(root, 'rev-parse', 'HEAD');
    await writeFile(join(root, 'docs', 'CURRENT.md'), '# Remote current\n', 'utf8');
    git(root, 'add', '--', 'docs/CURRENT.md');
    git(root, 'commit', '-m', 'remote update');
    git(root, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
    git(root, 'reset', '--hard', localHead);

    git(root, 'rm', '--cached', '--', referencePath);
    await writeFile(join(root, 'docs', 'CODEMAP.md'), '# Local codemap\n', 'utf8');
    const statusBefore = git(root, 'status', '--porcelain');
    const indexTreeBefore = git(root, 'write-tree');

    const result = runSafePush(root);
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /without changing the local branch or index/u);
    assert.match(result.output, /M\s+docs\/CODEMAP\.md/u);
    assert.doesNotMatch(result.output, /M\s+docs\/CURRENT\.md/u);
    assert.doesNotMatch(result.output, /Falling back to direct application/u);
    assert.match(result.output, /DryRun complete/u);
    assert.equal(git(root, 'rev-parse', 'HEAD'), localHead);
    assert.equal(git(root, 'write-tree'), indexTreeBefore);
    assert.equal(git(root, 'status', '--porcelain'), statusBefore);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('remote-ahead synchronization preserves staged ignored removals', async () => {
  const root = await createFixture();
  const remoteRoot = await mkdtemp(join(tmpdir(), 'safe-push-remote-'));
  try {
    const localHead = git(root, 'rev-parse', 'HEAD');
    await writeFile(join(root, 'docs', 'CURRENT.md'), '# Remote current\n', 'utf8');
    git(root, 'add', '--', 'docs/CURRENT.md');
    git(root, 'commit', '-m', 'remote update');
    const remoteHead = git(root, 'rev-parse', 'HEAD');

    git(remoteRoot, 'init', '--bare');
    git(root, 'push', remoteRoot, 'HEAD:refs/heads/main');
    git(root, 'reset', '--hard', localHead);
    git(root, 'remote', 'set-url', 'origin', remoteRoot);
    git(root, 'remote', 'set-url', '--push', 'origin', 'https://github.com/nameisnt/ziyong.git');
    git(root, 'rm', '--cached', '--', referencePath);

    const result = runSafePushActual(root);
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /Preserving 1 staged removals from excluded paths/u);
    assert.equal(git(root, 'rev-parse', 'HEAD'), remoteHead);
    assert.equal(
      git(root, '-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=D'),
      referencePath,
    );
    assert.equal(await readFile(join(root, referencePath), 'utf8'), 'preserve me\n');
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(remoteRoot, { recursive: true, force: true });
  }
});

test('explicit untracking carries a fully staged removal into the temporary publish index', async () => {
  const root = await createFixture();
  try {
    git(root, 'rm', '--cached', '--', referencePath);
    const result = runSafePush(root, '-UntrackIgnoredPath', referenceDirectory);
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /Explicit ignored paths approved for tracked removal/u);
    assert.match(result.output, /DryRun complete/u);
    assert.equal(
      git(root, '-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=D'),
      referencePath,
    );
    assert.equal(await readFile(join(root, referencePath), 'utf8'), 'preserve me\n');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('explicit untracking also verifies a clean local-ahead commit before publishing it', async () => {
  const root = await createFixture();
  try {
    git(root, 'rm', '--cached', '--', referencePath);
    git(root, 'commit', '-m', 'untrack reference');
    const result = runSafePush(root, '-UntrackIgnoredPath', referenceDirectory);
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /existing HEAD will be verified/u);
    assert.match(result.output, /DryRun complete/u);
    assert.equal(git(root, 'status', '--porcelain'), '');
    assert.equal(await readFile(join(root, referencePath), 'utf8'), 'preserve me\n');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('local-ahead HEAD accepts later tracked and allowed untracked workspace changes', async () => {
  const root = await createFixture();
  try {
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'src', 'checkpoint.ts'), 'export const checkpoint = true;\n', 'utf8');
    git(root, 'add', '--', 'src/checkpoint.ts');
    git(root, 'commit', '-m', 'local checkpoint');
    const localHead = git(root, 'rev-parse', 'HEAD');

    await writeFile(join(root, 'docs', 'CURRENT.md'), '# Updated current\n', 'utf8');
    await writeFile(join(root, 'src', 'new-feature.ts'), 'export const enabled = true;\n', 'utf8');
    const statusBefore = git(root, 'status', '--porcelain');

    const result = runSafePush(root);
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /committed on top of the existing local HEAD/u);
    assert.match(result.output, /M\s+docs\/CURRENT\.md/u);
    assert.match(result.output, /A\s+src\/new-feature\.ts/u);
    assert.match(result.output, /DryRun complete/u);
    assert.equal(git(root, 'rev-parse', 'HEAD'), localHead);
    assert.equal(git(root, 'status', '--porcelain'), statusBefore);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('an extra root document is rejected instead of becoming current publication context', async () => {
  const root = await createFixture();
  try {
    await writeFile(join(root, 'docs', 'OLD-PLAN.md'), '# Old plan\n', 'utf8');
    const result = runSafePush(root);
    assert.notEqual(result.status, 0);
    assert.match(result.output, /docs\/ must contain only CURRENT\.md, DECISIONS\.md, and CODEMAP\.md/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('explicit untracking rejects changed local reference content', async () => {
  const root = await createFixture();
  try {
    git(root, 'rm', '--cached', '--', referencePath);
    await writeFile(join(root, referencePath), 'changed locally\n', 'utf8');
    const result = runSafePush(root, '-UntrackIgnoredPath', referenceDirectory);
    assert.notEqual(result.status, 0);
    assert.match(result.output, /locally preserved file differs from origin\/main/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('explicit untracking rejects a path that remains in the normal index', async () => {
  const root = await createFixture();
  try {
    const result = runSafePush(root, '-UntrackIgnoredPath', referenceDirectory);
    assert.notEqual(result.status, 0);
    assert.match(result.output, /still present in the normal index/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('explicit untracking rejects a path outside exact non-glob ignore entries', async () => {
  const root = await createFixture();
  try {
    const result = runSafePush(root, '-UntrackIgnoredPath', 'dist');
    assert.notEqual(result.status, 0);
    assert.match(result.output, /not an exact non-glob \.gitignore entry/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
