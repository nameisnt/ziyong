export const LEGACY_MVU_FAVORITES_STORAGE_KEY = 'sillytavern_phone_mvu_favorites';
export const LEGACY_MVU_HISTORY_STORAGE_KEY = 'sillytavern_phone_mvu_history';

function readLegacyRecord(readItem: (key: string) => string | null, key: string) {
  try {
    const raw = readItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function shouldImportLegacyMvuStorage(raw: unknown) {
  return typeof raw === 'undefined';
}

export function migrateLegacyMvuStorage(readItem: (key: string) => string | null) {
  return {
    favorites: readLegacyRecord(readItem, LEGACY_MVU_FAVORITES_STORAGE_KEY),
    history: readLegacyRecord(readItem, LEGACY_MVU_HISTORY_STORAGE_KEY),
    legacyLocalStorageImported: true,
    version: 1 as const,
  };
}
