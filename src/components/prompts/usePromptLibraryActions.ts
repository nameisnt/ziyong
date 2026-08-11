import { usePromptStore } from '@/store/prompts';

type ConfirmNotice = (message: string, options: { confirmLabel: string; kind: 'warning' }) => Promise<boolean>;

type Notice = Pick<typeof toastr, 'success'>;

export function usePromptLibraryActions(options: {
  confirmNotice: ConfirmNotice;
  notify: Notice;
  onTypePromptDeleted?: (promptId: string) => void;
}) {
  const prompts = usePromptStore();

  async function removeTypePrompt(promptId: string) {
    const item = prompts.getTypePrompt(promptId);
    const shouldDelete = await options.confirmNotice(`要删除类型提示词“${item?.name || '未命名类型'}”吗？`, {
      confirmLabel: '删除',
      kind: 'warning',
    });
    if (!shouldDelete) return;
    prompts.deleteTypePrompt(promptId);
    options.onTypePromptDeleted?.(promptId);
    options.notify.success('已删除类型提示词');
  }

  async function removeQuickPhraseGroup(groupId: string) {
    const group = prompts.getQuickPhraseGroup(groupId);
    const shouldDelete = await options.confirmNotice(
      `要删除短语分组“${group?.name || '未命名分组'}”吗？组内短语也会一起删除。`,
      {
        confirmLabel: '删除',
        kind: 'warning',
      },
    );
    if (!shouldDelete) return;
    prompts.deleteQuickPhraseGroup(groupId);
    options.notify.success('已删除短语分组');
  }

  async function removeQuickPhrase(groupId: string, phraseId: string) {
    const group = prompts.getQuickPhraseGroup(groupId);
    const phrase = group?.phrases.find(item => item.id === phraseId) ?? null;
    const preview = phrase?.text.trim().slice(0, 18) || '这条短语';
    const shouldDelete = await options.confirmNotice(
      `要删除短语“${preview}${phrase?.text.length && phrase.text.length > 18 ? '...' : ''}”吗？`,
      {
        confirmLabel: '删除',
        kind: 'warning',
      },
    );
    if (!shouldDelete) return;
    prompts.deleteQuickPhrase(groupId, phraseId);
    options.notify.success('已删除快速短语');
  }

  async function removeQuickTemplateGroup(groupId: string) {
    const group = prompts.getQuickTemplateGroup(groupId);
    const shouldDelete = await options.confirmNotice(
      `要删除模板分组“${group?.name || '未命名分组'}”吗？组内模板也会一起删除。`,
      {
        confirmLabel: '删除',
        kind: 'warning',
      },
    );
    if (!shouldDelete) return;
    prompts.deleteQuickTemplateGroup(groupId);
    options.notify.success('已删除模板分组');
  }

  async function removeQuickTemplate(groupId: string, phraseId: string) {
    const group = prompts.getQuickTemplateGroup(groupId);
    const template = group?.phrases.find(item => item.id === phraseId) ?? null;
    const preview = template?.text.trim().slice(0, 18) || '这个模板';
    const shouldDelete = await options.confirmNotice(
      `要删除模板“${preview}${template?.text.length && template.text.length > 18 ? '...' : ''}”吗？`,
      {
        confirmLabel: '删除',
        kind: 'warning',
      },
    );
    if (!shouldDelete) return;
    prompts.deleteQuickTemplate(groupId, phraseId);
    options.notify.success('已删除模板');
  }

  return {
    removeQuickPhrase,
    removeQuickPhraseGroup,
    removeQuickTemplate,
    removeQuickTemplateGroup,
    removeTypePrompt,
  };
}
