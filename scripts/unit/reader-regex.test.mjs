/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyReaderCleanupRules,
  parseReaderRegexPattern,
  replaceReaderBodyInRaw,
  toReaderRegexRule,
} from '../../src/util/readerRegex.ts';

test('a literal pattern keeps its own flags and drops unknown ones', () => {
  assert.deepEqual(parseReaderRegexPattern('/foo\\s+bar/gi', 'mz'), { flags: 'gim', pattern: 'foo\\s+bar' });
  assert.deepEqual(parseReaderRegexPattern('/baz/', ''), { flags: '', pattern: 'baz' });
});

test('a plain pattern is used as is with the configured flags', () => {
  assert.deepEqual(parseReaderRegexPattern(' foo ', 'ggimx'), { flags: 'gim', pattern: 'foo' });
  assert.deepEqual(parseReaderRegexPattern('', ''), { flags: '', pattern: '' });
});

test('cleanup rules run in order and ignore broken ones', () => {
  const rules = [
    { flags: 'g', pattern: '\\*\\*', replacement: '' },
    { flags: 'g', pattern: '(', replacement: 'x' },
    { flags: 'g', pattern: '\\s+', replacement: ' ' },
  ];
  assert.equal(applyReaderCleanupRules(' **你 好** 世界 ', rules), '你 好 世界');
});

test('an empty pattern leaves the body untouched', () => {
  assert.equal(applyReaderCleanupRules('正文', [{ flags: 'g', pattern: '', replacement: 'x' }]), '正文');
});

test('replacing the body only succeeds when the range still matches', () => {
  const range = { start: 3, end: 6, ruleId: 'rule' };
  assert.equal(replaceReaderBodyInRaw('标题：旧文', '旧文', '新文', range), '标题：新文');
  assert.equal(replaceReaderBodyInRaw('旧文', '旧文', '新文', null), '新文');
  assert.equal(replaceReaderBodyInRaw('标题：别的', '旧文', '新文', range), null);
  assert.equal(replaceReaderBodyInRaw('标题：旧文', '旧文', '新文', null), null);
});

test('a missing display rule falls back to the stored rule', () => {
  const fallback = { find: 'a', flags: 'g', replace: 'b' };
  assert.deepEqual(toReaderRegexRule(null, fallback), fallback);
  assert.deepEqual(
    toReaderRegexRule({ id: 'x', name: 'X', pattern: 'c', flags: 'gi', replacement: 'd' }, fallback),
    { find: 'c', flags: 'gi', replace: 'd' },
  );
});
