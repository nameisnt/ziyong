<template>
  <section class="diary-app">
    <header class="diary-top">
      <button class="plain-btn" type="button" @click="goBack">{{ viewMode === 'list' ? '返回' : '列表' }}</button>
      <div>
        <span>Dear diary</span>
        <h1>日记</h1>
      </div>
      <button class="plain-btn primary" type="button" @click="openEditor()">写日记</button>
    </header>

    <Transition name="diary-view" mode="out-in">
    <main v-if="viewMode === 'list'" key="list" class="diary-body">
      <section class="today-card paper-card">
        <div>
          <span>{{ today }}</span>
          <strong>今天我们发生了什么</strong>
          <p>{{ todaySummary?.summary || '把今天散落在聊天里的小事，收进一页日记。' }}</p>
        </div>
        <div class="today-actions">
          <button type="button" :disabled="busy" @click="makeTodaySummary">生成今日</button>
          <button type="button" :disabled="!todaySummary" @click="draftFromToday">写成日记</button>
        </div>
      </section>

      <section v-if="notice" class="notice-card">{{ notice }}</section>

      <section class="draft-card paper-card">
        <div class="section-title"><strong>从聊天生成草稿</strong><span>{{ selectedConversation?.name || '选择会话' }}</span></div>
        <select v-model="selectedConversationId">
          <option value="">选择一个会话</option>
          <option v-for="conversation in conversations" :key="conversation.id" :value="conversation.id">{{ conversation.name }}</option>
        </select>
        <button type="button" :disabled="busy || !selectedConversationId" @click="makeDraftFromConversation">生成今天的日记草稿</button>
      </section>

      <section class="entry-list">
        <article v-for="entry in entries" :key="entry.id" class="entry-card" :class="{ private: entry.isPrivate }" @click="openEntry(entry)">
          <div class="entry-date"><strong>{{ dayOfDate(entry.date) }}</strong><span>{{ monthOfDate(entry.date) }}</span></div>
          <div class="entry-main">
            <div class="entry-line"><strong>{{ entry.title }}</strong><em v-if="entry.isPrivate">上锁</em></div>
            <p>{{ previewText(entry) }}</p>
            <div class="tag-row">
              <span v-if="entry.mood">{{ entry.mood }}</span>
              <span v-for="tag in entry.tags" :key="tag">{{ tag }}</span>
            </div>
          </div>
        </article>
        <div v-if="!entries.length" class="empty-state">还没有日记。今天的第一句话可以很短。</div>
      </section>
    </main>

    <main v-else-if="viewMode === 'detail' && selectedEntry" key="detail" class="diary-body detail-body">
      <article class="detail-paper">
        <div class="detail-meta"><span>{{ selectedEntry.date }}</span><span>{{ selectedEntry.weather || '无天气' }}</span><span>{{ selectedEntry.mood || '无心情' }}</span></div>
        <h2>{{ selectedEntry.title }}</h2>
        <p v-if="selectedEntry.happenedToday" class="happened">{{ selectedEntry.happenedToday }}</p>
        <div class="detail-content">{{ selectedEntry.content }}</div>
        <div class="tag-row detail-tags"><span v-for="tag in selectedEntry.tags" :key="tag">{{ tag }}</span></div>
      </article>

      <section class="detail-tools paper-card">
        <button type="button" @click="openEditor(selectedEntry)">编辑</button>
        <button type="button" @click="togglePrivate(selectedEntry)">{{ selectedEntry.isPrivate ? '取消私密' : '设为私密' }}</button>
        <button type="button" :disabled="selectedEntry.memorySaved" @click="saveToMemory(selectedEntry)">{{ selectedEntry.memorySaved ? '已加入记忆' : '加入长期记忆' }}</button>
        <button class="danger" type="button" @click="removeEntry(selectedEntry.id)">删除</button>
      </section>

      <section class="comment-card paper-card">
        <div class="section-title"><strong>角色小纸条</strong><span>{{ selectedEntry.roleComments.length }} 条</span></div>
        <div class="comment-create">
          <select v-model="selectedRoleId">
            <option value="">选择角色</option>
            <option v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}</option>
          </select>
          <button type="button" :disabled="busy || !selectedRoleId" @click="makeRoleComment">让角色评论</button>
        </div>
        <article v-for="comment in selectedEntry.roleComments" :key="comment.id" class="comment-note">
          <strong>{{ comment.roleName }}</strong>
          <p>{{ comment.content }}</p>
        </article>
        <div v-if="!selectedEntry.roleComments.length" class="empty-small">还没有角色留言。</div>
      </section>
    </main>

    <main v-else-if="viewMode === 'editor'" key="editor" class="diary-body editor-body">
      <form class="editor-paper" @submit.prevent="saveEditor">
        <label>标题<input v-model="form.title" required placeholder="给今天取个名字" /></label>
        <div class="two-cols">
          <label>日期<input v-model="form.date" type="date" required /></label>
          <label>天气<input v-model="form.weather" placeholder="晴 / 雨 / 阴" /></label>
        </div>
        <div class="two-cols">
          <label>心情<input v-model="form.mood" placeholder="温柔、疲惫、开心" /></label>
          <label>标签<input v-model="tagText" placeholder="聊天, 陪伴" /></label>
        </div>
        <label>今天我们发生了什么<textarea v-model="form.happenedToday" rows="3" placeholder="一句很短的今日回忆"></textarea></label>
        <label>正文<textarea v-model="form.content" class="content-input" rows="10" required placeholder="今天……"></textarea></label>
        <label class="switch-row"><span>设为私密日记</span><input v-model="form.isPrivate" type="checkbox" /></label>
        <div class="editor-actions">
          <button type="button" @click="cancelEditor">取消</button>
          <button class="primary" type="submit">保存</button>
        </div>
      </form>
    </main>
    </Transition>

    <Transition name="modal-fade">
      <section v-if="lockOpen" class="modal-layer">
        <form class="lock-card" @submit.prevent="confirmPin">
          <span>Private diary</span>
          <h2>{{ pinMode === 'set' ? '设置 4 位密码' : '输入密码' }}</h2>
          <input v-model="pinInput" inputmode="numeric" maxlength="4" placeholder="0000" />
          <p>{{ lockMessage || '私密日记只在解锁后显示内容。' }}</p>
          <div class="lock-actions">
            <button type="button" @click="closeLock">取消</button>
            <button class="primary" type="submit">确认</button>
          </div>
        </form>
      </section>
    </Transition>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { useDiaryAi } from '../composables/useDiaryAi.js';
