<template>
  <section class="role-app">
    <header class="role-header">
      <button class="back-button" type="button" @click="$emit('close')">返回</button>
      <div>
        <h1>角色</h1>
      </div>
      <div class="clear-actions">
        <button class="clear-button" type="button" @click="clearCharacters">清角色</button>
        <button class="clear-button" type="button" @click="clearWorldBooks">清世界书</button>
      </div>
    </header>

    <main class="role-content">
      <section class="upload-grid">
        <label class="upload-card">
          <input type="file" accept="application/json,.json" multiple @change="handleCharacterUpload" />
          <span>上传角色卡</span>
          <strong>JSON - 可多选导入</strong>
          <em>应用时只能选择 1 张角色卡</em>
        </label>

        <label class="upload-card world">
          <input type="file" accept="application/json,.json" multiple @change="handleWorldBookUpload" />
          <span>上传世界书</span>
          <strong>JSON - 可多选导入</strong>
          <em>可同时应用多本世界书</em>
        </label>
      </section>

      <div v-if="notice" class="state-card" :class="{ error: noticeType === 'error' }">{{ notice }}</div>

      <InfoSection title="User 人设">
        <div class="persona-card">
          <label>
            <span>名称</span>
            <input v-model="userPersona.name" placeholder="例如：我 / user / 自定义姓名" />
          </label>
          <label>
            <span>描述</span>
            <textarea v-model="userPersona.description" rows="4" placeholder="填写用户人设、说话习惯、身份背景、和角色的关系等。此内容会同步给信息 app 的 AI 上下文。"></textarea>
          </label>
        </div>
      </InfoSection>

      <template v-if="activeCharacter">
        <section class="hero-card">
          <div class="avatar" :style="avatarStyle">
            <span v-if="!avatarStyle">{{ initial }}</span>
          </div>
          <div class="hero-info">
            <p class="label">当前应用角色</p>
            <h2>{{ textOrEmpty(activeCharacter.name) }}</h2>
            <p>{{ textOrEmpty(activeCharacter.description) }}</p>
          </div>
        </section>

        <InfoSection title="角色设定">
          <InfoRow label="性格" :value="activeCharacter.personality" />
          <InfoRow label="场景" :value="activeCharacter.scenario" />
          <InfoRow label="开场白" :value="activeCharacter.first_mes" />
          <InfoRow label="作者备注" :value="activeCharacter.creatorcomment" />
        </InfoSection>
      </template>

      <section v-else class="empty-hero">
        <p>还没有应用角色卡</p>
        <span>先上传从 SillyTavern 导出的角色 JSON，再在列表中选择一张应用。</span>
      </section>

      <InfoSection title="角色卡库">
        <div v-if="characters.length" class="file-list">
          <button
            v-for="character in characters"
            :key="character.id"
            class="file-item"
            :class="{ active: character.id === activeCharacterId }"
            type="button"
            @click="applyCharacter(character.id)"
          >
            <div class="mini-avatar" :style="imageStyle(character.avatar)">
              <span v-if="!character.avatar">{{ String(character.name || '').slice(0, 1) || '角' }}</span>
            </div>
            <div>
              <strong>{{ textOrEmpty(character.name) }}</strong>
              <span>{{ character.fileName }}</span>
            </div>
            <em>{{ character.id === activeCharacterId ? '已应用' : '应用' }}</em>
          </button>
        </div>
        <p v-else class="empty">暂无角色卡。角色卡支持 SillyTavern V2 或常见 Tavern JSON 字段。</p>
      </InfoSection>

      <InfoSection title="世界书">
        <div v-if="worldBooks.length" class="file-list compact">
          <article v-for="book in worldBooks" :key="book.id" class="world-book-card" :class="{ active: activeWorldBookIds.includes(book.id) }">
            <label class="world-item">
              <input type="checkbox" :checked="activeWorldBookIds.includes(book.id)" @change="toggleWorldBook(book.id)" />
              <div>
                <strong>{{ textOrEmpty(book.name) }}</strong>
                <span>{{ book.fileName }} - {{ enabledEntryCount(book) }}/{{ book.entries.length }} 条目开启</span>
              </div>
            </label>
            <div v-if="activeWorldBookIds.includes(book.id)" class="entry-list">
              <label v-for="entry in book.entries" :key="entry.id" class="entry-item" :class="{ active: activeWorldBookEntryIds.includes(entry.id) }">
                <input type="checkbox" :checked="activeWorldBookEntryIds.includes(entry.id)" @change="toggleWorldBookEntry(entry.id)" />
                <div>
                  <strong>{{ entry.name }}</strong>
                  <span>{{ entry.keys.length ? entry.keys.join('、') : '无关键词' }}</span>
                  <p>{{ entry.content || '暂无内容' }}</p>
                </div>
              </label>
            </div>
          </article>
        </div>
        <p v-else class="empty">暂无世界书。世界书支持 SillyTavern world info JSON，可多本同时应用。</p>
      </InfoSection>

      <InfoSection title="应用摘要">
        <div class="stats-grid">
          <div class="stat-card">
            <span>角色卡</span>
            <strong>{{ characters.length }}</strong>
          </div>
          <div class="stat-card">
            <span>应用位</span>
            <strong>{{ activeCharacter ? 1 : 0 }}</strong>
          </div>
          <div class="stat-card">
            <span>世界书</span>
            <strong>{{ worldBooks.length }}</strong>
          </div>
          <div class="stat-card">
            <span>应用书</span>
            <strong>{{ activeWorldBooks.length }}</strong>
          </div>
          <div class="stat-card">
            <span>条目</span>
            <strong>{{ activeWorldBookEntries.length }}</strong>
          </div>
        </div>
      </InfoSection>

      <InfoSection title="已应用世界书">
        <div v-if="activeWorldBooks.length" class="chip-list">
          <span v-for="book in activeWorldBooks" :key="book.id" class="chip">{{ book.name }} · {{ book.entries.length }} 条</span>
        </div>
        <p v-else class="empty">暂未应用世界书</p>
      </InfoSection>
    </main>
  </section>
