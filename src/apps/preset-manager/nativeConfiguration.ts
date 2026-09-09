import { buildPresetDisplayNodes, type TavernPreset } from './api';
import { setNativePromptGroupingEnabled, setPresetPromptGroupSelectionMode } from './promptGroups';

export function nativeGroupingConflicts(preset: TavernPreset) {
  return buildPresetDisplayNodes(preset)
    .filter(
      node =>
        node.type === 'group' &&
        node.group.selectionMode === 'single' &&
        node.prompts.filter(prompt => prompt.enabled).length > 1,
    )
    .flatMap(node =>
      node.type === 'group' ? [{ id: node.group.id, name: node.group.name, prompts: node.prompts }] : [],
    );
}

export function configureNativeGrouping(preset: TavernPreset, enabled: boolean, retained: Record<string, string>) {
  if (enabled) {
    for (const node of buildPresetDisplayNodes(preset)) {
      if (node.type !== 'group' || node.group.selectionMode !== 'single') continue;
      if (Object.hasOwn(retained, node.group.id)) {
        setPresetPromptGroupSelectionMode(preset, preset.prompts, node.group.id, 'single', retained[node.group.id]);
      }
    }
    const conflicts = nativeGroupingConflicts(preset);
    if (conflicts.length) throw new Error(`单选组“${conflicts[0].name}”有多个启用条目，请选择保留项后重试`);
  }
  setNativePromptGroupingEnabled(
    preset,
    preset.prompts.map(prompt => prompt.id),
    enabled,
  );
}
