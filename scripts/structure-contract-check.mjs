// eslint-disable-next-line import-x/no-nodejs-modules
import assert from 'node:assert/strict';
// eslint-disable-next-line import-x/no-nodejs-modules
import { readFile } from 'node:fs/promises';

const promptsApp = await readFile(new URL('../src/components/PromptsApp.vue', import.meta.url), 'utf8');
const transferPage = await readFile(
  new URL('../src/components/prompts/PromptTransferPage.vue', import.meta.url),
  'utf8',
);
const appEditorPage = await readFile(
  new URL('../src/components/prompts/PromptAppEditorPage.vue', import.meta.url),
  'utf8',
);
const outputEditorPage = await readFile(
  new URL('../src/components/prompts/PromptOutputEditorPage.vue', import.meta.url),
  'utf8',
);
const typeEditorPage = await readFile(
  new URL('../src/components/prompts/PromptTypeEditorPage.vue', import.meta.url),
  'utf8',
);
const groupEditorPage = await readFile(
  new URL('../src/components/prompts/PromptGroupEditorPage.vue', import.meta.url),
  'utf8',
);
const phraseEditorPage = await readFile(
  new URL('../src/components/prompts/PromptPhraseEditorPage.vue', import.meta.url),
  'utf8',
);
const promptLibraryActions = await readFile(
  new URL('../src/components/prompts/usePromptLibraryActions.ts', import.meta.url),
  'utf8',
);
const promptDefaultsSession = await readFile(
  new URL('../src/components/prompts/usePromptDefaultsSession.ts', import.meta.url),
  'utf8',
);
const visualHarness = await readFile(new URL('../src/testing/visual-harness.ts', import.meta.url), 'utf8');
const forumGenerationScenarios = await readFile(
  new URL('../src/testing/visual/forumGenerationScenarios.ts', import.meta.url),
  'utf8',
);
const extrasGenerationScenarios = await readFile(
  new URL('../src/testing/visual/extrasGenerationScenarios.ts', import.meta.url),
  'utf8',
);
const promptsScenarios = await readFile(new URL('../src/testing/visual/promptsScenarios.ts', import.meta.url), 'utf8');
const contentBookScenarios = await readFile(
  new URL('../src/testing/visual/contentBookScenarios.ts', import.meta.url),
  'utf8',
);
const theaterScenarios = await readFile(new URL('../src/testing/visual/theaterScenarios.ts', import.meta.url), 'utf8');
const forumApp = await readFile(new URL('../src/apps/forum/ForumApp.vue', import.meta.url), 'utf8');
const forumThreadGeneratePage = await readFile(
  new URL('../src/apps/forum/ForumThreadGeneratePage.vue', import.meta.url),
  'utf8',
);
const forumRepliesGeneratePage = await readFile(
  new URL('../src/apps/forum/ForumRepliesGeneratePage.vue', import.meta.url),
  'utf8',
);
const forumThreadGenerationBoardSession = await readFile(
  new URL('../src/apps/forum/useForumThreadGenerationBoardSession.ts', import.meta.url),
  'utf8',
);
const forumBoardEditorSession = await readFile(
  new URL('../src/apps/forum/useForumBoardEditorSession.ts', import.meta.url),
  'utf8',
);
const forumThreadEditorSession = await readFile(
  new URL('../src/apps/forum/useForumThreadEditorSession.ts', import.meta.url),
  'utf8',
);
const forumDeletionSession = await readFile(
  new URL('../src/apps/forum/useForumDeletionSession.ts', import.meta.url),
  'utf8',
);
const forumGenerationActions = await readFile(
  new URL('../src/apps/forum/useForumGenerationActions.ts', import.meta.url),
  'utf8',
);
const forumFailedDraftRepair = await readFile(
  new URL('../src/composables/useForumFailedDraftRepair.ts', import.meta.url),
  'utf8',
);
const extrasApp = await readFile(new URL('../src/apps/extras/ExtrasApp.vue', import.meta.url), 'utf8');
const summaryApp = await readFile(new URL('../src/apps/summary/SummaryApp.vue', import.meta.url), 'utf8');
const summaryBookSession = await readFile(
  new URL('../src/apps/summary/useSummaryBookSession.ts', import.meta.url),
  'utf8',
);
const summaryBatchSession = await readFile(
  new URL('../src/apps/summary/useSummaryBatchSession.ts', import.meta.url),
  'utf8',
);
const summaryGenerationActions = await readFile(
  new URL('../src/apps/summary/useSummaryGenerationActions.ts', import.meta.url),
  'utf8',
);
const extrasBookEditorPage = await readFile(
  new URL('../src/apps/extras/ExtrasBookEditorPage.vue', import.meta.url),
  'utf8',
);
const extrasChapterEditorSession = await readFile(
  new URL('../src/apps/extras/useExtrasChapterEditorSession.ts', import.meta.url),
  'utf8',
);
const extrasChapterGeneratePage = await readFile(
  new URL('../src/apps/extras/ExtrasChapterGeneratePage.vue', import.meta.url),
  'utf8',
);
const extrasSummaryGeneratePage = await readFile(
  new URL('../src/apps/extras/ExtrasSummaryGeneratePage.vue', import.meta.url),
  'utf8',
);
const extrasChapterTypePromptSession = await readFile(
  new URL('../src/apps/extras/useExtrasChapterTypePromptSession.ts', import.meta.url),
  'utf8',
);
const extrasBookEditorSession = await readFile(
  new URL('../src/apps/extras/useExtrasBookEditorSession.ts', import.meta.url),
  'utf8',
);
const extrasDeletionSession = await readFile(
  new URL('../src/apps/extras/useExtrasDeletionSession.ts', import.meta.url),
  'utf8',
);
const extrasSummaryEditorSession = await readFile(
  new URL('../src/apps/extras/useExtrasSummaryEditorSession.ts', import.meta.url),
  'utf8',
);
const extrasSummaryPreviewSession = await readFile(
  new URL('../src/apps/extras/useExtrasSummaryPreviewSession.ts', import.meta.url),
  'utf8',
);
const extrasFailedDraftRepair = await readFile(
  new URL('../src/composables/useExtrasFailedDraftRepair.ts', import.meta.url),
  'utf8',
);
const extrasGenerationActions = await readFile(
  new URL('../src/apps/extras/useExtrasGenerationActions.ts', import.meta.url),
  'utf8',
);
const workbenchApp = await readFile(new URL('../src/apps/workbench/WorkbenchApp.vue', import.meta.url), 'utf8');
const tavernNavigation = await readFile(new URL('../src/util/tavernNavigation.ts', import.meta.url), 'utf8');
const contentTransfer = await readFile(new URL('../src/util/contentTransfer.ts', import.meta.url), 'utf8');
const contentTransferOverlay = await readFile(
  new URL('../src/components/ContentTransferOverlay.vue', import.meta.url),
  'utf8',
);
const phoneOverlay = await readFile(new URL('../src/components/PhoneOverlay.vue', import.meta.url), 'utf8');
const settingsDataManagement = await readFile(
  new URL('../src/components/settings/SettingsDataManagementPage.vue', import.meta.url),
  'utf8',
);

