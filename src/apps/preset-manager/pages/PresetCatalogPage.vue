<template>
  <section class="pc-preset-page" :class="{ 'pc-preset-catalog-selecting': selection.active.value }">
    <div class="pc-segment pc-preset-source-tabs" role="tablist" aria-label="预设来源">
      <button class="pc-segment-btn" :class="{ active: source === 'plugin' }" type="button" @click="source = 'plugin'">
        插件预设
      </button>
      <button class="pc-segment-btn" :class="{ active: source === 'tavern' }" type="button" @click="source = 'tavern'">
        酒馆预设
      </button>
    </div>

    <header class="pc-compact-toolbar pc-directory-toolbar pc-preset-current">
      <ActionMenu align="start" icon-only label="管理预设">
        <button type="button" :disabled="loading || !selectableIds.length" @click="selection.start()">
          <i class="fa-solid fa-list-check"></i>批量删除预设
        </button>
      </ActionMenu>
      <span v-if="source === 'tavern'" class="pc-directory-count" :title="loadedPresetName">
        当前：{{ loadedPresetName || '未读取到预设' }}
      </span>
      <span v-else class="pc-directory-count">
        {{ pluginPresets.length }} 个私有预设<template v-if="hiddenPluginPresetCount">
          · {{ hiddenPluginPresetCount }} 隐藏</template
        >
      </span>
      <button class="pc-icon-btn" type="button" title="新建预设分组" aria-label="新建预设分组" @click="createGroup">
        <i class="fa-solid fa-folder-plus"></i>
      </button>
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
      <article v-if="visibleCurrentPreset" :key="visibleCurrentPreset" class="pc-list-row pc-preset-row current">
        <BulkSelectionCheckbox
          v-if="selection.active.value"
          :model-value="false"
          disabled
          label="当前使用的预设不能删除"
        />
        <button class="pc-preset-open" type="button" @click="$emit('open', visibleCurrentPreset)">
          <span class="pc-preset-copy">
            <strong :title="visibleCurrentPreset">{{ visibleCurrentPreset }}</strong>
            <small>当前使用</small>
          </span>
        </button>
        <span class="pc-icon-btn pc-preset-use active" title="当前使用" aria-label="当前使用">
          <i class="fa-solid fa-check"></i>
        </span>
      </article>
      <section v-for="group in groupedTavernPresets" :key="group.name" class="pc-preset-catalog-group">
        <div class="pc-compact-toolbar">
          <BulkSelectionCheckbox
            v-if="selection.active.value"
            :label="`选择分组 ${group.name}`"
            :model-value="groupSelected(group.items)"
            @update:model-value="selectGroup(group.items, $event)"
          />
          <strong class="pc-preset-group-label">{{ group.name }}</strong>
        </div>
        <article v-for="presetName in group.items" :key="presetName" class="pc-list-row pc-preset-row">
          <BulkSelectionCheckbox
            v-if="selection.active.value"
            :model-value="selection.selectedIdSet.value.has(presetName)"
            :label="`选择预设 ${presetName}`"
            @update:model-value="selection.setSelected(presetName, $event)"
          />
          <button
            class="pc-preset-open"
            type="button"
            @click="selection.active.value ? toggleSelection(presetName) : $emit('open', presetName)"
          >
            <span class="pc-preset-copy"
              ><strong :title="presetName">{{ presetName }}</strong></span
            >
          </button>
          <button
            v-if="!selection.active.value"
            class="pc-icon-btn"
            type="button"
            title="设置分组"
            aria-label="设置分组"
            @click="assignPreset('tavern', presetName)"
          >
            <i class="fa-solid fa-folder"></i>
          </button>
          <button
            v-if="!selection.active.value"
            class="pc-icon-btn pc-preset-use"
            type="button"
            :disabled="switchingPreset === presetName"
            title="使用这个预设"
            aria-label="使用这个预设"
            @click="$emit('switch-preset', presetName)"
          >
            <i class="fa-solid fa-play"></i>
          </button>
        </article>
      </section>
    </div>
    <div v-else-if="source === 'plugin' && visiblePluginPresets.length" class="pc-directory-list pc-preset-list">
      <section v-for="group in groupedPluginPresets" :key="group.name" class="pc-preset-catalog-group">
        <div class="pc-compact-toolbar">
          <BulkSelectionCheckbox
            v-if="selection.active.value"
            :label="`选择分组 ${group.name}`"
            :disabled="!group.items.some(preset => !preset.builtIn)"
            :model-value="groupSelected(group.items.filter(preset => !preset.builtIn).map(preset => preset.id))"
            @update:model-value="
              selectGroup(
                group.items.filter(preset => !preset.builtIn).map(preset => preset.id),
                $event,
              )
            "
          />
          <strong class="pc-preset-group-label">{{ group.name }}</strong>
        </div>
        <article
          v-for="preset in group.items"
          :key="preset.id"
          class="pc-list-row pc-preset-row"
          :class="{ disabled: preset.hidden }"
        >
          <BulkSelectionCheckbox
            v-if="selection.active.value"
            :model-value="selection.selectedIdSet.value.has(preset.id)"
            :disabled="preset.builtIn"
            :label="`选择预设 ${preset.name}`"
            @update:model-value="selection.setSelected(preset.id, $event)"
          />
          <button
            class="pc-preset-open"
            type="button"
            :disabled="selection.active.value && preset.builtIn"
            @click="selection.active.value ? toggleSelection(preset.id) : $emit('open-plugin', preset.id)"
          >
            <span class="pc-preset-copy"
              ><strong :title="preset.name">{{ preset.name }}</strong
              ><small
                ><template v-if="preset.builtIn">内置 · </template><template v-if="preset.hidden">已隐藏 · </template
                >{{ preset.sourceFormat === 'legacy' ? '兼容格式' : '现代格式' }}</small
              ></span
            ><i class="fa-solid fa-chevron-right"></i>
          </button>
          <button
            v-if="!selection.active.value"
            class="pc-icon-btn"
            type="button"
            title="设置分组"
            aria-label="设置分组"
            @click="assignPreset('plugin', preset.id)"
          >
            <i class="fa-solid fa-folder"></i>
          </button>
        </article>
      </section>
    </div>
    <EmptyState
      v-else-if="!loading && (source === 'plugin' ? !pluginErrorMessage : !errorMessage)"
      :title="emptyTitle"
    />
    <BulkSelectionBar
      v-if="selection.active.value"
      class="pc-preset-catalog-bulk"
      :all-selected="selection.allSelected.value"
      :selected-count="selection.selectedIds.value.length"
      :total-count="selectableIds.length"
      @toggle-all="selection.toggleAll"
      @cancel="selection.cancel"
      @remove="$emit('delete-presets', source, [...selection.selectedIds.value])"
    />
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import ActionMenu from '@/components/ActionMenu.vue';
import BulkSelectionBar from '@/components/BulkSelectionBar.vue';
import BulkSelectionCheckbox from '@/components/BulkSelectionCheckbox.vue';
import { useBulkSelection } from '@/composables/useBulkSelection';
import { usePhoneStore } from '@/store/phone';
import { usePresetCatalogGroupStore, type PresetCatalogSource } from '@/store/presetCatalogGroups';
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
const phone = usePhoneStore();
const presetGroups = usePresetCatalogGroupStore();
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
const visibleCurrentPreset = computed(() =>
  source.value === 'tavern' && props.visiblePresetNames.includes(props.loadedPresetName) ? props.loadedPresetName : '',
);
const selectableIds = computed(() =>
  source.value === 'tavern'
    ? props.visiblePresetNames.filter(name => name !== props.loadedPresetName)
    : visiblePluginPresets.value.filter(preset => !preset.builtIn).map(preset => preset.id),
);
const selection = useBulkSelection(selectableIds);
watch(source, () => selection.cancel());
function toggleSelection(id: string) {
  if (selectableIds.value.includes(id)) selection.setSelected(id, !selection.selectedIdSet.value.has(id));
}
function groupSelected(ids: string[]) {
  return ids.length > 0 && ids.every(id => selection.selectedIdSet.value.has(id));
}
function selectGroup(ids: string[], selected: boolean) {
  ids.forEach(id => selection.setSelected(id, selected));
}
function grouped<T>(items: T[], sourceId: PresetCatalogSource, idOf: (item: T) => string) {
  const groups = new Map<string, T[]>();
  items.forEach(item => {
    const name = presetGroups.groupOf(sourceId, idOf(item)) || '未分组';
    groups.set(name, [...(groups.get(name) || []), item]);
  });
  return [...groups].map(([name, groupedItems]) => ({ items: groupedItems, name }));
}
const groupedTavernPresets = computed(() =>
  grouped(
    props.visiblePresetNames.filter(name => name !== props.loadedPresetName),
    'tavern',
    name => name,
  ),
);
const groupedPluginPresets = computed(() => grouped(visiblePluginPresets.value, 'plugin', item => item.id));
const emptyTitle = computed(() => {
  if (source.value === 'plugin') {
    if (
      !showHidden.value &&
      hiddenPluginPresetCount.value === props.pluginPresets.length &&
      props.pluginPresets.length
    ) {
      return '插件预设均已隐藏，可点击眼睛查看';
    }
    return catalogPluginPresets.value.length && query.value.trim() ? '没有找到匹配的插件预设' : '还没有导入插件预设';
  }
  return props.presetNames.length && query.value.trim() ? '没有找到匹配的预设' : '没有可用的酒馆预设';
});

