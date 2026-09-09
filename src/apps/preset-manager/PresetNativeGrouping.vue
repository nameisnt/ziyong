<template>
  <section class="pc-native-grouping">
    <div class="pc-compact-toolbar">
      <span
        >应用到酒馆条目开关<InfoHint
          label="酒馆条目联动"
          text="仅此预设生效。在酒馆原生列表开启单选组的一项时，会关闭同组其他项；允许全部关闭。关闭阅读器窗口仍生效。手动切换不会改写已保存的聊天绑定。"
      /></span>
      <label class="pc-toggle">
        <input
          type="checkbox"
          aria-label="应用到酒馆条目开关"
          :checked="enabled"
          :disabled="disabled || checking"
          @change="requestChange"
        />
        <span aria-hidden="true"></span>
      </label>
    </div>
    <p v-if="error || native.error" class="pc-native-grouping-error" role="alert">{{ error || native.error }}</p>
    <div v-if="conflicts.length" class="pc-native-conflicts">
      <fieldset v-for="group in conflicts" :key="group.id" class="pc-native-conflict">
        <legend>{{ group.name }}：保留一个启用条目</legend>
        <label
          ><input
            v-model="retained[group.id]"
            type="radio"
            :name="`native-${group.id}`"
            value=""
            :disabled="disabled"
          />全部关闭</label
        >
        <label v-for="prompt in group.prompts" :key="prompt.id">
          <input
            v-model="retained[group.id]"
            type="radio"
            :name="`native-${group.id}`"
            :value="prompt.id"
            :disabled="disabled"
          />{{ prompt.name || prompt.id }}
        </label>
      </fieldset>
      <div class="pc-form-actions">
        <button class="pc-soft-btn" type="button" :disabled="disabled" @click="cancel">取消</button>
        <button
          class="pc-primary-btn"
          type="button"
          :disabled="disabled || !conflicts.every(group => Object.hasOwn(retained, group.id))"
          @click="emit('change', true, { ...retained })"
        >
          确认开启
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import InfoHint from '@/components/InfoHint.vue';
import { getCurrentTavernPresetName, readTavernPreset, type TavernPreset } from './api';
import { nativeGroupingConflicts } from './nativeConfiguration';
import { isNativePromptGroupingEnabled } from './promptGroups';
import { useNativePresetGroups } from './nativeGroups';

const props = defineProps<{ preset: TavernPreset; presetName: string; disabled: boolean }>();
const emit = defineEmits<{ change: [enabled: boolean, retained: Record<string, string>] }>();
const native = useNativePresetGroups();
const enabled = computed(() => isNativePromptGroupingEnabled(props.preset));
const conflicts = ref<ReturnType<typeof nativeGroupingConflicts>>([]);
const retained = ref<Record<string, string>>({});
const checking = ref(false);
const error = ref('');
let mounted = true;
onBeforeUnmount(() => {
  mounted = false;
});

function cancel() {
  conflicts.value = [];
  retained.value = {};
}

async function requestChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const next = input.checked;
  input.checked = enabled.value;
  cancel();
  error.value = '';
  if (!next) {
    emit('change', false, {});
    return;
  }
  checking.value = true;
  const name = props.presetName;
  try {
    await native.ensureReady();
    if (!mounted || props.presetName !== name) return;
    const source = readTavernPreset(name);
    const snapshots = [source];
    if (getCurrentTavernPresetName() === name) snapshots.push(readTavernPreset('in_use'));
    const byId = new Map<string, ReturnType<typeof nativeGroupingConflicts>[number]>();
    for (const snapshot of snapshots) {
      for (const group of nativeGroupingConflicts(snapshot)) byId.set(group.id, group);
    }
    conflicts.value = [...byId.values()];
    if (!conflicts.value.length) emit('change', true, {});
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : String(caught);
  } finally {
    checking.value = false;
  }
}

watch([enabled, () => props.presetName], cancel);
</script>

<style scoped>
.pc-native-grouping,
.pc-native-conflicts,
.pc-native-conflict {
  display: grid;
  min-width: 0;
  gap: 8px;
}
.pc-native-grouping {
  padding-block: 8px;
  border-bottom: 1px solid var(--pc-border);
}
.pc-native-grouping-error {
  margin: 0;
  color: var(--pc-danger);
  overflow-wrap: anywhere;
}
.pc-native-conflict {
  margin: 0;
  padding: 8px 0;
  border: 0;
}
.pc-native-conflict label {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-wrap: anywhere;
}
</style>
