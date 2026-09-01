const BaguApp = defineAsyncComponent(() => import('@/apps/bagu/BaguApp.vue'));
const ChatArchiveApp = defineAsyncComponent(() => import('@/apps/archive/ChatArchiveApp.vue'));
const DiaryApp = defineAsyncComponent(() => import('@/apps/diary/DiaryApp.vue'));
const ExtrasApp = defineAsyncComponent(() => import('@/apps/extras/ExtrasApp.vue'));
const FavoritesApp = defineAsyncComponent(() => import('@/apps/favorites/FavoritesApp.vue'));
const ForumApp = defineAsyncComponent(() => import('@/apps/forum/ForumApp.vue'));
const LettersApp = defineAsyncComponent(() => import('@/apps/letters/LettersApp.vue'));
const PromptsApp = defineAsyncComponent(() => import('@/apps/prompts/PromptsApp.vue'));
const ReaderApp = defineAsyncComponent(() => import('@/apps/reader/ReaderApp.vue'));
const SettingsApp = defineAsyncComponent(() => import('@/apps/settings/SettingsApp.vue'));
const StatsApp = defineAsyncComponent(() => import('@/apps/stats/StatsApp.vue'));
const SummaryApp = defineAsyncComponent(() => import('@/apps/summary/SummaryApp.vue'));
const TheaterApp = defineAsyncComponent(() => import('@/apps/theater/TheaterApp.vue'));
import WorkbenchModule from '@/apps/workbench';
import RecoveryModule from '@/apps/recovery';
import {
  createDiaryArchiveProvider,
  createExtrasArchiveProvider,
  createForumArchiveProvider,
  createLettersArchiveProvider,
  createSummaryArchiveProvider,
  createTheaterArchiveProvider,
} from '@/apps/builtinArchive';
import {
  createDiaryContentReceiver,
  createExtrasContentReceiver,
  createForumContentReceiver,
  createLettersContentReceiver,
  createSummaryContentReceiver,
  createTheaterContentReceiver,
} from '@/apps/contentReceivers';
import {
  createDiaryContentSources,
  createExtrasContentSources,
  createForumContentSources,
  createLettersContentSources,
  createReaderContentSources,
  createSummaryContentSources,
  createTheaterContentSources,
} from '@/apps/builtinContentSources';
import { definePhoneApp, type PhoneAppModule } from '@/core/appRegistry';
import {
  createDiaryBackupDomain,
  createExtrasBackupDomain,
  createForumBackupDomain,
  createGenerationTasksBackupDomain,
  createGenerationAliasesBackupDomain,
  createLettersBackupDomain,
  createPreviewDraftsBackupDomain,
  createSummaryBackupDomain,
  createTheaterBackupDomain,
} from '@/apps/builtinBackup';
import {
  createDiaryFavoriteItems,
  createExtrasFavoriteItems,
  createForumFavoriteItems,
  createLettersFavoriteItems,
  createReaderFavoriteItems,
  createSummaryFavoriteItems,
  createTheaterFavoriteItems,
} from '@/apps/builtinFavorites';
import {
  createDiaryContentStats,
  createExtrasContentStats,
  createForumContentStats,
  createLettersContentStats,
  createSummaryContentStats,
  createTheaterContentStats,
} from '@/apps/builtinStats';
import {
  createDiaryGenerationActions,
  createExtrasGenerationActions,
  createForumGenerationActions,
  createLettersGenerationActions,
  createSummaryGenerationActions,
  createTheaterGenerationActions,
} from '@/apps/builtinGeneration';
import {
  createDiaryPromptDefinition,
  createDiaryReactionPromptDefinition,
  createDiaryTaskTemplateDefinitions,
  createExtrasContinuePromptDefinition,
  createExtrasPromptDefinition,
  createExtrasTypePromptDomain,
  createExtrasTaskTemplateDefinitions,
  createExtraSummaryPromptDefinition,
  createForumBoardTypePromptDomain,
  createForumPromptDefinition,
  createForumReplyPromptDefinition,
  createForumTaskTemplateDefinitions,
  createLettersPromptDefinition,
  createLettersTaskTemplateDefinitions,
  createSummaryPromptDefinition,
  createSummaryTaskTemplateDefinitions,
  createTheaterPromptDefinition,
  createTheaterTypePromptDomain,
  createTheaterTaskTemplateDefinitions,
} from '@/apps/builtinPrompts';
import {
  createDiaryReferenceTree,
  createExtrasReferenceTree,
  createForumReferenceTree,
  createLettersReferenceTree,
  createSummaryReferenceTree,
  createTheaterReferenceTree,
} from '@/apps/builtinReferences';
import { useDiaryStore } from '@/store/diary';
import { useExtrasStore } from '@/store/extras';
import { useForumStore } from '@/store/forum';
import { useGenerationAliasesStore } from '@/store/generationAliases';
import { useLettersStore } from '@/store/letters';
import { useSummaryStore } from '@/store/summary';
import { useTheaterStore } from '@/store/theater';
import {
  diaryItemTransferProvider,
  extrasItemTransferProvider,
  forumItemTransferProvider,
  lettersItemTransferProvider,
  summaryItemTransferProvider,
  theaterItemTransferProvider,
} from '@/item-transfer/providers';

