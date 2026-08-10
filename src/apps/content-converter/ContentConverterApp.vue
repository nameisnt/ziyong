<template>
  <section class="pc-content-converter">
    <template v-if="step === 'source'">
      <article class="pc-editor-card pc-converter-source-panel">
        <header class="pc-converter-heading">
          <div>
            <span class="pc-kicker">{{ t`内容来源` }}</span>
            <h2>{{ t`选择要转换的内容` }}</h2>
          </div>
          <strong>{{ `${selectedIds.length} 条` }}</strong>
        </header>

        <div class="pc-field-group">
          <label class="pc-field-label">{{ t`来源 App` }}</label>
          <SearchableCombobox v-model="sourceAppId" :options="sourceAppOptions" :placeholder="t`选择或搜索来源 App`" />
        </div>

        <template v-if="activeRegistration">
          <label class="pc-converter-search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="query" class="pc-field" type="search" :placeholder="t`搜索标题、来源或内容`" />
          </label>

          <div class="pc-converter-selection-bar">
            <span>{{ `已选 ${selectedIds.length} / ${activeRegistration.sources.length}` }}</span>
            <div>
              <button class="pc-soft-btn compact" type="button" @click="selectVisible">{{ t`选可见` }}</button>
              <button class="pc-soft-btn compact" type="button" @click="invertVisible">{{ t`反选可见` }}</button>
              <button class="pc-soft-btn compact" type="button" @click="clearSelection">{{ t`清空` }}</button>
            </div>
          </div>

          <div v-if="filteredSources.length" class="pc-converter-source-list">
            <label
              v-for="source in filteredSources"
              :key="source.entryId"
              :class="[
                'pc-section-card',
                'pc-converter-source-row',
                { selected: selectedIds.includes(source.entryId) },
              ]"
            >
              <input
                type="checkbox"
                :checked="selectedIds.includes(source.entryId)"
                @change="toggleSource(source.entryId)"
              />
              <span class="pc-converter-source-copy">
                <strong>{{ source.title || t`未命名内容` }}</strong>
                <small v-if="source.sourceLabel">{{ source.sourceLabel }}</small>
                <p>{{ source.content.slice(0, 120) || t`暂无正文` }}</p>
              </span>
            </label>
          </div>
          <EmptyState v-else :title="query ? t`没有匹配内容` : t`这个 App 还没有可转换内容`" />

          <div class="pc-form-actions">
            <button class="pc-primary-btn" type="button" :disabled="!selectedIds.length" @click="openTargetStep">
              <span>{{ t`下一步` }}</span>
              <i class="fa-solid fa-arrow-right"></i>
            </button>
          </div>

          <details v-if="history.records.length" class="pc-section-card pc-converter-history">
            <summary>
              <span>{{ t`最近转换` }}</span>
              <small>{{ `${history.records.length} 条` }}</small>
            </summary>
            <div class="pc-converter-history-list">
              <div v-for="record in history.records.slice(0, 10)" :key="record.id">
                <strong>{{ `${record.sourceAppName} → ${record.targetAppName}` }}</strong>
                <small>
                  {{
                    `${record.batchMode === 'merge' ? '合并' : '逐条'} ${record.count} 条 · ${new Date(record.createdAt).toLocaleString()}`
                  }}
                </small>
              </div>
            </div>
          </details>
        </template>

        <EmptyState v-else :title="t`没有可用的内容来源`" />
      </article>
    </template>

    <ContentConversionPanel
      v-else-if="activeRegistration && selectedSources.length"
      :source-app-id="activeRegistration.app.id"
      :source-app-name="activeRegistration.app.name"
      :sources="selectedSources"
      @cancel="step = 'source'"
      @success="recordConversion"
    />

    <EmptyState v-else :title="t`待转换内容不存在`" />
  </section>
</template>

<script setup lang="ts">
import ContentConversionPanel from '@/components/ContentConversionPanel.vue';
import EmptyState from '@/components/EmptyState.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { getRegisteredPhoneContentSources } from '@/core/appRegistry';
import type { PhoneContentConversionBatchMode, PhoneContentConversionResult } from '@/core/appRegistry';
import { usePhoneStore } from '@/store/phone';
import { useContentConversionHistoryStore } from './store';

const phone = usePhoneStore();
const history = useContentConversionHistoryStore();
const route = computed(() => phone.currentRoute);
const step = ref<'source' | 'target'>('source');
const sourceAppId = ref('');
const selectedIds = ref<string[]>([]);
const query = ref('');
let applyingRouteSelection = false;

const sourceRegistrations = computed(() =>
  getRegisteredPhoneContentSources().filter(registration => registration.sources.some(source => source.content.trim())),
);
const sourceAppOptions = computed(() =>
  sourceRegistrations.value.map(registration => ({
    group: registration.app.contentReceiver?.scope === 'global' ? '全局内容' : '当前聊天内容',
    label: `${registration.app.name}（${registration.sources.length}）`,
    value: registration.app.id,
  })),
);
const activeRegistration = computed(() =>
  sourceRegistrations.value.find(registration => registration.app.id === sourceAppId.value),
);
const filteredSources = computed(() => {
  const normalized = query.value.trim().toLowerCase();
  const sources = activeRegistration.value?.sources ?? [];
  if (!normalized) return sources;
  return sources.filter(source =>
    `${source.title} ${source.sourceLabel} ${source.content} ${source.tags.join(' ')}`
      .toLowerCase()
      .includes(normalized),
  );
});
const selectedSources = computed(() => {
  const selected = new Set(selectedIds.value);
  return (activeRegistration.value?.sources ?? []).filter(source => selected.has(source.entryId));
});

