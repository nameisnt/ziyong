<template>
  <section class="pc-worldbook-detail-page">
    <header class="pc-directory-toolbar pc-worldbook-detail-head">
      <div v-if="status" class="pc-worldbook-metrics">
        <span class="category">{{ categoryLabel }}</span>
        <span>{{ status.currentEntries.length }} {{ t`个条目` }}</span>
        <span>{{ status.enabledCount }} {{ t`个启用` }}</span>
        <span>{{
          status.profile ? `${status.profile.entries.filter(entry => entry.enabled).length} 个关联` : t`未关联`
        }}</span>
      </div>
      <button class="pc-soft-btn compact" type="button" :disabled="busy" @click="$emit('rename-book')">
        {{ t`修改书名` }}
      </button>
    </header>

    <label class="pc-search-field pc-worldbook-search">
      <i class="fa-solid fa-magnifying-glass"></i>
      <input v-model="query" type="search" :placeholder="t`搜索条目名称`" />
    </label>

    <article v-if="status" class="pc-page-section pc-worldbook-link-bar">
      <div class="pc-worldbook-link-main">
        <strong>{{ t`聊天联动` }}</strong>
        <span :class="{ linked: status.profile }">{{ linkStateLabel }}</span>
      </div>
      <div class="pc-worldbook-link-actions">
        <template v-if="status.profile">
          <button
            class="pc-icon-btn"
            type="button"
            :disabled="busy"
            :title="t`应用聊天配置`"
            @click="$emit('apply-profile')"
          >
            <i class="fa-solid fa-play"></i>
          </button>
          <button
            class="pc-icon-btn"
            type="button"
            :disabled="busy"
            :title="t`以当前状态更新配置`"
            @click="$emit('capture-profile')"
          >
            <i class="fa-solid fa-floppy-disk"></i>
          </button>
          <button
            class="pc-icon-btn danger"
            type="button"
            :disabled="busy"
            :title="t`停止联动`"
            @click="$emit('unlink')"
          >
            <i class="fa-solid fa-link-slash"></i>
          </button>
        </template>
        <button
          v-else
          class="pc-soft-btn pc-worldbook-link-create"
          type="button"
          :disabled="busy"
          @click="$emit('capture-profile')"
        >
          <i class="fa-solid fa-link"></i><span>{{ t`关联` }}</span>
        </button>
      </div>
      <small v-if="status.profile && !status.matchesCurrent">{{ t`当前状态与配置不同` }}</small>
      <small v-if="status.missingCount">{{ status.missingCount }} {{ t`个配置条目已不存在` }}</small>
    </article>

    <template v-if="status">
      <section v-for="section in sections" :key="section.id" class="pc-worldbook-group">
        <header class="pc-worldbook-group-head">
          <strong>{{ section.label }}</strong
          ><span>{{ section.entries.length }}</span>
        </header>
        <div v-if="section.entries.length" class="pc-directory-list pc-worldbook-entry-list">
          <article
            v-for="entry in section.entries"
            :key="entry.uid"
            class="pc-list-row pc-worldbook-entry"
            :class="{ disabled: !entry.enabled }"
          >
            <button class="pc-worldbook-entry-open" type="button" @click="$emit('open-entry', entry)">
              <span
                :class="['pc-worldbook-entry-lamp', entry.strategy.type === 'constant' ? 'green' : 'blue']"
                aria-hidden="true"
              ></span>
              <span class="pc-worldbook-entry-copy">
                <strong :title="entry.name || `条目 #${entry.uid}`">{{ entry.name || `条目 #${entry.uid}` }}</strong>
                <small>{{ entryPositionSummary(entry) }}</small>
              </span>
              <i class="fa-solid fa-chevron-right pc-worldbook-chevron"></i>
            </button>
            <label class="pc-toggle pc-worldbook-toggle" :title="entry.enabled ? t`停用条目` : t`启用条目`" @click.stop>
              <input
                type="checkbox"
                :aria-label="entry.enabled ? t`停用条目` : t`启用条目`"
                :checked="entry.enabled"
                :disabled="entryBusyUids.has(entry.uid)"
                @change="$emit('toggle-entry', entry, $event)"
              />
              <span aria-hidden="true"></span>
            </label>
          </article>
        </div>
      </section>
      <EmptyState v-if="!visibleEntryCount" :title="query.trim() ? t`没有找到匹配的条目` : t`这本世界书没有条目`" />
    </template>
    <EmptyState v-else :title="t`正在读取世界书条目`" />
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import type { WorldbookLinkStatus } from '../store';

