<template>
  <section class="browser-app">
    <header class="browser-top">
      <button class="text-btn" type="button" @click="$emit('close')">返回</button>
      <div class="browser-brand">
        <strong>Edge</strong>
        <span>{{ mode === 'ai' ? 'AI 搜索结果' : engineLabel }}</span>
      </div>
      <button class="round-btn" type="button" title="新标签页" @click="resetPage">+</button>
    </header>

    <main class="browser-body">
      <section class="address-card">
        <div class="mode-switch">
          <button type="button" :class="{ active: mode === 'ai' }" @click="mode = 'ai'">AI 搜索</button>
          <button type="button" :class="{ active: mode === 'real' }" @click="selectRealSearch">真实搜索 · {{ engineLabel }}</button>
        </div>

        <form ref="searchBoxEl" class="search-box" style="border:0!important;outline:0!important;box-shadow:none!important;" @submit.prevent="submitSearch">
          <span>⌕</span>
          <input ref="searchInputEl" v-model="keyword" style="all:unset!important;display:block!important;flex:1 1 auto!important;min-width:0!important;border:0!important;border-width:0!important;border-style:none!important;outline:0!important;box-shadow:none!important;background:transparent!important;background-color:transparent!important;background-image:none!important;appearance:none!important;-webkit-appearance:none!important;color:#111827!important;font:inherit!important;font-size:13px!important;" placeholder="搜索或输入网址" />
          <button type="submit" :disabled="loading || !keyword.trim()">{{ loading ? '搜索中' : '搜索' }}</button>
        </form>

      </section>

      <Transition name="fade-slide">
        <section v-if="notice" class="notice-card">{{ notice }}</section>
      </Transition>

      <section v-if="mode === 'real' && realSearch" class="real-panel panel-card">
        <span>真实搜索结果</span>
        <h1>{{ realSearch.keyword }}</h1>
        <p>{{ realSearch.source }} 返回 {{ realSearch.results.length }} 条结果。{{ realSearch.fallbackUsed ? '未配置或 API 不可用，已使用免配置来源。' : '真实搜索结果不支持分享到信息。' }}</p>
        <div v-if="realSearch.results.length" class="result-list real-list">
          <article v-for="(item, index) in realSearch.results" :key="item.url || index" class="result-card real-result-card">
            <div>
              <span>{{ compactUrl(item.url) }}</span>
              <strong>{{ item.title || '搜索结果' }}</strong>
              <p>{{ item.snippet || '暂无摘要' }}</p>
            </div>
            <button type="button" :disabled="!item.url" @click="openResult(item.url)">打开</button>
          </article>
        </div>
        <div v-else class="empty-real">没有返回搜索结果。</div>
      </section>

      <section v-else-if="mode === 'ai' && !aiResult && !loading" class="start-panel panel-card">
        <span>New tab</span>
        <h1>浏览器</h1>
        <p>使用设置 App 中的 API 生成搜索结果，或切换到真实搜索在小手机内显示百度、必应、谷歌 API 结果。</p>
      </section>

      <section v-if="mode === 'ai' && aiResult" class="ai-results">
        <div class="result-head panel-card">
          <span>AI 搜索</span>
          <h1>{{ aiResult.keyword }}</h1>
          <p>{{ aiResult.summary }}</p>
          <button type="button" :disabled="!shareTargets.length" @click="openShare(aiResult)">分享本次搜索</button>
        </div>

        <div v-if="aiResult.results.length" class="result-list">
          <article v-for="(item, index) in aiResult.results" :key="index" class="result-card">
            <div>
              <span>{{ compactUrl(item.url) }}</span>
              <strong>{{ item.title || '搜索结果' }}</strong>
              <p>{{ item.snippet || '暂无摘要' }}</p>
            </div>
            <button type="button" @click="openShare(item)">分享</button>
          </article>
        </div>

        <div v-if="aiResult.related.length" class="related-panel panel-card">
          <strong>相关搜索</strong>
          <button v-for="item in aiResult.related" :key="item" type="button" @click="searchRelated(item)">{{ item }}</button>
        </div>
      </section>
    </main>

    <Transition name="modal-fade">
      <div v-if="shareOpen" class="modal-mask">
        <section class="modal-card">
          <header>
            <h2>分享到信息</h2>
            <button type="button" @click="shareOpen = false">×</button>
          </header>
          <div v-if="shareTargets.length" class="share-list">
            <button v-for="target in shareTargets" :key="target.id" type="button" @click="shareTo(target)">
              <span class="target-avatar" :style="imageStyle(target.avatar)"><i v-if="!target.avatar">{{ target.avatarText || target.name.slice(0, 1) }}</i></span>
              <strong>{{ target.name }}</strong>
              <em>{{ target.type === 'group' ? '群聊' : '私聊' }}</em>
            </button>
          </div>
          <p v-else class="empty-share">暂无可分享的聊天。无 user 的群聊不会显示在这里。</p>
        </section>
      </div>
    </Transition>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { chatCompletion, useApiSettings } from '../composables/useApiSettings.js';
