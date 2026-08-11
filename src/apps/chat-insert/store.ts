// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

export const chatInsertField = 'sillytavern_phone_chat_insert';

export const ChatInsertSettingsSchema = z.object({
  hidden: z.boolean().default(false),
  mode: z.enum(['new-end', 'new-before', 'append-last', 'append-message']).default('new-end'),
  role: z.enum(['assistant', 'system', 'user']).default('assistant'),
  separator: z.string().default('\n\n'),
  targetMessageId: z.number().int().nonnegative().default(0),
  template: z.string().default('{{references}}'),
});
export type ChatInsertSettings = z.infer<typeof ChatInsertSettingsSchema>;

type SettingsReadResult = { data: ChatInsertSettings; error: string; rawData: unknown };

function readSettings(raw: unknown): SettingsReadResult {
  const rawData = klona(raw);
  const parsed = ChatInsertSettingsSchema.safeParse(typeof raw === 'undefined' ? {} : raw);
  if (!parsed.success) {
    return {
      data: ChatInsertSettingsSchema.parse({}),
      error: `插入工具配置校验失败：${parsed.error.issues[0]?.message ?? '数据格式无效'}`,
      rawData,
    };
  }
  const settings = parsed.data;
  if (
    settings.template.trim() === '<phone-entry data-title="{{title}}" data-source="{{source}}">\n{{content}}\n</phone-entry>' ||
    settings.template.trim() === '{{content}}\n\n{{references}}'
  ) {
    settings.template = '{{references}}';
  }
  return { data: settings, error: '', rawData };
}

export const useChatInsertStore = defineStore('chat-insert', () => {
  const initial = readSettings(_.get(extension_settings, chatInsertField));
  const settings = ref(initial.data);
  const configError = ref(initial.error);
  const rawConfig = shallowRef(initial.rawData);

  function persist(nextSettings: ChatInsertSettings) {
    if (configError.value) return;
    const parsed = readSettings(klona(nextSettings));
    if (parsed.error) throw new Error(parsed.error);
    _.set(extension_settings, chatInsertField, parsed.data);
    void saveSettingsDebounced();
  }

  watch(settings, nextSettings => persist(nextSettings), { deep: true });

  function resetTemplate() {
    settings.value.template = '{{references}}';
  }

  function rehydrateFromSettings() {
    const next = readSettings(_.get(extension_settings, chatInsertField));
    configError.value = next.error;
    rawConfig.value = next.rawData;
    settings.value = next.data;
  }

  function resetCorruptedSettings() {
    configError.value = '';
    rawConfig.value = undefined;
    settings.value = ChatInsertSettingsSchema.parse({});
    persist(settings.value);
  }

  return {
    configError,
    rawConfig,
    rehydrateFromSettings,
    resetCorruptedSettings,
    resetTemplate,
    settings,
  };
});
