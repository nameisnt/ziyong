<template>
  <button class="pc-section-card pc-tutorial-row" type="button" @click="$emit('open')">
    <span class="pc-tutorial-row-icon">
      <i :class="articleIcon(result.article.category)" aria-hidden="true"></i>
    </span>
    <span class="pc-tutorial-row-copy">
      <strong>{{ result.article.title }}</strong>
      <small>
        <template v-for="(part, index) in highlightedSnippet" :key="index">
          <mark v-if="part.matched">{{ part.text }}</mark>
          <span v-else>{{ part.text }}</span>
        </template>
      </small>
      <span v-if="result.article.requirements?.length" class="pc-tutorial-requirement">
        {{ result.article.requirements.join(' · ') }}
      </span>
    </span>
    <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
  </button>
</template>

<script setup lang="ts">
import type { TutorialCategoryId, TutorialSearchResult } from './types';

const props = defineProps<{
  keyword: string;
  result: TutorialSearchResult;
}>();

defineEmits<{ open: [] }>();

const highlightedSnippet = computed(() => {
  const text = props.result.snippet;
  const keyword = props.keyword;
  if (!keyword) return [{ matched: false, text }];
  const lowerText = text.toLocaleLowerCase();
  const parts: Array<{ matched: boolean; text: string }> = [];
  let start = 0;
  let matchIndex = lowerText.indexOf(keyword);
  while (matchIndex >= 0) {
    if (matchIndex > start) parts.push({ matched: false, text: text.slice(start, matchIndex) });
    parts.push({ matched: true, text: text.slice(matchIndex, matchIndex + keyword.length) });
    start = matchIndex + keyword.length;
    matchIndex = lowerText.indexOf(keyword, start);
  }
  if (start < text.length) parts.push({ matched: false, text: text.slice(start) });
  return parts;
});

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
</script>

<style scoped>
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
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.45;
}

.pc-tutorial-row-copy mark {
  border-radius: 3px;
  padding: 0 2px;
  background: color-mix(in srgb, var(--pc-theme-accent) 24%, transparent 76%);
  color: var(--pc-text);
}

.pc-tutorial-row > i {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-tutorial-requirement {
  width: fit-content;
  max-width: 100%;
  color: var(--pc-theme-accent);
  font-size: 11px;
  font-weight: 800;
}
</style>
