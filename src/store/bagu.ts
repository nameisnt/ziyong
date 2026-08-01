import { validateInplace } from '@/util/zod';
// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

export const BaguRuleSchema = z.object({
  id: z.string(),
  type: z.enum(['replacement', 'template', 'regex']).default('replacement'),
  title: z.string().default(''),
  pattern: z.string().default(''),
  flags: z.string().default(''),
  suggestion: z.string().default(''),
  sources: z.array(z.string()).default([]),
  replacements: z.array(z.string()).default([]),
  template: z.string().default(''),
  targets: z.array(z.string()).default([]),
  note: z.string().default(''),
  enabled: z.boolean().default(true),
  createdAt: z.string().default(''),
  updatedAt: z.string().default(''),
});
export type BaguRule = z.infer<typeof BaguRuleSchema>;
export type BaguRuleInput = Pick<BaguRule, 'type' | 'title' | 'note'> &
  Partial<
    Pick<BaguRule, 'enabled' | 'flags' | 'pattern' | 'replacements' | 'sources' | 'suggestion' | 'targets' | 'template'>
  >;

const BAGU_RULESET_VERSION = 2;

export const BaguSettingsSchema = z.object({
  version: z.number().default(0),
  rules: z.array(BaguRuleSchema).default([]),
});
export type BaguSettings = z.infer<typeof BaguSettingsSchema>;

export const baguField = 'sillytavern_phone_bagu_rules';

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function cleanList(items: string[]) {
  return items.map(item => item.trim()).filter(Boolean);
}

function splitRuleList(text: string) {
  return cleanList(text.split(/[/／|、，,\n]/g));
}

function splitLegacyPattern(pattern: string) {
  const text = pattern.trim();
  if (!text) return [];
  if (!text.includes('|')) return [text];
  return cleanList(text.split('|'));
}

function normalizeFlags(flags: string) {
  const allowed = new Set(['g', 'i', 'm', 's', 'u', 'y']);
  let normalized = '';
  for (const char of flags.trim()) {
    if (allowed.has(char) && !normalized.includes(char)) normalized += char;
  }
  return normalized;
}

function normalizeRule(rule: BaguRule): BaguRule {
  const timestamp = nowIso();
  const base = {
    ...rule,
    createdAt: rule.createdAt || timestamp,
    note: rule.note.trim(),
    title: rule.title.trim(),
    updatedAt: rule.updatedAt || rule.createdAt || timestamp,
  };

  if (base.type === 'replacement') {
    const sources = cleanList(base.sources.length ? base.sources : splitLegacyPattern(base.pattern));
    const replacements = cleanList(base.replacements.length ? base.replacements : splitRuleList(base.suggestion));
    return {
      ...base,
      flags: '',
      pattern: sources.join('|'),
      replacements,
      sources,
      suggestion: replacements.join(' / '),
      targets: [],
      template: '',
      title: base.title || sources.join('/') || '未命名词汇规则',
    };
  }

  if (base.type === 'regex') {
    const pattern = base.pattern.trim();
    return {
      ...base,
      flags: normalizeFlags(base.flags),
      pattern,
      replacements: [],
      sources: [],
      suggestion: base.suggestion.trim(),
      template: '',
      title: base.title || pattern || '未命名正则规则',
    };
  }

  const template = (base.template || base.pattern).trim();
  return {
    ...base,
    flags: '',
    pattern: template,
    replacements: [],
    sources: [],
    suggestion: base.suggestion.trim(),
    targets: [],
    template,
    title: base.title || template || '未命名句式规则',
  };
}

function normalizeSettings(settings: BaguSettings): BaguSettings {
  return {
    version: settings.version,
    rules: settings.rules.map(normalizeRule),
  };
}

function shouldUseDefaultSettings(settings: BaguSettings) {
  return settings.version < BAGU_RULESET_VERSION || !settings.rules.length;
}

