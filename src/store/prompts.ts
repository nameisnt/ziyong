import {
  getRegisteredPhonePromptDefinitions,
  getRegisteredPhoneSpecialPromptDefinitions,
  getRegisteredPhoneTaskTemplateDefinitions,
  getRegisteredPhoneTypePromptDomains,
  type PhoneOutputParserDefinition,
  type PhoneOutputParserField,
  type PhonePromptOutputFormat,
} from '@/core/appRegistry';
import { parsePrettified, validateInplace } from '@/util/zod';
import type { ZodType } from 'zod';
// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

export const PromptAppKeySchema = z.string();
export type PromptAppKey = string;

export const SpecialPromptKeySchema = z.string();
export type SpecialPromptKey = string;

export const TypePromptConfigSchema = z.object({
  id: z.string(),
  domain: z.string(),
  name: z.string(),
  prompt: z.string(),
  charReplacement: z.string().default(''),
  groupId: z.string().default(''),
  renderMode: z.enum(['markdown', 'frontend']).optional(),
  userReplacement: z.string().default(''),
  usageCount: z.number().int().nonnegative().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TypePromptConfig = z.infer<typeof TypePromptConfigSchema>;

export const TypePromptGroupSchema = z.object({
  domain: z.string(),
  id: z.string(),
  name: z.string(),
});
export type TypePromptGroup = z.infer<typeof TypePromptGroupSchema>;

export const QuickPhraseSchema = z.object({
  id: z.string(),
  text: z.string(),
});
export type QuickPhrase = z.infer<typeof QuickPhraseSchema>;

export const QuickPhraseGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  phrases: z.array(QuickPhraseSchema).default([]),
});
export type QuickPhraseGroup = z.infer<typeof QuickPhraseGroupSchema>;
export const QuickTemplateGroupSchema = QuickPhraseGroupSchema;
export type QuickTemplateGroup = z.infer<typeof QuickTemplateGroupSchema>;

export const OutputParserFieldSchema: ZodType<PhoneOutputParserField> = z.lazy(() =>
  z.object({
    children: z.array(OutputParserFieldSchema).optional(),
    defaultPath: z.string(),
    extraction: z.enum(['markup', 'text']).optional(),
    key: z.string(),
    kind: z.enum(['object-list', 'text', 'text-list']),
    label: z.string(),
    required: z.boolean().optional(),
    separator: z.string().optional(),
  }),
);

export const OutputParserConfigSchema: ZodType<PhoneOutputParserDefinition> = z.object({
  fields: z.array(OutputParserFieldSchema),
  kind: z.enum(['json', 'labels', 'text', 'xml']),
  rootPath: z.string().optional(),
});

export const OutputRuleOverrideSchema = z.object({
  outputFormat: z.string().optional(),
  parser: OutputParserConfigSchema.optional(),
  parserEnabled: z.boolean().default(false),
});
export type OutputRuleOverride = z.infer<typeof OutputRuleOverrideSchema>;

export const PromptSettingsSchema = z.object({
  appPrompts: z.record(PromptAppKeySchema, z.string()).default({}),
  outputRules: z.record(z.string(), OutputRuleOverrideSchema).default({}),
  specialPrompts: z.record(SpecialPromptKeySchema, z.string()).default({}),
  taskTemplates: z.record(z.string(), z.string()).default({}),
  typePrompts: z.array(TypePromptConfigSchema).default([]),
  typePromptGroups: z.array(TypePromptGroupSchema).default([]),
  quickPhraseGroups: z.array(QuickPhraseGroupSchema).default([]),
  quickTemplateGroups: z.array(QuickTemplateGroupSchema).default([]),
});
export type PromptSettings = z.infer<typeof PromptSettingsSchema>;

export const promptField = 'sillytavern_phone_prompt_settings';

export const PromptTransferSelectionSchema = z.object({
  appPrompts: z.boolean().default(true),
  taskTemplates: z.boolean().default(true),
  outputRules: z.boolean().default(true),
  typePrompts: z.boolean().default(true),
  quickPhraseGroups: z.boolean().default(true),
  quickTemplateGroups: z.boolean().default(true),
});
export type PromptTransferSelection = z.infer<typeof PromptTransferSelectionSchema>;

