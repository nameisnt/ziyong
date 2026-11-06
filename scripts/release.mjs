#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules */
/**
 * One-command release: version notes -> build -> commit -> push both repositories.
 *
 * Dry run is the default. Nothing is written, committed, built or pushed until
 * `--apply` is passed, and even then the push only happens after the local
 * pre-push gate (`pnpm verify:static`) passes.
 */
import { cpSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const usage = `用法: pnpm release -- --note "说明" [--note "说明"] [选项]

默认 dry-run：只校验并打印计划，不写文件、不构建、不提交、不推送。

选项:
  --version <x.y.z>   指定版本（默认 patch 加一）
  --note <文字>       更新说明，可重复
  --notes-file <路径> 从文件逐行读取更新说明
  --apply             真正执行（写入版本说明、构建、提交、推送）
  --dist-repo <路径>  最小安装仓库目录（默认 tmp/publish-1.2.9）
  --no-push           只提交不推送
  --no-notes          跳过版本说明写入（仅重建并发布当前版本）
  --help              显示本帮助
`;

function fail(message) {
  console.error(`\n[release] ${message}`);
  process.exit(1);
}

function log(message) {
  console.log(`[release] ${message}`);
}

function step(message) {
  console.log(`\n[release] === ${message} ===`);
}

function parseArgs(argv) {
  const options = {
    apply: false,
    notes: [],
    notesFile: '',
    version: '',
    distRepo: 'tmp/publish-1.2.9',
    push: true,
    writeNotes: true,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) fail(`${arg} 缺少参数`);
      index += 1;
      return value;
    };
    if (arg === '--apply') options.apply = true;
    else if (arg === '--note') options.notes.push(next());
    else if (arg === '--notes-file') options.notesFile = next();
    else if (arg === '--version') options.version = next();
    else if (arg === '--dist-repo') options.distRepo = next();
    else if (arg === '--no-push') options.push = false;
    else if (arg === '--no-notes') options.writeNotes = false;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else fail(`未知参数: ${arg}\n\n${usage}`);
  }
  return options;
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(root, relativePath), 'utf8'));
}

function bumpPatch(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return `${major}.${minor}.${patch + 1}`;
}

function resolveGit() {
  const portable = resolve(root, 'tmp/mingit/cmd/git.exe');
  if (process.env.GIT && existsSync(process.env.GIT)) return process.env.GIT;
  return existsSync(portable) ? portable : 'git';
}

const git = resolveGit();

function gitRun(cwd, args, { capture = false } = {}) {
  const result = spawnSync(git, args, {
    cwd,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
  });
  if (result.status !== 0) {
    fail(`git ${args.join(' ')} 失败（目录 ${cwd}）${capture ? `\n${result.stderr ?? ''}` : ''}`);
  }
  return (result.stdout ?? '').trim();
}

