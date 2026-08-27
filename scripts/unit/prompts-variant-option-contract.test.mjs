/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../src/apps/prompts/PromptsApp.vue', import.meta.url), 'utf8');

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

test('prompt variants use shared option buttons instead of segment navigation', () => {
  const failures = [];

  const groupStart = source.slice(source.indexOf('<div\n            v-if="activeAppPromptGroup.items.length > 1"'));
  const groupTag = groupStart.slice(0, groupStart.indexOf('\n          >') + 12);
  if (
    !groupTag.includes('class="pc-prompt-variant-grid"') ||
    !groupTag.includes('role="group"') ||
    !groupTag.includes(':aria-label="`${activeAppPromptGroup.label}提示词选项`"')
  ) {
    failures.push('prompt variants are not exposed as a labelled same-page option group');
  }
  if (
    !/:class="\['pc-soft-btn', 'pc-prompt-variant-option', \{ active: activeAppPrompt\.openKey === item\.openKey \}\]"/.test(
      source,
    )
  ) {
    failures.push('prompt variants are not using the shared soft option button');
  }
  if (/pc-prompt-variant-grid[\s\S]*?:class="\['pc-segment-btn'/.test(source)) {
    failures.push('prompt variants still use the segment tab class');
  }
  if (!/:aria-pressed="activeAppPrompt\.openKey === item\.openKey"/.test(source)) {
    failures.push('prompt variant options do not expose their selected state');
  }
  if (rulesFor('.pc-prompt-variant-grid .pc-segment-btn').length) {
    failures.push('prompt variants still locally redraw shared segment button geometry');
  }

  const optionRules = rulesFor('.pc-prompt-variant-option');
  if (optionRules.length !== 1) {
    failures.push(`expected one prompt-only option layout rule, found ${optionRules.length}`);
  } else {
    assert.deepEqual(declarationsFor(optionRules[0]), {
      width: '100%',
      'min-inline-size': '0',
      'white-space': 'normal',
    });
  }

  const groupRules = rulesFor('.pc-prompt-variant-grid');
  if (!groupRules.some(rule => /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(rule))) {
    failures.push('the established two-column option layout was not preserved');
  }

  assert.deepEqual(failures, []);
});