import { useDiaryStore } from '../composables/useDiaryStore.js';
import { useMemoryStore } from '../composables/useMemoryStore.js';
import { useMessageStore } from '../composables/useMessageStore.js';

const emit = defineEmits(['close']);

const diary = useDiaryStore();
const messages = useMessageStore();
const memory = useMemoryStore();
const ai = useDiaryAi();

const viewMode = ref('list');
const selectedEntryId = ref('');
const editingId = ref('');
const busy = ref(false);
const notice = ref('');
const selectedConversationId = ref('');
const selectedRoleId = ref('');
const todaySummary = ref(null);
const unlockedIds = ref(new Set());
const lockOpen = ref(false);
const pinMode = ref('verify');
const pinInput = ref('');
const lockMessage = ref('');
const pendingPrivateEntry = ref(null);
const pendingPrivatePatch = ref(null);
const form = reactive({ title: '', content: '', happenedToday: '', mood: '', weather: '', tags: [], date: diary.todayKey(), isPrivate: false });
const tagText = ref('');

const entries = computed(() => diary.sortedEntries.value);
const conversations = computed(() => messages.sortedConversations.value);
const roles = computed(() => messages.roles.value);
const selectedConversation = computed(() => conversations.value.find(item => item.id === selectedConversationId.value) || null);
const selectedRole = computed(() => roles.value.find(item => item.id === selectedRoleId.value) || null);
const selectedEntry = computed(() => entries.value.find(item => item.id === selectedEntryId.value) || null);
const today = diary.todayKey();

function resetForm(payload = {}) {
  Object.assign(form, {
    title: payload.title || '',
    content: payload.content || '',
    happenedToday: payload.happenedToday || '',
    mood: payload.mood || '',
    weather: payload.weather || '',
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    date: payload.date || diary.todayKey(),
    isPrivate: Boolean(payload.isPrivate),
  });
  tagText.value = form.tags.join(', ');
}

