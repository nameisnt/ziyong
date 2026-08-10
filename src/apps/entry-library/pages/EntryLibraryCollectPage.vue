<template>
  <section class="pc-entry-library-page pc-entry-library-collect-page">
    <div class="pc-entry-library-collect-scroll">
      <div class="pc-segment">
        <button
          :class="['pc-segment-btn', { active: sourceType === 'preset' }]"
          type="button"
          @click="$emit('change-source-type', 'preset')"
        >
          预设</button
        ><button
          :class="['pc-segment-btn', { active: sourceType === 'worldbook' }]"
          type="button"
          @click="$emit('change-source-type', 'worldbook')"
        >
          世界书
        </button>
      </div>
      <label class="pc-field-group"
        ><span>{{ sourceType === 'preset' ? '选择预设' : '选择世界书' }}</span
        ><select v-model="sourceName" class="pc-select" @change="$emit('load-source')">
          <option value="">请选择来源</option>
          <option v-for="name in sourceNames" :key="name" :value="name">{{ name }}</option>
        </select></label
      >
      <label class="pc-field-group"
        ><span>收藏到分组</span
        ><select v-model="groupId" class="pc-select">
          <option value="">请选择分组</option>
          <option v-for="group in groups" :key="group.id" :value="group.id">{{ group.name }}</option>
        </select></label
      >
      <label class="pc-entry-library-search"
        ><i class="fa-solid fa-magnifying-glass"></i
        ><input v-model="query" class="pc-field" type="search" placeholder="搜索条目名称或内容"
      /></label>
      <div class="pc-entry-library-select-actions">
        <span>已选 {{ visibleSelectedCount }} / {{ entries.length }}</span>
        <div>
          <button class="pc-soft-btn compact" type="button" @click="$emit('select-all')">全选</button
          ><button class="pc-soft-btn compact" type="button" @click="$emit('invert')">反选</button
          ><button class="pc-soft-btn compact" type="button" @click="$emit('clear')">清空</button>
        </div>
      </div>
      <div class="pc-entry-library-source-list">
        <label v-for="entry in entries" :key="entry.key" class="pc-section-card pc-entry-source-row"
          ><input
            type="checkbox"
            :checked="selectedKeys.has(entry.key)"
            @change="$emit('toggle-entry', entry.key)"
          /><span
            ><strong>{{ entry.title }}</strong
            ><small>{{ compact(entry.content) }}</small></span
          ></label
        >
        <EmptyState v-if="!loading && !entries.length" compact title="没有可收藏的条目" />
        <EmptyState v-else-if="loading" compact title="正在读取条目" />
      </div>
    </div>
    <footer class="pc-entry-library-collect-footer">
      <div>
        <strong>{{ selectedKeys.size ? `${selectedKeys.size} 条` : '尚未选择' }}</strong
        ><small>{{ groupName ? `收藏到「${groupName}」` : '请选择收藏分组' }}</small>
      </div>
      <button class="pc-primary-btn" type="button" :disabled="!groupId || !selectedKeys.size" @click="$emit('collect')">
        <i class="fa-solid fa-bookmark"></i>收藏所选
      </button>
    </footer>
  </section>
</template>
<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import type { EntryLibraryGroup } from '../store';
import type { EntryLibrarySourceEntry } from '../types';
defineProps<{
  entries: EntryLibrarySourceEntry[];
  groupName: string;
  groups: EntryLibraryGroup[];
  loading: boolean;
  selectedKeys: Set<string>;
  sourceNames: string[];
  sourceType: 'preset' | 'worldbook';
  visibleSelectedCount: number;
}>();
const groupId = defineModel<string>('groupId', { required: true });
const query = defineModel<string>('query', { required: true });
const sourceName = defineModel<string>('sourceName', { required: true });
defineEmits<{
  'change-source-type': [type: 'preset' | 'worldbook'];
  clear: [];
  collect: [];
  invert: [];
  'load-source': [];
  'select-all': [];
  'toggle-entry': [key: string];
}>();
function compact(content: string) {
  const text = content.replace(/\s+/g, ' ').trim();
  return text.length > 96 ? `${text.slice(0, 96)}...` : text;
}
</script>
<style scoped>
.pc-entry-library-page,
.pc-entry-library-collect-scroll,
.pc-entry-library-source-list {
  display: grid;
  align-content: start;
  gap: 12px;
}
.pc-entry-library-collect-page {
  height: 100%;
  min-height: 0;
  grid-template-rows: minmax(0, 1fr) auto;
  align-content: stretch;
  overflow: hidden;
}
.pc-entry-library-collect-scroll {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 2px 10px 0;
}
.pc-entry-library-collect-footer {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 10px 0 max(2px, env(safe-area-inset-bottom));
  border-top: 1px solid var(--pc-border);
  background: color-mix(in srgb, var(--pc-surface) 92%, transparent 8%);
  box-shadow: 0 -10px 18px color-mix(in srgb, var(--pc-text) 7%, transparent 93%);
}
.pc-entry-library-collect-footer > div {
  display: grid;
  min-width: 0;
  gap: 3px;
}
.pc-entry-library-collect-footer strong,
.pc-entry-library-collect-footer small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-entry-library-collect-footer small {
  color: var(--pc-muted);
  font-size: 11px;
}
.pc-entry-library-collect-footer .pc-primary-btn {
  min-width: 126px;
  margin: 0;
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
.pc-entry-library-select-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--pc-muted);
  font-size: 12px;
}
.pc-entry-library-select-actions > div {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}
.pc-entry-source-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
}
.pc-entry-source-row > span {
  display: grid;
  min-width: 0;
  gap: 4px;
}
.pc-entry-source-row small {
  display: -webkit-box;
  overflow: hidden;
  color: var(--pc-muted);
  font-size: 11px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
</style>
