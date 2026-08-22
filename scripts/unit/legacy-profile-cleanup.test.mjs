/* eslint-disable import-x/no-named-as-default-member, import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const cleanupSource = await readFile(
  new URL('../../src/apps/profiles/legacyCleanup.ts', import.meta.url),
  'utf8',
);
const profilesIndex = await readFile(new URL('../../src/apps/profiles/index.ts', import.meta.url), 'utf8');
const profilesApp = await readFile(new URL('../../src/apps/profiles/ProfilesApp.vue', import.meta.url), 'utf8');
const worldSlotsStore = await readFile(new URL('../../src/apps/world-slots/store.ts', import.meta.url), 'utf8');

function safeParseProfiles(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.entries) || !Array.isArray(raw.tables)) {
    return { error: { issues: [{ message: '格式无效' }] }, success: false };
  }
  return { data: structuredClone(raw), success: true };
}

const executableSource = cleanupSource
  .replace(
    "import { getProfileKindLabel, profilesField, ProfilesScopeDataSchema, type ProfileEntry } from './store';",
    [
      "const profilesField = 'sillytavern_phone_profiles';",
      "const getProfileKindLabel = kind => ({ character: '人物', note: '其他' })[kind] || '资料';",
      'const ProfilesScopeDataSchema = { safeParse: globalThis.__safeParseProfiles };',
    ].join('\n'),
  )
  .replace("import { worldSlotsField } from '@/apps/world-slots/store';", "const worldSlotsField = 'world-slots';")
  .replace(
    "import { areChatScopeKeysEquivalent, getCurrentChatScopeKey } from '@/store/chatScoped';",
    "const areChatScopeKeysEquivalent = (left, right) => left === right; const getCurrentChatScopeKey = () => 'scope-a';",
  )
  .replace(/\/\/ eslint-disable-next-line import-x\/no-nodejs-modules\r?\n/u, '')
  .replace("import { saveSettingsDebounced } from '@sillytavern/script';", 'const saveSettingsDebounced = () => {};')
  .replace(
    "import { extension_settings } from '@sillytavern/scripts/extensions';",
    'const extension_settings = {};',
  );
globalThis.__safeParseProfiles = safeParseProfiles;
globalThis.klona = structuredClone;
const cleanup = await import(
  `data:text/javascript;base64,${Buffer.from(
    ts.transpileModule(executableSource, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText,
  ).toString('base64')}`
);

function profileScope(id, title) {
  return {
    entries: [
      {
        fields: { details: `${title}详情` },
        id,
        kind: 'character',
        summary: `${title}摘要`,
        tableId: 'people',
        tags: ['旧资料'],
        title,
      },
    ],
    failedDrafts: [{ id: `draft-${id}` }],
    tables: [
      {
        columns: [
          { enabled: true, id: 'summary', label: '摘要' },
          { enabled: true, id: 'details', label: '详情' },
        ],
        id: 'people',
      },
    ],
  };
}

test('cleanup plan embeds every scoped world-slot reference before deleting the legacy domain', () => {
  const rawProfiles = {
    __chatScoped: true,
    legacyScopeMigrations: {},
    scopes: {
      'scope-a': profileScope('person-a', '甲'),
      'scope-b': profileScope('person-b', '乙'),
    },
  };
  const rawWorldSlots = {
    __chatScoped: true,
    legacyScopeMigrations: {},
    scopes: {
      'scope-a': {
        bookName: '旧世界书',
        slots: [{ content: '原正文', id: 'slot-a', profileEntryIds: ['person-a'], type: 'note' }],
      },
      'scope-b': {
        slots: [{ content: '', id: 'slot-b', profileEntryIds: ['person-b', 'missing'], type: 'note' }],
      },
    },
  };

  const plan = cleanup.planLegacyProfilesCleanup(rawProfiles, rawWorldSlots, 'scope-a');
  assert.equal(plan.profilesFound, true);
  assert.equal(plan.migratedSlots, 2);
  assert.equal(plan.embeddedEntries, 2);
  assert.equal(plan.unresolvedReferences, 1);
  assert.equal(plan.worldSlotsChanged, true);
  assert.equal('bookName' in plan.nextWorldSlots.scopes['scope-a'], false);
  assert.equal('profileEntryIds' in plan.nextWorldSlots.scopes['scope-a'].slots[0], false);
  assert.match(plan.nextWorldSlots.scopes['scope-a'].slots[0].content, /原正文[\s\S]*## 甲[\s\S]*甲详情/u);
  assert.match(plan.nextWorldSlots.scopes['scope-b'].slots[0].content, /## 乙[\s\S]*乙详情/u);
  assert.deepEqual(rawWorldSlots.scopes['scope-a'].slots[0].profileEntryIds, ['person-a']);
});

test('cleanup plan supports the old direct-value format and is idempotent when no legacy domain exists', () => {
  const directProfiles = profileScope('person-a', '甲');
  const directWorldSlots = {
    slots: [{ content: '', id: 'slot-a', profileEntryIds: ['person-a'], type: 'note' }],
  };
  const migrated = cleanup.planLegacyProfilesCleanup(directProfiles, directWorldSlots, 'scope-a');
  assert.match(migrated.nextWorldSlots.scopes['scope-a'].slots[0].content, /## 甲/u);

  const absent = cleanup.planLegacyProfilesCleanup(undefined, directWorldSlots, 'scope-a');
  assert.equal(absent.profilesFound, false);
  assert.equal(absent.worldSlotsChanged, false);
  assert.equal(absent.nextWorldSlots, directWorldSlots);
});

test('malformed related data aborts the plan without mutating either input', () => {
  const rawProfiles = {
    __chatScoped: true,
    legacyScopeMigrations: {},
    scopes: { 'scope-a': { entries: 'broken', tables: [] } },
  };
  const rawWorldSlots = {
    __chatScoped: true,
    legacyScopeMigrations: {},
    scopes: { 'scope-a': { slots: [{ id: 'slot-a', profileEntryIds: ['person-a'] }] } },
  };
  const beforeProfiles = structuredClone(rawProfiles);
  const beforeWorldSlots = structuredClone(rawWorldSlots);
  assert.throws(
    () => cleanup.planLegacyProfilesCleanup(rawProfiles, rawWorldSlots, 'scope-a'),
    /旧资料.*无法解析/u,
  );
  assert.deepEqual(rawProfiles, beforeProfiles);
  assert.deepEqual(rawWorldSlots, beforeWorldSlots);
});

test('production registration removes the old archive, backup, recovery and scope lifecycle consumers', () => {
  assert.match(profilesIndex, /runLegacyProfilesCleanup\(\)/u);
  assert.doesNotMatch(profilesIndex, /useProfilesStore|profilesField|ProfilesScopeDataSchema/u);
  assert.doesNotMatch(profilesIndex, /archiveProvider/u);
  assert.doesNotMatch(profilesIndex, /key:\s*'profiles',\s*\n\s*exportData/u);
  assert.doesNotMatch(profilesApp, /legacyProfiles|legacyFailedDrafts|activeDraftSource|旧资料生成失败草稿/u);
  assert.doesNotMatch(worldSlotsStore, /profilesField|ProfilesScopeDataSchema|profileEntryIds/u);
  assert.match(cleanupSource, /delete extension_settings\[profilesField\]/u);
  assert.match(cleanupSource, /if \(plan\.worldSlotsChanged\)[\s\S]*delete extension_settings/u);
});
