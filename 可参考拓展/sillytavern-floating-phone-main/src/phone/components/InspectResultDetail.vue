<template>
  <section class="inspect-detail" v-if="result && activeItem">
    <header class="detail-head">
      <span>{{ optionName(activeId) }}</span>
      <strong>{{ activeItem.records?.length || 0 }} 条记录</strong>
    </header>

    <div class="phone-screen" :class="activeId">
      <template v-if="activeId === 'chat'">
        <section class="im-list">
          <article v-for="(record, index) in activeItem.records || []" :key="index" class="im-thread">
            <div class="im-avatar">{{ (record.target || record.name || '聊').slice(0, 1) }}</div>
            <div class="im-copy">
              <div><strong>{{ record.target || record.name || `联系人 ${index + 1}` }}</strong><time>{{ record.time || record.lastTime || '' }}</time></div>
              <p>{{ record.preview || record.detail || record.content || '暂无聊天内容' }}</p>
            </div>
          </article>
        </section>
      </template>

      <template v-else-if="activeId === 'memo'">
        <section class="memo-grid">
          <article v-for="(record, index) in activeItem.records || []" :key="index" class="memo-note">
            <strong>{{ record.title || `草稿 ${index + 1}` }}</strong>
            <p>{{ record.detail || record.content || record.preview || '空白草稿' }}</p>
            <time>{{ record.time || record.status || '' }}</time>
          </article>
        </section>
      </template>

      <template v-else-if="activeId === 'shopping'">
        <section class="order-list">
          <article v-for="(record, index) in activeItem.records || []" :key="index" class="order-card">
            <div class="parcel-icon">箱</div>
            <div>
              <strong>{{ record.name || record.title || `包裹 ${index + 1}` }}</strong>
              <p>{{ record.status || '运输中' }} · {{ record.detail || '物流信息更新中' }}</p>
              <time>{{ record.time || '' }}</time>
            </div>
          </article>
        </section>
      </template>

      <template v-else-if="activeId === 'takeout'">
        <section class="takeout-list">
          <article v-for="(record, index) in activeItem.records || []" :key="index" class="takeout-card">
            <div><strong>{{ record.name || record.title || `外卖订单 ${index + 1}` }}</strong><span>{{ record.status || '已完成' }}</span></div>
            <p>{{ record.detail || record.preview || '订单详情未记录' }}</p>
            <time>{{ record.time || '' }}</time>
          </article>
        </section>
      </template>

      <template v-else-if="activeId === 'browser' || activeId === 'map'">
        <section class="history-list">
          <article v-for="(record, index) in activeItem.records || []" :key="index" class="history-row">
            <span>{{ activeId === 'map' ? '📍' : '⌕' }}</span>
            <div>
              <strong>{{ record.title || record.location || record.detail || `记录 ${index + 1}` }}</strong>
              <p>{{ record.detail || record.preview || record.status || '' }}</p>
            </div>
            <time>{{ record.time || '' }}</time>
          </article>
        </section>
      </template>

      <template v-else-if="activeId === 'call'">
        <section class="call-list">
          <article v-for="(record, index) in activeItem.records || []" :key="index" class="call-row">
            <span :class="record.status">{{ callIcon(record.status) }}</span>
            <div><strong>{{ record.target || record.name || `联系人 ${index + 1}` }}</strong><p>{{ record.status || '通话' }} · {{ record.duration || '0秒' }}</p></div>
            <time>{{ record.time || '' }}</time>
          </article>
        </section>
      </template>

      <template v-else-if="['music', 'media', 'game'].includes(activeId)">
        <section class="media-list">
          <article v-for="(record, index) in activeItem.records || []" :key="index" class="media-card">
            <div class="cover">{{ activeId === 'game' ? '游' : activeId === 'music' ? '音' : '影' }}</div>
            <div>
              <strong>{{ record.name || record.title || `记录 ${index + 1}` }}</strong>
              <p>{{ record.progress || record.duration || record.count || record.detail || '' }}</p>
              <time>{{ record.time || '' }}</time>
            </div>
          </article>
        </section>
      </template>

      <template v-else-if="['exercise', 'sleep', 'charge'].includes(activeId)">
        <section class="health-grid">
          <article v-for="(record, index) in activeItem.records || []" :key="index" class="health-card">
            <span>{{ activeId === 'exercise' ? '步' : activeId === 'sleep' ? '眠' : '电' }}</span>
            <strong>{{ record.count || record.duration || record.status || record.title || `记录 ${index + 1}` }}</strong>
            <p>{{ record.detail || record.time || '' }}</p>
          </article>
        </section>
      </template>

      <template v-else>
        <section class="plain-list">
          <article v-for="(record, index) in activeItem.records || []" :key="index" class="plain-row">
            <div>
              <strong>{{ record.title || record.name || record.target || record.location || `记录 ${index + 1}` }}</strong>
              <p>{{ record.detail || record.preview || record.status || record.progress || '' }}</p>
            </div>
            <time>{{ record.time || record.duration || record.count || '' }}</time>
          </article>
        </section>
      </template>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { getInspectOption } from '../composables/useInspectStore.js';

