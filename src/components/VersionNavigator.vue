<template>
  <div v-if="versions.length > 1" class="pc-version-navigator" aria-label="内容版本">
    <button
      class="pc-icon-btn pc-version-step"
      type="button"
      :aria-label="t`上一个版本`"
      :title="t`上一个版本`"
      @pointerdown="cancelIndexEdit"
      @click="selectOffset(-1)"
    >
      <i class="fa-solid fa-chevron-left"></i>
    </button>
    <input
      v-if="indexEditing"
      ref="indexInputEl"
      v-model="indexDraft"
      class="pc-field pc-version-index-input"
      type="text"
      inputmode="numeric"
      :maxlength="String(versions.length).length"
      aria-label="跳转到版本"
      @blur="commitIndexEdit"
      @keydown.enter.prevent="commitIndexEdit"
      @keydown.esc.prevent="cancelIndexEdit"
    />
    <button
      v-else
      class="pc-soft-btn compact pc-version-status"
      type="button"
      :aria-label="`当前第 ${currentVersionNumber} 个版本，共 ${versions.length} 个；点击输入版本序号`"
      title="输入版本序号"
      @click="startIndexEdit"
    >
      {{ currentVersionNumber }} / {{ versions.length }}
    </button>
    <button
      class="pc-icon-btn pc-version-step"
      type="button"
      :aria-label="t`下一个版本`"
      :title="t`下一个版本`"
      @pointerdown="cancelIndexEdit"
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
const currentVersionNumber = computed(() => Math.max(0, currentIndex.value) + 1);
const indexEditing = ref(false);
const indexDraft = ref('');
const indexInputEl = ref<HTMLInputElement | null>(null);

async function startIndexEdit() {
  indexDraft.value = String(currentVersionNumber.value);
  indexEditing.value = true;
  await nextTick();
  indexInputEl.value?.select();
}

function cancelIndexEdit() {
  indexEditing.value = false;
}

function commitIndexEdit() {
  if (!indexEditing.value) return;
  const requestedIndex = Number(indexDraft.value) - 1;
  indexEditing.value = false;
  if (!Number.isInteger(requestedIndex) || requestedIndex < 0 || requestedIndex >= props.versions.length) return;
  const target = props.versions[requestedIndex];
  if (target && target.id !== props.viewedVersionId) emit('select', target.id);
}

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
  min-width: 46px;
  height: 30px;
  min-height: 30px;
  padding-inline: 5px;
  color: var(--pc-theme-accent);
  font-size: 12px;
  font-weight: 750;
  text-align: center;
}

.pc-version-index-input {
  width: 46px;
  height: 30px;
  min-height: 30px;
  padding: 0 3px;
  font-size: 12px;
  font-weight: 750;
  text-align: center;
}
</style>
