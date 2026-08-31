export const CURRENT_PHONE_DATA_VERSION = 2;

const PHONE_DATA_VERSION_FIELD = 'sillytavern_phone_data_version';
const RETIRED_APP_IDS = new Set(['comfy', 'media', 'cloud-media', 'gallery', 'music', 'video']);
const RETIRED_FIELDS = [
  'sillytavern_phone_profiles',
  'sillytavern_phone_relationships',
  'sillytavern_phone_scene_planner',
  'sillytavern_phone_storylines',
  'sillytavern_phone_media',
  'sillytavern_phone_comfy',
  'sillytavern_phone_cloud_media',
] as const;

const PHONE_SETTINGS_FIELD = 'sillytavern_phone';
const PROMPT_SETTINGS_FIELD = 'sillytavern_phone_prompt_settings';
const GENERATION_TASKS_FIELD = 'sillytavern_phone_generation_tasks';
const PREVIEW_DRAFTS_FIELD = 'sillytavern_phone_preview_drafts';
const THEATER_FIELD = 'sillytavern_phone_theater';
const WORKBENCH_FIELD = 'sillytavern_phone_workbench';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function deleteKey(record: Record<string, unknown>, key: string) {
  if (!(key in record)) return false;
  delete record[key];
  return true;
}

function filterArray(record: Record<string, unknown>, key: string, keep: (item: unknown) => boolean) {
  const current = record[key];
  if (!Array.isArray(current)) return false;
  const next = current.filter(keep);
  if (next.length === current.length) return false;
  record[key] = next;
  return true;
}

function isRetiredAppId(appId: unknown) {
  return typeof appId === 'string' && RETIRED_APP_IDS.has(appId);
}

function cleanPromptSettings(raw: unknown) {
  if (!isRecord(raw)) return;
  const appPrompts = raw.appPrompts;
  if (isRecord(appPrompts)) {
    deleteKey(appPrompts, 'comfy');
    deleteKey(appPrompts, 'cloud-media');
  }
  const taskTemplates = raw.taskTemplates;
  if (isRecord(taskTemplates)) {
    deleteKey(taskTemplates, 'comfy.generate-prompt');
    deleteKey(taskTemplates, 'cloud-media.generate-prompt');
  }
  const outputRules = raw.outputRules;
  if (isRecord(outputRules)) {
    deleteKey(outputRules, 'comfy.generate');
    deleteKey(outputRules, 'cloud-media.generate');
  }
}

function cleanGenerationTasks(raw: unknown) {
  if (!isRecord(raw)) return;
  filterArray(raw, 'tasks', item => !isRecord(item) || !isRetiredAppId(item.appId));
}

function cleanPreviewDrafts(raw: unknown) {
  if (!isRecord(raw)) return;
  filterArray(raw, 'drafts', item => !isRecord(item) || !isRetiredAppId(item.appId));
  const scopes = raw.scopes;
  if (!isRecord(scopes)) return;
  Object.values(scopes).forEach(scope => {
    if (isRecord(scope)) filterArray(scope, 'drafts', item => !isRecord(item) || !isRetiredAppId(item.appId));
  });
}

function cleanWorkbenchRun(run: unknown, removedStepIds: Set<string>) {
  if (!isRecord(run)) return;
  const removedIds = new Set(removedStepIds);
  const steps = Array.isArray(run.steps) ? run.steps : [];
  steps.forEach(step => {
    if (isRecord(step) && step.appId === 'comfy' && typeof step.id === 'string') removedIds.add(step.id);
    cleanTheaterWorkbenchStep(step);
  });
  filterArray(run, 'steps', item => !isRecord(item) || item.appId !== 'comfy');
  filterArray(run, 'failedStepIds', item => typeof item !== 'string' || !removedIds.has(item));
  const failedDraftIds = run.failedDraftIds;
  if (isRecord(failedDraftIds)) removedIds.forEach(stepId => deleteKey(failedDraftIds, stepId));
}

function cleanTheaterWorkbenchStep(step: unknown) {
  if (!isRecord(step) || step.appId !== 'theater' || !isRecord(step.config)) return;
  deleteKey(step.config, 'theaterParticipants');
}

function cleanWorkbenchScope(raw: unknown) {
  if (!isRecord(raw) || !Array.isArray(raw.workflows)) return;
  raw.workflows = raw.workflows.flatMap(workflow => {
    if (!isRecord(workflow) || !Array.isArray(workflow.steps)) return [workflow];
    workflow.steps.forEach(cleanTheaterWorkbenchStep);
    const removedStepIds = new Set(
      workflow.steps.flatMap(step =>
        isRecord(step) && step.appId === 'comfy' && typeof step.id === 'string' ? [step.id] : [],
      ),
    );
    const nextSteps = workflow.steps.filter(step => !isRecord(step) || step.appId !== 'comfy');
    workflow.steps = nextSteps;
    const pendingRuns = workflow.pendingRuns;
    if (isRecord(pendingRuns)) {
      Object.values(pendingRuns).forEach(run => cleanWorkbenchRun(run, removedStepIds));
    }
    return nextSteps.length ? [workflow] : [];
  });
}

