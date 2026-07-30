<template>
  <section class="peek-app" :class="{ reverse: isReverse }">
    <header class="peek-top">
      <button class="soft-btn" type="button" @click="$emit('close')">返回</button>
      <div>
        <h1>{{ isReverse ? 'TA 偷看我' : '偷窥' }}</h1>
      </div>
      <button class="soft-btn" type="button" :disabled="loading" @click="generate">刷新</button>
    </header>

    <main class="peek-body">
      <section class="mode-card panel-card">
        <div class="mode-switch">
          <button type="button" :class="{ active: !isReverse }" @click="setMode('normal')">偷看 TA</button>
          <button type="button" :class="{ active: isReverse }" @click="setMode('reverse')">TA 偷看我</button>
        </div>
        <label class="switch-line"><span>优先使用 AI 生成</span><input :checked="state.aiEnabled" type="checkbox" @change="setAiEnabled($event.target.checked)" /></label>
        <p>{{ isReverse ? '反向偷窥是角色视角的虚拟观察，不会读取真实摄像头、定位或系统隐私。' : '偷看角色的今日状态、心声、未发送消息和搜索记录。' }}</p>
      </section>

      <section class="target-card panel-card">
        <div class="avatar" :style="imageStyle(activeRole?.avatar)"><span v-if="!activeRole?.avatar">{{ roleInitial }}</span></div>
        <div>
          <span>目标会话</span>
          <select v-model="selectedConversationId">
            <option v-for="conversation in targetConversations" :key="conversation.id" :value="conversation.id">{{ conversation.name }}</option>
          </select>
        </div>
      </section>

      <section v-if="notice" class="notice-card">{{ notice }}</section>

      <section class="main-peek-card" v-if="currentPeek">
        <div class="peek-badge">{{ currentPeek.riskLevel || (isReverse ? '观察报告' : '今日小线索') }}</div>
        <h2>{{ currentPeek.title }}</h2>
        <p class="status-text">{{ currentPeek.status }}</p>
      </section>

      <section class="cards-grid" v-if="currentPeek">
        <article class="peek-card inner">
          <span>{{ isReverse ? 'TA 的观察结论' : '心声' }}</span>
          <p>{{ currentPeek.innerVoice }}</p>
        </article>
        <article class="peek-card memo">
          <span>{{ isReverse ? '用户档案备注' : '私密备忘录' }}</span>
          <p>{{ currentPeek.memo }}</p>
        </article>
      </section>

      <section class="unsent-card panel-card" v-if="currentPeek">
        <div class="section-title">
          <strong>未发送消息</strong>
          <span>{{ pushedTip }}</span>
        </div>
        <p>{{ currentPeek.unsentMessage || '没有捕捉到未发送消息。' }}</p>
        <button type="button" :disabled="!currentPeek.unsentMessage || !activeConversation" @click="pushUnsentMessage">让 TA 发出来</button>
      </section>

      <section class="panel-card" v-if="currentPeek?.searches?.length">
        <div class="section-title"><strong>{{ isReverse ? '偷偷搜索用户' : '最近搜索' }}</strong><span>{{ currentPeek.searches.length }} 条</span></div>
        <div class="search-list">
          <span v-for="item in currentPeek.searches" :key="item">{{ item }}</span>
        </div>
      </section>

      <section class="panel-card">
        <div class="section-title"><strong>历史窥探</strong><span>{{ modeHistory.length }} 条</span></div>
        <div v-if="modeHistory.length" class="history-list">
          <article v-for="item in modeHistory.slice(0, 8)" :key="item.id">
            <div>
              <span>{{ item.mode === 'reverse' ? '反向' : '普通' }} · {{ item.roleName }} · {{ formatTime(item.createdAt) }}</span>
              <strong>{{ item.title }}</strong>
              <p>{{ item.status }}</p>
            </div>
            <button type="button" @click="deletePeek(item.id)">删除</button>
          </article>
        </div>
        <div v-else class="empty-state">这个模式还没有窥探记录，点刷新生成一条。</div>
      </section>
    </main>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useMemoryStore } from '../composables/useMemoryStore.js';
import { useMessageStore } from '../composables/useMessageStore.js';
import { usePeekAi } from '../composables/usePeekAi.js';
import { usePeekStore } from '../composables/usePeekStore.js';
import { useTavern } from '../composables/useTavern.js';

defineEmits(['close']);

const peek = usePeekStore();
const messageStore = useMessageStore();
const memory = useMemoryStore();
const ai = usePeekAi();
const tavern = useTavern();
const { state, setMode, setAiEnabled, createFallbackPeek, addPeek, deletePeek } = peek;
const selectedConversationId = ref('');
const tavernRole = ref(null);
const loading = ref(false);
const notice = ref('');
const pushedTip = ref('');

