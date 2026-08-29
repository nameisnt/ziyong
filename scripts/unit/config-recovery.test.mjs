/* eslint-disable import-x/no-named-as-default-member, import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const defaults = {
  hidden: false,
  mode: 'new-end',
  role: 'assistant',
  separator: '\n\n',
  targetMessageId: 0,
  template: '{{references}}',
};

function createSchemaStub() {
  return {
    parse: () => ({ ...defaults }),
    safeParse: value => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return { error: { issues: [{ message: '必须是对象' }] }, success: false };
      }
      if ('mode' in value && !['new-end', 'new-before', 'append-last', 'append-message'].includes(value.mode)) {
        return { error: { issues: [{ message: '模式无效' }] }, success: false };
      }
      return { data: { ...defaults, ...value }, success: true };
    },
  };
}

async function loadChatInsertStore(settings, saveCalls) {
  let source = await readFile(new URL('../../src/apps/chat-insert/store.ts', import.meta.url), 'utf8');
  source = source
    .replace(
      "import { saveSettingsDebounced } from '@sillytavern/script';",
      'const saveSettingsDebounced = () => { globalThis.__saveCalls.count += 1; };',
    )
    .replace(
      "import { extension_settings } from '@sillytavern/scripts/extensions';",
      'const extension_settings = globalThis.__extensionSettings;',
    )
    .replace(
      /export const ChatInsertSettingsSchema = z\.object\([\s\S]*?\n\}\);/,
      'const ChatInsertSettingsSchema = globalThis.__schemaStub;',
    )
    .replace(
      "export const useChatInsertStore = defineStore('chat-insert', () => {",
      "const useChatInsertStore = defineStore('chat-insert', () => {",
    );

  const runtime = `
    const klona = value => value === undefined ? undefined : structuredClone(value);
    const _ = {
      get: (value, key) => value?.[key],
      set: (value, key, next) => { value[key] = next; },
    };
    const ref = value => ({ value });
    const shallowRef = ref;
    const watch = () => {};
    const defineStore = (_id, setup) => setup;
  `;
  const output = ts.transpileModule(`${runtime}\n${source}\nexport { useChatInsertStore };`, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: 'chat-insert-store.ts',
  }).outputText;
  globalThis.__extensionSettings = settings;
  globalThis.__saveCalls = saveCalls;
  globalThis.__schemaStub = createSchemaStub();
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

async function loadChatScopedDomain(settings, saveCalls) {
  let source = await readFile(new URL('../../src/store/chatScoped.ts', import.meta.url), 'utf8');
  source = source
    .replace("import { parsePrettified } from '@/util/zod';", '')
    .replace("import { getOptionalGlobalFunction, getOptionalGlobalValue, onTavernEvent } from '@/util/runtime';", '')
    .replace('// eslint-disable-next-line import-x/no-nodejs-modules\n', '')
    .replace("import { saveSettingsDebounced } from '@sillytavern/script';", '')
    .replace("import { extension_settings } from '@sillytavern/scripts/extensions';", '')
    .replace("import type { ZodType } from 'zod';", '');

  const runtime = `
    const extension_settings = globalThis.__extensionSettings;
    const saveSettingsDebounced = () => { globalThis.__saveCalls.count += 1; };
    const parsePrettified = (schema, value) => {
      const result = schema.safeParse(value);
      if (!result.success) throw new Error(result.error.issues[0]?.message || '数据格式无效');
      return result.data;
    };
    const getOptionalGlobalFunction = name => {
      if (name === 'getCurrentChatId') return () => 'chat';
      if (name === 'getCurrentCharacterId') return () => 'char';
      return undefined;
    };
    const getOptionalGlobalValue = () => undefined;
    const onTavernEvent = () => ({ stop() {} });
    const SillyTavern = { chatId: 'chat', getCurrentChatId: () => 'chat', groupId: '' };
    const klona = value => value === undefined ? undefined : structuredClone(value);
    const _ = {
      get: (value, key) => value?.[key],
      isEqual: (left, right) => JSON.stringify(left) === JSON.stringify(right),
      set: (value, key, next) => { value[key] = next; },
    };
    const ref = value => ({ value });
    const shallowRef = ref;
    const computed = getter => ({ get value() { return getter(); } });
    const watch = () => {};
    const onScopeDispose = () => {};
  `;
  const output = ts.transpileModule(`${runtime}\n${source}`, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: 'chat-scoped.ts',
  }).outputText;
  globalThis.__extensionSettings = settings;
  globalThis.__saveCalls = saveCalls;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

test('a corrupted chat-insert config preserves raw data and does not persist defaults automatically', async () => {
  const corrupted = { mode: 'broken-mode', nested: { retain: true } };
  const settings = { sillytavern_phone_chat_insert: structuredClone(corrupted) };
  const saveCalls = { count: 0 };
  const { useChatInsertStore } = await loadChatInsertStore(settings, saveCalls);
  const store = useChatInsertStore();

  assert.match(store.configError.value, /配置校验失败/);
  assert.deepEqual(store.rawConfig.value, corrupted);
  assert.deepEqual(settings.sillytavern_phone_chat_insert, corrupted);
  assert.equal(saveCalls.count, 0);

  store.resetTemplate();
  assert.deepEqual(settings.sillytavern_phone_chat_insert, corrupted);
  assert.equal(saveCalls.count, 0);
});

test('the shared chat-scoped boundary protects corrupted workbench data until explicit reset', async () => {
  const field = 'sillytavern_phone_workbench';
  const scopeKey = 'char:char:chat:chat';
  const corrupted = { workflows: 'broken' };
  const settings = {
    [field]: {
      __chatScoped: true,
      legacyScopeMigrations: {},
      scopes: { [scopeKey]: structuredClone(corrupted) },
    },
  };
  const saveCalls = { count: 0 };
  const schema = {
    safeParse: value =>
      value && Array.isArray(value.workflows)
        ? { data: structuredClone(value), success: true }
        : { error: { issues: [{ message: '工作流必须是数组' }] }, success: false },
  };
  const defaults = { insertDrafts: [], logs: [], workflows: [] };
  const { useChatScopedDomain } = await loadChatScopedDomain(settings, saveCalls);
  const domain = useChatScopedDomain({ field, schema, createDefault: () => structuredClone(defaults) });

  assert.match(domain.configError.value, /工作流必须是数组/);
  assert.deepEqual(domain.rawConfig.value, corrupted);
  assert.deepEqual(settings[field].scopes[scopeKey], corrupted);
  assert.equal(saveCalls.count, 0);

  domain.resetCurrentScope();
  assert.equal(domain.configError.value, '');
  assert.equal(domain.rawConfig.value, undefined);
  assert.deepEqual(settings[field].scopes[scopeKey], defaults);
  assert.equal(saveCalls.count, 1);
});
