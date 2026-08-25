<template>
  <label class="pc-bulk-selection-checkbox" @click.stop>
    <input
      type="checkbox"
      :aria-label="label"
      :checked="modelValue"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
  </label>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string;
    modelValue: boolean;
  }>(),
  { label: '选择记录' },
);

defineEmits<{ 'update:modelValue': [selected: boolean] }>();
</script>

<style scoped>
.pc-bulk-selection-checkbox {
  display: inline-flex;
  flex: 0 0 28px;
  width: 28px;
  height: 36px;
  align-items: center;
  justify-content: center;
}

.pc-bulk-selection-checkbox input {
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: var(--pc-theme-accent);
}
</style>
