/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { createSourceFile, isFunctionDeclaration, ScriptTarget, transpileModule, ModuleKind } from 'typescript';

const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const source = await read('src/util/regexDisplay.ts');
const compiled = transpileModule(source, {
  compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 },
}).outputText;
const regex = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('content cleanup matches structured identities, preserving other apps, entries and versions', () => {
  const key = regex.contentRegexUsageKey;
  const usages = Object.fromEntries(
    [
      'theater',
      'reader',
      'content:invalid',
      key('theater', ['entry', 'v1']),
      key('theater', ['entry', 'v2']),
      key('theater', ['entry-other', 'v1']),
      key('letters', ['entry', 'v1']),
    ].map(k => [k, { displayRuleIds: ['r'] }]),
  );
  regex.deleteContentRegexUsages(usages, 'theater', ['entry', 'v1']);
  assert.equal(usages[key('theater', ['entry', 'v1'])], undefined);
  assert.ok(usages[key('theater', ['entry', 'v2'])]);
  regex.deleteContentRegexUsages(usages, 'theater', ['entry']);
  assert.equal(usages[key('theater', ['entry', 'v2'])], undefined);
  assert.ok(usages[key('theater', ['entry-other', 'v1'])]);
  assert.ok(usages[key('letters', ['entry', 'v1'])]);
  assert.ok(usages.theater);
  assert.ok(usages.reader);
  assert.ok(usages['content:invalid']);
});

test('reply cleanup can target an entire thread, one version or one reply', () => {
  const key = regex.contentRegexUsageKey;
  const usages = Object.fromEntries(
    [
      ['t', 'v1', 'r1'],
      ['t', 'v1', 'r2'],
      ['t', 'v2', 'r1'],
      ['other', 'v1', 'r1'],
    ].map(ids => [key('forum-reply', ids), {}]),
  );
  regex.deleteContentRegexUsages(usages, 'forum-reply', ['t', 'v1', 'r1']);
  assert.equal(Object.keys(usages).length, 3);
  regex.deleteContentRegexUsages(usages, 'forum-reply', ['t', 'v1']);
  assert.equal(Object.keys(usages).length, 2);
  regex.deleteContentRegexUsages(usages, 'forum-reply', ['t']);
  assert.deepEqual(Object.keys(usages), [key('forum-reply', ['other', 'v1', 'r1'])]);
});

test('Tavern import copies only expressions and preserves literal flags and capture replacements', () => {
  const native = {
    scriptName: 'Example',
    findRegex: '/(rain)/gi',
    replaceString: '$1!',
    minDepth: 7,
    maxDepth: 9,
    disabled: true,
    placement: [2],
  };
  const [rule] = regex.parseTavernRegexImport(native);
  assert.deepEqual(rule, {
    name: 'Example',
    pattern: '/(rain)/gi',
    flags: 'gi',
    replacement: '$1!',
    operation: 'replace',
  });
  assert.equal(regex.applyRegexDisplayRules('RAIN rain', [{ ...rule, renderMode: 'text' }]).content, 'RAIN! rain!');
  assert.deepEqual(
    regex.parseTavernRegexImport([
      { script_name: 'Example', find_regex: native.findRegex, replace_string: native.replaceString },
    ]),
    [rule],
  );
  assert.equal(regex.parseTavernRegexImport({ ...native, findRegex: '/rain/i' })[0].flags, 'i');
  assert.equal(regex.parseTavernRegexImport({ ...native, findRegex: 'rain', replaceString: '' })[0].replacement, '');
});

test('import preserves whitespace, newlines, escaped slashes and non-global semantics', () => {
  for (const [pattern, input, expected] of [
    ['/ foo /g', 'foo / foo / food', 'foo /X/ food'],
    [' foo ', 'foo / foo / foo ', 'foo /X/ foo '],
    ['/\\nfoo\\n/g', 'foo\nfoo\nbar', 'fooXbar'],
    [String.raw`/a\/b/g`, 'a/b a/b', 'X X'],
    ['/(foo)/', 'foo foo', 'X foo'],
  ]) {
    const [rule] = regex.parseTavernRegexImport({ scriptName: 'r', findRegex: pattern, replaceString: 'X' });
    assert.equal(regex.applyRegexDisplayRules(input, [{ ...rule, renderMode: 'text' }]).content, expected, pattern);
  }
});

