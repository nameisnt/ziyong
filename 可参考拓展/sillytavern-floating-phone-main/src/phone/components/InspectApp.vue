<template>
  <section class="inspect-app">
    <header class="inspect-top">
      <button class="soft-btn" type="button" @click="currentOptionId ? currentOptionId = '' : $emit('close')">返回</button>
      <h1>{{ currentOption ? currentOption.name : '查岗' }}</h1>
      <button class="soft-btn" type="button" @click="clearInspect">清空</button>
    </header>

    <Transition name="inspect-page" mode="out-in">
    <main v-if="!currentOption" key="list" class="inspect-body">
      <section class="privacy-card">查岗结果仅可以转发给角色本人，这是为了保护角色隐私。</section>

      <section class="target-card">
        <div class="avatar" :style="avatarStyle(selectedRole?.avatar)"><span v-if="!selectedRole?.avatar">{{ selectedRole?.name?.slice(0, 1) || '查' }}</span></div>
        <label>
          <span>查岗对象</span>
          <select v-model="selectedRoleId">
            <option value="">请选择角色</option>
            <option v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}</option>
          </select>
        </label>
      </section>

      <section v-for="group in optionGroups" :key="group.name" class="settings-section">
        <h2>{{ group.name }}</h2>
        <div class="settings-list">
          <button v-for="(option, index) in group.items" :key="option.id" type="button" class="settings-row" :style="staggerStyle(index)" @click="openOption(option.id)">
            <div>
              <strong>{{ option.name }}</strong>
              <span>{{ option.description }}</span>
            </div>
            <em v-if="hasResult(option.id)">已查</em>
            <b>›</b>
          </button>
        </div>
      </section>

      <Transition name="notice-pop"><div v-if="notice" class="notice-card">{{ notice }}</div></Transition>
    </main>

    <main v-else key="detail" class="inspect-body detail-page">
      <section class="privacy-card">查岗结果仅可以转发给角色本人，这是为了保护角色隐私。</section>
      <section class="single-head">
        <div>
          <span>{{ selectedRole?.name || '未选择角色' }}</span>
          <strong>{{ currentOption.name }}</strong>
          <p>{{ currentOption.description }}</p>
        </div>
        <button type="button" :disabled="!selectedRole || loading" @click="runInspect(currentOption.id)">{{ loading ? '查岗中...' : '开始查岗' }}</button>
      </section>

      <Transition name="notice-pop"><div v-if="notice" class="notice-card">{{ notice }}</div></Transition>

      <Transition name="result-rise" mode="out-in">
      <section v-if="currentItemResult" class="single-result">
        <div class="single-actions">
          <span>{{ formatTime(result.createdAt) }}</span>
          <button type="button" @click="forwardToRole(currentOption.id)">转发给本人</button>
        </div>
        <InspectResultDetail :result="singleResult" :initial-item-id="currentOption.id" />
      </section>
      <section v-else class="empty-state">还没有生成「{{ currentOption.name }}」。点击开始查岗后查看。</section>
      </Transition>
    </main>
    </Transition>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import InspectResultDetail from './InspectResultDetail.vue';
import { createInspectId, useInspectStore } from '../composables/useInspectStore.js';
import { useInspectAi } from '../composables/useInspectAi.js';
import { useMessageStore } from '../composables/useMessageStore.js';

defineEmits(['close']);

const inspect = useInspectStore();
const messageStore = useMessageStore();
const ai = useInspectAi();
const { roles } = messageStore;
const selectedRoleId = ref('');
const currentOptionId = ref('');
const loading = ref(false);
const notice = ref('');

const result = computed(() => inspect.state.result);
const selectedRole = computed(() => roles.value.find(role => role.id === selectedRoleId.value) || null);
const options = inspect.options;
const currentOption = computed(() => options.find(option => option.id === currentOptionId.value) || null);
const currentItemResult = computed(() => result.value?.items?.[currentOptionId.value] || null);
const singleResult = computed(() => {
  if (!result.value || !currentItemResult.value) return null;
  return { ...result.value, selectedItemIds: [currentOptionId.value], items: { [currentOptionId.value]: currentItemResult.value } };
});
const optionGroups = computed(() => {
  const groups = [];
  options.forEach(option => {
    let group = groups.find(item => item.name === option.group);
    if (!group) {
      group = { name: option.group, items: [] };
      groups.push(group);
    }
    group.items.push(option);
  });
  return groups;
});