watch(
  route,
  current => {
    if (current.appId !== 'content-converter') return;
    applyingRouteSelection = true;
    const requestedAppId = current.params?.sourceAppId || '';
    sourceAppId.value = sourceRegistrations.value.some(item => item.app.id === requestedAppId)
      ? requestedAppId
      : sourceRegistrations.value[0]?.app.id || '';
    const availableIds = new Set(activeRegistration.value?.sources.map(source => source.entryId) ?? []);
    selectedIds.value = (current.params?.sourceIds || '').split(',').filter(id => availableIds.has(id));
    query.value = '';
    step.value = selectedIds.value.length ? 'target' : 'source';
    void nextTick(() => {
      applyingRouteSelection = false;
    });
  },
  { immediate: true },
);

watch(sourceAppId, () => {
  if (applyingRouteSelection) return;
  selectedIds.value = [];
  query.value = '';
});

function toggleSource(entryId: string) {
  selectedIds.value = selectedIds.value.includes(entryId)
    ? selectedIds.value.filter(id => id !== entryId)
    : [...selectedIds.value, entryId];
}

function selectVisible() {
  selectedIds.value = [...new Set([...selectedIds.value, ...filteredSources.value.map(source => source.entryId)])];
}

function invertVisible() {
  const visible = new Set(filteredSources.value.map(source => source.entryId));
  const retained = selectedIds.value.filter(id => !visible.has(id));
  const selected = new Set(selectedIds.value);
  selectedIds.value = [
    ...retained,
    ...filteredSources.value.filter(source => !selected.has(source.entryId)).map(source => source.entryId),
  ];
}

function clearSelection() {
  selectedIds.value = [];
}

function openTargetStep() {
  if (!selectedSources.value.length) return;
  step.value = 'target';
}

function recordConversion(payload: {
  batchMode: PhoneContentConversionBatchMode;
  result: PhoneContentConversionResult;
  sourceEntryIds: string[];
  targetAppId: string;
  targetAppName: string;
}) {
  const source = activeRegistration.value;
  if (!source) return;
  history.addRecord({
    batchMode: payload.batchMode,
    count: payload.result.count,
    sourceAppId: source.app.id,
    sourceAppName: source.app.name,
    sourceTitles: selectedSources.value.map(item => item.title),
    targetAppId: payload.targetAppId,
    targetAppName: payload.targetAppName,
    targetItemIds: payload.result.itemIds,
  });
}
</script>

<style scoped>
.pc-content-converter,
.pc-converter-source-panel {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 14px;
}

.pc-converter-heading,
.pc-converter-selection-bar,
.pc-converter-selection-bar > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-converter-heading h2 {
  margin: 2px 0 0;
  font-size: 20px;
}

.pc-converter-heading > strong,
.pc-converter-selection-bar,
.pc-converter-source-copy small,
.pc-converter-source-copy p {
  color: var(--pc-muted);
}

.pc-converter-search {
  position: relative;
  display: block;
}

.pc-converter-search i {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: 14px;
  color: var(--pc-muted);
  transform: translateY(-50%);
}

.pc-converter-search .pc-field {
  padding-left: 40px;
}

.pc-converter-selection-bar {
  flex-wrap: wrap;
  font-size: 13px;
}

.pc-converter-source-list {
  display: grid;
  gap: 10px;
}

.pc-converter-source-row {
  display: grid;
  min-width: 0;
  grid-template-columns: 22px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 12px;
  cursor: pointer;
}

.pc-converter-source-row.selected {
  border-color: var(--pc-theme-accent);
  background: color-mix(in srgb, var(--pc-theme-accent) 8%, var(--pc-surface));
}

.pc-converter-source-row input {
  width: 18px;
  height: 18px;
  accent-color: var(--pc-theme-accent);
}

.pc-converter-source-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.pc-converter-source-copy strong,
.pc-converter-source-copy small,
.pc-converter-source-copy p {
  overflow: hidden;
  margin: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-converter-source-copy p {
  font-size: 13px;
}

.pc-converter-history {
  padding: 0 12px;
}

.pc-converter-history summary,
.pc-converter-history-list > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-converter-history summary {
  min-height: 44px;
  cursor: pointer;
}

.pc-converter-history summary small,
.pc-converter-history-list small {
  color: var(--pc-muted);
}

.pc-converter-history-list {
  display: grid;
  padding-bottom: 10px;
}

.pc-converter-history-list > div {
  align-items: flex-start;
  padding: 9px 0;
  border-top: 1px solid var(--pc-border);
}

.pc-converter-history-list > div strong {
  min-width: 0;
}

.pc-converter-history-list > div small {
  flex: 0 0 auto;
  font-size: 12px;
  text-align: right;
}
</style>
