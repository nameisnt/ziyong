<template>
  <section class="pc-summary-import-page">
    <article class="pc-page-section">
      <EmptyState v-if="!books.length" title="还没有总结集">
        <p>先新建一个总结集，再把当前聊天里的 AI 楼层提取成总结条目。</p>
        <button class="pc-primary-btn compact" type="button" @click="$emit('create-book')">新建总结集</button>
      </EmptyState>
      <template v-else>
        <div class="pc-field-group">
          <label class="pc-field-label">保存到总结集</label>
          <SearchableCombobox
            :disabled="loading"
            input-label="搜索总结集"
            :model-value="targetBookId"
            :options="bookOptions"
            placeholder="选择总结集"
            toggle-title="展开总结集"
            @update:model-value="targetBookId = $event"
          />
        </div>
        <div class="pc-field-group">
          <label class="pc-field-label">楼层正文提取</label>
          <SearchableCombobox
            :disabled="loading"
            input-label="搜索正文规则"
            :model-value="ruleId"
            :options="ruleOptions"
            placeholder="选择正文规则"
            toggle-title="展开正文规则"
            @update:model-value="updateRule"
          />
        </div>
        <div class="pc-summary-import-head">
          <span>AI 楼层 · {{ items.length }}</span>
          <div>
            <button class="pc-icon-btn" type="button" :disabled="loading" title="刷新楼层" @click="$emit('refresh')">
              <i :class="['fa-solid fa-rotate-right', { spinning: loading }]"></i>
            </button>
            <button class="pc-soft-btn compact" type="button" :disabled="!items.length" @click="$emit('toggle-all')">
              {{ allSelected ? '取消全选' : '全选' }}
            </button>
          </div>
        </div>
        <div v-if="error" class="pc-status-card warning">
          <strong>无法读取楼层</strong>
          <p>{{ error }}</p>
        </div>
        <div v-else-if="items.length" class="pc-summary-import-list">
          <label v-for="item in items" :key="item.id" class="pc-summary-import-item">
            <input
              :checked="selectedIds.includes(item.id)"
              type="checkbox"
              @change="$emit('toggle-item', item.id, ($event.target as HTMLInputElement).checked)"
            />
            <span>
              <strong>第 {{ item.messageIndex }} 楼总结</strong>
              <small>{{ item.content }}</small>
            </span>
          </label>
        </div>
        <EmptyState v-else-if="!loading" title="没有可导入的 AI 楼层" />
        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" @click="$emit('cancel')">取消</button>
          <button
            class="pc-primary-btn"
            type="button"
            :disabled="!targetBookExists || !selectedIds.length"
            @click="$emit('import')"
          >
            提取 {{ selectedIds.length }} 条
          </button>
        </div>
      </template>
    </article>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import type { ChatReaderRegexRule } from '@/store/reader';
import type { SummaryBook } from '@/type/summary';

interface SummaryImportItem {
  content: string;
  id: string;
  messageIndex: number;
}

const props = defineProps<{
  allSelected: boolean;
  books: SummaryBook[];
  error: string;
  items: SummaryImportItem[];
  loading: boolean;
  rules: ChatReaderRegexRule[];
  selectedIds: string[];
  targetBookExists: boolean;
}>();

const emit = defineEmits<{
  cancel: [];
  'create-book': [];
  import: [];
  refresh: [];
  'rule-change': [ruleId: string];
  'toggle-all': [];
  'toggle-item': [itemId: string, checked: boolean];
}>();

const ruleId = defineModel<string>('ruleId', { required: true });
const targetBookId = defineModel<string>('targetBookId', { required: true });

const bookOptions = computed(() => props.books.map(book => ({ label: book.title, value: book.id })));
const ruleOptions = computed(() => [
  { label: '默认楼层正文提取', value: '__default_body__' },
  ...props.rules.map(rule => ({ label: rule.name || '未命名规则', value: rule.id })),
]);

function updateRule(value: string) {
  ruleId.value = value;
  emit('rule-change', value);
}
</script>

<style scoped>
.pc-summary-import-page {
  min-height: 100%;
}

.pc-summary-import-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 14px;
}

.pc-summary-import-head > span {
  color: var(--pc-muted);
  font-size: 13px;
  font-weight: 800;
}

.pc-summary-import-head > div {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

.pc-summary-import-list {
  display: grid;
  max-height: min(46vh, 420px);
  gap: 8px;
  margin-top: 12px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 2px;
}

.pc-summary-import-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: 10px;
  padding: 11px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
  cursor: pointer;
}

.pc-summary-import-item input {
  width: 18px;
  height: 18px;
  margin: 1px 0 0;
  accent-color: var(--pc-theme-accent);
}

.pc-summary-import-item span {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.pc-summary-import-item strong {
  color: var(--pc-text);
  font-size: 14px;
}

.pc-summary-import-item small {
  display: -webkit-box;
  overflow: hidden;
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
</style>
