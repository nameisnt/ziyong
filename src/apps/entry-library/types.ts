export type EntryLibrarySourceEntry = {
  content: string;
  key: string;
  role?: 'assistant' | 'system' | 'user';
  sourceEntryId: string;
  title: string;
};

export type EntryLibraryBindingPromptOption = {
  bound: boolean;
  content: string;
  id: string;
  key: string;
  source: 'prompts' | 'prompts_unused';
  title: string;
};