export const PromptTransferSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  exportedAt: z.string(),
  sections: z.object({
    appPrompts: z.record(PromptAppKeySchema, z.string()).optional(),
    outputRules: z.record(z.string(), OutputRuleOverrideSchema).optional(),
    specialPrompts: z.record(SpecialPromptKeySchema, z.string()).optional(),
    taskTemplates: z.record(z.string(), z.string()).optional(),
    typePrompts: z.array(TypePromptConfigSchema).optional(),
    typePromptGroups: z.array(TypePromptGroupSchema).optional(),
    quickPhraseGroups: z.array(QuickPhraseGroupSchema).optional(),
    quickTemplateGroups: z.array(QuickTemplateGroupSchema).optional(),
  }),
});
export type PromptTransfer = z.infer<typeof PromptTransferSchema>;

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getDefaultTypePromptDefinitions() {
  return getRegisteredPhoneTypePromptDomains()
    .flatMap(domain => domain.defaultPrompts ?? [])
    .map(item => ({
      charReplacement: '',
      userReplacement: '',
      ...item,
    }));
}

function getDefaultTypePromptGroups(): TypePromptGroup[] {
  return getRegisteredPhoneTypePromptDomains().flatMap(domain =>
    (domain.defaultGroups ?? []).map(group => ({ ...group, domain: domain.key })),
  );
}

