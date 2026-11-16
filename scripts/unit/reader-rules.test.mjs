/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import test from 'node:test';
import { computed, ref } from 'vue';
import { buildRegexRuleOptions, getRegexRulesByOperation } from '../../src/util/regexDisplay.ts';
import { toReaderRegexRule } from '../../src/util/readerRegex.ts';
import { useReaderRules } from '../../src/apps/reader/useReaderRules.ts';

const defaultBodyRule = { find: '^', flags: 'm', replace: '' };

function rule(id, name, operation) {
  return {
    enabled: true,
    flags: 'm',
    id,
    name,
    operation,
    order: 0,
    pattern: id === 'body-default' ? '^' : 'x',
    renderMode: 'raw',
    replacement: '',
  };
}

function createHarness(overrides = {}) {
  const rules = ref([
    rule('title-1', '标题甲', 'extract'),
    rule('body-1', '正文甲', 'extract'),
    rule('cleanup-1', '清理甲', 'replace'),
    rule('cleanup-2', '清理乙', 'replace'),
  ]);
  const presetName = ref(overrides.presetName ?? '');
  const globalUsage = ref({ contentRuleId: '', displayRuleIds: [], titleRuleId: '' });
  const presetProfile = ref(overrides.presetProfile ?? null);
  const calls = [];
  const rulesApi = useReaderRules({
    effectivePresetName: computed(() => presetName.value),
    globalUsage: computed(() => globalUsage.value),
    presetProfile: computed(() => presetProfile.value),
    regexDisplayRules: computed(() => rules.value),
    buildRuleOptions: rules => buildRegexRuleOptions(rules),
    defaultBodyRule,
    defaultBodyRuleId: overrides.defaultBodyRuleId ?? '__absent__',
    getRulesByOperation: (rules, operation) => getRegexRulesByOperation(rules, operation),
    toRule: (rule, fallback) => toReaderRegexRule(rule, fallback),
    savePresetRule: (name, kind, ruleId) => calls.push(['savePresetRule', name, kind, ruleId]),
    savePresetProfile: (name, profile) => calls.push(['savePresetProfile', name, profile]),
    setExtractionRule: (kind, ruleId) => calls.push(['setExtractionRule', kind, ruleId]),
    setDisplayRuleEnabled: (ruleId, enabled) => calls.push(['setDisplayRuleEnabled', ruleId, enabled]),
    storeRuleSelection: (kind, ruleId) => calls.push(['storeRuleSelection', kind, ruleId]),
    storeCleanupRuleEnabled: (ruleId, enabled) => calls.push(['storeCleanupRuleEnabled', ruleId, enabled]),
    notifySuccess: message => calls.push(['notifySuccess', message]),
  });
  return { calls, globalUsage, presetName, presetProfile, rules, rulesApi };
}

test('without a preset the options fall back to the default and global rules', () => {
  const { rulesApi } = createHarness();
  assert.deepEqual(rulesApi.readerTitleRuleOptions.value.map(option => option.value), ['__default_title__', 'title-1', 'body-1']);
  assert.deepEqual(rulesApi.readerBodyRuleOptions.value.map(option => option.value), ['__default_body__', 'title-1', 'body-1']);
  assert.equal(rulesApi.bodyRuleSelectValue.value, '__default_body__');
  assert.equal(rulesApi.titleRuleSelectValue.value, '__default_title__');
  assert.equal(rulesApi.cleanupSummary.value, '未选择');
  assert.equal(rulesApi.readerRuleSummary.value, '无正则 / 默认正文 / 清理 0');
});

test('a registered default body rule is preferred over the synthetic option', () => {
  const harness = createHarness({ defaultBodyRuleId: 'body-default' });
  harness.rules.value.push(rule('body-default', '默认正文', 'extract'));
  assert.deepEqual(
    harness.rulesApi.readerBodyRuleOptions.value.map(option => option.value),
    ['title-1', 'body-1', 'body-default'],
  );
  assert.equal(harness.rulesApi.bodyRuleSelectValue.value, 'body-default');
});

