<template>
  <section class="pc-tutorial-app">
    <section v-if="route.page === 'root'" class="pc-tutorial-page">
      <label class="pc-search-field pc-tutorial-search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="searchQuery" type="search" placeholder="搜索功能、操作或问题" />
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

      <div v-if="visibleArticleResults.length" class="pc-tutorial-list">
        <button
          v-for="result in visibleArticleResults"
          :key="result.article.id"
          class="pc-section-card pc-tutorial-row"
          type="button"
          @click="openArticle(result.article)"
        >
          <span class="pc-tutorial-row-icon">
            <i :class="articleIcon(result.article.category)"></i>
          </span>
          <span class="pc-tutorial-row-copy">
            <strong>{{ result.article.title }}</strong>
            <small :class="{ 'pc-tutorial-match': normalizedSearchQuery }">{{ result.snippet }}</small>
            <span v-if="result.article.requirements?.length" class="pc-tutorial-requirement">
              {{ result.article.requirements.join(' · ') }}
            </span>
          </span>
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
      <EmptyState v-else title="没有找到匹配的教程" />
    </section>

    <section v-else-if="route.page === 'article' && activeArticle" class="pc-tutorial-page pc-tutorial-article-page">
      <header class="pc-tutorial-article-head">
        <span class="pc-kicker">{{ categoryLabel(activeArticle.category) }}</span>
        <h2>{{ activeArticle.title }}</h2>
        <p>{{ activeArticle.summary }}</p>
        <div v-if="activeArticle.requirements?.length" class="pc-tutorial-requirements">
          <i class="fa-solid fa-puzzle-piece"></i>
          <span>需要：{{ activeArticle.requirements.join('、') }}</span>
        </div>
      </header>

      <div class="pc-tutorial-blocks">
        <template v-for="(block, index) in activeArticle.blocks" :key="`${block.type}:${index}`">
          <section v-if="block.type === 'paragraph'" class="pc-tutorial-text-block">
            <h3 v-if="block.title">{{ block.title }}</h3>
            <p>{{ block.text }}</p>
          </section>

          <section v-else-if="block.type === 'note'" class="pc-tutorial-note">
            <i class="fa-solid fa-circle-info"></i>
            <div>
              <strong v-if="block.title">{{ block.title }}</strong>
              <p>{{ block.text }}</p>
            </div>
          </section>

          <section v-else-if="block.type === 'steps'" class="pc-tutorial-text-block">
            <h3 v-if="block.title">{{ block.title }}</h3>
            <ol>
              <li v-for="item in block.items" :key="item">{{ item }}</li>
            </ol>
          </section>

          <TutorialAppDirectory v-else-if="block.type === 'app-directory'" />

          <section v-else-if="block.type === 'code'" class="pc-tutorial-code">
            <header>
              <span>{{ block.label || '示例' }}</span>
              <button class="pc-icon-btn" type="button" title="复制" aria-label="复制" @click="copyCode(block.code)">
                <i class="fa-regular fa-copy"></i>
              </button>
            </header>
            <pre><code>{{ block.code }}</code></pre>
          </section>
        </template>
      </div>
    </section>

    <section v-else class="pc-tutorial-page pc-tutorial-missing-page">
      <EmptyState :title="route.page === 'article' ? '这篇教程不存在' : '教程页面不存在'">
        <p>教程内容可能已经更新，请返回教程首页重新选择。</p>
        <button class="pc-primary-btn" type="button" @click="phone.openApp('tutorial')">
          <i class="fa-solid fa-book-open"></i>
          <span>返回教程首页</span>
        </button>
      </EmptyState>
    </section>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import { getPhoneAppDefinitions } from '@/core/appLayout';
import { usePhoneStore } from '@/store/phone';
import TutorialAppDirectory from './TutorialAppDirectory.vue';
import { getTutorialAppDirectorySearchText } from './appCatalog';
import { tutorialArticles, tutorialCategories, type TutorialArticle, type TutorialCategoryId } from './data';

const phone = usePhoneStore();
const route = computed(() => phone.currentRoute);
const activeCategory = ref<'all' | TutorialCategoryId>('all');
const searchQuery = ref('');
const appDefinitions = getPhoneAppDefinitions();
const appDirectorySearchText = getTutorialAppDirectorySearchText(appDefinitions);
const normalizedSearchQuery = computed(() => searchQuery.value.trim().toLocaleLowerCase());

const activeArticle = computed(() => {
  const articleId = route.value.params?.articleId || '';
  return tutorialArticles.find(article => article.id === articleId) ?? null;
});

const visibleArticleResults = computed(() => {
  const keyword = normalizedSearchQuery.value;
  return tutorialArticles.flatMap(article => {
    if (activeCategory.value !== 'all' && article.category !== activeCategory.value) return [];
    if (!keyword) return [{ article, snippet: article.summary }];
    if (!articleSearchText(article).includes(keyword)) return [];
    return [{ article, snippet: findArticleSnippet(article, keyword) }];
  });
});

function articleTextSegments(article: TutorialArticle) {
  const blockText = article.blocks.flatMap(block => {
    if (block.type === 'app-directory') return [appDirectorySearchText];
    if (block.type === 'steps') return [block.title || '', ...block.items];
    if (block.type === 'code') return [block.label || '', block.code];
    return [block.title || '', block.text];
  });
  return [article.title, article.summary, ...article.keywords, ...(article.requirements || []), ...blockText];
}

function articleSearchText(article: TutorialArticle) {
  return articleTextSegments(article).join('\n').toLocaleLowerCase();
}

function findArticleSnippet(article: TutorialArticle, keyword: string) {
  const segments = articleTextSegments(article);
  const matched = segments.find(segment => segment.toLocaleLowerCase().includes(keyword));
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

function openArticle(article: TutorialArticle) {
  phone.pushRoute('tutorial', 'article', article.title, { articleId: article.id });
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

.pc-tutorial-page {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
}

.pc-tutorial-missing-page {
  justify-content: center;
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

.pc-tutorial-list {
  display: grid;
  gap: 10px;
}

.pc-tutorial-row {
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  color: var(--pc-text);
  text-align: left;
  cursor: pointer;
}

.pc-tutorial-row-icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: var(--pc-control-radius);
  background: color-mix(in srgb, var(--pc-theme-accent) 14%, var(--pc-surface-strong) 86%);
  color: var(--pc-theme-accent);
}

.pc-tutorial-row-copy {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.pc-tutorial-row-copy strong,
.pc-tutorial-requirement {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-tutorial-row-copy small {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-height: 1.45;
}

.pc-tutorial-row-copy small.pc-tutorial-match {
  color: var(--pc-text);
}

.pc-tutorial-row-copy small,
.pc-tutorial-row > i {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-tutorial-requirement {
  width: fit-content;
  max-width: 100%;
  overflow: hidden;
  color: var(--pc-theme-accent);
  font-size: 11px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.pc-tutorial-requirements {
  display: flex;
  width: fit-content;
  max-width: 100%;
  align-items: center;
  gap: 7px;
  padding: 7px 10px;
  border-radius: var(--pc-control-radius);
  background: color-mix(in srgb, var(--pc-theme-accent) 12%, var(--pc-surface-strong) 88%);
  color: var(--pc-theme-accent);
  font-size: 12px;
  font-weight: 800;
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
</style>
