/* eslint-disable import-x/no-nodejs-modules */
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { format, resolveConfig } from 'prettier';
import {
  createSourceFile,
  ScriptTarget,
  isVariableStatement,
  isAsExpression,
  isArrayLiteralExpression,
  isObjectLiteralExpression,
  isPropertyAssignment,
  isStringLiteral,
} from 'typescript';

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const historyPath = 'src/core/releaseInfo.ts';

function versionParts(version) {
  if (typeof version !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u.test(version)) {
    throw new Error('版本号必须是 major.minor.patch，例如 1.2.3');
  }
  const parts = version.split('.').map(Number);
  if (!parts.every(Number.isSafeInteger)) throw new Error('版本号超出整数范围');
  return parts;
}

function compareVersions(a, b) {
  const left = versionParts(a),
    right = versionParts(b);
  for (let i = 0; i < 3; i += 1) if (left[i] !== right[i]) return left[i] - right[i];
  return 0;
}

function readHistory(source) {
  const file = createSourceFile(historyPath, source, ScriptTarget.Latest, true);
  if (file.parseDiagnostics.length) throw new Error('releaseInfo.ts 存在语法错误');
  const declaration = file.statements
    .filter(isVariableStatement)
    .flatMap(statement => [...statement.declarationList.declarations])
    .find(item => item.name.getText(file) === 'RELEASE_HISTORY');
  const initializer = declaration?.initializer;
  const array = initializer && isAsExpression(initializer) ? initializer.expression : initializer;
  if (!array || !isArrayLiteralExpression(array) || !array.elements.length)
    throw new Error('RELEASE_HISTORY 必须是非空数组');
  const releases = array.elements.map(entry => {
    if (!isObjectLiteralExpression(entry)) throw new Error('版本记录必须是对象');
    const property = name =>
      entry.properties.find(item => isPropertyAssignment(item) && item.name.getText(file) === name)?.initializer;
    const version = property('version'),
      notesNode = property('notes');
    if (!version || !isStringLiteral(version) || !notesNode || !isArrayLiteralExpression(notesNode))
      throw new Error('版本记录缺少 version 或 notes');
    const notes = notesNode.elements.map(note => {
      if (!isStringLiteral(note) || !note.text.trim()) throw new Error('更新说明必须是非空字符串');
      return note.text;
    });
    if (!notes.length) throw new Error('更新说明不能为空');
    versionParts(version.text);
    return { version: version.text, notes, notesNode };
  });
  for (let i = 1; i < releases.length; i += 1) {
    if (compareVersions(releases[i - 1].version, releases[i].version) <= 0)
      throw new Error('更新历史版本重复或未按倒序排列');
  }
  return { file, array, releases };
}

export function parseReleaseArgs(args) {
  const options = { notes: [], append: false, dryRun: false, help: false };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--') continue;
    if (arg === '--append') options.append = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--help') options.help = true;
    else if (arg === '--note' || arg === '--version') {
      const value = args[++i];
      if (value === undefined) throw new Error(`${arg} 缺少内容`);
      if (arg === '--note') options.notes.push(value);
      else options.version = value;
    } else throw new Error(`未知参数：${arg}`);
  }
  if (options.append && options.version) throw new Error('--append 仅追加当前版本，不能同时指定 --version');
  return options;
}

export async function updateReleaseNotes({ root = defaultRoot, notes, append = false, version, dryRun = false }) {
  if (!Array.isArray(notes) || !notes.length || notes.some(note => typeof note !== 'string' || !note.trim()))
    throw new Error('请至少输入一条非空更新说明');
  notes = notes.map(note => note.trim());
  if (new Set(notes).size !== notes.length) throw new Error('输入的更新说明重复');
  if (append && version) throw new Error('追加当前版本时不能指定新版本号');
  const paths = ['manifest.json', 'package.json', historyPath].map(path => resolve(root, path));
  const originals = [];
  for (const path of paths) originals.push(await readFile(path, 'utf8'));
  const manifest = JSON.parse(originals[0]),
    pkg = JSON.parse(originals[1]);
  const history = readHistory(originals[2]);
  const current = history.releases[0];
  if (manifest.version !== pkg.version || manifest.version !== current.version)
    throw new Error('manifest、package 与最新更新记录的版本号不一致，未写入');
  let targetVersion;
  let nextSource;
  if (append) {
    // Committed versions are frozen: offline Git cannot prove that they were never published.
    let committed;
    try {
      committed = execFileSync('git', ['show', `HEAD:${historyPath}`], {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch {
      throw new Error('无法读取 Git 已提交历史，不能确认当前版本尚未提交，拒绝追加');
    }
    const published = readHistory(committed).releases;
    if (
      published.some(item => item.version === current.version) ||
      compareVersions(current.version, published[0].version) <= 0
    )
      throw new Error('当前版本已进入 Git 提交，不能追加；请新建版本');
    if (notes.some(note => current.notes.includes(note))) throw new Error('当前版本已包含这条更新说明');
    targetVersion = current.version;
    const node = current.notesNode;
    nextSource =
      originals[2].slice(0, node.getStart(history.file)) +
      JSON.stringify([...current.notes, ...notes]) +
      originals[2].slice(node.end);
  } else {
    const parts = versionParts(current.version);
    targetVersion = version ?? `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
    if (compareVersions(targetVersion, current.version) <= 0) throw new Error('新版本必须高于当前版本，不能重复或回退');
    const position = history.array.getStart(history.file) + 1;
    nextSource =
      originals[2].slice(0, position) +
      '\n' +
      JSON.stringify({ version: targetVersion, notes }) +
      ',' +
      originals[2].slice(position);
  }
  nextSource = await format(nextSource, {
    ...(await resolveConfig(paths[2])),
    parser: 'typescript',
    endOfLine: originals[2].includes('\r\n') ? 'crlf' : 'lf',
  });
  manifest.version = targetVersion;
  pkg.version = targetVersion;
  const json = (value, original) =>
    (JSON.stringify(value, null, 2) + '\n').replaceAll('\n', original.includes('\r\n') ? '\r\n' : '\n');
  const contents = [json(manifest, originals[0]), json(pkg, originals[1]), nextSource];
  const changedFiles = paths.filter((_, index) => contents[index] !== originals[index]);
  if (!dryRun) {
    for (let i = 0; i < paths.length; i += 1)
      if (contents[i] !== originals[i]) await writeFile(paths[i], contents[i], 'utf8');
  }
  return { version: targetVersion, mode: append ? 'append' : 'new', dryRun, notes, changedFiles };
}

async function main() {
  const options = parseReleaseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(
      'pnpm release:notes --note "说明一" --note "说明二" [--version 1.3.0] [--dry-run]\npnpm release:notes --append --note "补充说明"\n不传 --note 时从标准输入逐行读取。默认递增 patch；追加仅限尚未进入 Git 提交的当前版本。不会打包、提交或推送。',
    );
    return;
  }
  if (!options.notes.length) {
    if (process.stdin.isTTY) throw new Error('请使用 --note 输入说明，或通过标准输入逐行传入');
    process.stdin.setEncoding('utf8');
    let input = '';
    for await (const chunk of process.stdin) input += chunk;
    options.notes = input
      .split(/\r?\n/u)
      .map(line => line.trim())
      .filter(Boolean);
  }
  console.log(JSON.stringify(await updateReleaseNotes(options), null, 2));
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
