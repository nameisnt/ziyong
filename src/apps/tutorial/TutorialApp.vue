<template>
  <section ref="appRoot" class="pc-tutorial-app">
    <section v-if="route.page === 'root'" class="pc-tutorial-page pc-page-stack">
      <div class="pc-tutorial-filter-band">
        <label class="pc-search-field pc-tutorial-search">
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input v-model="searchQuery" type="search" aria-label="搜索教程" placeholder="搜索功能、操作或问题" />
        </label>

        <div class="pc-tutorial-categories" role="group" aria-label="教程分类">
          <button
            v-for="category in tutorialCategories"
            :key="category.id"
            class="pc-soft-btn compact pc-tutorial-category"
            :class="{ active: activeCategory === category.id }"
            :aria-pressed="activeCategory === category.id"
            type="button"
            @click="activeCategory = category.id"
          >
            {{ category.label }}
          </button>
        </div>
      </div>

      <div v-if="showGroupedArticles" class="pc-tutorial-groups">
        <section v-for="group in groupedArticleResults" :key="group.category.id" class="pc-tutorial-group">
          <button
            class="pc-tutorial-group-toggle"
            type="button"
            :aria-expanded="isArticleGroupOpen(group.category.id)"
            @click="toggleArticleGroup(group.category.id)"
          >
            <span>
              <i :class="articleIcon(group.category.id)" aria-hidden="true"></i>
              <strong>{{ group.category.label }}</strong>
            </span>
            <small>{{ group.results.length }}</small>
            <i
              class="fa-solid"
              :class="isArticleGroupOpen(group.category.id) ? 'fa-chevron-up' : 'fa-chevron-down'"
              aria-hidden="true"
            ></i>
          </button>
          <div v-if="isArticleGroupOpen(group.category.id)" class="pc-tutorial-list">
            <TutorialResultRow
              v-for="result in group.results"
              :key="result.article.id"
              :result="result"
              :keyword="normalizedSearchQuery"
              @open="openArticle(result)"
            />
          </div>
        </section>
      </div>

      <div v-else-if="visibleArticleResults.length" class="pc-tutorial-list">
        <TutorialResultRow
          v-for="result in visibleArticleResults"
          :key="result.article.id"
          :result="result"
          :keyword="normalizedSearchQuery"
          @open="openArticle(result)"
        />
      </div>
      <EmptyState v-else title="没有找到匹配的教程">
        <p v-if="searchQuery.trim()">没有包含“{{ searchQuery.trim() }}”的教程内容。</p>
        <button v-if="searchQuery.trim()" class="pc-soft-btn" type="button" @click="searchQuery = ''">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          <span>清除搜索</span>
        </button>
      </EmptyState>
    </section>

    <section
      v-else-if="route.page === 'article' && activeArticle"
      class="pc-tutorial-page pc-tutorial-article-page pc-page-stack"
    >
      <header class="pc-tutorial-article-head">
        <span class="pc-kicker">{{ categoryLabel(activeArticle.category) }}</span>
        <h2>{{ activeArticle.title }}</h2>
        <p>{{ activeArticle.summary }}</p>
        <div v-if="activeArticle.requirements?.length" class="pc-tutorial-requirements">
          <i class="fa-solid fa-puzzle-piece" aria-hidden="true"></i>
          <span>需要：{{ activeArticle.requirements.join('、') }}</span>
        </div>
        <div v-if="relatedApps.length" class="pc-tutorial-related-apps" aria-label="相关 App">
          <button
            v-for="app in relatedApps"
            :key="app.id"
            class="pc-soft-btn compact"
            type="button"
            @click="phone.openApp(app.id)"
          >
            <i class="fa-solid" :class="app.icon" aria-hidden="true"></i>
            <span>{{ app.name }}</span>
          </button>
        </div>
      </header>

      <section v-if="articleOutline.length >= 4" class="pc-tutorial-outline">
        <button
          class="pc-tutorial-outline-toggle"
          type="button"
          :aria-expanded="outlineOpen"
          @click="outlineOpen = !outlineOpen"
        >
          <span><i class="fa-solid fa-list" aria-hidden="true"></i><strong>本文目录</strong></span>
          <i class="fa-solid" :class="outlineOpen ? 'fa-chevron-up' : 'fa-chevron-down'" aria-hidden="true"></i>
        </button>
        <div v-if="outlineOpen" class="pc-tutorial-outline-list">
          <button
            v-for="item in articleOutline"
            :key="item.index"
            class="pc-soft-btn"
            type="button"
            @click="scrollToBlock(item.index)"
          >
            {{ item.title }}
          </button>
        </div>
      </section>

      <div class="pc-tutorial-blocks">
        <template v-for="(block, index) in activeArticle.blocks" :key="`${block.type}:${index}`">
          <section
            v-if="block.type === 'paragraph'"
            :id="blockId(index)"
            class="pc-tutorial-text-block"
            :class="{ 'pc-tutorial-block-highlight': highlightedBlockIndex === index }"
          >
            <h3 v-if="block.title">{{ block.title }}</h3>
            <p>{{ block.text }}</p>
          </section>

          <section
            v-else-if="block.type === 'note'"
            :id="blockId(index)"
            class="pc-tutorial-note"
            :class="{ 'pc-tutorial-block-highlight': highlightedBlockIndex === index }"
          >
            <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
            <div>
              <strong v-if="block.title">{{ block.title }}</strong>
              <p>{{ block.text }}</p>
            </div>
          </section>

          <section
            v-else-if="block.type === 'steps'"
            :id="blockId(index)"
            class="pc-tutorial-text-block"
            :class="{ 'pc-tutorial-block-highlight': highlightedBlockIndex === index }"
          >
            <h3 v-if="block.title">{{ block.title }}</h3>
            <ol>
              <li v-for="item in block.items" :key="item">{{ item }}</li>
            </ol>
          </section>

          <div
            v-else-if="block.type === 'app-directory'"
            :id="blockId(index)"
            :class="{ 'pc-tutorial-block-highlight': highlightedBlockIndex === index }"
          >
            <TutorialAppDirectory />
          </div>

          <section
            v-else-if="block.type === 'code'"
            :id="blockId(index)"
            class="pc-tutorial-code"
            :class="{ 'pc-tutorial-block-highlight': highlightedBlockIndex === index }"
          >
            <header>
              <span>{{ block.label || '示例' }}</span>
              <button class="pc-icon-btn" type="button" title="复制" aria-label="复制" @click="copyCode(block.code)">
                <i class="fa-regular fa-copy" aria-hidden="true"></i>
              </button>
            </header>
            <pre><code>{{ block.code }}</code></pre>
          </section>
        </template>
      </div>

      <DetailFooter
        show-navigation
        catalog-label="本文目录"
        next-label="下一篇"
        previous-label="上一篇"
        :next-disabled="!nextArticle"
        :previous-disabled="!previousArticle"
        @bottom="scrollArticle('bottom')"
        @catalog="toggleOutlineFromFooter"
        @next="openAdjacentArticle(nextArticle)"
        @previous="openAdjacentArticle(previousArticle)"
        @top="scrollArticle('top')"
      />
    </section>

    <section v-else class="pc-tutorial-page pc-tutorial-missing-page pc-page-stack">
      <EmptyState :title="route.page === 'article' ? '这篇教程不存在' : '教程页面不存在'">
        <p>教程内容可能已经更新，请返回教程首页重新选择。</p>
        <button class="pc-primary-btn" type="button" @click="phone.openApp('tutorial')">
          <i class="fa-solid fa-book-open" aria-hidden="true"></i>
          <span>返回教程首页</span>
        </button>
      </EmptyState>
    </section>
  </section>