interface EntrySection {
  entries: WorldbookEntry[];
  id: string;
  label: string;
}

defineProps<{
  bookName: string;
  busy: boolean;
  categoryLabel: string;
  entryBusyUids: Set<number>;
  entryPositionSummary: (entry: WorldbookEntry) => string;
  linkStateLabel: string;
  sections: EntrySection[];
  status: WorldbookLinkStatus | null;
  visibleEntryCount: number;
}>();

const query = defineModel<string>('query', { required: true });

defineEmits<{
  'apply-profile': [];
  'capture-profile': [];
  'open-entry': [entry: WorldbookEntry];
  'rename-book': [];
  'toggle-entry': [entry: WorldbookEntry, event: Event];
  unlink: [];
}>();
</script>

<style scoped>
.pc-worldbook-detail-page,
.pc-worldbook-group {
  display: grid;
  min-height: 0;
  align-content: start;
  gap: 10px;
}

.pc-worldbook-detail-page {
  min-height: 100%;
  gap: 12px;
}

.pc-worldbook-entry-lamp {
  width: 10px;
  height: 10px;
  flex: 0 0 auto;
  border-radius: 999px;
  box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 16%, transparent);
}

/* 业务状态色：对应酒馆世界书的绿灯（常驻）与蓝灯（触发）。 */
.pc-worldbook-entry-lamp.green {
  color: #27ae60;
  background: #27ae60;
}

.pc-worldbook-entry-lamp.blue {
  color: #2d9cdb;
  background: #2d9cdb;
}
.pc-worldbook-detail-head {
  min-width: 0;
  padding-bottom: 10px;
}
.pc-worldbook-metrics {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0;
}
.pc-worldbook-metrics span {
  color: var(--pc-muted);
  font-size: 13px;
  white-space: nowrap;
}
.pc-worldbook-metrics span + span::before {
  margin: 0 7px;
  color: var(--pc-muted);
  content: '·';
}
.pc-worldbook-metrics .category {
  color: var(--pc-theme-accent);
  font-weight: 700;
}
.pc-worldbook-link-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px 10px;
  padding: 10px 0;
}
.pc-worldbook-link-main,
.pc-worldbook-link-actions,
.pc-worldbook-group-head {
  display: flex;
  align-items: center;
}
.pc-worldbook-link-main {
  min-width: 0;
  gap: 9px;
}
.pc-worldbook-link-main > span {
  color: var(--pc-muted);
  font-size: 13px;
}
.pc-worldbook-link-main > span.linked {
  color: var(--pc-theme-accent);
}
.pc-worldbook-link-actions {
  justify-content: flex-end;
  gap: 6px;
}
.pc-worldbook-link-actions .pc-icon-btn {
  width: 32px;
  min-width: 32px;
  height: 32px;
  min-height: 32px;
  padding: 0;
}
.pc-worldbook-link-create {
  min-height: 32px;
  padding: 6px 10px;
  font-size: 12px;
}
.pc-worldbook-link-bar > small {
  grid-column: 1 / -1;
  color: var(--pc-danger);
  font-size: 12px;
}
.pc-worldbook-group {
  gap: 8px;
}
.pc-worldbook-group + .pc-worldbook-group {
  margin-top: 4px;
}
.pc-worldbook-group-head {
  min-height: 28px;
  justify-content: space-between;
  padding: 0 4px;
}
.pc-worldbook-group-head strong {
  font-size: 15px;
}
.pc-worldbook-group-head span {
  color: var(--pc-muted);
  font-size: 12px;
}
.pc-worldbook-entry {
  grid-template-columns: minmax(0, 1fr) auto;
}
.pc-worldbook-entry-open {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1 1 auto;
  gap: 9px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  text-align: left;
  cursor: pointer;
}
.pc-worldbook-entry-open > i {
  flex: 0 0 auto;
  color: var(--pc-muted);
  font-size: 11px;
}
.pc-worldbook-entry-copy {
  display: grid;
  min-width: 0;
  gap: 3px;
}
.pc-worldbook-entry-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-worldbook-entry-copy small,
.pc-worldbook-chevron {
  color: var(--pc-muted);
  font-size: 11px;
}
.pc-worldbook-entry.disabled .pc-worldbook-entry-copy strong {
  color: var(--pc-muted);
}
</style>
