function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    headers: { 'content-type': 'application/json' },
    status,
  });
}

function decodeUpload(body: BodyInit | null | undefined) {
  const request = JSON.parse(String(body || '{}')) as { data?: string; name?: string };
  const binary = atob(request.data || '');
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return {
    name: String(request.name || ''),
    value: JSON.parse(new TextDecoder().decode(bytes)) as unknown,
  };
}

export function installMemoryFileService() {
  const files = new Map<string, unknown>();
  const failedReads = new Set<string>();

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
    if (url === '/api/files/upload') {
      const upload = decodeUpload(init?.body);
      const path = `user/files/${upload.name}`;
      files.set(path, upload.value);
      return jsonResponse({ path });
    }
    if (url === '/api/files/delete') {
      const request = JSON.parse(String(init?.body || '{}')) as { path?: string };
      files.delete(String(request.path || '').replace(/^\/+/, ''));
      return jsonResponse({ ok: true });
    }
    const path = url.replace(/^\/+/, '');
    if (failedReads.has(path)) return jsonResponse({ error: 'visual file read failure' }, 500);
    return files.has(path) ? jsonResponse(files.get(path)) : jsonResponse({ error: 'not found' }, 404);
  };

  return {
    failRead(path: string) {
      failedReads.add(path.replace(/^\/+/, ''));
    },
  };
}
