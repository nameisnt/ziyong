<template>
  <div class="pc-settings-panel-stack">
    <section class="pc-page-section">
      <div class="pc-section-head">
        <strong>生成默认值</strong>
        <button
          class="pc-icon-btn"
          type="button"
          title="恢复生成默认值"
          aria-label="恢复生成默认值"
          @click="settingsStore.resetGenerationDefaults()"
        >
          <i class="fa-solid fa-rotate-left"></i>
        </button>
      </div>
      <label class="pc-field-group">
        <span class="pc-field-label">来源楼层模式</span>
        <select v-model="settings.generation.sourceMode" class="pc-select">
          <option value="none">不使用聊天楼层</option>
          <option value="latest">最新楼层</option>
          <option value="fromStart">从 0 到指定楼层</option>
          <option value="all">全部楼层</option>
          <option value="single">指定单层</option>
          <option value="recent">最近 N 楼</option>
          <option value="range">自定义范围</option>
        </select>
      </label>
      <label v-if="settings.generation.sourceMode === 'fromStart'" class="pc-field-group">
        <span class="pc-field-label">默认结束楼层</span>
        <input v-model.number="settings.generation.fromStartEnd" class="pc-field" type="number" min="0" />
      </label>
      <label class="pc-field-group">
        <span class="pc-field-label">生成预设</span>
        <div class="pc-preset-select-row">
          <SearchableCombobox
            v-model="settings.generation.tavernPresetName"
            input-label="选择生成预设"
            :options="tavernPresetOptions"
            placeholder="跟随酒馆当前预设"
          />
          <button
            class="pc-icon-btn"
            type="button"
            title="刷新酒馆预设列表"
            aria-label="刷新酒馆预设列表"
            @click="refreshTavernPresetNames"
          >
            <i class="fa-solid fa-rotate"></i>
          </button>
        </div>
      </label>
      <div class="pc-settings-list">
        <div class="pc-setting-row">
          <strong>RPM 请求限制 <InfoHint text="任意连续 60 秒内允许的生成请求数，0 表示不限制。" /></strong>
          <input
            v-model.number="settings.generation.rpmLimit"
            class="pc-field pc-compact-number"
            type="number"
            min="0"
            max="120"
          />
        </div>
        <div class="pc-setting-row">
          <strong>结果去向</strong>
          <div class="pc-segment">
            <button
              :class="['pc-segment-btn', { active: settings.generation.resultMode === 'preview' }]"
              type="button"
              @click="settings.generation.resultMode = 'preview'"
            >
              预览
            </button>
            <button
              :class="['pc-segment-btn', { active: settings.generation.resultMode === 'save' }]"
              type="button"
              @click="settings.generation.resultMode = 'save'"
            >
              直接保存
            </button>
          </div>
        </div>
        <label class="pc-setting-row">
          <strong>默认开启流式</strong>
          <span class="pc-toggle"><input v-model="settings.generation.stream" type="checkbox" /><span></span></span>
        </label>
      </div>
    </section>

    <section class="pc-page-section">
      <div class="pc-settings-list">
        <label class="pc-setting-row">
          <strong
            >解析前清理思维链 <InfoHint text="按结束标签移除标签及其之前的内容，原始输出仍保存在生成记录中。"
          /></strong>
          <span class="pc-toggle"
            ><input v-model="settings.generation.outputCleaningEnabled" type="checkbox" /><span></span
          ></span>
        </label>
      </div>
      <label v-if="settings.generation.outputCleaningEnabled" class="pc-field-group">
        <span class="pc-field-label">思维链结束标签（每行一个）</span>
        <textarea
          v-model="settings.generation.outputCleaningEndTags"
          class="pc-area compact"
          placeholder="</think>"
        ></textarea>
      </label>
    </section>

    <section class="pc-page-section">
      <div class="pc-section-head">
        <strong>当前聊天称呼</strong>
        <button
          class="pc-icon-btn"
          type="button"
          title="互换角色与用户称呼"
          aria-label="互换角色与用户称呼"
          @click="swapGenerationAliases"
        >
          <i class="fa-solid fa-right-left"></i>
        </button>
      </div>
      <div class="pc-settings-alias-grid">
        <label class="pc-field-group"
          ><span class="pc-field-label"><code v-text="'{{char}}'"></code> 替换</span
          ><input v-model="charReplacement" class="pc-field" type="text" placeholder="角色称呼"
        /></label>
        <label class="pc-field-group"
          ><span class="pc-field-label"><code v-text="'{{user}}'"></code> 替换</span
          ><input v-model="userReplacement" class="pc-field" type="text" placeholder="用户称呼"
        /></label>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { buildPluginPresetSelectionOptions, pluginPresetIdFromSelection } from '@/apps/preset-manager/pluginPreset';
import InfoHint from '@/components/InfoHint.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { useGenerationAliasesStore } from '@/store/generationAliases';
import { usePluginPresetStore } from '@/store/pluginPresets';
import { useSettingsStore } from '@/store/settings';
import { getPresetNamesSafe } from '@/util/runtime';
import { storeToRefs } from 'pinia';

const aliases = useGenerationAliasesStore();
const settingsStore = useSettingsStore();
const pluginPresets = usePluginPresetStore();
const { settings } = storeToRefs(settingsStore);
const { charReplacement, userReplacement } = storeToRefs(aliases);
const { items: pluginPresetItems } = storeToRefs(pluginPresets);
const tavernPresetNames = ref<string[]>([]);
const tavernPresetOptions = computed(() => {
  const selected = settings.value.generation.tavernPresetName.trim();
  const names = new Set(tavernPresetNames.value);
  if (selected && !pluginPresetIdFromSelection(selected)) names.add(selected);
  return [
    { label: '跟随酒馆当前预设', value: '' },
    ...buildPluginPresetSelectionOptions(pluginPresetItems.value, selected),
    ...[...names].filter(Boolean).map(name => ({ group: '酒馆预设', label: name, value: name })),
  ];
});

function swapGenerationAliases() {
  [charReplacement.value, userReplacement.value] = [userReplacement.value, charReplacement.value];
}
function refreshTavernPresetNames() {
  tavernPresetNames.value = getPresetNamesSafe();
  const selected = settings.value.generation.tavernPresetName.trim();
  if (selected && !pluginPresetIdFromSelection(selected) && !tavernPresetNames.value.includes(selected))
    tavernPresetNames.value.unshift(selected);
}
onMounted(refreshTavernPresetNames);
</script>

<style scoped>
.pc-settings-panel-stack {
  display: grid;
}
.pc-preset-select-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 40px;
  align-items: center;
  gap: 8px;
}
.pc-compact-number {
  width: 76px;
}
.pc-settings-alias-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
@media (max-width: 420px) {
  .pc-settings-alias-grid {
    grid-template-columns: 1fr;
  }
}
</style>
