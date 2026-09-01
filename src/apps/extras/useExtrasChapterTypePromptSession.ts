import type { ExtraChapterGenerationIntent, ExtraChapterGenerationMode } from '@/core/extrasGeneration';
import { usePromptStore, type TypePromptConfig } from '@/store/prompts';

export interface ExtrasChapterGenerationDraft {
  fromStartEnd: number;
  generationIntent: ExtraChapterGenerationIntent;
  mode: ExtraChapterGenerationMode;
  rangeText: string;
  recentCount: number;
  singleMessageId: number;
  typeGroupId: string;
  typeId: string;
  typeName: string;
  typePrompt: string;
  userRequirement: string;
}

const customChapterTypeValue = '__custom_chapter_type__';

export function useExtrasChapterTypePromptSession(draft: ExtrasChapterGenerationDraft) {
  const prompts = usePromptStore();
  const customTypeSelected = ref(false);
  const saveCustomTypeToLibrary = ref(false);
  const extraTypePrompts = computed(() => prompts.typePrompts.filter(item => item.domain === 'extras'));
  const extraTypePromptGroups = computed(() => prompts.typePromptGroups.filter(item => item.domain === 'extras'));
  const typeOptions = computed(() => [
    { group: '新建', label: '+ 自定义', value: customChapterTypeValue },
    ...[...extraTypePrompts.value]
      .sort((left, right) => right.usageCount - left.usageCount || left.name.localeCompare(right.name, 'zh-CN'))
      .map(item => ({
        group: extraTypePromptGroups.value.find(group => group.id === item.groupId)?.name || '未分组',
        label: item.name,
        value: item.id,
      })),
  ]);
  const selectedTypePrompt = computed(() => (draft.typeId ? prompts.getTypePrompt(draft.typeId) : null));
  const showCustomTypeField = computed(
    () => customTypeSelected.value || (!draft.typeId && Boolean(draft.typeName.trim())),
  );
  const selectedTypeValue = computed(() => (customTypeSelected.value ? customChapterTypeValue : draft.typeId));
  const currentTypePrompt = computed(() => draft.typePrompt.trim());
  const typePromptChanged = computed(() => {
    const selected = selectedTypePrompt.value;
    return Boolean(
      selected &&
      (draft.typePrompt.trim() !== selected.prompt.trim() || draft.typeGroupId !== (selected.groupId || '')),
    );
  });
  const customTypeNameConflict = computed(() => {
    if (!customTypeSelected.value) return null;
    const normalizedName = draft.typeName.trim().toLocaleLowerCase();
    if (!normalizedName) return null;
    return extraTypePrompts.value.find(item => item.name.trim().toLocaleLowerCase() === normalizedName) ?? null;
  });
  const typeBlockingMessage = computed(() => {
    if (!customTypeSelected.value || !saveCustomTypeToLibrary.value) return '';
    if (!draft.typeName.trim()) return '填写类型名称后才能保存为新类型。';
    if (customTypeNameConflict.value) {
      return `类型库中已有“${customTypeNameConflict.value.name}”，请直接选择它或更换名称。`;
    }
    return '';
  });

  function syncCustomSelectionFromDraft() {
    customTypeSelected.value = !draft.typeId && Boolean(draft.typeName.trim());
    saveCustomTypeToLibrary.value = false;
  }

  function findExtraTypePromptByName(name: string): TypePromptConfig | null {
    const normalizedName = name.trim().toLocaleLowerCase();
    return extraTypePrompts.value.find(item => item.name.trim().toLocaleLowerCase() === normalizedName) ?? null;
  }

  function selectPrompt(promptId: string) {
    const prompt = prompts.getTypePrompt(promptId);
    draft.typeId = promptId;
    customTypeSelected.value = false;
    saveCustomTypeToLibrary.value = false;
    if (prompt) {
      draft.typeName = prompt.name;
      draft.typePrompt = prompt.prompt;
      draft.typeGroupId = prompt.groupId || '';
    }
  }

  function selectCustomType() {
    draft.typeId = '';
    customTypeSelected.value = true;
    saveCustomTypeToLibrary.value = true;
    draft.typeGroupId = '';
    draft.typeName = '';
    draft.typePrompt = '';
  }

  function selectTypeValue(value: string) {
    if (value === customChapterTypeValue) {
      selectCustomType();
      return;
    }
    if (value) selectPrompt(value);
  }

  function saveTypePrompt() {
    if (draft.typeId) return selectedTypePrompt.value;
    if (!customTypeSelected.value || !saveCustomTypeToLibrary.value) return null;
    if (typeBlockingMessage.value) return null;
    const created = prompts.createTypePrompt({
      domain: 'extras',
      groupId: draft.typeGroupId,
      name: draft.typeName,
      prompt: draft.typePrompt,
    });
    draft.typeId = created.id;
    draft.typeName = created.name;
    draft.typePrompt = created.prompt;
    customTypeSelected.value = false;
    saveCustomTypeToLibrary.value = false;
    return created;
  }

  function saveExistingTypePrompt() {
    const selected = selectedTypePrompt.value;
    if (!selected || !typePromptChanged.value) return null;
    const updated = prompts.updateTypePrompt(selected.id, {
      domain: 'extras',
      groupId: draft.typeGroupId,
      name: selected.name,
      prompt: draft.typePrompt,
    });
    if (!updated) return null;
    draft.typePrompt = updated.prompt;
    return updated;
  }

  return {
    currentTypePrompt,
    findExtraTypePromptByName,
    saveCustomTypeToLibrary,
    saveExistingTypePrompt,
    saveTypePrompt,
    selectedTypeValue,
    selectTypeValue,
    showCustomTypeField,
    syncCustomSelectionFromDraft,
    typeBlockingMessage,
    typeOptions,
    typePromptChanged,
  };
}
