import { usePhoneStore } from '@/store/phone';
import type { ReaderMessage } from '@/store/reader';
import type { ReaderBodySourceRange } from '@/util/readerRegex';
import { findReaderTextOccurrences, type ReaderTextOccurrence } from '@/util/readerTextEdit';
import { setChatMessagesSafe } from '@/util/runtime';
import type { ComputedRef } from 'vue';

export function useReaderTextEditSession(options: {
  activeMessage: ComputedRef<ReaderMessage | null>;
  activeMessages: ComputedRef<ReaderMessage[]>;
  loadCurrentChat: (force?: boolean) => Promise<ReaderMessage[]>;
  replaceReaderBodyInRaw: (
    rawText: string,
    currentBody: string,
    nextBody: string,
    sourceRange?: ReaderBodySourceRange | null,
  ) => string | null;
  saveChatIfAvailable: () => Promise<void>;
}) {
  const phone = usePhoneStore();
  const readerTextEditOpen = ref(false);
  const readerSelectedText = ref('');
  const readerTextOccurrences = ref<ReaderTextOccurrence[]>([]);

  function getReaderSelectionText() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount !== 1 || selection.isCollapsed) return '';
    const content = document.querySelector('.pc-reader-detail-page .pc-reader-content');
    const range = selection.getRangeAt(0);
    const ancestor = range.commonAncestorContainer;
    const ancestorElement = ancestor.nodeType === Node.ELEMENT_NODE ? (ancestor as Element) : ancestor.parentElement;
    if (!content || !ancestorElement || !content.contains(ancestorElement)) return '';
    return selection.toString();
  }

  function deleteSelectedReaderText() {
    if (!options.activeMessage.value) return;
    if (!phone.isViewingCurrentChat) {
      toastr.warning('历史聊天只读，请先切回酒馆当前聊天再删除文字');
      return;
    }

    const message = options.activeMessage.value;
    const selectedText = getReaderSelectionText();
    if (!selectedText.trim()) {
      toastr.warning('请先在当前正文里选中要删除的文字');
      return;
    }

    const occurrences = findReaderTextOccurrences(message.sourceBody, selectedText);
    if (!occurrences.length) {
      toastr.error('这是显示替换结果，无法安全写回原文');
      return;
    }
    if (!message.bodySourceRange) {
      toastr.error('当前正文规则没有提供可验证的正文捕获范围，无法安全写回原楼层');
      return;
    }
    readerSelectedText.value = selectedText;
    readerTextOccurrences.value = occurrences;
    readerTextEditOpen.value = true;
  }

  function phoneScopeChanged(scopeKey: string, messageId: string) {
    return (
      !phone.isViewingCurrentChat ||
      phone.viewingScopeKey !== scopeKey ||
      options.activeMessage.value?.id !== messageId
    );
  }

  async function saveReaderSentenceEdit(payload: { occurrence: ReaderTextOccurrence; replacement: string }) {
    const message = options.activeMessage.value;
    if (!message || !phone.isViewingCurrentChat) return;
    const scopeKey = phone.viewingScopeKey;
    const selectedText = readerSelectedText.value;
    const occurrence = payload.occurrence;
    if (message.sourceBody.slice(occurrence.offset, occurrence.offset + selectedText.length) !== selectedText) {
      toastr.warning('正文在编辑期间已经变化，已停止写回');
      readerTextEditOpen.value = false;
      return;
    }
    const nextBody = `${message.sourceBody.slice(0, occurrence.sentenceStart)}${payload.replacement}${message.sourceBody.slice(
      occurrence.sentenceEnd,
    )}`;
    const nextRawText = options.replaceReaderBodyInRaw(
      message.rawText,
      message.sourceBody,
      nextBody,
      message.bodySourceRange,
    );
    if (nextRawText === null) {
      toastr.error('正文捕获范围已经变化，无法安全写回原楼层');
      return;
    }
    if (phoneScopeChanged(scopeKey, message.id)) {
      toastr.warning('当前聊天或楼层已经变化，已取消写回');
      return;
    }

    const messageId = message.id;
    await setChatMessagesSafe([{ message_id: message.sourceMessageId, message: nextRawText }], {
      refresh: 'affected',
    });
    await options.saveChatIfAvailable();
    readerTextEditOpen.value = false;
    window.getSelection()?.removeAllRanges();
    await options.loadCurrentChat(true);
    const updatedMessage = options.activeMessages.value.find(item => item.id === messageId);
    if (updatedMessage) phone.replacePage('detail', updatedMessage.title, { messageId });
    toastr.success('已精确更新原聊天楼层正文');
  }

  return {
    deleteSelectedReaderText,
    readerSelectedText,
    readerTextEditOpen,
    readerTextOccurrences,
    saveReaderSentenceEdit,
  };
}
