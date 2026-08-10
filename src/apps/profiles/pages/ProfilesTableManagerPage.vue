<template>
  <section class="pc-profiles-page">
    <section class="pc-section-card pc-profile-table-manager">
      <div class="pc-profile-table-manager-head">
        <div>
          <span class="pc-kicker">资料表</span>
          <h2>表格类型</h2>
        </div>
        <button class="pc-icon-btn primary" type="button" title="新建资料表" @click="$emit('create')">
          <i class="fa-solid fa-plus"></i>
        </button>
      </div>
      <button
        v-for="table in tables"
        :key="table.id"
        class="pc-profile-table-manager-row"
        type="button"
        @click="$emit('open', table.id)"
      >
        <i :class="['fa-solid', 'pc-profile-table-manager-icon', kindIcon(table.kind)]"></i
        ><span
          ><strong>{{ table.name }}</strong
          ><small
            >{{ table.builtIn ? '内置' : '自定义' }} · {{ table.columns.length }} 个字段 ·
            {{ entryCount(table.id) }} 条</small
          ></span
        ><i class="fa-solid fa-chevron-right"></i>
      </button>
    </section>
  </section>
</template>
<script setup lang="ts">
import type { ProfileKind, ProfileTable } from '../store';
defineProps<{
  entryCount: (tableId: string) => number;
  kindIcon: (kind: ProfileKind) => string;
  tables: ProfileTable[];
}>();
defineEmits<{ create: []; open: [tableId: string] }>();
</script>
<style scoped>
.pc-profiles-page {
  display: grid;
  min-height: 100%;
  align-content: start;
  gap: 14px;
}
.pc-profile-table-manager {
  display: grid;
  gap: 10px;
}
.pc-profile-table-manager-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.pc-profile-table-manager-head h2 {
  margin: 4px 0 0;
  font-size: 18px;
}
.pc-profile-table-manager-row {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  padding: 12px;
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  cursor: pointer;
  text-align: left;
}
.pc-profile-table-manager-icon {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--pc-theme-accent) 12%, var(--pc-surface) 88%);
  color: var(--pc-theme-accent);
}
.pc-profile-table-manager-row span {
  display: grid;
  min-width: 0;
  gap: 4px;
}
.pc-profile-table-manager-row small {
  color: var(--pc-muted);
}
</style>
