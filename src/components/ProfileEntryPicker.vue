<template>
  <div :class="['pc-profile-entry-picker', { 'without-open': !showOpenButton }]">
    <SearchableCombobox
      :disabled="disabled"
      :empty-label="t`没有可选资料`"
      :input-label="t`选择关联资料`"
      :model-value="modelValue"
      :options="options"
      :placeholder="placeholder"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <button
      v-if="showOpenButton"
      class="pc-icon-btn"
      type="button"
      :disabled="!selectedEntry"
      :title="selectedEntry ? t`查看资料` : t`尚未关联资料`"
      @click="openSelectedEntry"
    >
      <i class="fa-solid fa-address-card"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import {
  getProfileKindLabel,
  useProfilesStore,
  type ProfileKind,
} from '@/apps/profiles/store';
import { usePhoneStore } from '@/store/phone';

const props = withDefaults(defineProps<{
  disabled?: boolean;
  disabledIds?: string[];
  emptyLabel?: string;
  kinds?: ProfileKind[];
  modelValue: string;
  placeholder?: string;
  showOpenButton?: boolean;
}>(), {
  disabled: false,
  disabledIds: () => [],
  emptyLabel: '不关联资料',
  kinds: () => [],
  placeholder: '选择人物资料',
  showOpenButton: true,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const phone = usePhoneStore();
const profiles = useProfilesStore();
const selectedEntry = computed(() => profiles.getEntry(props.modelValue));
const allowedKinds = computed(() => new Set(props.kinds));
const disabledIds = computed(() => new Set(props.disabledIds));
const options = computed(() => {
  const entries = profiles.entries
    .filter(entry => !allowedKinds.value.size || allowedKinds.value.has(entry.kind))
    .map(entry => ({
      disabled: entry.id !== props.modelValue && disabledIds.value.has(entry.id),
      label: `${entry.title} · ${getProfileKindLabel(entry.kind)}`,
      value: entry.id,
    }));

  if (props.modelValue && !selectedEntry.value) {
    entries.unshift({
      disabled: false,
      label: '资料已失效',
      value: props.modelValue,
    });
  }

  return [
    { disabled: false, label: props.emptyLabel, value: '' },
    ...entries,
  ];
});

function openSelectedEntry() {
  const entry = selectedEntry.value;
  if (!entry) return;
  phone.pushRoute('profiles', 'entry', entry.title, { entryId: entry.id });
}
</script>

<style scoped>
.pc-profile-entry-picker {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 40px;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.pc-profile-entry-picker.without-open {
  grid-template-columns: minmax(0, 1fr);
}
</style>
