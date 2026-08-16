/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const componentSource = await readFile(new URL('../../src/apps/comfy/ComfyApp.vue', import.meta.url), 'utf8');
const globalSource = await readFile(new URL('../../src/global.css', import.meta.url), 'utf8');

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

test('Comfy parameter sources use the shared compact segment semantics', () => {
  const failures = [];
  if (!/<div class="pc-segment pc-param-mode" role="group"/.test(componentSource)) {
    failures.push('parameter mode container is not using the shared pc-segment surface');
  }

  const compactButtons = componentSource.match(/\['pc-segment-btn', 'compact', \{ active:/g)?.length ?? 0;
  if (compactButtons !== 3) failures.push(`expected 3 explicit compact segment buttons, found ${compactButtons}`);

  const compactRules = rulesFor(globalSource, '.pc-phone-root .pc-segment-btn.compact');
  if (compactRules.length !== 1) {
    failures.push(`expected 1 global compact segment rule, found ${compactRules.length}`);
  } else {
    const declarations = declarationsFor(compactRules[0]);
    if (declarations['min-height'] !== '30px') {
      failures.push(`compact segment min-height must be 30px, found ${declarations['min-height'] ?? 'missing'}`);
    }
    if (declarations['font-size'] !== '12px') {
      failures.push(`compact segment font-size must be 12px, found ${declarations['font-size'] ?? 'missing'}`);
    }
    if (declarations['padding-inline'] !== '6px') {
      failures.push(`compact segment padding-inline must be 6px, found ${declarations['padding-inline'] ?? 'missing'}`);
    }
  }

  if (rulesFor(componentSource, '.pc-param-mode .pc-segment-btn').length) {
    failures.push('Comfy still locally redraws compact segment geometry or base appearance');
  }
  if (rulesFor(componentSource, '.pc-param-mode .pc-segment-btn.active').length) {
    failures.push('Comfy still locally redraws the shared segment active state');
  }

  const layoutRules = rulesFor(componentSource, '.pc-param-mode');
  if (!layoutRules.some(rule => /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/.test(rule))) {
    failures.push('the three-column parameter mode layout was not preserved');
  }
  if (!/@container\s*\(max-width:\s*420px\)/.test(componentSource)) {
    failures.push('compact parameter layout is not keyed to the phone container width');
  }
  if (/@media\s*\(max-width:\s*420px\)/.test(componentSource)) {
    failures.push('compact parameter layout is still incorrectly keyed to the browser viewport');
  }

  assert.deepEqual(failures, []);
});
