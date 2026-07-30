<template>
  <section class="theater-app">
    <header class="theater-top">
      <button class="ghost-btn" type="button" @click="$emit('close')">返回</button>
      <div class="theater-title">
        <h1>小剧场</h1>
      </div>
      <button class="ghost-btn" type="button" @click="resetForm">重置</button>
    </header>

    <nav class="theater-tabs" aria-label="小剧场页面">
      <button type="button" :class="{ active: tab === 'create' }" @click="tab = 'create'">制作</button>
      <button type="button" :class="{ active: tab === 'preview' }" @click="tab = 'preview'">预览</button>
      <button type="button" :class="{ active: tab === 'code' }" @click="tab = 'code'">代码</button>
    </nav>

    <main class="theater-body">
      <section v-if="tab === 'create'" class="create-panel">
        <section class="stage-card intro-card">
          <span class="ticket-mark">Tonight</span>
          <h2>制作一个手机里的 HTML 小剧场</h2>
          <p>输入角色、关系和氛围，让 AI 生成可观看、可点击、带戏剧感的轻量前端小组件。</p>
        </section>

        <section class="form-card">
          <label>
            <span>主题</span>
            <input v-model="form.topic" placeholder="例如：雨夜便利店里迟到的告白" />
          </label>
          <label>
            <span>主要角色</span>
            <textarea v-model="form.roles" rows="3" placeholder="例如：冷淡店员、失忆顾客、总在零点出现的猫"></textarea>
          </label>
          <label>
            <span>User 身份或视角</span>
            <input v-model="form.userView" placeholder="例如：旁观者、当事人、手机主人、群聊潜水者" />
          </label>
        </section>

        <section class="choice-card">
          <div class="choice-head">
            <strong>剧情风格</strong>
            <span>{{ form.style }}</span>
          </div>
          <div class="chip-list">
            <button v-for="item in styleOptions" :key="item" type="button" :class="{ active: form.style === item }" @click="form.style = item">{{ item }}</button>
          </div>
        </section>

        <section class="choice-card">
          <div class="choice-head">
            <strong>展示形式</strong>
            <span>{{ form.format }}</span>
          </div>
          <div class="chip-list">
            <button v-for="item in formatOptions" :key="item" type="button" :class="{ active: form.format === item }" @click="form.format = item">{{ item }}</button>
          </div>
        </section>

        <section class="form-card">
          <label>
            <span>氛围关键词</span>
            <input v-model="form.mood" placeholder="例如：霓虹、潮湿、秘密、倒计时、旧短信" />
          </label>
          <label>
            <span>特殊要求</span>
            <textarea v-model="form.requirement" rows="4" placeholder="例如：要有三个可点击线索；结尾反转；不要太长；像手机截图一样"></textarea>
          </label>
        </section>

        <Transition name="notice-slide">
          <p v-if="notice" class="notice-card">{{ notice }}</p>
        </Transition>

        <button class="generate-btn" type="button" :disabled="loading" @click="generateTheater">
          <span>{{ loading ? '舞台搭建中...' : '生成小剧场' }}</span>
          <i>{{ loading ? 'AI' : 'Curtain up' }}</i>
        </button>
      </section>

      <section v-else-if="tab === 'preview'" class="preview-panel">
        <section v-if="currentTheater" class="result-head stage-card">
          <span>Preview Stage</span>
          <h2>{{ currentTheater.title }}</h2>
          <p>{{ currentTheater.summary }}</p>
        </section>
        <div v-if="currentTheater" class="preview-shell">
          <iframe class="theater-preview-frame" title="小剧场预览" :srcdoc="previewSrcdoc" sandbox="allow-scripts"></iframe>
        </div>
        <section v-else class="empty-preview stage-card">
          <h2>暂无可预览的小剧场</h2>
          <p>请先在“制作”页生成小剧场，生成成功后这里才会显示预览。</p>
        </section>
      </section>

      <section v-else class="code-panel">
        <section v-if="currentTheater" class="result-head stage-card">
          <span>Source Code</span>
          <h2>{{ currentTheater.title }}</h2>
          <p>可以复制生成的 HTML 片段，放到轻量网页环境里继续修改。</p>
        </section>
        <div v-if="currentTheater" class="code-actions">
          <button type="button" @click="copyCode">复制代码</button>
          <button type="button" :disabled="loading" @click="generateTheater">重新生成</button>
        </div>
        <pre v-if="currentTheater" class="code-box"><code>{{ fullCode }}</code></pre>
        <section v-else class="empty-preview stage-card">
          <h2>暂无代码</h2>
          <p>请先生成小剧场，生成成功后这里才会显示对应代码。</p>
        </section>
      </section>
    </main>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { chatCompletion, useApiSettings } from '../composables/useApiSettings.js';