test('original version alone inherits legacy selections; existing choices are never overwritten', () => {
  const key = regex.contentRegexUsageKey;
  for (const app of ['theater', 'extras', 'letters', 'forum']) {
    const selected = { displayRuleIds: ['r'] };
    const usages = { [key(app, ['entry', ''])]: selected, [key(app, ['other', ''])]: selected };
    const versions = [
      { id: 'original', origin: 'original' },
      { id: 'rewrite', origin: 'rewrite' },
    ];
    regex.migrateOriginalRegexUsages(usages, app, 'entry', versions);
    assert.equal(usages[key(app, ['entry', 'original'])], selected);
    assert.equal(usages[key(app, ['entry', ''])], undefined);
    assert.equal(usages[key(app, ['entry', 'rewrite'])], undefined);
    assert.equal(usages[key(app, ['other', ''])], selected);
    usages[key(app, ['entry', ''])] = selected;
    const empty = { displayRuleIds: [] };
    usages[key(app, ['entry', 'original'])] = empty;
    regex.migrateOriginalRegexUsages(usages, app, 'entry', versions);
    assert.equal(usages[key(app, ['entry', 'original'])], empty);
    const snapshot = structuredClone(usages);
    regex.migrateOriginalRegexUsages(usages, app, 'entry', versions);
    assert.deepEqual(usages, snapshot);
  }
});

test('ambiguous originals stay untouched; forum reply choices migrate with original', () => {
  const key = regex.contentRegexUsageKey;
  const usages = { [key('forum-reply', ['thread', '', 'reply'])]: { displayRuleIds: ['r'] } };
  const snapshot = structuredClone(usages);
  for (const versions of [
    [],
    [{ id: 'a', origin: 'rewrite' }],
    [
      { id: 'a', origin: 'original' },
      { id: 'b', origin: 'original' },
    ],
  ]) {
    regex.migrateOriginalRegexUsages(usages, 'forum', 'thread', versions);
    assert.deepEqual(usages, snapshot);
  }
  regex.migrateOriginalRegexUsages(usages, 'forum', 'thread', [{ id: 'a', origin: 'original' }]);
  assert.deepEqual(usages, { [key('forum-reply', ['thread', 'a', 'reply'])]: { displayRuleIds: ['r'] } });
});

test('reader rename parses exact scope identity and preserves explicit destination choices', () => {
  const key = regex.contentRegexUsageKey;
  const source = 'char:1:chat:a,"[]';
  const target = 'char:1:chat:b';
  const usages = {
    [key('reader', [source, 0, 0])]: ['one'],
    [key('reader', [source, 0, 1])]: ['two'],
    [key('reader', [target, 0, 1])]: [],
    [key('reader', [source + 'suffix', 0, 0])]: ['other'],
    [key('theater', [source, 0, 0])]: ['other'],
    'content:invalid': ['other'],
  };
  assert.equal(regex.migrateReaderRegexUsages(usages, [source], target), 2);
  assert.deepEqual(usages[key('reader', [target, 0, 0])], ['one']);
  assert.deepEqual(usages[key('reader', [target, 0, 1])], []);
  assert.equal(usages[key('reader', [source, 0, 0])], undefined);
  assert.deepEqual(usages[key('reader', [source + 'suffix', 0, 0])], ['other']);
  assert.deepEqual(usages[key('theater', [source, 0, 0])], ['other']);
  assert.deepEqual(usages['content:invalid'], ['other']);
  assert.equal(regex.migrateReaderRegexUsages(usages, [source], target), 0);
});

test('failed display rules keep source and allow valid rules to continue', () => {
  const raw = 'rain';
  const result = regex.applyRegexDisplayRules(raw, [
    { name: 'bad', pattern: '[', flags: '', replacement: '', renderMode: 'text' },
    { name: 'good', pattern: 'rain', flags: '', replacement: 'sun', renderMode: 'text' },
  ]);
  assert.equal(raw, 'rain');
  assert.equal(result.content, 'sun');
  assert.equal(result.errors.length, 1);
  assert.deepEqual(result.applied, ['good']);
});

test('invalid imports fail before any rules are created', () => {
  assert.throws(
    () => regex.parseTavernRegexImport({ scriptName: 'Broken', findRegex: '[', replaceString: '' }),
    /Broken/,
  );
  assert.throws(() => regex.parseTavernRegexImport([null]), /1/);
  assert.throws(() => regex.parseTavernRegexImport({ scriptName: 'Missing', findRegex: 'x' }), /1/);
});

