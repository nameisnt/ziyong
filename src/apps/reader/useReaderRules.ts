import { computed, ref, type ComputedRef } from 'vue';
import type { RegexDisplayRuleLike } from '../../util/regexDisplay';
import type { ChatReaderRegexRule } from '../../store/reader';

export interface ReaderRuleUsage {
  contentRuleId: string;
  displayRuleIds: string[];
  titleRuleId: string;
}

export interface ReaderRuleProfile {
  readerCleanupRuleIds: string[];
  readerContentRuleId: string;
  readerTitleRuleId: string;
}

export interface UseReaderRulesOptions {
  effectivePresetName: ComputedRef<string>;
  globalUsage: ComputedRef<ReaderRuleUsage>;
  presetProfile: ComputedRef<ReaderRuleProfile | null>;
  buildRuleOptions: (rules: RegexDisplayRuleLike[]) => { label: string; value: string }[];
  defaultBodyRule: ChatReaderRegexRule;
  getRulesByOperation: (rules: RegexDisplayRuleLike[], operation: 'extract' | 'replace') => RegexDisplayRuleLike[];
  toRule: (rule: RegexDisplayRuleLike | null, fallback: ChatReaderRegexRule) => ChatReaderRegexRule;
  defaultBodyRuleId: string;
  regexDisplayRules: ComputedRef<RegexDisplayRuleLike[]>;
  savePresetRule: (presetName: string, kind: 'title' | 'content', ruleId: string) => void;
  savePresetProfile: (presetName: string, profile: ReaderRuleProfile) => void;
  setExtractionRule: (kind: 'title' | 'content', ruleId: string) => void;
  setDisplayRuleEnabled: (ruleId: string, enabled: boolean) => void;
  storeRuleSelection: (kind: 'title' | 'body', ruleId: string) => void;
  storeCleanupRuleEnabled: (ruleId: string, enabled: boolean) => void;
  notifySuccess: (message: string) => void;
}

/**
 * Resolves the reader title/body/cleanup rules for the current chat and keeps
 * the selection in sync with the preset binding or the global reader settings.
 */
