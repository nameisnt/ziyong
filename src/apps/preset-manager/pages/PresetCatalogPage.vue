<template>
  <section class="pc-preset-page">
    <div class="pc-segment pc-preset-source-tabs" role="tablist" aria-label="预设来源">
      <button class="pc-segment-btn" :class="{ active: source === 'plugin' }" type="button" @click="source = 'plugin'">
        插件预设
      </button>
      <button class="pc-segment-btn" :class="{ active: source === 'tavern' }" type="button" @click="source = 'tavern'">
        酒馆预设
      </button>
    </div>

    <header class="pc-compact-toolbar pc-directory-toolbar pc-preset-current">
      <span v-if="source === 'tavern'" class="pc-directory-count" :title="loadedPresetName">
        当前：{{ loadedPresetName || '未读取到预设' }}
      </span>
      <span v-else class="pc-directory-count">
        {{ pluginPresets.length }} 个私有预设<template v-if="hiddenPluginPresetCount"> · {{ hiddenPluginPresetCount }} 隐藏</template>
      </span>
      <button
        v-if="source === 'tavern'"
        class="pc-icon-btn"
        type="button"
        :disabled="loading"
        title="刷新预设"
        aria-label="刷新预设"
        @click="$emit('refresh')"
      >
        <i class="fa-solid fa-rotate" :class="{ 'fa-spin': loading }"></i>
      </button>
      <template v-else>
        <button
          class="pc-icon-btn"
          :class="{ active: showHidden }"
          type="button"
          :title="showHidden ? '收起隐藏预设' : '显示隐藏预设'"
          :aria-label="showHidden ? '收起隐藏预设' : '显示隐藏预设'"
          @click="showHidden = !showHidden"
        >
          <i :class="showHidden ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
        </button>
        <button
          class="pc-icon-btn primary"
          type="button"
          title="导入插件预设"
          aria-label="导入插件预设"
          @click="fileInput?.click()"
        >
          <i class="fa-solid fa-file-import"></i>
        </button>
      </template>
      <input ref="fileInput" hidden type="file" accept="application/json,.json" @change="importFile" />
    </header>

    <div v-if="source === 'tavern' && errorMessage" class="pc-section-card pc-preset-error">
      <strong>无法读取预设</strong>
      <span>{{ errorMessage }}</span>
    </div>
    <div v-else-if="source === 'plugin' && pluginErrorMessage" class="pc-section-card pc-preset-error">
      <strong>部分插件预设读取失败</strong>
      <span>{{ pluginErrorMessage }}</span>
    </div>

    <label
      v-else-if="source === 'tavern' ? presetNames.length : catalogPluginPresets.length"
      class="pc-search-field pc-preset-search"
    >
      <i class="fa-solid fa-magnifying-glass"></i>
      <input v-model="query" type="search" placeholder="搜索预设名称" />
    </label>

    <div
      v-if="source === 'tavern' && !errorMessage && visiblePresetNames.length"
      class="pc-directory-list pc-preset-list"
    >
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
          :aria-label="presetName === loadedPresetName ? '当前使用' : '使用这个预设'"
          @click="$emit('switch-preset', presetName)"
        >
          <i :class="presetName === loadedPresetName ? 'fa-solid fa-check' : 'fa-solid fa-play'"></i>
        </button>
      </article>
    </div>
    <div v-else-if="source === 'plugin' && visiblePluginPresets.length" class="pc-directory-list pc-preset-list">
      <article
        v-for="preset in visiblePluginPresets"
        :key="preset.id"
        class="pc-list-row pc-preset-row"
        :class="{ disabled: preset.hidden }"
      >
        <button class="pc-preset-open" type="button" @click="$emit('open-plugin', preset.id)">
          <span class="pc-preset-copy">
            <strong :title="preset.name">{{ preset.name }}</strong>
            <small>
              <template v-if="preset.builtIn">内置 · </template>
              <template v-if="preset.hidden">已隐藏 · </template>
              {{ preset.sourceFormat === 'legacy' ? '兼容格式' : '现代格式' }}
            </small>
          </span>
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </article>
    </div>
    <EmptyState
      v-else-if="!loading && (source === 'plugin' ? !pluginErrorMessage : !errorMessage)"
      :title="emptyTitle"
    />
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import type { PluginPresetRecord } from '../pluginPreset';

const props = defineProps<{
  errorMessage: string;
  loadedPresetName: string;
  loading: boolean;
  pluginErrorMessage: string;
  pluginPresets: PluginPresetRecord[];
  presetNames: string[];
  switchingPreset: string;
  visiblePresetNames: string[];
}>();

const query = defineModel<string>('query', { required: true });
const showHidden = defineModel<boolean>('showHidden', { required: true });
const source = defineModel<'plugin' | 'tavern'>('source', { required: true });
const fileInput = ref<HTMLInputElement | null>(null);
const hiddenPluginPresetCount = computed(() => props.pluginPresets.filter(item => item.hidden).length);
const catalogPluginPresets = computed(() =>
  showHidden.value ? props.pluginPresets : props.pluginPresets.filter(item => !item.hidden),
);
const visiblePluginPresets = computed(() => {
  const keyword = query.value.trim().toLocaleLowerCase();
  return keyword
    ? catalogPluginPresets.value.filter(item => item.name.toLocaleLowerCase().includes(keyword))
    : catalogPluginPresets.value;
});
const emptyTitle = computed(() => {
  if (source.value === 'plugin') {
    if (!showHidden.value && hiddenPluginPresetCount.value === props.pluginPresets.length && props.pluginPresets.length) {
      return '插件预设均已隐藏，可点击眼睛查看';
    }
    return catalogPluginPresets.value.length && query.value.trim()
      ? '没有找到匹配的插件预设'
      : '还没有导入插件预设';
  }
  return props.presetNames.length && query.value.trim() ? '没有找到匹配的预设' : '没有可用的酒馆预设';
});

const emit = defineEmits<{
  import: [file: File];
  open: [presetName: string];
  'open-plugin': [presetId: string];
  refresh: [];
  'switch-preset': [presetName: string];
}>();

function importFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (file) emit('import', file);
}
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
.pc-preset-source-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
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
.pc-preset-open > i {
  flex: 0 0 auto;
  color: var(--pc-muted);
  font-size: 12px;
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
.pc-preset-copy small {
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 700;
}
.pc-preset-error {
  color: var(--pc-danger);
}
.pc-preset-error span {
  color: var(--pc-muted);
  font-size: 13px;
}
</style>