test('bulk move appends in source order, leaves other rules intact and supports ungrouped', () => {
  const rules = [
    { id: 'a', groupId: 'one' },
    { id: 'b', groupId: 'two' },
    { id: 'c', groupId: 'one' },
    { id: 'd', groupId: 'two' },
  ];
  const moved = regex.moveRegexRulesToGroup(rules, ['c', 'a'], 'two');
  assert.deepEqual(
    moved.map(rule => rule.id),
    ['b', 'd', 'a', 'c'],
  );
  assert.ok(moved.every(rule => rule.groupId === 'two'));
  assert.equal(rules[0].groupId, 'one');
  assert.equal(regex.moveRegexRulesToGroup(rules, ['a'], '').at(-1).groupId, '');
});

test('content identity separates apps, entries, versions and chat floors without changing raw text', () => {
  const keys = [
    ['theater', ['one', 'v1']],
    ['theater', ['two', 'v1']],
    ['theater', ['one', 'v2']],
    ['letters', ['one', 'v1']],
    ['reader', ['chat-a', 0, 0]],
    ['reader', ['chat-b', 0, 0]],
  ].map(([app, identity]) => regex.contentRegexUsageKey(app, identity));
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(regex.contentRegexUsageKey('theater', []), '');
  const raw = 'rain';
  const rules = [
    { id: 'r', name: 'r', pattern: 'rain', flags: 'g', replacement: 'sun', operation: 'replace', renderMode: 'text' },
  ];
  assert.equal(regex.applyRegexDisplayRules(raw, regex.getRegexRulesByIds(rules, ['r'], 'replace')).content, 'sun');
  assert.equal(regex.applyRegexDisplayRules(raw, regex.getRegexRulesByIds(rules, [], 'replace')).content, raw);
});

test('both generation routes place App prompt before task, and keep remaining order', async () => {
  const source = await read('src/util/generation.ts');
  const ast = createSourceFile('generation.ts', source, ScriptTarget.Latest, true);
  const functions = ast.statements.filter(
    node =>
      isFunctionDeclaration(node) &&
      ['normalizeSegment', 'buildGenerationUserInput', 'buildPhoneUserInput'].includes(node.name?.text),
  );
  const code = transpileModule(functions.map(node => node.getText(ast).replace(/^export /, '')).join('\n'), {
    compilerOptions: { target: ScriptTarget.ES2022 },
  }).outputText;
  const context = { parsePrettified: (_schema, input) => input, GenerationRequestPartsSchema: {} };
  const builders = runInNewContext(`${code}; ({ buildGenerationUserInput, buildPhoneUserInput })`, context);
  const input = {
    appPrompt: 'APP',
    taskInstruction: 'TASK',
    typePrompt: 'TYPE',
    userRequirement: 'USER',
    outputFormat: 'FORMAT',
  };
  assert.equal(builders.buildGenerationUserInput(input), 'APP\n\nTASK\n\nTYPE\n\nUSER\n\nFORMAT');
  assert.equal(builders.buildPhoneUserInput(input, 'FORM'), 'APP\n\nTASK\n\nTYPE\n\nFORM\n\nFORMAT');
  const service = await read('src/core/generationService.ts');
  assert.ok(
    service.indexOf("appendPreviewSection(previewLines, 'App 预设'") <
      service.indexOf("appendPreviewSection(previewLines, '本次任务'"),
  );
});

test('preview does not invoke Tavern display regex or inherit App-wide replacements', async () => {
  const preview = await read('src/components/GenerationPreviewPanel.vue');
  assert.doesNotMatch(preview, /formatAsTavernRegexedString|useRegexDisplayStore|applyRegexDisplayRules/);
  const shell = await read('src/components/ReaderDetailShell.vue');
  assert.doesNotMatch(shell, /getUsage\(props.displayAppId\)/);
  assert.match(shell, /ContentRegexModal/);
  const custom = await read('src/apps/app-builder/CustomAppHost.vue');
  assert.doesNotMatch(custom, /replacementRules|displayActiveEntry/);
  assert.match(custom, /:display-identity="\[activeEntry.id\]"/);
  assert.match(custom, /:content="displayContent"/);
});
