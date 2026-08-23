import { useForumStore } from '@/store/forum';
import { usePromptStore } from '@/store/prompts';
import { resolveForumBoardTypePrompt } from '@/type/forum';

export interface ForumThreadGenerationBoardDraft {
  boardId: string;
  boardName: string;
  boardTypeId: string;
  boardTypePrompt: string;
}

type Notice = Pick<typeof toastr, 'info' | 'success'>;

export function useForumThreadGenerationBoardSession(
  draft: ForumThreadGenerationBoardDraft,
  options: {
    customBoardTypeId: string;
    notify: Notice;
  },
) {
  const forum = useForumStore();
  const prompts = usePromptStore();

  function findBoardTypePrompt(promptId: string) {
    const prompt = prompts.getTypePrompt(promptId);
    return prompt?.domain === 'forum-board' ? prompt : null;
  }

  function selectBoardType(promptId: string) {
    if (promptId === options.customBoardTypeId) {
      draft.boardTypeId = options.customBoardTypeId;
      draft.boardTypePrompt = '';
      return;
    }
    const prompt = findBoardTypePrompt(promptId);
    if (!prompt) {
      draft.boardTypeId = options.customBoardTypeId;
      return;
    }
    draft.boardTypeId = prompt.id;
    draft.boardTypePrompt = prompt.prompt;
    draft.boardName = prompt.name;
  }

  function createAndSelectBoard() {
    const boardName = draft.boardName.trim();
    if (!boardName) return;
    const existing = forum.findBoardByName(boardName);
    if (existing) {
      draft.boardId = existing.id;
      draft.boardName = existing.name;
      draft.boardTypeId = existing.typeId || options.customBoardTypeId;
      draft.boardTypePrompt = resolveForumBoardTypePrompt(existing);
      options.notify.info(`已选择已有板块“${existing.name}”`);
      return;
    }
    const selectedType = findBoardTypePrompt(draft.boardTypeId);
    const board = forum.createBoard({
      name: boardName,
      typeId: selectedType?.id || '',
      typeName: selectedType?.name || (draft.boardTypePrompt.trim() ? '自定义' : ''),
      typePrompt: draft.boardTypePrompt,
    });
    draft.boardId = board.id;
    draft.boardName = board.name;
    options.notify.success(`已创建并选择板块“${board.name}”`);
  }

  return { createAndSelectBoard, selectBoardType };
}