</template>

<script setup lang="ts">
import DetailFooter from '@/components/DetailFooter.vue';
import EmptyState from '@/components/EmptyState.vue';
import { getPhoneAppDefinitions } from '@/core/appLayout';
import type { PhoneAppDefinition } from '@/core/appRegistry';
import { usePhoneStore } from '@/store/phone';
import TutorialAppDirectory from './TutorialAppDirectory.vue';
import TutorialResultRow from './TutorialResultRow.vue';
import { getTutorialAppDirectorySearchText } from './appCatalog';
import {
  tutorialArticles,
  tutorialCategories,
  type TutorialArticle,
  type TutorialCategoryId,
  type TutorialSearchResult,
} from './data';
import { assertTutorialRegistry } from './validation';

const phone = usePhoneStore();
const route = computed(() => phone.currentRoute);
const appRoot = ref<HTMLElement | null>(null);
const activeCategory = ref<'all' | TutorialCategoryId>('all');
const searchQuery = ref('');
const openCategoryIds = ref<TutorialCategoryId[]>(['start']);
const outlineOpen = ref(false);
const highlightedBlockIndex = ref<number | null>(null);
const appDefinitions = getPhoneAppDefinitions();
const appById = new Map(appDefinitions.map(app => [app.id, app]));
assertTutorialRegistry(appDefinitions, tutorialArticles, tutorialCategories);
const appDirectorySearchText = getTutorialAppDirectorySearchText(appDefinitions);
const normalizedSearchQuery = computed(() => searchQuery.value.trim().toLocaleLowerCase());
const categoryDefinitions = tutorialCategories.filter(
  (category): category is { id: TutorialCategoryId; label: string } => category.id !== 'all',
);

