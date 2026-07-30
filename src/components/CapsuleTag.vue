<template>
  <button
    v-if="interactive"
    class="pc-capsule-tag"
    type="button"
    :aria-pressed="active"
    :class="{ active, compact }"
    :disabled="disabled"
    :title="title || label"
    @click="$emit('click')"
  >
    <i v-if="icon" :class="icon"></i>
    <span>{{ label }}</span>
    <small v-if="count !== undefined">{{ count }}</small>
  </button>
  <span v-else class="pc-capsule-tag" :class="{ active, compact }" :title="title || label">
    <i v-if="icon" :class="icon"></i>
    <span>{{ label }}</span>
    <small v-if="count !== undefined">{{ count }}</small>
  </span>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    active?: boolean;
    compact?: boolean;
    count?: number;
    disabled?: boolean;
    icon?: string;
    interactive?: boolean;
    label: string;
    title?: string;
  }>(),
  {
    active: false,
    compact: false,
    count: undefined,
    disabled: false,
    icon: '',
    interactive: true,
    title: '',
  },
);

defineEmits<{
  click: [];
}>();
</script>

<style scoped>
.pc-capsule-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  min-height: 32px;
  border: 0;
  border-radius: 999px;
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  cursor: default;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.2;
  padding: 7px 11px;
}

button.pc-capsule-tag {
  cursor: pointer;
}

.pc-capsule-tag span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-capsule-tag small {
  display: inline-grid;
  min-width: 18px;
  height: 18px;
  place-items: center;
  border-radius: 999px;
  background: var(--pc-bg);
  color: var(--pc-muted);
  font-size: 10px;
  font-weight: 800;
  padding: 0 5px;
}

.pc-capsule-tag.compact {
  min-height: 26px;
  padding: 5px 8px;
  font-size: 11px;
}

.pc-capsule-tag.active,
button.pc-capsule-tag:hover {
  background: color-mix(in srgb, var(--pc-theme-accent) 18%, var(--pc-surface-strong) 82%);
  color: var(--pc-theme-accent);
}

button.pc-capsule-tag:active {
  transform: scale(0.98);
}

button.pc-capsule-tag:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  transform: none;
}
</style>
