/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../src/global.css', import.meta.url), 'utf8');

function rulesFor(selector) {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(match => match[1].split(',').some(item => item.trim() === selector))
    .map(match => match[2]);
}

test('global text buttons and segment tabs share the compact 28px height', () => {
  const softButtonRules = rulesFor('.pc-phone-root .pc-soft-btn');
  const primaryButtonRules = rulesFor('.pc-phone-root .pc-primary-btn');
  const segmentButtonRules = rulesFor('.pc-phone-root .pc-segment-btn');

  assert.ok(
    softButtonRules.some(rule => /min-height:\s*28px/.test(rule)),
    'soft buttons must be 28px',
  );
  assert.ok(
    primaryButtonRules.some(rule => /min-height:\s*28px/.test(rule)),
    'primary buttons must be 28px',
  );
  assert.ok(
    segmentButtonRules.some(rule => /min-height:\s*28px/.test(rule)),
    'segment tabs must be 28px',
  );
  assert.ok(
    segmentButtonRules.some(rule => /font-size:\s*13px/.test(rule)),
    'segment tabs must use 13px text',
  );
  assert.ok(
    !segmentButtonRules.some(rule => /min-height:\s*34px/.test(rule)),
    'segment tabs must not retain the old 34px rule',
  );
});
