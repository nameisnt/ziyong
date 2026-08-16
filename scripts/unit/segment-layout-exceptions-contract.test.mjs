/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const globalSource = await readFile(new URL('../../src/global.css', import.meta.url), 'utf8');
const cases = [
  {
    declarations: { width: '40px', 'min-width': '40px', 'padding-inline': '0' },
    file: '../../src/apps/profiles/pages/ProfilesCatalogPage.vue',
    label: 'profiles fixed-width icon view toggle',
    selector: '.pc-profile-view-toggle .pc-segment-btn',
  },
  {
    declarations: { 'min-width': '0', 'padding-inline': '6px' },
    file: '../../src/apps/worldbook-link/pages/WorldbookCatalogPage.vue',
    label: 'worldbook five-column category layout',
    selector: '.pc-worldbook-tabs .pc-segment-btn',
  },
];

for (const item of cases) item.source = await readFile(new URL(item.file, import.meta.url), 'utf8');

function rulesFor(source, selector) {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(match => match[1].replaceAll(/\/\*[\s\S]*?\*\//g, '').trim().split(',').some(item => item.trim() === selector))
    .map(match => ({ body: match[2], prelude: match[1] }));
}

function declarationsFor(body) {
  return Object.fromEntries(
    [...body.matchAll(/(?:^|;)\s*([a-zA-Z-]+)\s*:\s*([^;{}]+)/g)].map(match => [match[1], match[2].trim()]),
  );
}

test('special segment layouts have numbered reasons without overriding global density', () => {
  const missingAllowances = [];

  for (const item of cases) {
    const rules = rulesFor(item.source, item.selector);
    assert.equal(rules.length, 1, `${item.label} must have exactly one scoped rule`);
    if (!/ui-reuse-allow:\s*D-UI-TABS-008\b/.test(rules[0].prelude)) missingAllowances.push(item.label);
    assert.deepEqual(declarationsFor(rules[0].body), item.declarations, `${item.label} declarations must stay layout-only`);
  }

  assert.deepEqual(missingAllowances, [], 'each special layout must document its D-UI-TABS-008 business reason');

  const globalRules = rulesFor(globalSource, '.pc-phone-root .pc-segment-btn');
  assert.ok(globalRules.some(rule => /min-height:\s*32px/.test(rule.body)), 'global segment height must remain 32px');
  assert.ok(globalRules.some(rule => /font-size:\s*13px/.test(rule.body)), 'global segment text must remain 13px');
});
