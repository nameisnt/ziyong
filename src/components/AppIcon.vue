<template>
  <img v-if="source && !sourceFailed" :src="source" alt="" decoding="async" @error="sourceFailed = true" />
  <template v-else>
    <img
      v-if="identityImage && !identityImageFailed"
      :src="identityImage"
      class="pc-app-identity-image"
      alt=""
      decoding="async"
      @error="identityImageFailed = true"
    />
    <svg
      v-else-if="identityIcon"
      class="pc-svg-app-icon pc-identity-svg-app-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <g :class="['pc-svg-paper-variant', `pc-svg-paper-variant-${paper}`]">
        <g class="pc-svg-icon-echo">
          <path v-for="(path, index) in identityIcon.primary" :key="`echo-primary-${index}`" :d="path" />
          <path v-for="(path, index) in identityIcon.accent || []" :key="`echo-accent-${index}`" :d="path" />
        </g>
        <g v-if="identityIcon.fills" class="pc-svg-icon-fill">
          <path v-for="(path, index) in identityIcon.fills" :key="`fill-${index}`" :d="path" />
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
      </g>
    </svg>
    <svg v-else-if="svgPaths" class="pc-svg-app-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path v-for="path in svgPaths" :key="path" :d="path" />
    </svg>
    <i v-else class="fa-solid" :class="icon" aria-hidden="true"></i>
  </template>
</template>

<script setup lang="ts">
import { getAppIdentityImageIcon, type AppImagePaper } from '@/data/appIdentityImageIcons';
import { getAppIdentitySvgIcon, getAppSvgIcon } from '@/data/appSvgIcons';
import { useSettingsStore } from '@/store/settings';

const props = defineProps<{ appId?: string; assetPath?: string; defaultIcon?: string; icon: string }>();
const settingsStore = useSettingsStore();
const sourceFailed = ref(false);
const identityImageFailed = ref(false);
const paper = computed(() => settingsStore.settings.visualTheme.paperTextureId);
const identityIcon = computed(() => {
  if (!props.appId || !props.defaultIcon || props.icon !== props.defaultIcon) return null;
  const icon = getAppIdentitySvgIcon(props.appId);
  return icon?.paperVariants?.[paper.value] ?? icon;
});
const identityImage = computed(() => {
  if (!props.appId || !props.defaultIcon || props.icon !== props.defaultIcon) return '';
  return getAppIdentityImageIcon(props.appId)?.[paper.value as AppImagePaper] ?? '';
});
const svgPaths = computed(() => getAppSvgIcon(props.icon));
const source = computed(() => {
  const path = props.assetPath?.trim() || '';
  if (!path || /^(?:data:|blob:|https?:\/\/|\/)/i.test(path)) return path;
  return `/${path}`;
});

watch(source, () => {
  sourceFailed.value = false;
});
watch(identityImage, () => {
  identityImageFailed.value = false;
});
</script>