test('a preset supplies its own rule ids and the follow-global option appears', () => {
  const { rulesApi } = createHarness({
    presetName: '狐',
    presetProfile: {
      readerCleanupRuleIds: ['cleanup-1'],
      readerContentRuleId: 'body-1',
      readerTitleRuleId: 'title-1',
    },
  });
  assert.deepEqual(rulesApi.readerTitleRuleOptions.value.map(option => option.value), ['', '__default_title__', 'title-1', 'body-1']);
  assert.equal(rulesApi.titleRuleSelectValue.value, 'title-1');
  assert.equal(rulesApi.bodyRuleSelectValue.value, 'body-1');
  assert.equal(rulesApi.cleanupSummary.value, '已选 1 条');
  assert.equal(rulesApi.readerRuleSummary.value, '预设 狐 · 标题甲 / 正文甲 / 清理 1');
  assert.equal(rulesApi.activeTitleRule.value.find, 'x');
  assert.equal(rulesApi.activeBodyRule.value.find, 'x');
});

test('an empty preset body rule stays empty instead of falling back', () => {
  const { rulesApi } = createHarness({
    presetName: '狐',
    presetProfile: { readerCleanupRuleIds: [], readerContentRuleId: '', readerTitleRuleId: '' },
  });
  assert.equal(rulesApi.bodyRuleSelectValue.value, '');
  assert.equal(rulesApi.activeBodyRule.value.find, defaultBodyRule.find);
});

test('title and body selections are written to the preset when one is bound', () => {
  const { calls, rulesApi } = createHarness({
    presetName: '狐',
    presetProfile: { readerCleanupRuleIds: [], readerContentRuleId: '', readerTitleRuleId: '' },
  });
  rulesApi.onReaderTitleRuleSelect('title-1');
  rulesApi.onReaderBodyRuleSelect('body-1');
  assert.deepEqual(calls, [
    ['savePresetRule', '狐', 'title', 'title-1'],
    ['notifySuccess', '已更新预设“狐”的共享阅读标题规则'],
    ['savePresetRule', '狐', 'content', 'body-1'],
    ['notifySuccess', '已更新预设“狐”的共享阅读正文规则'],
  ]);
});

test('without a preset the selections update the global reader settings', () => {
  const { calls, rulesApi } = createHarness();
  rulesApi.onReaderTitleRuleSelect('title-1');
  rulesApi.onReaderBodyRuleSelect('body-1');
  assert.deepEqual(calls, [
    ['setExtractionRule', 'title', 'title-1'],
    ['storeRuleSelection', 'title', 'title-1'],
    ['setExtractionRule', 'content', 'body-1'],
    ['storeRuleSelection', 'body', 'body-1'],
  ]);
});

test('cleanup toggles rewrite the preset profile or the global rules', () => {
  const presetHarness = createHarness({
    presetName: '狐',
    presetProfile: {
      readerCleanupRuleIds: ['cleanup-1'],
      readerContentRuleId: 'body-1',
      readerTitleRuleId: 'title-1',
    },
  });
  presetHarness.rulesApi.onCleanupRuleChange('cleanup-2', true);
  presetHarness.rulesApi.onCleanupRuleChange('cleanup-1', false);
  assert.deepEqual(presetHarness.calls, [
    ['savePresetProfile', '狐', {
      readerCleanupRuleIds: ['cleanup-1', 'cleanup-2'],
      readerContentRuleId: 'body-1',
      readerTitleRuleId: 'title-1',
    }],
    ['savePresetProfile', '狐', {
      readerCleanupRuleIds: [],
      readerContentRuleId: 'body-1',
      readerTitleRuleId: 'title-1',
    }],
  ]);

  const globalHarness = createHarness();
  globalHarness.rulesApi.onCleanupRuleChange('cleanup-1', true);
  assert.deepEqual(globalHarness.calls, [
    ['setDisplayRuleEnabled', 'cleanup-1', true],
    ['storeCleanupRuleEnabled', 'cleanup-1', true],
  ]);
});
