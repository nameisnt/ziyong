import type { NativePromptManager } from '@/apps/preset-manager/nativeToggle';

export let promptManager: NativePromptManager | null = null;
export function setVisualPromptManager(manager: NativePromptManager | null) {
  promptManager = manager;
}
