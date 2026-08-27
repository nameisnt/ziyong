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

test('generation result flattens structured non-stream text without object coercion', () => {
  assert.deepEqual(
    result.normalizeGenerationResponse({
      choices: [
        {
          message: {
            content: [
              { type: 'text', text: '<theater>' },
              { type: 'text', text: '正文</theater>' },
            ],
            reasoning_content: [
              { type: 'reasoning', text: '先判断人物关系。' },
              { type: 'reasoning', content: { text: '再安排冲突。' } },
            ],
          },
        },
      ],
    }),
    {
      content: '<theater>正文</theater>',
      reasoning: '先判断人物关系。再安排冲突。',
    },
  );

  const unknown = result.normalizeGenerationResponse({ metadata: { tokenCount: 12 } });
  assert.doesNotMatch(unknown.content, /\[object Object\]/u);
  assert.equal(unknown.reasoning, '');
});

test('generation result separates top-level and mixed content blocks without serializing tool objects', () => {
  assert.deepEqual(
    result.normalizeGenerationResponse([
      { type: 'reasoning', text: '先核对角色。' },
      { type: 'text', text: '<theater>' },
      { type: 'tool_call', name: 'lookup', arguments: { id: 1 } },
      { type: 'output_text', content: { text: '正文</theater>' } },
      { type: 'thinking', content: '再检查格式。' },
    ]),
    { content: '<theater>正文</theater>', reasoning: '先核对角色。再检查格式。' },
  );

  assert.deepEqual(
    result.normalizeGenerationResponse({
      choices: [
        {
          message: {
            content: [
              { type: 'text', text: '<summary>正文</summary>' },
              { type: 'reasoning', text: '内容数组内的思维链。' },
            ],
            reasoning_content: '供应商独立思维链。',
          },
        },
      ],
    }),
    {
      content: '<summary>正文</summary>',
      reasoning: '供应商独立思维链。\n\n内容数组内的思维链。',
    },
  );
});

test('generation result keeps readable diagnostics for unknown and circular top-level structures', () => {
  const unknown = result.normalizeGenerationResponse([{ metadata: { tokenCount: 12 } }]);
  assert.doesNotMatch(unknown.content, /\[object Object\]/u);
  assert.match(unknown.content, /tokenCount/u);

  const circular = [];
  circular.push(circular);
  assert.deepEqual(result.normalizeGenerationResponse(circular), {
    content: '[无法序列化的结构化响应]',
    reasoning: '',
  });
});

test('generation result preserves both provider reasoning and cleaned XML reasoning without duplicating identical text', () => {
  assert.equal(
    result.mergeGenerationReasoning('外部思维链', '<think>XML 思维链</think>'),
    '外部思维链\n\n<think>XML 思维链</think>',
  );
  assert.equal(result.mergeGenerationReasoning('相同内容', '相同内容'), '相同内容');
});

test('generation service records the separated reasoning while streaming only content', () => {
  assert.match(generationService, /normalizeGenerationResponse\(data\)/u);
  assert.match(generationService, /reasoning\s*\+=\s*delta\.reasoning/u);
  assert.match(generationService, /mergeGenerationReasoning\(normalized\.reasoning, cleanedOutput\.removedContent\)/u);
  assert.match(
    generationService,
    /generationRecord\.reasoning = cleanSavedGenerationReasoning\(cleanedOutput\.reasoning\)/u,
  );
  assert.doesNotMatch(generationService, /typeof payload === 'string' \? payload : String\(payload \?\? ''\)/u);
});
