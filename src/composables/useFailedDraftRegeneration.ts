import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import { regenerateFailedGenerationDraft } from '@/core/generationService';
import type { FailedGenerationDraft } from '@/type/generation';
import type { Ref } from 'vue';
import { reportFailure } from '@/util/feedback';

export function useFailedDraftRegeneration(options: {
  draft: () => FailedGenerationDraft | null;
  rawOutput: Ref<string>;
  reparse: () => Promise<void> | void;
}) {
  return async function regenerateFailedDraft() {
    const draft = options.draft();
    if (!draft) return;
    try {
      const adapter = getRegisteredPhoneGenerationAdapter(draft.appId, draft.actionId);
      const result = await regenerateFailedGenerationDraft(adapter, draft, {
        lifecycle: {
          onRawOutput(rawOutput) {
            options.rawOutput.value = rawOutput;
          },
        },
      });
      options.rawOutput.value = result.rawOutput;
      if (result.status === 'failed') {
        toastr.warning(result.warnings.join('；') || '重新生成后仍未能解析');
        return;
      }
      await options.reparse();
    } catch (error) {
      reportFailure('重新生成', error);
    }
  };
}
