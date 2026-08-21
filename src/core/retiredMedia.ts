export const RETIRED_MEDIA_APP_IDS = ['comfy', 'media', 'cloud-media', 'gallery', 'music', 'video'] as const;

const retiredMediaAppIdSet = new Set<string>(RETIRED_MEDIA_APP_IDS);
const retiredMediaFields = [
  'sillytavern_phone_media',
  'sillytavern_phone_comfy',
  'sillytavern_phone_cloud_media',
] as const;

const PHONE_SETTINGS_FIELD = 'sillytavern_phone';
const PROMPT_SETTINGS_FIELD = 'sillytavern_phone_prompt_settings';
const GENERATION_TASKS_FIELD = 'sillytavern_phone_generation_tasks';
const PREVIEW_DRAFTS_FIELD = 'sillytavern_phone_preview_drafts';
const WORKBENCH_FIELD = 'sillytavern_phone_workbench';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function deleteRecordKey(record: Record<string, unknown>, key: string) {
  if (!(key in record)) return false;
  delete record[key];
  return true;
}

function filterRecordArray(record: Record<string, unknown>, key: string, keep: (item: unknown) => boolean) {
  const current = record[key];
  if (!Array.isArray(current)) return false;
  const next = current.filter(keep);
  if (next.length === current.length) return false;
  record[key] = next;
  return true;
}

export function isRetiredMediaAppId(appId: unknown) {
  return typeof appId === 'string' && retiredMediaAppIdSet.has(appId);
}

export function stripRetiredMediaPromptSettings(raw: unknown) {
  if (!isRecord(raw)) return false;
  let changed = false;
  const appPrompts = raw.appPrompts;
  if (isRecord(appPrompts)) {
    changed = deleteRecordKey(appPrompts, 'comfy') || changed;
    changed = deleteRecordKey(appPrompts, 'cloud-media') || changed;
  }
  const taskTemplates = raw.taskTemplates;
  if (isRecord(taskTemplates)) {
    changed = deleteRecordKey(taskTemplates, 'comfy.generate-prompt') || changed;
    changed = deleteRecordKey(taskTemplates, 'cloud-media.generate-prompt') || changed;
  }
  const outputRules = raw.outputRules;
  if (isRecord(outputRules)) {
    changed = deleteRecordKey(outputRules, 'comfy.generate') || changed;
    changed = deleteRecordKey(outputRules, 'cloud-media.generate') || changed;
  }
  return changed;
}

export function stripRetiredMediaGenerationTasks(raw: unknown) {
  if (!isRecord(raw)) return false;
  return filterRecordArray(raw, 'tasks', item => !isRecord(item) || !isRetiredMediaAppId(item.appId));
}

export function stripRetiredMediaPreviewDrafts(raw: unknown) {
  if (!isRecord(raw)) return false;
  let changed = false;
  changed = filterRecordArray(raw, 'drafts', item => !isRecord(item) || !isRetiredMediaAppId(item.appId)) || changed;
  const scopes = raw.scopes;
  if (!isRecord(scopes)) return changed;
  Object.values(scopes).forEach(scope => {
    if (!isRecord(scope)) return;
    changed = filterRecordArray(scope, 'drafts', item => !isRecord(item) || !isRetiredMediaAppId(item.appId)) || changed;
  });
  return changed;
}

function stripWorkbenchRun(run: unknown, removedWorkflowStepIds: Set<string>) {
  if (!isRecord(run)) return false;
  const removedIds = new Set(removedWorkflowStepIds);
  const originalSteps = Array.isArray(run.steps) ? run.steps : [];
  originalSteps.forEach(step => {
    if (isRecord(step) && step.appId === 'comfy' && typeof step.id === 'string') removedIds.add(step.id);
  });
  let changed = filterRecordArray(run, 'steps', item => !isRecord(item) || item.appId !== 'comfy');
  changed = filterRecordArray(run, 'failedStepIds', item => typeof item !== 'string' || !removedIds.has(item)) || changed;
  const failedDraftIds = run.failedDraftIds;
  if (isRecord(failedDraftIds)) {
    removedIds.forEach(stepId => {
      changed = deleteRecordKey(failedDraftIds, stepId) || changed;
    });
  }
  return changed;
}

