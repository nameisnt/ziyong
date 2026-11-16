import { computed, ref, type ComputedRef, type Ref } from 'vue';

export interface TypeOrganizeItem {
  id: string;
}

export interface TypeOrganizeOptions {
  items: ComputedRef<TypeOrganizeItem[]> | Ref<TypeOrganizeItem[]>;
  moveToGroup: (promptIds: string[], groupId: string) => number;
  deletePrompt: (promptId: string) => void;
  confirm: (message: string, options: { confirmLabel: string; kind: 'warning' }) => Promise<boolean>;
  notifySuccess: (message: string) => void;
}

export function useTypeOrganize(options: TypeOrganizeOptions) {
  const typeOrganizeMode = ref(false);
  const selectedTypePromptIds = ref(new Set<string>());
  const typeOrganizeTargetGroupId = ref('');

  const selectedTypePromptCount = computed(() => selectedTypePromptIds.value.size);

  function resetSelection() {
    selectedTypePromptIds.value = new Set();
    typeOrganizeTargetGroupId.value = '';
  }

  function startTypeOrganize() {
    resetSelection();
    typeOrganizeMode.value = true;
  }

  function cancelTypeOrganize() {
    typeOrganizeMode.value = false;
    resetSelection();
  }

  function toggleTypePromptSelection(promptId: string) {
    if (!options.items.value.some(item => item.id === promptId)) return;
    const next = new Set(selectedTypePromptIds.value);
    if (next.has(promptId)) next.delete(promptId);
    else next.add(promptId);
    selectedTypePromptIds.value = next;
  }

  function selectAllTypePrompts() {
    selectedTypePromptIds.value = new Set(options.items.value.map(item => item.id));
  }

  function clearTypePromptSelection() {
    selectedTypePromptIds.value = new Set();
  }

  function isTypePromptGroupSelected(promptIds: string[]) {
    return Boolean(promptIds.length) && promptIds.every(promptId => selectedTypePromptIds.value.has(promptId));
  }

  function selectTypePromptGroup(promptIds: string[]) {
    const next = new Set(selectedTypePromptIds.value);
    const remove = isTypePromptGroupSelected(promptIds);
    promptIds.forEach(promptId => {
      if (remove) next.delete(promptId);
      else next.add(promptId);
    });
    selectedTypePromptIds.value = next;
  }

  function applyTypeGroupMove() {
    const movedCount = options.moveToGroup([...selectedTypePromptIds.value], typeOrganizeTargetGroupId.value);
    options.notifySuccess(movedCount ? `已移动 ${movedCount} 个小剧场类型` : '所选类型已在目标分组');
    cancelTypeOrganize();
  }

  async function removeSelectedTypePrompts() {
    const promptIds = [...selectedTypePromptIds.value];
    if (!promptIds.length) return;
    const confirmed = await options.confirm(`要删除所选 ${promptIds.length} 个小剧场类型吗？`, {
      confirmLabel: '删除所选',
      kind: 'warning',
    });
    if (!confirmed) return;
    promptIds.forEach(options.deletePrompt);
    cancelTypeOrganize();
    options.notifySuccess(`已删除 ${promptIds.length} 个小剧场类型`);
  }

  return {
    applyTypeGroupMove,
    cancelTypeOrganize,
    clearTypePromptSelection,
    isTypePromptGroupSelected,
    removeSelectedTypePrompts,
    selectAllTypePrompts,
    selectedTypePromptCount,
    selectedTypePromptIds,
    selectTypePromptGroup,
    startTypeOrganize,
    toggleTypePromptSelection,
    typeOrganizeMode,
    typeOrganizeTargetGroupId,
  };
}
