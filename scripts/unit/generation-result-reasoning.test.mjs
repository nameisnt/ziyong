/* eslint-disable import-x/no-named-as-default-member, import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function loadModule(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: relativePath,
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

const result = await loadModule('../../src/util/generationResult.ts');
const generationService = await readFile(new URL('../../src/core/generationService.ts', import.meta.url), 'utf8');

test('generation result separates normal content from OpenAI-compatible reasoning fields', () => {
  assert.deepEqual(
    result.normalizeGenerationResponse({
      choices: [{ message: { content: '<diary>正文</diary>', reasoning_content: '先分析角色视角' } }],
    }),
    { content: '<diary>正文</diary>', reasoning: '先分析角色视角' },
  );
  assert.deepEqual(
    result.normalizeGenerationResponse({ choices: [{ delta: { content: '续写', reasoning: '继续推理' } }] }),
    { content: '续写', reasoning: '继续推理' },
  );
  assert.deepEqual(result.normalizeGenerationResponse('普通酒馆返回'), { content: '普通酒馆返回', reasoning: '' });
});

test('generation result preserves both provider reasoning and cleaned XML reasoning without duplicating identical text', () => {
  assert.equal(result.mergeGenerationReasoning('外部思维链', '<think>XML 思维链</think>'), '外部思维链\n\n<think>XML 思维链</think>');
  assert.equal(result.mergeGenerationReasoning('相同内容', '相同内容'), '相同内容');
});

test('generation service records the separated reasoning while streaming only content', () => {
  assert.match(generationService, /normalizeGenerationResponse\(data\)/u);
  assert.match(generationService, /reasoning\s*\+=\s*delta\.reasoning/u);
  assert.match(generationService, /mergeGenerationReasoning\(normalized\.reasoning, cleanedOutput\.removedContent\)/u);
  assert.match(generationService, /generationRecord\.reasoning = cleanedOutput\.reasoning/u);
});
