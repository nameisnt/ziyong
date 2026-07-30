import {
  createDiaryGenerationAdapter,
  createDiaryReadReactionGenerationAdapter,
} from '@/core/diaryGeneration';
import {
  createExtraChapterGenerationAdapter,
  createExtraSummaryGenerationAdapter,
} from '@/core/extrasGeneration';
import {
  createForumReplyGenerationAdapter,
  createForumThreadGenerationAdapter,
} from '@/core/forumGeneration';
import { createLettersGenerationAdapter } from '@/core/lettersGeneration';
import { createSummaryGenerationAdapter } from '@/core/summaryGeneration';
import { createTheaterGenerationAdapter } from '@/core/theaterGeneration';
import type { PhoneGenerationAction } from '@/core/appRegistry';
import { useDiaryStore } from '@/store/diary';
import { useExtrasStore } from '@/store/extras';
import { useForumStore } from '@/store/forum';
import { useLettersStore } from '@/store/letters';
import { useSummaryStore } from '@/store/summary';
import { useTheaterStore } from '@/store/theater';

export function createSummaryGenerationActions(): PhoneGenerationAction[] {
  return [
    {
      actionId: 'generate',
      label: '生成总结',
      createAdapter: () => createSummaryGenerationAdapter(useSummaryStore()),
    },
  ];
}

export function createDiaryGenerationActions(): PhoneGenerationAction[] {
  return [
    {
      actionId: 'generate',
      label: '生成日记',
      createAdapter: () => createDiaryGenerationAdapter(useDiaryStore()),
    },
    {
      actionId: 'read-reaction',
      label: '生成日记阅读反应',
      createAdapter: () => createDiaryReadReactionGenerationAdapter(useDiaryStore()),
    },
  ];
}

export function createExtrasGenerationActions(): PhoneGenerationAction[] {
  return [
    {
      actionId: 'chapter-generate',
      label: '生成番外章节',
      createAdapter: () => createExtraChapterGenerationAdapter(useExtrasStore()),
    },
    {
      actionId: 'chapter-summary',
      label: '生成章节总结',
      createAdapter: () => createExtraSummaryGenerationAdapter(useExtrasStore()),
    },
  ];
}

export function createForumGenerationActions(): PhoneGenerationAction[] {
  return [
    {
      actionId: 'generate-thread',
      label: '生成论坛帖子',
      createAdapter: () => createForumThreadGenerationAdapter(useForumStore()),
    },
    {
      actionId: 'generate-replies',
      label: '生成论坛回复',
      createAdapter: () => createForumReplyGenerationAdapter(useForumStore()),
    },
  ];
}

export function createTheaterGenerationActions(): PhoneGenerationAction[] {
  return [
    {
      actionId: 'generate',
      label: '生成小剧场',
      createAdapter: () => createTheaterGenerationAdapter(useTheaterStore()),
    },
  ];
}

export function createLettersGenerationActions(): PhoneGenerationAction[] {
  return [
    {
      actionId: 'generate',
      label: '生成书信',
      createAdapter: () => createLettersGenerationAdapter(useLettersStore()),
    },
  ];
}
