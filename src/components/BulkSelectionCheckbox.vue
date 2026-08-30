<template>
  <label class="pc-bulk-selection-checkbox" @click.stop>
    <input
      type="checkbox"
      :aria-label="label"
      :checked="modelValue"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span aria-hidden="true"><i class="fa-solid fa-check"></i></span>
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
  position: relative;
  display: inline-flex;
  flex: 0 0 28px;
  width: 28px;
  height: 36px;
  align-items: center;
  justify-content: center;
}

.pc-bulk-selection-checkbox input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.pc-bulk-selection-checkbox > span {
  display: grid;
  width: 18px;
  height: 18px;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--pc-text) 24%, var(--pc-border) 76%);
  border-radius: 5px;
  background: var(--pc-form-control-bg);
  color: transparent;
  font-size: 10px;
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease;
}

.pc-bulk-selection-checkbox input:checked + span {
  border-color: var(--pc-theme-accent);
  background: var(--pc-theme-accent);
  color: var(--pc-primary-text);
}

.pc-bulk-selection-checkbox input:focus-visible + span {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--pc-theme-accent) 16%, transparent);
}

.pc-bulk-selection-checkbox input:disabled + span {
  opacity: 0.48;
}
</style>
