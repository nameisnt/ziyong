/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

const source = await readFile(new URL('../../src/apps/status-display/schemeScope.ts', import.meta.url), 'utf8');
const code = transpileModule(source, {
  compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 },
}).outputText;
const {
  migrateLegacySchemes,
  getVisibleStatusSchemes,
  getEnabledStatusSchemes,
  getSchemeBindingScopes,
  restrictSchemeBindings,
} = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const scheme = (id, ownerScopeKey = '', shared = false) => ({
  id,
  ownerScopeKey,
  shared,
  source: 'regex',
  template: 'original',
});
const settings = schemes => ({ schemes, activeSchemeByScope: {}, enabledSchemeIdsByScope: {}, version: 1 });

test('private schemes are visible only to their owner; shared schemes require explicit activation', () => {
  const s = settings([scheme('a', 'A'), scheme('b', 'B'), scheme('shared', 'A', true)]);
  assert.deepEqual(
    getVisibleStatusSchemes(s, 'B').map(x => x.id),
    ['b', 'shared'],
  );
  assert.deepEqual(
    getVisibleStatusSchemes(s, '').map(x => x.id),
    [],
  );
  assert.deepEqual(getEnabledStatusSchemes(s, 'B'), []);
  s.enabledSchemeIdsByScope.B = ['a', 'shared', 'deleted'];
  assert.deepEqual(getEnabledStatusSchemes(s, 'B'), ['shared']);
});

test('explicit disabled list wins over old selection; old explicit selection still works', () => {
  const s = settings([scheme('a', 'A')]);
  s.activeSchemeByScope.A = 'a';
  assert.deepEqual(getEnabledStatusSchemes(s, 'A'), ['a']);
  s.enabledSchemeIdsByScope.A = [];
  assert.deepEqual(getEnabledStatusSchemes(s, 'A'), []);
});

test('legacy multi-chat bindings become independent private copies and preserve active order', () => {
  const s = settings([scheme('old'), scheme('orphan')]);
  s.activeSchemeByScope.A = 'old';
  s.activeSchemeByScope.B = 'old';
  s.enabledSchemeIdsByScope.B = ['old'];
  const copies = migrateLegacySchemes(s, 'C');
  assert.equal(copies.length, 1);
  const a = getVisibleStatusSchemes(s, 'A')[0];
  const b = getVisibleStatusSchemes(s, 'B')[0];
  assert.notEqual(a.id, b.id);
  assert.equal(s.activeSchemeByScope.B, b.id);
  assert.deepEqual(s.enabledSchemeIdsByScope.B, [b.id]);
  assert.equal(copies[0].sourceId, 'old');
  assert.equal(copies[0].targetId, b.id);
  b.template = 'edited';
  assert.equal(a.template, 'original');
  assert.equal(getVisibleStatusSchemes(s, 'C')[0].id, 'orphan');
  assert.deepEqual(getEnabledStatusSchemes(s, 'C'), []);
  assert.deepEqual(migrateLegacySchemes(s, 'D'), []);
  assert.equal(s.schemes.length, 3);
});

test('legacy migration waits without a chat and preserves already-scoped schemes', () => {
  const s = settings([scheme('old'), scheme('shared', 'B', true)]);
  const before = structuredClone(s);
  assert.deepEqual(migrateLegacySchemes(s, ''), []);
  assert.deepEqual(s, before);
  migrateLegacySchemes(s, 'A');
  assert.equal(s.schemes[0].ownerScopeKey, 'A');
  assert.equal(s.schemes[1].shared, true);
});

test('restricting a shared scheme removes only its other-chat references', () => {
  const s = settings([scheme('shared', 'A', true), scheme('b', 'B')]);
  s.enabledSchemeIdsByScope = { A: ['shared'], B: ['shared', 'b'], C: ['shared'] };
  s.activeSchemeByScope = { A: 'shared', B: 'shared', C: 'shared' };
  assert.deepEqual(getSchemeBindingScopes(s, 'shared'), ['A', 'B', 'C']);
  restrictSchemeBindings(s, 'shared', 'A');
  assert.deepEqual(s.enabledSchemeIdsByScope.B, ['b']);
  assert.equal(s.activeSchemeByScope.B, 'b');
  assert.deepEqual(s.enabledSchemeIdsByScope.C, []);
  assert.equal(s.activeSchemeByScope.C, undefined);
  assert.deepEqual(s.enabledSchemeIdsByScope.A, ['shared']);
});
