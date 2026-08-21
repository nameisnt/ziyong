<template>
  <img v-if="source && !failed" :src="source" alt="" @error="failed = true" />
  <i v-else class="fa-solid" :class="icon" aria-hidden="true"></i>
</template>

<script setup lang="ts">
const props = defineProps<{ assetPath?: string; icon: string }>();
const failed = ref(false);
const source = computed(() => {
  const path = props.assetPath?.trim() || '';
  if (!path || /^(?:data:|blob:|https?:\/\/|\/)/i.test(path)) return path;
  return `/${path}`;
});
watch(() => props.assetPath, () => { failed.value = false; });
</script>