import { createMessageId, useMessageStore } from '../composables/useMessageStore.js';
import { searchWeb, useSearchApiSettings } from '../composables/useSearchApiSettings.js';

defineEmits(['close']);

const api = useApiSettings();
const searchApi = useSearchApiSettings();
const messageStore = useMessageStore();
const keyword = ref('');
const mode = ref('ai');
const engine = ref('bing');
const loading = ref(false);
const notice = ref('');
const aiResult = ref(null);
const realSearch = ref(null);
const shareOpen = ref(false);
const sharePayload = ref(null);
const searchBoxEl = ref(null);
const searchInputEl = ref(null);

const engines = [
  { id: 'baidu', name: '百度' },
  { id: 'bing', name: '必应' },
  { id: 'google', name: '谷歌' },
];

const engineLabel = computed(() => engines.find(item => item.id === engine.value)?.name || '真实搜索');
const shareTargets = computed(() => {
  const conversations = messageStore.sortedConversations.value
    .filter(item => item.type === 'private' || (item.type === 'group' && item.includeUser !== false));
  const privateRoleIds = new Set(conversations.filter(item => item.type === 'private').map(item => item.memberIds?.[0]).filter(Boolean));
  const missingPrivateRoles = messageStore.roles.value
    .filter(role => !privateRoleIds.has(role.id))
    .map(role => ({ id: `role_target_${role.id}`, type: 'private_role', name: role.name, avatar: role.avatar, avatarText: role.avatarText, role }));
  return [...conversations, ...missingPrivateRoles];
});

onMounted(() => {
  api.restore();
  searchApi.restore();
  removeSearchInputChrome(searchBoxEl.value, searchInputEl.value);
});

async function submitSearch() {
  const text = keyword.value.trim();
  if (!text) return;
  notice.value = '';
  if (mode.value === 'real') {
    await runRealSearch(text);
    return;
  }
  await runAiSearch(text);
}

function selectRealSearch() {
  if (mode.value !== 'real') {
    mode.value = 'real';
    return;
  }
  const index = engines.findIndex(item => item.id === engine.value);
  engine.value = engines[(index + 1) % engines.length].id;
}

async function runAiSearch(text) {
  api.restore();
  if (!api.endpoint.value.trim() || !api.apiKey.value.trim() || !api.model.value.trim()) {
    notice.value = '请先在设置 App 中配置 API 端点、密钥和模型。';
    return;
  }
  loading.value = true;
  realSearch.value = null;
  try {
    const response = await chatCompletion({
      endpoint: api.endpoint.value,
      key: api.apiKey.value,
      model: api.model.value,
      messages: [
        { role: 'system', content: '你是移动端浏览器搜索结果生成器。只返回 JSON，不要解释。JSON 字段：summary, results, related。results 最多 5 条，每条包含 title,url,snippet。' },
        { role: 'user', content: `请为这个搜索词生成仿搜索引擎结果页：${text}` },
      ],
      extra: { temperature: 0.65 },
    });
    const content = response.choices?.[0]?.message?.content || response.content || '';
    aiResult.value = normalizeAiResult(text, content);
  } catch (error) {
    notice.value = error.message || 'AI 搜索失败';
  } finally {
    loading.value = false;
  }
}

