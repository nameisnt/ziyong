import type { ForeshadowStatus, StorylineBeatStatus, StorylineKind, StorylineStatus } from './store';
import type { ExternalProfileReferenceDraft } from '@/apps/profiles/profileReferences';

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
  relatedProfiles: ExternalProfileReferenceDraft[];
  seed: string;
  stakes: string;
  summary: string;
  tagsText: string;
  title: string;
};
