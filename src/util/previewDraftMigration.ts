interface PreviewDraftRecord {
  appId?: unknown;
  createdAt?: unknown;
  id?: unknown;
  page?: unknown;
  [key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function legacyDraftId(draft: PreviewDraftRecord, index: number) {
  const appId = typeof draft.appId === 'string' ? draft.appId : 'unknown-app';
  const page = typeof draft.page === 'string' ? draft.page : 'unknown-page';
  const createdAt = typeof draft.createdAt === 'string' ? draft.createdAt : 'unknown-time';
  return `legacy:${encodeURIComponent(appId)}:${encodeURIComponent(page)}:${encodeURIComponent(createdAt)}:${index}`;
}

/** Converts one persisted preview-draft scope to the current representation without dropping content. */
export function migratePreviewDraftScopeData(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;
  const version = raw.schemaVersion;
  if (version === 3) return raw;
  if (typeof version !== 'undefined' && version !== 1 && version !== 2) return raw;
  if (!Array.isArray(raw.drafts)) return raw;

  return {
    ...raw,
    schemaVersion: 3,
    drafts: raw.drafts.map((draft, index) => {
      if (!isRecord(draft)) return draft;
      return {
        ...draft,
        id: typeof draft.id === 'string' && draft.id.trim() ? draft.id : legacyDraftId(draft, index),
        rawOutputSemantics: draft.rawOutputSemantics ?? 'legacy-unknown',
      };
    }),
  };
}

/** Converts every supported legacy preview-drafts backup payload to the current format. */
export function migratePreviewDraftsBackupData(raw: unknown, fromVersion: number): unknown {
  if (fromVersion !== 1 && fromVersion !== 2) throw new Error(`不支持从 preview-drafts v${fromVersion} 迁移`);
  if (!isRecord(raw) || !isRecord(raw.scopes)) return raw;

  return {
    ...raw,
    scopes: Object.fromEntries(
      Object.entries(raw.scopes).map(([scopeKey, scopeData]) => [scopeKey, migratePreviewDraftScopeData(scopeData)]),
    ),
  };
}

/** Normalizes an already-current envelope too, so exports never emit a legacy scope after hydration is delayed. */
export function normalizePreviewDraftsEnvelope(raw: unknown): unknown {
  if (!isRecord(raw) || !isRecord(raw.scopes)) return raw;
  return {
    ...raw,
    scopes: Object.fromEntries(
      Object.entries(raw.scopes).map(([scopeKey, scopeData]) => [scopeKey, migratePreviewDraftScopeData(scopeData)]),
    ),
  };
}