function createFailedDraftRecoveryProvider(
  appId: string,
  getStore: () => { failedDrafts: Array<{ context: Record<string, unknown>; id: string }>; scopeKey: string },
) {
  return (scopeKey: string) => {
    const store = getStore();
    if (store.scopeKey !== scopeKey) return [];
    return store.failedDrafts.map(draft => ({
      appId,
      id: draft.id,
      kind: 'failed-draft' as const,
      routePage: 'failed-draft',
      routeParams: { draftId: draft.id },
      scopeKey,
      title: typeof draft.context.title === 'string' && draft.context.title.trim() ? draft.context.title : '待修复生成草稿',
    }));
  };
}

export const BUILTIN_PHONE_APP_MODULES: PhoneAppModule[] = [
  definePhoneApp({
    id: 'summary',
    name: '总结',
    icon: 'fa-note-sticky',
    description: '聊天总结与阶段回顾',
    accent: '#ff6b6b',
    defaultRoute: 'root',
    defaultOrder: 10,
    contentReceiver: createSummaryContentReceiver(),
    archiveProvider: createSummaryArchiveProvider(),
    contentSourceProvider: createSummaryContentSources,
    backupDomains: [createSummaryBackupDomain()],
    component: SummaryApp,
    contentStatsProvider: createSummaryContentStats,
    favoriteProvider: createSummaryFavoriteItems,
    generationProvider: createSummaryGenerationActions,
    generationRecoveryProvider: createFailedDraftRecoveryProvider('summary', useSummaryStore),
    itemTransferProvider: summaryItemTransferProvider,
    promptDefinitions: [createSummaryPromptDefinition()],
    taskTemplateDefinitions: createSummaryTaskTemplateDefinitions(),
    referenceProvider: createSummaryReferenceTree,
    resetCurrentScope: () => useSummaryStore().resetCurrentScope(),
    scopeSwitchHandler: scopeKey => useSummaryStore().switchScope(scopeKey),
  }),
  definePhoneApp({
    id: 'diary',
    name: '日记',
    icon: 'fa-book',
    description: '角色视角的私密日记',
    accent: '#ff8f3d',
    defaultRoute: 'root',
    defaultOrder: 20,
    contentReceiver: createDiaryContentReceiver(),
    archiveProvider: createDiaryArchiveProvider(),
    contentSourceProvider: createDiaryContentSources,
    backupDomains: [createDiaryBackupDomain()],
    component: DiaryApp,
    contentStatsProvider: createDiaryContentStats,
    favoriteProvider: createDiaryFavoriteItems,
    generationProvider: createDiaryGenerationActions,
    generationRecoveryProvider: createFailedDraftRecoveryProvider('diary', useDiaryStore),
    itemTransferProvider: diaryItemTransferProvider,
    promptDefinitions: [createDiaryPromptDefinition()],
    referenceProvider: createDiaryReferenceTree,
    resetCurrentScope: () => useDiaryStore().resetCurrentScope(),
    scopeSwitchHandler: scopeKey => useDiaryStore().switchScope(scopeKey),
    specialPromptDefinitions: [createDiaryReactionPromptDefinition()],
    taskTemplateDefinitions: createDiaryTaskTemplateDefinitions(),
  }),
  definePhoneApp({
    id: 'extras',
    name: '番外',
    icon: 'fa-feather-pointed',
    description: '章节式衍生创作',
    accent: '#e35d9a',
    defaultRoute: 'root',
    defaultOrder: 30,
    contentReceiver: createExtrasContentReceiver(),
    archiveProvider: createExtrasArchiveProvider(),
    contentSourceProvider: createExtrasContentSources,
    backupDomains: [createExtrasBackupDomain()],
    component: ExtrasApp,
    contentStatsProvider: createExtrasContentStats,
    favoriteProvider: createExtrasFavoriteItems,
    generationProvider: createExtrasGenerationActions,
    generationRecoveryProvider: createFailedDraftRecoveryProvider('extras', useExtrasStore),
    itemTransferProvider: extrasItemTransferProvider,
    promptDefinitions: [createExtrasPromptDefinition(), createExtrasContinuePromptDefinition()],
    referenceProvider: createExtrasReferenceTree,
    resetCurrentScope: () => useExtrasStore().resetCurrentScope(),
    scopeSwitchHandler: scopeKey => useExtrasStore().switchScope(scopeKey),
    specialPromptDefinitions: [createExtraSummaryPromptDefinition()],
    typePromptDomains: [createExtrasTypePromptDomain()],
    taskTemplateDefinitions: createExtrasTaskTemplateDefinitions(),
  }),
  definePhoneApp({
    id: 'forum',
    name: '论坛',
    icon: 'fa-comments',
    description: '板块、帖子与回帖创作',
    accent: '#0a84ff',
    defaultRoute: 'root',
    defaultOrder: 40,
    contentReceiver: createForumContentReceiver(),
    archiveProvider: createForumArchiveProvider(),
    contentSourceProvider: createForumContentSources,
    backupDomains: [createForumBackupDomain()],
    component: ForumApp,
    contentStatsProvider: createForumContentStats,
    favoriteProvider: createForumFavoriteItems,
    generationProvider: createForumGenerationActions,
    generationRecoveryProvider: createFailedDraftRecoveryProvider('forum', useForumStore),
    itemTransferProvider: forumItemTransferProvider,
    promptDefinitions: [createForumPromptDefinition()],
    referenceProvider: createForumReferenceTree,
    resetCurrentScope: () => useForumStore().resetCurrentScope(),
    scopeSwitchHandler: scopeKey => useForumStore().switchScope(scopeKey),
    specialPromptDefinitions: [createForumReplyPromptDefinition()],
    typePromptDomains: [createForumBoardTypePromptDomain()],
    taskTemplateDefinitions: createForumTaskTemplateDefinitions(),
  }),
  definePhoneApp({
    id: 'theater',
    name: '小剧场',
    icon: 'fa-masks-theater',
    description: '短篇演出与角色互动',
    accent: '#7a5cff',
    defaultRoute: 'root',
    defaultOrder: 50,
    contentReceiver: createTheaterContentReceiver(),
    archiveProvider: createTheaterArchiveProvider(),
    contentSourceProvider: createTheaterContentSources,
    backupDomains: [createTheaterBackupDomain(), createGenerationAliasesBackupDomain()],
    component: TheaterApp,
    contentStatsProvider: createTheaterContentStats,
    favoriteProvider: createTheaterFavoriteItems,
    generationProvider: createTheaterGenerationActions,
    generationRecoveryProvider: createFailedDraftRecoveryProvider('theater', useTheaterStore),
    itemTransferProvider: theaterItemTransferProvider,
    promptDefinitions: [createTheaterPromptDefinition()],
    referenceProvider: createTheaterReferenceTree,
    resetCurrentScope: () => {
      useTheaterStore().resetCurrentScope();
      useGenerationAliasesStore().resetCurrentScope();
    },
    scopeSwitchHandler: scopeKey => {
      useTheaterStore().switchScope(scopeKey);
      useGenerationAliasesStore().switchScope(scopeKey);
    },
    typePromptDomains: [createTheaterTypePromptDomain()],
    taskTemplateDefinitions: createTheaterTaskTemplateDefinitions(),
  }),
  definePhoneApp({
    id: 'letters',
    name: '书信',
    icon: 'fa-envelope-open-text',
    description: '往返信件与回信',
    accent: '#00a896',
    defaultRoute: 'root',
    defaultOrder: 60,
    contentReceiver: createLettersContentReceiver(),
    archiveProvider: createLettersArchiveProvider(),
    contentSourceProvider: createLettersContentSources,
    backupDomains: [createLettersBackupDomain()],
    component: LettersApp,
    contentStatsProvider: createLettersContentStats,
    favoriteProvider: createLettersFavoriteItems,
    generationProvider: createLettersGenerationActions,
    generationRecoveryProvider: createFailedDraftRecoveryProvider('letters', useLettersStore),
    itemTransferProvider: lettersItemTransferProvider,
    promptDefinitions: [createLettersPromptDefinition()],
    taskTemplateDefinitions: createLettersTaskTemplateDefinitions(),
    referenceProvider: createLettersReferenceTree,
    resetCurrentScope: () => useLettersStore().resetCurrentScope(),
    scopeSwitchHandler: scopeKey => useLettersStore().switchScope(scopeKey),
  }),
  WorkbenchModule,
  definePhoneApp({
    id: 'favorites',
    name: '收藏',
    icon: 'fa-bookmark',
    description: '当前聊天收藏聚合',
    accent: '#ffb703',
    defaultRoute: 'root',
    defaultDock: true,
    defaultOrder: 70,
    component: FavoritesApp,
  }),
  definePhoneApp({
    id: 'prompts',
    name: '提示词',
    icon: 'fa-wand-magic-sparkles',
    description: '提示词工坊与短语',
    accent: '#06c167',
    defaultRoute: 'root',
    defaultDock: true,
    defaultOrder: 80,
    component: PromptsApp,
  }),
  definePhoneApp({
    id: 'stats',
    name: '统计',
    icon: 'fa-chart-column',
    description: '聊天统计与概览',
    accent: '#2d9cdb',
    defaultRoute: 'root',
    defaultOrder: 90,
    component: StatsApp,
  }),
  definePhoneApp({
    id: 'archive',
    name: '聊天档案',
    icon: 'fa-folder-open',
    description: '角色卡与聊天内容索引',
    accent: '#2d9cdb',
    defaultRoute: 'root',
    defaultOrder: 95,
    component: ChatArchiveApp,
  }),
  definePhoneApp({
    id: 'reader',
    name: '聊天书库',
    icon: 'fa-glasses',
    description: '按角色书架阅读聊天',
    accent: '#9b5de5',
    defaultRoute: 'root',
    defaultOrder: 100,
    component: ReaderApp,
    contentSourceProvider: createReaderContentSources,
    favoriteProvider: createReaderFavoriteItems,
  }),
  RecoveryModule,
  definePhoneApp({
    id: 'bagu',
    name: '八股去除',
    icon: 'fa-filter-circle-xmark',
    description: '生成后检测与修复',
    accent: '#ef476f',
    defaultRoute: 'root',
    defaultOrder: 110,
    component: BaguApp,
  }),
  definePhoneApp({
    id: 'settings',
    name: '设置',
    icon: 'fa-sliders',
    description: '主题、入口与布局偏好',
    accent: '#6c757d',
    defaultRoute: 'root',
    defaultDock: true,
    defaultOrder: 120,
    backupDomains: [createGenerationTasksBackupDomain(), createPreviewDraftsBackupDomain()],
    component: SettingsApp,
  }),
];
