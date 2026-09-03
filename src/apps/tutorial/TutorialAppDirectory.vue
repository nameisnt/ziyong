<template>
  <section class="pc-tutorial-directory">
    <label class="pc-search-field pc-tutorial-directory-search">
      <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
      <input v-model="query" type="search" :aria-label="t`搜索 App`" :placeholder="t`搜索 App 名称、用途或第一步`" />
    </label>

    <div v-if="visibleItemCount" class="pc-tutorial-directory-groups">
      <section v-for="group in visibleGroups" :key="group.id" class="pc-tutorial-directory-group">
        <button
          class="pc-tutorial-directory-toggle"
          type="button"
          :aria-expanded="isGroupOpen(group.id)"
          @click="toggleGroup(group.id)"
        >
          <span>
            <i class="fa-solid" :class="isGroupOpen(group.id) ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
            <strong>{{ group.label }}</strong>
          </span>
          <small>{{ group.items.length }}</small>
        </button>

        <div v-if="isGroupOpen(group.id)" class="pc-tutorial-directory-list">
          <article v-for="item in group.items" :key="item.appId" class="pc-tutorial-directory-row">
            <span class="pc-tutorial-directory-icon">
              <i class="fa-solid" :class="item.app.icon"></i>
            </span>
            <span class="pc-tutorial-directory-copy">
              <strong>{{ item.app.name }}</strong>
              <small>{{ item.app.description }}</small>
              <p>{{ item.firstAction }}</p>
            </span>
            <button
              class="pc-icon-btn"
              type="button"
              :title="t`打开 ${item.app.name}`"
              :aria-label="t`打开 ${item.app.name}`"
              @click="phone.openApp(item.appId)"
            >
              <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </button>
          </article>
        </div>
      </section>
    </div>

    <EmptyState v-else compact :title="t`没有匹配的 App`" />
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import { getPhoneAppDefinitions } from '@/core/appLayout';
import { usePhoneStore } from '@/store/phone';
import { buildTutorialAppDirectory, type TutorialAppGroupId } from './appCatalog';

const phone = usePhoneStore();
const query = ref('');
const groups = buildTutorialAppDirectory(getPhoneAppDefinitions());
const openGroupIds = ref<TutorialAppGroupId[]>(groups[0] ? [groups[0].id] : []);

const visibleGroups = computed(() => {
  const keyword = query.value.trim().toLocaleLowerCase();
  if (!keyword) return groups;
  return groups
    .map(group => ({
      ...group,
      items: group.items.filter(item =>
        [item.app.name, item.app.description, item.firstAction].join('\n').toLocaleLowerCase().includes(keyword),
      ),
    }))
    .filter(group => group.items.length);
});

const visibleItemCount = computed(() => visibleGroups.value.reduce((total, group) => total + group.items.length, 0));

function isGroupOpen(groupId: TutorialAppGroupId) {
  return openGroupIds.value.includes(groupId);
}

function toggleGroup(groupId: TutorialAppGroupId) {
  openGroupIds.value = openGroupIds.value.includes(groupId)
    ? openGroupIds.value.filter(id => id !== groupId)
    : [...openGroupIds.value, groupId];
}

watch(
  () => query.value.trim().toLocaleLowerCase(),
  keyword => {
    if (!keyword) return;
    openGroupIds.value = visibleGroups.value.map(group => group.id);
  },
);
</script>

<style scoped>
.pc-tutorial-directory,
.pc-tutorial-directory-groups,
.pc-tutorial-directory-group,
.pc-tutorial-directory-list,
.pc-tutorial-directory-copy {
  display: grid;
  min-width: 0;
}

.pc-tutorial-directory {
  gap: 14px;
}

.pc-tutorial-directory-groups {
  gap: 12px;
}

.pc-tutorial-directory-group {
  gap: 0;
  border-bottom: 1px solid var(--pc-border);
}

.pc-tutorial-directory-toggle {
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 0;
  padding: 8px 2px;
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.pc-tutorial-directory-toggle > span {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
}

.pc-tutorial-directory-toggle > span > i {
  width: 14px;
  color: var(--pc-muted);
  font-size: 12px;
  text-align: center;
}

.pc-tutorial-directory-toggle small {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-tutorial-directory-list {
  padding-bottom: 8px;
}

.pc-tutorial-directory-row {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) 36px;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 12px 2px 12px 14px;
  border-top: 1px solid color-mix(in srgb, var(--pc-border) 66%, transparent 34%);
}

.pc-tutorial-directory-icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: var(--pc-control-radius);
  background: color-mix(in srgb, var(--pc-theme-accent) 12%, var(--pc-surface-strong) 88%);
  color: var(--pc-theme-accent);
}

.pc-tutorial-directory-copy {
  gap: 3px;
}

.pc-tutorial-directory-copy strong,
.pc-tutorial-directory-copy small,
.pc-tutorial-directory-copy p {
  min-width: 0;
  margin: 0;
}

.pc-tutorial-directory-copy strong {
  color: var(--pc-text);
  font-size: 14px;
}

.pc-tutorial-directory-copy small {
  overflow: hidden;
  color: var(--pc-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-tutorial-directory-copy p {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--pc-text);
  font-size: 12px;
  line-height: 1.5;
}

/* ui-reuse-allow: UI-TUTORIAL-DIRECTORY-001 row action matches the compact directory density. */
.pc-tutorial-directory-row .pc-icon-btn {
  width: 34px;
  height: 34px;
}
</style>