function goBack() {
  if (viewMode.value === 'list') emit('close');
  else viewMode.value = 'list';
}

function openEditor(entry = null) {
  editingId.value = entry?.id || '';
  resetForm(entry || {});
  viewMode.value = 'editor';
}

function cancelEditor() {
  viewMode.value = editingId.value ? 'detail' : 'list';
}

function saveEditor() {
  const payload = { ...form, tags: tagText.value };
  if (payload.isPrivate && !diary.hasPin()) {
    pendingPrivatePatch.value = payload;
    openPin('set');
    return;
  }
  persistEditor(payload);
}

function persistEditor(payload) {
  const entry = editingId.value ? diary.updateEntry(editingId.value, payload) : diary.addEntry(payload);
  selectedEntryId.value = entry.id;
  if (!entry.isPrivate) unlockEntry(entry.id);
  viewMode.value = 'detail';
  notice.value = '日记已保存。';
}

function openEntry(entry) {
  if (entry.isPrivate && !unlockedIds.value.has(entry.id)) {
    pendingPrivateEntry.value = entry;
    openPin(diary.hasPin() ? 'verify' : 'set');
    return;
  }
  selectedEntryId.value = entry.id;
  viewMode.value = 'detail';
}

function togglePrivate(entry) {
  if (!entry.isPrivate && !diary.hasPin()) {
    pendingPrivatePatch.value = { id: entry.id, isPrivate: true };
    openPin('set');
    return;
  }
  diary.updateEntry(entry.id, { isPrivate: !entry.isPrivate });
  if (!entry.isPrivate) lockEntry(entry.id);
  else unlockEntry(entry.id);
}

function openPin(mode) {
  pinMode.value = mode;
  pinInput.value = '';
  lockMessage.value = '';
  lockOpen.value = true;
}

function closeLock() {
  lockOpen.value = false;
  pendingPrivateEntry.value = null;
  pendingPrivatePatch.value = null;
}

function confirmPin() {
  try {
    if (pinMode.value === 'set') diary.setPin(pinInput.value);
    else if (!diary.verifyPin(pinInput.value)) {
      lockMessage.value = '密码不正确';
      return;
    }
    if (pendingPrivateEntry.value) {
      unlockEntry(pendingPrivateEntry.value.id);
      selectedEntryId.value = pendingPrivateEntry.value.id;
      viewMode.value = 'detail';
    }
    if (pendingPrivatePatch.value) {
      const patch = pendingPrivatePatch.value;
      if (patch.id) diary.updateEntry(patch.id, { isPrivate: true });
      else persistEditor(patch);
    }
    closeLock();
  } catch (error) {
    lockMessage.value = error.message || '设置失败';
  }
}

function unlockEntry(id) {
  unlockedIds.value = new Set([...unlockedIds.value, id]);
}

function lockEntry(id) {
  const next = new Set(unlockedIds.value);
  next.delete(id);
  unlockedIds.value = next;
}

function removeEntry(id) {
  diary.deleteEntry(id);
  selectedEntryId.value = '';
  viewMode.value = 'list';
  notice.value = '日记已删除。';
}

async function makeDraftFromConversation() {
  const conversation = selectedConversation.value;
  if (!conversation) return;
  busy.value = true;
  notice.value = '';
  try {
    const list = (messages.messages.value[conversation.id] || []).slice(-80);
    const draft = await ai.generateDraftFromConversation({ conversation, messages: list });
    editingId.value = '';
    resetForm({ ...draft, date: diary.todayKey() });
    viewMode.value = 'editor';
  } catch (error) {
    notice.value = error.message || '生成草稿失败';
  } finally {
    busy.value = false;
  }
}

async function makeTodaySummary() {
  busy.value = true;
  notice.value = '';
  try {
    todaySummary.value = await ai.generateTodaySummary({ conversations: conversations.value, messagesByConversation: messages.messages.value });
  } catch (error) {
    notice.value = error.message || '生成今日总结失败';
  } finally {
    busy.value = false;
  }
}

