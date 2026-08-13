/* eslint-disable import-x/no-named-as-default-member, import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../../src/apps/card-writer/profileImport.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  fileName: 'profileImport.ts',
}).outputText;
const importer = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);

test('world tags become separate profiles and calendar fields are mapped', () => {
  const result = importer.parseCardWriterProfileCandidates([
    {
      id: 'worldview',
      label: '世界观',
      content:
        '<worldview_overview name="总纲">世界核心</worldview_overview>\n<worldview_area name="北境">寒冷区域</worldview_area>\n<calendar name="星历">历法名称: 星历\n纪元名称: 星元\n每年月份: 10\n每月天数: 36</calendar>',
    },
  ]);

  assert.deepEqual(
    result.map(item => item.title),
    ['总纲', '北境', '星历'],
  );
  assert.equal(result[2].fields.calendarEraName, '星元');
  assert.equal(result[2].fields.calendarMonthDays, '36');
});

test('character base and palette with the same name are merged', () => {
  const result = importer.parseCardWriterProfileCandidates([
    {
      id: 'character-base-1',
      label: '角色基础（林月）',
      content: '<sample_basic name="林月">姓名: 林月\n出生日期: 2001-03-09\n身份: 医生</sample_basic>',
    },
    {
      id: 'palette-1',
      label: '性格调色盘（林月）',
      content: '<sample_palette name="林月">底色: 克制</sample_palette>',
    },
  ]);

  assert.equal(result.length, 1);
  assert.equal(result[0].title, '林月');
  assert.equal(result[0].fields.birthDate, '2001-03-09');
  assert.match(result[0].fields.details, /底色: 克制/u);
});

test('legacy suffix tags remain supported', () => {
  const result = importer.parseCardWriterProfileCandidates([
    {
      id: 'legacy',
      label: '旧成品',
      content: '<worldview_area_北境>区域内容</worldview_area_北境>\n<npc_1>姓名: 王静\n出生日期: 1990年5月1日</npc_1>',
    },
  ]);

  assert.deepEqual(
    result.map(item => item.title),
    ['北境', '王静'],
  );
});

test('nested calendar inside a worldview tag is also extracted', () => {
  const result = importer.parseCardWriterProfileCandidates([
    {
      id: 'nested',
      label: '世界观',
      content:
        '<worldview name="浮岛世界">总设定\n<calendar name="岛历">历法名称: 岛历\n每年月份: 8\n每月天数: 40</calendar>\n</worldview>',
    },
  ]);

  assert.deepEqual(
    result.map(item => item.title),
    ['浮岛世界', '岛历'],
  );
  assert.equal(result[0].fields.calendarName, undefined);
  assert.equal(result[1].fields.calendarName, '岛历');
});