export function stripRetiredMediaWorkbenchSettings(raw: unknown) {
  if (!isRecord(raw) || !Array.isArray(raw.workflows)) return false;
  let changed = false;
  const workflows = raw.workflows.flatMap(workflow => {
    if (!isRecord(workflow) || !Array.isArray(workflow.steps)) return [workflow];
    const originalSteps = workflow.steps;
    const removedStepIds = new Set(
      originalSteps.flatMap(step =>
        isRecord(step) && step.appId === 'comfy' && typeof step.id === 'string' ? [step.id] : [],
      ),
    );
    if (removedStepIds.size) {
      changed = true;
      workflow.steps = originalSteps.filter(step => !isRecord(step) || step.appId !== 'comfy');
    }
    const pendingRuns = workflow.pendingRuns;
    if (isRecord(pendingRuns)) {
      Object.values(pendingRuns).forEach(run => {
        changed = stripWorkbenchRun(run, removedStepIds) || changed;
      });
    }
    return Array.isArray(workflow.steps) && workflow.steps.length ? [workflow] : [];
  });
  if (workflows.length !== raw.workflows.length) changed = true;
  raw.workflows = workflows;
  return changed;
}

function stripThemeAppReferences(raw: unknown) {
  if (!isRecord(raw)) return false;
  let changed = false;
  ['appAccentOverrides', 'appIconAssetIds', 'appIconOverrides'].forEach(key => {
    const references = raw[key];
    if (!isRecord(references)) return;
    RETIRED_MEDIA_APP_IDS.forEach(appId => {
      changed = deleteRecordKey(references, appId) || changed;
    });
  });
  return changed;
}

export function stripRetiredMediaPhoneSettings(raw: unknown) {
  if (!isRecord(raw)) return false;
  let changed = false;
  const layout = raw.layout;
  if (isRecord(layout)) {
    const removedFolderIds = new Set<string>();
    if (Array.isArray(layout.folders)) {
      layout.folders = layout.folders.flatMap(folder => {
        if (!isRecord(folder) || !Array.isArray(folder.appIds)) return [folder];
        const appIds = folder.appIds.filter(appId => !isRetiredMediaAppId(appId));
        if (appIds.length !== folder.appIds.length) changed = true;
        if (!appIds.length) {
          if (typeof folder.id === 'string') removedFolderIds.add(folder.id);
          return [];
        }
        folder.appIds = appIds;
        return [folder];
      });
    }
    const keepLayoutToken = (token: unknown) =>
      !isRetiredMediaAppId(token) &&
      !(typeof token === 'string' && token.startsWith('folder:') && removedFolderIds.has(token.slice(7)));
    changed = filterRecordArray(layout, 'appOrder', keepLayoutToken) || changed;
    changed = filterRecordArray(layout, 'dockOrder', keepLayoutToken) || changed;
  }
  changed = stripThemeAppReferences(raw.visualTheme) || changed;
  const themeProfiles = raw.themeProfiles;
  if (isRecord(themeProfiles)) {
    Object.values(themeProfiles).forEach(profile => {
      if (!isRecord(profile)) return;
      changed = stripThemeAppReferences(profile.visualTheme) || changed;
    });
  }
  return changed;
}

export function purgeRetiredMediaExtensionData(extensionSettings: Record<string, unknown>) {
  let changed = false;
  retiredMediaFields.forEach(field => {
    changed = deleteRecordKey(extensionSettings, field) || changed;
  });
  changed = stripRetiredMediaPromptSettings(extensionSettings[PROMPT_SETTINGS_FIELD]) || changed;
  changed = stripRetiredMediaGenerationTasks(extensionSettings[GENERATION_TASKS_FIELD]) || changed;
  changed = stripRetiredMediaPreviewDrafts(extensionSettings[PREVIEW_DRAFTS_FIELD]) || changed;
  changed = stripRetiredMediaWorkbenchSettings(extensionSettings[WORKBENCH_FIELD]) || changed;
  changed = stripRetiredMediaPhoneSettings(extensionSettings[PHONE_SETTINGS_FIELD]) || changed;
  return changed;
}