defineEmits(['close']);

const api = useApiSettings();
const tab = ref('create');
const loading = ref(false);
const notice = ref('');
const theater = ref(null);

const styleOptions = ['暧昧拉扯', '悬疑反转', '赛博怪谈', '甜虐短剧', '论坛吃瓜', '伪系统通知', '童话黑化', '末日留言'];
const formatOptions = ['聊天记录剧场', '朋友圈截图', '档案卡片', '弹窗事件', '视觉小说', '倒计时任务', '手机备忘录', '群聊直播'];

const form = reactive({
  topic: '',
  roles: '',
  userView: '',
  style: styleOptions[0],
  format: formatOptions[0],
  mood: '',
  requirement: '',
});

const currentTheater = computed(() => theater.value);
const fullCode = computed(() => currentTheater.value ? [currentTheater.value.html, `<style>\n${currentTheater.value.css}\n</style>`, currentTheater.value.js ? `<script>\n${currentTheater.value.js}\n<\/script>` : ''].filter(Boolean).join('\n\n') : '');
const previewSrcdoc = computed(() => currentTheater.value ? buildSrcdoc(currentTheater.value) : '');

onMounted(() => {
  api.restore();
});

function resetForm() {
  form.topic = '';
  form.roles = '';
  form.userView = '';
  form.style = styleOptions[0];
  form.format = formatOptions[0];
  form.mood = '';
  form.requirement = '';
  notice.value = '';
}

async function generateTheater() {
  api.restore();
  notice.value = '';
  if (!api.endpoint.value.trim() || !api.apiKey.value.trim() || !api.model.value.trim()) {
    notice.value = '请先在设置 App 中配置 API 端点、密钥和模型。';
    return;
  }
  loading.value = true;
  try {
    const response = await chatCompletion({
      endpoint: api.endpoint.value,
      key: api.apiKey.value,
      model: api.model.value,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt() },
      ],
      extra: { temperature: 0.86 },
    });
    const content = response?.choices?.[0]?.message?.content || response?.message?.content || response?.content || '';
    theater.value = normalizeTheater(content);
    tab.value = 'preview';
  } catch (error) {
    notice.value = error.message || '小剧场生成失败';
  } finally {
    loading.value = false;
  }
}

function buildSystemPrompt() {
  return `你是一个移动端 HTML 小剧场生成器。你只返回合法 JSON，不要 Markdown，不要解释。
你的任务是生成轻量、可嵌入、适合手机端观看的角色扮演小剧场。
返回格式：{"title":"标题","summary":"一句话简介","html":"HTML 片段","css":"CSS 代码","js":"原生 JS 代码，可为空"}
硬性规则：
1. 只使用 HTML、CSS、原生 JavaScript。
2. 禁止 Tailwind。
3. 禁止外部库。
4. 禁止远程 script。
5. 不要引入 Vue、React 或任何框架。
6. 所有 class 名使用 theater-piece- 前缀。
7. 最外层必须是一个 wrapper，例如 <section class="theater-piece-wrapper">。
8. 最外层 wrapper 必须有明确 min-height，例如 min-height: 600px;。
9. 最外层不得使用 vh、dvh、100% 高度。
10. 禁止用 absolute 作为主要布局支撑。若使用 absolute，父容器必须有明确尺寸，且主体内容必须由正常文档流撑开。
11. 禁止在最外层设置 overflow:hidden。
12. 禁止 overscroll-behavior:none。
13. 用 padding 代替最外层 margin。
14. JS 只允许做轻量交互：tab 切换、展开收起、点击变更状态、播放文字动画。
15. 禁止 localStorage、sessionStorage、cookie、fetch、XMLHttpRequest、WebSocket、eval、new Function、import。
16. 不要输出 html、head、body 外壳，只输出可嵌入片段。
17. 内容要有角色扮演感、戏剧性、文本装饰、移动端信息密度。`;
}

function buildUserPrompt() {
  return `请根据以下条件制作一个 HTML 小剧场：

主题：${form.topic || '未指定'}
主要角色：${form.roles || '未指定'}
user 身份：${form.userView || '未指定'}
剧情风格：${form.style}
展示形式：${form.format}
氛围关键词：${form.mood || '未指定'}
特殊要求：${form.requirement || '未指定'}

请生成适合手机端观看的 HTML 小剧场。必须遵守 system 中的所有编码红线。`;
}

