import type { CardWriterDocument } from './store';
import type { PhoneReferenceBranchNode, PhoneReferenceLeafNode } from '@/core/appRegistry';
import { areChatScopeKeysEquivalent, getCurrentChatScopeKey, parseChatScopeKey } from '@/store/chatScoped';

type DocumentGroup = {
  documents: CardWriterDocument[];
  key: string;
  label: string;
};

export function formatCardWriterDocumentChat(document: CardWriterDocument) {
  if (!document.sourceScopeKey) return '来源未知（旧成品）';
  const scope = parseChatScopeKey(document.sourceScopeKey);
  const chatLabel = scope.chatId === '__no_chat__' ? '未关联聊天' : scope.chatId || '未命名聊天';
  return [document.sourceOwnerLabel, chatLabel].filter(Boolean).join(' / ');
}

export function isCardWriterDocumentFromScope(document: CardWriterDocument, scopeKey: string) {
  return Boolean(document.sourceScopeKey && scopeKey && areChatScopeKeysEquivalent(document.sourceScopeKey, scopeKey));
}

function createDocumentLeaf(document: CardWriterDocument, groupLabel: string): PhoneReferenceLeafNode {
  const id = `card-writer:${document.id}`;
  return {
    id,
    item: {
      content: document.content,
      id,
      sourcePath: ['写卡成品', groupLabel, document.taskLabel],
      timeLabel: document.taskLabel,
      title: document.title,
      updatedAt: document.updatedAt,
    },
    kind: 'leaf',
  };
}

export function createCardWriterReferenceTree(documents: CardWriterDocument[]): PhoneReferenceBranchNode {
  const currentScopeKey = getCurrentChatScopeKey();
  const grouped = new Map<string, DocumentGroup>();
  documents.forEach(document => {
    if (!document.content.trim()) return;
    const key = document.sourceScopeKey || '__unknown__';
    const existing = grouped.get(key);
    if (existing) {
      existing.documents.push(document);
      return;
    }
    grouped.set(key, {
      documents: [document],
      key,
      label: formatCardWriterDocumentChat(document),
    });
  });

  const groups = [...grouped.values()].sort((left, right) => {
    const leftCurrent = isCardWriterDocumentFromScope(left.documents[0], currentScopeKey);
    const rightCurrent = isCardWriterDocumentFromScope(right.documents[0], currentScopeKey);
    if (leftCurrent !== rightCurrent) return Number(rightCurrent) - Number(leftCurrent);
    if (left.key === '__unknown__') return 1;
    if (right.key === '__unknown__') return -1;
    return left.label.localeCompare(right.label, 'zh-CN');
  });

  return {
    children: groups.map(group => {
      const isCurrent = isCardWriterDocumentFromScope(group.documents[0], currentScopeKey);
      const label = isCurrent ? `当前 · ${group.label}` : group.label;
      return {
        children: group.documents.map(document => createDocumentLeaf(document, group.label)),
        id: `card-writer:source:${group.key}`,
        kind: 'branch' as const,
        label,
      };
    }),
    id: 'app:card-writer',
    kind: 'branch',
    label: '写卡成品',
  };
}
