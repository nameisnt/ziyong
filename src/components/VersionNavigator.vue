<template>
  <div v-if="versions.length > 1" class="pc-version-navigator" aria-label="内容版本">
    <button
      class="pc-icon-btn pc-version-step"
      type="button"
      :aria-label="t`上一个版本`"
      :title="t`上一个版本`"
      @click="selectOffset(-1)"
    >
      <i class="fa-solid fa-chevron-left"></i>
    </button>
    <span class="pc-version-status">{{ Math.max(0, currentIndex) + 1 }} / {{ versions.length }}</span>
    <button
      class="pc-icon-btn pc-version-step"
      type="button"
      :aria-label="t`下一个版本`"
      :title="t`下一个版本`"
      @click="selectOffset(1)"
    >
      <i class="fa-solid fa-chevron-right"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
export type VersionNavigatorItem = {
  createdAt: string;
  id: string;
};

const props = defineProps<{
  versions: VersionNavigatorItem[];
  viewedVersionId: string;
}>();

const emit = defineEmits<{
  select: [versionId: string];
}>();

const currentIndex = computed(() => props.versions.findIndex(version => version.id === props.viewedVersionId));

function selectOffset(offset: number) {
  if (!props.versions.length) return;
  const normalizedIndex = currentIndex.value >= 0 ? currentIndex.value : 0;
  const targetIndex = (normalizedIndex + offset + props.versions.length) % props.versions.length;
  const target = props.versions[targetIndex];
  if (target) emit('select', target.id);
}

</script>

<style scoped>
.pc-version-navigator {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pc-version-step {
  width: 30px;
  height: 30px;
  min-height: 30px;
}

.pc-version-status {
  min-width: 34px;
  color: var(--pc-theme-accent);
  font-size: 12px;
  font-weight: 750;
  text-align: center;
}
</style>
