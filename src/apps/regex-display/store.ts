import type { RegexDisplayRenderMode } from '@/util/regexDisplay';
import { validateInplace } from '@/util/zod';
// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

export const regexDisplayField = 'sillytavern_phone_regex_display';
export const regexDisplayReaderTarget = 'reader';
export const regexDisplayReaderCleanupTarget = 'reader-cleanup';
export const regexDisplayProfilesTarget = 'profiles';
export const regexDisplaySummaryTarget = 'summary';
export const defaultReaderBodyRegexDisplayRuleId = 'regex_display_reader_body_default';

export const RegexDisplayRuleSchema = z.object({
  enabled: z.boolean().default(true),
  flags: z.string().default('g'),
  id: z.string(),
  name: z.string().default('新显示规则'),
  operation: z.enum(['extract', 'replace']).default('replace'),
  order: z.number().int().nonnegative().default(0),
  pattern: z.string().default(''),
  renderMode: z.enum(['text', 'html']).default('text'),
  replacement: z.string().default(''),
});
export type RegexDisplayRule = z.infer<typeof RegexDisplayRuleSchema>;

export const RegexDisplayUsageSchema = z.object({
  contentRuleId: z.string().default(''),
  displayRuleIds: z.array(z.string()).default([]),
  titleRuleId: z.string().default(''),
});
export type RegexDisplayUsage = z.infer<typeof RegexDisplayUsageSchema>;

export const RegexDisplaySettingsSchema = z.object({
  previewInput: z.string().default(''),
  rules: z.array(RegexDisplayRuleSchema).default([]),
  usages: z.record(z.string(), RegexDisplayUsageSchema).default({}),
});
export type RegexDisplaySettings = z.infer<typeof RegexDisplaySettingsSchema>;

