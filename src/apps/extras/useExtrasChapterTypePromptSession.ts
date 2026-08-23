import type { ExtraChapterGenerationIntent, ExtraChapterGenerationMode } from '@/core/extrasGeneration';
import { usePromptStore, type TypePromptConfig } from '@/store/prompts';

export interface ExtrasChapterGenerationDraft {
  fromStartEnd: number;
  generationIntent: ExtraChapterGenerationIntent;
  mode: ExtraChapterGenerationMode;
  rangeText: string;
  recentCount: number;
  singleMessageId: number;
  typeId: string;
  typeName: string;
  typePrompt: string;
  userRequirement: string;
}

const customChapterTypeValue = '__custom_chapter_type__';

export function useExtrasChapterTypePromptSession(draft: ExtrasChapterGenerationDraft) {
  const prompts = usePromptStore();
  const customTypeSelected = ref(false);
  const extraTypePrompts = computed(() => prompts.typePrompts.filter(item => item.domain === 'extras'));
  const typeOptions = computed(() => [
    { label: '自定义', value: customChapterTypeValue },
    ...[...extraTypePrompts.value]
      .sort((left, right) => right.usageCount - left.usageCount || left.name.localeCompare(right.name, 'zh-CN'))
      .map(item => ({ label: item.name, value: item.id })),
  ]);
  const selectedTypePrompt = computed(() => (draft.typeId ? prompts.getTypePrompt(draft.typeId) : null));
  const showCustomTypeField = computed(
    () => customTypeSelected.value || (!draft.typeId && Boolean(draft.typeName.trim())),
  );
  const selectedTypeValue = computed(() => (customTypeSelected.value ? customChapterTypeValue : draft.typeId));
  const currentTypePrompt = computed(() => draft.typePrompt.trim());

  function syncCustomSelectionFromDraft() {
    customTypeSelected.value = !draft.typeId && Boolean(draft.typeName.trim());
  }

  function findExtraTypePromptByName(name: string): TypePromptConfig | null {
    const normalizedName = name.trim().toLocaleLowerCase();
    return extraTypePrompts.value.find(item => item.name.trim().toLocaleLowerCase() === normalizedName) ?? null;
  }

  function selectPrompt(promptId: string) {
    const prompt = prompts.getTypePrompt(promptId);
    draft.typeId = promptId;
    customTypeSelected.value = false;
    if (prompt) {
      draft.typeName = prompt.name;
      draft.typePrompt = prompt.prompt;
    }
  }

  function selectCustomType() {
    draft.typeId = '';
    customTypeSelected.value = true;
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
    const name = draft.typeName.trim();
    const promptText = draft.typePrompt.trim();
    if (!name && !promptText) return null;
    if (draft.typeId) {
      const updated = prompts.updateTypePrompt(draft.typeId, {
        domain: 'extras',
        name: name || selectedTypePrompt.value?.name || '未分类番外',
        prompt: promptText,
      });
      if (!updated) return null;
      draft.typeName = updated.name;
      draft.typePrompt = updated.prompt;
      customTypeSelected.value = false;
      return updated;
    }
    const created = prompts.createTypePrompt({
      domain: 'extras',
      name: name || '未分类番外',
      prompt: promptText,
    });
    draft.typeId = created.id;
    draft.typeName = created.name;
    draft.typePrompt = created.prompt;
    customTypeSelected.value = false;
    return created;
  }

  return {
    currentTypePrompt,
    findExtraTypePromptByName,
    saveTypePrompt,
    selectedTypeValue,
    selectTypeValue,
    showCustomTypeField,
    syncCustomSelectionFromDraft,
    typeOptions,
  };
}
