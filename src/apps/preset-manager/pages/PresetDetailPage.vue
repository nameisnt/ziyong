<template>
  <section ref="pageEl" class="pc-preset-page">
    <header class="pc-compact-toolbar pc-directory-toolbar pc-preset-detail-head">
      <div class="pc-directory-leading">
        <ActionMenu align="start" icon-only label="管理" icon="fa-solid fa-bars">
          <button type="button" :disabled="mutationBusy" @click="groupManagerOpen = true">
            <i class="fa-solid fa-folder-tree"></i><span>管理条目分组</span>
          </button>
          <button type="button" :disabled="mutationBusy" @click="$emit('rename-preset')">
            <i class="fa-solid fa-pen"></i><span>预设改名</span>
          </button>
          <button v-if="pluginPreset" type="button" :disabled="mutationBusy" @click="$emit('export-preset')">
            <i class="fa-solid fa-file-export"></i><span>导出预设</span>
          </button>
          <button
            v-if="pluginPreset && pluginPresetBuiltIn"
            type="button"
            :disabled="mutationBusy"
            @click="$emit('toggle-preset-visibility')"
          >
            <i :class="pluginPresetHidden ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'"></i>
            <span>{{ pluginPresetHidden ? '取消隐藏' : '隐藏预设' }}</span>
          </button>
          <button type="button" :disabled="mutationBusy || !presetMovable" @click="$emit('move-preset')">
            <i class="fa-solid fa-right-left"></i><span>{{ movePresetLabel }}</span>
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
        <span class="pc-directory-count">
          {{ preset ? `${preset.prompts.length} 个条目` : '正在读取条目' }}
        </span>
      </div>
      <button
        v-if="!pluginPreset && presetName !== loadedPresetName"
        class="pc-icon-btn primary"
        type="button"
        :disabled="mutationBusy || switchingPreset === presetName"
        title="使用这个预设"
        aria-label="使用这个预设"
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

    <PresetOwnershipPanel v-if="!errorMessage && preset && !pluginPreset" :preset-name="presetName" />

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

    <Teleport to="#tavern-phone-root .pc-phone-shell">
      <section
        v-if="groupManagerOpen && preset"
        class="pc-modal-backdrop pc-preset-group-manager-backdrop"
        role="presentation"
        @click.self="groupManagerOpen = false"
      >
        <article
          ref="groupManagerDialogRef"
          class="pc-section-card pc-modal-dialog pc-preset-group-manager-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="管理预设条目分组"
          tabindex="-1"
        >
          <header class="pc-compact-toolbar pc-preset-group-manager-head">
            <strong>条目分组</strong>
            <div>
              <button
                class="pc-icon-btn primary"
                type="button"
                :disabled="mutationBusy"
                title="新建条目分组"
                aria-label="新建条目分组"
                @click="$emit('create-prompt-group')"
              >
                <i class="fa-solid fa-folder-plus"></i>
              </button>
              <button
                class="pc-icon-btn"
                type="button"
                title="关闭"
                aria-label="关闭"
                @click="groupManagerOpen = false"
              >
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </header>

          <div class="pc-preset-group-manager-body">
            <section class="pc-preset-managed-groups">
              <article v-for="group in promptGroups" :key="group.id" class="pc-preset-managed-group-row">
                <header class="pc-preset-managed-group-head">
                  <span>
                    <strong>{{ group.name }}</strong>
                    <small>{{ groupPromptCount(group.id) }} 个条目</small>
                  </span>
                  <button
                    class="pc-icon-btn"
                    type="button"
                    :disabled="mutationBusy"
                    title="分组改名"
                    aria-label="分组改名"
                    @click="$emit('rename-prompt-group', group)"
                  >
                    <i class="fa-solid fa-pen"></i>
                  </button>
                  <button
                    class="pc-icon-btn danger"
                    type="button"
                    :disabled="mutationBusy"
                    title="删除分组"
                    aria-label="删除分组"
                    @click="$emit('delete-prompt-group', group)"
                  >
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </header>
                <div class="pc-preset-group-mode-row">
                  <span class="pc-field-label">选择方式</span>
                  <div class="pc-segment" aria-label="条目分组选择方式">
                    <button
                      :class="['pc-segment-btn', 'compact', { active: group.selectionMode === 'single' }]"
                      type="button"
                      :disabled="mutationBusy"
                      @click="requestGroupMode(group, 'single')"
                    >
                      单选
                    </button>
                    <button
                      :class="['pc-segment-btn', 'compact', { active: group.selectionMode === 'multiple' }]"
                      type="button"
                      :disabled="mutationBusy"
                      @click="requestGroupMode(group, 'multiple')"
                    >
                      复选
                    </button>
                  </div>
                </div>
                <section v-if="singleSelectionGroupId === group.id" class="pc-preset-single-selection">
                  <strong>保留一个已启用条目</strong>
                  <label>
                    <input v-model="retainedPromptId" type="radio" value="" />
                    <span>全部关闭</span>
                  </label>
                  <label v-for="prompt in enabledGroupPrompts(group.id)" :key="prompt.id">
                    <input v-model="retainedPromptId" type="radio" :value="prompt.id" />
                    <span>{{ prompt.name || prompt.id }}</span>
                  </label>
                  <div class="pc-form-actions">
                    <button class="pc-soft-btn" type="button" @click="cancelSingleSelection">取消</button>
                    <button class="pc-primary-btn" type="button" @click="confirmSingleSelection(group)">确定</button>
                  </div>
                </section>
                <div class="pc-preset-group-range-grid">
                  <div class="pc-field-group">
                    <span class="pc-field-label">开始条目</span>
                    <SearchableCombobox
                      :model-value="group.startPromptId"
                      :options="promptBoundaryOptions"
                      placeholder="选择开始条目"
                      input-label="选择分组开始条目"
                      :disabled="mutationBusy"
                      @update:model-value="
                        $emit('update-prompt-group-range', group, $event, group.endPromptId || $event)
                      "
                    />
                  </div>
                  <div class="pc-field-group">
                    <span class="pc-field-label">结束条目</span>
                    <SearchableCombobox
                      :model-value="group.endPromptId"
                      :options="promptBoundaryOptions"
                      placeholder="选择结束条目"
                      input-label="选择分组结束条目"
                      :disabled="mutationBusy"
                      @update:model-value="
                        $emit('update-prompt-group-range', group, group.startPromptId || $event, $event)
                      "
                    />
                  </div>
                </div>
                <button
                  v-if="group.startPromptId || group.endPromptId"
                  class="pc-soft-btn pc-preset-clear-group-range"
                  type="button"
                  :disabled="mutationBusy"
                  @click="$emit('update-prompt-group-range', group, '', '')"
                >
                  <i class="fa-solid fa-xmark"></i><span>清除范围</span>
                </button>
              </article>
              <EmptyState v-if="!promptGroups.length" title="还没有条目分组" />
            </section>
          </div>
        </article>
      </section>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import ActionMenu from '@/components/ActionMenu.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { usePhoneModalLifecycle } from '@/composables/usePhoneModalLifecycle';
