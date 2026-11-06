#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules */
/**
 * Copy the current build into a local SillyTavern extension folder for manual testing.
 *
 * Standalone on purpose: the release script never touches an external install
 * directory, and this script only runs when someone asks for it.
 * Dry run is the default; `--apply` performs the backup and the copy.
 */
import { cpSync, existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultTarget = 'F:/SillyTavern/public/scripts/extensions/third-party/ziyong-dist';

const usage = `用法: pnpm deploy:local [--target <目录>] [--apply]

把 dist/、manifest.json（以及存在时的 i18n/）复制到本地酒馆扩展目录，复制前先整目录备份。

默认 dry-run，只打印将要执行的动作。

选项:
  --target <目录>  目标扩展目录（默认 ${defaultTarget}）
  --apply          真正执行备份与复制
  --no-i18n        不复制 i18n/
  --help           显示本帮助
`;

function fail(message) {
  console.error(`\n[deploy] ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const options = { apply: false, target: defaultTarget, i18n: true, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--apply') options.apply = true;
    else if (arg === '--no-i18n') options.i18n = false;
    else if (arg === '--target') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) fail('--target 缺少目录参数');
      options.target = value;
      index += 1;
    } else fail(`未知参数: ${arg}\n\n${usage}`);
  }
  return options;
}

function readVersion(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')).version ?? 'unknown';
  } catch {
    return 'missing';
  }
}

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function timestamp() {
  const now = new Date();
  const pad = value => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const target = resolve(root, options.target);
  const sourceDist = join(root, 'dist');
  const sourceManifest = join(root, 'manifest.json');
  const sourceI18n = join(root, 'i18n');

  if (!existsSync(join(sourceDist, 'index.js'))) fail('dist/index.js 不存在，先运行 pnpm build。');
  if (!existsSync(sourceManifest)) fail('manifest.json 不存在。');

  const sourceVersion = readVersion(sourceManifest);
  const targetVersion = readVersion(join(target, 'manifest.json'));
  const backupDir = join(root, 'tmp', `backup-${target.split(/[\\/]/u).pop()}-${targetVersion}-${timestamp()}`);

  console.log('[deploy] 计划');
  console.log(`  源版本:   ${sourceVersion}（dist/index.js ${sha256(join(sourceDist, 'index.js')).slice(0, 12)}…）`);
  console.log(`  目标目录: ${target}`);
  console.log(`  目标版本: ${targetVersion}`);
  console.log(`  备份到:   ${backupDir}`);
  console.log(`  复制:     dist/${options.i18n && existsSync(sourceI18n) ? ' + i18n/' : ''} + manifest.json`);
  console.log(`  模式:     ${options.apply ? '执行 (--apply)' : 'dry-run'}`);

  if (!existsSync(target)) fail(`目标目录不存在: ${target}`);
  if (!statSync(target).isDirectory()) fail(`目标不是目录: ${target}`);

  if (!options.apply) {
    console.log('\n[deploy] dry-run 完成：没有复制任何文件。确认后追加 --apply。');
    return;
  }

  console.log('\n[deploy] 备份');
  cpSync(target, backupDir, { recursive: true });
  console.log(`  已备份到 ${backupDir}`);

  console.log('[deploy] 复制');
  rmSync(join(target, 'dist'), { recursive: true, force: true });
  cpSync(sourceDist, join(target, 'dist'), { recursive: true });
  if (options.i18n && existsSync(sourceI18n)) {
    rmSync(join(target, 'i18n'), { recursive: true, force: true });
    cpSync(sourceI18n, join(target, 'i18n'), { recursive: true });
  }
  cpSync(sourceManifest, join(target, 'manifest.json'));

  const installedVersion = readVersion(join(target, 'manifest.json'));
  const sourceHash = sha256(join(sourceDist, 'index.js'));
  const installedHash = sha256(join(target, 'dist', 'index.js'));
  if (installedHash !== sourceHash) fail('复制后 dist/index.js 哈希不一致。');
  if (installedVersion !== sourceVersion) fail(`复制后 manifest 版本 ${installedVersion} 与源 ${sourceVersion} 不一致。`);

  console.log('\n[deploy] 完成');
  console.log(`  版本: ${targetVersion} -> ${installedVersion}`);
  console.log(`  dist/index.js sha256 一致: ${sourceHash.slice(0, 12)}…`);
  console.log('  回到酒馆页面刷新（手机上关掉重开）后生效。');
}

main();
