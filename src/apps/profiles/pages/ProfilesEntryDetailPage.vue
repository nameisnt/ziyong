<template>
  <section class="pc-profiles-page pc-profiles-detail-page"><article class="pc-detail-card pc-profile-detail-archive"><div class="pc-detail-title-row"><div><span class="pc-kicker"><i :class="['fa-solid', kindIcon]"></i>{{ tableName }}</span><h2>{{ entry.title }}</h2></div><button class="pc-detail-mini-btn" type="button" title="编辑" @click="$emit('edit')"><i class="fa-solid fa-pen"></i></button></div><FrontendFrame v-if="renderMode === 'frontend'" :content="frontendContent" :theme="theme" :title="entry.title" /><div v-if="frontendErrors.length" class="pc-status-card warning"><strong>资料表格式提示</strong><p>{{ frontendErrors.join('；') }}</p></div><!-- eslint-disable-next-line vue/no-v-html --><article v-else ref="contentEl" class="pc-detail-content pc-rendered-markdown" v-html="markdownHtml"></article></article>
    <DetailFooter catalog-label="列表" next-label="下一条" previous-label="上一条" :next-disabled="!nextEntryId" :previous-disabled="!previousEntryId" @bottom="scrollToBottom" @catalog="$emit('catalog')" @next="$emit('open-entry', nextEntryId)" @previous="$emit('open-entry', previousEntryId)" @top="scrollToTop"><template #actions><button v-if="baguContent" class="pc-soft-btn" type="button" title="八股检测" @click="$emit('bagu')"><i class="fa-solid fa-filter-circle-xmark"></i></button><button :class="['pc-soft-btn', { active: entry.favorite }]" type="button" :title="entry.favorite ? '取消收藏' : '收藏'" @click="$emit('favorite')"><i class="fa-solid fa-heart"></i></button><button class="pc-soft-btn" type="button" title="编辑" @click="$emit('edit')"><i class="fa-solid fa-pen"></i></button><button class="pc-soft-btn danger" type="button" title="删除" @click="$emit('remove')"><i class="fa-solid fa-trash"></i></button></template></DetailFooter>
  </section>
</template>
<script setup lang="ts">
import DetailFooter from '@/components/DetailFooter.vue';
import FrontendFrame from '@/components/FrontendFrame.vue';
import { useDetailScroll } from '@/util/detailScroll';
import type { ProfileEntry, ProfileRenderMode } from '../store';
defineProps<{ baguContent: string; entry: ProfileEntry; frontendContent: string; frontendErrors: string[]; kindIcon: string; markdownHtml: string; nextEntryId: string; previousEntryId: string; renderMode: ProfileRenderMode; tableName: string; theme: 'dark' | 'light' }>();
defineEmits<{ bagu: []; catalog: []; edit: []; favorite: []; 'open-entry': [entryId: string]; remove: [] }>();
const contentEl = ref<HTMLElement | null>(null); const { scrollToBottom, scrollToTop } = useDetailScroll(contentEl, '.pc-profiles-detail-page .pc-detail-content');
</script>
<style scoped>
.pc-profiles-page { display: grid; min-height: 100%; align-content: start; gap: 14px; }
.pc-profiles-detail-page { display: flex; height: 100%; min-height: 0; flex-direction: column; overflow: hidden; }
.pc-profile-detail-archive .pc-detail-title-row { padding-bottom: 12px; border-bottom: 1px solid var(--pc-border); }
.pc-profile-detail-archive .pc-kicker { display: inline-flex; align-items: center; gap: 6px; }
.pc-profiles-detail-page .pc-detail-card { display: flex; min-height: 0; flex: 1 1 auto; flex-direction: column; }
.pc-profiles-detail-page .pc-detail-content { min-height: 0; flex: 1 1 auto; overflow: auto; }
</style>