function getDefaultRulesByType(type: BaguRule['type']) {
  return normalizeSettings(createDefaultBaguSettings()).rules.filter(rule => rule.type === type);
}

function createDefaultBaguSettings(): BaguSettings {
  const timestamp = nowIso();
  return {
    version: BAGU_RULESET_VERSION,
    rules: [
      {
        id: 'l1',
        type: 'replacement',
        title: '仿佛/似乎/好像',
        pattern: '仿佛|似乎|好像',
        flags: '',
        sources: ['仿佛', '似乎', '好像'],
        replacements: ['犹如', '宛如', '宛若'],
        template: '',
        targets: [],
        suggestion: '犹如 / 宛如 / 宛若',
        note: '',
        enabled: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: 'l2',
        type: 'replacement',
        title: '不禁/不由得/忍不住',
        pattern: '不禁|不由得|忍不住',
        flags: '',
        sources: ['不禁', '不由得', '忍不住'],
        replacements: ['下意识', '不觉', '自然'],
        template: '',
        targets: [],
        suggestion: '下意识 / 不觉 / 自然',
        note: '',
        enabled: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: 'l3',
        type: 'replacement',
        title: '微微/轻轻/缓缓',
        pattern: '微微|轻轻|缓缓',
        flags: '',
        sources: ['微微', '轻轻', '缓缓'],
        replacements: ['悄然', '暗自', '徐徐'],
        template: '',
        targets: [],
        suggestion: '悄然 / 暗自 / 徐徐',
        note: '',
        enabled: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: 'l4',
        type: 'replacement',
        title: '微微一愣/一怔/一顿',
        pattern: '微微一愣|微微一怔|微微一顿',
        flags: '',
        sources: ['微微一愣', '微微一怔', '微微一顿'],
        replacements: ['愣住', '怔住', '(删除)'],
        template: '',
        targets: [],
        suggestion: '愣住 / 怔住 / (删除)',
        note: '',
        enabled: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: 'l5',
        type: 'replacement',
        title: '眼中闪过',
        pattern: '眼中闪过|眼中闪过一丝|眼中掠过',
        flags: '',
        sources: ['眼中闪过', '眼中闪过一丝', '眼中掠过'],
        replacements: ['目光中透出', '眼底浮现', '(删除)'],
        template: '',
        targets: [],
        suggestion: '目光中透出 / 眼底浮现 / (删除)',
        note: '',
        enabled: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: 'l6',
        type: 'replacement',
        title: '极其/极度',
        pattern: '极其|极度|极度的|极其的',
        flags: '',
        sources: ['极其', '极度', '极度的', '极其的'],
        replacements: ['非常', '十分', '(删除)'],
        template: '',
        targets: [],
        suggestion: '非常 / 十分 / (删除)',
        note: '',
        enabled: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: 'p1',
        type: 'template',
        title: '这/那是一个动作姿态句',
        pattern: '{这|那}是{一个|一种|某种}…{动作|姿态|神情|眼神|表情}',
        flags: '',
        sources: [],
        replacements: [],
        template: '{这|那}是{一个|一种|某种}…{动作|姿态|神情|眼神|表情}',
        targets: [],
        suggestion: '',
        note: '',
        enabled: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: 'p2',
        type: 'template',
        title: '声音/语气模板句',
        pattern: '{他|她}的{声音|语气|语调}…{温柔|坚定|轻柔|低沉|冷淡}',
        flags: '',
        sources: [],
        replacements: [],
        template: '{他|她}的{声音|语气|语调}…{温柔|坚定|轻柔|低沉|冷淡}',
        targets: [],
        suggestion: '',
        note: '',
        enabled: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
  };
}

export const useBaguStore = defineStore('bagu', () => {
  const initialData = normalizeSettings(validateInplace(BaguSettingsSchema, _.get(extension_settings, baguField, {})));
  const shouldResetInitialData = shouldUseDefaultSettings(initialData);
  const data = ref(shouldResetInitialData ? normalizeSettings(createDefaultBaguSettings()) : initialData);

  function persist(nextData: typeof data.value) {
    const parsed = normalizeSettings(validateInplace(BaguSettingsSchema, klona(nextData)));
    _.set(extension_settings, baguField, parsed);
    void saveSettingsDebounced();
  }

  if (shouldResetInitialData) {
    persist(data.value);
  }

  watch(
    data,
    nextData => {
      persist(nextData);
    },
    { deep: true },
  );

  const rules = computed(() => data.value.rules);
  const enabledRules = computed(() => rules.value.filter(rule => rule.enabled));

  function getRule(ruleId: string) {
    return rules.value.find(rule => rule.id === ruleId) ?? null;
  }

  function createRule(input: BaguRuleInput) {
    const timestamp = nowIso();
    const rule = normalizeRule({
      id: createId('bagu_rule'),
      type: input.type,
      title: input.title.trim() || '未命名规则',
      pattern:
        input.type === 'regex'
          ? input.pattern?.trim() || ''
          : input.type === 'replacement'
            ? cleanList(input.sources || []).join('|')
            : input.template?.trim() || '',
      flags: input.flags || '',
      replacements: cleanList(input.replacements || []),
      sources: cleanList(input.sources || []),
      suggestion:
        input.type === 'replacement'
          ? cleanList(input.replacements || []).join(' / ')
          : input.suggestion?.trim() || '',
      template: input.type === 'template' ? input.template?.trim() || '' : '',
      targets: cleanList(input.targets || []),
      note: input.note.trim(),
      enabled: input.enabled ?? true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    data.value.rules = [rule, ...data.value.rules];
    return rule;
  }

  function updateRule(ruleId: string, input: BaguRuleInput & Pick<BaguRule, 'enabled'>) {
    const rule = getRule(ruleId);
    if (!rule) return null;
    const nextRule = normalizeRule({
      ...rule,
      type: input.type,
      title: input.title.trim() || rule.title,
      pattern:
        input.type === 'regex'
          ? input.pattern?.trim() || ''
          : input.type === 'replacement'
            ? cleanList(input.sources || []).join('|')
            : input.template?.trim() || '',
      flags: input.flags || '',
      replacements: cleanList(input.replacements || []),
      sources: cleanList(input.sources || []),
      suggestion:
        input.type === 'replacement'
          ? cleanList(input.replacements || []).join(' / ')
          : input.suggestion?.trim() || '',
      template: input.type === 'template' ? input.template?.trim() || '' : '',
      targets: cleanList(input.targets || []),
      note: input.note.trim(),
      enabled: input.enabled,
      updatedAt: nowIso(),
    });
    Object.assign(rule, nextRule);
    return rule;
  }

  function deleteRule(ruleId: string) {
    data.value.rules = data.value.rules.filter(rule => rule.id !== ruleId);
  }

  function resetRulesByType(type: BaguRule['type']) {
    data.value.version = BAGU_RULESET_VERSION;
    data.value.rules = [...data.value.rules.filter(rule => rule.type !== type), ...getDefaultRulesByType(type)];
  }

  function toggleRule(ruleId: string) {
    const rule = getRule(ruleId);
    if (!rule) return;
    rule.enabled = !rule.enabled;
    rule.updatedAt = nowIso();
  }

  function rehydrateFromSettings() {
    const nextData = normalizeSettings(validateInplace(BaguSettingsSchema, _.get(extension_settings, baguField, {})));
    data.value = shouldUseDefaultSettings(nextData) ? normalizeSettings(createDefaultBaguSettings()) : nextData;
  }

  return {
    createRule,
    data,
    deleteRule,
    enabledRules,
    getRule,
    rehydrateFromSettings,
    resetRulesByType,
    rules,
    toggleRule,
    updateRule,
  };
});
