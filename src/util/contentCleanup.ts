import { getActivePinia } from 'pinia';
import { usePresetLinkStore } from '@/apps/preset-link/store';
import { useRegexDisplayStore } from '@/apps/regex-display/store';
import type { ContentCleanupSnapshot } from '@/type/contentVersion';
import { getRegexRulesByIds } from '@/util/regexDisplay';

/**
 * 生成结果保存时固化当前插件预设绑定的「正文清理」规则。
 * 只用预设里显式绑定的规则，不读阅读 App 的全局清理设置。
 */
export function captureContentCleanupSnapshot(): ContentCleanupSnapshot | undefined {
  // 单元测试与后台脚本没有 Pinia，此时不固化快照（老内容本来也不套规则）。
  if (!getActivePinia()) return undefined;
  const presetLink = usePresetLinkStore();
  const presetName = presetLink.getBinding()?.presetName?.trim();
  if (!presetName) return undefined;
  const ruleIds = presetLink.getReaderProfile(presetName)?.readerCleanupRuleIds ?? [];
  const rules = getRegexRulesByIds(useRegexDisplayStore().rules, ruleIds, 'replace');
  if (!ruleIds.length) return undefined;
  if (!rules.length) return undefined;
  return {
    enabled: true,
    rules: rules.map(rule => ({
      find: rule.pattern,
      flags: rule.flags,
      renderMode: rule.renderMode,
      replace: rule.replacement,
    })),
  };
}