function draftFromToday() {
  if (!todaySummary.value) return;
  editingId.value = '';
  resetForm({
    title: todaySummary.value.suggestedTitle,
    content: todaySummary.value.summary,
    happenedToday: todaySummary.value.summary,
    mood: todaySummary.value.mood,
    tags: todaySummary.value.tags,
    date: diary.todayKey(),
  });
  viewMode.value = 'editor';
}

async function makeRoleComment() {
  if (!selectedEntry.value || !selectedRole.value) return;
  busy.value = true;
  notice.value = '';
  try {
    const content = await ai.generateRoleComment({ role: selectedRole.value, entry: selectedEntry.value });
    diary.addRoleComment(selectedEntry.value.id, {
      roleId: selectedRole.value.id,
      roleName: selectedRole.value.name,
      roleAvatar: selectedRole.value.avatar,
      content,
    });
  } catch (error) {
    notice.value = error.message || '角色评论失败';
  } finally {
    busy.value = false;
  }
}

function saveToMemory(entry) {
  if (entry.memorySaved) return;
  memory.addVectorMemories({
    conversationId: `diary:${entry.id}`,
    conversationName: '日记',
    sourceMessageIds: [entry.id],
    memories: [{ text: `用户在 ${entry.date} 的日记中记录：${entry.title}。${entry.content}`, keywords: entry.tags, importance: entry.isPrivate ? 4 : 3 }],
  });
  diary.markMemorySaved(entry.id);
  notice.value = '已加入长期记忆。';
}

function previewText(entry) {
  if (entry.isPrivate && !unlockedIds.value.has(entry.id)) return '这是一篇上锁的私密日记。';
  return (entry.happenedToday || entry.content || '没有正文').slice(0, 64);
}

function dayOfDate(value) {
  return String(value || '').slice(-2) || '--';
}

function monthOfDate(value) {
  const parts = String(value || '').split('-');
  return parts.length >= 2 ? `${parts[1]}月` : '';
}
</script>

