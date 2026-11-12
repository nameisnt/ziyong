import type { CharacterRef } from '@/type/diary';
import type { LetterEntry, LetterFormat } from '@/type/letter';

export interface LettersRecentContextOptions {
  count: number;
  rewriteEntryId?: string | null;
}

export function formatDirection(senderName: string, receiverName: string): string {
  return `${senderName} -> ${receiverName}`;
}

export function formatParticipants(participants: readonly CharacterRef[]): string {
  return participants.map(item => item.name).join('、') || '未指定参与者';
}

export function formatLabel(format: LetterFormat): string {
  if (format === 'sms') return '短信';
  if (format === 'email') return '邮件';
  if (format === 'note') return '便签';
  if (format === 'formal') return '正式信';
  return format.replace(/^custom:/, '') || '自定义书信';
}

export function clampRecentEntryCount(value: number): number {
  return Math.max(0, Math.min(20, Math.round(value || 0)));
}

function selectRecentEntries(entries: readonly LetterEntry[], rewriteEntryId: string | null): LetterEntry[] {
  if (!rewriteEntryId) return [...entries];
  const targetIndex = entries.findIndex(entry => entry.id === rewriteEntryId);
  return targetIndex >= 0
    ? entries.slice(targetIndex + 1)
    : entries.filter(entry => entry.id !== rewriteEntryId);
}

export function buildRecentLettersContext(
  entries: readonly LetterEntry[],
  options: LettersRecentContextOptions,
): string {
  const effectiveCount = clampRecentEntryCount(options.count);
  if (!effectiveCount) return '';
  const selected = selectRecentEntries(entries, options.rewriteEntryId ?? null)
    .slice(0, effectiveCount)
    .reverse();
  if (!selected.length) return '';
  const blocks = selected.map(entry =>
    [`${formatLabel(entry.format)} · ${entry.title}`, formatDirection(entry.sender.name, entry.receiver.name), entry.content].join('\n'),
  );
  return ['最近相关书信：', blocks.join('\n\n')].join('\n\n');
}