function normalizeTheater(content) {
  const parsed = parseAiJson(content);
  if (!parsed) throw new Error('AI 返回内容不是合法 JSON，请重新生成。');
  const code = typeof parsed.code === 'string' ? splitCode(parsed.code) : null;
  return sanitizeTheater({
    title: String(parsed.title || code?.title || '未命名小剧场'),
    summary: String(parsed.summary || 'AI 已生成小剧场。'),
    html: String(parsed.html || code?.html || ''),
    css: String(parsed.css || code?.css || ''),
    js: String(parsed.js || code?.js || ''),
  });
}

function parseAiJson(content) {
  const raw = String(content || '').trim();
  const block = raw.match(/```json\s*([\s\S]*?)```/i) || raw.match(/```\s*([\s\S]*?)```/);
  const objectText = raw.includes('{') ? raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1) : '';
  const candidates = [block?.[1], raw, objectText].filter(Boolean);
  for (const item of candidates) {
    try { return JSON.parse(item); }
    catch {}
  }
  return null;
}

function splitCode(code) {
  const styleMatch = code.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  return {
    html: code.replace(/<style[^>]*>[\s\S]*?<\/style>/ig, '').replace(/<script[^>]*>[\s\S]*?<\/script>/ig, '').trim(),
    css: styleMatch?.[1] || '',
    js: scriptMatch?.[1] || '',
  };
}