function createDefaultTypePrompts(timestamp = nowIso()): TypePromptConfig[] {
  return getDefaultTypePromptDefinitions().map(item => ({
    ...item,
    groupId: item.groupId || '',
    usageCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

function defaultTypeKey(item: Pick<TypePromptConfig, 'domain' | 'name'>) {
  return `${item.domain}:${item.name.trim().toLowerCase()}`;
}

function getDefaultTypePromptOrder() {
  return new Map(getDefaultTypePromptDefinitions().map((item, index) => [defaultTypeKey(item), index]));
}

function ensureDefaultTypePrompts(settings: PromptSettings) {
  const existingKeys = new Set(settings.typePrompts.map(defaultTypeKey));
  const existingIds = new Set(settings.typePrompts.map(item => item.id));
  const missing = createDefaultTypePrompts().filter(
    item => !existingKeys.has(defaultTypeKey(item)) && !existingIds.has(item.id),
  );
  if (missing.length) {
    settings.typePrompts = [...settings.typePrompts, ...missing];
  }
}

function ensureDefaultTypePromptGroups(settings: PromptSettings) {
  const existingIds = new Set(settings.typePromptGroups.map(group => group.id));
  getDefaultTypePromptGroups().forEach(group => {
    if (!existingIds.has(group.id)) settings.typePromptGroups.push(group);
  });
  const defaultPrompts = new Map(getDefaultTypePromptDefinitions().map(prompt => [prompt.id, prompt]));
  settings.typePrompts.forEach(prompt => {
    const defaultPrompt = defaultPrompts.get(prompt.id);
    if (!prompt.groupId && defaultPrompt?.groupId) prompt.groupId = defaultPrompt.groupId;
  });
}

function ensureTheaterTypePromptRenderModes(settings: PromptSettings) {
  settings.typePrompts.forEach(item => {
    if (item.domain !== 'theater') return;
    if (item.renderMode === 'frontend' && !item.prompt.includes('```html')) {
      item.prompt = `${item.prompt.trim()}\n\n需要网页渲染的部分必须严格使用 \`\`\`html 前缀和 \`\`\` 后缀包裹。`;
    }
    item.renderMode = undefined;
  });
}

function ensureUnifiedTheaterOutputRule(settings: PromptSettings) {
  if (settings.outputRules['theater.generate']) return;
  const legacy = settings.outputRules['theater.markdown'] ?? settings.outputRules['theater.frontend'];
  if (!legacy) return;
  const fenceInstruction = [
    '网页渲染前缀必须严格使用：```html',
    '网页渲染后缀必须严格使用：```',
    '只有前缀与后缀中间的内容会作为网页渲染，围栏前后按普通正文显示。',
  ].join('\n');
  settings.outputRules['theater.generate'] = {
    ...klona(legacy),
    ...(legacy.outputFormat ? { outputFormat: `${legacy.outputFormat.trim()}\n\n${fenceInstruction}` } : {}),
  };
}

function buildDefaultAppPrompts() {
  return Object.fromEntries(
    getRegisteredPhonePromptDefinitions().map(definition => [definition.key, definition.defaultPrompt]),
  );
}

function buildDefaultSpecialPrompts() {
  return Object.fromEntries(
    getRegisteredPhoneSpecialPromptDefinitions().map(definition => [definition.key, definition.defaultPrompt]),
  );
}

function buildDefaultTaskTemplates() {
  return Object.fromEntries(
    getRegisteredPhoneTaskTemplateDefinitions().map(definition => [definition.key, definition.defaultTemplate]),
  );
}

function collectOutputFormatDefinitions() {
  const definitions = [...getRegisteredPhonePromptDefinitions(), ...getRegisteredPhoneSpecialPromptDefinitions()];
  const formats = new Map<string, PhonePromptOutputFormat>();
  definitions.forEach(definition => {
    definition.outputFormats?.forEach(format => {
      if (!formats.has(format.id)) formats.set(format.id, format);
    });
  });
  return [...formats.values()];
}

const legacyDigestDefaultPrompt = [
  '你负责从聊天内容中提炼可复用的短摘要和重要摘录。',
  '要求保留关键事实、人物态度、关系变化、时间线和必要原句证据。',
  '不要写成长篇总结，不要编造来源中不存在的信息。',
].join('\n');

const legacyComfyDefaultPrompt = [
  '你负责把用户的自然语言需求转换为适合 ComfyUI 工作流的结构化生成输入。',
  '根据来源楼层和引用内容理解画面、声音或视频目标，但不要把聊天原文直接塞进提示词。',
  'prompt 要写成可直接进入生图/生音/生视频工作流的提示词；negative 用于排除不想要的质量问题或元素。',
  '如果提供了可填写工作流参数，只填写你有把握且和本次需求相关的参数。',
  '不要输出 XML 之外的解释。',
].join('\n');

const migratedDefaultPrompts = {
  diary: {
    from: '请以视角角色的第一人称写一篇私密日记。保留角色真实情绪，不要写成剧情总结；重点记录角色不知道如何当面说出口的想法。',
    to: '请写一篇私密日记。保留角色真实情绪，不要写成剧情总结；重点记录角色不知道如何当面说出口的想法。',
  },
  extras: {
    from: '请按番外类型写长篇章节。需要有清晰场景、推进和情绪落点；如果是续写，延续上一章语气与悬念。',
    to: '请按本次番外类型写长篇章节。需要有清晰场景、情节推进和情绪落点。',
  },
  forum: {
    from: '请生成真实论坛风格的帖子与回复。网友语气要有差异，允许吐槽、歪楼、楼中楼，但不要脱离当前剧情事实。',
    to: '请生成真实论坛风格的主楼与若干回复。网友语气要有差异，允许吐槽和歪楼，但不要脱离当前剧情事实。',
  },
  letters: {
    from: '请以指定角色的口吻写一封书信。格式可以是正式信件、便条、短信或邮件。保留角色真实语气和情感，不要写成第三人称叙事。',
    to: '请保留角色真实语气和情感来写这封信，不要写成第三人称叙事。',
  },
  theater: {
    from: '请生成一次性短内容。节奏紧凑，突出互动与反差；可使用对话体、弹幕体或剧本格式，但结尾要有一个轻巧收束。',
    to: '请在保留角色们的核心性格的基础上，创建一个小剧场，不需要解释变化的原因。小剧场要求如下：',
  },
} as const;

const migratedSpecialPrompts = {
  diaryReaction: {
    from: '请以阅读者视角回应被读到的日记内容，保留“读后反应”的私密感。',
    to: '请写出读完日记后的私密反应，保留角色真实语气和情绪。',
  },
} as const;

function ensureRegisteredPromptDefaults(settings: PromptSettings) {
  const previousExtrasPrompt = settings.appPrompts.extras?.trim() || '';
  const hadExtrasContinuePrompt = 'extrasContinue' in settings.appPrompts;
  const appDefaults = buildDefaultAppPrompts();
  const previousExtrasWasDefault =
    previousExtrasPrompt === migratedDefaultPrompts.extras.from ||
    previousExtrasPrompt === migratedDefaultPrompts.extras.to ||
    previousExtrasPrompt === appDefaults.extras;
  Object.entries(appDefaults).forEach(([key, value]) => {
    if (!(key in settings.appPrompts)) settings.appPrompts[key] = value;
  });
  if (previousExtrasWasDefault) {
    settings.appPrompts.extras = appDefaults.extras ?? settings.appPrompts.extras;
  } else if (previousExtrasPrompt) {
    if (!hadExtrasContinuePrompt) settings.appPrompts.extrasContinue = previousExtrasPrompt;
  }
  if (settings.appPrompts.digest?.trim() === legacyDigestDefaultPrompt) {
    settings.appPrompts.digest = appDefaults.digest ?? settings.appPrompts.digest;
  }
  if (settings.appPrompts.comfy?.trim() === legacyComfyDefaultPrompt) {
    settings.appPrompts.comfy = appDefaults.comfy ?? settings.appPrompts.comfy;
  }
  Object.entries(migratedDefaultPrompts).forEach(([key, migration]) => {
    if (settings.appPrompts[key]?.trim() === migration.from) {
      settings.appPrompts[key] = migration.to;
    }
  });
  const specialDefaults = buildDefaultSpecialPrompts();
  Object.entries(specialDefaults).forEach(([key, value]) => {
    if (!(key in settings.specialPrompts)) settings.specialPrompts[key] = value;
  });
  if (!settings.specialPrompts.extraSummary?.trim()) {
    settings.specialPrompts.extraSummary = specialDefaults.extraSummary ?? '';
  }
  Object.entries(migratedSpecialPrompts).forEach(([key, migration]) => {
    if (settings.specialPrompts[key]?.trim() === migration.from) {
      settings.specialPrompts[key] = migration.to;
    }
  });
  Object.entries(buildDefaultTaskTemplates()).forEach(([key, value]) => {
    if (!(key in settings.taskTemplates)) settings.taskTemplates[key] = value;
  });
}

function createDefaultPromptSettings(): PromptSettings {
  const timestamp = nowIso();
  return {
    appPrompts: buildDefaultAppPrompts(),
    outputRules: {},
    specialPrompts: buildDefaultSpecialPrompts(),
    taskTemplates: buildDefaultTaskTemplates(),
    typePrompts: createDefaultTypePrompts(timestamp),
    typePromptGroups: getDefaultTypePromptGroups(),
    quickPhraseGroups: [
      {
        id: 'prompt_group_emotion',
        name: '情绪加强',
        phrases: [
          { id: 'prompt_phrase_emotion_1', text: '把情绪波动写得更克制但更具体。' },
          { id: 'prompt_phrase_emotion_2', text: '增加人物犹豫和自我说服的层次。' },
        ],
      },
      {
        id: 'prompt_group_rhythm',
        name: '节奏调整',
        phrases: [
          { id: 'prompt_phrase_rhythm_1', text: '整体节奏再快一点，减少解释性句子。' },
          { id: 'prompt_phrase_rhythm_2', text: '保留现有情节，但把结尾停在更有悬念的位置。' },
        ],
      },
    ],
    quickTemplateGroups: [
      {
        id: 'template_group_insert',
        name: '楼层插入',
        phrases: [
          { id: 'template_insert_basic', text: '{{references}}' },
          { id: 'template_insert_named', text: '【{{title}}】\n{{references}}' },
        ],
      },
    ],
  };
}

export const usePromptStore = defineStore('prompts', () => {
  const data = ref(validateInplace(PromptSettingsSchema, _.get(extension_settings, promptField, {})));

  function persist(nextData: typeof data.value) {
    const parsed = validateInplace(PromptSettingsSchema, klona(nextData));
    _.set(extension_settings, promptField, parsed);
    void saveSettingsDebounced();
  }

  watch(
    data,
    nextData => {
      persist(nextData);
    },
    { deep: true },
  );

  const appPromptValues = Object.values(data.value.appPrompts);
  const specialPromptValues = Object.values(data.value.specialPrompts);
  if (
    appPromptValues.every(value => !value.trim()) &&
    specialPromptValues.every(value => !value.trim()) &&
    !Object.keys(data.value.outputRules).length &&
    !data.value.typePrompts.length &&
    !data.value.quickPhraseGroups.length &&
    !data.value.quickTemplateGroups.length
  ) {
    data.value = createDefaultPromptSettings();
  }
  ensureRegisteredPromptDefaults(data.value);
  ensureDefaultTypePromptGroups(data.value);
  ensureDefaultTypePrompts(data.value);
  ensureTheaterTypePromptRenderModes(data.value);
  ensureUnifiedTheaterOutputRule(data.value);

  const appPromptDefinitions = computed(() => getRegisteredPhonePromptDefinitions());
  const appPrompts = computed(() => data.value.appPrompts);
  const outputFormatDefinitions = computed(() => collectOutputFormatDefinitions());
  const outputRules = computed(() => data.value.outputRules);
  const specialPromptDefinitions = computed(() => getRegisteredPhoneSpecialPromptDefinitions());
  const specialPrompts = computed(() => data.value.specialPrompts);
  const taskTemplateDefinitions = computed(() => getRegisteredPhoneTaskTemplateDefinitions());
  const taskTemplates = computed(() => data.value.taskTemplates);
  const typePrompts = computed(() =>
    data.value.typePrompts
      .map((item, index) => ({ item, index }))
      .sort((left, right) => {
        const usageDelta = right.item.usageCount - left.item.usageCount;
        if (usageDelta) return usageDelta;
        const defaultTypePromptOrder = getDefaultTypePromptOrder();
        const leftDefaultOrder = defaultTypePromptOrder.get(defaultTypeKey(left.item)) ?? Number.MAX_SAFE_INTEGER;
        const rightDefaultOrder = defaultTypePromptOrder.get(defaultTypeKey(right.item)) ?? Number.MAX_SAFE_INTEGER;
        return leftDefaultOrder - rightDefaultOrder || left.index - right.index;
      })
      .map(({ item }) => item),
  );
  const typePromptDomains = computed(() => getRegisteredPhoneTypePromptDomains());
  const typePromptGroups = computed(() => data.value.typePromptGroups);
  const quickPhraseGroups = computed(() => data.value.quickPhraseGroups);
  const quickTemplateGroups = computed(() => data.value.quickTemplateGroups);

  watch(
    () => [
      ...appPromptDefinitions.value.map(definition => definition.key),
      ...specialPromptDefinitions.value.map(definition => definition.key),
      ...taskTemplateDefinitions.value.map(definition => definition.key),
    ],
    () => ensureRegisteredPromptDefaults(data.value),
    { immediate: true },
  );

  function updateAppPrompt(key: PromptAppKey, value: string) {
    data.value.appPrompts[key] = value;
  }

  function updateSpecialPrompt(key: SpecialPromptKey, value: string) {
    data.value.specialPrompts[key] = value;
  }

  function updateTaskTemplate(key: string, value: string) {
    data.value.taskTemplates[key] = value;
  }

  function resolveTaskTemplate(key: string, variables: Record<string, string> = {}, fallback = '') {
    const definition = getRegisteredPhoneTaskTemplateDefinitions().find(item => item.key === key);
    if (!definition) return fallback.trim();
    const template = data.value.taskTemplates[key] ?? definition.defaultTemplate;
    const values: Record<string, string> = { taskInstruction: fallback, ...variables };
    return template
      .replace(/\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/g, (placeholder, variableKey: string) =>
        variableKey in values ? values[variableKey] || '' : placeholder,
      )
      .split('\n')
      .map(line => line.trimEnd())
      .filter((line, index, lines) => line || (index > 0 && lines[index - 1]))
      .join('\n')
      .trim();
  }

  function getOutputFormatDefinition(outputId: string) {
    return collectOutputFormatDefinitions().find(item => item.id === outputId) ?? null;
  }

  function resolveOutputFormat(outputId: string) {
    const definition = getOutputFormatDefinition(outputId);
    if (!definition) throw new Error(`未知输出格式：${outputId}`);
    return data.value.outputRules[outputId]?.outputFormat ?? definition.content;
  }

  function resolveOutputParser(outputId: string) {
    const override = data.value.outputRules[outputId];
    if (!override?.parserEnabled || !override.parser) return null;
    return klona(override.parser);
  }

  function saveOutputRule(
    outputId: string,
    input: { outputFormat: string; parser: PhoneOutputParserDefinition; parserEnabled: boolean },
  ) {
    const definition = getOutputFormatDefinition(outputId);
    if (!definition) throw new Error(`未知输出格式：${outputId}`);
    const outputFormat = input.outputFormat.trim();
    const parsedParser = parsePrettified(OutputParserConfigSchema, input.parser);
    const next: OutputRuleOverride = {
      ...(outputFormat !== definition.content.trim() ? { outputFormat } : {}),
      ...(input.parserEnabled ? { parser: parsedParser } : {}),
      parserEnabled: input.parserEnabled,
    };
    if (!next.outputFormat && !next.parserEnabled) {
      delete data.value.outputRules[outputId];
      return;
    }
    data.value.outputRules[outputId] = next;
  }

  function resetOutputRule(outputId: string) {
    delete data.value.outputRules[outputId];
  }

  function buildTransfer(selection: PromptTransferSelection): PromptTransfer {
    const parsedSelection = parsePrettified(PromptTransferSelectionSchema, selection);
    const sections: PromptTransfer['sections'] = {};

    if (parsedSelection.appPrompts) {
      sections.appPrompts = klona(data.value.appPrompts);
      sections.specialPrompts = klona(data.value.specialPrompts);
    }
    if (parsedSelection.taskTemplates) {
      sections.taskTemplates = klona(data.value.taskTemplates);
    }
    if (parsedSelection.outputRules) {
      sections.outputRules = klona(data.value.outputRules);
    }

    if (parsedSelection.typePrompts) {
      sections.typePrompts = klona(data.value.typePrompts);
      sections.typePromptGroups = klona(data.value.typePromptGroups);
    }

    if (parsedSelection.quickPhraseGroups) {
      sections.quickPhraseGroups = klona(data.value.quickPhraseGroups);
    }
    if (parsedSelection.quickTemplateGroups) {
      sections.quickTemplateGroups = klona(data.value.quickTemplateGroups);
    }

    if (!Object.keys(sections).length) {
      throw new Error('请至少选择一类提示词后再导出');
    }

    return {
      schemaVersion: 1,
      exportedAt: nowIso(),
      sections,
    };
  }

  function parseTransfer(raw: string) {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      throw new Error('提示词配置文件不是有效的 JSON');
    }
    return parsePrettified(PromptTransferSchema, parsedJson);
  }

  function applyTransfer(transfer: PromptTransfer, selection: PromptTransferSelection) {
    const parsedSelection = parsePrettified(PromptTransferSelectionSchema, selection);

    if (parsedSelection.appPrompts) {
      if (!transfer.sections.appPrompts || !transfer.sections.specialPrompts) {
        throw new Error('导入文件里缺少 App 提示词区段');
      }
      data.value.appPrompts = klona(transfer.sections.appPrompts);
      data.value.specialPrompts = klona(transfer.sections.specialPrompts);
      ensureRegisteredPromptDefaults(data.value);
    }
    if (parsedSelection.taskTemplates && transfer.sections.taskTemplates) {
      data.value.taskTemplates = klona(transfer.sections.taskTemplates);
      ensureRegisteredPromptDefaults(data.value);
    }
    if (parsedSelection.outputRules) {
      if (!transfer.sections.outputRules) {
        throw new Error('导入文件里缺少输出与解析区段');
      }
      data.value.outputRules = klona(transfer.sections.outputRules);
      ensureUnifiedTheaterOutputRule(data.value);
    }

    if (parsedSelection.typePrompts) {
      if (!transfer.sections.typePrompts) {
        throw new Error('导入文件里缺少类型提示词区段');
      }
      data.value.typePrompts = klona(transfer.sections.typePrompts);
      data.value.typePromptGroups = klona(transfer.sections.typePromptGroups ?? []);
      ensureDefaultTypePromptGroups(data.value);
      ensureTheaterTypePromptRenderModes(data.value);
    }

    if (parsedSelection.quickPhraseGroups) {
      if (!transfer.sections.quickPhraseGroups) {
        throw new Error('导入文件里缺少快速短语区段');
      }
      data.value.quickPhraseGroups = klona(transfer.sections.quickPhraseGroups);
    }
    if (parsedSelection.quickTemplateGroups) {
      if (!transfer.sections.quickTemplateGroups) {
        throw new Error('导入文件里缺少模板快捷区段');
      }
      data.value.quickTemplateGroups = klona(transfer.sections.quickTemplateGroups);
    }
  }

  function getTypePrompt(promptId: string) {
    return data.value.typePrompts.find(item => item.id === promptId) ?? null;
  }

  function createTypePrompt(
    input: Pick<TypePromptConfig, 'domain' | 'name' | 'prompt'> &
      Partial<Pick<TypePromptConfig, 'charReplacement' | 'groupId' | 'renderMode' | 'userReplacement'>>,
  ) {
    const timestamp = nowIso();
    const item: TypePromptConfig = {
      id: createId('type_prompt'),
      domain: input.domain,
      name: input.name.trim() || '未命名类型提示词',
      prompt: input.prompt.trim(),
      charReplacement: input.charReplacement?.trim() || '',
      groupId: input.groupId?.trim() || '',
      renderMode: undefined,
      userReplacement: input.userReplacement?.trim() || '',
      usageCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.value.typePrompts = [item, ...data.value.typePrompts];
    return item;
  }

  function updateTypePrompt(
    promptId: string,
    input: Pick<TypePromptConfig, 'domain' | 'name' | 'prompt'> &
      Partial<Pick<TypePromptConfig, 'charReplacement' | 'groupId' | 'renderMode' | 'userReplacement'>>,
  ) {
    const item = getTypePrompt(promptId);
    if (!item) return null;
    item.domain = input.domain;
    item.name = input.name.trim() || item.name;
    item.prompt = input.prompt.trim();
    item.charReplacement = input.charReplacement?.trim() || '';
    item.groupId = input.groupId?.trim() || '';
    item.renderMode = undefined;
    item.userReplacement = input.userReplacement?.trim() || '';
    item.updatedAt = nowIso();
    return item;
  }

  function deleteTypePrompt(promptId: string) {
    data.value.typePrompts = data.value.typePrompts.filter(item => item.id !== promptId);
  }

  function createTypePromptGroup(domain: string, name: string) {
    const group: TypePromptGroup = {
      domain,
      id: createId('type_group'),
      name: name.trim() || '未命名分组',
    };
    data.value.typePromptGroups.push(group);
    return group;
  }

  function renameTypePromptGroup(groupId: string, name: string) {
    const group = data.value.typePromptGroups.find(item => item.id === groupId);
    if (!group) return null;
    group.name = name.trim() || group.name;
    return group;
  }

  function deleteTypePromptGroup(groupId: string) {
    data.value.typePromptGroups = data.value.typePromptGroups.filter(group => group.id !== groupId);
    data.value.typePrompts.forEach(prompt => {
      if (prompt.groupId === groupId) prompt.groupId = '';
    });
  }

  function getQuickPhraseGroup(groupId: string) {
    return data.value.quickPhraseGroups.find(group => group.id === groupId) ?? null;
  }

  function getQuickTemplateGroup(groupId: string) {
    return data.value.quickTemplateGroups.find(group => group.id === groupId) ?? null;
  }

  function createQuickPhraseGroup(name: string) {
    const group: QuickPhraseGroup = {
      id: createId('phrase_group'),
      name: name.trim() || '未命名分组',
      phrases: [],
    };
    data.value.quickPhraseGroups = [group, ...data.value.quickPhraseGroups];
    return group;
  }

  function createQuickTemplateGroup(name: string) {
    const group: QuickTemplateGroup = {
      id: createId('template_group'),
      name: name.trim() || '未命名模板分组',
      phrases: [],
    };
    data.value.quickTemplateGroups = [group, ...data.value.quickTemplateGroups];
    return group;
  }

  function renameQuickPhraseGroup(groupId: string, name: string) {
    const group = getQuickPhraseGroup(groupId);
    if (!group) return null;
    group.name = name.trim() || group.name;
    return group;
  }

  function renameQuickTemplateGroup(groupId: string, name: string) {
    const group = getQuickTemplateGroup(groupId);
    if (!group) return null;
    group.name = name.trim() || group.name;
    return group;
  }

  function moveGroup(groups: QuickPhraseGroup[], groupId: string, direction: -1 | 1) {
    const currentIndex = groups.findIndex(group => group.id === groupId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= groups.length) return groups;
    const next = [...groups];
    [next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]];
    return next;
  }

  function moveQuickPhraseGroup(groupId: string, direction: -1 | 1) {
    data.value.quickPhraseGroups = moveGroup(data.value.quickPhraseGroups, groupId, direction);
  }

  function moveQuickTemplateGroup(groupId: string, direction: -1 | 1) {
    data.value.quickTemplateGroups = moveGroup(data.value.quickTemplateGroups, groupId, direction);
  }

  function deleteQuickPhraseGroup(groupId: string) {
    data.value.quickPhraseGroups = data.value.quickPhraseGroups.filter(group => group.id !== groupId);
  }

  function deleteQuickTemplateGroup(groupId: string) {
    data.value.quickTemplateGroups = data.value.quickTemplateGroups.filter(group => group.id !== groupId);
  }

  function createQuickPhrase(groupId: string, text: string) {
    const group = getQuickPhraseGroup(groupId);
    if (!group) return null;
    const phrase: QuickPhrase = {
      id: createId('phrase'),
      text: text.trim(),
    };
    group.phrases = [phrase, ...group.phrases];
    return phrase;
  }

  function createQuickTemplate(groupId: string, text: string) {
    const group = getQuickTemplateGroup(groupId);
    if (!group) return null;
    const phrase: QuickPhrase = {
      id: createId('template'),
      text: text.trim(),
    };
    group.phrases = [phrase, ...group.phrases];
    return phrase;
  }

  function updateQuickPhrase(groupId: string, phraseId: string, text: string) {
    const group = getQuickPhraseGroup(groupId);
    const phrase = group?.phrases.find(item => item.id === phraseId);
    if (!group || !phrase) return null;
    phrase.text = text.trim();
    return phrase;
  }

  function updateQuickTemplate(groupId: string, phraseId: string, text: string) {
    const group = getQuickTemplateGroup(groupId);
    const phrase = group?.phrases.find(item => item.id === phraseId);
    if (!group || !phrase) return null;
    phrase.text = text.trim();
    return phrase;
  }

  function deleteQuickPhrase(groupId: string, phraseId: string) {
    const group = getQuickPhraseGroup(groupId);
    if (!group) return;
    group.phrases = group.phrases.filter(item => item.id !== phraseId);
  }

  function deleteQuickTemplate(groupId: string, phraseId: string) {
    const group = getQuickTemplateGroup(groupId);
    if (!group) return;
    group.phrases = group.phrases.filter(item => item.id !== phraseId);
  }

  function resetDefaults() {
    data.value = createDefaultPromptSettings();
  }

  function rehydrateFromSettings() {
    data.value = validateInplace(PromptSettingsSchema, _.get(extension_settings, promptField, {}));
    ensureRegisteredPromptDefaults(data.value);
    ensureDefaultTypePromptGroups(data.value);
    ensureDefaultTypePrompts(data.value);
    ensureTheaterTypePromptRenderModes(data.value);
    ensureUnifiedTheaterOutputRule(data.value);
  }

  return {
    applyTransfer,
    appPromptDefinitions,
    appPrompts,
    buildTransfer,
    createQuickPhrase,
    createQuickPhraseGroup,
    createQuickTemplate,
    createQuickTemplateGroup,
    createTypePrompt,
    createTypePromptGroup,
    data,
    deleteQuickPhrase,
    deleteQuickPhraseGroup,
    deleteQuickTemplate,
    deleteQuickTemplateGroup,
    deleteTypePrompt,
    deleteTypePromptGroup,
    getQuickPhraseGroup,
    getQuickTemplateGroup,
    getOutputFormatDefinition,
    getTypePrompt,
    moveQuickPhraseGroup,
    moveQuickTemplateGroup,
    outputFormatDefinitions,
    outputRules,
    parseTransfer,
    quickPhraseGroups,
    quickTemplateGroups,
    rehydrateFromSettings,
    renameQuickPhraseGroup,
    renameQuickTemplateGroup,
    renameTypePromptGroup,
    resetDefaults,
    resetOutputRule,
    resolveOutputFormat,
    resolveOutputParser,
    resolveTaskTemplate,
    saveOutputRule,
    specialPromptDefinitions,
    specialPrompts,
    taskTemplateDefinitions,
    taskTemplates,
    typePromptDomains,
    typePromptGroups,
    typePrompts,
    updateAppPrompt,
    updateQuickPhrase,
    updateQuickTemplate,
    updateSpecialPrompt,
    updateTaskTemplate,
    updateTypePrompt,
  };
});
