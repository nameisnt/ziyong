<template>
  <div :class="['pc-generation-provider-fields', { compact }]">
    <div class="pc-select-field">
      <label class="pc-field-label">本次连接</label>
      <SearchableCombobox
        :disabled="disabled"
        empty-label="没有可用的连接配置"
        input-label="选择本次连接"
        :model-value="connectionSelection"
        :options="connectionOptions"
        placeholder="选择本次连接"
        toggle-title="展开连接配置"
        @update:model-value="emit('update:connectionSelection', $event as TextProviderSelection)"
      />
    </div>

    <div v-if="showPresetSelector" class="pc-select-field pc-preset-field">
      <label class="pc-field-label">本次预设</label>
      <div class="pc-preset-select-row">
        <SearchableCombobox
          :disabled="disabled"
          empty-label="没有匹配的预设"
          input-label="选择本次预设"
          :model-value="tavernPresetName"
          :options="presetOptions"
          placeholder="跟随酒馆当前预设"
          toggle-title="展开预设列表"
          @update:model-value="emit('update:tavernPresetName', $event)"
        />
        <button
          class="pc-icon-btn"
          type="button"
          :disabled="disabled"
          title="刷新预设列表"
          aria-label="刷新预设列表"
          @click="refreshPresetNames"
        >
          <i class="fa-solid fa-rotate"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { pluginPresetIdFromSelection, pluginPresetSelection } from '@/apps/preset-manager/pluginPreset';
import { usePluginPresetStore } from '@/store/pluginPresets';
import { useSettingsStore } from '@/store/settings';
import { getPresetNamesSafe } from '@/util/runtime';
import type { TextProviderSelection } from '@/util/textProvider';
import { storeToRefs } from 'pinia';

const props = withDefaults(
  defineProps<{
    connectionSelection: TextProviderSelection;
    compact?: boolean;
    disabled?: boolean;
    showPresetSelector?: boolean;
    tavernPresetName: string;
  }>(),
  {
    compact: false,
    disabled: false,
    showPresetSelector: true,
  },
);

const emit = defineEmits<{
  'update:connectionSelection': [value: TextProviderSelection];
  'update:tavernPresetName': [value: string];
}>();

const settingsStore = useSettingsStore();
const pluginPresets = usePluginPresetStore();
const { settings } = storeToRefs(settingsStore);
const { items: pluginPresetItems } = storeToRefs(pluginPresets);
const tavernPresetNames = ref<string[]>([]);

const connectionOptions = computed(() => [
  { label: '酒馆当前 API', value: 'tavern' },
  ...settings.value.textProvider.externalProfiles.map(profile => ({
    label: profile.name,
    value: `external:${profile.id}`,
  })),
  ...(props.connectionSelection.startsWith('external:') &&
  !settings.value.textProvider.externalProfiles.some(profile => `external:${profile.id}` === props.connectionSelection)
    ? [{ label: '连接配置已失效', value: props.connectionSelection }]
    : []),
]);

const presetOptions = computed(() => [
  { label: '跟随酒馆当前预设', value: '' },
  ...pluginPresetItems.value.map(preset => ({
    group: '插件预设',
    label: preset.name,
    value: pluginPresetSelection(preset.id),
  })),
  ...tavernPresetNames.value.map(name => ({ group: '酒馆预设', label: name, value: name })),
]);

function refreshPresetNames() {
  tavernPresetNames.value = getPresetNamesSafe();
  const selected = props.tavernPresetName.trim();
  if (selected && !pluginPresetIdFromSelection(selected) && !tavernPresetNames.value.includes(selected)) {
    tavernPresetNames.value = [selected, ...tavernPresetNames.value];
  }
}

onMounted(refreshPresetNames);
</script>

<style scoped>
.pc-generation-provider-fields {
  display: grid;
  gap: 14px;
  min-width: 0;
  margin-top: 14px;
}

.pc-generation-provider-fields.compact {
  margin-top: 0;
}

.pc-generation-provider-fields > .pc-select-field {
  margin-top: 0;
}
</style>