</template>

<script setup>
import { computed, defineComponent, h, onMounted, ref, watch } from 'vue';

defineEmits(['close']);

const ROLE_APP_STORAGE_KEY = 'phone_role_app_selection_v1';

const InfoSection = defineComponent({
  props: {
    title: { type: String, required: true },
  },
  setup(props, { slots }) {
    return () => h('section', { class: 'info-section' }, [h('h3', props.title), slots.default?.()]);
  },
});

const InfoRow = defineComponent({
  props: {
    label: { type: String, required: true },
    value: { type: [String, Number, Boolean, Object, Array], default: '' },
  },
  setup(props) {
    return () =>
      h('div', { class: 'info-row' }, [
        h('span', props.label),
        h('p', textOrEmpty(props.value)),
      ]);
  },
});

const characters = ref([]);
const worldBooks = ref([]);
const activeCharacterId = ref('');
const activeWorldBookIds = ref([]);
const activeWorldBookEntryIds = ref([]);
const userPersona = ref({ name: '', description: '' });
const notice = ref('');
const noticeType = ref('info');

const activeCharacter = computed(() => characters.value.find(item => item.id === activeCharacterId.value) || null);
const activeWorldBooks = computed(() => worldBooks.value
  .filter(item => activeWorldBookIds.value.includes(item.id))
  .map(book => ({ ...book, entries: book.entries.filter(entry => activeWorldBookEntryIds.value.includes(entry.id)) }))
  .filter(book => book.entries.length));
const activeWorldBookEntries = computed(() => activeWorldBooks.value.flatMap(book => book.entries.map(entry => ({ ...entry, bookName: book.name }))));
const initial = computed(() => textOrEmpty(activeCharacter.value?.name).slice(0, 1));
const avatarStyle = computed(() => imageStyle(activeCharacter.value?.avatar));
const appliedPayload = computed(() => ({
  character: activeCharacter.value,
  user: normalizeUserPersona(),
  worldBooks: activeWorldBooks.value,
  worldBookEntries: activeWorldBookEntries.value,
}));

watch(appliedPayload, payload => {
  persistRoleAppState();
  syncGlobalSelection(payload);
}, { deep: true });