assert.match(promptsApp, /<PromptTransferPage v-else-if="route\.page === 'transfer'"/);
assert.doesNotMatch(promptsApp, /const transferSelection/);
assert.doesNotMatch(promptsApp, /function exportSelected/);
assert.doesNotMatch(promptsApp, /function openTransferImport/);
assert.match(transferPage, /const selection = reactive<PromptTransferSelection>/);
assert.match(transferPage, /prompts\.parseTransfer/);
assert.match(transferPage, /prompts\.applyTransfer/);
assert.match(transferPage, /phone\.confirmNotice/);

assert.match(promptsApp, /<PromptAppEditorPage\s+v-else-if="route\.page === 'app-prompt-editor'/);
assert.match(promptsApp, /<PromptOutputEditorPage\s+v-else-if="route\.page === 'output-editor'/);
assert.match(promptsApp, /<PromptTypeEditorPage\s+v-else-if="route\.page === 'type-editor'/);
assert.match(promptsApp, /<PromptGroupEditorPage\s+v-else-if="route\.page === 'group-editor'/);
assert.match(promptsApp, /<PromptPhraseEditorPage\s+v-else-if="route\.page === 'phrase-editor'/);
assert.doesNotMatch(promptsApp, /const outputDraft/);
assert.doesNotMatch(promptsApp, /const appPromptDraft/);
assert.doesNotMatch(promptsApp, /const typeDraft/);
assert.doesNotMatch(promptsApp, /const groupDraft/);
assert.doesNotMatch(promptsApp, /const phraseDraft/);
assert.doesNotMatch(promptsApp, /function submitOutputRule/);
assert.doesNotMatch(promptsApp, /function submitAppPrompt/);
assert.doesNotMatch(promptsApp, /function submitTypePrompt/);
assert.doesNotMatch(promptsApp, /function submitGroup/);
assert.doesNotMatch(promptsApp, /function submitPhrase/);
assert.match(appEditorPage, /prompts\.updateAppPrompt/);
assert.match(outputEditorPage, /prompts\.saveOutputRule/);
assert.match(typeEditorPage, /prompts\.createTypePrompt/);
assert.match(groupEditorPage, /prompts\.createQuickPhraseGroup/);
assert.match(phraseEditorPage, /prompts\.createQuickPhrase/);
assert.match(promptsApp, /usePromptLibraryActions\(/);
assert.doesNotMatch(promptsApp, /async function removeTypePrompt/);
assert.doesNotMatch(promptsApp, /async function removeQuickPhraseGroup/);
assert.doesNotMatch(promptsApp, /async function removeQuickPhrase/);
assert.doesNotMatch(promptsApp, /async function removeQuickTemplateGroup/);
assert.doesNotMatch(promptsApp, /async function removeQuickTemplate/);
assert.match(promptLibraryActions, /function removeTypePrompt/);
assert.match(promptLibraryActions, /function removeQuickPhraseGroup/);
assert.match(promptLibraryActions, /function removeQuickTemplateGroup/);
assert.match(promptsApp, /usePromptDefaultsSession\(/);
assert.doesNotMatch(promptsApp, /function updateAppPromptValue/);
assert.doesNotMatch(promptsApp, /async function resetDefaults/);
assert.match(promptDefaultsSession, /function updatePromptValue/);
assert.match(promptDefaultsSession, /async function resetDefaults/);

assert.match(summaryApp, /useSummaryBookSession\(/);
assert.doesNotMatch(summaryApp, /function submitBook/);
assert.doesNotMatch(summaryApp, /function submitBookAndGenerate/);
assert.doesNotMatch(summaryApp, /async function removeBook/);
assert.match(summaryBookSession, /function saveBook/);
assert.match(summaryBookSession, /function saveBookAndGenerate/);
assert.match(summaryBookSession, /async function removeBook/);
assert.match(summaryApp, /useSummaryGenerationActions\(/);
assert.match(summaryApp, /useSummaryBatchSession\(/);
assert.doesNotMatch(summaryApp, /generateContent\(/);
assert.doesNotMatch(summaryApp, /createManualBatchTask\(/);
assert.match(summaryGenerationActions, /generateContent\(/);
assert.match(summaryBatchSession, /createManualBatchTask\(/);
assert.match(summaryBatchSession, /runManualBatchTask\(/);

assert.match(visualHarness, /applyForumGenerationVisualScenario/);
assert.doesNotMatch(visualHarness, /name === 'forum-generate-thread'/);
assert.doesNotMatch(visualHarness, /name === 'forum-generate-replies'/);
assert.doesNotMatch(visualHarness, /name === 'forum-catalog'/);
assert.doesNotMatch(visualHarness, /name === 'forum-version-interactions'/);
assert.match(forumGenerationScenarios, /function createForumFixture/);
assert.match(forumGenerationScenarios, /name === 'forum-generate-thread'/);
assert.match(forumGenerationScenarios, /name === 'forum-generate-replies'/);
assert.match(forumGenerationScenarios, /name === 'forum-catalog'/);
assert.match(forumGenerationScenarios, /name === 'forum-version-interactions'/);
assert.match(visualHarness, /applyExtrasGenerationVisualScenario/);
assert.doesNotMatch(visualHarness, /name === 'extras-book-generate'/);
assert.doesNotMatch(visualHarness, /name === 'extras-summary-generate'/);
assert.match(extrasGenerationScenarios, /function createExtrasSummaryFixture/);
assert.match(extrasGenerationScenarios, /name === 'extras-book-generate'/);
assert.match(extrasGenerationScenarios, /name === 'extras-summary-generate'/);
assert.match(visualHarness, /applyPromptsVisualScenario/);
assert.doesNotMatch(visualHarness, /name === 'prompts-output-list'/);
assert.doesNotMatch(visualHarness, /name === 'prompts-output-editor'/);
assert.doesNotMatch(visualHarness, /name === 'prompts-phrase-editor'/);
assert.match(promptsScenarios, /name === 'prompts-output-list'/);
assert.match(promptsScenarios, /name === 'prompts-output-editor'/);
assert.match(promptsScenarios, /name === 'prompts-phrase-editor'/);
assert.match(visualHarness, /applyContentBookVisualScenario/);
assert.doesNotMatch(visualHarness, /name === 'summary-book'/);
assert.doesNotMatch(visualHarness, /name === 'diary-book'/);
assert.doesNotMatch(visualHarness, /name === 'letters-book'/);
assert.match(contentBookScenarios, /name === 'summary-book'/);
assert.match(contentBookScenarios, /name === 'diary-book'/);
assert.match(contentBookScenarios, /name === 'letters-book'/);
assert.match(visualHarness, /applyTheaterVisualScenario/);
assert.doesNotMatch(visualHarness, /name === 'theater-generate'/);
assert.doesNotMatch(visualHarness, /name === 'theater-failed-draft'/);
assert.match(theaterScenarios, /name === 'theater-generate'/);
assert.match(theaterScenarios, /name === 'theater-failed-draft'/);

assert.match(tavernNavigation, /openCharacterChat/);
assert.match(tavernNavigation, /waitForTavernState/);
assert.doesNotMatch(tavernNavigation, /option_close_chat/);
assert.doesNotMatch(tavernNavigation, /select_chat_block/);
assert.doesNotMatch(tavernNavigation, /setTimeout\(loadChat/);

assert.match(forumApp, /useForumFailedDraftRepair\(/);
assert.doesNotMatch(forumApp, /function reparseFailedDraft\(/);
assert.doesNotMatch(forumApp, /async function removeFailedDraft\(/);
assert.match(forumApp, /<ForumThreadGeneratePage\s+v-else-if="route\.page === 'generate-thread'/);
assert.doesNotMatch(forumApp, /<GenerationFormPage\s+v-else-if="route\.page === 'generate-thread'/);
assert.match(forumThreadGeneratePage, /<GenerationFormPage/);
assert.match(forumThreadGeneratePage, /<SearchableCombobox/);
assert.match(forumThreadGeneratePage, /emit\('createBoard'\)/);
assert.match(forumThreadGeneratePage, /emit\('selectBoardType'/);
assert.match(forumApp, /<ForumRepliesGeneratePage\s+v-else-if="route\.page === 'generate-replies'/);
assert.doesNotMatch(forumApp, /<GenerationFormPage\s+v-else-if="route\.page === 'generate-replies'/);
assert.match(forumRepliesGeneratePage, /<GenerationFormPage/);
assert.match(forumRepliesGeneratePage, /AI 续回/);
assert.match(forumApp, /useForumThreadGenerationBoardSession\(threadGenerationDraft/);
assert.doesNotMatch(forumApp, /function selectThreadBoardType/);
assert.doesNotMatch(forumApp, /function createAndSelectThreadBoard/);
assert.match(forumThreadGenerationBoardSession, /function selectBoardType/);
assert.match(forumThreadGenerationBoardSession, /function createAndSelectBoard/);
assert.match(forumThreadGenerationBoardSession, /forum\.createBoard/);
assert.match(forumApp, /useForumBoardEditorSession\(boardDraft, boardEditorTypeId/);
assert.doesNotMatch(forumApp, /function submitBoard/);
assert.doesNotMatch(forumApp, /function selectBoardEditorType/);
assert.doesNotMatch(forumApp, /function markBoardEditorTypeCustom/);
assert.match(forumBoardEditorSession, /function selectType/);
assert.match(forumBoardEditorSession, /function markTypeCustom/);
assert.match(forumBoardEditorSession, /function submit/);
assert.match(forumBoardEditorSession, /forum\.updateBoard/);
assert.match(forumApp, /useForumThreadEditorSession\(threadDraft/);
assert.doesNotMatch(forumApp, /function selectThreadEditorBoardType/);
assert.doesNotMatch(forumApp, /function resolveThreadTargetBoard/);
assert.doesNotMatch(forumApp, /function submitThread/);
assert.match(forumThreadEditorSession, /function resolveTargetBoard/);
assert.match(forumThreadEditorSession, /forum\.ensureBoard/);
assert.match(forumThreadEditorSession, /forum\.updateThreadVersion/);
assert.match(forumApp, /useForumDeletionSession\(/);
assert.doesNotMatch(forumApp, /async function removeForumVersion/);
assert.doesNotMatch(forumApp, /async function removeBoard/);
assert.doesNotMatch(forumApp, /async function removeThread/);
assert.match(forumDeletionSession, /async function removeForumVersion/);
assert.match(forumDeletionSession, /async function removeBoard/);
assert.match(forumDeletionSession, /async function removeThread/);
assert.match(forumFailedDraftRepair, /function reparseFailedDraft\(/);
assert.match(forumFailedDraftRepair, /forum\.updateFailedDraft/);
assert.match(forumFailedDraftRepair, /parseForumRepliesXmlResult/);
assert.match(forumFailedDraftRepair, /parseForumXmlResult/);
assert.match(forumApp, /useForumGenerationActions\(/);
assert.doesNotMatch(forumApp, /generateContent\(/);
assert.match(forumGenerationActions, /async function runThreadGeneration\(/);
assert.match(forumGenerationActions, /async function runReplyGeneration\(/);
assert.match(forumGenerationActions, /generateContent\(/);

assert.match(extrasApp, /useExtrasFailedDraftRepair\(/);
assert.doesNotMatch(extrasApp, /function reparseFailedDraft\(/);
assert.doesNotMatch(extrasApp, /async function removeFailedDraft\(/);
assert.match(extrasApp, /<ExtrasBookEditorPage\s+v-else-if="route\.page === 'book-editor'/);
assert.doesNotMatch(extrasApp, /<section v-else-if="route\.page === 'book-editor'/);
assert.match(extrasBookEditorPage, /<GenerationPanel/);
assert.match(extrasBookEditorPage, /<SearchableCombobox/);
assert.match(extrasBookEditorPage, /emit\('generate'\)/);
assert.match(extrasBookEditorPage, /emit\('save'\)/);
assert.match(extrasApp, /useExtrasChapterEditorSession\(chapterDraft/);
assert.doesNotMatch(extrasApp, /function submitChapter/);
assert.match(extrasChapterEditorSession, /function saveChapter/);
assert.match(extrasChapterEditorSession, /extras\.updateChapterVersion/);
assert.match(extrasApp, /<ExtrasChapterGeneratePage\s+v-else-if="route\.page === 'chapter-generate'/);
assert.doesNotMatch(extrasApp, /<section v-else-if="route\.page === 'chapter-generate'/);
assert.match(extrasChapterGeneratePage, /<GenerationPanel/);
assert.match(extrasChapterGeneratePage, /emit\('syncIntent'\)/);
assert.match(extrasChapterGeneratePage, /emit\('selectType'/);
assert.match(extrasApp, /<ExtrasChapterGeneratePage[^>]*:summary-rule-options="summaryRuleOptions"[^>]*@sync-intent=/);
assert.doesNotMatch(extrasApp, /<ExtrasBookEditorPage[^>]*:summary-rule-options="summaryRuleOptions"/);
assert.match(extrasApp, /<ExtrasSummaryGeneratePage\s+v-else-if="route\.page === 'summary-generate'/);
assert.doesNotMatch(extrasApp, /<section v-else-if="route\.page === 'summary-generate'/);
assert.match(extrasSummaryGeneratePage, /<GenerationPanel/);
assert.match(extrasSummaryGeneratePage, /<EmptyState/);
assert.match(extrasSummaryGeneratePage, /emit\('generate'\)/);
assert.match(extrasApp, /useExtrasChapterTypePromptSession\(chapterGenerationDraft\)/);
assert.doesNotMatch(extrasApp, /function saveChapterTypePrompt/);
assert.doesNotMatch(extrasApp, /function selectChapterTypeValue/);
assert.match(extrasChapterTypePromptSession, /function saveTypePrompt/);
assert.match(extrasChapterTypePromptSession, /function selectTypeValue/);
assert.match(extrasChapterTypePromptSession, /prompts\.createTypePrompt/);
assert.match(extrasApp, /useExtrasBookEditorSession\(\s*bookDraft,\s*chapterGenerationDraft/);
assert.doesNotMatch(extrasApp, /function submitBook/);
assert.doesNotMatch(extrasApp, /function submitBookAndGenerate/);
assert.match(extrasBookEditorSession, /function saveBook/);
assert.match(extrasBookEditorSession, /function saveBookAndGenerate/);
assert.match(extrasBookEditorSession, /resolveGeneratedExtraBookTitle/);
assert.match(extrasApp, /useExtrasDeletionSession\(/);
assert.doesNotMatch(extrasApp, /async function removeBook/);
assert.doesNotMatch(extrasApp, /async function removeChapterVersion/);
assert.doesNotMatch(extrasApp, /async function removeChapter/);
assert.match(extrasDeletionSession, /async function removeBook/);
assert.match(extrasDeletionSession, /async function removeChapterVersion/);
assert.match(extrasDeletionSession, /async function removeChapter/);
assert.match(extrasApp, /useExtrasSummaryEditorSession\(summaryDraft/);
assert.doesNotMatch(extrasApp, /function submitSummary/);
assert.doesNotMatch(extrasApp, /async function removeSummary/);
assert.match(extrasSummaryEditorSession, /function saveSummary/);
assert.match(extrasSummaryEditorSession, /async function removeSummary/);
assert.match(extrasApp, /useExtrasSummaryPreviewSession\(/);
assert.doesNotMatch(extrasApp, /function saveSummaryPreview/);
assert.doesNotMatch(extrasApp, /function reparseSummaryPreviewRaw/);
assert.match(extrasSummaryPreviewSession, /function savePreview/);
assert.match(extrasSummaryPreviewSession, /function reparseRaw/);
assert.match(extrasFailedDraftRepair, /function reparseFailedDraft\(/);
assert.match(extrasFailedDraftRepair, /ExtraChapterGenerateConfigSchema\.safeParse/);
assert.match(extrasFailedDraftRepair, /parseContentXmlResult/);
assert.match(extrasFailedDraftRepair, /parseSimpleXmlResult/);
assert.match(extrasApp, /useExtrasGenerationActions\(/);
assert.doesNotMatch(extrasApp, /generateContent\(/);
assert.match(extrasGenerationActions, /async function runChapterGenerationForBook\(/);
assert.match(extrasGenerationActions, /async function runSummaryGeneration\(/);
assert.match(extrasGenerationActions, /generateContent\(/);

assert.match(workbenchApp, /:options="workbenchActionOptions"/);
assert.doesNotMatch(workbenchApp, /<select[\s\S]{0,300}supportedWorkbenchActions/);

assert.match(contentTransfer, /domain\.scope === 'chat'/);
assert.match(contentTransfer, /executeBackupImportTransaction/);
assert.match(contentTransfer, /restoreSnapshot:\s*snapshot\s*=>\s*domain\.importData\(snapshot\)/);
assert.doesNotMatch(contentTransfer, /catch\s*\(error\)\s*\{\s*domain\.importData\(beforeRaw\)/s);
assert.match(contentTransfer, /domain\.category !== 'draft'/);
assert.match(contentTransfer, /payload\.schemaVersion > domain\.schemaVersion/);
assert.match(contentTransferOverlay, /创建副本/);
assert.match(contentTransferOverlay, /合并/);
assert.match(contentTransferOverlay, /覆盖/);
assert.match(contentTransferOverlay, /props\.domains\.some/);
assert.doesNotMatch(phoneOverlay, /<ContentTransferOverlay/);
assert.match(settingsDataManagement, /<ContentTransferOverlay/);
assert.match(settingsDataManagement, /:domains="selectedTransferApp\.domains"/);

console.log('Structure split safeguards are present.');
