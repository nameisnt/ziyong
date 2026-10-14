/* eslint-disable import-x/no-nodejs-modules, import-x/no-named-as-default-member, import-x/no-dynamic-require */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import lodash from 'lodash';

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
const aliases = await load('../../src/util/generationAliases.ts', { '@/util/runtime': {} });
const macros = await load('../../src/util/pluginMacros.ts');
const mvu = await load('../../src/util/generationMvu.ts');
let nativeCalls;
let variables;
let available = true;
const model = await load('../../src/util/pluginPresetMacros.ts', {
  './generationAliases': aliases,
  './generationMvu': mvu,
  './pluginMacros': macros,
  './runtime': {
    getSillyTavernContext: () =>
      available
        ? {
            substituteParamsExtended(content, names) {
              nativeCalls.push(content);
              return content
                .replace(/\{\{(setvar|getvar|addvar)::([^:{}]+)(?:::([^{}]*))?\}\}/g, (_, kind, key, value) => {
                  if (kind === 'getvar') return variables[key] || '';
                  variables[key] = kind === 'addvar' ? String(Number(variables[key] || 0) + Number(value)) : value;
                  return '';
                })
                .replace(/\{\{(user|char)\}\}/g, (_, key) => names[key] || 'HOST');
            },
          }
        : {},
  },
});
const context = () => ({
  aliases: { userReplacement: '插件用户', charReplacement: '插件角色' },
  phoneUserInput: '任务内容',
  variables: { taskInstruction: '任务要求' },
});
const prompt = content => ({ role: 'system', content });
function reset() {
  nativeCalls = [];
  variables = {};
  available = true;
}

test('custom entries resolve once in order, placeholders and raw preset stay unchanged', () => {
  reset();
  const config = {
    ordered_prompts: [
      prompt('{{setvar::n::1}}'),
      'chat_history',
      prompt('{{addvar::n::1}}'),
      prompt('值={{getvar::n}}'),
      'user_input',
    ],
  };
  const before = structuredClone(config);
  const result = model.preparePluginPresetMacroConfig(config, context());
  assert.equal(result.ordered_prompts[3].content, '值=2');
  assert.equal(nativeCalls.length, 3);
  assert.equal(result.ordered_prompts[1], 'chat_history');
  assert.equal(result.ordered_prompts[4], 'user_input');
  assert.deepEqual(config, before);
});

test('aliases, task variables and plugin macros are resolved before storing values', () => {
  reset();
  const result = model.preparePluginPresetMacroConfig(
    {
      ordered_prompts: [
        prompt('{{setvar::names::{{user}}/<char>/{{taskInstruction}}/{{phoneUserInput}}/{{phone:dice?min=7&max=7}}}}'),
        prompt('{{getvar::names}}'),
      ],
    },
    context(),
  );
  assert.equal(result.ordered_prompts[1].content, '插件用户/插件角色/任务要求/任务内容/7（成功）');
  assert.equal(nativeCalls.length, 2);
});

test('native values containing aliases or plugin macros retain plugin semantics', () => {
  reset();
  variables.saved = '{{user}}/<char>/{{phone:dice?min=9&max=9}}';
  const result = model.preparePluginPresetMacroConfig({ ordered_prompts: [prompt('{{getvar::saved}}')] }, context());
  assert.equal(result.ordered_prompts[0].content, '插件用户/插件角色/9（成功）');
});

test('plugin random macro used in a variable is sampled once, then reused', () => {
  reset();
  const original = Math.random;
  let count = 0;
  Math.random = () => {
    count++;
    return 0.5;
  };
  try {
    const result = model.preparePluginPresetMacroConfig(
      {
        ordered_prompts: [
          prompt('{{setvar::roll::{{phone:dice?min=1&max=6}}}}'),
          prompt('{{getvar::roll}}/{{getvar::roll}}'),
        ],
      },
      context(),
    );
    assert.equal(result.ordered_prompts[1].content, '4（成功）/4（成功）');
    assert.equal(count, 1);
  } finally {
    Math.random = original;
  }
});

test('source-floor MVU is substituted before native parsing and inside stored values', () => {
  reset();
  const c = { ...context(), mvuSnapshot: { targetId: 2, messageId: 2, statData: { score: 12 } } };
  const result = model.preparePluginPresetMacroConfig(
    {
      ordered_prompts: [
        prompt('{{setvar::score::{{get_message_variable::stat_data.score}}}}'),
        prompt('{{getvar::score}}'),
      ],
    },
    c,
  );
  assert.equal(result.ordered_prompts[1].content, '12');
  assert.ok(nativeCalls.every(content => !content.includes('get_message_variable')));
});

test('ordinary Tavern config bypasses native preprocessing, missing native API fails clearly', () => {
  reset();
  available = false;
  const config = { preset_name: 'native' };
  assert.equal(model.preparePluginPresetMacroConfig(config, context()), config);
  assert.throws(
    () => model.preparePluginPresetMacroConfig({ ordered_prompts: [prompt('test')] }, context()),
    /缺少原生宏解析接口/,
  );
});

test('capture and direct plugin generation share preprocessing inside their macro queue', async () => {
  const service = await readFile(new URL('../../src/core/generationService.ts', import.meta.url), 'utf8');
  for (const name of ['captureWithPhoneUserInput', 'generateWithPluginPreset']) {
    const start = service.indexOf(`function ${name}(`);
    const section = service.slice(start, service.indexOf('\nfunction ', start + 1));
    assert.match(section, /preparePluginPresetMacroConfig\(/);
    assert.ok(section.indexOf('runWithPhoneUserInputMacro(') < section.indexOf('preparePluginPresetMacroConfig('));
  }
});