const props = defineProps({ result: { type: Object, default: null }, initialItemId: { type: String, default: '' } });
const activeId = ref('');

watch(() => props.result, result => { activeId.value = props.initialItemId || result?.selectedItemIds?.[0] || ''; }, { immediate: true });
const activeItem = computed(() => props.result?.items?.[activeId.value] || null);

function optionName(id) { return getInspectOption(id)?.name || id; }
function callIcon(status = '') { return /未接|拒接/.test(status) ? '↙' : /去电|打给/.test(status) ? '↗' : '↘'; }
</script>

<style scoped>
.inspect-detail { color:#111; }
.detail-head { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:10px; }
.detail-head span { color:#8a8a8f; font-size:12px; }
.detail-head strong { font-size:18px; }
.phone-screen { border-radius:24px; background:#f7f7f8; border:1px solid #e5e5ea; overflow:hidden; }
.im-list, .call-list, .history-list, .plain-list { background:#fff; }
.im-thread, .call-row, .history-row, .plain-row { display:grid; align-items:center; gap:10px; padding:11px 12px; border-bottom:1px solid #ececef; }
.im-thread { grid-template-columns:42px minmax(0,1fr); }
.im-thread:last-child, .call-row:last-child, .history-row:last-child, .plain-row:last-child { border-bottom:0; }
.im-avatar { width:42px; height:42px; border-radius:12px; display:grid; place-items:center; background:#111; color:#fff; font-weight:900; }
.im-copy div, .takeout-card div { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.im-copy strong, .call-row strong, .history-row strong, .plain-row strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:14px; }
time { color:#8a8a8f; font-size:10px; white-space:nowrap; }
p { margin:4px 0 0; color:#6b6b70; font-size:12px; line-height:1.4; word-break:break-word; }
.memo-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; padding:10px; background:#f5f1e8; }
.memo-note { min-height:112px; padding:11px; border-radius:16px; background:#fff7d8; box-shadow:0 6px 14px rgba(80,62,20,.08); }
.memo-note strong { font-size:14px; }
.memo-note time { display:block; margin-top:8px; }
.order-list, .takeout-list, .media-list, .health-grid { display:flex; flex-direction:column; gap:9px; padding:10px; }
.order-card, .media-card { display:grid; grid-template-columns:44px minmax(0,1fr); gap:10px; padding:12px; border-radius:18px; background:#fff; border:1px solid #ececef; }
.parcel-icon, .cover { width:44px; height:44px; border-radius:12px; display:grid; place-items:center; background:#f1e8dc; color:#7b5b34; font-weight:900; }
.takeout-card { padding:12px; border-radius:18px; background:#fff; border:1px solid #ececef; }
.takeout-card span { padding:3px 7px; border-radius:999px; background:#eef8ee; color:#34783d; font-size:10px; }
.history-row { grid-template-columns:26px minmax(0,1fr) auto; }
.history-row > span { width:26px; height:26px; border-radius:8px; display:grid; place-items:center; background:#eef2ff; }
.call-row { grid-template-columns:28px minmax(0,1fr) auto; }
.call-row > span { width:28px; height:28px; border-radius:50%; display:grid; place-items:center; background:#eef8ee; color:#248a3d; font-weight:900; }
.call-row > span.未接, .call-row > span.拒接 { background:#fff1f0; color:#d33; }
.media-card .cover { background:#eee8ff; color:#5b42a5; }
.health-grid { display:grid; grid-template-columns:1fr 1fr; }
.health-card { padding:13px; border-radius:18px; background:#fff; border:1px solid #ececef; }
.health-card span { width:28px; height:28px; border-radius:10px; display:grid; place-items:center; background:#eaf7ef; color:#2f7d49; font-weight:900; }
.health-card strong { display:block; margin-top:10px; font-size:18px; }
.plain-row { grid-template-columns:minmax(0,1fr) auto; }
</style>
