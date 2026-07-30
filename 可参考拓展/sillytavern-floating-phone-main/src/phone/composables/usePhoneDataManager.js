export const PHONE_DATA_EXPORT_VERSION = 1;

export function collectPhoneData() {
  const local = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key) continue;
    local[key] = localStorage.getItem(key);
  }
  return {
    version: PHONE_DATA_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    localStorage: local,
  };
}

export function exportPhoneDataFile() {
  const data = collectPhoneData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `phone-data-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function importPhoneDataText(text) {
  const parsed = JSON.parse(text);
  const data = parsed?.localStorage && typeof parsed.localStorage === 'object' ? parsed.localStorage : parsed;
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('导入文件格式不正确');
  localStorage.clear();
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'string') localStorage.setItem(key, value);
    else localStorage.setItem(key, JSON.stringify(value));
  });
}

export function clearPhoneData() {
  localStorage.clear();
}
