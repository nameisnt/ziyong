import { useGenerationOverrideStore } from '@/store/generationOverrides';
import type { GenerationReplaySnapshot } from '@/type/generation';
import type { GenerationSourceMode } from '@/type/settings';
import { restoreGenerationReplayDraft, type ReplayGenerationDraft } from '@/util/generationReplay';
import type { TextProviderSelection } from '@/util/textProvider';
import type { Ref } from 'vue';

type ReplaySessionSnapshot = {
  connectionSelection: TextProviderSelection;
  sourceMode: GenerationSourceMode;
  tavernPresetName: string;
};

export function useGenerationReplaySession(options: {
  appId: string;
  defaultPresetName: () => string;
  page: string;
  sourceMode: Ref<GenerationSourceMode>;
}) {
  const generationOverrides = useGenerationOverrideStore();
  let snapshot: ReplaySessionSnapshot | null = null;

  function begin() {
    if (snapshot) return;
    const currentOverride = generationOverrides.getOverride(options.appId, options.page);
    snapshot = {
      connectionSelection: currentOverride?.connectionSelection || 'inherit',
      sourceMode: options.sourceMode.value,
      tavernPresetName: currentOverride?.tavernPresetName ?? options.defaultPresetName(),
    };
  }

  function applyLegacy(input: { sourceMode: GenerationSourceMode; tavernPresetName: string }) {
    begin();
    options.sourceMode.value = input.sourceMode;
    generationOverrides.setTavernPresetName(options.appId, options.page, input.tavernPresetName);
  }

  function applyReplay(replay: GenerationReplaySnapshot, draft: ReplayGenerationDraft) {
    begin();
    options.sourceMode.value = restoreGenerationReplayDraft(replay, draft);
    generationOverrides.setTavernPresetName(options.appId, options.page, replay.tavernPresetName);
    generationOverrides.setConnectionSelection(
      options.appId,
      options.page,
      replay.connectionSelection as TextProviderSelection,
    );
  }

  function release() {
    if (!snapshot) return;
    options.sourceMode.value = snapshot.sourceMode;
    generationOverrides.setTavernPresetName(options.appId, options.page, snapshot.tavernPresetName);
    generationOverrides.setConnectionSelection(options.appId, options.page, snapshot.connectionSelection);
    snapshot = null;
  }

  onScopeDispose(release);

  return {
    applyLegacy,
    applyReplay,
    release,
  };
}
