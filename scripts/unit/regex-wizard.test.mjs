/* eslint-disable import-x/no-named-as-default-member, import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../../src/apps/regex-wizard/model.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  fileName: 'model.ts',
}).outputText;
const wizard = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);

test('tag boundary generation extracts all multiline blocks and emits a full expression', () => {
  const draft = wizard.createRegexWizardDraft();
  const generated = wizard.generateRegexWizardRule(draft);
  const tested = wizard.testRegexWizardRule(
    generated,
    '<content type="main">\n第一段\n</content>\n<content>第二段</content>',
  );

  assert.equal(generated.operation, 'extract');
  assert.equal(generated.flags, 'gu');
  assert.match(generated.fullExpression, /^\/.+\/gu$/u);
  assert.deepEqual(
    tested.matches.map(match => match.output.trim()),
    ['第一段', '第二段'],
  );
});

test('first occurrence and literal boundaries escape regex punctuation', () => {
  const draft = wizard.createRegexWizardDraft();
  Object.assign(draft, {
    boundaryKind: 'literal',
    customEnd: '[/正文.]',
    customStart: '[正文+]',
    occurrence: 'first',
  });
  const generated = wizard.generateRegexWizardRule(draft);
  const tested = wizard.testRegexWizardRule(generated, '[正文+]一[/正文.] [正文+]二[/正文.]');

  assert.equal(generated.flags, 'u');
  assert.equal(tested.matches.length, 1);
  assert.equal(tested.matches[0].output, '一');
});

test('ordered fields support capture, fixed values, optional fields, and custom output separators', () => {
  const draft = wizard.createRegexWizardDraft();
  draft.mode = 'fields';
  draft.fieldStructure = 'tag';
  draft.outputSeparator = '\n';
  draft.fields = [
    { ...wizard.createRegexWizardField(0), label: '标题', multiline: false, tagName: 'title' },
    {
      ...wizard.createRegexWizardField(1),
      fixedValue: 'forum',
      kind: 'fixed',
      label: '类型',
      multiline: false,
      tagName: 'type',
    },
    { ...wizard.createRegexWizardField(2), label: '正文', tagName: 'body' },
    { ...wizard.createRegexWizardField(3), kind: 'ignore', label: '备注', optional: true, tagName: 'note' },
  ];
  const generated = wizard.generateRegexWizardRule(draft);
  const tested = wizard.testRegexWizardRule(
    generated,
    '<title>主题</title>\n<type>forum</type>\n<body>第一行\n第二行</body>',
  );

  assert.equal(tested.error, '');
  assert.equal(tested.matches.length, 1);
  assert.equal(tested.matches[0].output, '主题\n第一行\n第二行');
});

test('line fields are matched inside one outer tag and repeated names keep their order', () => {
  const draft = wizard.createRegexWizardDraft();
  draft.mode = 'fields';
  draft.fieldStructure = 'line';
  draft.fieldsContainerTagName = 'aa';
  draft.outputSeparator = '\n';
  draft.fields = [
    { ...wizard.createRegexWizardField(0), label: '第一项', multiline: false, tagName: '固定字段' },
    { ...wizard.createRegexWizardField(1), label: '第二项', multiline: false, tagName: '固定字段' },
  ];
  const generated = wizard.generateRegexWizardRule(draft);
  const tested = wizard.testRegexWizardRule(generated, '<aa>\n固定字段：第一段内容\n固定字段: 第二段内容\n</aa>');

  assert.equal(tested.error, '');
  assert.equal(tested.matches.length, 1);
  assert.equal(tested.matches[0].output, '第一段内容\n第二段内容');
  assert.deepEqual(tested.matches[0].captures, { field1: '第一段内容', field2: '第二段内容' });
});

test('line fields support fixed values and optional rows', () => {
  const draft = wizard.createRegexWizardDraft();
  draft.mode = 'fields';
  draft.fieldStructure = 'line';
  draft.fieldsContainerTagName = 'aa';
  draft.fields = [
    {
      ...wizard.createRegexWizardField(0),
      fixedValue: 'xx',
      kind: 'fixed',
      label: '类型',
      multiline: false,
      tagName: '固定字段',
    },
    { ...wizard.createRegexWizardField(1), label: '正文', multiline: false, tagName: '正文' },
    { ...wizard.createRegexWizardField(2), kind: 'ignore', label: '备注', optional: true, tagName: '备注' },
  ];
  const generated = wizard.generateRegexWizardRule(draft);
  const tested = wizard.testRegexWizardRule(generated, '<aa>\n固定字段：xx\n正文：内容\n</aa>');

  assert.equal(tested.error, '');
  assert.equal(tested.matches[0].output, '内容');
});

test('remove mode creates a replacement rule with an empty replacement', () => {
  const draft = wizard.createRegexWizardDraft();
  draft.purpose = 'remove-block';
  const generated = wizard.generateRegexWizardRule(draft);

  assert.equal(generated.operation, 'replace');
  assert.equal(generated.replacement, '');
});