onMounted(() => {
  if (result.value?.roleId) selectedRoleId.value = result.value.roleId;
});

function openOption(id) {
  if (!selectedRole.value) {
    alert('请先选择查岗对象。');
    return;
  }
  currentOptionId.value = id;
  notice.value = '';
}

async function runInspect(optionId) {
  if (!selectedRole.value || !optionId) return;
  loading.value = true;
  notice.value = '';
  try {
    const conversation = messageStore.conversations.value.find(item => item.type === 'private' && item.memberIds?.[0] === selectedRole.value.id) || null;
    const messages = conversation ? (messageStore.messages.value[conversation.id] || []) : [];
    const generated = await ai.generateInspect({ role: selectedRole.value, selectedIds: [optionId], conversation, messages, roleAppData: loadRoleAppData() });
    inspect.setResult(mergeResult(generated, optionId));
  } finally {
    loading.value = false;
  }
}

function mergeResult(generated, optionId) {
  const base = result.value?.roleId === generated.roleId ? result.value : null;
  const itemIds = new Set([...(base?.selectedItemIds || []), optionId]);
  return {
    id: base?.id || createInspectId(),
    roleId: generated.roleId,
    roleName: generated.roleName,
    roleAvatar: generated.roleAvatar,
    selectedItemIds: [...itemIds],
    createdAt: Date.now(),
    summary: `${generated.roleName} 的查岗记录`,
    mood: '',
    items: { ...(base?.items || {}), [optionId]: generated.items[optionId] },
  };
}

function clearInspect() {
  inspect.clearResult();
  notice.value = '查岗结果已清空。';
}

function forwardToRole(optionId) {
  if (!singleResult.value || !selectedRole.value) return;
  const conversation = messageStore.createPrivateConversation(selectedRole.value);
  messageStore.addMessage(conversation.id, {
    senderType: 'user',
    senderId: 'user',
    senderName: '我',
    type: 'inspect_share',
    inspect: singleResult.value,
    status: 'sent',
  });
  notice.value = `已转发「${optionName(optionId)}」给 ${selectedRole.value.name}`;
}

function hasResult(id) {
  return Boolean(result.value?.items?.[id]);
}

function optionName(id) {
  return options.find(option => option.id === id)?.name || id;
}

function loadRoleAppData() {
  try { return JSON.parse(localStorage.getItem('phone_role_app_selection_v1') || 'null') || {}; }
  catch { return {}; }
}

function avatarStyle(url) {
  return url ? { backgroundImage: `url('${url}')` } : null;
}

function formatTime(value) {
  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
}

function staggerStyle(index) {
  return { '--stagger': `${Math.min(index, 8) * 22}ms` };
}
</script>

