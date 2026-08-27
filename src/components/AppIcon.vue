<template>
  <img v-if="source && !failed" :src="source" alt="" @error="failed = true" />
  <svg v-else-if="svgPaths" class="pc-svg-app-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path v-for="path in svgPaths" :key="path" :d="path" />
  </svg>
  <i v-else class="fa-solid" :class="icon" aria-hidden="true"></i>
</template>

<script setup lang="ts">
import { getAppSvgIcon } from '@/data/appSvgIcons';

const props = defineProps<{ assetPath?: string; icon: string }>();
const failed = ref(false);
const svgPaths = computed(() => getAppSvgIcon(props.icon));
const source = computed(() => {
  const path = props.assetPath?.trim() || '';
  if (!path || /^(?:data:|blob:|https?:\/\/|\/)/i.test(path)) return path;
  return `/${path}`;
});
watch(
  () => props.assetPath,
  () => {
    failed.value = false;
  },
);
</script>
