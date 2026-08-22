<template>
  <div class="pc-external-profile-picker">
    <div class="pc-external-profile-mapping-row">
      <SearchableCombobox
        :model-value="mappingId"
        :disabled="disabled"
        empty-label="没有可用的资料映射"
        input-label="选择资料映射"
        :options="mappingOptions"
        placeholder="选择资料映射"
        toggle-title="展开资料映射"
        @update:model-value="selectMapping"
      />
      <button
        class="pc-icon-btn"
        type="button"
        :disabled="disabled || !mappingId || loading"
        aria-label="刷新外部资料"
        title="刷新外部资料"
        @click="refreshRows"
      >
        <i :class="['fa-solid', loading ? 'fa-spinner fa-spin' : 'fa-rotate']"></i>
      </button>
    </div>
    <SearchableCombobox
      :model-value="identityValue"
      :disabled="disabled || !mappingId || loading || Boolean(error)"
      empty-label="没有可选择的外部资料"
      input-label="选择外部资料"
      :options="rowOptions"
      :placeholder="mappingId ? '选择外部资料' : '请先选择资料映射'"
      toggle-title="展开外部资料"
      @update:model-value="selectIdentity"
    />
    <p v-if="error" class="pc-external-profile-error" role="alert">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { readExternalMappedRows, type ExternalMappedProfileRow } from '@/apps/profiles/profileConsumerBridge';
import { useExternalProfileMappingsStore } from '@/apps/profiles/profileMappings';
import { externalProfileReferenceKey } from '@/apps/profiles/profileReferences';
import SearchableCombobox from '@/components/SearchableCombobox.vue';

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    disabledReferenceKeys?: string[];
    identityValue: string;
    mappingId: string;
  }>(),
  {
    disabled: false,
    disabledReferenceKeys: () => [],
  },
);

const emit = defineEmits<{
  resolved: [value: { displayValue: string; profileIdentityValue: string; profileMappingId: string }];
  'update:identityValue': [value: string];
  'update:mappingId': [value: string];
}>();

const mappings = useExternalProfileMappingsStore();
const rows = ref<ExternalMappedProfileRow[]>([]);
const error = ref('');
const loading = ref(false);

const mappingOptions = computed(() => {
  const options = mappings.mappings.map(mapping => ({ label: mapping.name, value: mapping.id }));
  if (props.mappingId && !mappings.getMapping(props.mappingId)) {
    options.unshift({ label: '资料映射已失效', value: props.mappingId });
  }
  return [{ label: '不关联外部资料', value: '' }, ...options];
});

const rowOptions = computed(() => {
  const disabledKeys = new Set(props.disabledReferenceKeys);
  const options = rows.value.map(row => ({
    disabled: disabledKeys.has(
      externalProfileReferenceKey({
        profileIdentityValue: row.identityValue,
        profileMappingId: props.mappingId,
      }),
    ),
    label: row.displayValue.trim() || row.identityValue,
    value: row.identityValue,
  }));
  if (props.identityValue && !rows.value.some(row => row.identityValue === props.identityValue)) {
    options.unshift({ disabled: true, label: '外部资料已失效', value: props.identityValue });
  }
  return [{ disabled: false, label: '不关联外部资料', value: '' }, ...options];
});

watch(
  () => [mappings.scopeKey, props.mappingId] as const,
  () => refreshRows(),
  { immediate: true },
);

function selectMapping(value: string) {
  emit('update:mappingId', value);
  emit('update:identityValue', '');
}

function selectIdentity(value: string) {
  emit('update:identityValue', value);
  if (!value) return;
  const row = rows.value.find(item => item.identityValue === value);
  if (!row) return;
  emit('resolved', {
    displayValue: row.displayValue.trim() || row.identityValue,
    profileIdentityValue: row.identityValue,
    profileMappingId: props.mappingId,
  });
}

function refreshRows() {
  rows.value = [];
  error.value = '';
  if (!props.mappingId) return;
  const mapping = mappings.getMapping(props.mappingId);
  if (!mapping) {
    error.value = '资料映射已失效，请重新选择';
    return;
  }
  loading.value = true;
  try {
    rows.value = readExternalMappedRows(mapping);
    if (props.identityValue) {
      const row = rows.value.find(item => item.identityValue === props.identityValue);
      if (row) {
        emit('resolved', {
          displayValue: row.displayValue.trim() || row.identityValue,
          profileIdentityValue: row.identityValue,
          profileMappingId: props.mappingId,
        });
      }
    }
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '读取外部资料失败';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.pc-external-profile-picker {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.pc-external-profile-mapping-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}

.pc-external-profile-error {
  margin: 0;
  color: var(--pc-danger);
  font-size: 12px;
  line-height: 1.45;
}
</style>
