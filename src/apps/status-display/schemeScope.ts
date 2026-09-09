import type { StatusDisplaySettings } from './store';

export function getVisibleStatusSchemes(settings: StatusDisplaySettings, scopeKey: string) {
  if (!scopeKey) return [];
  return settings.schemes.filter(
    scheme => scheme.ownerScopeKey && (scheme.shared || scheme.ownerScopeKey === scopeKey),
  );
}

export function getEnabledStatusSchemes(settings: StatusDisplaySettings, scopeKey: string) {
  const available = new Set(getVisibleStatusSchemes(settings, scopeKey).map(scheme => scheme.id));
  const configured = settings.enabledSchemeIdsByScope[scopeKey];
  if (configured) return configured.filter(id => available.has(id));
  const selected = settings.activeSchemeByScope[scopeKey];
  return selected && available.has(selected) ? [selected] : [];
}

export function getSchemeBindingScopes(settings: StatusDisplaySettings, schemeId: string) {
  return [
    ...new Set([...Object.keys(settings.activeSchemeByScope), ...Object.keys(settings.enabledSchemeIdsByScope)]),
  ].filter(
    scope =>
      settings.activeSchemeByScope[scope] === schemeId || settings.enabledSchemeIdsByScope[scope]?.includes(schemeId),
  );
}

export function migrateLegacySchemes(settings: StatusDisplaySettings, currentScopeKey: string) {
  const copies: Array<{ sourceId: string; targetId: string }> = [];
  if (!currentScopeKey) return copies;
  settings.schemes = settings.schemes.flatMap(scheme => {
    if (scheme.ownerScopeKey) return [scheme];
    const bindings = getSchemeBindingScopes(settings, scheme.id);
    const owners = bindings.length ? bindings : [currentScopeKey];
    return owners.map((ownerScopeKey, index) => {
      const id = index === 0 ? scheme.id : `${scheme.id}:private:${encodeURIComponent(ownerScopeKey)}`;
      if (index > 0) copies.push({ sourceId: scheme.id, targetId: id });
      if (settings.activeSchemeByScope[ownerScopeKey] === scheme.id) settings.activeSchemeByScope[ownerScopeKey] = id;
      const enabled = settings.enabledSchemeIdsByScope[ownerScopeKey];
      if (enabled)
        settings.enabledSchemeIdsByScope[ownerScopeKey] = enabled.map(item => (item === scheme.id ? id : item));
      return { ...scheme, id, ownerScopeKey, shared: false };
    });
  });
  return copies;
}

export function restrictSchemeBindings(settings: StatusDisplaySettings, schemeId: string, ownerScopeKey: string) {
  for (const scope of getSchemeBindingScopes(settings, schemeId)) {
    if (scope === ownerScopeKey) continue;
    const enabled = getEnabledStatusSchemes(settings, scope).filter(id => id !== schemeId);
    settings.enabledSchemeIdsByScope[scope] = enabled;
    if (settings.activeSchemeByScope[scope] === schemeId) {
      if (enabled[0]) settings.activeSchemeByScope[scope] = enabled[0];
      else delete settings.activeSchemeByScope[scope];
    }
  }
}
