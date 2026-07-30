<template>
  <section class="memory-app">
    <header class="memory-top">
      <button class="soft-btn" type="button" @click="$emit('close')">返回</button>
      <div><span>Memory Core</span><h1>记忆</h1></div>
      <button class="soft-btn" type="button" :disabled="busy" @click="runAllAuto">自动</button>
    </header>

    <main class="memory-body">
      <section class="stats-grid">
        <div><span>会话</span><strong>{{ conversationsWithStats.length }}</strong></div>
        <div><span>总结</span><strong>{{ summaryCount }}</strong></div>
        <div><span>长期记忆</span><strong>{{ vectorCount }}</strong></div>
      </section>

      <section v-if="notice" class="notice-card">{{ notice }}</section>

      <section class="panel-card settings-card">
        <div class="section-title"><strong>自动化</strong><span>打开记忆 App 时检测</span></div>
        <label class="switch-row"><span>自动总结提示</span><input v-model="settingsDraft.autoSummaryEnabled" type="checkbox" @change="saveSettings" /></label>
        <label class="switch-row"><span>关键词长期记忆</span><input v-model="settingsDraft.vectorMemoryEnabled" type="checkbox" @change="saveSettings" /></label>
        <div class="two-cols">
          <label>每多少条总结<input v-model.number="settingsDraft.autoSummaryEveryMessages" type="number" min="1" @change="saveSettings" /></label>
          <label>总结读取条数<input v-model.number="settingsDraft.maxRecentMessagesForSummary" type="number" min="10" @change="saveSettings" /></label>
        </div>
      </section>

      <section class="panel-card">
        <div class="section-title"><strong>会话</strong><span>{{ autoPendingCount ? `${autoPendingCount} 个待自动总结` : '暂无待处理' }}</span></div>
        <div class="conversation-list">
          <article v-for="conversation in conversationsWithStats" :key="conversation.id" class="conversation-card">
            <div class="conversation-main">
              <strong>{{ conversation.name }}</strong>
              <span>{{ conversation.messageCount }} 条消息 · 上次总结 {{ lastSummaryTime(conversation.id) }}</span>
              <em v-if="conversation.pendingAuto >= state.settings.autoSummaryEveryMessages">新增 {{ conversation.pendingAuto }} 条，可自动总结</em>
            </div>
            <div class="conversation-actions">
              <button type="button" :disabled="busy || !conversation.messageCount" @click="summarize(conversation, 'manual')">手动总结</button>
              <button type="button" :disabled="busy || !conversation.messageCount || !state.settings.vectorMemoryEnabled" @click="makeVectorMemory(conversation)">长期记忆</button>
            </div>
          </article>
        </div>
      </section>

      <section class="panel-card">
        <div class="section-title"><strong>总结列表</strong><span>{{ state.summaries.length }} 条</span></div>
        <div v-if="state.summaries.length" class="memory-list">
          <article v-for="item in state.summaries" :key="item.id" class="summary-item">
            <div>
              <span>{{ item.mode === 'auto' ? '自动' : '手动' }} · {{ item.conversationName }} · {{ formatTime(item.createdAt) }}</span>
              <strong>{{ item.title }}</strong>
              <p>{{ item.summary }}</p>
              <em v-if="item.keywords?.length">{{ item.keywords.join(' / ') }}</em>
            </div>
            <button type="button" @click="deleteSummary(item.id)">删除</button>
          </article>
        </div>
        <div v-else class="empty-state">还没有总结。</div>
      </section>

      <section class="panel-card">
        <div class="section-title"><strong>长期记忆</strong><span>关键词化索引</span></div>
        <div v-if="state.vectorMemories.length" class="memory-list">
          <article v-for="item in state.vectorMemories" :key="item.id" class="vector-item">
            <div>
              <span>{{ item.conversationName }} · 重要性 {{ item.importance }}/5</span>
              <p>{{ item.text }}</p>
              <em v-if="item.keywords?.length">{{ item.keywords.join(' / ') }}</em>
            </div>
            <button type="button" @click="deleteVectorMemory(item.id)">删除</button>
          </article>
        </div>
        <div v-else class="empty-state">还没有长期记忆。</div>
      </section>
    </main>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { useMemoryAi } from '../composables/useMemoryAi.js';
