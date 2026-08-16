<template>
  <section class="pc-storyline-detail-page">
    <ReaderDetailShell
      :bagu-enabled="false"
      custom-content
      :favorite-enabled="false"
      :next-disabled="nextDisabled"
      next-label="下一条"
      :previous-disabled="previousDisabled"
      previous-label="上一条"
      :title="title"
      @bottom="scrollToBottom"
      @catalog="$emit('catalog')"
      @edit="$emit('edit')"
      @next="$emit('next')"
      @previous="$emit('previous')"
      @top="scrollToTop"
    >
      <template #kicker>
        <span class="pc-kicker">{{ kicker }}</span>
      </template>
      <template v-if="parentLine && itemKind !== 'line'" #meta>
        <p class="pc-storyline-parent-line">
          所属剧情线：
          <button class="pc-storyline-inline-link" type="button" @click="$emit('openItem', 'line', parentLine.id)">
            {{ parentLine.title }}
          </button>
        </p>
      </template>

      <template #content>
        <div class="pc-storyline-detail-content">
          <template v-if="line">
            <section class="pc-storyline-detail-section">
              <strong>剧情概述</strong>
              <p>{{ line.summary || '暂无剧情概述' }}</p>
            </section>
            <section class="pc-storyline-detail-section">
              <strong>当前目标</strong>
              <p>{{ line.goal || '暂无当前目标' }}</p>
            </section>
            <section class="pc-storyline-detail-section">
              <strong>风险与代价</strong>
              <p>{{ line.stakes || '暂无风险与代价' }}</p>
            </section>
          </template>

          <template v-else-if="beat">
            <section class="pc-storyline-detail-section">
              <strong>节点说明</strong>
              <p>{{ beat.summary || '暂无节点说明' }}</p>
            </section>
            <dl class="pc-storyline-detail-facts">
              <div>
                <dt>节点顺序</dt>
                <dd>第 {{ beat.order + 1 }} 个</dd>
              </div>
              <div>
                <dt>更新时间</dt>
                <dd>{{ formatTime(beat.updatedAt) }}</dd>
              </div>
            </dl>
          </template>

          <template v-else-if="hook">
            <section class="pc-storyline-detail-section">
              <strong>埋设内容</strong>
              <p>{{ hook.seed || '暂无埋设内容' }}</p>
            </section>
            <section class="pc-storyline-detail-section">
              <strong>回收内容</strong>
              <p>{{ hook.payoff || '尚未记录回收内容' }}</p>
            </section>
          </template>

          <section v-if="tags.length" class="pc-storyline-detail-section">
            <strong>标签</strong>
            <div class="pc-storyline-tag-list">
              <span v-for="tag in tags" :key="tag">{{ tag }}</span>
            </div>
          </section>

          <section v-if="relatedProfileIds.length" class="pc-storyline-detail-section">
            <strong>关联资料</strong>
            <div class="pc-storyline-related-list">
              <button
                v-for="profileId in relatedProfileIds"
                :key="profileId"
                class="pc-soft-btn compact"
                type="button"
                :disabled="!profileNames[profileId]"
                @click="$emit('openProfile', profileId)"
              >
                <i class="fa-solid fa-address-card"></i>
                <span>{{ profileNames[profileId] || '资料已失效' }}</span>
              </button>
            </div>
          </section>

          <section v-if="line" class="pc-storyline-detail-section">
            <div class="pc-section-head">
              <strong>剧情节点</strong>
              <span>{{ lineBeats.length }}</span>
            </div>
            <div v-if="lineBeats.length" class="pc-directory-list">
              <button
                v-for="item in lineBeats"
                :key="item.id"
                class="pc-list-row"
                type="button"
                @click="$emit('openItem', 'beat', item.id)"
              >
                <span class="pc-list-row-copy">
                  <strong>{{ item.title }}</strong>
                  <small>{{ getBeatStatusLabel(item.status) }} · 第 {{ item.order + 1 }} 个</small>
                </span>
                <i class="fa-solid fa-chevron-right"></i>
              </button>
            </div>
            <EmptyState v-else compact title="这条剧情线还没有节点" />
          </section>

          <section v-if="line" class="pc-storyline-detail-section">
            <div class="pc-section-head">
              <strong>伏笔</strong>
              <span>{{ lineHooks.length }}</span>
            </div>
            <div v-if="lineHooks.length" class="pc-directory-list">
              <button
                v-for="item in lineHooks"
                :key="item.id"
                class="pc-list-row"
                type="button"
                @click="$emit('openItem', 'hook', item.id)"
              >
                <span class="pc-list-row-copy">
                  <strong>{{ item.title }}</strong>
                  <small>{{ getForeshadowStatusLabel(item.status) }}</small>
                </span>
                <i class="fa-solid fa-chevron-right"></i>
              </button>
            </div>
            <EmptyState v-else compact title="这条剧情线还没有伏笔" />
          </section>

          <dl v-if="line || hook" class="pc-storyline-detail-facts">
            <div>
              <dt>创建时间</dt>
              <dd>{{ formatTime((line || hook)?.createdAt || '') }}</dd>
            </div>
            <div>
              <dt>更新时间</dt>
              <dd>{{ formatTime((line || hook)?.updatedAt || '') }}</dd>
            </div>
          </dl>
        </div>
      </template>

      <template #actions>
        <button class="pc-soft-btn danger" type="button" title="删除" @click="$emit('delete')">
          <i class="fa-solid fa-trash"></i><span>删除</span>
        </button>
      </template>
    </ReaderDetailShell>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import ReaderDetailShell from '@/components/ReaderDetailShell.vue';
