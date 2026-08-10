<template>
  <section class="pc-profiles-page">
    <article class="pc-editor-card pc-profile-table-editor">
      <span class="pc-kicker">{{ table.builtIn ? '内置资料表' : '自定义资料表' }}</span>
      <input v-model="name" class="pc-field" type="text" placeholder="表格名称" />
      <label class="pc-field-group"
        ><span>关联资料类型</span
        ><select v-model="kind" class="pc-field pc-select">
          <option v-for="option in kindOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
        </select></label
      >
      <details class="pc-profile-display-format">
        <summary>
          <span
            ><strong>资料展示</strong><small>{{ renderMode === 'frontend' ? '网页渲染' : 'Markdown' }}</small></span
          ><i class="fa-solid fa-chevron-down"></i>
        </summary>
        <div class="pc-profile-display-format-body">
          <span class="pc-segment"
            ><button
              :class="['pc-segment-btn', { active: renderMode === 'markdown' }]"
              type="button"
              @click="renderMode = 'markdown'"
            >
              Markdown</button
            ><button
              :class="['pc-segment-btn', { active: renderMode === 'frontend' }]"
              type="button"
              @click="renderMode = 'frontend'"
            >
              网页渲染
            </button></span
          ><textarea
            v-model="displayFormat"
            class="pc-area compact mono"
            placeholder="<character>\n身份：{{identity}}\n</character>"
          ></textarea
          ><button class="pc-soft-btn compact" type="button" @click="$emit('reset-format')">
            <i class="fa-solid fa-rotate-left"></i>重置格式
          </button>
        </div>
      </details>
      <section class="pc-profile-fields-editor">
        <div class="pc-profile-fields-head">
          <span
            ><strong>字段</strong><small>{{ columns.length }}</small></span
          ><button class="pc-icon-btn" type="button" title="添加字段" @click="$emit('add-column')">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
        <div class="pc-profile-column-list">
          <article
            v-for="column in columns"
            :key="column.id"
            class="pc-profile-column-row"
            :class="{
              disabled: !column.enabled,
              dragging: drag.isDragging && drag.columnId === column.id,
              'drop-before': drag.isDragging && drag.insertBeforeId === column.id,
            }"
            :data-profile-column-id="column.id"
          >
            <button
              class="pc-icon-btn pc-profile-column-drag-handle"
              type="button"
              title="拖拽排序"
              @click.prevent
              @pointercancel="$emit('drag-cancel', $event)"
              @pointerdown="$emit('drag-start', $event, column.id)"
              @pointermove="$emit('drag-move', $event)"
              @pointerup="$emit('drag-end', $event)"
            >
              <i class="fa-solid fa-grip-lines"></i></button
            ><button class="pc-profile-column-main" type="button" @click="$emit('open-column', column.id)">
              <strong>{{ column.label }}</strong
              ><span
                ><i v-if="isProtected(column.id)" class="fa-solid fa-lock" title="固定字段"></i
                ><i v-if="!column.enabled" class="fa-solid fa-eye-slash" title="字段已停用"></i
                ><i class="fa-solid fa-chevron-right"></i
              ></span>
            </button>
          </article>
        </div>
      </section>
      <div class="pc-form-actions">
        <button v-if="!table.builtIn" class="pc-soft-btn danger" type="button" @click="$emit('remove')">删除表格</button
        ><button class="pc-soft-btn" type="button" @click="$emit('back')">取消</button
        ><button class="pc-primary-btn" type="button" @click="$emit('save')">保存</button>
      </div>
    </article>
  </section>
</template>
<script setup lang="ts">
import type { ProfileKind, ProfileRenderMode, ProfileTable, ProfileTableColumn } from '../store';
defineProps<{
  columns: ProfileTableColumn[];
  drag: { columnId: string; insertBeforeId: string; isDragging: boolean };
  isProtected: (columnId: string) => boolean;
  kindOptions: Array<{ id: ProfileKind; label: string }>;
  table: ProfileTable;
}>();
const displayFormat = defineModel<string>('displayFormat', { required: true });
const kind = defineModel<ProfileKind>('kind', { required: true });
const name = defineModel<string>('name', { required: true });
const renderMode = defineModel<ProfileRenderMode>('renderMode', { required: true });
defineEmits<{
  'add-column': [];
  back: [];
  'drag-cancel': [event: PointerEvent];
  'drag-end': [event: PointerEvent];
  'drag-move': [event: PointerEvent];
  'drag-start': [event: PointerEvent, columnId: string];
  'open-column': [columnId: string];
  remove: [];
  'reset-format': [];
  save: [];
}>();
</script>
<style scoped>
.pc-profiles-page {
  display: grid;
  min-height: 100%;
  align-content: start;
  gap: 14px;
}
.pc-profile-table-editor,
.pc-profile-column-list,
.pc-profile-fields-editor {
  display: grid;
  gap: 10px;
}
.pc-profile-display-format {
  display: grid;
  gap: 10px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  padding: 12px;
  background: var(--pc-surface);
}
.pc-profile-display-format > summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
  list-style: none;
}
.pc-profile-display-format > summary > span {
  display: grid;
  gap: 3px;
}
.pc-profile-display-format > summary small {
  color: var(--pc-muted);
}
.pc-profile-display-format > summary > i {
  color: var(--pc-muted);
  transition: transform 160ms ease;
}
.pc-profile-display-format[open] > summary > i {
  transform: rotate(180deg);
}
.pc-profile-display-format-body {
  display: grid;
  gap: 10px;
  padding-top: 12px;
}
.pc-profile-fields-editor {
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  padding: 10px;
  background: var(--pc-surface);
}
.pc-profile-fields-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.pc-profile-fields-head > span {
  display: inline-flex;
  align-items: baseline;
  gap: 7px;
}
.pc-profile-fields-head small {
  color: var(--pc-muted);
}
.pc-profile-column-row {
  position: relative;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  min-height: 56px;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  padding: 9px 10px;
  background: var(--pc-surface-strong);
}
.pc-profile-column-row.drop-before::before {
  position: absolute;
  z-index: 2;
  top: -7px;
  right: 8px;
  left: 8px;
  height: 3px;
  border-radius: 2px;
  background: var(--pc-theme-accent);
  content: '';
}
.pc-profile-column-row.dragging {
  opacity: 0.55;
}
.pc-profile-column-row.disabled {
  color: var(--pc-muted);
}
.pc-profile-column-drag-handle {
  width: 34px;
  min-width: 34px;
  height: 34px;
  color: var(--pc-muted);
  touch-action: none;
}
.pc-profile-column-main {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 0;
  padding: 8px 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;
}
.pc-profile-column-main strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-profile-column-main span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--pc-muted);
}
</style>
