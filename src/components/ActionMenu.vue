<template>
  <details ref="menu" :class="['pc-action-menu', `align-${align}`, { 'icon-only': iconOnly }]">
    <summary
      :class="iconOnly ? 'pc-icon-btn' : 'pc-soft-btn compact'"
      :aria-label="label"
      :title="iconOnly ? label : undefined"
    >
      <i :class="icon"></i>
      <span v-if="!iconOnly">{{ label }}</span>
      <i v-if="!iconOnly" class="fa-solid fa-chevron-down pc-action-menu-chevron"></i>
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
    align?: 'end' | 'start';
    icon?: string;
    iconOnly?: boolean;
    label: string;
  }>(),
  {
    align: 'end',
    icon: 'fa-solid fa-ellipsis',
    iconOnly: false,
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
  top: calc(100% + 6px);
  right: 0;
  z-index: 5;
  display: grid;
  width: max-content;
  min-width: 156px;
  max-width: 220px;
  max-height: 320px;
  overflow-y: auto;
  gap: 2px;
  padding: 4px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  background: var(--pc-form-control-bg);
  color: var(--pc-form-control-text);
  box-shadow: 0 12px 28px color-mix(in srgb, var(--pc-text) 18%, transparent 82%);
}

.pc-action-menu-panel :deep(button) {
  /* ui-reuse-allow: menu rows are option items, not standalone action buttons. */
  display: flex;
  min-height: 28px;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: calc(var(--pc-control-radius) - 4px);
  padding: 5px 8px;
  background: transparent;
  color: var(--pc-form-control-text);
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.25;
  text-align: left;
  overflow-wrap: anywhere;
  white-space: normal;
}

.pc-action-menu-panel :deep(button > i) {
  width: 14px;
  flex: 0 0 14px;
  font-size: 12px;
  text-align: center;
}

.pc-action-menu.align-start .pc-action-menu-panel {
  right: auto;
  left: 0;
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
