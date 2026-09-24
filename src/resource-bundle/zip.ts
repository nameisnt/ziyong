import { validateBundle, encodeJson, type BundleManifest, type ExportRow } from './model';

export async function readBundle(file: File) {
  const { unzip } = await import('fflate');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const files = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    unzip(bytes, (error, data) => (error ? reject(error) : resolve(data)));
  });
  return validateBundle(files);
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
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/zip' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${manifest.name.replace(/[\\/:*?"<>|]/g, '_')}.组合包.zip`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
