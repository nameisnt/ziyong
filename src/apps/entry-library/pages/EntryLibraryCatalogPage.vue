<template>
  <section class="pc-entry-library-page">
    <header class="pc-entry-library-head">
      <div>
        <span class="pc-kicker">独立提示词副本</span>
        <h2>条目库</h2>
      </div>
      <div class="pc-entry-library-head-actions">
        <ActionMenu label="工具" icon="fa-solid fa-screwdriver-wrench">
          <button type="button" @click="$emit('open-transfer')">
            <i class="fa-solid fa-arrow-right-arrow-left"></i><span>导入导出</span>
          </button>
          <button type="button" @click="$emit('open-dedupe')">
            <i class="fa-solid fa-clone"></i><span>收藏查重</span>
          </button>
          <button type="button" @click="$emit('open-bindings')">
            <i class="fa-solid fa-link"></i><span>分组绑定</span>
          </button>
        </ActionMenu>
        <ActionMenu label="新增" icon="fa-solid fa-plus">
          <button type="button" @click="$emit('open-manual')">
            <i class="fa-solid fa-pen-to-square"></i><span>手动新建</span>
          </button>
          <button type="button" @click="$emit('open-collect')">
            <i class="fa-solid fa-bookmark"></i><span>从预设或世界书收藏</span>
          </button>
        </ActionMenu>
      </div>
    </header>

    <div class="pc-entry-library-create">
      <input
        v-model="groupName"
        class="pc-field"
        type="text"
        placeholder="新分组名称"
        @keyup.enter="$emit('create-group')"
      />
      <button class="pc-primary-btn" type="button" :disabled="!groupName.trim()" @click="$emit('create-group')">
        新建
      </button>
    </div>

    <label v-if="itemCount" class="pc-entry-library-search"
      ><i class="fa-solid fa-magnifying-glass"></i
      ><input v-model="query" class="pc-field" type="search" placeholder="搜索收藏名称或内容"
    /></label>

    <div v-if="sections.length" class="pc-entry-library-groups">
      <section v-for="section in sections" :key="section.group.id" class="pc-entry-library-group">
        <header class="pc-entry-library-group-head">
          <button class="pc-entry-library-group-toggle" type="button" @click="$emit('toggle-group', section.group.id)">
            <i class="fa-solid fa-chevron-right" :class="{ expanded: section.open }"></i>
            <span
              ><strong>{{ section.group.name }}</strong
              ><small>{{ section.items.length }} 条</small></span
            >
          </button>
          <div class="pc-entry-library-group-actions">
            <label class="pc-toggle" :title="section.enableState === 'all' ? '全部停用' : '全部启用'">
              <input
                type="checkbox"
                :checked="section.enableState === 'all'"
                :disabled="!section.totalItems"
                :indeterminate="section.enableState === 'mixed'"
                :aria-label="section.enableState === 'all' ? '全部停用' : '全部启用'"
                @change="$emit('toggle-group-enabled', section.group.id, ($event.target as HTMLInputElement).checked)"
              />
              <span aria-hidden="true"></span>
            </label>
            <button
              class="pc-icon-btn danger"
              type="button"
              title="删除分组"
              @click="$emit('delete-group', section.group.id)"
            >
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </header>
        <div
          v-if="section.open"
          class="pc-entry-library-items"
          :class="{
            'drop-at-end': itemDrag.isDragging && itemDrag.groupId === section.group.id && !itemDrag.insertBeforeItemId,
          }"
        >
          <article
            v-for="item in section.items"
            :key="item.id"
            class="pc-section-card pc-entry-library-item"
            :class="{
              disabled: !item.enabled,
              dragging: itemDrag.isDragging && itemDrag.itemId === item.id,
              'drop-before': itemDrag.isDragging && itemDrag.insertBeforeItemId === item.id,
            }"
            :data-entry-group-id="section.group.id"
            :data-entry-item-id="item.id"
            @pointerdown="$emit('item-pointer-down', $event, item.id, section.group.id)"
            @pointermove="$emit('item-pointer-move', $event)"
            @pointerup="$emit('item-pointer-up', $event)"
            @pointercancel="$emit('item-pointer-cancel', $event)"
          >
            <button
              class="pc-icon-btn pc-entry-drag-handle"
              type="button"
              :disabled="Boolean(query.trim())"
              :title="query.trim() ? '清除搜索后排序' : '拖拽排序'"
              @click.prevent
            >
              <i class="fa-solid fa-grip-lines"></i>
            </button>
            <button class="pc-entry-library-item-main" type="button" @click="$emit('open-item', item.id)">
              <strong>{{ item.title }}</strong>
            </button>
            <div class="pc-entry-library-item-actions">
              <label class="pc-toggle" :title="item.enabled ? '停用条目' : '启用条目'"
                ><input
                  type="checkbox"
                  :checked="item.enabled"
                  :aria-label="item.enabled ? '停用条目' : '启用条目'"
                  @change="$emit('toggle-item', item.id, ($event.target as HTMLInputElement).checked)" /><span
                  aria-hidden="true"
                ></span
              ></label>
              <button class="pc-icon-btn danger" type="button" title="删除" @click="$emit('delete-item', item.id)">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </article>
          <EmptyState v-if="!section.items.length" compact title="这个分组没有匹配的条目" />
        </div>
      </section>
    </div>
    <EmptyState v-else :title="query.trim() ? '没有找到匹配的收藏' : '还没有收藏条目'"
      ><p>可以手动新建，也可以从预设或世界书批量复制到独立条目库。</p></EmptyState
    >
  </section>