<style scoped>
.diary-app { position:absolute; inset:0; z-index:20; overflow:hidden; border-radius:40px; background:#f6efe3; color:#263248; font-family:inherit; animation:diary-in .32s cubic-bezier(.2,.9,.2,1) both; }
.diary-app::before { content:""; position:absolute; inset:-80px -60px auto auto; width:180px; height:180px; border-radius:50%; background:rgba(243,213,138,.32); filter:blur(2px); animation:soft-float 6s ease-in-out infinite; pointer-events:none; }
button, input, textarea, select { font-family:inherit; }
button { border:none; cursor:pointer; }
button:disabled { opacity:.5; cursor:not-allowed; }
.diary-top { display:grid; grid-template-columns:64px minmax(0,1fr) 70px; align-items:center; gap:8px; padding:54px 16px 10px; color:#6f4e37; }
.diary-top div { text-align:center; }
.diary-top span { display:block; color:#a9584f; font-size:11px; letter-spacing:1.5px; text-transform:uppercase; }
.diary-top h1 { margin:2px 0 0; color:#263248; font-size:28px; }
.plain-btn { height:32px; border-radius:16px; background:#fffaf0; color:#6f4e37; font-size:12px; font-weight:800; box-shadow:0 4px 12px rgba(111,78,55,.12); transition:transform .18s ease, box-shadow .18s ease, background .18s ease; }
.plain-btn:active, .today-actions button:active, .draft-card button:active, .detail-tools button:active, .comment-create button:active, .editor-actions button:active, .lock-actions button:active { transform:scale(.97); }
.plain-btn.primary, .primary { background:#a9584f; color:#fffaf0; }
.diary-body { position:absolute; inset:112px 0 0; overflow-y:auto; padding:12px 14px 34px; }
.diary-body::-webkit-scrollbar { width:0; }
.paper-card, .entry-card, .detail-paper, .editor-paper { border:1px solid #e0cfb4; border-radius:24px; background:#fffaf0; box-shadow:0 14px 30px rgba(111,78,55,.14); }
.paper-card { animation:paper-rise .34s cubic-bezier(.2,.9,.2,1) both; }
.today-card { display:grid; grid-template-columns:minmax(0,1fr) 82px; gap:10px; padding:16px; }
.today-card span, .section-title span { color:#9b7b5e; font-size:11px; }
.today-card strong, .section-title strong { display:block; color:#6f4e37; font-size:17px; }
.today-card p { margin:8px 0 0; color:#6b6070; font-size:12px; line-height:1.55; }
.today-actions { display:flex; flex-direction:column; gap:8px; }
.today-actions button, .draft-card button, .detail-tools button, .comment-create button, .editor-actions button, .lock-actions button { padding:8px 10px; border-radius:14px; background:#f3d58a; color:#6f4e37; font-size:11px; font-weight:800; }
.notice-card { margin-top:10px; padding:10px 12px; border-radius:18px; background:#ead8bc; color:#6f4e37; font-size:12px; line-height:1.5; animation:notice-drop .26s cubic-bezier(.2,.9,.2,1) both; }
.draft-card { margin-top:12px; padding:14px; }
.section-title { display:flex; align-items:flex-end; justify-content:space-between; gap:10px; margin-bottom:10px; }
select, input, textarea { width:100%; border:1px solid #e0cfb4; outline:none; border-radius:15px; background:#fffdf8; color:#263248; font-size:12px; transition:border-color .18s ease, box-shadow .18s ease, background .18s ease; }
select:focus, input:focus, textarea:focus { border-color:#a9584f; box-shadow:0 0 0 3px rgba(169,88,79,.12); background:#fffaf0; }
select, input { height:36px; padding:0 10px; }
textarea { resize:none; padding:10px; line-height:1.55; }
.draft-card button { width:100%; margin-top:8px; }
.entry-list { display:flex; flex-direction:column; gap:10px; margin-top:12px; }
.entry-card { display:grid; grid-template-columns:54px minmax(0,1fr); gap:10px; padding:12px; cursor:pointer; transition:transform .18s ease, box-shadow .18s ease, background .18s ease; animation:entry-float-in .32s cubic-bezier(.2,.9,.2,1) both; }
.entry-card:nth-child(2) { animation-delay:.035s; }
.entry-card:nth-child(3) { animation-delay:.07s; }
.entry-card:nth-child(4) { animation-delay:.105s; }
.entry-card:nth-child(n+5) { animation-delay:.14s; }
.entry-card:hover { transform:translateY(-2px); box-shadow:0 18px 34px rgba(111,78,55,.18); }
.entry-card:active { transform:scale(.985); }
.entry-card.private { background:#f8f0dd; }
.entry-date { display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:18px; background:#f1e3ca; color:#6f4e37; transition:transform .22s ease; }
.entry-card:hover .entry-date { transform:rotate(-2deg) scale(1.03); }
.entry-date strong { font-size:22px; line-height:1; }
.entry-date span { margin-top:4px; font-size:11px; }
.entry-line { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.entry-line strong { font-size:15px; }
.entry-line em { padding:3px 7px; border-radius:999px; background:#a9584f; color:#fffaf0; font-size:10px; font-style:normal; }
.entry-main p { margin:7px 0; color:#71616a; font-size:12px; line-height:1.45; }
.tag-row { display:flex; flex-wrap:wrap; gap:6px; }
.tag-row span { padding:4px 8px; border-radius:999px; background:#f3d58a; color:#6f4e37; font-size:10px; }
.empty-state, .empty-small { padding:18px; border-radius:20px; background:#ead8bc; color:#9b7b5e; text-align:center; font-size:12px; }
.detail-paper { padding:18px; background-color:#fffaf0; background-image:repeating-linear-gradient(to bottom, transparent 0, transparent 27px, rgba(155,123,94,.18) 28px); animation:paper-unfold .36s cubic-bezier(.2,.9,.2,1) both; transform-origin:50% 0; }
.detail-meta { display:flex; justify-content:space-between; gap:8px; color:#9b7b5e; font-size:11px; }
.detail-paper h2 { margin:14px 0 10px; color:#263248; font-size:23px; }
.happened { margin:0 0 12px; padding:10px; border-left:4px solid #a9584f; background:#f8f0dd; color:#6f4e37; font-size:12px; line-height:1.5; }
.detail-content { white-space:pre-wrap; color:#263248; font-size:14px; line-height:2; }
.detail-tags { margin-top:14px; }
.detail-tools { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:12px; padding:12px; }
.detail-tools .danger { background:#ead8bc; color:#a9584f; }
.comment-card { margin-top:12px; padding:14px; }
.comment-create { display:grid; grid-template-columns:minmax(0,1fr) 96px; gap:8px; }
.comment-note { margin-top:10px; padding:12px; border-radius:18px; background:#f3d58a; color:#6f4e37; transform:rotate(-.4deg); animation:note-peel .3s cubic-bezier(.2,.9,.2,1) both; transform-origin:18px 0; }
.comment-note:nth-of-type(even) { transform:rotate(.45deg); }
.comment-note strong { font-size:13px; }
.comment-note p { margin:6px 0 0; color:#263248; font-size:12px; line-height:1.5; }
.editor-paper { padding:14px; animation:editor-slide .34s cubic-bezier(.2,.9,.2,1) both; }
.editor-paper label { display:flex; flex-direction:column; gap:6px; margin-bottom:10px; color:#6f4e37; font-size:12px; font-weight:800; }
.two-cols { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.content-input { background-color:#fffdf8; background-image:repeating-linear-gradient(to bottom, transparent 0, transparent 27px, rgba(155,123,94,.18) 28px); line-height:28px; }
.switch-row { flex-direction:row !important; align-items:center; justify-content:space-between; padding:10px 0; }
.switch-row input { width:auto; height:auto; }
.editor-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.modal-layer { position:absolute; inset:0; z-index:40; display:flex; align-items:center; justify-content:center; padding:20px; background:rgba(38,50,72,.36); }
.lock-card { width:100%; padding:20px; border-radius:26px; background:#fffaf0; border:1px solid #e0cfb4; box-shadow:0 20px 45px rgba(38,50,72,.25); text-align:center; animation:lock-pop .24s cubic-bezier(.2,.9,.2,1) both; }
.lock-card span { color:#a9584f; font-size:11px; letter-spacing:1.4px; text-transform:uppercase; }
.lock-card h2 { margin:8px 0 14px; color:#6f4e37; }
.lock-card input { text-align:center; font-size:22px; letter-spacing:8px; }
.lock-card p { color:#9b7b5e; font-size:12px; }
.lock-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.modal-fade-enter-active, .modal-fade-leave-active { transition:opacity .2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity:0; }
.diary-view-enter-active, .diary-view-leave-active { transition:opacity .22s ease, transform .28s cubic-bezier(.2,.9,.2,1), filter .22s ease; }
.diary-view-enter-from { opacity:0; transform:translateX(18px) translateY(6px) scale(.985); filter:blur(2px); }
.diary-view-leave-to { opacity:0; transform:translateX(-14px) translateY(-4px) scale(.99); filter:blur(1px); }
@keyframes diary-in { from { opacity:0; transform:translateY(28px) scale(.96); } to { opacity:1; transform:none; } }
@keyframes soft-float { 0%,100% { transform:translate(0,0) scale(1); } 50% { transform:translate(-12px,18px) scale(1.08); } }
@keyframes paper-rise { from { opacity:0; transform:translateY(12px) scale(.985); } to { opacity:1; transform:none; } }
@keyframes notice-drop { from { opacity:0; transform:translateY(-8px) scale(.98); } to { opacity:1; transform:none; } }
@keyframes entry-float-in { from { opacity:0; transform:translateY(16px) rotate(.2deg) scale(.985); } to { opacity:1; transform:none; } }
@keyframes paper-unfold { from { opacity:0; transform:translateY(16px) rotateX(8deg) scale(.98); } to { opacity:1; transform:none; } }
@keyframes note-peel { from { opacity:0; transform:translateY(8px) rotate(-3deg) scale(.96); } to { opacity:1; transform:rotate(-.4deg); } }
@keyframes editor-slide { from { opacity:0; transform:translateY(18px) scale(.98); } to { opacity:1; transform:none; } }
@keyframes lock-pop { from { opacity:0; transform:translateY(14px) scale(.94); } to { opacity:1; transform:none; } }
</style>