const isReverse = computed(() => state.mode === 'reverse');
const targetConversations = computed(() => messageStore.sortedConversations.value.filter(item => item.type === 'private'));
const activeConversation = computed(() => targetConversations.value.find(item => item.id === selectedConversationId.value) || targetConversations.value[0] || null);
const activeRole = computed(() => {
  const roleId = activeConversation.value?.memberIds?.[0];
  return roleId ? messageStore.findRole(roleId) : null;
});
const displayRole = computed(() => activeRole.value || tavernRole.value || { id: '', name: 'TA', avatar: '' });
const roleInitial = computed(() => String(displayRole.value?.name || 'TA').slice(0, 1));
const modeHistory = computed(() => state.history.filter(item => item.mode === state.mode));
const currentPeek = computed(() => modeHistory.value[0] || createFallbackPeek({ roleName: displayRole.value?.name || 'TA', mode: state.mode }));

onMounted(async () => {
  if (!selectedConversationId.value && targetConversations.value[0]) selectedConversationId.value = targetConversations.value[0].id;
  try {
    const data = await tavern.getRoleAppData();
    tavernRole.value = data?.character || null;
  } catch (error) {
    console.warn('[PeekApp] tavern role load failed:', error);
  }
  if (!modeHistory.value.length) generate();
});

async function generate() {
  const role = displayRole.value;
  const conversation = activeConversation.value;
  const list = conversation ? (messageStore.messages.value[conversation.id] || []).slice(-50) : [];
  const latestText = list.slice(-8).map(item => item.text || '').join('\n');
  const fallback = createFallbackPeek({ roleName: role?.name || 'TA', mode: state.mode });
  loading.value = true;
  notice.value = '';
  pushedTip.value = '';
  try {
    const generated = state.aiEnabled
      ? await ai.generatePeek({
        mode: state.mode,
        role,
        conversation,
        messages: list,
        summaries: conversation ? memory.getConversationSummaries(conversation.id, 3) : [],
        memories: conversation ? memory.getRelevantMemories(conversation.id, latestText, 5) : [],
        fallback,
      })
      : fallback;
    addPeek({
      ...fallback,
      ...generated,
      mode: state.mode,
      roleId: role?.id || '',
      roleName: role?.name || 'TA',
      conversationId: conversation?.id || '',
    });
  } catch (error) {
    addPeek({
      ...fallback,
      roleId: role?.id || '',
      roleName: role?.name || 'TA',
      conversationId: conversation?.id || '',
    });
    notice.value = `${error.message || 'AI 生成失败'}，已使用本地模板。`;
  } finally {
    loading.value = false;
  }
}

function pushUnsentMessage() {
  if (!activeConversation.value || !currentPeek.value?.unsentMessage) return;
  const role = activeRole.value || displayRole.value;
  messageStore.addMessage(activeConversation.value.id, {
    senderType: 'role',
    senderId: role?.id || 'peek_role',
    senderName: role?.name || 'TA',
    senderAvatar: role?.avatar || '',
    type: 'text',
    text: currentPeek.value.unsentMessage,
    status: 'sent',
  });
  pushedTip.value = '已发送到信息 App';
  setTimeout(() => { pushedTip.value = ''; }, 1600);
}

function imageStyle(url) {
  return url ? { backgroundImage: `url('${url}')` } : null;
}

function formatTime(value) {
  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
}
</script>

