import type { SingleGenerationRunOutcome, SingleGenerationSession } from '@/composables/runSingleGeneration';
import { completeSingleGenerationFailedDraft } from '@/composables/runSingleGeneration';
import type { GenerationExecutionPreview, GenerationExecutionSaved } from '@/type/generation';
import type { GenerationTask } from '@/type/generationTask';
import { usePhoneStore } from '@/store/phone';

/** What apps hand back for the success branch: the preview object plus the routes and labels around it. */
export interface ContentGenerationPreviewPlan<TPreview> {
  /** Label shown in the generation task session while the preview waits for confirmation. */
  completeLabel: string;
  /** Route params persisted with the preview draft and reused when the preview is reopened. */
  params?: Record<string, string>;
  /** Extra params for the page the phone opens right after the preview is ready. */
  presentParams?: Record<string, string>;
  preview: TPreview;
  resultTitle: string;
}

export interface ContentGenerationFlowOptions<TTarget, TResult, TSaveResult, TPreview> {
  appId: string;
  /** Snapshot of the rewrite target and form values, taken before the first await. */
  captureTarget: () => TTarget;
  /** App store write that swaps the preview object in. */
  applyPreview: (preview: TPreview) => void;
  onSaved?: (input: {
    result: GenerationExecutionSaved<TResult, TSaveResult>;
    target: TTarget;
    task: GenerationTask;
  }) => void;
  /** Persists the preview draft under the preview route params. */
  persistDraft: (params?: Record<string, string>) => void;
  planPreview: (input: {
    result: GenerationExecutionPreview<TResult>;
    target: TTarget;
  }) => ContentGenerationPreviewPlan<TPreview>;
  /** Phone page opened once the preview is ready. */
  present: { page: string; title: string };
  /** Runs the single-task generation; receives the snapshot so it never reads live route state. */
  run: (target: TTarget) => Promise<null | SingleGenerationRunOutcome<TResult, TSaveResult>>;
  session: SingleGenerationSession;
  setRawOutput: (rawOutput: string) => void;
}

export type ContentGenerationFlowResult = 'failed' | 'none' | 'preview' | 'saved';

/**
 * Runs the shared shape of a writing App's generate/rewrite action: snapshot the target, run the
 * single-task generation, then hand the failure, saved, or preview branch to the App's hooks.
 *
 * The snapshot happens before any await so a user who backs out or returns home mid-generation
 * keeps rewriting the original record instead of silently creating a new one.
 */
export async function runContentGenerationFlow<TTarget, TResult, TSaveResult, TPreview>(
  options: ContentGenerationFlowOptions<TTarget, TResult, TSaveResult, TPreview>,
): Promise<ContentGenerationFlowResult> {
  const target = options.captureTarget();
  const outcome = await options.run(target);
  if (!outcome) return 'none';

  const { result, task } = outcome;
  if (result.status === 'failed') {
    completeSingleGenerationFailedDraft({
      appId: options.appId,
      draftId: result.draft.id,
      rawOutput: result.rawOutput,
      session: options.session,
      setRawOutput: options.setRawOutput,
      taskId: task.id,
    });
    return 'failed';
  }

  if (result.status === 'saved') {
    options.onSaved?.({ result, target, task });
    return 'saved';
  }

  const plan = options.planPreview({ result, target });
  options.applyPreview(plan.preview);
  options.persistDraft(plan.params);
  options.session.complete(task.id, {
    currentLabel: plan.completeLabel,
    resultPage: 'preview',
    resultParams: plan.params,
    resultState: 'preview',
    resultTitle: plan.resultTitle,
  });
  void usePhoneStore().presentGeneratedPage(
    options.appId,
    options.present.page,
    options.present.title,
    plan.presentParams,
  );
  return 'preview';
}
