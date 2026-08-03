<template>
  <div v-if="versions.length > 1" class="pc-version-navigator" aria-label="内容版本">
    <button
      class="pc-icon-btn"
      type="button"
      :disabled="currentIndex <= 0"
      :title="t`上一个版本`"
      @click="selectOffset(-1)"
    >
      <span class="pc-version-chevron previous" aria-hidden="true"></span>
    </button>
    <div class="pc-version-status">
      <strong>{{ `版本 ${currentIndex + 1} / ${versions.length}` }}</strong>
      <small>{{ viewedVersionId === activeVersionId ? t`当前采用` : t`候选版本` }}</small>
    </div>
    <button
      class="pc-icon-btn"
      type="button"
      :disabled="currentIndex < 0 || currentIndex >= versions.length - 1"
      :title="t`下一个版本`"
      @click="selectOffset(1)"
    >
      <span class="pc-version-chevron next" aria-hidden="true"></span>
    </button>
    <button
      v-if="viewedVersionId !== activeVersionId"
      class="pc-primary-btn compact"
      type="button"
      @click="emit('adopt', viewedVersionId)"
    >
      {{ t`采用此版本` }}
    </button>
  </div>
</template>

<script setup lang="ts">
export type VersionNavigatorItem = {
  createdAt: string;
  id: string;
};

const props = defineProps<{
  activeVersionId: string;
  versions: VersionNavigatorItem[];
  viewedVersionId: string;
}>();

const emit = defineEmits<{
  adopt: [versionId: string];
  select: [versionId: string];
}>();

const currentIndex = computed(() => props.versions.findIndex(version => version.id === props.viewedVersionId));

function selectOffset(offset: number) {
  const target = props.versions[currentIndex.value + offset];
  if (target) emit('select', target.id);
}
</script>

<style scoped>
.pc-version-navigator {
  display: grid;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--pc-border);
  border-radius: 8px;
  margin: 10px 0 14px;
  background: var(--pc-surface-strong);
  grid-template-columns: 42px minmax(0, 1fr) 42px auto;
  gap: 6px;
}

.pc-version-status {
  min-width: 0;
  text-align: center;
}

.pc-version-status strong,
.pc-version-status small {
  display: block;
}

.pc-version-status small {
  color: var(--pc-muted);
}

.pc-version-chevron {
  display: block;
  width: 10px;
  height: 10px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
}

.pc-version-chevron.previous {
  transform: rotate(135deg);
}

.pc-version-chevron.next {
  transform: rotate(-45deg);
}

@media (max-width: 380px) {
  .pc-version-navigator {
    grid-template-columns: 38px minmax(0, 1fr) 38px;
  }

  .pc-version-navigator > .pc-primary-btn {
    grid-column: 1 / -1;
  }
}
</style>
