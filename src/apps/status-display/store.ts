// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';
import { getCurrentChatScopeKey, isPlaceholderChatScopeKey } from '@/store/chatScoped';
import { onTavernEvent } from '@/util/runtime';
import { regexDisplayField, useRegexDisplayStore } from '@/apps/regex-display/store';
import {
  getEnabledStatusSchemes,
  getSchemeBindingScopes,
  getVisibleStatusSchemes,
  migrateLegacySchemes,
  restrictSchemeBindings,
} from './schemeScope';

export const statusDisplayField = 'sillytavern_phone_status_display';

export const StatusDisplaySchemeSchema = z.object({
  createdAt: z.string(),
  id: z.string(),
  mvuScope: z.enum(['message', 'chat', 'character', 'global']).default('message'),
  name: z.string().default('新状态栏'),
  ownerScopeKey: z.string().default(''),
  shared: z.boolean().default(false),
  source: z.enum(['regex', 'mvu']).default('regex'),
  template: z.string().default(''),
  updatedAt: z.string(),
});
export type StatusDisplayScheme = z.infer<typeof StatusDisplaySchemeSchema>;

export const StatusDisplaySettingsSchema = z.object({
  activeSchemeByScope: z.record(z.string(), z.string()).default({}),
  enabledSchemeIdsByScope: z.record(z.string(), z.array(z.string())).default({}),
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
    ownerScopeKey: currentStatusScope(),
    name: source === 'mvu' ? 'MVU 状态栏' : '正则状态栏',
    source,
    template:
      source === 'mvu'
        ? '<style>\n.status-panel { padding: 16px; }\n.status-row { display: flex; justify-content: space-between; gap: 12px; }\n</style>\n<section class="status-panel">\n  <div class="status-row"><span>状态</span><strong>{{mvu:角色.状态}}</strong></div>\n</section>'
        : '',
    updatedAt: timestamp,
  });
}

function currentStatusScope() {
  const scope = getCurrentChatScopeKey();
  return isPlaceholderChatScopeKey(scope) ? '' : scope;
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

  function migrateLegacy() {
    const scope = currentStatusScope();
    if (configError.value || !scope || !settings.value.schemes.some(scheme => !scheme.ownerScopeKey)) return;
    const copies = migrateLegacySchemes(settings.value, scope);
    if (copies.length) {
      const regex = useRegexDisplayStore();
      regex.rehydrateFromSettings();
      copies.forEach(({ sourceId, targetId }) => {
        const usage = regex.settings.usages[statusDisplayRegexTargetId(sourceId)];
        if (usage) regex.settings.usages[statusDisplayRegexTargetId(targetId)] = klona(usage);
      });
      // Backup rehydration may run regex after status; publish both domains together.
      _.set(extension_settings, regexDisplayField, klona(regex.settings));
    }
    _.set(extension_settings, statusDisplayField, klona(settings.value));
    void saveSettingsDebounced();
  }
  migrateLegacy();
  const stopChatChanged = onTavernEvent('CHAT_CHANGED', migrateLegacy);
  onScopeDispose(() => stopChatChanged.stop());

  function getVisibleSchemes(scopeKey: string) {
    return getVisibleStatusSchemes(settings.value, isPlaceholderChatScopeKey(scopeKey) ? '' : scopeKey);
  }

  function getEnabledSchemeIds(scopeKey: string) {
    return getEnabledStatusSchemes(settings.value, isPlaceholderChatScopeKey(scopeKey) ? '' : scopeKey);
  }

  function getActiveSchemeId(scopeKey: string) {
    const enabledIds = getEnabledSchemeIds(scopeKey);
    const selected = settings.value.activeSchemeByScope[scopeKey];
    return enabledIds.includes(selected) ? selected : enabledIds[0] || '';
  }

  function setActiveScheme(scopeKey: string, schemeId: string) {
    if (!getVisibleSchemes(scopeKey).some(scheme => scheme.id === schemeId)) return;
    const enabledIds = getEnabledSchemeIds(scopeKey);
    if (!enabledIds.includes(schemeId)) {
      settings.value.enabledSchemeIdsByScope[scopeKey] = [...enabledIds, schemeId];
    }
    settings.value.activeSchemeByScope[scopeKey] = schemeId;
  }

  function setEnabledSchemeIds(scopeKey: string, schemeIds: string[]) {
    const existingIds = new Set(getVisibleSchemes(scopeKey).map(scheme => scheme.id));
    const enabledIds = [...new Set(schemeIds)].filter(id => existingIds.has(id));
    settings.value.enabledSchemeIdsByScope[scopeKey] = enabledIds;
    if (!enabledIds.includes(settings.value.activeSchemeByScope[scopeKey])) {
      if (enabledIds[0]) settings.value.activeSchemeByScope[scopeKey] = enabledIds[0];
      else delete settings.value.activeSchemeByScope[scopeKey];
    }
  }

  function upsertScheme(input: StatusDisplayScheme) {
    const scope = currentStatusScope();
    if (!scope) throw new Error('请先打开聊天再保存状态方案');
    const existing = settings.value.schemes.find(item => item.id === input.id);
    if (existing && !getVisibleSchemes(scope).some(item => item.id === input.id))
      throw new Error('此方案不属于当前聊天');
    const scheme = StatusDisplaySchemeSchema.parse({
      ...klona(input),
      ownerScopeKey: input.shared ? existing?.ownerScopeKey || scope : scope,
      updatedAt: new Date().toISOString(),
    });
    if (existing?.shared && !scheme.shared) restrictSchemeBindings(settings.value, scheme.id, scope);
    const index = settings.value.schemes.findIndex(item => item.id === scheme.id);
    if (index >= 0) settings.value.schemes[index] = scheme;
    else settings.value.schemes.push(scheme);
    return scheme;
  }

  function deleteScheme(schemeId: string) {
    settings.value.schemes = settings.value.schemes.filter(scheme => scheme.id !== schemeId);
    Object.entries(settings.value.enabledSchemeIdsByScope).forEach(([scopeKey, enabledIds]) => {
      settings.value.enabledSchemeIdsByScope[scopeKey] = enabledIds.filter(id => id !== schemeId);
    });
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
    migrateLegacy();
  }

  return {
    configError,
    deleteScheme,
    getActiveSchemeId,
    getEnabledSchemeIds,
    getVisibleSchemes,
    getBindingScopes: (schemeId: string) => getSchemeBindingScopes(settings.value, schemeId),
    rawConfig,
    rehydrateFromSettings,
    schemes,
    setActiveScheme,
    setEnabledSchemeIds,
    settings,
    upsertScheme,
  };
});
