<template>
  <span class="pc-info-wrap">
    <button class="pc-info-btn" type="button" :aria-label="label" @click.stop="show">
      <i class="fa-solid fa-question"></i>
    </button>
  </span>
</template>

<script setup lang="ts">
import { usePhoneStore } from '@/store/phone';

const props = withDefaults(
  defineProps<{
    label?: string;
    text: string;
  }>(),
  {
    label: '说明',
  },
);

const phone = usePhoneStore();

function show() {
  phone.noticeInfo(props.text, {
    timeoutMs: 5600,
    title: props.label,
  });
}
</script>

<style scoped>
.pc-info-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  margin-left: 6px;
  vertical-align: middle;
}

.pc-info-btn {
  /* ui-reuse-allow: tiny hint trigger needs native button appearance reset. */
  appearance: none;
  -webkit-appearance: none;
  display: inline-grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border: 0;
  border-radius: 999px;
  padding: 0;
  background: color-mix(in srgb, var(--pc-theme-accent) 15%, var(--pc-surface-strong) 85%);
  color: var(--pc-theme-accent);
  cursor: pointer;
  font-size: 11px;
  line-height: 1;
}
</style>
