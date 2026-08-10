<template>
  <section class="pc-preset-page">
    <header class="pc-preset-current">
      <div>
        <span class="pc-kicker">当前酒馆预设</span>
        <strong :title="loadedPresetName">{{ loadedPresetName || '未读取到当前预设' }}</strong>
      </div>
      <button class="pc-icon-btn" type="button" :disabled="loading" title="刷新预设" @click="$emit('refresh')">
        <i class="fa-solid fa-rotate" :class="{ 'fa-spin': loading }"></i>
      </button>
    </header>

    <div v-if="errorMessage" class="pc-section-card pc-preset-error">
      <strong>无法读取预设</strong>
      <span>{{ errorMessage }}</span>
    </div>

    <label v-else-if="presetNames.length" class="pc-preset-search">
      <i class="fa-solid fa-magnifying-glass"></i>
      <input v-model="query" class="pc-field" type="search" placeholder="搜索预设名称" />
    </label>

    <div v-if="!errorMessage && visiblePresetNames.length" class="pc-preset-list">
      <article
        v-for="presetName in visiblePresetNames"
        :key="presetName"
        class="pc-section-card pc-preset-row"
        :class="{ current: presetName === loadedPresetName }"
      >
        <button class="pc-preset-open" type="button" @click="$emit('open', presetName)">
          <span class="pc-preset-icon"><i class="fa-solid fa-file-lines"></i></span>
          <span class="pc-preset-copy">
            <strong :title="presetName">{{ presetName }}</strong>
            <small>{{ presetName === loadedPresetName ? '当前使用' : '点击管理条目' }}</small>
          </span>
          <i class="fa-solid fa-chevron-right"></i>
        </button>
        <button
          class="pc-soft-btn compact"
          type="button"
          :class="{ active: presetName === loadedPresetName }"
          :disabled="switchingPreset === presetName || presetName === loadedPresetName"
          @click="$emit('switch-preset', presetName)"
        >
          {{ presetName === loadedPresetName ? '当前' : '使用' }}
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
.pc-preset-page { display: flex; height: 100%; min-height: 0; flex-direction: column; gap: 12px; overflow-y: auto; padding: 14px; }
.pc-preset-current { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pc-preset-current > div { display: grid; min-width: 0; gap: 5px; }
.pc-preset-current strong { overflow: hidden; color: var(--pc-text); font-size: 17px; text-overflow: ellipsis; white-space: nowrap; }
.pc-preset-list { display: grid; gap: 10px; }
.pc-preset-search { position: relative; display: block; }
.pc-preset-search > i { position: absolute; z-index: 1; top: 50%; left: 14px; color: var(--pc-muted); transform: translateY(-50%); }
.pc-preset-search .pc-field { padding-left: 40px; }
.pc-preset-row { grid-template-columns: minmax(0, 1fr) auto; align-items: center; padding: 10px; }
.pc-preset-row.current { border-color: color-mix(in srgb, var(--pc-theme-accent) 42%, var(--pc-border) 58%); }
.pc-preset-open { display: grid; min-width: 0; grid-template-columns: 38px minmax(0, 1fr) auto; align-items: center; gap: 10px; border: 0; padding: 0; background: transparent; color: var(--pc-text); text-align: left; cursor: pointer; }
.pc-preset-icon { display: grid; width: 38px; height: 38px; place-items: center; border-radius: var(--pc-control-radius); background: color-mix(in srgb, var(--pc-theme-accent) 14%, var(--pc-surface-strong) 86%); color: var(--pc-theme-accent); }
.pc-preset-copy { display: grid; min-width: 0; gap: 4px; }
.pc-preset-copy strong,
.pc-preset-copy small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pc-preset-copy small,
.pc-preset-open > i { color: var(--pc-muted); font-size: 12px; }
.pc-preset-error { color: var(--pc-danger); }
.pc-preset-error span { color: var(--pc-muted); font-size: 13px; }
</style>
