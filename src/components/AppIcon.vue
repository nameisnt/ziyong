<template>
  <img v-if="source && !failed" :src="source" alt="" @error="failed = true" />
  <svg v-else-if="identityIcon" class="pc-svg-app-icon pc-identity-svg-app-icon" viewBox="0 0 24 24" aria-hidden="true">
    <g class="pc-svg-icon-echo">
      <path v-for="(path, index) in identityIcon.primary" :key="`echo-primary-${index}`" :d="path" />
      <path v-for="(path, index) in identityIcon.accent || []" :key="`echo-accent-${index}`" :d="path" />
    </g>
    <g class="pc-svg-icon-primary">
      <path v-for="(path, index) in identityIcon.primary" :key="`primary-${index}`" :d="path" />
    </g>
    <g v-if="identityIcon.secondary" class="pc-svg-icon-secondary">
      <path v-for="(path, index) in identityIcon.secondary" :key="`secondary-${index}`" :d="path" />
    </g>
    <g v-if="identityIcon.accent" class="pc-svg-icon-accent">
      <path v-for="(path, index) in identityIcon.accent" :key="`accent-${index}`" :d="path" />
    </g>
  </svg>
  <svg v-else-if="svgPaths" class="pc-svg-app-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path v-for="path in svgPaths" :key="path" :d="path" />
  </svg>
  <i v-else class="fa-solid" :class="icon" aria-hidden="true"></i>
</template>

<script setup lang="ts">
import { getAppIdentitySvgIcon, getAppSvgIcon } from '@/data/appSvgIcons';

const props = defineProps<{ appId?: string; assetPath?: string; defaultIcon?: string; icon: string }>();
const failed = ref(false);
const identityIcon = computed(() => {
  if (!props.appId || !props.defaultIcon || props.icon !== props.defaultIcon) return null;
  return getAppIdentitySvgIcon(props.appId);
});
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
