import { useBaguStore, type BaguRule } from '@/store/bagu';
import { usePhoneStore } from '@/store/phone';
import { scanTextWithBaguRules } from '@/util/bagu';

export function canOpenBaguScan(content: string, ruleTypes: BaguRule['type'][] = ['replacement']) {
  const phone = usePhoneStore();
  const text = content.trim();
  if (!text) {
    phone.noticeWarning('没有可检测的正文');
    return false;
  }

  const bagu = useBaguStore();
  const rules = bagu.enabledRules.filter(rule => ruleTypes.includes(rule.type));
  if (!scanTextWithBaguRules(text, rules).length) {
    phone.noticeInfo('没有命中八股规则');
    return false;
  }

  return true;
}