function createRuleId() {
  return `regex_display_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map(item => item.trim())
    : [];
}

function readLegacyRuleTargetIds(rawRule: Record<string, unknown> | null) {
  if (Array.isArray(rawRule?.targetIds)) return [...new Set(stringList(rawRule.targetIds))];
  const directTargetId = typeof rawRule?.targetId === 'string' ? rawRule.targetId.trim() : '';
  const legacyTargets = stringList(rawRule?.targets);
  const migrated = [directTargetId].filter(Boolean);
  legacyTargets.forEach(target => {
    if (target === regexDisplayReaderCleanupTarget || target === regexDisplayReaderTarget) {
      migrated.push(regexDisplayReaderTarget);
      return;
    }
    migrated.push(target);
  });
  return [...new Set(migrated)];
}

function ensureUsage(settings: RegexDisplaySettings, appId: string) {
  settings.usages[appId] ??= RegexDisplayUsageSchema.parse({});
  return settings.usages[appId];
}

function readSettings(rawSettings: unknown) {
  const rawSettingsRecord = asRecord(rawSettings);
  const rawRuleList = Array.isArray(rawSettingsRecord?.rules) ? rawSettingsRecord.rules : [];
  const settings = validateInplace(RegexDisplaySettingsSchema, rawSettings);
  settings.rules.forEach((rule, index) => {
    const rawRule = asRecord(rawRuleList[index]);
    if (rawRule && rawRule.operation !== 'extract' && rawRule.operation !== 'replace') {
      const legacyTargets = stringList(rawRule.targets);
      rule.operation = legacyTargets.includes(regexDisplayReaderTarget) ? 'extract' : 'replace';
    }
    rule.order = Number.isFinite(rule.order) ? rule.order : index;
    const targets = readLegacyRuleTargetIds(rawRule);
    targets.forEach(targetId => {
      const usage = ensureUsage(settings, targetId);
      if (rule.operation === 'extract') {
        const field = rawRule?.field === 'title' ? 'title' : 'content';
        if (field === 'title' && !usage.titleRuleId) usage.titleRuleId = rule.id;
        if (field === 'content' && !usage.contentRuleId) usage.contentRuleId = rule.id;
        if (targetId === regexDisplayReaderTarget && !ensureUsage(settings, regexDisplaySummaryTarget).contentRuleId) {
          ensureUsage(settings, regexDisplaySummaryTarget).contentRuleId = rule.id;
        }
      } else if (!usage.displayRuleIds.includes(rule.id)) {
        usage.displayRuleIds.push(rule.id);
      }
    });
  });
  if (!rawSettingsRecord?.usages) {
    const legacyReader = asRecord(_.get(extension_settings, 'sillytavern_phone_chat_reader_settings', {}));
    const readerUsage = ensureUsage(settings, regexDisplayReaderTarget);
    const legacyTitleRuleId = typeof legacyReader?.titleRuleId === 'string' ? legacyReader.titleRuleId : '';
    const legacyBodyRuleId = typeof legacyReader?.bodyRuleId === 'string' ? legacyReader.bodyRuleId : '';
    if (legacyTitleRuleId && !legacyTitleRuleId.startsWith('__default_')) readerUsage.titleRuleId = legacyTitleRuleId;
    if (legacyBodyRuleId && !legacyBodyRuleId.startsWith('__default_')) readerUsage.contentRuleId = legacyBodyRuleId;
    const cleanupRuleIds = stringList(legacyReader?.cleanupRuleIds);
    if (cleanupRuleIds.length) readerUsage.displayRuleIds = cleanupRuleIds;
  }
  const hasDefaultBodyRule = settings.rules.some(rule => rule.id === defaultReaderBodyRegexDisplayRuleId);
  if (hasDefaultBodyRule) return settings;
  return {
    ...settings,
    rules: [
      createRegexDisplayRule({
        flags: '',
        id: defaultReaderBodyRegexDisplayRuleId,
        name: '默认正文',
        pattern: '/<content>([\\s\\S]*?)<\\/content>/i',
        replacement: '$1',
        operation: 'extract',
      }),
      ...settings.rules,
    ],
    usages: {
      ...settings.usages,
      [regexDisplayReaderTarget]: {
        ...RegexDisplayUsageSchema.parse(settings.usages[regexDisplayReaderTarget] ?? {}),
        contentRuleId: settings.usages[regexDisplayReaderTarget]?.contentRuleId || defaultReaderBodyRegexDisplayRuleId,
      },
      [regexDisplaySummaryTarget]: {
        ...RegexDisplayUsageSchema.parse(settings.usages[regexDisplaySummaryTarget] ?? {}),
        contentRuleId: settings.usages[regexDisplaySummaryTarget]?.contentRuleId || defaultReaderBodyRegexDisplayRuleId,
      },
    },
  };
}

export function createRegexDisplayRule(partial: Partial<RegexDisplayRule> = {}): RegexDisplayRule {
  return validateInplace(RegexDisplayRuleSchema, {
    enabled: true,
    flags: 'g',
    id: createRuleId(),
    name: '新显示规则',
    operation: 'replace',
    order: 0,
    pattern: '',
    renderMode: 'text',
    replacement: '',
    ...partial,
  });
}

export const useRegexDisplayStore = defineStore('regex-display', () => {
  const settings = ref<RegexDisplaySettings>(readSettings(_.get(extension_settings, regexDisplayField, {})));

  watch(
    settings,
    nextSettings => {
      _.set(extension_settings, regexDisplayField, readSettings(klona(nextSettings)));
      void saveSettingsDebounced();
    },
    { deep: true },
  );

  const rules = computed(() => settings.value.rules);

  function addRule(partial: Partial<RegexDisplayRule> = {}) {
    const rule = createRegexDisplayRule({ order: settings.value.rules.length, ...partial });
    settings.value.rules.push(rule);
    return rule;
  }

  function duplicateRule(ruleId: string) {
    const source = settings.value.rules.find(rule => rule.id === ruleId);
    if (!source) return addRule();
    return addRule({
      enabled: source.enabled,
      flags: source.flags,
      name: `${source.name || '显示规则'} 副本`,
      operation: source.operation,
      pattern: source.pattern,
      renderMode: source.renderMode as RegexDisplayRenderMode,
      replacement: source.replacement,
    });
  }

  function deleteRule(ruleId: string) {
    settings.value.rules = settings.value.rules.filter(rule => rule.id !== ruleId);
    Object.values(settings.value.usages).forEach(usage => {
      if (usage.titleRuleId === ruleId) usage.titleRuleId = '';
      if (usage.contentRuleId === ruleId) usage.contentRuleId = '';
      usage.displayRuleIds = usage.displayRuleIds.filter(id => id !== ruleId);
    });
  }

  function getUsage(appId: string) {
    return ensureUsage(settings.value, appId);
  }

  function setExtractionRule(appId: string, field: 'content' | 'title', ruleId: string) {
    const usage = ensureUsage(settings.value, appId);
    if (field === 'title') usage.titleRuleId = ruleId;
    else usage.contentRuleId = ruleId;
  }

  function setDisplayRuleEnabled(appId: string, ruleId: string, enabled: boolean) {
    const usage = ensureUsage(settings.value, appId);
    usage.displayRuleIds = enabled
      ? [...new Set([...usage.displayRuleIds, ruleId])]
      : usage.displayRuleIds.filter(id => id !== ruleId);
  }

  function moveRule(ruleId: string, offset: -1 | 1) {
    const index = settings.value.rules.findIndex(rule => rule.id === ruleId);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= settings.value.rules.length) return;
    const next = [...settings.value.rules];
    const [rule] = next.splice(index, 1);
    next.splice(target, 0, rule!);
    next.forEach((item, order) => {
      item.order = order;
    });
    settings.value.rules = next;
  }

  function importBackup(data: unknown) {
    settings.value = readSettings(data);
  }

  function rehydrateFromSettings() {
    settings.value = readSettings(_.get(extension_settings, regexDisplayField, {}));
  }

  return {
    settings,
    rules,
    addRule,
    deleteRule,
    duplicateRule,
    getUsage,
    importBackup,
    moveRule,
    rehydrateFromSettings,
    setDisplayRuleEnabled,
    setExtractionRule,
  };
});