function sanitizeTheater(item) {
  const html = item.html
    .replace(/<script\b[\s\S]*?<\/script>/ig, '')
    .replace(/\son\w+\s*=\s*(['"]).*?\1/ig, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/ig, '');
  const js = hasDangerousJs(item.js) ? '' : item.js;
  return {
    ...item,
    html,
    css: item.css || '',
    js,
  };
}

function hasDangerousJs(js) {
  return /\b(localStorage|sessionStorage|fetch|XMLHttpRequest|WebSocket|eval|document\.cookie)\b|new\s+Function\b|\bimport\s*\(/i.test(String(js || ''));
}

function buildSrcdoc(item) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #0b0612;
}
${item.css || ''}
</style>
</head>
<body>
${item.html || ''}
<script>
try {
${item.js || ''}
} catch (error) {
  console.warn('[theater preview]', error);
}
<\/script>
</body>
</html>`;
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(fullCode.value);
    notice.value = '代码已复制。';
  } catch {
    notice.value = '复制失败，请手动选择代码。';
  }
}
</script>

<style scoped>
.theater-app {
  position:absolute;
  inset:0;
  z-index:20;
  display:flex;
  flex-direction:column;
  border-radius:40px;
  background:#101010;
  color:#f5f5f5;
  font-family:inherit;
  animation:theater-in .34s cubic-bezier(.2,.9,.2,1) both;
}

button,
input,
textarea {
  font-family:inherit;
}

button {
  border:0;
  cursor:pointer;
}

button:disabled {
  cursor:not-allowed;
  opacity:.56;
}

.theater-top {
  position:relative;
  z-index:2;
  display:grid;
  grid-template-columns:62px minmax(0,1fr) 62px;
  align-items:center;
  gap:10px;
  padding:52px 15px 12px;
}

.ghost-btn {
  height:32px;
  border:1px solid rgba(255,255,255,.16);
  border-radius:16px;
  background:#1c1c1c;
  color:#f5f5f5;
  font-size:12px;
  transition:transform .16s ease, background .16s ease;
}

.ghost-btn:active,
.chip-list button:active,
.generate-btn:active,
.code-actions button:active {
  transform:scale(.95);
}

.theater-title {
  min-width:0;
  text-align:center;
}

.theater-title span {
  display:block;
  color:#a8a8a8;
  font-size:10px;
  letter-spacing:1.4px;
  text-transform:uppercase;
}

.theater-title h1 {
  margin:1px 0 0;
  font-size:24px;
  letter-spacing:.5px;
}

.theater-tabs {
  display:grid;
  grid-template-columns:repeat(3, 1fr);
  gap:6px;
  margin:0 15px 10px;
  padding:5px;
  border:1px solid rgba(255,255,255,.14);
  border-radius:20px;
  background:#181818;
}

.theater-tabs button {
  height:32px;
  border-radius:16px;
  background:transparent;
  color:#8f8f8f;
  font-size:12px;
  font-weight:800;
}

.theater-tabs button.active {
  background:#f1f1f1;
  color:#111;
  box-shadow:0 8px 18px rgba(0,0,0,.24);
}

.theater-body {
  min-height:0;
  flex:1;
  overflow-y:auto;
  padding:0 13px 34px;
}

.theater-body::-webkit-scrollbar {
  width:0;
}

.create-panel,
.preview-panel,
.code-panel {
  display:flex;
  flex-direction:column;
  gap:10px;
}

.stage-card,
.form-card,
.choice-card,
.preview-shell,
.code-box,
.notice-card {
  border:1px solid rgba(255,255,255,.13);
  box-shadow:0 18px 42px rgba(0,0,0,.24);
  backdrop-filter:blur(18px);
}

.stage-card {
  position:relative;
  padding:15px;
  border-radius:24px;
  background:#1a1a1a;
}

.intro-card::after {
  content:none;
}

.ticket-mark,
.result-head span {
  display:inline-flex;
  margin-bottom:7px;
  color:#bdbdbd;
  font-size:10px;
  font-weight:900;
  letter-spacing:1.5px;
  text-transform:uppercase;
}

.stage-card h2 {
  margin:0 0 7px;
  font-size:21px;
  line-height:1.2;
}

.stage-card p {
  margin:0;
  color:#b8b8b8;
  font-size:12px;
  line-height:1.55;
}

.form-card,
.choice-card {
  padding:13px;
  border-radius:22px;
  background:#181818;
}

.form-card {
  display:grid;
  gap:11px;
}

.form-card label {
  display:grid;
  gap:6px;
}

.form-card span,
.choice-head strong {
  color:#ededed;
  font-size:12px;
  font-weight:850;
}

.form-card input,
.form-card textarea {
  width:100%;
  border:1px solid rgba(255,255,255,.14);
  outline:none;
  border-radius:16px;
  background:#0d0d0d;
  color:#f5f5f5;
  font-size:13px;
}

.form-card input {
  height:39px;
  padding:0 12px;
}

.form-card textarea {
  resize:vertical;
  min-height:74px;
  padding:10px 12px;
  line-height:1.45;
}

.form-card input::placeholder,
.form-card textarea::placeholder {
  color:#686868;
}

.choice-head {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  margin-bottom:10px;
}

.choice-head span {
  color:#a8a8a8;
  font-size:11px;
}

.chip-list {
  display:flex;
  flex-wrap:wrap;
  gap:7px;
}

.chip-list button {
  padding:8px 10px;
  border:1px solid rgba(255,255,255,.15);
  border-radius:999px;
  background:#202020;
  color:#cfcfcf;
  font-size:12px;
  transition:transform .16s ease, background .16s ease, color .16s ease;
}

.chip-list button.active {
  background:#f1f1f1;
  color:#111;
  font-weight:850;
}

.notice-card {
  margin:0;
  padding:10px 12px;
  border-radius:16px;
  background:rgba(255,78,89,.14);
  color:#ffb6b8;
  font-size:12px;
  line-height:1.45;
}

.generate-btn {
  display:flex;
  align-items:center;
  justify-content:space-between;
  min-height:52px;
  padding:0 15px;
  border-radius:22px;
  background:#f1f1f1;
  color:#111;
  box-shadow:0 18px 34px rgba(0,0,0,.32);
  font-weight:950;
}

.generate-btn i {
  font-size:11px;
  font-style:normal;
  letter-spacing:.8px;
  text-transform:uppercase;
}

.preview-shell {
  padding:9px;
  border-radius:26px;
  background:#181818;
}

.theater-preview-frame {
  display:block;
  width:100%;
  height:620px;
  border:0;
  border-radius:20px;
  background:#101010;
}

.code-actions {
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:8px;
}

.code-actions button {
  height:38px;
  border-radius:17px;
  background:#202020;
  color:#f5f5f5;
  font-size:12px;
  font-weight:850;
}

.code-actions button:first-child {
  background:#f1f1f1;
  color:#111;
}

.code-box {
  min-height:330px;
  margin:0;
  padding:13px;
  border-radius:20px;
  background:#0d0d0d;
  color:#ededed;
  font-size:11px;
  line-height:1.45;
  white-space:pre-wrap;
  word-break:break-word;
}

.notice-slide-enter-active,
.notice-slide-leave-active {
  transition:opacity .2s ease, transform .22s ease;
}

.notice-slide-enter-from,
.notice-slide-leave-to {
  opacity:0;
  transform:translateY(-6px);
}

@keyframes theater-in {
  from { opacity:0; transform:translateY(28px) scale(.96); }
  to { opacity:1; transform:none; }
}
</style>