const searchIndex = tutorialArticles.map(article => ({ article, segments: articleTextSegments(article) }));

const activeArticle = computed(() => {
  const articleId = route.value.params?.articleId || '';
  return tutorialArticles.find(article => article.id === articleId) ?? null;
});

const relatedApps = computed<PhoneAppDefinition[]>(() =>
  (activeArticle.value?.relatedAppIds || []).flatMap(appId => {
    const app = appById.get(appId);
    return app ? [app] : [];
  }),
);

const visibleArticleResults = computed(() => {
  const keyword = normalizedSearchQuery.value;
  return searchIndex.flatMap(({ article, segments }) => {
    if (activeCategory.value !== 'all' && article.category !== activeCategory.value) return [];
    if (!keyword) return [{ article, snippet: article.summary }];
    const match = segments.find(segment => segment.text.toLocaleLowerCase().includes(keyword));
    if (!match) return [];
    return [{ article, blockIndex: match.blockIndex, snippet: createSnippet(article, match.text, keyword) }];
  });
});

const showGroupedArticles = computed(() => activeCategory.value === 'all' && !normalizedSearchQuery.value);
const groupedArticleResults = computed(() =>
  categoryDefinitions.map(category => ({
    category,
    results: visibleArticleResults.value.filter(result => result.article.category === category.id),
  })),
);
const categoryArticles = computed(() =>
  activeArticle.value ? tutorialArticles.filter(article => article.category === activeArticle.value?.category) : [],
);
const activeArticleIndex = computed(() =>
  activeArticle.value ? categoryArticles.value.findIndex(article => article.id === activeArticle.value?.id) : -1,
);
const previousArticle = computed(() => categoryArticles.value[activeArticleIndex.value - 1] ?? null);
const nextArticle = computed(() => categoryArticles.value[activeArticleIndex.value + 1] ?? null);
const articleOutline = computed(() =>
  (activeArticle.value?.blocks || []).flatMap((block, index) =>
    'title' in block && block.title ? [{ index, title: block.title }] : [],
  ),
);

watch(normalizedSearchQuery, keyword => {
  if (keyword) activeCategory.value = 'all';
});

watch(
  () => [route.value.page, route.value.params?.articleId, route.value.params?.blockIndex] as const,
  async ([page, , blockIndex]) => {
    outlineOpen.value = false;
    highlightedBlockIndex.value = null;
    if (page !== 'article' || blockIndex === undefined) return;
    const parsedIndex = Number(blockIndex);
    if (!Number.isInteger(parsedIndex)) return;
    await nextTick();
    window.setTimeout(() => {
      scrollToBlock(parsedIndex);
      highlightedBlockIndex.value = parsedIndex;
      window.setTimeout(() => {
        if (highlightedBlockIndex.value === parsedIndex) highlightedBlockIndex.value = null;
      }, 1800);
    }, 260);
  },
  { immediate: true },
);

function articleTextSegments(article: TutorialArticle) {
  const blockText = article.blocks.flatMap((block, blockIndex) => {
    if (block.type === 'app-directory') return [{ blockIndex, text: appDirectorySearchText }];
    if (block.type === 'steps') return [block.title || '', ...block.items].map(text => ({ blockIndex, text }));
    if (block.type === 'code') return [block.label || '', block.code].map(text => ({ blockIndex, text }));
    return [block.title || '', block.text].map(text => ({ blockIndex, text }));
  });
  return [
    { text: article.title },
    { text: article.summary },
    ...article.keywords.map(text => ({ text })),
    ...(article.requirements || []).map(text => ({ text })),
    ...blockText,
  ];
}

