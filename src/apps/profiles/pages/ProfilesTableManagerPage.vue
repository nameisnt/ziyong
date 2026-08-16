<template>
  <section class="pc-profiles-page">
    <section class="pc-profile-table-manager">
      <div class="pc-compact-toolbar pc-directory-toolbar pc-profile-table-manager-head">
        <span class="pc-directory-count">{{ tables.length }} 个资料表</span>
        <button
          class="pc-icon-btn primary"
          type="button"
          title="新建资料表"
          aria-label="新建资料表"
          @click="$emit('create')"
        >
          <i class="fa-solid fa-plus"></i>
        </button>
      </div>
      <button
        v-for="table in tables"
        :key="table.id"
        class="pc-list-row pc-profile-table-manager-row"
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
.pc-profile-table-manager-row {
  grid-template-columns: 34px minmax(0, 1fr) auto;
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