import type { BaibaiPresetGroup, PresetDisplayNode, TavernPreset, TavernPresetPrompt } from '../api';
import PresetOwnershipPanel from './PresetOwnershipPanel.vue';
import PresetPromptRow from '../PresetPromptRow.vue';

const props = defineProps<{
  busyPromptIds: Set<string>;
  collapsedGroupIds: Set<string>;
  defaultAppIds: string[];
  defaultAppOptions: Array<{ icon: string; id: string; name: string }>;
  displayNodes: PresetDisplayNode[];
  errorMessage: string;
  loadedPresetName: string;
  loading: boolean;
  mutationBusy: boolean;
  movePresetLabel: string;
  pluginPreset: boolean;
  pluginPresetBuiltIn: boolean;
  pluginPresetHidden: boolean;
  preset: TavernPreset | null;
  presetDeletable: boolean;
  presetMovable: boolean;
  presetName: string;
  promptGroupIds: Map<string, string>;
  promptGroups: BaibaiPresetGroup[];
  promptDrag: { insertBeforeId: string; isDragging: boolean; promptId: string };
  switchingPreset: string;
}>();

const enabledOnly = defineModel<boolean>('enabledOnly', { required: true });

const emit = defineEmits<{
  'copy-prompt': [prompt: TavernPresetPrompt];
  'create-prompt-group': [];
  'delete-prompt-group': [group: BaibaiPresetGroup];
  'drag-cancel': [event: PointerEvent];
  'drag-end': [event: PointerEvent];
  'drag-move': [event: PointerEvent];
  'drag-start': [event: PointerEvent, prompt: TavernPresetPrompt, groupId: string];
  'delete-preset': [];
  'export-preset': [];
  'move-preset': [];
  'open-prompt': [prompt: TavernPresetPrompt];
  'rename-preset': [];
  'rename-prompt-group': [group: BaibaiPresetGroup];
  'update-prompt-group-mode': [
    group: BaibaiPresetGroup,
    selectionMode: BaibaiPresetGroup['selectionMode'],
    retainedPromptId?: string,
  ];
  'update-prompt-group-range': [group: BaibaiPresetGroup, startPromptId: string, endPromptId: string];
  'switch-preset': [presetName: string];
  'toggle-group': [groupId: string];
  'toggle-preset-visibility': [];
  'toggle-default-app': [appId: string, enabled: boolean];
  'toggle-prompt': [prompt: TavernPresetPrompt, enabled: boolean];
}>();