onMounted(() => {
  restoreRoleAppState();
  syncGlobalSelection(appliedPayload.value);
});

async function handleCharacterUpload(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = '';
  if (!files.length) return;

  const parsed = await parseFiles(files, normalizeCharacterFile);
  if (!parsed.items.length) {
    setNotice(parsed.errors.join('；') || '没有读取到有效角色卡', 'error');
    return;
  }

  characters.value = mergeById(characters.value, parsed.items);
  if (!activeCharacterId.value) activeCharacterId.value = parsed.items[0].id;
  setNotice(`已导入 ${parsed.items.length} 张角色卡${parsed.errors.length ? `，${parsed.errors.length} 个文件失败` : ''}`);
}

async function handleWorldBookUpload(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = '';
  if (!files.length) return;

  const parsed = await parseFiles(files, normalizeWorldBookFile);
  if (!parsed.items.length) {
    setNotice(parsed.errors.join('；') || '没有读取到有效世界书', 'error');
    return;
  }

  worldBooks.value = mergeById(worldBooks.value, parsed.items);
  activeWorldBookIds.value = Array.from(new Set([...activeWorldBookIds.value, ...parsed.items.map(item => item.id)]));
  activeWorldBookEntryIds.value = Array.from(new Set([
    ...activeWorldBookEntryIds.value,
    ...parsed.items.flatMap(item => item.entries.filter(entry => entry.defaultEnabled).map(entry => entry.id)),
  ]));
  setNotice(`已导入并应用 ${parsed.items.length} 本世界书${parsed.errors.length ? `，${parsed.errors.length} 个文件失败` : ''}`);
}

async function parseFiles(files, normalizer) {
  const items = [];
  const errors = [];

  for (const file of files) {
    try {
      const json = JSON.parse(await file.text());
      items.push(normalizer(json, file.name));
    } catch (error) {
      console.warn('[RoleApp] parse file failed:', file.name, error);
      errors.push(`${file.name} 解析失败`);
    }
  }

  return { items, errors };
}

function normalizeCharacterFile(json, fileName) {
  const data = json?.data && typeof json.data === 'object' ? json.data : json;
  const extensions = data?.extensions || json?.extensions || {};
  const name = String(data?.name || json?.name || stripExtension(fileName));
  const avatar = data?.avatar || data?.avatar_url || data?.img || data?.image || data?.extensions?.avatar || '';

  return {
    id: createFileId('character', fileName, name),
    type: 'character',
    fileName,
    name,
    avatar,
    description: data?.description || data?.desc || '',
    personality: data?.personality || '',
    scenario: data?.scenario || '',
    first_mes: data?.first_mes || data?.firstMessage || data?.mes_example || '',
    creatorcomment: data?.creator_notes || data?.creatorcomment || data?.creator || '',
    tags: Array.isArray(data?.tags) ? data.tags : [],
    extensions,
  };
}

function normalizeWorldBookFile(json, fileName) {
  const entriesSource = json?.entries || json?.world_info || json?.data?.entries || json?.data || [];
  const name = String(json?.name || json?.world || json?.title || json?.data?.name || stripExtension(fileName));
  const entries = normalizeEntries(entriesSource).map((entry, index) => normalizeWorldBookEntry(entry, index, fileName, name));

  return {
    id: createFileId('world', fileName, name),
    type: 'worldBook',
    fileName,
    name,
    entries,
  };
}

function normalizeWorldBookEntry(entry, index, fileName, bookName) {
  const keys = normalizeEntryKeys(entry?.keys || entry?.key || entry?.keywords || entry?.primary_key || entry?.secondary_keys);
  const name = String(entry?.comment || entry?.name || entry?.title || keys[0] || `条目 ${index + 1}`);
  const content = String(entry?.content || entry?.text || entry?.value || entry?.description || '');
  const defaultEnabled = entry?.disable !== true && entry?.enabled !== false;

  return {
    id: createFileId('entry', `${fileName}:${index}`, `${bookName}:${name}:${content.slice(0, 60)}`),
    name,
    keys,
    content,
    order: Number(entry?.order) || 0,
    depth: Number(entry?.depth) || 0,
    constant: Boolean(entry?.constant),
    defaultEnabled,
  };
}