import { useDetailScroll } from '@/util/detailScroll';
import {
  getBeatStatusLabel,
  getForeshadowStatusLabel,
  getStorylineKindLabel,
  getStorylineStatusLabel,
  type Foreshadow,
  type Storyline,
  type StorylineBeat,
} from './store';
import type { StorylineItemKind } from './viewTypes';

const props = defineProps<{
  beat: StorylineBeat | null;
  hook: Foreshadow | null;
  itemKind: StorylineItemKind;
  line: Storyline | null;
  lineBeats: StorylineBeat[];
  lineHooks: Foreshadow[];
  nextDisabled: boolean;
  parentLine: Storyline | null;
  previousDisabled: boolean;
  profileNames: Record<string, string>;
}>();

defineEmits<{
  catalog: [];
  delete: [];
  edit: [];
  next: [];
  openItem: [kind: StorylineItemKind, id: string];
  openProfile: [profileId: string];
  previous: [];
}>();

const contentEl = ref<HTMLElement | null>(null);
const { scrollToBottom, scrollToTop } = useDetailScroll(contentEl, '.pc-storyline-detail-page .pc-reader-content');
const title = computed(() => props.line?.title || props.beat?.title || props.hook?.title || '剧情记录');
const kicker = computed(() => {
  if (props.line) return `${getStorylineKindLabel(props.line.kind)} · ${getStorylineStatusLabel(props.line.status)}`;
  if (props.beat) return `剧情节点 · ${getBeatStatusLabel(props.beat.status)}`;
  if (props.hook) return `伏笔 · ${getForeshadowStatusLabel(props.hook.status)}`;
  return '剧情记录';
});
const tags = computed(() => props.line?.tags || props.hook?.tags || []);
const relatedProfileIds = computed(() => props.line?.relatedProfileIds || props.hook?.relatedProfileIds || []);

function formatTime(value: string) {
  if (!value) return '未知';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
}
</script>

<style scoped>
.pc-storyline-detail-page {
  height: 100%;
  min-height: 0;
}

.pc-storyline-detail-content,
.pc-storyline-detail-section {
  display: grid;
  gap: 10px;
}

.pc-storyline-parent-line,
.pc-storyline-detail-section p {
  margin: 0;
}

.pc-storyline-parent-line,
.pc-storyline-detail-section p {
  color: var(--pc-muted);
  font-size: 13px;
  line-height: 1.65;
  white-space: pre-wrap;
}

.pc-storyline-detail-section {
  padding-top: 12px;
  border-top: 1px solid var(--pc-border);
}

.pc-storyline-inline-link {
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--pc-theme-accent);
  cursor: pointer;
  font-weight: 800;
}

.pc-storyline-tag-list,
.pc-storyline-related-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.pc-storyline-tag-list > span {
  border-radius: 999px;
  padding: 5px 9px;
  background: color-mix(in srgb, var(--pc-theme-accent) 13%, var(--pc-surface-strong) 87%);
  color: var(--pc-theme-accent);
  font-size: 12px;
  font-weight: 800;
}

.pc-storyline-related-list .pc-soft-btn {
  min-inline-size: 0;
}

.pc-storyline-detail-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
}

.pc-storyline-detail-facts > div {
  min-width: 0;
  border-radius: var(--pc-control-radius);
  padding: 9px 10px;
  background: var(--pc-surface-strong);
}

.pc-storyline-detail-facts dt,
.pc-storyline-detail-facts dd {
  margin: 0;
}

.pc-storyline-detail-facts dt {
  color: var(--pc-muted);
  font-size: 11px;
  font-weight: 800;
}

.pc-storyline-detail-facts dd {
  margin-top: 4px;
  overflow: hidden;
  font-size: 12px;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