const pageEl = ref<HTMLElement | null>(null);
const groupManagerOpen = ref(false);
const groupManagerDialogRef = ref<HTMLElement | null>(null);
const retainedPromptId = ref('');
const singleSelectionGroupId = ref('');
const promptBoundaryOptions = computed(() =>
  (props.preset?.prompts ?? []).map((prompt, index) => ({
    label: `${index + 1}. ${prompt.name || prompt.id}`,
    value: prompt.id,
  })),
);

usePhoneModalLifecycle({
  dialogRef: groupManagerDialogRef,
  isOpen: () => groupManagerOpen.value,
  onClose: () => {
    groupManagerOpen.value = false;
  },
});

function groupPromptCount(groupId: string) {
  return [...props.promptGroupIds.values()].filter(value => value === groupId).length;
}

function enabledGroupPrompts(groupId: string) {
  return (props.preset?.prompts ?? []).filter(
    prompt => props.promptGroupIds.get(prompt.id) === groupId && prompt.enabled,
  );
}

function requestGroupMode(group: BaibaiPresetGroup, selectionMode: BaibaiPresetGroup['selectionMode']) {
  if (group.selectionMode === selectionMode) return;
  if (selectionMode === 'single') {
    const enabledPrompts = enabledGroupPrompts(group.id);
    if (enabledPrompts.length > 1) {
      singleSelectionGroupId.value = group.id;
      retainedPromptId.value = enabledPrompts[0]?.id ?? '';
      return;
    }
  }
  emit('update-prompt-group-mode', group, selectionMode);
}

function cancelSingleSelection() {
  singleSelectionGroupId.value = '';
  retainedPromptId.value = '';
}

function confirmSingleSelection(group: BaibaiPresetGroup) {
  emit('update-prompt-group-mode', group, 'single', retainedPromptId.value);
  cancelSingleSelection();
}

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
.pc-preset-group-manager-backdrop {
  --pc-modal-z: 72;
}
.pc-preset-group-manager-dialog {
  display: grid;
  width: min(100%, 390px);
  max-height: min(78%, 680px);
  grid-template-rows: auto minmax(0, 1fr);
  gap: 10px;
  padding: 10px;
  overflow: hidden;
}
.pc-preset-group-manager-head,
.pc-preset-group-manager-head > div,
.pc-preset-managed-group-head {
  display: flex;
  align-items: center;
}
.pc-preset-group-manager-head {
  justify-content: space-between;
}
.pc-preset-group-manager-head > div {
  gap: 6px;
}
.pc-preset-group-manager-body {
  min-height: 0;
  overflow-y: auto;
}
.pc-preset-managed-groups {
  display: grid;
}
.pc-preset-managed-group-row {
  display: grid;
  gap: 8px;
  padding: 10px 0;
  border-bottom: 1px solid var(--pc-border);
}
.pc-preset-managed-group-head {
  gap: 6px;
}
.pc-preset-managed-group-head > span {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 2px;
}
.pc-preset-managed-group-head :is(strong, small) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-preset-managed-group-head small {
  color: var(--pc-muted);
  font-size: 11px;
}
.pc-preset-group-range-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.pc-preset-group-mode-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.pc-preset-group-mode-row .pc-segment {
  width: min(210px, 70%);
}
.pc-preset-single-selection {
  display: grid;
  gap: 7px;
  padding: 9px;
  border: 1px solid var(--pc-border);
  border-radius: min(var(--pc-control-radius), 8px);
  background: var(--pc-surface);
}
.pc-preset-single-selection > label {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.pc-preset-single-selection input {
  width: 15px;
  height: 15px;
  margin: 0;
  accent-color: var(--pc-theme-accent);
}
.pc-preset-single-selection label span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-preset-clear-group-range {
  justify-self: end;
}
@media (max-width: 350px) {
  .pc-preset-group-range-grid {
    grid-template-columns: 1fr;
  }
}
</style>
