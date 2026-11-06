/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ModuleKind, ScriptTarget, transpileModule, createSourceFile, isFunctionDeclaration } from 'typescript';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../../src/util/pluginMacros.ts', import.meta.url), 'utf8');
const output = transpileModule(source, {
  compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 },
  fileName: 'pluginMacros.ts',
}).outputText;
const macros = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
const generationService = await readFile(new URL('../../src/core/generationService.ts', import.meta.url), 'utf8');

test('missing and blank numeric arguments use defaults, while explicit zero remains valid', () => {
  for (const suffix of ['', '&min=&max=']) {
    assert.equal(macros.resolvePluginMacro('pick', `items=only${suffix}`), 'only');
  }
  assert.equal(macros.resolvePluginMacro('pick', 'items=only&min=0&max=0'), '');
  assert.equal(macros.resolvePluginMacro('dice', 'min=6&max=6'), '6');
  assert.equal(macros.resolvePluginMacro('dice', 'min=6&max=6&target='), '6');
  assert.equal(macros.resolvePluginMacro('dice', 'min=6&max=6&target=0'), '6（成功）');
});

test('all random source fields are sampled once before native input and repeated phone input copies', async () => {
  const source = await readFile(new URL('../../src/util/generation.ts', import.meta.url), 'utf8');
  const ast = createSourceFile('generation.ts', source, ScriptTarget.Latest, true);
  const functions = ast.statements.filter(
    node =>
      isFunctionDeclaration(node) &&
      ['normalizeSegment', 'buildGenerationUserInput', 'buildPhoneUserInput'].includes(node.name?.text),
  );
  const code = transpileModule(functions.map(node => node.getText(ast).replace(/^export /, '')).join('\n'), {
    compilerOptions: { target: ScriptTarget.ES2022 },
  }).outputText;
  const builders = runInNewContext(`${code}; ({buildGenerationUserInput, buildPhoneUserInput})`, {
    parsePrettified: (_schema, input) => input,
    GenerationRequestPartsSchema: {},
  });
  const original = Math.random;
  let calls = 0;
  Math.random = () => (++calls % 2 ? 0 : 0.99);
  try {
    const dice = '{{phone:dice?min=1&max=100}}';
    const raw = {
      appPrompt: dice,
      taskInstruction: '{{phone:assign?roles=X%0AY&items=A%0AB}}',
      typePrompt: '{{phone:pick?items=A%0AB&min=1&max=1}}',
      userRequirement: `${dice} / ${dice}`,
      outputFormat: 'plain {{user}} {{char}} {{setvar::x::1}} {{getvar::x}}',
    };
    const request = macros.resolveGenerationRandomMacros(raw);
    const count = calls;
    const native = builders.buildGenerationUserInput(request);
    const phone = builders.buildPhoneUserInput(request, request.userRequirement);
    assert.equal(native, phone);
    assert.equal(macros.replacePluginMacros(`${phone}\n${phone}`), `${native}\n${native}`);
    assert.equal(calls, count);
    assert.doesNotMatch(native, /\{\{phone:/);
    assert.equal(request.outputFormat, raw.outputFormat);
    assert.notEqual(...request.userRequirement.split(' / '));
    assert.equal(raw.appPrompt, dice);
    macros.resolveGenerationRandomMacros(raw);
    assert.ok(calls > count, 'new generation must draw again');
    assert.match(generationService, /const request = resolveGenerationRandomMacros\(/);
    assert.match(generationService, /buildPhoneUserInput\(request, request\.userRequirement \|\| ''\)/);
  } finally {
    Math.random = original;
  }
});

test('dice macros include the roll and threshold result', () => {
  const originalRandom = Math.random;
  Math.random = () => 0.75;
  try {
    const macro = macros.buildPluginMacro('dice', {
      failure: '失败',
      max: 100,
      min: 0,
      op: 'gte',
      success: '成功',
      target: 60,
    });
    assert.match(macro, /failure=失败/u);
    assert.match(macro, /success=成功/u);
    assert.doesNotMatch(macro, /%E[0-9A-F]{2}/u);
    assert.equal(macros.replacePluginMacros(macro), '75（成功）');
  } finally {
    Math.random = originalRandom;
  }
});

test('readable macro values still escape parameter delimiters', () => {
  const macro = macros.buildPluginMacro('dice', {
    failure: '失=败',
    max: 0,
    min: 0,
    op: 'gte',
    success: '成&功',
    target: 0,
  });
  assert.match(macro, /failure=失%3D败/u);
  assert.match(macro, /success=成%26功/u);
  assert.equal(macros.replacePluginMacros(macro), '0（成&功）');
});

test('pick and assign macros honor random counts and non-repeating pools', () => {
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    const pick = macros.buildPluginMacro('pick', { items: '甲\n乙\n丙', max: 2, min: 2, repeat: false });
    const picked = macros.replacePluginMacros(pick).split('、');
    assert.equal(picked.length, 2);
    assert.equal(new Set(picked).size, 2);

    const assign = macros.buildPluginMacro('assign', {
      items: '身份1\n身份2\n身份3',
      placement: 'after',
      repeat: false,
      roles: 'A\nB',
    });
    const assigned = macros.replacePluginMacros(assign);
    assert.doesNotMatch(assigned, /：/u);
    const values = assigned.split('；').map(item => item.split(' ')[1]);
    assert.equal(new Set(values).size, 2);

    const before = macros.buildPluginMacro('assign', {
      items: '身份1',
      placement: 'before',
      repeat: false,
      roles: '{{char}}',
    });
    assert.equal(macros.replacePluginMacros(before), '身份1 {{char}}');
  } finally {
    Math.random = originalRandom;
  }
});

test('plugin macros are registered only inside the phone generation lifecycle', () => {
  assert.match(generationService, /registerMacroLikeSafe\(\s*PLUGIN_MACRO_PATTERN/u);
  assert.match(
    generationService,
    /macroRegistrations\.reverse\(\)\.forEach\(registration => registration\.stop\(\)\)/u,
  );
  assert.match(generationService, /replacePluginMacros/u);
  assert.match(
    generationService,
    /replaceGenerationAliases\(\s*resolvePluginMacro\(String\(kind\), String\(query\)\),\s*aliases/u,
  );
});

test('plugin preset prompts use the resolved user and character aliases', () => {
  assert.match(generationService, /resolveGenerationIdentityAliases\(useGenerationAliasesStore\(\)\)/u);
  assert.match(
    generationService,
    /buildPluginPresetOrderedPrompts\(pluginPresetRecord, generationMacroVariables\)\.map\(prompt/u,
  );
  assert.match(generationService, /replaceGenerationAliases\(prompt\.content, generationAliases\)/u);
});
