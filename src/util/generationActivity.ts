import type { PhoneGenerationRecoveryItem } from '@/core/appRegistry';
import type { GenerationPreviewDraft } from '@/store/previewDrafts';
import type { GenerationTask } from '@/type/generationTask';

export type GenerationActivityKind = 'active-task' | 'preview-draft' | 'recovery';

export interface GenerationActivityItem {
  appId: string;
  id: string;
  kind: GenerationActivityKind;
  routePage: string;
  routeParams: Record<string, string>;
  title: string;
}

function isActiveTask(task: GenerationTask) {
  return ['queued', 'running', 'pause-requested', 'paused', 'interrupted', 'failed'].includes(task.status) ||
    (task.status === 'cancelled' && Boolean(task.rawOutput.trim()));
}

/**
 * Build the dynamic-page activity list without guessing task/draft relationships.
 * Preview drafts and recovery items own their stable ids; task entries are only status records.
 */
export function collectGenerationActivity(
  tasks: GenerationTask[],
  drafts: GenerationPreviewDraft[],
  recoveryItems: PhoneGenerationRecoveryItem[],
) {
  const items: GenerationActivityItem[] = [];
  tasks.filter(isActiveTask).forEach(task =>
    items.push({ appId: task.appId, id: task.id, kind: 'active-task', routePage: task.routePage, routeParams: task.routeParams, title: task.title }),
  );
  drafts.forEach(draft =>
    items.push({ appId: draft.appId, id: draft.id, kind: 'preview-draft', routePage: draft.page, routeParams: draft.routeParams, title: draft.title }),
  );
  recoveryItems.forEach(item =>
    items.push({ appId: item.appId, id: item.id, kind: 'recovery', routePage: item.routePage, routeParams: item.routeParams, title: item.title }),
  );
  const unique = new Map<string, GenerationActivityItem>();
  items.forEach(item => unique.set(`${item.kind}:${item.appId}:${item.id}`, item));
  return [...unique.values()];
}
