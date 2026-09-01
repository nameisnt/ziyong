import type { TavernChatRenamedEvent } from '@/util/chatScopeRename';

export const phoneChatRenameRequestHeader = 'x-sillytavern-phone-chat-rename';

type RenameHandler = (event: TavernChatRenamedEvent) => Promise<void> | void;

const handlers = new Set<RenameHandler>();
let originalFetch: typeof globalThis.fetch | null = null;
let observedFetch: typeof globalThis.fetch | null = null;

export function onTavernChatRename(handler: RenameHandler) {
  handlers.add(handler);
  installObserver();
  return {
    stop() {
      handlers.delete(handler);
      if (handlers.size) return;
      if (originalFetch && observedFetch && globalThis.fetch === observedFetch) globalThis.fetch = originalFetch;
      originalFetch = null;
      observedFetch = null;
    },
  };
}

function installObserver() {
  if (observedFetch) return;
  originalFetch = globalThis.fetch;
  observedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const fetchAtInstall = originalFetch;
    if (!fetchAtInstall) throw new Error('Fetch is unavailable');

    const isRenameRequest = requestPath(input) === '/api/chats/rename';
    const isPhoneRequest = requestHeaders(input, init).has(phoneChatRenameRequestHeader);
    const request = isRenameRequest && !isPhoneRequest ? await readRenameRequest(input, init) : null;
    const response = await fetchAtInstall(input, init);
    if (request && response.ok) await notifyRename(request, response);
    return response;
  };
  globalThis.fetch = observedFetch;
}

function requestPath(input: RequestInfo | URL) {
  const value = input instanceof Request ? input.url : String(input);
  try {
    return new URL(value, globalThis.location?.href || 'http://localhost').pathname;
  } catch {
    return '';
  }
}

function requestHeaders(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.headers) return new Headers(init.headers);
  return input instanceof Request ? new Headers(input.headers) : new Headers();
}

async function readRenameRequest(input: RequestInfo | URL, init?: RequestInit) {
  const body = init?.body ?? (input instanceof Request ? await input.clone().text() : '');
  if (typeof body !== 'string') return null;
  try {
    const record = JSON.parse(body) as Record<string, unknown>;
    const oldFileName = typeof record.original_file === 'string' ? record.original_file : '';
    const newFileName = typeof record.renamed_file === 'string' ? record.renamed_file : '';
    if (!oldFileName || !newFileName) return null;
    return {
      avatarId: typeof record.avatar_url === 'string' ? record.avatar_url : '',
      groupId: record.is_group === true ? currentGroupId() : undefined,
      newFileName,
      oldFileName,
    } satisfies TavernChatRenamedEvent;
  } catch {
    return null;
  }
}

async function notifyRename(request: TavernChatRenamedEvent, response: Response) {
  const result = (await response.clone().json().catch(() => null)) as Record<string, unknown> | null;
  if (result?.error) return;
  const sanitized = typeof result?.sanitizedFileName === 'string' ? result.sanitizedFileName.trim() : '';
  const event = {
    ...request,
    newFileName: sanitized || request.newFileName,
  } satisfies TavernChatRenamedEvent;
  for (const handler of [...handlers]) {
    try {
      await handler(event);
    } catch (error) {
      console.warn('[SillyTavern Phone] Failed to handle a native chat rename.', error);
    }
  }
}

function currentGroupId() {
  const runtime = (globalThis as typeof globalThis & {
    SillyTavern?: { getContext?: () => { groupId?: number | string | null } };
  }).SillyTavern;
  const groupId = runtime?.getContext?.()?.groupId;
  return groupId === null || typeof groupId === 'undefined' ? undefined : groupId;
}
