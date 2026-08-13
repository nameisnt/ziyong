/* eslint-disable import-x/no-named-as-default-member, import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function loadChatScopeRename() {
  let source = await readFile(new URL('../../src/util/chatScopeRename.ts', import.meta.url), 'utf8');
  source = source
    .replace(
      "import { getRegisteredPhoneBackupRehydrateHandlers } from '@/core/appRegistry';",
      'const getRegisteredPhoneBackupRehydrateHandlers = () => [];',
    )
    .replace(
      /import \{[\s\S]*?\} from '@\/store\/chatScoped';/,
      `const buildChatScopeKey = (kind, ownerId, chatId) => \
        \`${'${kind}'}:${'${ownerId}'}:chat:${'${chatId}'}\`;
       const getCurrentChatScopeKey = () => 'char:visual:chat:new';
       const getCurrentOwnerAliases = () => ['visual'];
       const normalizeChatScopeId = value => String(value).replace(/\\.jsonl$/, '');
       const parseChatScopeKey = value => {
         const [kind, ownerId, marker, chatId] = value.split(':');
         return { kind: marker === 'chat' ? kind : 'unknown', ownerId, chatId: chatId || '' };
       };`,
    )
    .replace(
      "import { getOptionalGlobalValue } from '@/util/runtime';",
      'const getOptionalGlobalValue = () => null;',
    )
    .replace(
      "import { saveSettingsDebounced } from '@sillytavern/script';",
      'const saveSettingsDebounced = () => { globalThis.__chatScopeSaveCalls += 1; };',
    )
    .replace(
      "import { extension_settings } from '@sillytavern/scripts/extensions';",
      'const extension_settings = globalThis.__chatScopeSettings;',
    );
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: 'chatScopeRename.ts',
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

globalThis.__chatScopeSaveCalls = 0;
globalThis.__chatScopeSettings = {};
const { migratePhoneChatScopes } = await loadChatScopeRename();

function resetSettings(value) {
  Object.keys(globalThis.__chatScopeSettings).forEach(key => delete globalThis.__chatScopeSettings[key]);
  Object.assign(globalThis.__chatScopeSettings, value);
  globalThis.__chatScopeSaveCalls = 0;
}

test('chat scope rename moves phone data and references while leaving non-phone settings untouched', () => {
  const source = 'char:visual:chat:old';
  const target = 'char:visual:chat:new';
  const originalSource = { entries: [{ scopeId: source }], title: '来源数据' };
  resetSettings({
    unrelated_setting: { [source]: { shouldStay: true }, reference: source },
    sillytavern_phone_forum: {
      currentScope: source,
      scopes: {
        [source]: originalSource,
        [target]: { entries: [], title: '重命名后临时默认值' },
      },
    },
    sillytavern_phone_workbench: { linkedScope: source },
  });

  const result = migratePhoneChatScopes([source], target);

  assert.equal(result.migrated, true);
  assert.ok(result.replacements >= 3);
  assert.equal(globalThis.__chatScopeSaveCalls, 1);
  assert.equal(globalThis.__chatScopeSettings.sillytavern_phone_forum.currentScope, target);
  assert.deepEqual(globalThis.__chatScopeSettings.sillytavern_phone_forum.scopes[target], originalSource);
  assert.equal(globalThis.__chatScopeSettings.sillytavern_phone_forum.scopes[source], undefined);
  assert.equal(globalThis.__chatScopeSettings.sillytavern_phone_workbench.linkedScope, target);
  assert.deepEqual(globalThis.__chatScopeSettings.unrelated_setting, {
    [source]: { shouldStay: true },
    reference: source,
  });
});

test('chat scope rename does not persist when no registered phone field references the source scope', () => {
  const source = 'char:visual:chat:old';
  const target = 'char:visual:chat:new';
  resetSettings({
    sillytavern_phone_forum: { scopes: { [target]: { title: '现有数据' } } },
    unrelated_setting: { reference: source },
  });

  const result = migratePhoneChatScopes([source], target);

  assert.equal(result.migrated, false);
  assert.equal(result.replacements, 0);
  assert.equal(globalThis.__chatScopeSaveCalls, 0);
  assert.equal(globalThis.__chatScopeSettings.unrelated_setting.reference, source);
});
