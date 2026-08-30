import {
  getRegisteredPhoneArchiveProviders,
  type PhoneArchiveDomain,
  type PhoneArchiveItem,
} from '@/core/appRegistry';
import {
  getCurrentChatScopeKey,
  getLegacyNoChatScopeKeys,
  isPlaceholderChatScopeKey,
  normalizeChatScopeId,
  readChatScopedEnvelope,
} from '@/store/chatScoped';

export interface ChatScopeRef {
  kind: 'char' | 'group' | 'unknown';
  ownerId: string;
  chatId: string;
  scopeKey: string;
}

export type ChatArchiveItem = PhoneArchiveItem;
export type ChatArchiveDomain = PhoneArchiveDomain;

function getArchiveProviders() {
  return getRegisteredPhoneArchiveProviders();
}

export function normalizeChatArchiveId(value: string) {
  return normalizeChatScopeId(value);
}

export function parseChatScopeKey(scopeKey: string): ChatScopeRef {
  const marker = ':chat:';
  const index = scopeKey.lastIndexOf(marker);
  if (index < 0) {
    return {
      chatId: '',
      kind: 'unknown',
      ownerId: scopeKey,
      scopeKey,
    };
  }
  const owner = scopeKey.slice(0, index);
  const separator = owner.indexOf(':');
  const kind = owner.slice(0, separator);
  return {
    chatId: normalizeChatArchiveId(scopeKey.slice(index + marker.length)),
    kind: kind === 'char' || kind === 'group' ? kind : 'unknown',
    ownerId: separator >= 0 ? owner.slice(separator + 1) : owner,
    scopeKey,
  };
}

export function buildChatScopeKey(kind: 'char' | 'group', ownerId: string, chatId: string) {
  return `${kind}:${ownerId}:chat:${normalizeChatArchiveId(chatId)}`;
}

export function getUsedChatArchiveScopes() {
  return createChatArchiveDomainReader().getUsedScopes();
}

export function createChatArchiveDomainReader() {
  const currentScopeKey = getCurrentChatScopeKey();
  const snapshots = getArchiveProviders().map(provider => ({
    envelope: readChatScopedEnvelope(provider.field, currentScopeKey),
    provider,
  }));
  const domainCache = new Map<string, ChatArchiveDomain[]>();

  const collectDomains = (scopeKey: string) =>
    snapshots
      .map(({ envelope, provider }) => provider.collect(envelope.scopes[scopeKey], { currentScopeKey, scopeKey }))
      .filter(domain => domain.collections || domain.items);

  const getDomains = (scopeKey: string) => {
    const cached = domainCache.get(scopeKey);
    if (cached) return cached;

    const exactDomains = collectDomains(scopeKey);
    const domains =
      exactDomains.length || scopeKey !== currentScopeKey || isPlaceholderChatScopeKey(scopeKey)
        ? exactDomains
        : mergeChatArchiveDomains(
            getLegacyNoChatScopeKeys(scopeKey).flatMap(legacyScopeKey => collectDomains(legacyScopeKey)),
          );
    domainCache.set(scopeKey, domains);
    return domains;
  };

  const getUsedScopes = () => {
    const used = new Map<string, ChatScopeRef>();
    snapshots.forEach(({ envelope, provider }) => {
      Object.entries(envelope.scopes).forEach(([scopeKey, raw]) => {
        const domain = provider.collect(raw, { currentScopeKey, scopeKey });
        if (domain.collections || domain.items) {
          used.set(scopeKey, parseChatScopeKey(scopeKey));
        }
      });
    });
    return [...used.values()].filter(scope => scope.chatId);
  };

  return {
    getDomains,
    getUsedScopes,
  };
}

export function getChatArchiveDomains(scopeKey: string) {
  return createChatArchiveDomainReader().getDomains(scopeKey);
}

function mergeChatArchiveDomains(domains: ChatArchiveDomain[]) {
  const merged = new Map<string, ChatArchiveDomain>();
  domains.forEach(domain => {
    const previous = merged.get(domain.appId);
    if (!previous) {
      merged.set(domain.appId, {
        ...domain,
        entries: [...domain.entries],
      });
      return;
    }
    previous.collections += domain.collections;
    previous.entries = [...previous.entries, ...domain.entries];
    previous.items = previous.entries.length;
  });
  return [...merged.values()].filter(domain => domain.collections || domain.items);
}
