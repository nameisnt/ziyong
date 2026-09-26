import { validateBundle, encodeJson, readTheme, type BundleManifest, type ExportRow, type JsonRecord } from './model';

export async function readBundle(file: File) {
  if (/\.json$/i.test(file.name)) {
    const theme = readTheme(JSON.parse(await file.text()));
    const manifest: BundleManifest = {
      format: 'phone-resource-bundle',
      version: 1,
      pluginVersion: 'native',
      kind: 'mixed',
      name: String(theme.name),
      items: [{ id: '0', kind: 'theme', name: String(theme.name), path: 'resources/0.json' }],
    };
    return validateBundle({ 'manifest.json': encodeJson(manifest), 'resources/0.json': encodeJson(theme) });
  }
  const { unzip } = await import('fflate');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const files = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    unzip(bytes, (error, data) => (error ? reject(error) : resolve(data)));
  });
  return validateBundle(files);
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name.replace(/[\\/:*?"<>|]/g, '_');
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function writeTheme(data: JsonRecord) {
  const theme = readTheme(data);
  download(new Blob([new Uint8Array(encodeJson(theme))], { type: 'application/json' }), `${String(theme.name)}.json`);
}

export async function writeBundle(manifest: BundleManifest, rows: ExportRow[], progress: (name: string) => void) {
  const files: Record<string, Uint8Array> = {};
  const items = [];
  const regexFiles = new Map<string, string>();
  for (const row of rows.filter(row => row.selected)) {
    progress(row.item.name);
    try {
      const bytes = await row.read();
      const item = { ...row.item };
      // Shared payloads keep distinct association records for each preset and the global catalog.
      const key = item.kind === 'regex' ? new TextDecoder().decode(bytes) : undefined;
      const sharedPath = key === undefined ? undefined : regexFiles.get(key);
      if (sharedPath) item.path = sharedPath;
      else {
        files[item.path] = bytes;
        if (key !== undefined) regexFiles.set(key, item.path);
      }
      items.push(item);
    } catch (error) {
      throw new Error(`${row.item.name}：${String(error)}`);
    }
  }
  const selectedManifest = { ...manifest, items };
  files['manifest.json'] = encodeJson(selectedManifest);
  validateBundle(files);
  const { zip } = await import('fflate');
  const bytes = await new Promise<Uint8Array>((resolve, reject) => {
    zip(files, { level: 6 }, (error, data) => (error ? reject(error) : resolve(data)));
  });
  download(new Blob([new Uint8Array(bytes)], { type: 'application/zip' }), `${manifest.name}.组合包.zip`);
}
