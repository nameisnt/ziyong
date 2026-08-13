<template>
  <section ref="pageEl" class="pc-preset-page">
    <header class="pc-compact-toolbar pc-directory-toolbar pc-preset-detail-head">
      <span class="pc-directory-count">
        {{ preset ? `${preset.prompts.length} 个条目` : '正在读取条目' }}
      </span>
      <ActionMenu label="管理" icon="fa-solid fa-bars">
        <button type="button" :disabled="mutationBusy" @click="$emit('rename-preset')">
          <i class="fa-solid fa-pen"></i><span>预设改名</span>
        </button>
        <button v-if="pluginPreset" type="button" :disabled="mutationBusy" @click="$emit('export-preset')">
          <i class="fa-solid fa-file-export"></i><span>导出预设</span>
        </button>
        <button
          v-if="presetDeletable"
          class="danger"
          type="button"
          :disabled="mutationBusy"
          @click="$emit('delete-preset')"
        >
          <i class="fa-solid fa-trash"></i><span>删除预设</span>
        </button>
      </ActionMenu>
      <button
        v-if="!pluginPreset && presetName !== loadedPresetName"
        class="pc-icon-btn primary"
        type="button"
        :disabled="mutationBusy || switchingPreset === presetName"
        title="使用这个预设"
        @click="$emit('switch-preset', presetName)"
      >
        <i class="fa-solid fa-play"></i>
      </button>
    </header>

    <div v-if="errorMessage" class="pc-section-card pc-preset-error">
      <strong>无法读取预设</strong>
      <span>{{ errorMessage }}</span>
    </div>

    <section v-if="!errorMessage && preset && pluginPreset" class="pc-section-card pc-preset-default-apps">
      <header>
        <strong>默认使用此预设的 App</strong>
        <span>打开所选 App 的生成页时，初始选择这个插件预设；仍可临时改选其他预设。</span>
      </header>
      <div class="pc-preset-app-grid">
        <label v-for="app in defaultAppOptions" :key="app.id" class="pc-preset-app-option">
          <input
            type="checkbox"
            :checked="defaultAppIds.includes(app.id)"
            :disabled="mutationBusy"
            @change="$emit('toggle-default-app', app.id, ($event.target as HTMLInputElement).checked)"
          />
          <i :class="['fa-solid', app.icon]"></i>
          <span>{{ app.name }}</span>
        </label>
      </div>
    </section>

    <div v-if="!errorMessage && preset" class="pc-preset-filter-row">
      <span>只看当前已启用条目</span>
      <label class="pc-toggle" title="只显示当前实际启用的预设条目">
        <input v-model="enabledOnly" type="checkbox" aria-label="只看当前已启用条目" />
        <span aria-hidden="true"></span>
      </label>
    </div>

    <div v-if="!errorMessage && preset" class="pc-preset-nodes">
      <template
        v-for="node in displayNodes"
        :key="node.type === 'group' ? `group:${node.group.id}` : `prompt:${node.prompt.id}`"
      >
        <PresetPromptRow
          v-if="node.type === 'prompt'"
          :busy="busyPromptIds.has(node.prompt.id)"
          :dragging="promptDrag.promptId === node.prompt.id && promptDrag.isDragging"
          :drop-before="promptDrag.insertBeforeId === node.prompt.id"
          group-id="__ungrouped__"
          :prompt="node.prompt"
          :reorderable="!enabledOnly"
          @copy="$emit('copy-prompt', $event)"
          @drag-cancel="$emit('drag-cancel', $event)"
          @drag-end="$emit('drag-end', $event)"
          @drag-move="$emit('drag-move', $event)"
          @drag-start="$emit('drag-start', $event, node.prompt, '__ungrouped__')"
          @open="$emit('open-prompt', $event)"
          @toggle="(prompt, enabled) => $emit('toggle-prompt', prompt, enabled)"
        />

        <section v-else class="pc-preset-group">
          <button class="pc-preset-group-head" type="button" @click="$emit('toggle-group', node.group.id)">
            <i class="fa-solid fa-chevron-right" :class="{ expanded: !collapsedGroupIds.has(node.group.id) }"></i>
            <span>
              <strong>{{ node.group.name }}</strong>
              <small>
                {{ node.prompts.filter(prompt => prompt.enabled).length }}/{{ node.prompts.length }} 启用
                <template v-if="!node.group.enabled"> · 组已停用</template>
              </small>
            </span>
          </button>
          <div v-if="!collapsedGroupIds.has(node.group.id)" class="pc-preset-group-body">
            <PresetPromptRow
              v-for="prompt in node.prompts"
              :key="prompt.id"
              :busy="busyPromptIds.has(prompt.id)"
              :dragging="promptDrag.promptId === prompt.id && promptDrag.isDragging"
              :drop-before="promptDrag.insertBeforeId === prompt.id"
              :group-id="node.group.id"
              :group-disabled="!node.group.enabled"
              :prompt="prompt"
              :reorderable="!enabledOnly"
              @copy="$emit('copy-prompt', $event)"
              @drag-cancel="$emit('drag-cancel', $event)"
              @drag-end="$emit('drag-end', $event)"
              @drag-move="$emit('drag-move', $event)"
              @drag-start="$emit('drag-start', $event, prompt, node.group.id)"
              @open="$emit('open-prompt', $event)"
              @toggle="(item, enabled) => $emit('toggle-prompt', item, enabled)"
            />
          </div>
        </section>
      </template>
      <EmptyState
        v-if="!displayNodes.length"
        :title="enabledOnly ? '这个预设没有当前已启用的条目' : '这个预设没有条目'"
      />
    </div>
    <EmptyState v-else-if="loading" title="正在读取预设" />
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import ActionMenu from '@/components/ActionMenu.vue';
import type { PresetDisplayNode, TavernPreset, TavernPresetPrompt } from '../api';
import PresetPromptRow from '../PresetPromptRow.vue';

