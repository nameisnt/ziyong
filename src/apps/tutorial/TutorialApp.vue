<template>
  <section class="pc-tutorial-app">
    <section v-if="route.page === 'root'" class="pc-tutorial-page">
      <label class="pc-tutorial-search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="searchQuery" class="pc-field" type="search" placeholder="搜索宏、生成、依赖或问题" />
      </label>

      <nav class="pc-tutorial-categories" aria-label="教程分类">
        <button
          v-for="category in tutorialCategories"
          :key="category.id"
          class="pc-segment-btn"
          :class="{ active: activeCategory === category.id }"
          type="button"
          @click="activeCategory = category.id"
        >
          {{ category.label }}
        </button>
      </nav>

      <div v-if="visibleArticles.length" class="pc-tutorial-list">
        <button
          v-for="article in visibleArticles"
          :key="article.id"
          class="pc-section-card pc-tutorial-row"
          type="button"
          @click="openArticle(article)"
        >
          <span class="pc-tutorial-row-icon">
            <i :class="articleIcon(article.category)"></i>
          </span>
          <span class="pc-tutorial-row-copy">
            <strong>{{ article.title }}</strong>
            <small>{{ article.summary }}</small>
            <span v-if="article.requirements?.length" class="pc-tutorial-requirement">
              {{ article.requirements.join(' · ') }}
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

          <section v-else class="pc-tutorial-code">
            <header>
              <span>{{ block.label || '示例' }}</span>
              <button class="pc-icon-btn" type="button" title="复制" @click="copyCode(block.code)">
                <i class="fa-regular fa-copy"></i>
              </button>
            </header>
            <pre><code>{{ block.code }}</code></pre>
          </section>
        </template>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import { usePhoneStore } from '@/store/phone';
import {
  tutorialArticles,
  tutorialCategories,
  type TutorialArticle,
  type TutorialCategoryId,
} from './data';

const phone = usePhoneStore();
const route = computed(() => phone.currentRoute);
const activeCategory = ref<'all' | TutorialCategoryId>('all');
const searchQuery = ref('');

const activeArticle = computed(() => {
  const articleId = route.value.params?.articleId || '';
  return tutorialArticles.find(article => article.id === articleId) ?? null;
});

const visibleArticles = computed(() => {
  const keyword = searchQuery.value.trim().toLocaleLowerCase();
  return tutorialArticles.filter(article => {
    if (activeCategory.value !== 'all' && article.category !== activeCategory.value) return false;
    if (!keyword) return true;
    return [
      article.title,
      article.summary,
      ...article.keywords,
      ...(article.requirements || []),
    ].some(text => text.toLocaleLowerCase().includes(keyword));
  });
});

function categoryLabel(categoryId: TutorialCategoryId) {
  return tutorialCategories.find(category => category.id === categoryId)?.label || '教程';
}

function articleIcon(categoryId: TutorialCategoryId) {
  return {
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
  height: 100%;
  min-height: 0;
}

.pc-tutorial-page {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  padding: 14px;
}

.pc-tutorial-search {
  position: relative;
  display: block;
}

.pc-tutorial-search > i {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: 14px;
  color: var(--pc-muted);
  transform: translateY(-50%);
}

.pc-tutorial-search .pc-field {
  padding-left: 40px;
}

.pc-tutorial-categories {
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.pc-tutorial-categories .pc-segment-btn {
  width: 100%;
  min-height: 34px;
  min-inline-size: auto;
  padding-inline: 8px;
  background: var(--pc-soft-button-bg);
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
