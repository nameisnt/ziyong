<template>
  <div class="pc-detail-footer">
    <div v-if="showNavigation" class="pc-detail-nav">
      <button
        class="pc-soft-btn icon-only"
        type="button"
        :disabled="previousDisabled"
        :title="previousLabel"
        @click="$emit('previous')"
      >
        <i class="fa-solid fa-arrow-left"></i>
        <span>{{ previousLabel }}</span>
      </button>
      <button class="pc-soft-btn icon-only" type="button" :title="topLabel" @click="$emit('top')">
        <i class="fa-solid fa-arrow-up"></i>
        <span>{{ topLabel }}</span>
      </button>
      <button class="pc-soft-btn icon-only catalog" type="button" :title="catalogLabel" @click="$emit('catalog')">
        <i class="fa-solid fa-list"></i>
        <span>{{ catalogLabel }}</span>
      </button>
      <button class="pc-soft-btn icon-only" type="button" :title="bottomLabel" @click="$emit('bottom')">
        <i class="fa-solid fa-arrow-down"></i>
        <span>{{ bottomLabel }}</span>
      </button>
      <button
        class="pc-soft-btn icon-only"
        type="button"
        :disabled="nextDisabled"
        :title="nextLabel"
        @click="$emit('next')"
      >
        <i class="fa-solid fa-arrow-right"></i>
        <span>{{ nextLabel }}</span>
      </button>
    </div>
    <div v-if="$slots.actions" :class="['pc-detail-actions', actionsClass]">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    actionsClass?: string;
    bottomLabel?: string;
    catalogLabel?: string;
    nextDisabled?: boolean;
    nextLabel?: string;
    previousDisabled?: boolean;
    previousLabel?: string;
    showNavigation?: boolean;
    topLabel?: string;
  }>(),
  {
    actionsClass: '',
    bottomLabel: '置底',
    catalogLabel: '目录',
    nextDisabled: false,
    nextLabel: '下一章',
    previousDisabled: false,
    previousLabel: '上一章',
    showNavigation: true,
    topLabel: '置顶',
  },
);

defineEmits<{
  (event: 'bottom'): void;
  (event: 'catalog'): void;
  (event: 'next'): void;
  (event: 'previous'): void;
  (event: 'top'): void;
}>();
</script>

<style scoped>
.pc-detail-footer {
  position: static;
  z-index: 2;
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 7px;
  margin-top: 0;
  padding: 6px;
  border: 1px solid var(--pc-border);
  border-bottom: 0;
  border-radius: min(var(--pc-control-radius), 8px);
  background: color-mix(in srgb, var(--pc-form-control-bg) 78%, transparent 22%);
  box-shadow: 0 -8px 18px color-mix(in srgb, var(--pc-text) 10%, transparent 90%);
}

.pc-detail-nav,
.pc-detail-actions {
  display: grid;
  gap: 7px;
  margin-top: 0;
}

.pc-detail-nav {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.pc-detail-nav .pc-soft-btn.catalog {
  grid-column: 3;
}

.pc-detail-actions {
  grid-template-columns: repeat(auto-fit, minmax(34px, 1fr));
}

.pc-detail-actions.three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.pc-detail-actions.five {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.pc-detail-actions.six {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.pc-detail-actions.seven {
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

/* ui-reuse-allow: UI-DETAIL-FOOTER-001 normalizes slotted buttons from mixed callers. */
.pc-detail-nav .pc-soft-btn,
.pc-detail-actions :deep(.pc-soft-btn) {
  /* ui-reuse-allow: UI-DETAIL-FOOTER-001 normalizes slotted buttons from mixed callers. */
  appearance: none;
  -webkit-appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 100%;
  min-width: 0;
  height: 34px;
  min-height: 34px;
  margin-top: 0;
  border: 0;
  border-radius: 12px;
  padding: 0 8px;
  background: color-mix(in srgb, var(--pc-soft-button-bg) 58%, transparent 42%);
  color: var(--pc-text);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  line-height: 1;
}

.pc-detail-nav .pc-soft-btn span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-detail-nav .pc-soft-btn.icon-only span,
.pc-detail-actions :deep(.pc-soft-btn span) {
  display: none;
}

.pc-detail-nav .pc-soft-btn:disabled,
.pc-detail-actions :deep(.pc-soft-btn:disabled) {
  opacity: 0.46;
  cursor: default;
}

.pc-detail-actions :deep(.pc-soft-btn.active) {
  background: color-mix(in srgb, var(--pc-danger) 14%, transparent 86%);
}

.pc-detail-actions :deep(.pc-soft-btn.active i) {
  color: var(--pc-danger);
}

.pc-detail-actions :deep(.pc-soft-btn.danger) {
  color: var(--pc-danger);
}
</style>