function quoteArg(value) {
  if (!/[\s"]/u.test(value)) return value;
  return `"${value.replaceAll('"', '\\"')}"`;
}

function run(command, args, cwd = root) {
  const line = [command, ...args].map(quoteArg).join(' ');
  log(`> ${line}`);
  const result = spawnSync(line, { cwd, stdio: 'inherit', shell: true });
  if (result.status !== 0) fail(`命令失败: ${line}`);
}

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function assertClean(cwd, label, { allowUntracked = false } = {}) {
  const args = allowUntracked ? ['status', '--porcelain', '--untracked-files=no'] : ['status', '--porcelain'];
  const status = gitRun(cwd, args, { capture: true });
  if (status) {
    console.error(status);
    fail(`${label} 有未提交的改动，先提交或清理后再发布。`);
  }
}

function collectNotes(options) {
  const notes = [...options.notes];
  if (options.notesFile) {
    const filePath = resolve(root, options.notesFile);
    if (!existsSync(filePath)) fail(`找不到说明文件: ${options.notesFile}`);
    notes.push(
      ...readFileSync(filePath, 'utf8')
        .split(/\r?\n/u)
        .map(line => line.trim())
        .filter(Boolean),
    );
  }
  return notes;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const pkg = readJson('package.json');
  const currentVersion = pkg.version;
  const nextVersion = options.version || bumpPatch(currentVersion);
  const notes = collectNotes(options);
  const distRepo = resolve(root, options.distRepo);

  step('发布计划');
  console.log(`  版本: ${currentVersion} -> ${nextVersion}`);
  console.log(`  模式: ${options.apply ? '执行 (--apply)' : 'dry-run（不写入、不构建、不推送）'}`);
  console.log(`  更新说明: ${options.writeNotes ? (notes.length ? `${notes.length} 条` : '缺失') : '跳过'}`);
  console.log(`  安装仓库: ${options.distRepo}`);
  console.log(`  推送: ${options.push ? '是' : '否（--no-push）'}`);
  if (options.writeNotes) for (const note of notes) console.log(`    - ${note}`);

  if (options.writeNotes && !notes.length) fail('缺少更新说明，用 --note "…" 或 --notes-file 提供，或显式加 --no-notes。');

  step('检查工作区');
  const branch = gitRun(root, ['rev-parse', '--abbrev-ref', 'HEAD'], { capture: true });
  if (branch !== 'main') fail(`当前分支是 ${branch}，发布只允许在 main 上执行。`);
  if (!existsSync(distRepo)) fail(`安装仓库目录不存在: ${options.distRepo}`);
  if (gitRun(distRepo, ['rev-parse', '--is-inside-work-tree'], { capture: true }) !== 'true')
    fail(`安装仓库目录不是 git 仓库: ${options.distRepo}`);
  assertClean(root, '主仓库', { allowUntracked: true });
  assertClean(distRepo, '安装仓库');
  log(`主仓库无未提交改动，分支 ${branch}；安装仓库干净。`);

  if (options.writeNotes) {
    step(options.apply ? '写入版本说明' : '预览版本说明 (--dry-run)');
    const noteArgs = notes.flatMap(note => ['--note', note]);
    const args = options.apply
      ? ['release:notes', '--version', nextVersion, ...noteArgs]
      : ['release:notes', '--dry-run', '--version', nextVersion, ...noteArgs];
    run('pnpm', args);
  } else {
    step('跳过版本说明（--no-notes）');
    if (options.apply && pkg.version !== nextVersion) fail('--no-notes 只能发布 package.json 当前的版本号。');
  }

  if (!options.apply) {
    step('dry-run 完成');
    console.log('  未修改任何文件。确认无误后追加 --apply 执行。');
    return;
  }

  step('构建');
  run('pnpm', ['build']);
  if (!existsSync(join(root, 'dist/index.js'))) fail('构建产物 dist/index.js 不存在。');
  const builtVersion = readJson('manifest.json').version;
  if (builtVersion !== nextVersion) fail(`manifest.json 版本是 ${builtVersion}，与目标 ${nextVersion} 不一致。`);

  step('提交主仓库');
  gitRun(root, ['add', '--', 'manifest.json', 'package.json', 'src/core/releaseInfo.ts', 'dist']);
  gitRun(root, ['commit', '-m', `release: ${nextVersion}`, '-m', notes.join('\n')]);

  if (options.push) {
    step('推送主仓库（pre-push 会运行 pnpm verify:static）');
    gitRun(root, ['push', 'origin', 'main']);
  }

  step('同步安装仓库');
  rmSync(join(distRepo, 'dist'), { recursive: true, force: true });
  cpSync(join(root, 'dist'), join(distRepo, 'dist'), { recursive: true });
  cpSync(join(root, 'manifest.json'), join(distRepo, 'manifest.json'));
  gitRun(distRepo, ['add', '--all']);
  gitRun(distRepo, ['commit', '-m', `release: ${nextVersion}`]);

  const sourceHash = sha256(join(root, 'dist/index.js'));
  const distHash = sha256(join(distRepo, 'dist/index.js'));
  if (sourceHash !== distHash) fail('主仓库与安装仓库的 dist/index.js 哈希不一致。');
  log(`dist/index.js sha256 一致: ${sourceHash.slice(0, 12)}…`);

  if (options.push) {
    step('推送安装仓库');
    gitRun(distRepo, ['push', 'origin', 'main']);
  }

  step('完成');
  console.log(`  主仓库:   ${gitRun(root, ['rev-parse', 'HEAD'], { capture: true })}`);
  console.log(`  安装仓库: ${gitRun(distRepo, ['rev-parse', 'HEAD'], { capture: true })}`);
  console.log('  本地安装目录（如 SillyTavern/third-party）需要手动覆盖，或用 safe-push-dist 流程。');
}

main();
