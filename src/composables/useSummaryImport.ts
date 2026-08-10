import { regexDisplaySummaryTarget, useRegexDisplayStore } from '@/apps/regex-display/store';
import { usePhoneStore } from '@/store/phone';
import {
  defaultReaderBodyRule,
  normalizeArchivedMessage,
  type ChatReaderRegexRule,
  useReaderStore,
} from '@/store/reader';
import { useSummaryStore } from '@/store/summary';
import { transformReaderMessages } from '@/util/readerRegex';
import { getRegexRulesByOperation } from '@/util/regexDisplay';
import { getChatMessagesSafe } from '@/util/runtime';
import { storeToRefs } from 'pinia';

export function useSummaryImport() {
  const phone = usePhoneStore();
  const reader = useReaderStore();
  const regexDisplay = useRegexDisplayStore();
  const summary = useSummaryStore();
  const { settings: readerSettings } = storeToRefs(reader);
  const { rules: regexDisplayRules } = storeToRefs(regexDisplay);
  const { books } = storeToRefs(summary);

  const state = reactive({
    error: '',
    items: [] as Array<{ content: string; id: string; messageIndex: number }>,
    loading: false,
    ruleId: '__default_body__',
    selectedIds: [] as string[],
  });
  const targetBookId = ref('');

  const rules = computed(() => getRegexRulesByOperation(regexDisplayRules.value, 'extract'));
  const usage = computed(() => regexDisplay.getUsage(regexDisplaySummaryTarget));
  const targetBook = computed(() => (targetBookId.value ? summary.getBook(targetBookId.value) : null));
  const allSelected = computed(
    () => state.items.length > 0 && state.items.every(item => state.selectedIds.includes(item.id)),
  );

  function resolveRuleId() {
    const selectedId = usage.value.contentRuleId;
    return rules.value.some(rule => rule.id === selectedId) ? selectedId : '__default_body__';
  }

  function getRule(): ChatReaderRegexRule {
    if (state.ruleId === '__default_body__') return defaultReaderBodyRule;
    const rule = rules.value.find(item => item.id === state.ruleId);
    if (!rule) return defaultReaderBodyRule;
    return {
      find: rule.pattern,
      flags: rule.flags,
      replace: rule.replacement,
    };
  }

  async function reload() {
    state.error = '';
    state.loading = true;
    try {
      const sourceMessages = getChatMessagesSafe('0-{{lastMessageId}}')
        .map((item, index) =>
          normalizeArchivedMessage(item, index, {
            ...readerSettings.value,
            showUserMessages: true,
          }),
        )
        .filter(
          (item): item is NonNullable<ReturnType<typeof normalizeArchivedMessage>> =>
            Boolean(item) && !item.isUser && (readerSettings.value.showHiddenAssistantMessages || !item.isHidden),
        );
      const transformed = await transformReaderMessages(
        sourceMessages.map(item => ({ messageIndex: item.messageIndex, rawText: item.rawText })),
        { find: '', flags: '', replace: '' },
        getRule(),
      );
      state.items = sourceMessages
        .map((item, index) => ({
          content: transformed[index]?.body.trim() || '',
          id: item.id,
          messageIndex: item.messageIndex,
        }))
        .filter(item => Boolean(item.content));
      state.selectedIds = state.items.map(item => item.id);
    } catch (error) {
      state.items = [];
      state.selectedIds = [];
      state.error = error instanceof Error ? error.message : '读取当前聊天失败';
    } finally {
      state.loading = false;
    }
  }

  function reset(bookId = '') {
    targetBookId.value = bookId || books.value[0]?.id || '';
    state.ruleId = resolveRuleId();
    state.error = '';
    state.items = [];
    state.selectedIds = [];
    void reload();
  }

  function setRule(ruleId: string) {
    state.ruleId = ruleId;
    regexDisplay.setExtractionRule(
      regexDisplaySummaryTarget,
      'content',
      ruleId === '__default_body__' ? '' : ruleId,
    );
    void reload();
  }

  function toggleItem(itemId: string, checked: boolean) {
    state.selectedIds = checked
      ? [...new Set([...state.selectedIds, itemId])]
      : state.selectedIds.filter(id => id !== itemId);
  }

  function toggleAll() {
    state.selectedIds = allSelected.value ? [] : state.items.map(item => item.id);
  }

  function importEntries() {
    const book = targetBook.value;
    if (!book) return;
    const selected = state.items.filter(item => state.selectedIds.includes(item.id));
    if (!selected.length) return;
    selected.forEach(item => {
      summary.createEntry(book.id, {
        content: item.content,
        directoryOrder: item.messageIndex,
        rangeLabel: `第 ${item.messageIndex} 楼`,
        sourceFloorEnd: item.messageIndex,
        title: `第 ${item.messageIndex} 楼总结`,
      });
    });
    toastr.success(`已导入 ${selected.length} 条总结`);
    phone.replacePage('book', book.title, { bookId: book.id });
  }

  return {
    allSelected,
    importEntries,
    reload,
    reset,
    rules,
    setRule,
    state,
    targetBook,
    targetBookId,
    toggleAll,
    toggleItem,
  };
}
