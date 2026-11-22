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

const { applyRegexDisplayRules } = await moduleAt('src/util/regexDisplay.ts');

async function functionsAt(path, names, context) {
  const ast = createSourceFile(path, await read(path), ScriptTarget.Latest, true);
  const functions = [];
  function visit(node) {
    if (isFunctionDeclaration(node) && names.includes(node.name?.text)) functions.push(node.getText(ast));
    node.forEachChild(visit);
  }
  visit(ast);
  assert.equal(functions.length, names.length);
  const code = transpileModule(functions.join('\n').replace(/\bexport\s+/g, ''), {
    compilerOptions: { target: ScriptTarget.ES2022 },
  }).outputText;
  return runInNewContext(`${code}; ({ ${names.join(',')} })`, context);
}

const { applyContentCleanup, hasCleanupContent } = await functionsAt(
  'src/util/contentCleanupApply.ts',
  ['applyContentCleanup', 'hasCleanupContent'],
  { applyRegexDisplayRules },
);

const commentRule = {
  find: '^[ \\t]*<!--(?![^\\n]*-->)[\\s\\S]*?^[ \\t]*-->[ \\t]*$',
  flags: 'gm',
  renderMode: 'text',
  replace: '',
};

test('cleanup snapshot strips the draft comment block and keeps the cards', () => {
  const content = ['<!-- 草稿：', '  <!-- 塞缪尔卡牌 -->', '  正文', '-->', '', '<div>正文卡片</div>'].join('\n');
  const result = applyContentCleanup(content, { enabled: true, rules: [commentRule] });
  assert.equal(result.errors.length, 0);
  assert.equal(result.content.trim(), '<div>正文卡片</div>');
});

test('cleanup leaves content untouched without a snapshot or with the switch off', () => {
  const content = '<!-- 草稿： -->\n正文';
  assert.equal(applyContentCleanup(content, undefined).content, content);
  assert.equal(applyContentCleanup(content, { enabled: true, rules: [commentRule] }, false).content, content);
});

test('an emptied version is reported as having no referenceable content', () => {
  const content = '<!-- 草稿：\n  <!-- 卡牌 -->\n  正文\n-->';
  assert.equal(hasCleanupContent({ cleanup: { enabled: true, rules: [commentRule] }, content }), false);
  assert.equal(hasCleanupContent({ cleanup: { enabled: true, rules: [commentRule] }, content: '<p>正文</p>' }), true);
  assert.equal(hasCleanupContent({ content: '<p>旧内容</p>' }), true);
});
