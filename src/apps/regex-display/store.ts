import type { RegexDisplayRenderMode } from '@/util/regexDisplay';
import { validateInplace } from '@/util/zod';
// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

export const regexDisplayField = 'sillytavern_phone_regex_display';
export const regexDisplayReaderTarget = 'reader';
export const regexDisplayReaderCleanupTarget = 'reader-cleanup';
export const regexDisplayProfilesTarget = 'profiles';
export const defaultReaderBodyRegexDisplayRuleId = 'regex_display_reader_body_default';

export const RegexDisplayRuleSchema = z.object({
  enabled: z.boolean().default(true),
  flags: z.string().default('g'),
  id: z.string(),
  name: z.string().default('新显示规则'),
  pattern: z.string().default(''),
  renderMode: z.enum(['text', 'html']).default('text'),
  replacement: z.string().default(''),
  targets: z.array(z.string()).default([]),
});
export type RegexDisplayRule = z.infer<typeof RegexDisplayRuleSchema>;

export const RegexDisplaySettingsSchema = z.object({
  previewInput: z.string().default(''),
  rules: z.array(RegexDisplayRuleSchema).default([]),
});
export type RegexDisplaySettings = z.infer<typeof RegexDisplaySettingsSchema>;

function createRuleId() {
  return `regex_display_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function readSettings(rawSettings: unknown) {
  const settings = validateInplace(RegexDisplaySettingsSchema, rawSettings);
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
        targets: [regexDisplayReaderTarget],
      }),
      ...settings.rules,
    ],
  };
}

export function createRegexDisplayRule(partial: Partial<RegexDisplayRule> = {}): RegexDisplayRule {
  return validateInplace(RegexDisplayRuleSchema, {
    enabled: true,
    flags: 'g',
    id: createRuleId(),
    name: '新显示规则',
    pattern: '',
    renderMode: 'text',
    replacement: '',
    targets: [],
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
    const rule = createRegexDisplayRule(partial);
    settings.value.rules.unshift(rule);
    return rule;
  }

  function duplicateRule(ruleId: string) {
    const source = settings.value.rules.find(rule => rule.id === ruleId);
    if (!source) return addRule();
    return addRule({
      enabled: source.enabled,
      flags: source.flags,
      name: `${source.name || '显示规则'} 副本`,
      pattern: source.pattern,
      renderMode: source.renderMode as RegexDisplayRenderMode,
      replacement: source.replacement,
      targets: [...source.targets],
    });
  }

  function deleteRule(ruleId: string) {
    settings.value.rules = settings.value.rules.filter(rule => rule.id !== ruleId);
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
    importBackup,
    rehydrateFromSettings,
  };
});