defineProps<{
  busyPromptIds: Set<string>;
  collapsedGroupIds: Set<string>;
  defaultAppIds: string[];
  defaultAppOptions: Array<{ icon: string; id: string; name: string }>;
  displayNodes: PresetDisplayNode[];
  errorMessage: string;
  loadedPresetName: string;
  loading: boolean;
  mutationBusy: boolean;
  pluginPreset: boolean;
  preset: TavernPreset | null;
  presetDeletable: boolean;
  presetName: string;
  promptDrag: { insertBeforeId: string; isDragging: boolean; promptId: string };
  switchingPreset: string;
}>();

const enabledOnly = defineModel<boolean>('enabledOnly', { required: true });

defineEmits<{
  'copy-prompt': [prompt: TavernPresetPrompt];
  'drag-cancel': [event: PointerEvent];
  'drag-end': [event: PointerEvent];
  'drag-move': [event: PointerEvent];
  'drag-start': [event: PointerEvent, prompt: TavernPresetPrompt, groupId: string];
  'delete-preset': [];
  'export-preset': [];
  'open-prompt': [prompt: TavernPresetPrompt];
  'rename-preset': [];
  'switch-preset': [presetName: string];
  'toggle-group': [groupId: string];
  'toggle-default-app': [appId: string, enabled: boolean];
  'toggle-prompt': [prompt: TavernPresetPrompt, enabled: boolean];
}>();

const pageEl = ref<HTMLElement | null>(null);
defineExpose({ getScrollElement: () => pageEl.value });
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
.pc-preset-filter-row {
  display: flex;
  min-height: 42px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--pc-text);
  font-size: 13px;
  font-weight: 700;
}
.pc-preset-default-apps {
  display: grid;
  gap: 10px;
  padding: 12px;
}
.pc-preset-default-apps header {
  display: grid;
  gap: 3px;
}
.pc-preset-default-apps header span {
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.45;
}
.pc-preset-app-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}
.pc-preset-app-option {
  display: flex;
  min-width: 0;
  min-height: 32px;
  align-items: center;
  gap: 6px;
  padding: 5px 7px;
  border: 1px solid var(--pc-border);
  border-radius: min(var(--pc-control-radius), 8px);
  background: var(--pc-surface);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
}
.pc-preset-app-option input {
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: var(--pc-theme-accent);
}
.pc-preset-app-option span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-preset-nodes,
.pc-preset-group-body {
  display: grid;
  gap: 0;
}
.pc-preset-error {
  color: var(--pc-danger);
}
.pc-preset-error span {
  color: var(--pc-muted);
  font-size: 13px;
}
.pc-preset-group {
  display: grid;
  gap: 0;
}
.pc-preset-group-head {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 10px;
  border: 0;
  padding: 9px 4px;
  background: transparent;
  color: var(--pc-text);
  text-align: left;
  cursor: pointer;
}
.pc-preset-group-head > i {
  color: var(--pc-muted);
  font-size: 12px;
  transition: transform 0.16s ease;
}
.pc-preset-group-head > i.expanded {
  transform: rotate(90deg);
}
.pc-preset-group-head > span {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.pc-preset-group-head strong,
.pc-preset-group-head small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-preset-group-head small {
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 700;
}
.pc-preset-group-body {
  padding-left: 12px;
  border-left: 2px solid color-mix(in srgb, var(--pc-theme-accent) 24%, var(--pc-border) 76%);
}
</style>