function normalizeEntryKeys(value) {
  if (Array.isArray(value)) return value.flatMap(normalizeEntryKeys).filter(Boolean).slice(0, 20);
  if (value === undefined || value === null || value === '') return [];
  return String(value).split(',').map(item => item.trim()).filter(Boolean).slice(0, 20);
}

function normalizeEntries(entriesSource) {
  if (Array.isArray(entriesSource)) return entriesSource;
  if (entriesSource && typeof entriesSource === 'object') return Object.values(entriesSource);
  return [];
}

function mergeById(current, incoming) {
  const map = new Map(current.map(item => [item.id, item]));
  for (const item of incoming) map.set(item.id, item);
  return Array.from(map.values());
}

function applyCharacter(id) {
  activeCharacterId.value = id;
  setNotice('已切换应用角色。角色 app 同一时间只会应用一张角色卡。');
}

function toggleWorldBook(id) {
  const book = worldBooks.value.find(item => item.id === id);
  if (activeWorldBookIds.value.includes(id)) {
    activeWorldBookIds.value = activeWorldBookIds.value.filter(item => item !== id);
    if (book) {
      const entryIds = new Set(book.entries.map(entry => entry.id));
      activeWorldBookEntryIds.value = activeWorldBookEntryIds.value.filter(entryId => !entryIds.has(entryId));
    }
    return;
  }
  activeWorldBookIds.value = [...activeWorldBookIds.value, id];
  if (book) activeWorldBookEntryIds.value = Array.from(new Set([...activeWorldBookEntryIds.value, ...book.entries.map(entry => entry.id)]));
}

function toggleWorldBookEntry(id) {
  if (activeWorldBookEntryIds.value.includes(id)) {
    activeWorldBookEntryIds.value = activeWorldBookEntryIds.value.filter(item => item !== id);
    return;
  }
  activeWorldBookEntryIds.value = [...activeWorldBookEntryIds.value, id];
}

function enabledEntryCount(book) {
  return book.entries.filter(entry => activeWorldBookEntryIds.value.includes(entry.id)).length;
}

function normalizeUserPersona() {
  const name = String(userPersona.value.name || '').trim();
  const description = String(userPersona.value.description || '').trim();
  return name || description ? { name: name || 'user', description } : null;
}

function clearCharacters() {
  characters.value = [];
  activeCharacterId.value = '';
  persistRoleAppState();
  syncGlobalSelection(appliedPayload.value);
  setNotice('已清空角色卡库，世界书和 User 人设已保留。');
}

function clearWorldBooks() {
  worldBooks.value = [];
  activeWorldBookIds.value = [];
  activeWorldBookEntryIds.value = [];
  persistRoleAppState();
  syncGlobalSelection(appliedPayload.value);
  setNotice('已清空世界书库，角色卡和 User 人设已保留。');
}