</template>

<script setup lang="ts">
import ActionMenu from '@/components/ActionMenu.vue';
import EmptyState from '@/components/EmptyState.vue';
import type { EntryLibraryGroup, EntryLibraryItem } from '../store';

type CatalogSection = {
  enableState: 'all' | 'mixed' | 'none';
  group: EntryLibraryGroup;
  items: EntryLibraryItem[];
  open: boolean;
  totalItems: number;
};
defineProps<{
  itemCount: number;
  itemDrag: { groupId: string; insertBeforeItemId: string; isDragging: boolean; itemId: string };
  sections: CatalogSection[];
}>();
const groupName = defineModel<string>('groupName', { required: true });
const query = defineModel<string>('query', { required: true });
defineEmits<{
  'create-group': [];
  'delete-group': [groupId: string];
  'delete-item': [itemId: string];
  'item-pointer-cancel': [event: PointerEvent];
  'item-pointer-down': [event: PointerEvent, itemId: string, groupId: string];
  'item-pointer-move': [event: PointerEvent];
  'item-pointer-up': [event: PointerEvent];
  'open-bindings': [];
  'open-collect': [];
  'open-dedupe': [];
  'open-item': [itemId: string];
  'open-manual': [];
  'open-transfer': [];
  'toggle-group': [groupId: string];
  'toggle-group-enabled': [groupId: string, enabled: boolean];
  'toggle-item': [itemId: string, enabled: boolean];
}>();
</script>

<style scoped>
.pc-entry-library-page,
.pc-entry-library-groups,
.pc-entry-library-items {
  display: grid;
  min-height: 100%;
  align-content: start;
  gap: 12px;
}
.pc-entry-library-head,
.pc-entry-library-head-actions,
.pc-entry-library-create,
.pc-entry-library-group-head,
.pc-entry-library-group-actions,
.pc-entry-library-item-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pc-entry-library-head,
.pc-entry-library-group-head {
  justify-content: space-between;
}
.pc-entry-library-head h2 {
  margin: 3px 0 0;
  font-size: 19px;
}
.pc-entry-library-head-actions {
  flex: 0 0 auto;
}
.pc-entry-library-create .pc-field {
  min-width: 0;
  flex: 1;
}
.pc-entry-library-search {
  position: relative;
  display: block;
}
.pc-entry-library-search > i {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: 14px;
  color: var(--pc-muted);
  transform: translateY(-50%);
}
.pc-entry-library-search .pc-field {
  padding-left: 40px;
}
.pc-entry-library-group {
  display: grid;
  gap: 8px;
}
.pc-entry-library-group-head {
  min-width: 0;
}
.pc-entry-library-group-toggle {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 9px;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  text-align: left;
  cursor: pointer;
}
.pc-entry-library-group-toggle > i {
  color: var(--pc-muted);
  font-size: 11px;
  transition: transform 0.16s ease;
}
.pc-entry-library-group-toggle > i.expanded {
  transform: rotate(90deg);
}
.pc-entry-library-group-toggle > span {
  display: grid;
  min-width: 0;
  gap: 2px;
}
.pc-entry-library-group-toggle small {
  color: var(--pc-muted);
  font-size: 11px;
}
.pc-entry-library-item {
  position: relative;
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 58px;
  padding: 8px;
  touch-action: pan-y;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    opacity 0.16s ease,
    transform 0.16s ease;
}
.pc-entry-library-item.disabled {
  opacity: 0.62;
}
.pc-entry-library-item.dragging {
  z-index: 2;
  border-color: color-mix(in srgb, var(--pc-theme-accent) 52%, var(--pc-border) 48%);
  box-shadow: 0 10px 24px color-mix(in srgb, var(--pc-text) 14%, transparent 86%);
  opacity: 0.72;
  transform: scale(0.985);
}
.pc-entry-library-item.drop-before::before,
.pc-entry-library-items.drop-at-end::after {
  position: absolute;
  right: 8px;
  left: 8px;
  height: 3px;
  border-radius: 999px;
  background: var(--pc-theme-accent);
  content: '';
}
.pc-entry-library-item.drop-before::before {
  top: -8px;
}
.pc-entry-library-items.drop-at-end {
  position: relative;
}
.pc-entry-library-items.drop-at-end::after {
  bottom: -7px;
}
.pc-entry-drag-handle {
  width: 32px;
  min-width: 32px;
  height: 32px;
  background: transparent;
  color: var(--pc-muted);
  cursor: grab;
}
.pc-entry-library-item-main {
  display: block;
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  text-align: left;
  cursor: pointer;
}
.pc-entry-library-item-main strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-entry-library-item-actions .pc-toggle,
.pc-entry-library-group-actions .pc-toggle {
  --pc-toggle-width: 44px;
  --pc-toggle-height: 26px;
  --pc-toggle-thumb-size: 20px;
}
</style>
