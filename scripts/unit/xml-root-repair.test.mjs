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

const candidates = await loadModule('../../src/util/parseCandidates.ts');
const diarySource = await readFile(new URL('../../src/core/diaryGeneration.ts', import.meta.url), 'utf8');
const outputParsingSource = await readFile(new URL('../../src/util/outputParsing.ts', import.meta.url), 'utf8');
const generationServiceSource = await readFile(new URL('../../src/core/generationService.ts', import.meta.url), 'utf8');

test('missing XML root endpoints produce one bounded repair candidate', () => {
  assert.deepEqual(candidates.createTaggedRootRepairCandidates('<title>标题</title></result>', 'result'), [
    {
      index: 0,
      raw: '<result><title>标题</title></result>',
      repair: { closing: false, opening: true, rootName: 'result' },
    },
  ]);
  assert.deepEqual(candidates.createTaggedRootRepairCandidates('<result><title>标题</title>', 'result'), [
    {
      index: 0,
      raw: '<result><title>标题</title></result>',
      repair: { closing: true, opening: false, rootName: 'result' },
    },
  ]);
  assert.deepEqual(candidates.createTaggedRootRepairCandidates('<title>标题</title>', 'result'), [
    {
      index: 0,
      raw: '<result><title>标题</title></result>',
      repair: { closing: true, opening: true, rootName: 'result' },
    },
  ]);
});

test('complete, duplicated or empty roots are not repaired', () => {
  assert.deepEqual(candidates.createTaggedRootRepairCandidates('<result>正文</result>', 'result'), []);
  assert.deepEqual(candidates.createTaggedRootRepairCandidates('<result><result>正文', 'result'), []);
  assert.deepEqual(candidates.createTaggedRootRepairCandidates('', 'result'), []);
});

test('repair warnings distinguish accepted and rejected validation attempts', () => {
  const accepted = candidates.parseTaggedOutputCandidates('<title>标题</title>', 'result', candidate => ({
    data: candidate,
    ok: candidate.includes('<title>'),
    raw: candidate,
    warnings: [],
  }));
  assert.equal(accepted.ok, true);
  assert.match(accepted.warnings.join('；'), /已自动补全 <result> 开始标签和结束标签/u);

  const rejected = candidates.parseTaggedOutputCandidates('普通文本', 'result', candidate => ({
    ok: false,
    raw: candidate,
    warnings: ['缺少必填字段'],
  }));
  assert.equal(rejected.ok, false);
  assert.match(rejected.warnings.join('；'), /仍未通过格式校验/u);
  assert.match(rejected.warnings.join('；'), /缺少必填字段/u);
});

test('root repair is shared by standard, diary and custom XML parsing after output cleaning', () => {
  assert.match(diarySource, /parseTaggedOutputCandidates\(raw, '日记', parseDiaryCandidate\)/u);
  assert.match(outputParsingSource, /config\.kind === 'xml'[\s\S]*extractRepairableTaggedOutputCandidates/u);
  const cleaningIndex = generationServiceSource.indexOf('normalizeAndCleanGenerationResult(result)');
  const parseIndex = generationServiceSource.indexOf('adapter.parse(parseInput');
  const failedDraftIndex = generationServiceSource.indexOf('options.createFailedDraft({', parseIndex);
  assert.ok(cleaningIndex >= 0 && parseIndex > cleaningIndex);
  assert.ok(failedDraftIndex > parseIndex);
});
