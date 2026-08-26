<template>
  <div class="pc-stepper">
    <button
      type="button"
      :disabled="value <= min"
      :aria-label="`${label}减一`"
      @click="$emit('update:value', value - 1)"
    >
      <i class="fa-solid fa-minus" aria-hidden="true"></i>
    </button>
    <output :aria-label="label">{{ value }}</output>
    <button
      type="button"
      :disabled="value >= max"
      :aria-label="`${label}加一`"
      @click="$emit('update:value', value + 1)"
    >
      <i class="fa-solid fa-plus" aria-hidden="true"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; max: number; min: number; value: number }>();
defineEmits<{ 'update:value': [value: number] }>();
</script>
