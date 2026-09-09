/* eslint-disable import-x/no-nodejs-modules, import-x/no-named-as-default-member, import-x/no-dynamic-require */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import lodash from 'lodash';
import { parse } from 'yaml';

const require = createRequire(import.meta.url);
async function load(path, dependencies = {}) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function('exports', 'require', '_', output)(exports, name => dependencies[name] || require(name), lodash);
  return exports;
}
const mvu = await load('../../src/util/generationMvu.ts');
const message = stat_data => ({ variables: { 0: { stat_data } } });
const snap = (targetId = 2) => ({
  targetId,
  messageId: 2,
  statData: { points: 1000, active: false, count: 0, $schema: 'hidden' },
});

test('MVU uses target, nearest both directions, then earlier on ties', () => {
  const chat = [{}, {}, message({ points: 2 }), {}, message({ points: 4 }), {}, {}, message({ points: 7 })];
  for (const [target, expected] of [
    [0, 2],
    [2, 2],
    [3, 2],
    [5, 4],
    [6, 7],
    [7, 7],
  ]) {
    assert.equal(mvu.findGenerationMvuSnapshot(chat, [0, target]).messageId, expected);
  }
  assert.equal(mvu.findGenerationMvuSnapshot(chat, [6, 1]).messageId, 7);
  assert.equal(mvu.findGenerationMvuSnapshot(chat, []), null);
});

test('MVU honors active swipe and accepts false/zero but skips cleared records', () => {
  const chat = [
    message(null),
    message({}),
    { swipe_id: 1, variables: { 0: { stat_data: { wrong: 1 } }, 1: { stat_data: { zero: 0, no: false } } } },
  ];
  assert.deepEqual(mvu.findGenerationMvuSnapshot(chat, [0]).statData, { zero: 0, no: false });
  assert.equal(mvu.findGenerationMvuSnapshot([message({}), {}], [1]).messageId, null);
  assert.equal(mvu.findGenerationMvuSnapshot([], []), null);
});

test('MVU macro supports YAML, JSON, subpaths, indentation and internal-key filtering', () => {
  const s = snap();
  const original = structuredClone(s);
  assert.deepEqual(parse(mvu.replaceGenerationMvuMacros('{{format_message_variable::stat_data}}', s)), {
    points: 1000,
    active: false,
    count: 0,
  });
  assert.equal(
    mvu.replaceGenerationMvuMacros(
      '{{get_message_variable::stat_data.count}} {{get_message_variable::stat_data.active}}',
      s,
    ),
    '0 false',
  );
  const yaml = mvu.replaceGenerationMvuMacros('state:\n  {{format_message_variable::stat_data}}', s);
  assert.equal(parse(yaml).state.points, 1000);
  assert.equal(mvu.replaceGenerationMvuMacros('{{get_message_variable::stat_data["points"]}}', s), '1000');
  assert.deepEqual(s, original);
  for (const macro of ['{{format_chat_variable::stat_data}}', '{{format_message_variable::other}}', '{{char}}']) {
    assert.equal(mvu.replaceGenerationMvuMacros(macro, s), macro);
  }
});

test('only marked plugin requests are transformed, including multimodal text', () => {
  const other = { prompt: [{ content: '{{format_message_variable::stat_data}}' }] };
  const before = structuredClone(other);
  assert.equal(mvu.applyGenerationMvuToPrompt(other, '[request-a]', snap()), false);
  assert.deepEqual(other, before);
  const payload = {
    prompt: [
      {
        content: [
          { type: 'text', text: '[request-a]{{get_message_variable::stat_data.points}}' },
          { type: 'image_url', image_url: { url: 'unchanged' } },
        ],
      },
    ],
  };
  assert.equal(mvu.applyGenerationMvuToPrompt(payload, '[request-b]', snap()), false);
  assert.equal(mvu.applyGenerationMvuToPrompt(payload, '[request-a]', snap()), true);
  assert.equal(payload.prompt[0].content[0].text, '1000');
  assert.equal(payload.prompt[0].content[1].image_url.url, 'unchanged');
});

test('missing snapshots fail only when MVU is requested, not for ordinary prompts', () => {
  const missing = { targetId: 12, messageId: null, statData: null };
  assert.equal(mvu.replaceGenerationMvuMacros('ordinary prompt', missing), 'ordinary prompt');
  assert.throws(
    () => mvu.replaceGenerationMvuMacros('{{format_message_variable::stat_data}}', missing),
    /没有有效快照/,
  );
  assert.match(mvu.describeGenerationMvu({ ...snap(), targetId: 0 }), /第 2 层.*目标第 0 层.*最近快照/);
});