<style scoped>
.inspect-app { position:absolute; inset:0; z-index:20; overflow:hidden; border-radius:40px; background:#f4f2ee; color:#111; font-family:inherit; animation:inspect-in .32s cubic-bezier(.2,.9,.2,1) both; }
button, select { font-family:inherit; }
button { border:none; cursor:pointer; }
button:disabled { opacity:.45; cursor:not-allowed; }
.inspect-top { display:grid; grid-template-columns:62px minmax(0,1fr) 62px; align-items:center; gap:10px; padding:54px 16px 12px; }
.inspect-top h1 { margin:0; text-align:center; font-size:26px; }
.soft-btn { height:32px; border-radius:16px; background:#fff; color:#333; box-shadow:0 8px 18px rgba(0,0,0,.08); font-size:12px; }
.inspect-body { position:absolute; inset:112px 0 0; overflow-y:auto; padding:12px 14px 34px; }
.inspect-body::-webkit-scrollbar { width:0; }
.privacy-card, .target-card, .settings-list, .single-head, .single-result, .notice-card, .empty-state { border:1px solid #e3e0d9; border-radius:22px; background:#fff; box-shadow:0 12px 28px rgba(0,0,0,.06); }
.privacy-card { padding:12px 14px; color:#8a463d; background:#fff8f6; font-size:12px; line-height:1.5; animation:inspect-card-in .32s .03s cubic-bezier(.2,.9,.2,1) both; }
.target-card { display:grid; grid-template-columns:54px minmax(0,1fr); gap:12px; align-items:center; margin-top:12px; padding:14px; animation:inspect-card-in .32s .08s cubic-bezier(.2,.9,.2,1) both; }
.avatar { width:54px; height:54px; display:grid; place-items:center; border-radius:16px; background:#111; background-size:cover; background-position:center; color:#fff; font-weight:900; font-size:22px; }
.target-card label { min-width:0; color:#777; font-size:11px; }
.target-card span { display:block; margin-bottom:6px; }
.target-card select { width:100%; height:36px; border:1px solid #ddd; outline:none; border-radius:13px; padding:0 10px; background:#fafafa; color:#111; }
.settings-section { margin-top:18px; animation:inspect-card-in .34s .12s cubic-bezier(.2,.9,.2,1) both; }
.settings-section h2 { margin:0 4px 7px; color:#8a8a8f; font-size:12px; font-weight:700; }
.settings-list { overflow:hidden; }
.settings-row { width:100%; min-height:52px; display:grid; grid-template-columns:minmax(0,1fr) auto auto; align-items:center; gap:8px; padding:10px 12px; background:#fff; color:#111; text-align:left; border-bottom:1px solid #efefef; animation:inspect-row-in .28s cubic-bezier(.2,.9,.2,1) both; animation-delay:var(--stagger, 0ms); }
.settings-row:last-child { border-bottom:0; }
.settings-row strong { display:block; font-size:14px; }
.settings-row span { display:block; margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#8a8a8f; font-size:11px; }
.settings-row em { padding:3px 7px; border-radius:999px; background:#eef7ee; color:#377b42; font-style:normal; font-size:10px; }
.settings-row b { color:#b5b5ba; font-size:22px; font-weight:400; }
.detail-page { padding-bottom:26px; }
.single-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:12px; padding:14px; animation:inspect-card-in .32s .08s cubic-bezier(.2,.9,.2,1) both; }
.single-head span { color:#8a8a8f; font-size:11px; }
.single-head strong { display:block; margin-top:3px; font-size:20px; }
.single-head p { margin:5px 0 0; color:#666; font-size:12px; line-height:1.4; }
.single-head button { flex:0 0 auto; height:34px; padding:0 12px; border-radius:15px; background:#111; color:#fff; font-size:12px; font-weight:800; }
.notice-card { margin-top:10px; padding:10px 12px; color:#765a35; font-size:12px; }
.single-result { margin-top:12px; padding:12px; }
.single-actions { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px; }
.single-actions span { color:#8a8a8f; font-size:11px; }
.single-actions button { padding:8px 10px; border-radius:13px; background:#111; color:#fff; font-size:11px; font-weight:800; }
.empty-state { margin-top:12px; padding:24px 12px; color:#8a8a8f; text-align:center; font-size:12px; }
@keyframes inspect-in { from { opacity:0; transform:translateY(28px) scale(.96); } to { opacity:1; transform:none; } }
@keyframes inspect-card-in { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
@keyframes inspect-row-in { from { opacity:0; transform:translateX(12px); } to { opacity:1; transform:none; } }
.inspect-page-enter-active, .inspect-page-leave-active { transition:opacity .22s ease, transform .26s cubic-bezier(.2,.9,.2,1); }
.inspect-page-enter-from { opacity:0; transform:translateX(24px); }
.inspect-page-leave-to { opacity:0; transform:translateX(-18px); }
.notice-pop-enter-active, .notice-pop-leave-active, .result-rise-enter-active, .result-rise-leave-active { transition:opacity .2s ease, transform .24s cubic-bezier(.2,.9,.2,1); }
.notice-pop-enter-from, .notice-pop-leave-to, .result-rise-enter-from, .result-rise-leave-to { opacity:0; transform:translateY(10px); }
</style>