function createSnippet(article: TutorialArticle, matched: string, keyword: string) {
  if (!matched || matched === article.title || article.keywords.includes(matched)) return article.summary;
  const matchedIndex = matched.toLocaleLowerCase().indexOf(keyword);
  const start = Math.max(0, matchedIndex - 24);
  const end = Math.min(matched.length, matchedIndex + keyword.length + 54);
  return `${start > 0 ? '…' : ''}${matched.slice(start, end)}${end < matched.length ? '…' : ''}`;
}

function categoryLabel(categoryId: TutorialCategoryId) {
  return tutorialCategories.find(category => category.id === categoryId)?.label || '教程';
}

function articleIcon(categoryId: TutorialCategoryId) {
  return {
    apps: 'fa-solid fa-table-cells-large',
    data: 'fa-solid fa-database',
    dependency: 'fa-solid fa-puzzle-piece',
    generation: 'fa-solid fa-wand-magic-sparkles',
    macro: 'fa-solid fa-code',
    start: 'fa-solid fa-compass',
    troubleshooting: 'fa-solid fa-screwdriver-wrench',
  }[categoryId];
}

function isArticleGroupOpen(categoryId: TutorialCategoryId) {
  return openCategoryIds.value.includes(categoryId);
}

function toggleArticleGroup(categoryId: TutorialCategoryId) {
  openCategoryIds.value = isArticleGroupOpen(categoryId)
    ? openCategoryIds.value.filter(id => id !== categoryId)
    : [...openCategoryIds.value, categoryId];
}

function openArticle(result: TutorialSearchResult) {
  phone.pushRoute('tutorial', 'article', result.article.title, {
    articleId: result.article.id,
    ...(result.blockIndex === undefined ? {} : { blockIndex: String(result.blockIndex) }),
  });
}

function openAdjacentArticle(article: TutorialArticle | null) {
  if (!article) return;
  phone.replacePage('article', article.title, { articleId: article.id });
}

function blockId(index: number) {
  return `tutorial-block-${activeArticle.value?.id || 'unknown'}-${index}`;
}

