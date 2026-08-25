/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

const source = await readFile(new URL('../../src/util/pluginMacros.ts', import.meta.url), 'utf8');
const output = transpileModule(source, {
  compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 },
  fileName: 'pluginMacros.ts',
}).outputText;
const macros = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
const generationService = await readFile(new URL('../../src/core/generationService.ts', import.meta.url), 'utf8');

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
      repeat: false,
      roles: 'A\nB',
    });
    const values = macros
      .replacePluginMacros(assign)
      .split('；')
      .map(item => item.split('：')[1]);
    assert.equal(new Set(values).size, 2);
  } finally {
    Math.random = originalRandom;
  }
});

test('plugin macros are registered only inside the phone generation lifecycle', () => {
  assert.match(generationService, /registerMacroLikeSafe\(PLUGIN_MACRO_PATTERN/u);
  assert.match(
    generationService,
    /macroRegistrations\.reverse\(\)\.forEach\(registration => registration\.stop\(\)\)/u,
  );
  assert.match(generationService, /replacePluginMacros/u);
});
