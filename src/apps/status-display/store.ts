// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

export const statusDisplayField = 'sillytavern_phone_status_display';

export const StatusDisplaySchemeSchema = z.object({
  createdAt: z.string(),
  id: z.string(),
  mvuScope: z.enum(['message', 'chat', 'character', 'global']).default('message'),
  name: z.string().default('新状态栏'),
  source: z.enum(['regex', 'mvu']).default('regex'),
  template: z.string().default(''),
  updatedAt: z.string(),
});
export type StatusDisplayScheme = z.infer<typeof StatusDisplaySchemeSchema>;

export const StatusDisplaySettingsSchema = z.object({
  activeSchemeByScope: z.record(z.string(), z.string()).default({}),
  schemes: z.array(StatusDisplaySchemeSchema).default([]),
  version: z.literal(1).default(1),
});
export type StatusDisplaySettings = z.infer<typeof StatusDisplaySettingsSchema>;

export function statusDisplayRegexTargetId(schemeId: string) {
  return `status-display:${schemeId}`;
}

export function createStatusDisplayScheme(source: StatusDisplayScheme['source'] = 'regex'): StatusDisplayScheme {
  const timestamp = new Date().toISOString();
  return StatusDisplaySchemeSchema.parse({
    createdAt: timestamp,
    id: `status_scheme_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    mvuScope: 'message',
    name: source === 'mvu' ? 'MVU 状态栏' : '正则状态栏',
    source,
    template:
      source === 'mvu'
        ? '<style>\n.status-panel { padding: 16px; }\n.status-row { display: flex; justify-content: space-between; gap: 12px; }\n</style>\n<section class="status-panel">\n  <div class="status-row"><span>状态</span><strong>{{mvu:角色.状态}}</strong></div>\n</section>'
        : '',
    updatedAt: timestamp,
  });
}

function parseSettings(raw: unknown) {
  const parsed = StatusDisplaySettingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : StatusDisplaySettingsSchema.parse({});
}

export function readStatusDisplaySettingsSnapshot() {
  return parseSettings(_.get(extension_settings, statusDisplayField, {}));
}

export const useStatusDisplayStore = defineStore('statusDisplay', () => {
  const raw = _.get(extension_settings, statusDisplayField, {});
  const parsed = StatusDisplaySettingsSchema.safeParse(raw);
  const settings = ref<StatusDisplaySettings>(parsed.success ? parsed.data : StatusDisplaySettingsSchema.parse({}));
  const configError = ref(parsed.success ? '' : parsed.error.issues[0]?.message || '状态栏配置格式无效');
  const rawConfig = shallowRef(klona(raw));

  watch(
    settings,
    nextSettings => {
      if (configError.value) return;
      _.set(extension_settings, statusDisplayField, StatusDisplaySettingsSchema.parse(klona(nextSettings)));
      void saveSettingsDebounced();
    },
    { deep: true },
  );

  const schemes = computed(() => settings.value.schemes);

  function getActiveSchemeId(scopeKey: string) {
    const selected = settings.value.activeSchemeByScope[scopeKey];
    return settings.value.schemes.some(scheme => scheme.id === selected) ? selected : settings.value.schemes[0]?.id || '';
  }

  function setActiveScheme(scopeKey: string, schemeId: string) {
    settings.value.activeSchemeByScope[scopeKey] = schemeId;
  }

  function upsertScheme(input: StatusDisplayScheme) {
    const scheme = StatusDisplaySchemeSchema.parse({ ...klona(input), updatedAt: new Date().toISOString() });
    const index = settings.value.schemes.findIndex(item => item.id === scheme.id);
    if (index >= 0) settings.value.schemes[index] = scheme;
    else settings.value.schemes.push(scheme);
    return scheme;
  }

  function deleteScheme(schemeId: string) {
    settings.value.schemes = settings.value.schemes.filter(scheme => scheme.id !== schemeId);
    Object.entries(settings.value.activeSchemeByScope).forEach(([scopeKey, activeId]) => {
      if (activeId === schemeId) delete settings.value.activeSchemeByScope[scopeKey];
    });
  }

  function rehydrateFromSettings() {
    const nextRaw = _.get(extension_settings, statusDisplayField, {});
    const next = StatusDisplaySettingsSchema.safeParse(nextRaw);
    configError.value = next.success ? '' : next.error.issues[0]?.message || '状态栏配置格式无效';
    rawConfig.value = klona(nextRaw);
    settings.value = next.success ? next.data : StatusDisplaySettingsSchema.parse({});
  }

  return {
    configError,
    deleteScheme,
    getActiveSchemeId,
    rawConfig,
    rehydrateFromSettings,
    schemes,
    setActiveScheme,
    settings,
    upsertScheme,
  };
});
