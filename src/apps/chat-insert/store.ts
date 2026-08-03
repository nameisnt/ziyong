import { validateInplace } from '@/util/zod';
// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

export const chatInsertField = 'sillytavern_phone_chat_insert';

const ChatInsertSettingsSchema = z.object({
  hidden: z.boolean().default(false),
  mode: z.enum(['new-end', 'new-before', 'append-last', 'append-message']).default('new-end'),
  role: z.enum(['assistant', 'system', 'user']).default('assistant'),
  separator: z.string().default('\n\n'),
  targetMessageId: z.number().int().nonnegative().default(0),
  template: z.string().default('{{references}}'),
});
export type ChatInsertSettings = z.infer<typeof ChatInsertSettingsSchema>;

function readSettings(raw: unknown) {
  try {
    const settings = validateInplace(ChatInsertSettingsSchema, raw && typeof raw === 'object' ? raw : {});
    if (
      settings.template.trim() ===
      '<phone-entry data-title="{{title}}" data-source="{{source}}">\n{{content}}\n</phone-entry>'
    ) {
      settings.template = '{{references}}';
    }
    if (settings.template.trim() === '{{content}}\n\n{{references}}') {
      settings.template = '{{references}}';
    }
    return settings;
  } catch {
    return validateInplace(ChatInsertSettingsSchema, {});
  }
}

export const useChatInsertStore = defineStore('chat-insert', () => {
  const settings = ref(readSettings(_.get(extension_settings, chatInsertField, {})));

  function persist(nextSettings: ChatInsertSettings) {
    _.set(extension_settings, chatInsertField, readSettings(klona(nextSettings)));
    void saveSettingsDebounced();
  }

  watch(settings, nextSettings => persist(nextSettings), { deep: true });

  function resetTemplate() {
    settings.value.template = '{{references}}';
  }

  function rehydrateFromSettings() {
    settings.value = readSettings(_.get(extension_settings, chatInsertField, {}));
  }

  return {
    rehydrateFromSettings,
    resetTemplate,
    settings,
  };
});
