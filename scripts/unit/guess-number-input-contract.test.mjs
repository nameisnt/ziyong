/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const componentSource = await readFile(
  new URL('../../src/apps/game-2048/GuessNumberGame.vue', import.meta.url),
  'utf8',
);
const globalSource = await readFile(new URL('../../src/global.css', import.meta.url), 'utf8');
const catalogSource = await readFile(new URL('../../src/testing/visual/scenarioCatalog.ts', import.meta.url), 'utf8');
const harnessSource = await readFile(new URL('../../src/testing/visual-harness.ts', import.meta.url), 'utf8');
const minigameScenarioSource = await readFile(
  new URL('../../src/testing/visual/minigameScenarios.ts', import.meta.url),
  'utf8',
);

function rulesFor(source, selector) {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(match => match[1].split(',').some(item => item.trim() === selector))
    .map(match => match[2]);
}

function declarationsFor(body) {
  return Object.fromEntries(
    [...body.matchAll(/(?:^|;)\s*([a-zA-Z-]+)\s*:\s*([^;{}]+)/g)].map(match => [match[1], match[2].trim()]),
  );
}

test('guess-number input uses its shared game-number semantic without redrawing pc-field locally', () => {
  const failures = [];
  const semanticRules = rulesFor(globalSource, '.pc-phone-root .pc-field.pc-guess-number-input');
  if (semanticRules.length !== 1) {
    failures.push(`expected one global guess-number semantic rule, found ${semanticRules.length}`);
  } else {
    assert.deepEqual(declarationsFor(semanticRules[0]), {
      'font-size': '22px',
      'font-weight': '800',
      'letter-spacing': '0',
      'text-align': 'center',
    });
  }

  if (!/class="[^"]*pc-field[^"]*pc-guess-number-input[^"]*"/.test(componentSource)) {
    failures.push('guess-number input does not use pc-guess-number-input beside pc-field');
  }
  if (rulesFor(componentSource, '.pc-guess-form .pc-field').length) {
    failures.push('GuessNumberGame still redraws the protected pc-field in scoped CSS');
  }

  for (const behavior of [
    'v-model="draft"',
    'inputmode="numeric"',
    'maxlength="4"',
    '@input="sanitizeDraft"',
    '@submit.prevent="submitGuess"',
  ]) {
    if (!componentSource.includes(behavior)) failures.push(`guess-number behavior contract is missing: ${behavior}`);
  }

  if (!catalogSource.includes("'game-guess-number-input'"))
    failures.push('isolated guess-number scenario is not registered');
  if (!harnessSource.includes("name === 'game-guess-number-input'"))
    failures.push('isolated guess-number scenario has no harness branch');

  assert.deepEqual(failures, []);
});

test('guess-number stats reserve room for the longer status and verify visible text', () => {
  const failures = [];
  if (!componentSource.includes('class="pc-minigame-stats pc-guess-number-stats"')) {
    failures.push('guess-number stats do not expose their page-specific layout hook');
  }

  const layoutRules = rulesFor(componentSource, '.pc-guess-number-stats');
  if (layoutRules.length !== 1) {
    failures.push(`expected one guess-number stats layout rule, found ${layoutRules.length}`);
  } else {
    assert.deepEqual(declarationsFor(layoutRules[0]), {
      'grid-template-columns': 'minmax(0, 0.8fr) minmax(0, 0.8fr) minmax(0, 1.4fr)',
    });
  }

  if (!minigameScenarioSource.includes('.pc-guess-number-stats :is(span, strong)')) {
    failures.push('guess-number play scenario does not inspect every visible stats label and value');
  }
  if (!minigameScenarioSource.includes('item.scrollWidth > item.clientWidth + 1')) {
    failures.push('guess-number play scenario does not reject truncated stats text');
  }

  assert.deepEqual(failures, []);
});