function scrollToBlock(index: number) {
  document.getElementById(blockId(index))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function screenElement() {
  return appRoot.value?.closest<HTMLElement>('.pc-screen') || null;
}

function scrollArticle(edge: 'bottom' | 'top') {
  const screen = screenElement();
  screen?.scrollTo({ behavior: 'smooth', top: edge === 'top' ? 0 : screen.scrollHeight });
}

function toggleOutlineFromFooter() {
  if (articleOutline.value.length < 4) {
    scrollArticle('top');
    return;
  }
  outlineOpen.value = !outlineOpen.value;
  if (outlineOpen.value)
    nextTick(() => document.querySelector('.pc-tutorial-outline')?.scrollIntoView({ behavior: 'smooth' }));
}

async function copyCode(code: string) {
  try {
    await navigator.clipboard.writeText(code);
    toastr.success('已复制');
  } catch {
    toastr.warning('复制失败，请手动选择文本');
  }
}
</script>

<style scoped>
.pc-tutorial-app {
  min-height: 100%;
}

.pc-tutorial-missing-page {
  justify-content: center;
}

.pc-tutorial-filter-band {
  position: sticky;
  z-index: 3;
  top: 0;
  display: grid;
  gap: 10px;
  padding-bottom: 10px;
  background: var(--pc-bg);
}

.pc-tutorial-categories {
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.pc-tutorial-category {
  width: 100%;
}

.pc-tutorial-groups,
.pc-tutorial-group,
.pc-tutorial-list {
  display: grid;
  min-width: 0;
}

.pc-tutorial-groups {
  gap: 8px;
}

.pc-tutorial-group {
  border-bottom: 1px solid var(--pc-border);
}

.pc-tutorial-group-toggle,
.pc-tutorial-outline-toggle {
  display: grid;
  width: 100%;
  min-height: 44px;
  align-items: center;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.pc-tutorial-group-toggle {
  grid-template-columns: minmax(0, 1fr) auto 18px;
  gap: 8px;
  padding: 8px 2px;
}

.pc-tutorial-group-toggle > span,
.pc-tutorial-outline-toggle > span {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
}

.pc-tutorial-group-toggle > span > i {
  width: 18px;
  color: var(--pc-theme-accent);
  text-align: center;
}

.pc-tutorial-group-toggle small,
.pc-tutorial-group-toggle > i,
.pc-tutorial-outline-toggle > i {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-tutorial-list {
  gap: 10px;
  padding-bottom: 10px;
}

.pc-tutorial-article-page {
  gap: 18px;
}

.pc-tutorial-article-head {
  display: grid;
  gap: 8px;
  padding: 4px 2px 16px;
  border-bottom: 1px solid var(--pc-border);
}

.pc-tutorial-article-head h2,
.pc-tutorial-article-head p {
  margin: 0;
}

.pc-tutorial-article-head h2 {
  color: var(--pc-text);
  font-size: 22px;
  line-height: 1.35;
}

.pc-tutorial-article-head p {
  color: var(--pc-muted);
  font-size: 14px;
  line-height: 1.65;
}

.pc-tutorial-requirements,
.pc-tutorial-related-apps {
  display: flex;
  width: fit-content;
  max-width: 100%;
  align-items: center;
  gap: 7px;
}

.pc-tutorial-requirements {
  padding: 7px 10px;
  border-radius: var(--pc-control-radius);
  background: color-mix(in srgb, var(--pc-theme-accent) 12%, var(--pc-surface-strong) 88%);
  color: var(--pc-theme-accent);
  font-size: 12px;
  font-weight: 800;
}

.pc-tutorial-related-apps {
  flex-wrap: wrap;
}

.pc-tutorial-outline {
  border-bottom: 1px solid var(--pc-border);
}

.pc-tutorial-outline-toggle {
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  padding: 6px 2px;
}

.pc-tutorial-outline-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  padding: 4px 0 12px;
}

.pc-tutorial-outline-list .pc-soft-btn {
  min-width: 0;
  justify-content: flex-start;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-tutorial-blocks {
  display: grid;
  gap: 20px;
}

.pc-tutorial-text-block {
  display: grid;
  gap: 8px;
}

.pc-tutorial-text-block h3,
.pc-tutorial-text-block p,
.pc-tutorial-text-block ol {
  margin: 0;
}

.pc-tutorial-text-block h3 {
  color: var(--pc-text);
  font-size: 16px;
}

.pc-tutorial-text-block p,
.pc-tutorial-text-block li {
  color: var(--pc-text);
  font-size: 14px;
  line-height: 1.75;
}

.pc-tutorial-text-block ol {
  display: grid;
  gap: 8px;
  padding-left: 22px;
}

.pc-tutorial-note {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 10px;
  padding: 12px;
  border-left: 3px solid var(--pc-theme-accent);
  background: color-mix(in srgb, var(--pc-theme-accent) 8%, var(--pc-surface) 92%);
}

.pc-tutorial-note > i {
  margin-top: 2px;
  color: var(--pc-theme-accent);
}

.pc-tutorial-note > div {
  display: grid;
  gap: 5px;
}

.pc-tutorial-note strong,
.pc-tutorial-note p {
  margin: 0;
}

.pc-tutorial-note p {
  color: var(--pc-text);
  font-size: 13px;
  line-height: 1.7;
}

.pc-tutorial-code {
  overflow: hidden;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  background: var(--pc-surface-strong);
}

.pc-tutorial-code > header {
  display: flex;
  min-height: 40px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 4px 6px 4px 12px;
  border-bottom: 1px solid var(--pc-border);
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 800;
}

/* ui-reuse-allow: UI-TUTORIAL-CODE-001 copy action is embedded in a compact code header. */
.pc-tutorial-code .pc-icon-btn {
  width: 32px;
  height: 32px;
}

.pc-tutorial-code pre {
  overflow-x: auto;
  margin: 0;
  padding: 14px;
  color: var(--pc-text);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.pc-tutorial-block-highlight {
  outline: 2px solid color-mix(in srgb, var(--pc-theme-accent) 50%, transparent 50%);
  outline-offset: 5px;
  transition: outline-color 180ms ease;
}
</style>