async function runRealSearch(text) {
  const selected = engines.find(item => item.id === engine.value) || engines[1];
  loading.value = true;
  aiResult.value = null;
  try {
    searchApi.restore();
    const response = await searchWeb({ engine: selected.id, keyword: text, settings: searchApi.snapshot() });
    realSearch.value = { keyword: text, engineName: selected.name, ...response };
  } catch (error) {
    realSearch.value = null;
    notice.value = error.message || '真实搜索失败';
  } finally {
    loading.value = false;
  }
}

function normalizeAiResult(text, content) {
  const parsed = parseAiJson(content);
  if (!parsed) {
    return { keyword: text, summary: String(content || '未生成摘要').trim(), results: [], related: [] };
  }
  const results = Array.isArray(parsed.results) ? parsed.results.slice(0, 6).map(item => ({
    title: String(item?.title || '搜索结果'),
    url: String(item?.url || ''),
    snippet: String(item?.snippet || ''),
  })) : [];
  return {
    keyword: text,
    summary: String(parsed.summary || 'AI 已生成搜索结果。'),
    results,
    related: Array.isArray(parsed.related) ? parsed.related.map(String).slice(0, 6) : [],
  };
}

function parseAiJson(content) {
  const raw = String(content || '').trim();
  const block = raw.match(/```json\s*([\s\S]*?)```/i) || raw.match(/```\s*([\s\S]*?)```/);
  const candidates = [block?.[1], raw, raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)].filter(Boolean);
  for (const item of candidates) {
    try { return JSON.parse(item); }
    catch {}
  }
  return null;
}

function openResult(url) {
  if (!url) return;
  window.open(url, '_blank');
}

function openShare(payload) {
  sharePayload.value = payload;
  shareOpen.value = true;
}

function shareTo(target) {
  if (!sharePayload.value) return;
  if (target.type === 'group' && target.includeUser === false) {
    notice.value = '不能分享到无 user 的群聊。';
    return;
  }
  const conversation = target.type === 'private_role' ? messageStore.createPrivateConversation(target.role) : target;
  messageStore.addMessage(conversation.id, {
    senderType: 'user',
    senderId: 'user',
    senderName: '我',
    senderAvatar: '',
    type: 'browser_ai_search_share',
    text: `分享了 AI 搜索：${aiResult.value?.keyword || keyword.value}`,
    browserSearch: buildShareData(sharePayload.value),
  });
  shareOpen.value = false;
}

function buildShareData(payload) {
  const isWholePage = payload === aiResult.value;
  return {
    id: createMessageId('browser_share'),
    keyword: aiResult.value?.keyword || keyword.value,
    summary: aiResult.value?.summary || '',
    resultTitle: isWholePage ? aiResult.value?.results?.[0]?.title || '整页 AI 搜索结果' : payload.title,
    resultUrl: isWholePage ? aiResult.value?.results?.[0]?.url || '' : payload.url,
    resultSnippet: isWholePage ? aiResult.value?.results?.[0]?.snippet || aiResult.value?.summary || '' : payload.snippet,
    results: isWholePage ? aiResult.value?.results?.slice(0, 3) || [] : [payload],
    sharedAt: Date.now(),
  };
}

function searchRelated(text) {
  keyword.value = text;
  runAiSearch(text);
}

function resetPage() {
  keyword.value = '';
  notice.value = '';
  aiResult.value = null;
  realSearch.value = null;
}