<style scoped>
.peek-app { position:absolute; inset:0; z-index:20; overflow:hidden; border-radius:40px; background:#fbfaf5; color:#24211d; font-family:inherit; animation:peek-in .32s cubic-bezier(.2,.9,.2,1) both; }
.peek-app.reverse { background:#fff9f7; color:#2a211f; }
button, select, input { font-family:inherit; }
button { border:none; cursor:pointer; }
button:disabled { opacity:.55; cursor:not-allowed; }
.peek-top { display:grid; grid-template-columns:62px minmax(0,1fr) 62px; align-items:center; gap:10px; padding:54px 16px 12px; }
.peek-top div { text-align:center; }
.peek-top h1 { margin:0; font-size:25px; }
.soft-btn { height:32px; border-radius:16px; background:#fff; color:#6c6052; font-size:12px; box-shadow:0 8px 18px rgba(116,91,58,.12); }
.peek-body { position:absolute; inset:112px 0 0; overflow-y:auto; padding:12px 14px 34px; }
.peek-body::-webkit-scrollbar { width:0; }
.panel-card, .notice-card { border:1px solid #eadfce; border-radius:23px; background:#fff; box-shadow:0 16px 36px rgba(95,74,48,.12); }
.reverse .panel-card, .reverse .notice-card { border-color:#f0d9d3; background:#fff; }
.mode-card, .target-card, .unsent-card, .panel-card { padding:14px; margin-top:12px; }
.mode-card { margin-top:0; }
.mode-switch { display:grid; grid-template-columns:1fr 1fr; gap:7px; padding:4px; border-radius:18px; background:#f4efe7; }
.mode-switch button { height:32px; border-radius:16px; background:transparent; color:#8b7b6a; font-size:12px; font-weight:850; }
.mode-switch button.active { background:#2f2a25; color:#fff; box-shadow:0 8px 18px rgba(47,42,37,.16); }
.reverse .mode-switch button.active { background:#b96f63; color:#fff; box-shadow:0 8px 18px rgba(185,111,99,.18); }
.switch-line { display:flex; align-items:center; justify-content:space-between; margin-top:12px; color:#7a6c5d; font-size:12px; }
.mode-card p { margin:10px 0 0; color:#8d806f; font-size:11px; line-height:1.5; }
.target-card { display:grid; grid-template-columns:54px minmax(0,1fr); gap:12px; align-items:center; }
.avatar { width:54px; height:54px; border-radius:19px; display:grid; place-items:center; background:#f0e2cc; background-size:cover; background-position:center; font-size:22px; font-weight:900; color:#5f4d38; }
.reverse .avatar { background-color:#f1d7d0; color:#7a4c45; }
.target-card span { display:block; color:#9a8d7b; font-size:11px; margin-bottom:6px; }
.target-card select { width:100%; height:36px; border:1px solid #e6d9c7; outline:none; border-radius:14px; padding:0 10px; background:#fffaf3; color:#332d27; }
.target-card option { background:#fffaf3; color:#332d27; }
.notice-card { margin-top:12px; padding:10px 12px; color:#7a6142; font-size:12px; line-height:1.5; }
.reverse .notice-card { color:#8a5c55; }
.main-peek-card { position:relative; margin-top:12px; padding:18px; border-radius:28px; overflow:hidden; background:#fff; border:1px solid #eadfce; box-shadow:0 20px 42px rgba(95,74,48,.13); }
.reverse .main-peek-card { background:#fff; border-color:#f0d9d3; }
.peek-badge { display:inline-flex; padding:5px 9px; border-radius:999px; background:#f4efe7; color:#786653; font-size:11px; }
.reverse .peek-badge { background:#fff0ec; color:#a35f54; }
.main-peek-card h2 { margin:12px 0 8px; font-size:24px; }
.status-text { margin:0; color:#66594c; font-size:13px; line-height:1.65; }
.cards-grid { display:grid; grid-template-columns:1fr 1fr; gap:9px; margin-top:12px; }
.peek-card { min-height:126px; padding:13px; border-radius:22px; background:#fff; border:1px solid #eadfce; box-shadow:0 12px 28px rgba(95,74,48,.08); }
.reverse .peek-card { background:#fff; border-color:#f0d9d3; }
.peek-card span { color:#9a7552; font-size:11px; font-weight:800; }
.reverse .peek-card span { color:#b96f63; }
.peek-card p, .unsent-card p { margin:8px 0 0; color:#66594c; font-size:12px; line-height:1.55; }
.section-title { display:flex; align-items:flex-end; justify-content:space-between; gap:10px; margin-bottom:10px; }
.section-title strong { font-size:17px; }
.section-title span { color:#9a7552; font-size:11px; text-align:right; }
.reverse .section-title span { color:#b96f63; }
.unsent-card button { margin-top:12px; height:34px; padding:0 13px; border-radius:15px; background:#2f2a25; color:#fff; font-weight:850; }
.reverse .unsent-card button { background:#b96f63; color:#fff; }
.search-list { display:flex; flex-wrap:wrap; gap:7px; }
.search-list span { padding:7px 9px; border-radius:999px; background:#f4efe7; color:#786653; font-size:11px; }
.reverse .search-list span { background:#fff0ec; color:#a35f54; }
.history-list { display:flex; flex-direction:column; gap:8px; }
.history-list article { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; padding:10px; border-radius:17px; background:#faf5ee; }
.history-list span { display:block; color:#9a8d7b; font-size:10px; }
.history-list strong { display:block; margin-top:4px; font-size:13px; }
.history-list p { margin:5px 0 0; color:#776a5d; font-size:11px; line-height:1.45; }
.history-list button { padding:7px 9px; align-self:start; border-radius:12px; background:#fff; color:#6c6052; font-size:11px; }
.empty-state { padding:18px; border-radius:18px; background:#faf5ee; color:#9a8d7b; text-align:center; font-size:12px; }
@keyframes peek-in { from { opacity:0; transform:translateY(28px) scale(.96); } to { opacity:1; transform:none; } }
</style>
