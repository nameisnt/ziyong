<template>
  <div v-if="versions.length > 1" class="pc-version-navigator" aria-label="内容版本">
    <div class="pc-version-switcher">
      <button
        class="pc-soft-btn compact pc-version-step"
        type="button"
        :title="t`上一个版本`"
        @click="selectOffset(-1)"
      >
        <span>{{ t`上版` }}</span>
      </button>
      <div class="pc-version-status">
        <label>
          <span>{{ t`版本` }}</span>
          <input
            v-model="requestedIndex"
            class="pc-field"
            type="number"
            inputmode="numeric"
            min="1"
            :max="versions.length"
            :aria-label="t`跳转到版本`"
            @blur="commitRequestedIndex"
            @keydown.enter.prevent="commitRequestedIndex"
          />
          <span>{{ `/ ${versions.length}` }}</span>
        </label>
      </div>
      <button class="pc-soft-btn compact pc-version-step" type="button" :title="t`下一个版本`" @click="selectOffset(1)">
        <span>{{ t`下版` }}</span>
      </button>
    </div>
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
const requestedIndex = ref(1);

watch(
  () => [currentIndex.value, props.versions.length] as const,
  ([index]) => {
    requestedIndex.value = Math.max(0, index) + 1;
  },
  { immediate: true },
);

function selectOffset(offset: number) {
  if (!props.versions.length) return;
  const normalizedIndex = currentIndex.value >= 0 ? currentIndex.value : 0;
  const targetIndex = (normalizedIndex + offset + props.versions.length) % props.versions.length;
  const target = props.versions[targetIndex];
  if (target) emit('select', target.id);
}

function commitRequestedIndex() {
  const parsed = Math.round(Number(requestedIndex.value));
  const targetIndex = Math.max(0, Math.min(props.versions.length - 1, Number.isFinite(parsed) ? parsed - 1 : 0));
  requestedIndex.value = targetIndex + 1;
  const target = props.versions[targetIndex];
  if (target && target.id !== props.viewedVersionId) emit('select', target.id);
}
</script>

<style scoped>
.pc-version-navigator {
  padding: 8px;
  border: 1px solid var(--pc-border);
  border-radius: 8px;
  margin: 10px 0 14px;
  background: var(--pc-surface-strong);
}

.pc-version-switcher {
  display: grid;
  align-items: center;
  grid-template-columns: 56px minmax(0, 1fr) 56px;
  gap: 6px;
}

.pc-version-step {
  min-width: 0;
  padding-inline: 8px;
  white-space: nowrap;
}

.pc-version-status {
  min-width: 0;
}

.pc-version-status label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--pc-muted);
  font-weight: 750;
}

.pc-version-status .pc-field {
  width: 42px;
  height: 42px;
  min-height: 42px;
  padding: 0 8px;
  line-height: 40px;
  text-align: center;
}

@media (max-width: 380px) {
  .pc-version-switcher {
    grid-template-columns: 52px minmax(0, 1fr) 52px;
  }
}
</style>