function forEachStoredScope(raw: unknown, callback: (scope: Record<string, unknown>) => void) {
  if (!isRecord(raw)) return;
  if (raw.__chatScoped === true && isRecord(raw.scopes)) {
    Object.values(raw.scopes).forEach(scope => {
      if (isRecord(scope)) callback(scope);
    });
    return;
  }
  callback(raw);
}

function cleanWorkbenchSettings(raw: unknown) {
  forEachStoredScope(raw, cleanWorkbenchScope);
}

function cleanTheaterReplay(raw: unknown) {
  if (!isRecord(raw) || !isRecord(raw.config)) return;
  deleteKey(raw.config, 'participants');
}

function cleanTheaterGenerationRecord(raw: unknown) {
  if (!isRecord(raw)) return;
  cleanTheaterReplay(raw.replay);
}

function cleanTheaterVersion(raw: unknown) {
  if (!isRecord(raw)) return;
  deleteKey(raw, 'participants');
  cleanTheaterReplay(raw.generationReplay);
  cleanTheaterGenerationRecord(raw.generationRecord);
}

function cleanTheaterEntry(raw: unknown) {
  if (!isRecord(raw)) return;
  cleanTheaterVersion(raw);
  if (Array.isArray(raw.versions)) raw.versions.forEach(cleanTheaterVersion);
}

function cleanTheaterScope(raw: Record<string, unknown>) {
  if (Array.isArray(raw.entries)) raw.entries.forEach(cleanTheaterEntry);
  if (!Array.isArray(raw.failedDrafts)) return;
  raw.failedDrafts.forEach(draft => {
    if (!isRecord(draft)) return;
    if (isRecord(draft.context)) deleteKey(draft.context, 'participants');
    cleanTheaterGenerationRecord(draft.generationRecord);
  });
}

function cleanTheaterSettings(raw: unknown) {
  forEachStoredScope(raw, cleanTheaterScope);
}

function cleanThemeAppReferences(raw: unknown) {
  if (!isRecord(raw)) return;
  ['appAccentOverrides', 'appIconAssetIds', 'appIconOverrides'].forEach(key => {
    const references = raw[key];
    if (!isRecord(references)) return;
    RETIRED_APP_IDS.forEach(appId => deleteKey(references, appId));
  });
}

function cleanPhoneSettings(raw: unknown) {
  if (!isRecord(raw)) return;
  const layout = raw.layout;
  if (isRecord(layout)) {
    const removedFolderIds = new Set<string>();
    if (Array.isArray(layout.folders)) {
      layout.folders = layout.folders.flatMap(folder => {
        if (!isRecord(folder) || !Array.isArray(folder.appIds)) return [folder];
        const appIds = folder.appIds.filter(appId => !isRetiredAppId(appId));
        folder.appIds = appIds;
        if (appIds.length) return [folder];
        if (typeof folder.id === 'string') removedFolderIds.add(folder.id);
        return [];
      });
    }
    const keepLayoutToken = (token: unknown) =>
      !isRetiredAppId(token) &&
      !(typeof token === 'string' && token.startsWith('folder:') && removedFolderIds.has(token.slice(7)));
    filterArray(layout, 'appOrder', keepLayoutToken);
    filterArray(layout, 'dockOrder', keepLayoutToken);
  }
  cleanThemeAppReferences(raw.visualTheme);
  const themeProfiles = raw.themeProfiles;
  if (isRecord(themeProfiles)) Object.values(themeProfiles).forEach(cleanThemeAppReferences);
}

export function applyCurrentPhoneDataVersion(extensionSettings: Record<string, unknown>) {
  if (extensionSettings[PHONE_DATA_VERSION_FIELD] === CURRENT_PHONE_DATA_VERSION) return false;

  RETIRED_FIELDS.forEach(field => deleteKey(extensionSettings, field));
  cleanPromptSettings(extensionSettings[PROMPT_SETTINGS_FIELD]);
  cleanGenerationTasks(extensionSettings[GENERATION_TASKS_FIELD]);
  cleanPreviewDrafts(extensionSettings[PREVIEW_DRAFTS_FIELD]);
  cleanTheaterSettings(extensionSettings[THEATER_FIELD]);
  cleanWorkbenchSettings(extensionSettings[WORKBENCH_FIELD]);
  cleanPhoneSettings(extensionSettings[PHONE_SETTINGS_FIELD]);
  extensionSettings[PHONE_DATA_VERSION_FIELD] = CURRENT_PHONE_DATA_VERSION;
  return true;
}
