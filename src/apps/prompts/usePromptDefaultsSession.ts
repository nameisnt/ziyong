import { usePromptStore } from '@/store/prompts';

export type PromptValueKind = 'app' | 'special' | 'task';

export interface PromptDefaultTarget {
  defaultPrompt: string;
  key: string;
  kind: PromptValueKind;
  label: string;
}

export function usePromptDefaultsSession(options: {
  confirmNotice: (message: string, options: { confirmLabel: string; kind: 'warning' }) => Promise<boolean>;
  notify: { success: (message: string) => void };
}) {
  const prompts = usePromptStore();

  function updatePromptValue(item: Pick<PromptDefaultTarget, 'key' | 'kind'>, value: string) {
    if (item.kind === 'app') {
      prompts.updateAppPrompt(item.key, value);
      return;
    }
    if (item.kind === 'task') {
      prompts.updateTaskTemplate(item.key, value);
      return;
    }
    prompts.updateSpecialPrompt(item.key, value);
  }

  async function restoreDefaultPrompt(item: PromptDefaultTarget) {
    const shouldRestore = await options.confirmNotice(`要恢复“${item.label}”的默认提示词吗？`, {
      confirmLabel: '恢复',
      kind: 'warning',
    });
    if (!shouldRestore) return;
    updatePromptValue(item, item.defaultPrompt);
    options.notify.success('已恢复默认提示词');
  }

  async function resetDefaults() {
    const shouldReset = await options.confirmNotice(
      '要恢复默认提示词配置吗？当前 App 提示词、任务模板、输出与解析、类型提示词和快速短语都会被默认值覆盖。',
      { confirmLabel: '恢复', kind: 'warning' },
    );
    if (!shouldReset) return;
    prompts.resetDefaults();
    options.notify.success('已恢复默认提示词配置');
  }

  return { resetDefaults, restoreDefaultPrompt, updatePromptValue };
}
