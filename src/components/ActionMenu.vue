<template>
  <details ref="menu" class="pc-action-menu">
    <summary class="pc-soft-btn compact" :aria-label="label">
      <i :class="icon"></i>
      <span>{{ label }}</span>
      <i class="fa-solid fa-chevron-down pc-action-menu-chevron"></i>
    </summary>
    <div class="pc-action-menu-panel" @click="closeAfterAction">
      <slot />
    </div>
  </details>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

withDefaults(
  defineProps<{
    icon?: string;
    label: string;
  }>(),
  {
    icon: 'fa-solid fa-ellipsis',
  },
);

const menu = ref<HTMLDetailsElement>();

function closeAfterAction(event: MouseEvent) {
  const button = (event.target as HTMLElement).closest('button');
  if (button && !button.disabled && menu.value) menu.value.open = false;
}

function closeFromOutside(event: PointerEvent) {
  const target = event.target;
  if (menu.value?.open && target instanceof Node && !menu.value.contains(target)) menu.value.open = false;
}

function closeFromKeyboard(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !menu.value?.open) return;
  event.preventDefault();
  menu.value.open = false;
}

function closeFromPhoneBack(event: Event) {
  if (!menu.value?.open) return;
  event.preventDefault();
  menu.value.open = false;
}

onMounted(() => {
  document.addEventListener('pointerdown', closeFromOutside);
  window.addEventListener('keydown', closeFromKeyboard);
  window.addEventListener('phone-before-back', closeFromPhoneBack);
});
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', closeFromOutside);
  window.removeEventListener('keydown', closeFromKeyboard);
  window.removeEventListener('phone-before-back', closeFromPhoneBack);
});
</script>

<style scoped>
.pc-action-menu {
  position: relative;
  z-index: 4;
  flex: 0 0 auto;
}

.pc-action-menu > summary {
  list-style: none;
  white-space: nowrap;
}

.pc-action-menu > summary::-webkit-details-marker {
  display: none;
}

.pc-action-menu-chevron {
  font-size: 10px;
  transition: transform 0.16s ease;
}

.pc-action-menu[open] .pc-action-menu-chevron {
  transform: rotate(180deg);
}

.pc-action-menu-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 5;
  display: grid;
  width: max-content;
  min-width: 156px;
  max-width: min(220px, calc(100vw - 32px));
  max-height: min(60vh, 320px);
  overflow-y: auto;
  gap: 4px;
  padding: 6px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  background: var(--pc-form-control-bg);
  color: var(--pc-form-control-text);
  box-shadow: 0 12px 28px color-mix(in srgb, var(--pc-text) 18%, transparent 82%);
}

.pc-action-menu-panel :deep(button) {
  /* ui-reuse-allow: menu rows are option items, not standalone action buttons. */
  display: flex;
  min-height: 38px;
  align-items: center;
  gap: 10px;
  border: 0;
  border-radius: calc(var(--pc-control-radius) - 4px);
  padding: 9px 12px;
  background: transparent;
  color: var(--pc-form-control-text);
  cursor: pointer;
  font-weight: 750;
  line-height: 1.35;
  text-align: left;
  overflow-wrap: anywhere;
  white-space: normal;
}

.pc-action-menu-panel :deep(button > span) {
  min-width: 0;
}

.pc-action-menu-panel :deep(button:hover) {
  background: color-mix(in srgb, var(--pc-form-control-text) 10%, var(--pc-form-control-bg) 90%);
}

.pc-action-menu-panel :deep(button:disabled) {
  cursor: default;
  opacity: 0.45;
}

.pc-action-menu-panel :deep(button.danger) {
  color: var(--pc-danger);
}
</style>
