import {
  getRegisteredPhoneArchiveProviders,
  type PhoneArchiveDomain,
  type PhoneArchiveItem,
  type PhoneArchiveProvider,
} from '@/core/appRegistry';
import { diaryField } from '@/store/diary';
import { extrasField } from '@/store/extras';
import { forumField } from '@/store/forum';
import { lettersField } from '@/store/letters';
import {
  getCurrentChatScopeKey,
  getLegacyNoChatScopeKeys,
  isPlaceholderChatScopeKey,
  normalizeChatScopeId,
  readChatScopedEnvelope,
} from '@/store/chatScoped';
import { summaryField } from '@/store/summary';
import { theaterField } from '@/store/theater';
import { DiaryScopeDataSchema } from '@/type/diary';
import { ExtraScopeDataSchema } from '@/type/extra';
import { ForumScopeDataSchema } from '@/type/forum';
import { LettersScopeDataSchema } from '@/type/letter';
import { SummaryScopeDataSchema } from '@/type/summary';
import { TheaterScopeDataSchema } from '@/type/theater';

export interface ChatScopeRef {
  kind: 'char' | 'group' | 'unknown';
  ownerId: string;
  chatId: string;
  scopeKey: string;
}

export type ChatArchiveItem = PhoneArchiveItem;
export type ChatArchiveDomain = PhoneArchiveDomain;

const legacyArchiveProviders: PhoneArchiveProvider[] = [
  {
    appId: 'summary',
    label: '总结',
    collectionLabel: '总结集',
    itemLabel: '总结',
    field: summaryField,
    collect(raw: unknown): ChatArchiveDomain {
      const data = SummaryScopeDataSchema.safeParse(raw).success ? SummaryScopeDataSchema.parse(raw) : SummaryScopeDataSchema.parse({});
      const entries = data.books.flatMap(book => book.entries.map(entry => ({
        id: entry.id,
        title: entry.title,
        subtitle: `${book.title} · ${entry.rangeLabel}`,
      })));
      return makeDomain('summary', '总结', '总结集', '总结', data.books.length, entries);
    },
  },
  {
    appId: 'diary',
    label: '日记',
    collectionLabel: '日记本',
    itemLabel: '篇',
    field: diaryField,
    collect(raw: unknown): ChatArchiveDomain {
      const data = DiaryScopeDataSchema.safeParse(raw).success ? DiaryScopeDataSchema.parse(raw) : DiaryScopeDataSchema.parse({});
      const entries = data.books.flatMap(book => book.entries.map(entry => ({
        id: entry.id,
        title: entry.title,
        subtitle: `${book.title}${entry.occurredAt ? ` · ${entry.occurredAt}` : ''}`,
      })));
      return makeDomain('diary', '日记', '日记本', '篇', data.books.length, entries);
    },
  },
  {
    appId: 'extras',
    label: '番外',
    collectionLabel: '书本',
    itemLabel: '章/总结',
    field: extrasField,
    collect(raw: unknown): ChatArchiveDomain {
      const data = ExtraScopeDataSchema.safeParse(raw).success ? ExtraScopeDataSchema.parse(raw) : ExtraScopeDataSchema.parse({});
      const entries = data.books.flatMap(book => [
        ...book.chapters.map(chapter => ({
          id: chapter.id,
          title: `第 ${chapter.chapterNumber} 章 · ${chapter.title}`,
          subtitle: book.title,
        })),
        ...book.summaries.map(summary => ({
          id: summary.id,
          title: '章节总结',
          subtitle: `${book.title} · ${summary.coveredChapterIds.length} 章`,
        })),
      ]);
      return makeDomain('extras', '番外', '书本', '章/总结', data.books.length, entries);
    },
  },
  {
    appId: 'forum',
    label: '论坛',
    collectionLabel: '板块',
    itemLabel: '帖/回复',
    field: forumField,
    collect(raw: unknown): ChatArchiveDomain {
      const data = ForumScopeDataSchema.safeParse(raw).success ? ForumScopeDataSchema.parse(raw) : ForumScopeDataSchema.parse({});
      const entries = data.boards.flatMap(board => board.threads.flatMap(thread => [
        {
          id: thread.id,
          title: thread.title,
          subtitle: `${board.name} · ${thread.author}`,
        },
        ...thread.replies.map(reply => ({
          id: reply.id,
          title: reply.content.slice(0, 32) || '回复',
          subtitle: `${board.name} · ${reply.author}`,
        })),
      ]));
      return makeDomain('forum', '论坛', '板块', '帖/回复', data.boards.length, entries);
    },
  },
  {
    appId: 'theater',
    label: '小剧场',
    collectionLabel: '合集',
    itemLabel: '篇',
    field: theaterField,
    collect(raw: unknown): ChatArchiveDomain {
      const data = TheaterScopeDataSchema.safeParse(raw).success ? TheaterScopeDataSchema.parse(raw) : TheaterScopeDataSchema.parse({});
      const entries = data.entries.map(entry => ({
        id: entry.id,
        title: entry.title,
        subtitle: `${entry.typeName} · ${entry.participants.map(item => item.name).join('、') || '未指定参与角色'}`,
      }));
      return makeDomain('theater', '小剧场', '合集', '篇', data.entries.length ? 1 : 0, entries);
    },
  },
  {
    appId: 'letters',
    label: '书信',
    collectionLabel: '信箱',
    itemLabel: '封',
    field: lettersField,
    collect(raw: unknown): ChatArchiveDomain {
      const data = LettersScopeDataSchema.safeParse(raw).success ? LettersScopeDataSchema.parse(raw) : LettersScopeDataSchema.parse({});
      const entries = data.books.flatMap(book => book.entries.map(entry => ({
        id: entry.id,
        title: entry.title,
        subtitle: `${book.title} · ${entry.sender.name} → ${entry.receiver.name}`,
      })));
      return makeDomain('letters', '书信', '信箱', '封', data.books.length, entries);
    },
  },
];

function getArchiveProviders() {
  return [...legacyArchiveProviders, ...getRegisteredPhoneArchiveProviders()];
}

function makeDomain(
  appId: string,
  label: string,
  collectionLabel: string,
  itemLabel: string,
  collections: number,
  entries: ChatArchiveItem[],
): ChatArchiveDomain {
  return {
    appId,
    label,
    collectionLabel,
    itemLabel,
    collections,
    entries,
    items: entries.length,
  };
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

  const collectDomains = (scopeKey: string) => snapshots
    .map(({ envelope, provider }) => provider.collect(envelope.scopes[scopeKey], { currentScopeKey, scopeKey }))
    .filter(domain => domain.collections || domain.items);

  const getDomains = (scopeKey: string) => {
    const cached = domainCache.get(scopeKey);
    if (cached) return cached;

    const exactDomains = collectDomains(scopeKey);
    const domains = exactDomains.length || scopeKey !== currentScopeKey || isPlaceholderChatScopeKey(scopeKey)
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