import { useMemoryStore } from '../composables/useMemoryStore.js';
import { useMessageStore } from '../composables/useMessageStore.js';

defineEmits(['close']);

const memory = useMemoryStore();
const messageStore = useMessageStore();
const ai = useMemoryAi();
const { state, summaryCount, vectorCount, updateSettings, addSummary, addVectorMemories, deleteSummary, deleteVectorMemory, updateCheckpoint, getPendingAutoSummary, getConversationSummaries } = memory;
const busy = ref(false);
const notice = ref('');
const settingsDraft = reactive({ ...state.settings });

const conversationsWithStats = computed(() => messageStore.sortedConversations.value.map(conversation => {
  const list = messageStore.messages.value[conversation.id] || [];
  return { ...conversation, messageCount: list.length, pendingAuto: getPendingAutoSummary({ ...conversation, messageCount: list.length }) };
}));
const autoPendingCount = computed(() => conversationsWithStats.value.filter(item => item.pendingAuto >= state.settings.autoSummaryEveryMessages).length);

function saveSettings() {
  updateSettings({ ...settingsDraft });
}

function recentMessages(conversation) {
  const list = messageStore.messages.value[conversation.id] || [];
  return list.slice(-state.settings.maxRecentMessagesForSummary);
}

async function summarize(conversation, mode = 'manual') {
  const list = recentMessages(conversation);
  if (!list.length) return;
  busy.value = true;
  notice.value = '';
  try {
    const result = await ai.summarizeConversation({ conversation, messages: list });
    addSummary({
      ...result,
      conversationId: conversation.id,
      conversationName: conversation.name,
      mode,
      messageCount: list.length,
      fromMessageId: list[0]?.id || '',
      toMessageId: list[list.length - 1]?.id || '',
    });
    updateCheckpoint(conversation.id, messageStore.messages.value[conversation.id] || []);
    notice.value = `${conversation.name} 已生成${mode === 'auto' ? '自动' : '手动'}总结。`;
  } catch (error) {
    notice.value = error.message || '总结失败';
  } finally {
    busy.value = false;
  }
}

async function makeVectorMemory(conversation) {
  const list = recentMessages(conversation);
  if (!list.length) return;
  busy.value = true;
  notice.value = '';
  try {
    const result = await ai.extractVectorMemories({ conversation, messages: list, summaries: getConversationSummaries(conversation.id, 3) });
    const created = addVectorMemories({
      conversationId: conversation.id,
      conversationName: conversation.name,
      memories: result.memories,
      sourceMessageIds: list.map(item => item.id),
    });
    notice.value = created.length ? `${conversation.name} 已生成 ${created.length} 条长期记忆。` : '没有提取到稳定长期记忆。';
  } catch (error) {
    notice.value = error.message || '长期记忆生成失败';
  } finally {
    busy.value = false;
  }
}

async function runAllAuto() {
  if (!state.settings.autoSummaryEnabled) {
    notice.value = '请先开启自动总结提示。';
    return;
  }
  const targets = conversationsWithStats.value.filter(item => item.pendingAuto >= state.settings.autoSummaryEveryMessages);
  if (!targets.length) {
    notice.value = '暂无达到阈值的会话。';
    return;
  }
  for (const conversation of targets) {
    await summarize(conversation, 'auto');
  }
}

function lastSummaryTime(conversationId) {
  const item = state.summaries.find(summary => summary.conversationId === conversationId);
  return item ? formatTime(item.createdAt) : '从未';
}

function formatTime(value) {
  if (!value) return '未知';
  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
}
</script>

