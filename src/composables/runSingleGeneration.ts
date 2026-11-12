import type { GenerateContentOptions } from '@/core/generationService';
import { generateContent } from '@/core/generationService';
import type { SingleGenerationTaskCreateOverrides, useSingleGenerationTaskSession } from '@/composables/useSingleGenerationTaskSession';
import { usePhoneStore } from '@/store/phone';
import type { GenerationAdapter, GenerationExecutionResult } from '@/type/generation';
import type { GenerationTask } from '@/type/generationTask';
import { reportFailure } from '@/util/feedback';
import type { GenerationReferenceItem } from '@/util/references';

type SingleGenerationSession = ReturnType<typeof useSingleGenerationTaskSession>;

export interface SingleGenerationRunSettings {
  generationDefaults: GenerateContentOptions['generationDefaults'];
  referenceItems?: GenerationReferenceItem[];
  references?: string;
  source: GenerateContentOptions['source'];
  textProvider: GenerateContentOptions['textProvider'];
}

export interface SingleGenerationRunOptions<TConfig, TResult, TSaveResult = { entityId: string }> {
  adapter: GenerationAdapter<TConfig, TResult, TSaveResult>;
  createFailedDraft: GenerateContentOptions['createFailedDraft'];
  createOverrides: SingleGenerationTaskCreateOverrides & { title: string };
  /** Used when the run session itself cannot be created. */
  failureLabel: string;
  payload: () => TConfig;
  resetPreview: () => void;
  session: SingleGenerationSession;
  settings: SingleGenerationRunSettings;
  /** Return an error message to fail the task before any request is sent. */
  validate?: () => null | string;
}

export interface SingleGenerationRunOutcome<TResult, TSaveResult> {
  result: GenerationExecutionResult<TResult, TSaveResult>;
  task: GenerationTask;
}

/**
 * Runs the shared part of one single-task generation: create the task session, validate the form,
 * drop stale previews, forward the request with the session lifecycle, and fail the task when the
 * request throws. Business payload and result materialization stay in the calling App.
 */
export async function runSingleGeneration<TConfig, TResult, TSaveResult = { entityId: string }>(
  options: SingleGenerationRunOptions<TConfig, TResult, TSaveResult>,
): Promise<null | SingleGenerationRunOutcome<TResult, TSaveResult>> {
  let task: GenerationTask | null = null;
  try {
    task = options.session.create(options.createOverrides);
  } catch (error) {
    reportFailure(options.failureLabel, error);
    return null;
  }

  const validationMessage = options.validate?.() ?? null;
  if (validationMessage) {
    options.session.fail(task.id, new Error(validationMessage));
    return null;
  }

  options.resetPreview();
  try {
    const result = await generateContent(options.adapter, options.payload(), {
      createFailedDraft: options.createFailedDraft,
      generationDefaults: options.settings.generationDefaults,
      referenceItems: options.settings.referenceItems,
      references: options.settings.references,
      lifecycle: options.session.lifecycle(task.id),
      source: options.settings.source,
      textProvider: options.settings.textProvider,
    });
    return { result, task };
  } catch (error) {
    options.session.fail(task.id, error);
    return null;
  }
}

export interface SingleGenerationFailedDraftOptions {
  appId: string;
  draftId: string;
  rawOutput: string;
  session: SingleGenerationSession;
  setRawOutput: (rawOutput: string) => void;
  taskId: string;
}

/** Persists the failed-draft branch shared by every single-task generation App. */
export function completeSingleGenerationFailedDraft(options: SingleGenerationFailedDraftOptions): void {
  options.setRawOutput(options.rawOutput);
  options.session.complete(options.taskId, {
    currentLabel: '解析失败草稿已保留',
    resultPage: 'failed-draft',
    resultParams: { draftId: options.draftId },
    resultState: 'failed-draft',
    resultTitle: '解析失败草稿',
  });
  toastr.warning('XML 解析失败，已保存到失败草稿');
  void usePhoneStore().presentGeneratedPage(options.appId, 'failed-draft', '解析失败草稿', {
    draftId: options.draftId,
  });
}