export function useReaderRules(options: UseReaderRulesOptions) {
  const defaultTitleRule: ChatReaderRegexRule = { find: '', flags: '', replace: '' };
  const rulesOpen = ref(true);

  const readerTitleRegexRules = computed(() => options.getRulesByOperation(options.regexDisplayRules.value, 'extract'));
  const readerBodyRegexRules = computed(() => options.getRulesByOperation(options.regexDisplayRules.value, 'extract'));
  const readerCleanupRules = computed(() => options.getRulesByOperation(options.regexDisplayRules.value, 'replace'));

  const readerRegexUsage = computed<ReaderRuleUsage>(() => ({
    contentRuleId:
      options.presetProfile.value?.readerContentRuleId || options.globalUsage.value.contentRuleId,
    displayRuleIds:
      options.presetProfile.value?.readerCleanupRuleIds ?? options.globalUsage.value.displayRuleIds,
    titleRuleId: options.presetProfile.value?.readerTitleRuleId || options.globalUsage.value.titleRuleId,
  }));

  function getSelectedReaderRegexRule(ruleId: string, availableRules: RegexDisplayRuleLike[]) {
    if (ruleId === '__default_body__') {
      return availableRules.find(rule => rule.id === options.defaultBodyRuleId) ?? null;
    }
    if (!ruleId || ruleId.startsWith('__default_')) return null;
    return availableRules.find(rule => rule.id === ruleId) ?? null;
  }

  const readerTitleRuleOptions = computed(() => [
    ...(options.effectivePresetName.value ? [{ label: '跟随全局阅读规则', value: '' }] : []),
    { label: '无正则', value: '__default_title__' },
    ...options.buildRuleOptions(readerTitleRegexRules.value),
  ]);

  const readerBodyRuleOptions = computed(() => {
    const ruleOptions = options.buildRuleOptions(readerBodyRegexRules.value);
    if (!ruleOptions.some(option => option.value === options.defaultBodyRuleId)) {
      ruleOptions.unshift({ label: '默认楼层正文提取', value: '__default_body__' });
    }
    return [
      ...(options.effectivePresetName.value ? [{ label: '跟随全局阅读规则', value: '' }] : []),
      ...ruleOptions,
    ];
  });

  const selectedTitleRegexRule = computed(() =>
    getSelectedReaderRegexRule(readerRegexUsage.value.titleRuleId, readerTitleRegexRules.value),
  );
  const selectedBodyRegexRule = computed(() =>
    getSelectedReaderRegexRule(readerRegexUsage.value.contentRuleId, readerBodyRegexRules.value),
  );
  const selectedCleanupRules = computed(() =>
    readerCleanupRules.value.filter(rule => readerRegexUsage.value.displayRuleIds.includes(rule.id ?? '')),
  );
  const activeTitleRule = computed(() => options.toRule(selectedTitleRegexRule.value, defaultTitleRule));
  const activeBodyRule = computed(() => options.toRule(selectedBodyRegexRule.value, options.defaultBodyRule));
  const cleanupSummary = computed(() =>
    selectedCleanupRules.value.length ? `已选 ${selectedCleanupRules.value.length} 条` : '未选择',
  );
  const readerRuleSummary = computed(
    () =>
      `${options.effectivePresetName.value ? `预设 ${options.effectivePresetName.value} · ` : ''}${
        selectedTitleRegexRule.value?.name || '无正则'
      } / ${selectedBodyRegexRule.value?.name || '默认正文'} / 清理 ${selectedCleanupRules.value.length}`,
  );
  const titleRuleSelectValue = computed(() =>
    options.effectivePresetName.value
      ? options.presetProfile.value?.readerTitleRuleId || ''
      : options.globalUsage.value.titleRuleId || '__default_title__',
  );
  const bodyRuleSelectValue = computed(() => {
    const selectedRuleId = options.effectivePresetName.value
      ? options.presetProfile.value?.readerContentRuleId || ''
      : options.globalUsage.value.contentRuleId;
    if (options.effectivePresetName.value && !selectedRuleId) return '';
    if (!selectedRuleId || selectedRuleId === '__default_body__') {
      return readerBodyRegexRules.value.some(rule => rule.id === options.defaultBodyRuleId)
        ? options.defaultBodyRuleId
        : '__default_body__';
    }
    return selectedRuleId;
  });
  const contentRuleId = computed(() => options.globalUsage.value.contentRuleId);

  function onReaderTitleRuleSelect(ruleId: string) {
    if (options.effectivePresetName.value) {
      options.savePresetRule(options.effectivePresetName.value, 'title', ruleId);
      options.notifySuccess(`已更新预设“${options.effectivePresetName.value}”的共享阅读标题规则`);
      return;
    }
    options.setExtractionRule('title', ruleId);
    options.storeRuleSelection('title', ruleId);
  }

  function onReaderBodyRuleSelect(ruleId: string) {
    if (options.effectivePresetName.value) {
      options.savePresetRule(options.effectivePresetName.value, 'content', ruleId);
      options.notifySuccess(`已更新预设“${options.effectivePresetName.value}”的共享阅读正文规则`);
      return;
    }
    options.setExtractionRule('content', ruleId);
    options.storeRuleSelection('body', ruleId);
  }

  function onCleanupRuleChange(ruleId: string, enabled: boolean) {
    if (options.effectivePresetName.value) {
      const profile = options.presetProfile.value;
      const selected = new Set(profile?.readerCleanupRuleIds ?? []);
      if (enabled) selected.add(ruleId);
      else selected.delete(ruleId);
      options.savePresetProfile(options.effectivePresetName.value, {
        readerCleanupRuleIds: [...selected],
        readerContentRuleId: profile?.readerContentRuleId || '',
        readerTitleRuleId: profile?.readerTitleRuleId || '',
      });
      return;
    }
    options.setDisplayRuleEnabled(ruleId, enabled);
    options.storeCleanupRuleEnabled(ruleId, enabled);
  }

  return {
    activeBodyRule,
    activeTitleRule,
    bodyRuleSelectValue,
    contentRuleId,
    cleanupSummary,
    onCleanupRuleChange,
    onReaderBodyRuleSelect,
    onReaderTitleRuleSelect,
    readerBodyRegexRules,
    readerBodyRuleOptions,
    readerCleanupRules,
    readerRuleSummary,
    readerTitleRegexRules,
    readerTitleRuleOptions,
    readerRegexUsage,
    rulesOpen,
    selectedBodyRegexRule,
    selectedCleanupRules,
    selectedTitleRegexRule,
    titleRuleSelectValue,
  };
}