<style scoped>
.memory-app { position:absolute; inset:0; z-index:20; overflow:hidden; border-radius:40px; background:linear-gradient(180deg,#07131f 0%,#0d1020 52%,#050507 100%); color:#fff; font-family:inherit; animation:memory-in .32s cubic-bezier(.2,.9,.2,1) both; }
button, input { font-family:inherit; }
button { border:none; cursor:pointer; }
button:disabled { opacity:.5; cursor:not-allowed; }
.memory-top { display:grid; grid-template-columns:62px minmax(0,1fr) 62px; align-items:center; gap:10px; padding:54px 16px 12px; }
.memory-top div { text-align:center; }
.memory-top span { color:#72d6ff; font-size:11px; letter-spacing:1.5px; text-transform:uppercase; }
.memory-top h1 { margin:2px 0 0; font-size:26px; }
.soft-btn { height:32px; border-radius:16px; background:rgba(255,255,255,.1); color:#fff; font-size:12px; }
.memory-body { position:absolute; inset:112px 0 0; overflow-y:auto; padding:12px 14px 34px; }
.memory-body::-webkit-scrollbar { width:0; }
.stats-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
.stats-grid div, .panel-card, .notice-card { border:1px solid rgba(255,255,255,.11); border-radius:22px; background:rgba(255,255,255,.075); box-shadow:0 16px 38px rgba(0,0,0,.22); backdrop-filter:blur(18px); }
.stats-grid div { padding:13px 8px; text-align:center; }
.stats-grid span { display:block; color:rgba(255,255,255,.5); font-size:11px; }
.stats-grid strong { display:block; margin-top:4px; color:#72d6ff; font-size:23px; }
.notice-card { margin-top:12px; padding:10px 12px; color:#dff5ff; font-size:12px; line-height:1.5; }
.panel-card { margin-top:12px; padding:14px; }
.section-title { display:flex; align-items:flex-end; justify-content:space-between; gap:10px; margin-bottom:11px; }
.section-title strong { font-size:17px; }
.section-title span { color:rgba(255,255,255,.5); font-size:11px; text-align:right; }
.switch-row { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:9px 0; color:rgba(255,255,255,.72); font-size:12px; border-top:1px solid rgba(255,255,255,.06); }
.switch-row:first-of-type { border-top:0; }
.two-cols { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px; }
.settings-card label:not(.switch-row) { display:flex; flex-direction:column; gap:6px; color:rgba(255,255,255,.62); font-size:12px; }
.settings-card input[type=number] { width:100%; height:34px; border:none; outline:none; border-radius:13px; padding:0 10px; background:rgba(0,0,0,.28); color:#fff; }
.conversation-list, .memory-list { display:flex; flex-direction:column; gap:9px; }
.conversation-card, .summary-item, .vector-item { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; align-items:start; padding:11px; border-radius:18px; background:rgba(0,0,0,.22); }
.conversation-main strong, .summary-item strong { display:block; font-size:14px; }
.conversation-main span, .summary-item span, .vector-item span { display:block; margin-top:4px; color:rgba(255,255,255,.52); font-size:11px; }
.conversation-main em, .summary-item em, .vector-item em { display:block; margin-top:6px; color:#72d6ff; font-size:11px; font-style:normal; }
.conversation-actions { display:flex; flex-direction:column; gap:6px; }
.conversation-actions button, .summary-item button, .vector-item button { padding:7px 10px; border-radius:13px; background:rgba(114,214,255,.16); color:#dff5ff; font-size:11px; font-weight:800; white-space:nowrap; }
.summary-item p, .vector-item p { margin:7px 0 0; color:rgba(255,255,255,.8); font-size:12px; line-height:1.5; }
.summary-item button, .vector-item button { background:rgba(255,255,255,.1); color:#fff; }
.empty-state { padding:18px; border-radius:18px; background:rgba(0,0,0,.18); color:rgba(255,255,255,.45); text-align:center; font-size:12px; }
@keyframes memory-in { from { opacity:0; transform:translateY(28px) scale(.96); } to { opacity:1; transform:none; } }
</style>
