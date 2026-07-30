<template>
  <section class="pc-stats-app">
    <section class="pc-stats-page">
      <header class="pc-stats-hero">
        <div>
          <span>{{ t`统计范围` }}</span>
          <strong>{{ contentScopeTitle }}</strong>
        </div>
        <button class="pc-icon-btn pc-refresh-btn" type="button" :disabled="loading" :title="loading ? t`刷新中` : t`刷新`" @click="stats.refresh()">
          <i class="fa-solid fa-rotate-right"></i>
        </button>
      </header>

      <div v-if="contentWarnings.length" class="pc-warning-card">
        <strong>{{ t`部分内容读取失败` }}</strong>
        <p v-for="warning in contentWarnings.slice(0, 3)" :key="warning">{{ warning }}</p>
      </div>

      <div v-if="error" class="pc-error-card">
        <strong>{{ t`读取失败` }}</strong>
        <p>{{ error }}</p>
      </div>

      <article class="pc-panel">
        <div class="pc-panel-head">
          <div>
            <strong>{{ t`创作内容` }}</strong>
            <span>{{ contentOverview.scopeCount ? `${formatNumber(contentOverview.scopeCount)} 个聊天 · ${formatNumber(contentOverview.items)} 项内容` : t`还没有可统计内容` }}</span>
          </div>
          <button class="pc-icon-btn pc-collapse-btn" type="button" :aria-expanded="domainExpanded" :title="domainExpanded ? t`收起` : t`展开`" @click="domainExpanded = !domainExpanded">
            <i :class="domainExpanded ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
          </button>
        </div>

        <div class="pc-metric-grid">
          <article class="pc-metric-card">
            <span>{{ t`已存聊天` }}</span>
            <strong>{{ formatNumber(contentOverview.scopeCount) }}</strong>
          </article>
          <article class="pc-metric-card">
            <span>{{ t`内容项` }}</span>
            <strong>{{ formatNumber(contentOverview.items) }}</strong>
          </article>
          <article class="pc-metric-card">
            <span>{{ t`总字数` }}</span>
            <strong>{{ formatNumber(contentOverview.chars) }}</strong>
          </article>
          <article class="pc-metric-card">
            <span>{{ t`合集/板块` }}</span>
            <strong>{{ formatNumber(contentOverview.collections) }}</strong>
          </article>
        </div>

        <EmptyState v-if="domainExpanded && !contentOverview.items && !contentOverview.collections" :title="t`还没有可统计内容`" />
        <div v-else-if="domainExpanded" class="pc-domain-list">
          <article v-for="domain in contentDomainStats" :key="domain.id" class="pc-domain-row">
            <div>
              <strong>{{ domain.label }}</strong>
              <p v-if="hasDomainMeta(domain)">{{ formatDomainMeta(domain) }}</p>
            </div>
            <strong>{{ formatNumber(domain.chars) }}{{ t`字` }}</strong>
          </article>
        </div>
      </article>

      <article class="pc-panel">
        <div class="pc-panel-head">
          <div>
            <strong>{{ t`当前聊天内容` }}</strong>
            <span>{{ chatId || t`正在读取当前聊天` }}</span>
          </div>
        </div>
        <div class="pc-metric-grid">
          <article class="pc-metric-card">
            <span>{{ t`合集/板块` }}</span>
            <strong>{{ formatNumber(currentContentOverview.collections) }}</strong>
          </article>
          <article class="pc-metric-card">
            <span>{{ t`内容项` }}</span>
            <strong>{{ formatNumber(currentContentOverview.items) }}</strong>
          </article>
          <article class="pc-metric-card wide">
            <span>{{ t`内容字数` }}</span>
            <strong>{{ formatNumber(currentContentOverview.chars) }}</strong>
          </article>
        </div>
      </article>

      <article class="pc-panel">
        <div class="pc-panel-head">
          <div>
            <strong>{{ t`当前聊天楼层` }}</strong>
            <span>{{ chatId ? `当前聊天：${chatId}` : t`正在读取当前聊天` }}</span>
          </div>
        </div>
        <div class="pc-metric-grid">
          <article class="pc-metric-card">
            <span>{{ t`总楼层` }}</span>
            <strong>{{ totalMessages }}</strong>
          </article>
          <article class="pc-metric-card">
            <span>{{ t`用户楼层` }}</span>
            <strong>{{ userMessages }}</strong>
          </article>
          <article class="pc-metric-card">
            <span>{{ t`AI 楼层` }}</span>
            <strong>{{ assistantMessages }}</strong>
          </article>
          <article class="pc-metric-card">
            <span>{{ t`楼层字数` }}</span>
            <strong>{{ formatNumber(totalChars) }}</strong>
          </article>
        </div>
        <div class="pc-line-list">
          <p>
            <span>{{ t`平均每楼` }}</span>
            <strong>{{ formatNumber(averageChars) }}{{ t`字` }}</strong>
          </p>
          <p>
            <span>{{ t`最长单楼` }}</span>
            <strong>{{ formatNumber(longestMessageChars) }}{{ t`字` }}</strong>
          </p>
          <p>
            <span>{{ t`角色字数` }}</span>
            <strong>AI {{ formatNumber(roleCharTotals.assistant) }} / {{ t`用户` }} {{ formatNumber(roleCharTotals.user) }}</strong>
          </p>
        </div>
        <div class="pc-subhead">{{ t`每楼字数分布` }}</div>
        <EmptyState v-if="!lengthDistribution.length" :title="t`还没有可见楼层`" />
        <div v-else class="pc-bars">
          <article v-for="point in lengthDistribution" :key="point.messageId" class="pc-bar-row">
            <div class="pc-bar-track">
              <span class="pc-bar-fill" :data-role="point.role" :style="{ width: getBarWidth(point.chars) }"></span>
            </div>
          </article>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import { useStatsStore } from '@/store/stats';