test('runtime removes listener on success, abort and missing-data failure without changing config', async () => {
  const listeners = new Set();
  let stopped = '';
  const context = {
    eventSource: { makeFirst: (_event, cb) => listeners.add(cb), removeListener: (_event, cb) => listeners.delete(cb) },
  };
  const runtime = await load('../../src/util/generationMvuRuntime.ts', {
    './generationMvu': mvu,
    './runtime': {
      getSillyTavernContext: () => context,
      getTavernEventName: () => 'before',
      getOptionalGlobalFunction: () => id => {
        stopped = id;
      },
    },
  });
  const config = { generation_id: 'a', user_input: 'request' };
  const result = await runtime.withGenerationMvu(config, snap(), async request => {
    const payload = {
      prompt: [{ content: '{{get_message_variable::stat_data.points}}' }, { content: request.user_input }],
    };
    listeners.forEach(cb => cb(payload));
    return payload;
  });
  assert.equal(result.prompt[0].content, '1000');
  assert.equal(result.prompt[1].content, 'request');
  assert.equal(config.user_input, 'request');
  assert.equal(listeners.size, 0);
  await assert.rejects(
    runtime.withGenerationMvu(config, snap(), async () => {
      throw new Error('aborted');
    }),
    /aborted/,
  );
  assert.equal(listeners.size, 0);
  await assert.rejects(
    runtime.withGenerationMvu(config, { targetId: 0, messageId: null, statData: null }, async request => {
      listeners.forEach(cb =>
        cb({ prompt: [{ content: request.user_input + '{{get_message_variable::stat_data}}' }] }),
      );
    }),
    /没有有效快照/,
  );
  assert.equal(stopped, 'a');
  assert.equal(listeners.size, 0);
  assert.equal(await runtime.withGenerationMvu(config, null, async request => request), config);
});

test('generation integration covers shared preview, native, plugin and external paths', async () => {
  const source = await readFile(new URL('../../src/core/generationService.ts', import.meta.url), 'utf8');
  assert.match(source, /getChatMessagesSafe\('0-\{\{lastMessageId\}\}'\)\.filter\(message => !message.is_hidden\)/);
  assert.match(source, /structuredClone\(selectedMvu\)/);
  assert.match(source, /withGenerationMvu\(generateConfig, mvuSnapshot, generateSafe\)/);
  assert.match(source, /withGenerationMvu\(generateConfig, mvuSnapshot, generateRawSafe\)/);
  assert.match(source, /withGenerationMvu\(generateConfig, mvuSnapshot, config =>/);
  assert.equal((source.match(/prepared\.mvuSnapshot/g) || []).length, 6);
});

test("overlapping requests cannot borrow each other's snapshot or intercept ordinary prompts", async () => {
  const listeners = new Set();
  const runtime = await load('../../src/util/generationMvuRuntime.ts', {
    './generationMvu': mvu,
    './runtime': {
      getSillyTavernContext: () => ({
        eventSource: {
          makeFirst: (_event, cb) => listeners.add(cb),
          removeListener: (_event, cb) => listeners.delete(cb),
        },
      }),
      getTavernEventName: () => 'before',
      getOptionalGlobalFunction: () => () => {},
    },
  });
  const pending = [];
  const requests = [1000, 1030].map((points, i) =>
    runtime.withGenerationMvu(
      { generation_id: String(i), user_input: 'task' },
      { targetId: i, messageId: i, statData: { points } },
      config => new Promise(resolve => pending.push({ config, resolve })),
    ),
  );
  const ordinary = { prompt: [{ content: '{{get_message_variable::stat_data.points}}' }] };
  listeners.forEach(cb => cb(ordinary));
  assert.equal(ordinary.prompt[0].content, '{{get_message_variable::stat_data.points}}');
  for (const [i, { config, resolve }] of pending.entries()) {
    const payload = { prompt: [{ content: config.user_input + '{{get_message_variable::stat_data.points}}' }] };
    listeners.forEach(cb => cb(payload));
    assert.equal(payload.prompt[0].content, 'task' + [1000, 1030][i]);
    resolve(payload);
  }
  await Promise.all(requests);
  assert.equal(listeners.size, 0);
});
