<template>
  <div class="pc-bulk-selection-bar">
    <span>{{ selectedCount ? `已选 ${selectedCount} / ${totalCount}` : `请选择要删除的记录，共 ${totalCount} 条` }}</span>
    <div class="pc-bulk-selection-actions">
      <button class="pc-soft-btn compact" type="button" :disabled="!totalCount" @click="$emit('toggle-all')">
        {{ allSelected ? '取消全选' : '全选' }}
      </button>
      <button class="pc-soft-btn compact danger" type="button" :disabled="!selectedCount" @click="$emit('remove')">
        <i class="fa-solid fa-trash"></i><span>删除所选</span>
      </button>
      <button class="pc-icon-btn" type="button" aria-label="退出批量选择" title="退出批量选择" @click="$emit('cancel')">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  allSelected: boolean;
  selectedCount: number;
  totalCount: number;
}>();

defineEmits<{
  cancel: [];
  remove: [];
  'toggle-all': [];
}>();
</script>

<style scoped>
.pc-bulk-selection-bar,
.pc-bulk-selection-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pc-bulk-selection-bar {
  min-width: 0;
  justify-content: space-between;
  border-bottom: 1px solid var(--pc-border);
  padding: 8px 0 10px;
}

.pc-bulk-selection-bar > span {
  min-width: 0;
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-bulk-selection-actions {
  flex: 0 0 auto;
}

@media (max-width: 390px) {
  .pc-bulk-selection-bar {
    align-items: stretch;
    flex-direction: column;
  }

  .pc-bulk-selection-actions > .pc-soft-btn {
    flex: 1 1 0;
  }
}
</style>