function compactUrl(url) {
  return String(url || 'ai.generated').replace(/^https?:\/\//, '').slice(0, 42);
}

function imageStyle(url) {
  return url ? { backgroundImage: `url('${url}')` } : null;
}

function removeSearchInputChrome(shell, input) {
  [shell, input].filter(Boolean).forEach(element => {
    ['border', 'border-width', 'border-style', 'outline', 'box-shadow'].forEach(property => element.style.setProperty(property, property === 'border-style' || property === 'box-shadow' ? 'none' : '0', 'important'));
  });
  if (input) {
    input.style.setProperty('all', 'unset', 'important');
    input.style.setProperty('display', 'block', 'important');
    input.style.setProperty('flex', '1 1 auto', 'important');
    input.style.setProperty('min-width', '0', 'important');
    input.style.setProperty('font', 'inherit', 'important');
    ['background', 'background-color', 'background-image'].forEach(property => input.style.setProperty(property, property === 'background-image' ? 'none' : 'transparent', 'important'));
    input.style.setProperty('appearance', 'none', 'important');
    input.style.setProperty('-webkit-appearance', 'none', 'important');
  }
}
</script>

<style scoped>
.browser-app { position:absolute; inset:0; z-index:18; overflow:hidden; border-radius:40px; background:#f5f6f8; color:#15171a; font-family:inherit; animation:browser-in .32s cubic-bezier(.2,.9,.2,1) both; }
button { border:none; cursor:pointer; font-family:inherit; }
button:disabled { cursor:not-allowed; opacity:.48; }
.browser-top { position:relative; z-index:5; display:grid; grid-template-columns:62px minmax(0,1fr) 62px; align-items:center; margin-top:54px; padding:0 15px 12px; background:#fff; border-bottom:1px solid #e7e9ee; }
.text-btn { height:32px; border-radius:16px; background:#f0f2f5; color:#24272d; font-size:13px; }
.round-btn { justify-self:end; width:34px; height:34px; border-radius:17px; background:#111827; color:#fff; font-size:21px; line-height:1; }
.browser-brand { min-width:0; text-align:center; display:flex; flex-direction:column; gap:2px; }
.browser-brand strong { font-size:21px; letter-spacing:.2px; }
.browser-brand span { color:#737985; font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.browser-body { position:absolute; inset:110px 0 0; overflow-y:auto; padding:12px 12px 30px; }
.browser-body::-webkit-scrollbar { width:0; }
.address-card, .panel-card, .result-card { background:#fff; border:1px solid #e6e9ef; box-shadow:0 8px 20px rgba(18,24,40,.05); }
.address-card { padding:10px; border-radius:24px; }
.mode-switch { display:grid; grid-template-columns:1fr 1fr; gap:6px; padding:4px; border-radius:18px; background:#f0f2f5; }
.mode-switch button { height:30px; border-radius:15px; background:transparent; color:#656b75; font-size:12px; font-weight:750; }
.mode-switch button.active { background:#fff; color:#111827; box-shadow:0 3px 10px rgba(17,24,39,.08); }
.search-box { display:flex; align-items:center; gap:8px; height:44px; margin-top:10px; padding:0 8px 0 13px; border-radius:22px; background:#f7f8fa; border:0 !important; outline:0 !important; box-shadow:none !important; }
.search-box:focus-within { border:0 !important; outline:0 !important; box-shadow:none !important; }
.search-box span { color:#8a9099; font-weight:900; }
.search-box input, .search-box input:hover, .search-box input:focus, .search-box input:focus-visible, .search-box input:active { all:unset !important; display:block !important; flex:1 1 auto !important; min-width:0 !important; border:0 !important; border-width:0 !important; border-style:none !important; outline:0 !important; box-shadow:none !important; background:transparent !important; background-color:transparent !important; background-image:none !important; color:#111827 !important; font:inherit !important; font-size:13px !important; appearance:none !important; -webkit-appearance:none !important; }
.search-box button, .result-head button, .real-panel button { height:30px; padding:0 12px; border-radius:15px; background:#111827; color:#fff; font-size:12px; font-weight:800; }
.notice-card { margin-top:10px; padding:10px 12px; border-radius:16px; background:#fff5f2; color:#9d2b1f; border:1px solid #ffd8cf; font-size:12px; line-height:1.45; }
.panel-card { margin-top:12px; padding:14px; border-radius:24px; }
.start-panel span, .real-panel span, .result-head span { color:#6b7280; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.5px; }
.start-panel h1, .real-panel h1, .result-head h1 { margin:5px 0 7px; font-size:24px; line-height:1.15; }
.start-panel p, .real-panel p, .result-head p { margin:0; color:#5e6470; font-size:12px; line-height:1.55; }
.result-head { display:grid; gap:8px; }
.result-head button { justify-self:start; }
.result-list { display:flex; flex-direction:column; gap:9px; margin-top:10px; }
.result-card { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; align-items:start; padding:13px; border-radius:20px; }
.result-card span { color:#0b6f72; font-size:10px; word-break:break-all; }
.result-card strong { display:block; margin:5px 0; color:#172554; font-size:15px; line-height:1.3; }
.result-card p { margin:0; color:#555d6b; font-size:12px; line-height:1.45; }
.result-card button { padding:7px 10px; border-radius:13px; background:#eef2f7; color:#111827; font-size:11px; font-weight:800; }
.real-list { margin-top:12px; }
.real-result-card { box-shadow:none; background:#f9fafb; }
.empty-real { margin-top:12px; padding:18px; border-radius:18px; background:#f7f8fa; color:#737985; text-align:center; font-size:12px; }
.related-panel { display:flex; flex-wrap:wrap; gap:7px; align-items:center; }
.related-panel strong { width:100%; font-size:15px; }
.related-panel button { padding:7px 10px; border-radius:14px; background:#f0f2f5; color:#2f3642; font-size:12px; }
.modal-mask { position:absolute; inset:0; z-index:20; display:flex; align-items:center; justify-content:center; padding:20px; background:rgba(0,0,0,.36); }
.modal-card { width:100%; max-height:76%; overflow-y:auto; padding:16px; border-radius:24px; background:#fff; color:#171717; box-shadow:0 18px 42px rgba(0,0,0,.22); }
.modal-card header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.modal-card h2 { margin:0; font-size:18px; }
.modal-card header button { width:30px; height:30px; border-radius:15px; background:#f1f2f4; }
.share-list { display:flex; flex-direction:column; gap:8px; }
.share-list button { display:grid; grid-template-columns:38px minmax(0,1fr) auto; align-items:center; gap:9px; padding:9px; border-radius:16px; background:#f6f7f9; color:#151515; text-align:left; }
.target-avatar { width:38px; height:38px; border-radius:14px; background:#111827; color:#fff; display:flex; align-items:center; justify-content:center; background-size:cover; background-position:center; font-weight:850; }
.target-avatar i, .share-list em { font-style:normal; }
.share-list strong { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:14px; }
.share-list em { color:#5b6472; font-size:11px; }
.empty-share { padding:18px; border-radius:18px; background:#f6f7f9; color:#737985; text-align:center; font-size:12px; line-height:1.5; }
.fade-slide-enter-active, .fade-slide-leave-active, .modal-fade-enter-active, .modal-fade-leave-active { transition:opacity .22s ease, transform .24s cubic-bezier(.2,.9,.2,1); }
.fade-slide-enter-from, .fade-slide-leave-to { opacity:0; transform:translateY(-8px); }
.modal-fade-enter-from, .modal-fade-leave-to { opacity:0; transform:scale(.985); }
@keyframes browser-in { from { opacity:0; transform:translateY(28px) scale(.96); } to { opacity:1; transform:none; } }
</style>
