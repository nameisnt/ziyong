/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const catalog = readFileSync('src/testing/visual/scenarioCatalog.ts', 'utf8');
const runner = readFileSync('scripts/ui-visual-check.mjs', 'utf8');
const contentBooks = readFileSync('src/testing/visual/contentBookScenarios.ts', 'utf8');
const forum = readFileSync('src/testing/visual/forumGenerationScenarios.ts', 'utf8');
const business = readFileSync('src/testing/visual/businessContentScenarios.ts', 'utf8');

const scenarios = [
  'summary-failed-draft-reparse',
  'theater-failed-draft',
  'diary-failed-draft-reparse',
  'forum-failed-draft-reparse',
  'letters-failed-draft-reparse',
  'digest-failed-draft-reparse',
];

test('all independent business failed-draft parsers have a real reparse scenario', () => {
  for (const scenario of scenarios) {
    assert.match(catalog, new RegExp(`['"]${scenario}['"]`));
    assert.match(runner, new RegExp(`['"]${scenario}['"]`));
  }
});

test('new reparse scenarios are owned by their business-domain fixtures', () => {
  assert.match(contentBooks, /diary-failed-draft-reparse/);
  assert.match(contentBooks, /letters-failed-draft-reparse/);
  assert.match(forum, /forum-failed-draft-reparse/);
  assert.match(business, /digest-failed-draft-reparse/);
});
