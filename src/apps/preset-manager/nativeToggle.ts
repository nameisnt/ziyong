import { applyPresetPromptSelection, getSinglePromptGroupMembers, isNativePromptGroupingEnabled } from './promptGroups';

type NativeOrderEntry = { identifier: string; enabled: boolean };
export type NativePromptManager = {
  activeCharacter: unknown;
  containerElement: HTMLElement;
  configuration: { prefix: string };
  serviceSettings: { extensions?: unknown };
  getPromptOrderForCharacter: (character: unknown) => NativeOrderEntry[];
  tokenHandler: { getCounts: () => Record<string, unknown> };
};

export function installNativePromptToggle(options: {
  document: Document;
  getManager: () => NativePromptManager | null;
  beforeChange: (states: Record<string, boolean>) => void;
  onError: (error: unknown) => void;
}) {
  const onClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const toggle = target.closest('.prompt-manager-toggle-action');
    if (!toggle) return;
    const manager = options.getManager();
    if (!manager || !manager.containerElement.contains(toggle)) return;
    if (!isNativePromptGroupingEnabled(manager.serviceSettings)) return;
    try {
      const row = toggle.closest<HTMLElement>(`.${manager.configuration.prefix}prompt_manager_prompt`);
      const promptId = row?.dataset.pmIdentifier;
      if (!promptId) return;
      const order = manager.getPromptOrderForCharacter(manager.activeCharacter);
      const entry = order.find(item => item.identifier === promptId);
      if (!entry) throw new Error('酒馆条目已变化，请刷新预设列表后重试');
      const memberIds = getSinglePromptGroupMembers(
        manager.serviceSettings,
        order.map(item => item.identifier),
        promptId,
      );
      if (!memberIds.length) return;
      const members = new Set(memberIds);
      const prompts = order.map(item => ({ id: item.identifier, enabled: item.enabled }));
      applyPresetPromptSelection(manager.serviceSettings, prompts, promptId, !entry.enabled);
      const counts = manager.tokenHandler.getCounts();
      options.beforeChange(
        Object.fromEntries(
          order.filter(item => members.has(item.identifier)).map(item => [item.identifier, item.enabled]),
        ),
      );
      // Prepare peers synchronously; the original handler toggles the target and renders/saves exactly once.
      order.forEach((item, index) => {
        if (item.identifier !== promptId && item.enabled !== prompts[index].enabled) {
          item.enabled = prompts[index].enabled;
          counts[item.identifier] = null;
        }
      });
    } catch (error) {
      event.preventDefault();
      event.stopImmediatePropagation();
      options.onError(error);
    }
  };
  options.document.addEventListener('click', onClick, true);
  return () => options.document.removeEventListener('click', onClick, true);
}