function restoreRoleAppState() {
  try {
    const saved = JSON.parse(localStorage.getItem(ROLE_APP_STORAGE_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return;
    characters.value = Array.isArray(saved.characters) ? saved.characters : [];
    worldBooks.value = Array.isArray(saved.worldBooks) ? saved.worldBooks : [];
    activeCharacterId.value = characters.value.some(item => item.id === saved.activeCharacterId) ? saved.activeCharacterId : '';
    const worldBookIds = new Set(worldBooks.value.map(item => item.id));
    activeWorldBookIds.value = Array.isArray(saved.activeWorldBookIds) ? saved.activeWorldBookIds.filter(id => worldBookIds.has(id)) : [];
    const entryIds = new Set(worldBooks.value.flatMap(item => item.entries.map(entry => entry.id)));
    activeWorldBookEntryIds.value = Array.isArray(saved.activeWorldBookEntryIds) ? saved.activeWorldBookEntryIds.filter(id => entryIds.has(id)) : [];
    userPersona.value = saved.userPersona && typeof saved.userPersona === 'object' ? { name: saved.userPersona.name || '', description: saved.userPersona.description || '' } : { name: '', description: '' };
  } catch (error) {
    console.warn('[RoleApp] restore state failed:', error);
  }
}

function persistRoleAppState() {
  try {
    if (!characters.value.length && !worldBooks.value.length && !activeCharacterId.value && !activeWorldBookIds.value.length && !activeWorldBookEntryIds.value.length && !userPersona.value.name && !userPersona.value.description) {
      localStorage.removeItem(ROLE_APP_STORAGE_KEY);
      return;
    }
    localStorage.setItem(ROLE_APP_STORAGE_KEY, JSON.stringify({
      characters: characters.value,
      worldBooks: worldBooks.value,
      activeCharacterId: activeCharacterId.value,
      activeWorldBookIds: activeWorldBookIds.value,
      activeWorldBookEntryIds: activeWorldBookEntryIds.value,
      userPersona: userPersona.value,
    }));
  } catch (error) {
    console.warn('[RoleApp] persist state failed:', error);
    setNotice('保存失败：角色卡或世界书数据过大，退出后可能无法保留。请减少文件数量或移除大体积头像后重试。', 'error');
  }
}

function removeRoleAppState() {
  try {
    localStorage.removeItem(ROLE_APP_STORAGE_KEY);
  } catch (error) {
    console.warn('[RoleApp] remove state failed:', error);
  }
}

function syncGlobalSelection(payload) {
  if (typeof window === 'undefined') return;
  const hasSelection = Boolean(payload?.character || payload?.user || payload?.worldBooks?.length || payload?.worldBookEntries?.length);
  if (payload?.cleared || !hasSelection) delete window.__phoneRoleAppSelection;
  else window.__phoneRoleAppSelection = payload;
  window.dispatchEvent(new CustomEvent('phone-role-app-selection', { detail: payload }));
}

function setNotice(message, type = 'info') {
  notice.value = message;
  noticeType.value = type;
}

function textOrEmpty(value) {
  if (value === undefined || value === null || value === '') return '暂无数据';
  if (Array.isArray(value)) return value.length ? value.join('、') : '暂无数据';
  if (typeof value === 'object') return Object.keys(value).length ? JSON.stringify(value) : '暂无数据';
  return String(value);
}

function imageStyle(url) {
  return url ? { backgroundImage: `url('${String(url).replaceAll("'", '%27')}')` } : null;
}

function stripExtension(fileName) {
  return String(fileName || '未命名').replace(/\.json$/i, '');
}

function createFileId(prefix, fileName, name) {
  return `${prefix}_${hashString(`${fileName}:${name}`)}`;
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
</script>

<style scoped>
.role-app {
  position:absolute;
  inset:0;
  z-index:20;
  display:flex;
  flex-direction:column;
  width:100%;
  height:100%;
  box-sizing:border-box;
  overflow:hidden;
  padding:48px 18px 18px;
  background:#050505;
  background-clip:padding-box;
  color:#fff;
  animation:role-enter .34s cubic-bezier(.2,.9,.2,1) both;
}

.role-header {
  display:grid;
  grid-template-columns:62px minmax(0,1fr) 72px;
  align-items:center;
  gap:12px;
  margin-bottom:16px;
  animation:role-fade-up .34s .04s ease both;
}

.clear-actions {
  display:grid;
  grid-template-rows:1fr 1fr;
  justify-content:flex-end;
  gap:5px;
}

.role-header div {
  text-align:center;
}

.role-header h1 {
  margin:0;
  font-size:28px;
  letter-spacing:.5px;
}

.back-button,
.clear-button {
  min-width:62px;
  height:27px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  white-space:nowrap;
  border:1px solid rgba(255,255,255,.22);
  border-radius:999px;
  padding:0 8px;
  background:#141414;
  color:#fff;
  font-size:11px;
  line-height:1;
  transition:transform .18s ease, background .18s ease, border-color .18s ease;
}

.back-button:active,
.clear-button:active,
.file-item:active,
.upload-card:active {
  transform:scale(.96);
}

.role-content {
  min-height:0;
  overflow:auto;
  padding:0 2px 30px;
}

.role-content::-webkit-scrollbar {
  width:0;
}

.upload-grid {
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
  margin-bottom:12px;
}

.upload-card {
  position:relative;
  min-height:118px;
  display:flex;
  flex-direction:column;
  justify-content:flex-end;
  gap:5px;
  overflow:hidden;
  border:1px solid rgba(255,255,255,.16);
  border-radius:24px;
  padding:14px;
  background:linear-gradient(135deg, #1b1b1b, #080808);
  box-shadow:0 16px 40px rgba(0,0,0,.28);
  transition:transform .18s ease, border-color .18s ease;
}

.upload-card.world {
  background:linear-gradient(135deg, #242424, #090909);
}

.upload-card::after {
  content:"";
  position:absolute;
  right:14px;
  top:14px;
  width:10px;
  height:10px;
  border-radius:50%;
  background:#d71920;
}

.upload-card input {
  position:absolute;
  inset:0;
  opacity:0;
}

.upload-card span {
  font-size:16px;
  font-weight:700;
}

.upload-card strong,
.upload-card em {
  color:rgba(255,255,255,.66);
  font-size:11px;
  font-style:normal;
}

.state-card,
.hero-card,
.info-section,
.empty-hero {
  border:1px solid rgba(255,255,255,.12);
  border-radius:22px;
  background:#101010;
  box-shadow:0 16px 40px rgba(0,0,0,.32);
  backdrop-filter:blur(18px);
}

.state-card {
  padding:14px;
  margin-bottom:12px;
  color:rgba(255,255,255,.72);
  font-size:12px;
  text-align:center;
}

.error {
  color:#ff8a84;
}

.hero-card {
  display:flex;
  gap:14px;
  padding:16px;
  margin-bottom:12px;
  animation:role-fade-up .36s .08s ease both;
}

.avatar,
.mini-avatar {
  flex:0 0 auto;
  display:grid;
  place-items:center;
  background:linear-gradient(135deg, #2a2a2a, #050505);
  background-size:cover;
  background-position:center;
  border:1px solid rgba(255,255,255,.14);
  color:#d71920;
  font-weight:700;
}

.avatar {
  width:74px;
  height:74px;
  border-radius:22px;
  font-size:30px;
}

.mini-avatar {
  width:42px;
  height:42px;
  border-radius:15px;
  font-size:18px;
}

.hero-info {
  min-width:0;
}

.hero-info h2 {
  margin:2px 0 8px;
  font-size:24px;
}

.hero-info p {
  margin:0;
  color:rgba(255,255,255,.68);
  font-size:12px;
  line-height:1.55;
  display:-webkit-box;
  -webkit-line-clamp:4;
  -webkit-box-orient:vertical;
  overflow:hidden;
}

.hero-info .label {
  color:#d71920;
  font-size:11px;
}

.empty-hero {
  padding:18px;
  margin-bottom:12px;
}

.empty-hero p {
  margin:0 0 6px;
  font-size:18px;
  font-weight:700;
}

.empty-hero span {
  color:rgba(255,255,255,.62);
  font-size:12px;
  line-height:1.5;
}

.info-section {
  padding:14px;
  margin-bottom:12px;
  animation:role-fade-up .36s ease both;
}

.info-section h3 {
  margin:0 0 10px;
  font-size:15px;
  letter-spacing:.4px;
}

.info-row {
  display:grid;
  grid-template-columns:62px 1fr;
  gap:10px;
  padding:9px 0;
  border-top:1px solid rgba(255,255,255,.07);
}

.info-row:first-of-type {
  border-top:0;
}

.info-row span {
  color:rgba(255,255,255,.46);
  font-size:12px;
}

.info-row p,
.empty {
  margin:0;
  color:rgba(255,255,255,.78);
  font-size:12px;
  line-height:1.55;
  word-break:break-word;
}

.file-list {
  display:flex;
  flex-direction:column;
  gap:8px;
}

.file-item,
.world-item {
  width:100%;
  display:flex;
  align-items:center;
  gap:10px;
  border:1px solid rgba(255,255,255,.1);
  border-radius:18px;
  padding:9px;
  background:#151515;
  color:#fff;
  text-align:left;
  transition:transform .16s ease, background .16s ease, border-color .16s ease;
}

.world-book-card {
  border:1px solid rgba(255,255,255,.1);
  border-radius:20px;
  overflow:hidden;
  background:#121212;
}

.world-book-card.active {
  border-color:rgba(215,25,32,.7);
}

.world-book-card .world-item {
  border:0;
  border-radius:0;
  background:transparent;
}

.entry-list {
  display:flex;
  flex-direction:column;
  gap:7px;
  padding:0 9px 9px 36px;
}

.entry-item {
  display:grid;
  grid-template-columns:18px minmax(0,1fr);
  gap:8px;
  align-items:start;
  padding:8px;
  border:1px solid rgba(255,255,255,.08);
  border-radius:14px;
  background:#0a0a0a;
}

.entry-item.active {
  border-color:rgba(215,25,32,.5);
  background:#171717;
}

.entry-item input {
  width:16px;
  height:16px;
  margin-top:2px;
  accent-color:#d71920;
}

.entry-item div {
  min-width:0;
}

.entry-item strong,
.entry-item span,
.entry-item p {
  display:block;
  margin:0;
  overflow:hidden;
  text-overflow:ellipsis;
}

.entry-item strong {
  color:#fff;
  font-size:12px;
  white-space:nowrap;
}

.entry-item span {
  margin-top:3px;
  color:rgba(255,255,255,.42);
  font-size:10px;
  white-space:nowrap;
}

.entry-item p {
  margin-top:5px;
  color:rgba(255,255,255,.64);
  font-size:11px;
  line-height:1.45;
  display:-webkit-box;
  -webkit-line-clamp:2;
  -webkit-box-orient:vertical;
}

.persona-card {
  display:flex;
  flex-direction:column;
  gap:10px;
}

.persona-card label {
  display:flex;
  flex-direction:column;
  gap:6px;
}

.persona-card span {
  color:rgba(255,255,255,.5);
  font-size:12px;
}

.persona-card input,
.persona-card textarea {
  width:100%;
  border:1px solid rgba(255,255,255,.1);
  border-radius:14px;
  outline:0;
  padding:10px;
  background:#0a0a0a;
  color:#fff;
  font:inherit;
  font-size:12px;
  resize:none;
}

.persona-card input:focus,
.persona-card textarea:focus {
  border-color:#d71920;
}

.file-item.active,
.world-item.active {
  border-color:#d71920;
  background:#1f1f1f;
}

.file-item div:not(.mini-avatar),
.world-item div {
  min-width:0;
  flex:1;
}

.file-item strong,
.world-item strong {
  display:block;
  overflow:hidden;
  font-size:13px;
  text-overflow:ellipsis;
  white-space:nowrap;
}

.file-item span,
.world-item span {
  display:block;
  overflow:hidden;
  margin-top:3px;
  color:rgba(255,255,255,.5);
  font-size:11px;
  text-overflow:ellipsis;
  white-space:nowrap;
}

.file-item em {
  flex:0 0 auto;
  color:#d71920;
  font-size:11px;
  font-style:normal;
}

.world-item input {
  width:18px;
  height:18px;
  accent-color:#d71920;
}

.chip-list {
  display:flex;
  flex-wrap:wrap;
  gap:8px;
}

.chip {
  border:1px solid rgba(255,255,255,.12);
  border-radius:999px;
  padding:7px 10px;
  background:rgba(255,255,255,.06);
  color:rgba(255,255,255,.78);
  font-size:12px;
}

.stats-grid {
  display:grid;
  grid-template-columns:repeat(5,1fr);
  gap:8px;
}

.stat-card {
  padding:10px 6px;
  border-radius:16px;
  background:rgba(255,255,255,.06);
  text-align:center;
}

.stat-card span {
  display:block;
  color:rgba(255,255,255,.48);
  font-size:11px;
}

.stat-card strong {
  display:block;
  margin-top:4px;
  color:#d71920;
  font-size:18px;
}

@media (max-width:380px) {
  .upload-grid {
    grid-template-columns:1fr;
  }
}

@keyframes role-enter {
  from { opacity:0; transform:translateY(26px) scale(.97); }
  to { opacity:1; transform:none; }
}

@keyframes role-fade-up {
  from { opacity:0; transform:translateY(12px); }
  to { opacity:1; transform:none; }
}
</style>
