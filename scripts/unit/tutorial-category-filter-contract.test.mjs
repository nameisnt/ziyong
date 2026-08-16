/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../src/apps/tutorial/TutorialApp.vue', import.meta.url), 'utf8');

function rulesFor(selector) {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(match => match[1].split(',').some(item => item.trim() === selector))
    .map(match => match[2]);
}

function declarationsFor(body) {
  return Object.fromEntries(
    [...body.matchAll(/(?:^|;)\s*([a-zA-Z-]+)\s*:\s*([^;{}]+)/g)].map(match => [match[1], match[2].trim()]),
  );
}

test('tutorial categories use compact shared filter buttons instead of segment navigation', () => {
  const failures = [];

  if (!/<div class="pc-tutorial-categories" role="group" aria-label="教程分类">/.test(source)) {
    failures.push('tutorial categories are not exposed as a same-page filter group');
  }
  if (/<nav class="pc-tutorial-categories"/.test(source)) {
    failures.push('tutorial categories still claim navigation semantics');
  }
  if (!/class="pc-soft-btn compact pc-tutorial-category"/.test(source)) {
    failures.push('tutorial categories are not using the shared compact soft button');
  }
  if (/class="pc-segment-btn"/.test(source)) {
    failures.push('tutorial category filters still use the segment tab class');
  }
  if (!/:aria-pressed="activeCategory === category\.id"/.test(source)) {
    failures.push('tutorial category filters do not expose their selected state');
  }

  if (rulesFor('.pc-tutorial-categories .pc-segment-btn').length) {
    failures.push('tutorial still locally redraws segment button geometry and appearance');
  }

  const categoryRules = rulesFor('.pc-tutorial-category');
  if (categoryRules.length !== 1) {
    failures.push(`expected one tutorial-only filter layout rule, found ${categoryRules.length}`);
  } else {
    assert.deepEqual(declarationsFor(categoryRules[0]), { width: '100%' });
  }

  const groupRules = rulesFor('.pc-tutorial-categories');
  if (!groupRules.some(rule => /grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/.test(rule))) {
    failures.push('the established four-column filter layout was not preserved');
  }

  assert.deepEqual(failures, []);
});
