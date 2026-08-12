<template>
  <section class="pc-preset-page">
    <header class="pc-compact-toolbar pc-directory-toolbar pc-preset-current">
      <span class="pc-directory-count" :title="loadedPresetName"> 当前：{{ loadedPresetName || '未读取到预设' }} </span>
      <button class="pc-icon-btn" type="button" :disabled="loading" title="刷新预设" @click="$emit('refresh')">
        <i class="fa-solid fa-rotate" :class="{ 'fa-spin': loading }"></i>
      </button>
    </header>

    <div v-if="errorMessage" class="pc-section-card pc-preset-error">
      <strong>无法读取预设</strong>
      <span>{{ errorMessage }}</span>
    </div>

    <label v-else-if="presetNames.length" class="pc-search-field pc-preset-search">
      <i class="fa-solid fa-magnifying-glass"></i>
      <input v-model="query" type="search" placeholder="搜索预设名称" />
    </label>

    <div v-if="!errorMessage && visiblePresetNames.length" class="pc-directory-list pc-preset-list">
      <article
        v-for="presetName in visiblePresetNames"
        :key="presetName"
        class="pc-list-row pc-preset-row"
        :class="{ current: presetName === loadedPresetName }"
      >
        <button class="pc-preset-open" type="button" @click="$emit('open', presetName)">
          <span class="pc-preset-copy">
            <strong :title="presetName">{{ presetName }}</strong>
          </span>
        </button>
        <button
          class="pc-icon-btn pc-preset-use"
          type="button"
          :class="{ active: presetName === loadedPresetName }"
          :disabled="switchingPreset === presetName || presetName === loadedPresetName"
          :title="presetName === loadedPresetName ? '当前使用' : '使用这个预设'"
          @click="$emit('switch-preset', presetName)"
        >
          <i :class="presetName === loadedPresetName ? 'fa-solid fa-check' : 'fa-solid fa-play'"></i>
        </button>
      </article>
    </div>
    <EmptyState
      v-else-if="!loading && !errorMessage"
      :title="presetNames.length && query.trim() ? '没有找到匹配的预设' : '没有可用的酒馆预设'"
    />
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';

defineProps<{
  errorMessage: string;
  loadedPresetName: string;
  loading: boolean;
  presetNames: string[];
  switchingPreset: string;
  visiblePresetNames: string[];
}>();

const query = defineModel<string>('query', { required: true });

defineEmits<{
  open: [presetName: string];
  refresh: [];
  'switch-preset': [presetName: string];
}>();
</script>

<style scoped>
.pc-preset-page {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}
.pc-preset-current .pc-directory-count {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-preset-row {
  grid-template-columns: minmax(0, 1fr) auto;
}
.pc-preset-row.current {
  color: var(--pc-theme-accent);
}
.pc-preset-open {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--pc-text);
  text-align: left;
  cursor: pointer;
}
.pc-preset-copy {
  display: grid;
  min-width: 0;
  gap: 4px;
}
.pc-preset-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-preset-error {
  color: var(--pc-danger);
}
.pc-preset-error span {
  color: var(--pc-muted);
  font-size: 13px;
}
</style>