import { storeToRefs } from 'pinia';

const stats = useStatsStore();
const {
  assistantMessages,
  averageChars,
  chatId,
  contentDomainStats,
  contentOverview,
  contentScopeTitle,
  contentWarnings,
  currentContentOverview,
  error,
  lengthDistribution,
  loading,
  longestMessageChars,
  roleStats,
  totalChars,
  totalMessages,
  userMessages,
} = storeToRefs(stats);

const domainExpanded = ref(true);
const maxBarChars = computed(() => Math.max(...lengthDistribution.value.map(point => point.chars), 1));
const roleCharTotals = computed(() => roleStats.value.reduce(
  (totals, role) => {
    totals[role.role] += role.chars;
    return totals;
  },
  { assistant: 0, user: 0 },
));

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function formatDomainMeta(domain: typeof contentDomainStats.value[number]) {
  return `${formatNumber(domain.scopeCount)} 个聊天 · ${formatNumber(domain.collections)} ${domain.collectionLabel} · ${formatNumber(domain.items)} ${domain.itemLabel}`;
}

function hasDomainMeta(domain: typeof contentDomainStats.value[number]) {
  return Boolean(domain.scopeCount || domain.collections || domain.items);
}

function getBarWidth(value: number) {
  return `${Math.max(18, Math.round((value / maxBarChars.value) * 100))}%`;
}
</script>

<style scoped>
.pc-stats-app,
.pc-stats-page {
  min-height: 100%;
}

.pc-stats-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pc-stats-hero,
.pc-error-card,
.pc-warning-card,
.pc-panel,
.pc-domain-row {
  border: 1px solid var(--pc-border);
  border-radius: 18px;
  background: color-mix(in srgb, var(--pc-surface) 72%, transparent 28%);
  backdrop-filter: blur(12px);
}

.pc-stats-hero,
.pc-panel {
  padding: 14px;
}

.pc-stats-hero,
.pc-panel-head,
.pc-domain-row,
.pc-metric-card,
.pc-line-list p {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pc-stats-hero {
  min-height: 78px;
}

.pc-stats-hero span,
.pc-panel-head span,
.pc-domain-row p,
.pc-line-list span {
  color: var(--pc-muted);
}

.pc-stats-hero span,
.pc-panel-head span {
  display: block;
  font-size: 12px;
  line-height: 1.35;
}

.pc-stats-hero strong,
.pc-panel-head strong {
  display: block;
  margin-top: 4px;
  font-size: 18px;
  line-height: 1.25;
}

.pc-refresh-btn {
  background: var(--pc-theme-accent);
  color: var(--pc-primary-text);
}

.pc-error-card strong,
.pc-warning-card strong {
  display: block;
  margin-bottom: 6px;
}

.pc-error-card,
.pc-warning-card {
  padding: 12px 14px;
}

.pc-error-card {
  border-color: color-mix(in srgb, var(--pc-danger) 45%, var(--pc-border) 55%);
}

.pc-warning-card {
  border-color: color-mix(in srgb, #f5a623 45%, var(--pc-border) 55%);
}

.pc-metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.pc-metric-card {
  min-width: 0;
  min-height: 48px;
  border-radius: 16px;
  padding: 9px 11px;
  background: var(--pc-surface-strong);
}

.pc-metric-card.wide {
  grid-column: 1 / -1;
}

.pc-metric-card span {
  min-width: 0;
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.2;
}

.pc-metric-card strong {
  font-size: 22px;
  line-height: 1;
  text-align: right;
  white-space: nowrap;
}

.pc-panel-head > div,
.pc-stats-hero > div,
.pc-domain-row > div {
  min-width: 0;
}

.pc-domain-list,
.pc-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.pc-domain-row {
  min-height: 60px;
  padding: 11px 12px;
}

.pc-domain-row strong:first-child {
  display: block;
  font-size: 16px;
}

.pc-domain-row p {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-domain-row > strong {
  flex: 0 0 auto;
  font-size: 19px;
  line-height: 1;
  text-align: right;
  white-space: nowrap;
}

.pc-bar-row {
  padding: 8px 10px;
}

.pc-bar-track {
  height: 12px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--pc-surface-strong);
}

.pc-bar-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--pc-theme-accent);
}

.pc-bar-fill[data-role='user'] {
  background: color-mix(in srgb, var(--pc-theme-accent) 72%, #34c759 28%);
}

.pc-line-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.pc-line-list p {
  margin: 0;
  min-height: 34px;
  border-radius: 14px;
  padding: 7px 10px;
  background: var(--pc-surface-strong);
  line-height: 1.45;
}

.pc-line-list strong {
  color: var(--pc-text);
  font-size: 15px;
  font-weight: 700;
  text-align: right;
  white-space: nowrap;
}

.pc-subhead {
  margin-top: 14px;
  color: var(--pc-muted);
  font-size: 13px;
  font-weight: 700;
}
</style>

