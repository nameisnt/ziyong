import { useForumStore } from '@/store/forum';
import { usePromptStore } from '@/store/prompts';
import type { ForumBoard } from '@/type/forum';
import type { Ref } from 'vue';

export interface ForumBoardEditorDraft {
  name: string;
  typePrompt: string;
}

export function useForumBoardEditorSession(
  draft: ForumBoardEditorDraft,
  typeId: Ref<string>,
  options: {
    customBoardTypeId: string;
    getEditingBoard: () => ForumBoard | null;
    getEditingBoardId: () => string | undefined;
    navigateToBoard: (board: ForumBoard) => void;
  },
) {
  const forum = useForumStore();
  const prompts = usePromptStore();

  function getSelectedTypePrompt() {
    const prompt = prompts.getTypePrompt(typeId.value);
    return prompt?.domain === 'forum-board' ? prompt : null;
  }

  function selectType(promptId: string) {
    if (promptId === options.customBoardTypeId) {
      typeId.value = options.customBoardTypeId;
      draft.typePrompt = '';
      return;
    }
    const prompt = prompts.getTypePrompt(promptId);
    if (!prompt || prompt.domain !== 'forum-board') {
      typeId.value = options.customBoardTypeId;
      return;
    }
    typeId.value = prompt.id;
    draft.typePrompt = prompt.prompt;
    if (!draft.name.trim()) draft.name = prompt.name;
  }

  function markTypeCustom() {
    const selected = getSelectedTypePrompt();
    if (selected?.prompt.trim() === draft.typePrompt.trim()) return;
    typeId.value = options.customBoardTypeId;
  }

  function submit() {
    const selectedType = getSelectedTypePrompt();
    const input = {
      name: draft.name,
      typeId: selectedType?.id || '',
      typeName: selectedType?.name || (draft.typePrompt.trim() ? '自定义' : ''),
      typePrompt: draft.typePrompt,
    };
    const boardId = options.getEditingBoardId();
    const board = options.getEditingBoard() && boardId ? forum.updateBoard(boardId, input) : forum.createBoard(input);
    if (board) options.navigateToBoard(board);
  }

  return { markTypeCustom, selectType, submit };
}
