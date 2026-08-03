import BaguApp from '@/components/BaguApp.vue';
import ChatArchiveApp from '@/components/ChatArchiveApp.vue';
import DiaryApp from '@/components/DiaryApp.vue';
import ExtrasApp from '@/components/ExtrasApp.vue';
import FavoritesApp from '@/components/FavoritesApp.vue';
import ForumApp from '@/components/ForumApp.vue';
import LettersApp from '@/components/LettersApp.vue';
import PromptsApp from '@/components/PromptsApp.vue';
import ReaderApp from '@/components/ReaderApp.vue';
import SettingsApp from '@/components/SettingsApp.vue';
import StatsApp from '@/components/StatsApp.vue';
import SummaryApp from '@/components/SummaryApp.vue';
import TheaterApp from '@/components/TheaterApp.vue';
import WorkbenchModule from '@/apps/workbench';
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
  createExtrasContinuePromptDefinition,
  createExtrasPromptDefinition,
  createExtrasRewritePromptDefinition,
  createExtrasTypePromptDomain,
  createExtraSummaryPromptDefinition,
  createForumBoardTypePromptDomain,
  createForumPromptDefinition,
  createForumReplyPromptDefinition,
  createForumRewritePromptDefinition,
  createLettersPromptDefinition,
  createLettersRewritePromptDefinition,
  createSummaryPromptDefinition,
  createTheaterPromptDefinition,
  createTheaterRewritePromptDefinition,
  createTheaterTypePromptDomain,
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

export const BUILTIN_PHONE_APP_MODULES: PhoneAppModule[] = [
  definePhoneApp({
    id: 'summary',
    name: '总结',
    icon: 'fa-note-sticky',
    description: '聊天总结与阶段回顾',
    accent: '#ff6b6b',
    defaultRoute: 'root',
    defaultOrder: 10,
    backupDomains: [createSummaryBackupDomain()],
    component: SummaryApp,
    contentStatsProvider: createSummaryContentStats,
    favoriteProvider: createSummaryFavoriteItems,
    generationProvider: createSummaryGenerationActions,
    promptDefinitions: [createSummaryPromptDefinition()],
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
    backupDomains: [createDiaryBackupDomain()],
    component: DiaryApp,
    contentStatsProvider: createDiaryContentStats,
    favoriteProvider: createDiaryFavoriteItems,
    generationProvider: createDiaryGenerationActions,
    promptDefinitions: [createDiaryPromptDefinition()],
    referenceProvider: createDiaryReferenceTree,
    resetCurrentScope: () => useDiaryStore().resetCurrentScope(),
    scopeSwitchHandler: scopeKey => useDiaryStore().switchScope(scopeKey),
    specialPromptDefinitions: [createDiaryReactionPromptDefinition()],
  }),
  definePhoneApp({
    id: 'extras',
    name: '番外',
    icon: 'fa-feather-pointed',
    description: '章节式衍生创作',
    accent: '#e35d9a',
    defaultRoute: 'root',
    defaultOrder: 30,
    backupDomains: [createExtrasBackupDomain()],
    component: ExtrasApp,
    contentStatsProvider: createExtrasContentStats,
    favoriteProvider: createExtrasFavoriteItems,
    generationProvider: createExtrasGenerationActions,
    promptDefinitions: [
      createExtrasPromptDefinition(),
      createExtrasContinuePromptDefinition(),
      createExtrasRewritePromptDefinition(),
    ],
    referenceProvider: createExtrasReferenceTree,
    resetCurrentScope: () => useExtrasStore().resetCurrentScope(),
    scopeSwitchHandler: scopeKey => useExtrasStore().switchScope(scopeKey),
    specialPromptDefinitions: [createExtraSummaryPromptDefinition()],
    typePromptDomains: [createExtrasTypePromptDomain()],
  }),
  definePhoneApp({
    id: 'forum',
    name: '论坛',
    icon: 'fa-comments',
    description: '板块、帖子与回帖创作',
    accent: '#0a84ff',
    defaultRoute: 'root',
    defaultOrder: 40,
    backupDomains: [createForumBackupDomain()],
    component: ForumApp,
    contentStatsProvider: createForumContentStats,
    favoriteProvider: createForumFavoriteItems,
    generationProvider: createForumGenerationActions,
    promptDefinitions: [createForumPromptDefinition(), createForumRewritePromptDefinition()],
    referenceProvider: createForumReferenceTree,
    resetCurrentScope: () => useForumStore().resetCurrentScope(),
    scopeSwitchHandler: scopeKey => useForumStore().switchScope(scopeKey),
    specialPromptDefinitions: [createForumReplyPromptDefinition()],
    typePromptDomains: [createForumBoardTypePromptDomain()],
  }),
  definePhoneApp({
    id: 'theater',
    name: '小剧场',
    icon: 'fa-masks-theater',
    description: '短篇演出与角色互动',
    accent: '#7a5cff',
    defaultRoute: 'root',
    defaultOrder: 50,
    backupDomains: [createTheaterBackupDomain(), createGenerationAliasesBackupDomain()],
    component: TheaterApp,
    contentStatsProvider: createTheaterContentStats,
    favoriteProvider: createTheaterFavoriteItems,
    generationProvider: createTheaterGenerationActions,
    promptDefinitions: [createTheaterPromptDefinition(), createTheaterRewritePromptDefinition()],
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
  }),
  definePhoneApp({
    id: 'letters',
    name: '书信',
    icon: 'fa-envelope-open-text',
    description: '往返信件与回信',
    accent: '#00a896',
    defaultRoute: 'root',
    defaultOrder: 60,
    backupDomains: [createLettersBackupDomain()],
    component: LettersApp,
    contentStatsProvider: createLettersContentStats,
    favoriteProvider: createLettersFavoriteItems,
    generationProvider: createLettersGenerationActions,
    promptDefinitions: [createLettersPromptDefinition(), createLettersRewritePromptDefinition()],
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
    defaultDock: true,
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
    name: '阅读聊天',
    icon: 'fa-glasses',
    description: '整段阅读与替换视图',
    accent: '#9b5de5',
    defaultRoute: 'root',
    defaultOrder: 100,
    component: ReaderApp,
    favoriteProvider: createReaderFavoriteItems,
  }),
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