const emit = defineEmits<{
  'delete-presets': [source: 'plugin' | 'tavern', ids: string[]];
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

async function createGroup() {
  const name = await phone.promptNotice('输入新的预设分组名称。', { confirmLabel: '创建', title: '新建预设分组' });
  if (name?.trim()) presetGroups.createGroup(name);
}

async function assignPreset(sourceId: PresetCatalogSource, id: string) {
  const current = presetGroups.groupOf(sourceId, id);
  const name = await phone.promptNotice('输入分组名称；输入 - 移到未分组。', {
    confirmLabel: '保存',
    initialValue: current,
    title: '设置预设分组',
  });
  if (name !== null) presetGroups.assign(sourceId, id, name);
}
</script>

<style scoped>
.pc-preset-catalog-bulk {
  position: sticky;
  bottom: 0;
  z-index: 2;
  background: var(--pc-surface-strong);
}
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
  grid-template-columns: minmax(0, 1fr) auto auto;
}
.pc-preset-catalog-selecting .pc-preset-row {
  grid-template-columns: auto minmax(0, 1fr) auto;
}
.pc-preset-catalog-group {
  display: grid;
  gap: 4px;
}
.pc-preset-group-label {
  padding: 4px 2px;
  color: var(--pc-muted);
  font-size: 12px;
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
