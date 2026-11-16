<template>
  <section class="pc-card-writer-page">
    <article class="pc-section-card pc-card-writer-import-summary">
      <div>
        <span class="pc-kicker">
          导入目标
          <InfoHint text="成品按 XML 标签拆分。世界观区域、详情和事件会成为独立资料；同名人物的基础与性格会合并。" />
        </span>
        <strong>{{ ownerName }} / {{ chatTitle }}</strong>
        <small>只会写入上方聊天的资料表，不会改动写卡成品或创建聊天文件。</small>
      </div>
    </article>

    <div class="pc-field-group">
      <label class="pc-field-label">遇到相同来源资料</label>
      <div class="pc-card-writer-conflict-modes">
        <button
          v-for="option in conflictOptions"
          :key="option.value"
          :class="['pc-segment-btn', { active: conflictMode === option.value }]"
          type="button"
          @click="emit('update:conflictMode', option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <p v-if="errorMessage" class="pc-card-writer-import-error">{{ errorMessage }}</p>

    <div v-if="rows.length" class="pc-directory-list pc-card-writer-import-list">
      <article v-for="row in rows" :key="row.key" class="pc-list-row">
        <input
          :checked="row.selected"
          type="checkbox"
          :aria-label="`选择 ${row.title}`"
          @change="emit('select', row.key, ($event.target as HTMLInputElement).checked)"
        />
        <span class="pc-card-writer-import-copy">
          <strong>{{ row.title }}</strong>
          <small>{{ row.kindLabel }} · &lt;{{ row.tagName }}&gt;</small>
        </span>
        <span v-if="row.conflict" class="pc-card-writer-import-conflict">已存在</span>
        <SearchableCombobox
          class="pc-card-writer-import-mapping"
          input-label="目标资料表"
          :model-value="row.sheetKey"
          :options="tableOptions"
          placeholder="选择资料表"
          @update:model-value="emit('updateSheet', row.key, $event)"
        />
      </article>
    </div>
    <EmptyState
      v-else
      title="没有识别到可导入的 XML 标签"
      description="请在成品中使用世界观、角色基础、性格或 NPC 标签。"
    />

    <div class="pc-form-actions">
      <button class="pc-soft-btn" type="button" :disabled="!rows.length" @click="emit('toggleAll')">
        {{ allSelected ? '取消全选' : '全选' }}
      </button>
      <button class="pc-primary-btn" type="button" :disabled="!selectedCount" @click="emit('import')">
        导入 {{ selectedCount }} 项
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import InfoHint from '@/components/InfoHint.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';

type ConflictMode = 'copy' | 'skip' | 'update';

defineProps<{
  allSelected: boolean;
  chatTitle: string;
  conflictMode: ConflictMode;
  conflictOptions: Array<{ label: string; value: ConflictMode }>;
  errorMessage: string;
  ownerName: string;
  rows: Array<{
    conflict: boolean;
    key: string;
    kindLabel: string;
    selected: boolean;
    sheetKey: string;
    tagName: string;
    title: string;
  }>;
  selectedCount: number;
  tableOptions: Array<{ label: string; value: string }>;
}>();

const emit = defineEmits<{
  import: [];
  select: [key: string, selected: boolean];
  toggleAll: [];
  'update:conflictMode': [mode: ConflictMode];
  updateSheet: [key: string, sheetKey: string];
}>();
</script>

<style scoped>
.pc-card-writer-import-summary,
.pc-card-writer-import-summary > div,
.pc-card-writer-import-copy {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.pc-card-writer-import-summary {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
}

.pc-card-writer-import-summary small,
.pc-card-writer-import-copy small {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-card-writer-conflict-modes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.pc-card-writer-import-list {
  display: grid;
  gap: 0;
}

.pc-card-writer-import-list .pc-list-row {
  grid-template-columns: auto minmax(0, 1fr) auto;
}

.pc-card-writer-import-mapping {
  grid-column: 2 / -1;
  width: 100%;
}

.pc-card-writer-import-error {
  min-width: 0;
  max-width: 100%;
  margin: 0;
  color: var(--pc-danger);
  font-size: 12px;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.pc-card-writer-import-conflict {
  color: var(--pc-danger);
  font-size: 11px;
  font-weight: 700;
}
</style>
