import type { ForeshadowStatus, StorylineBeatStatus, StorylineKind, StorylineStatus } from './store';

export type StorylineItemKind = 'beat' | 'hook' | 'line';

export type StorylineEditorDraft = {
  beatStatus: StorylineBeatStatus;
  goal: string;
  hookStatus: ForeshadowStatus;
  itemKind: StorylineItemKind;
  lineId: string;
  lineKind: StorylineKind;
  lineStatus: StorylineStatus;
  order: number;
  payoff: string;
  relatedProfileIds: string[];
  seed: string;
  stakes: string;
  summary: string;
  tagsText: string;
  title: string;
};
