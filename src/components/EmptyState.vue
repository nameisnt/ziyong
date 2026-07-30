<template>
  <div :class="compact ? 'pc-mini-empty' : 'pc-empty'">
    <template v-if="compact">
      <slot>{{ title }}</slot>
    </template>
    <template v-else>
      <strong>{{ title }}</strong>
      <slot></slot>
    </template>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  compact?: boolean;
  title: string;
}>(), {
  compact: false,
});
</script>

<style scoped>
.pc-empty {
  display: grid;
  place-items: center;
  min-height: 96px;
  padding: 16px;
  border: 1px solid var(--pc-border);
  border-radius: 18px;
  background: color-mix(in srgb, var(--pc-surface) 72%, transparent 28%);
  color: var(--pc-muted);
  text-align: center;
}

.pc-empty strong {
  color: var(--pc-text);
  font-size: 16px;
}

.pc-empty p {
  margin: 6px 0 0;
  color: var(--pc-muted);
  font-size: 13px;
}

.pc-mini-empty {
  padding: 10px 12px;
  border: 1px dashed var(--pc-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--pc-surface) 50%, transparent 50%);
  color: var(--pc-muted);
  font-size: 13px;
  text-align: center;
}
</style>
