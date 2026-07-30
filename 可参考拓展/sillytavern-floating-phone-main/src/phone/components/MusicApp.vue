<template>
  <section class="music-app">
    <header class="music-head">
      <button class="text-btn" type="button" @click="$emit('close')">返回</button>
      <div class="music-brand">
        <strong>网抑云</strong>
        <span>{{ selectedRole ? `${selectedRole.name} 正在一起听` : '今天也要软乎乎地听歌 (=^･ω･^=)' }}</span>
      </div>
      <button class="round-btn" type="button" title="一起听" @click="rolePanelOpen = true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4a5 5 0 0 0-5 5v5.2A2.8 2.8 0 0 0 9.8 17H11v-7H9v5h-.2a.8.8 0 0 1-.8-.8V9a4 4 0 0 1 8 0v5.2a.8.8 0 0 1-.8.8H15v-5h-2v7h1.2a2.8 2.8 0 0 0 2.8-2.8V9a5 5 0 0 0-5-5Zm-1 15h2v2h-2v-2Z"/></svg></button>
    </header>

    <main class="music-body">
      <label ref="searchShellEl" class="search-shell panel-enter" style="--delay:0ms;border:0!important;outline:0!important;box-shadow:none!important;">
        <span>⌕</span>
        <input ref="searchInputEl" v-model="keyword" style="all:unset!important;display:block!important;flex:1 1 auto!important;min-width:0!important;border:0!important;border-width:0!important;border-style:none!important;outline:0!important;box-shadow:none!important;background:transparent!important;background-color:transparent!important;background-image:none!important;appearance:none!important;-webkit-appearance:none!important;color:#111!important;font:inherit!important;font-size:13px!important;" placeholder="搜索歌曲、歌手、专辑" @keyup.enter="search" />
        <button type="button" :disabled="searching || !keyword.trim()" @click="search">{{ searching ? '搜索中' : '搜索' }}</button>
      </label>

      <Transition name="fade-slide">
        <section v-if="message" class="notice-card">{{ message }}</section>
      </Transition>

      <Transition name="card-rise">
        <section v-if="currentSong" class="now-card panel-enter" style="--delay:70ms">
          <div class="cover-large" :class="{ playing }" :style="coverStyle(currentSong.cover)">
            <span v-if="!currentSong.cover">{{ currentSong.name.slice(0, 1) }}</span>
          </div>
          <div class="now-info">
            <span>{{ playing ? '正在播放' : '当前歌曲' }}</span>
            <h1>{{ currentSong.name }}</h1>
            <p>{{ currentSong.artist }} · {{ currentSong.album }}</p>
            <button v-if="selectedRole" class="listen-role" type="button" @click="listenDetailOpen = true">
              <div class="role-avatar" :style="coverStyle(selectedRole.avatar)"><span v-if="!selectedRole.avatar">{{ roleInitial(selectedRole) }}</span></div>
              <strong>{{ selectedRole.name }}</strong>
              <em>已听 {{ formatListenDuration(listenElapsedSeconds) }}</em>
            </button>
          </div>
        </section>
      </Transition>

      <section class="lyric-card panel-enter" style="--delay:120ms">
        <header>
          <strong>歌词</strong>
          <span>{{ parsedLyrics.length ? '同步显示' : '暂无歌词' }}</span>
        </header>
        <div v-if="parsedLyrics.length" ref="lyricScroller" class="lyric-list">
          <p class="lyric-spacer"></p>
          <p
            v-for="(line, index) in parsedLyrics"
            :key="line.time + line.text + index"
            :ref="el => setLyricLineRef(el, index)"
            :class="{ active: index === activeLyricIndex }"
          >{{ line.text }}</p>
          <p class="lyric-spacer"></p>
        </div>
        <div v-else class="empty-lyric">暂无歌词</div>
      </section>

      <section class="result-panel panel-enter" style="--delay:170ms">
        <header>
          <strong>搜索结果</strong>
          <span>{{ results.length }} 首</span>
        </header>
        <TransitionGroup v-if="results.length" name="song-row" tag="div" class="result-list">
          <button v-for="song in results" :key="song.id" type="button" class="song-row" :class="{ active: currentSong?.id === song.id }" @click="selectSong(song)">
            <div class="song-cover" :style="coverStyle(song.cover)"><span v-if="!song.cover">{{ song.name.slice(0, 1) }}</span></div>
            <div class="song-main">
              <strong>{{ song.name }}</strong>
              <span>{{ song.artist }} · {{ song.album }}</span>
            </div>
            <em>{{ formatDuration(song.duration) }}</em>
          </button>
        </TransitionGroup>
        <div v-else class="empty-result">
          <strong>{{ searched ? '没有搜索结果' : '搜索你想听的歌' }}</strong>
          <p>{{ searched ? '换个关键词再试试。' : '会尝试获取歌曲、封面、时长、歌词和播放地址。' }}</p>
        </div>
      </section>
    </main>

    <footer class="player-bar">
      <div class="mini-line">
        <div class="mini-cover" :class="{ playing }" :style="coverStyle(currentSong?.cover)"><span v-if="!currentSong?.cover">音</span></div>
        <div class="mini-title">
          <strong>{{ currentSong?.name || '未播放' }}</strong>
          <span>{{ currentSong?.artist || '先搜索歌曲' }}</span>
        </div>
        <button class="icon-btn" type="button" :title="modeLabel" @click="cycleMode">
          <svg v-if="mode === 'order'" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h11.4l-2.7-2.7 1.4-1.4L19.2 8l-5.1 5.1-1.4-1.4L15.4 9H4V7Zm0 8h16v2H4v-2Z"/></svg>
          <svg v-else-if="mode === 'single'" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h8.4l-2.7-2.7 1.4-1.4L19.2 8l-5.1 5.1-1.4-1.4L15.4 9H7a3 3 0 0 0 0 6h2v2H7A5 5 0 0 1 7 7Zm5 6V8h-1.6V6H14v7h-2Zm5 4H8.6l2.7 2.7-1.4 1.4L4.8 16l5.1-5.1 1.4 1.4L8.6 15H17a3 3 0 0 0 0-6h-2V7h2a5 5 0 0 1 0 10Z"/></svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M16.8 3.6 21 7.8 16.8 12l-1.4-1.4 1.8-1.8h-1.1c-2 0-3.1.8-4.4 3.1l-.9 1.6C9.3 16 7.6 17 5 17H3v-2h2c1.8 0 2.8-.6 4.1-2.9l.9-1.6C11.6 7.7 13.4 6.8 16.1 6.8h1.1L15.4 5l1.4-1.4ZM3 7h2c1.8 0 3 .5 4 1.7l-1.2 1.8C7 9.4 6.2 9 5 9H3V7Zm12.4 6.4 1.4-1.4L21 16.2l-4.2 4.2-1.4-1.4 1.8-1.8h-1.1c-1.8 0-3.1-.4-4.2-1.5l1.1-1.8c.8.9 1.7 1.3 3.1 1.3h1.1l-1.8-1.8Z"/></svg>
        </button>
        <button class="icon-btn play-toggle" type="button" :disabled="!hasPlayableSong" :title="playing ? '暂停' : '播放'" @click="togglePlay">
          <svg v-if="playing" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7V5Zm6 0h4v14h-4V5Z"/></svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7L8 5Z"/></svg>
        </button>
        <button class="icon-btn" type="button" title="播放列表" @click="listPanelOpen = true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h12v2H4V6Zm0 5h12v2H4v-2Zm0 5h8v2H4v-2Zm14.5-3.5v3.8a2.3 2.3 0 1 1-1.7-2.2V8h4v2h-2.3v2.5Z"/></svg></button>
      </div>
      <div class="progress-line">
        <time>{{ formatDuration(currentTime * 1000) }}</time>
        <input type="range" min="0" :max="duration || 0" step="1" :value="currentTime" :disabled="!duration" @input="seek($event.target.value)" />
        <time>{{ formatDuration((duration || currentSong?.duration / 1000 || 0) * 1000) }}</time>
      </div>
    </footer>

    <Transition name="modal-fade">
      <div v-if="rolePanelOpen" class="modal-mask">
        <section class="modal-card">
          <header>
            <h2>一起听</h2>
            <button type="button" @click="rolePanelOpen = false">×</button>
          </header>
          <div v-if="roles.length" class="role-list">
            <button v-for="role in roles" :key="role.id" type="button" :class="{ active: selectedRoleId === role.id }" @click="chooseRole(role)">
              <span class="role-avatar" :style="coverStyle(role.avatar)"><i v-if="!role.avatar">{{ roleInitial(role) }}</i></span>
              <strong>{{ role.name }}</strong>
              <em>{{ selectedRoleId === role.id ? '正在一起听' : '选择' }}</em>
            </button>
            <button v-if="selectedRoleId" class="clear-role" type="button" @click="clearRole">取消一起听</button>
          </div>
          <div v-else class="no-role">暂无可一起听歌的角色，请先在信息 App 中添加角色</div>
        </section>
      </div>
    </Transition>

    <Transition name="modal-fade">
      <div v-if="listenDetailOpen && selectedRole" class="modal-mask">
        <section class="modal-card listen-detail-card">
          <header>
            <h2>一起听详情</h2>
            <button type="button" @click="listenDetailOpen = false">×</button>
          </header>
          <div class="listen-detail-hero">
            <div class="role-avatar detail-avatar" :style="coverStyle(selectedRole.avatar)"><span v-if="!selectedRole.avatar">{{ roleInitial(selectedRole) }}</span></div>
            <span>{{ selectedRole.name }}</span>
            <strong>{{ formatListenDuration(listenElapsedSeconds) }}</strong>
            <p>正在和你一起听 {{ currentSong?.name || '音乐' }}</p>
          </div>
          <div class="detail-actions">
            <button type="button" :disabled="!shareTargets.length" @click="sharePanelOpen = true">分享到信息</button>
            <button type="button" @click="clearRole">退出一起听</button>
          </div>
        </section>
      </div>
    </Transition>

    <Transition name="modal-fade">
      <div v-if="sharePanelOpen && selectedRole" class="modal-mask">
        <section class="modal-card share-card">
          <header>
            <h2>选择分享对象</h2>
            <button type="button" @click="sharePanelOpen = false">×</button>
          </header>
          <div v-if="shareTargets.length" class="share-target-list">
            <button v-for="target in shareTargets" :key="target.id" type="button" @click="shareListenTo(target)">
              <span class="role-avatar" :style="coverStyle(target.avatar)"><i v-if="!target.avatar">{{ target.avatarText || target.name.slice(0, 1) }}</i></span>
              <strong>{{ target.name }}</strong>
              <em>{{ target.type === 'group' ? '群聊' : '私聊' }}</em>
            </button>
          </div>
          <div v-else class="no-role">暂无可分享的聊天，请先在信息 App 添加角色或创建群聊。</div>
        </section>
      </div>
    </Transition>

    <Transition name="modal-fade">
      <div v-if="listPanelOpen" class="modal-mask">
        <section class="modal-card list-card">
          <header>
            <h2>播放列表</h2>
            <div class="list-actions">
              <button v-if="queueSelectMode" type="button" :disabled="!playList.length" :title="allQueueSelected ? '取消全选' : '全选'" @click="toggleSelectAllQueue">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h12v2H6v10h10v-4h2v6H4V5Zm16.7.7 1.4 1.4-8.9 8.9-4.4-4.4 1.4-1.4 3 3 7.5-7.5Z"/></svg>
              </button>
              <button type="button" :disabled="!playList.length" :title="queueSelectMode ? '退出多选' : '多选删除'" @click="toggleQueueSelectMode">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h11v2H6v9h9v2H4V5Zm3 4h10v2H7V9Zm0 4h7v2H7v-2Zm11.7 5.3 2.6-2.6 1.4 1.4-4 4-3-3 1.4-1.4 1.6 1.6Z"/></svg>
              </button>
              <button v-if="queueSelectMode" type="button" :disabled="!selectedQueueIds.length" title="删除所选" @click="deleteSelectedQueue">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.7 11H7.7L7 9Zm3 2 .3 7h1.7l-.2-7H10Zm4 0-.2 7h1.7l.3-7H14Z"/></svg>
              </button>
              <button type="button" :disabled="!playList.length" title="清空列表" @click="clearListAndSelection">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.7 11H7.7L7 9Zm2.7 2 .3 7h1.6l-.3-7H9.7Zm3 0v7h1.6v-7h-1.6Zm3 0-.3 7H17l.3-7h-1.6ZM4 20h16v2H4v-2Z"/></svg>
              </button>
              <button type="button" @click="listPanelOpen = false">×</button>
            </div>
          </header>
          <TransitionGroup v-if="playList.length" name="song-row" tag="div" class="queue-list">
            <button v-for="song in playList" :key="song.id" type="button" class="queue-row" :class="{ active: currentSong?.id === song.id, selected: selectedQueueIds.includes(song.id), selecting: queueSelectMode }" @click="queueSelectMode ? toggleQueueSelection(song.id) : selectSong(song)">
              <span v-if="queueSelectMode" class="queue-check"><svg v-if="selectedQueueIds.includes(song.id)" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 16.2 5.8 12.5 4.4 13.9l5.1 5.1L20.4 8.1 19 6.7 9.5 16.2Z"/></svg></span>
              <span class="queue-cover" :style="coverStyle(song.cover)"><i v-if="!song.cover">{{ song.name.slice(0, 1) }}</i></span>
              <strong>{{ song.name }}</strong>
              <em>{{ formatDuration(song.duration) }}</em>
            </button>
          </TransitionGroup>
          <div v-else class="no-role">播放列表为空，播放歌曲后会自动加入这里。</div>
        </section>
      </div>
    </Transition>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useMessageStore, createMessageId } from '../composables/useMessageStore.js';
import { useMusicPlayer } from '../composables/useMusicPlayer.js';

defineEmits(['close']);

const messageStore = useMessageStore();
const { roles } = messageStore;
const player = useMusicPlayer();
const {
  keyword,
  results,
  playList,
  currentSong,
  lyricText,
  searching,
  playing,
  searched,
  message,
  mode,
  modeLabel,
  selectedRoleId,
  listenStartedAt,
  listenElapsedSeconds,
  currentTime,
  duration,
  hasPlayableSong,
  search,
  selectSong,
  togglePlay,
  seek,
  cycleMode,
  clearList,
  removeFromList,
  setSelectedRole,
  clearInvalidRole,
} = player;

const rolePanelOpen = ref(false);
const listPanelOpen = ref(false);
const listenDetailOpen = ref(false);
const sharePanelOpen = ref(false);
const queueSelectMode = ref(false);
const selectedQueueIds = ref([]);
const lyricScroller = ref(null);
const lyricLineRefs = ref([]);
const searchShellEl = ref(null);
const searchInputEl = ref(null);

const selectedRole = computed(() => roles.value.find(role => role.id === selectedRoleId.value) || null);
const shareTargets = computed(() => {
  const conversations = messageStore.sortedConversations.value.filter(item => item.type === 'private' || (item.type === 'group' && item.includeUser !== false));
  const privateRoleIds = new Set(conversations.filter(item => item.type === 'private').map(item => item.memberIds?.[0]).filter(Boolean));
  const missingPrivateRoles = roles.value
    .filter(role => !privateRoleIds.has(role.id))
    .map(role => ({ id: `role_target_${role.id}`, type: 'private_role', name: role.name, avatar: role.avatar, avatarText: role.avatarText, role }));
  return [...conversations, ...missingPrivateRoles];
});
const allQueueSelected = computed(() => playList.value.length > 0 && selectedQueueIds.value.length === playList.value.length);
const parsedLyrics = computed(() => parseLyrics(lyricText.value));
const activeLyricIndex = computed(() => {
  if (!parsedLyrics.value.length) return -1;
  const time = currentTime.value + 0.18;
  let index = 0;
  for (let i = 0; i < parsedLyrics.value.length; i += 1) {
    if (parsedLyrics.value[i].time <= time) index = i;
    else break;
  }
  return index;
});

watch(roles, list => {
  clearInvalidRole(list.map(role => role.id));
}, { deep: true, immediate: true });

watch(activeLyricIndex, () => nextTick(scrollLyric));
watch(parsedLyrics, () => { lyricLineRefs.value = []; nextTick(scrollLyric); });
watch(playList, list => {
  const validIds = new Set(list.map(song => song.id));
  selectedQueueIds.value = selectedQueueIds.value.filter(id => validIds.has(id));
  if (!selectedQueueIds.value.length && queueSelectMode.value && !list.length) queueSelectMode.value = false;
}, { deep: true });

onMounted(() => removeSearchInputChrome(searchShellEl.value, searchInputEl.value));

function chooseRole(role) {
  setSelectedRole(role.id);
  rolePanelOpen.value = false;
}

function clearRole() {
  setSelectedRole('');
  rolePanelOpen.value = false;
  listenDetailOpen.value = false;
  sharePanelOpen.value = false;
}

function shareListenTo(target) {
  if (!selectedRole.value || !target) return;
  if (target.type === 'group' && target.includeUser === false) {
    message.value = '不能分享到无 user 的群聊。';
    return;
  }
  const conversation = target.type === 'private_role' ? messageStore.createPrivateConversation(target.role) : target;
  messageStore.addMessage(conversation.id, {
    senderType: 'user',
    senderId: 'user',
    senderName: '我',
    senderAvatar: '',
    type: 'music_listen_share',
    text: `我和${selectedRole.value.name}一起听歌 ${formatListenDuration(listenElapsedSeconds.value)}`,
    music: {
      id: createMessageId('music_share'),
      roleId: selectedRole.value.id,
      roleName: selectedRole.value.name,
      roleAvatar: selectedRole.value.avatar,
      roleAvatarText: roleInitial(selectedRole.value),
      songName: currentSong.value?.name || '音乐',
      artist: currentSong.value?.artist || '',
      album: currentSong.value?.album || '',
      cover: currentSong.value?.cover || '',
      durationSeconds: listenElapsedSeconds.value,
      durationText: formatListenDuration(listenElapsedSeconds.value),
      startedAt: listenStartedAt.value,
      sharedAt: Date.now(),
    },
  });
  sharePanelOpen.value = false;
  listenDetailOpen.value = false;
}

function toggleQueueSelectMode() {
  queueSelectMode.value = !queueSelectMode.value;
  selectedQueueIds.value = [];
}

function toggleQueueSelection(songId) {
  selectedQueueIds.value = selectedQueueIds.value.includes(songId)
    ? selectedQueueIds.value.filter(id => id !== songId)
    : [...selectedQueueIds.value, songId];
}

function toggleSelectAllQueue() {
  selectedQueueIds.value = allQueueSelected.value ? [] : playList.value.map(song => song.id);
}

function deleteSelectedQueue() {
  removeFromList(selectedQueueIds.value);
  selectedQueueIds.value = [];
  if (!playList.value.length) queueSelectMode.value = false;
}

function clearListAndSelection() {
  clearList();
  selectedQueueIds.value = [];
  queueSelectMode.value = false;
}

function setLyricLineRef(el, index) {
  if (el) lyricLineRefs.value[index] = el;
}

function parseLyrics(text) {
  const lines = String(text || '').split('\n').map(line => line.trim()).filter(Boolean);
  const parsed = [];
  lines.forEach(line => {
    const matches = [...line.matchAll(/\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\]/g)];
    const content = line.replace(/\[[^\]]+\]/g, '').trim();
    if (!matches.length) {
      if (content) parsed.push({ time: parsed.length ? parsed[parsed.length - 1].time + 4 : 0, text: content });
      return;
    }
    matches.forEach(match => {
      const minute = Number(match[1]) || 0;
      const second = Number(match[2]) || 0;
      const ms = Number((match[3] || '0').padEnd(3, '0')) || 0;
      parsed.push({ time: minute * 60 + second + ms / 1000, text: content || ' ' });
    });
  });
  return parsed.sort((a, b) => a.time - b.time);
}

function scrollLyric() {
  const box = lyricScroller.value;
  const active = lyricLineRefs.value[activeLyricIndex.value];
  if (!box || !active) return;
  const targetTop = active.offsetTop - box.offsetTop - (box.clientHeight / 2) + (active.clientHeight / 2);
  box.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
}

function formatDuration(ms) {
  const total = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const minute = Math.floor(total / 60);
  const second = String(total % 60).padStart(2, '0');
  return `${minute}:${second}`;
}

function formatListenDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hour = Math.floor(total / 3600);
  const minute = Math.floor((total % 3600) / 60);
  const second = total % 60;
  if (hour) return `${hour}小时${String(minute).padStart(2, '0')}分${String(second).padStart(2, '0')}秒`;
  if (minute) return `${minute}分${String(second).padStart(2, '0')}秒`;
  return `${second}秒`;
}

function coverStyle(url) {
  return url ? { backgroundImage: `url('${url}')` } : null;
}

function roleInitial(role) {
  return role.avatarText || String(role.name || '角').slice(0, 1);
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
.music-app { position:absolute; inset:0; z-index:18; overflow:hidden; border-radius:40px; background:#f6f6f6; color:#151515; font-family:inherit; animation:music-screen-in .34s cubic-bezier(.2,.9,.2,1) both; }
button { border:none; cursor:pointer; font-family:inherit; }
button:disabled { cursor:not-allowed; opacity:.48; }
.music-head { position:relative; z-index:5; display:grid; grid-template-columns:62px minmax(0,1fr) 62px; align-items:center; padding:54px 15px 12px; background:#fff; border-bottom:1px solid #ececec; animation:head-drop .32s cubic-bezier(.2,.9,.2,1) both; }
.text-btn { height:32px; border-radius:16px; background:#f2f2f2; color:#222; font-size:13px; transition:transform .18s ease, background .18s ease; }
.text-btn:active, .round-btn:active, .icon-btn:active, .search-shell button:active { transform:scale(.94); }
.round-btn { justify-self:end; width:34px; height:34px; border-radius:50%; background:#ff3b30; color:#fff; font-weight:800; transition:transform .18s ease, box-shadow .18s ease; box-shadow:0 7px 18px rgba(255,59,48,.25); }
.round-btn svg { width:19px; height:19px; display:block; margin:auto; fill:currentColor; }
.music-brand { min-width:0; text-align:center; display:flex; flex-direction:column; gap:2px; }
.music-brand strong { font-size:21px; letter-spacing:.5px; }
.music-brand span { color:#7b7b7b; font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.music-body { position:absolute; inset:110px 0 96px; overflow-y:auto; padding:12px 12px 18px; scroll-behavior:smooth; }
.music-body::-webkit-scrollbar, .lyric-list::-webkit-scrollbar { width:0; }
.panel-enter { animation:panel-rise .38s cubic-bezier(.2,.9,.2,1) both; animation-delay:var(--delay); }
.search-shell { display:flex; align-items:center; gap:8px; height:42px; padding:0 8px 0 13px; border-radius:21px; background:#fff; border:0 !important; outline:0 !important; box-shadow:none !important; transition:transform .2s ease; }
.search-shell:focus-within { transform:translateY(-1px); border:0 !important; outline:0 !important; box-shadow:none !important; }
.search-shell span { color:#a4a4a4; font-weight:800; }
.search-shell input, .search-shell input:hover, .search-shell input:focus, .search-shell input:focus-visible, .search-shell input:active { all:unset !important; display:block !important; flex:1 1 auto !important; min-width:0 !important; border:0 !important; border-width:0 !important; border-style:none !important; outline:0 !important; box-shadow:none !important; background:transparent !important; background-color:transparent !important; background-image:none !important; color:#111 !important; font:inherit !important; font-size:13px !important; appearance:none !important; -webkit-appearance:none !important; }
.search-shell button { height:30px; padding:0 12px; border-radius:15px; background:#ff3b30; color:#fff; font-size:12px; font-weight:700; transition:transform .18s ease; }
.notice-card { margin-top:10px; padding:10px 12px; border-radius:15px; background:#fff1f0; color:#b32822; border:1px solid #ffd1cf; font-size:12px; line-height:1.45; }
.now-card { display:grid; grid-template-columns:108px minmax(0,1fr); gap:13px; margin-top:12px; padding:12px; border-radius:24px; background:#fff; border:1px solid #e9e9e9; box-shadow:0 10px 22px rgba(0,0,0,.06); }
.cover-large { width:108px; height:108px; border-radius:22px; background:#1c1c1c; color:#fff; display:flex; align-items:center; justify-content:center; background-size:cover; background-position:center; box-shadow:inset 0 0 0 1px rgba(0,0,0,.04); transition:transform .32s ease, box-shadow .32s ease; }
.cover-large.playing { transform:scale(1.015); box-shadow:0 10px 26px rgba(0,0,0,.13); }
.cover-large span { font-size:42px; font-weight:900; }
.now-info { min-width:0; display:flex; flex-direction:column; justify-content:center; }
.now-info > span { color:#ff3b30; font-size:11px; font-weight:800; }
.now-info h1 { margin:5px 0 4px; font-size:20px; line-height:1.25; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.now-info p { margin:0; color:#707070; font-size:12px; line-height:1.45; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.listen-role { display:grid; grid-template-columns:30px 1fr auto; align-items:center; gap:7px; margin-top:10px; padding:7px; border-radius:14px; background:#f7f7f7; color:#151515; animation:fade-in .24s ease both; text-align:left; transition:transform .18s ease, background .18s ease; }
.listen-role:active { transform:scale(.98); }
.role-avatar { width:30px; height:30px; border-radius:12px; background:#ff3b30; color:#fff; display:flex; align-items:center; justify-content:center; background-size:cover; background-position:center; font-weight:800; font-style:normal; }
.listen-role strong { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; }
.listen-role em { color:#ff3b30; font-size:10px; font-style:normal; }
.lyric-card, .result-panel { margin-top:12px; border-radius:22px; background:#fff; border:1px solid #e9e9e9; box-shadow:0 8px 18px rgba(0,0,0,.04); overflow:hidden; }
.lyric-card header, .result-panel header { display:flex; justify-content:space-between; align-items:center; padding:12px 13px 8px; }
.lyric-card header strong, .result-panel header strong { font-size:16px; }
.lyric-card header span, .result-panel header span { color:#9a9a9a; font-size:11px; }
.lyric-list { max-height:172px; overflow-y:auto; padding:0 14px; scroll-behavior:smooth; overscroll-behavior:contain; }
.lyric-list p { margin:0; padding:6px 0; color:#7c7c7c; font-size:13px; line-height:1.45; transition:color .18s ease, font-size .18s ease, transform .18s ease; }
.lyric-list p.active { color:#ff3b30; font-size:15px; font-weight:800; transform:translateX(2px); }
.lyric-spacer { height:62px; padding:0 !important; }
.empty-lyric { padding:22px 14px 26px; color:#9a9a9a; font-size:13px; text-align:center; }
.result-list { display:flex; flex-direction:column; padding:0 8px 9px; }
.song-row { display:grid; grid-template-columns:46px minmax(0,1fr) 42px; gap:9px; align-items:center; width:100%; padding:8px; border-radius:16px; background:transparent; text-align:left; color:#151515; transition:background .18s ease, transform .18s ease; }
.song-row:hover, .song-row.active { background:#fff0ef; }
.song-row:active { transform:scale(.985); }
.song-cover, .mini-cover, .queue-cover { background:#202020; color:#fff; background-size:cover; background-position:center; display:flex; align-items:center; justify-content:center; font-weight:900; }
.song-cover { width:46px; height:46px; border-radius:14px; }
.song-main { min-width:0; display:flex; flex-direction:column; gap:4px; }
.song-main strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:14px; }
.song-main span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#777; font-size:11px; }
.song-row em { color:#999; font-size:11px; font-style:normal; text-align:right; }
.empty-result { padding:28px 16px 32px; text-align:center; color:#777; }
.empty-result strong { display:block; margin-bottom:6px; color:#222; font-size:16px; }
.empty-result p { margin:0; font-size:12px; line-height:1.5; }
.player-bar { position:absolute; left:0; right:0; bottom:0; z-index:6; padding:10px 13px 25px; background:#fff; border-top:1px solid #e8e8e8; box-shadow:0 -10px 24px rgba(0,0,0,.08); animation:player-in .36s cubic-bezier(.2,.9,.2,1) both; }
.mini-line { display:grid; grid-template-columns:42px minmax(0,1fr) 34px 38px 34px; align-items:center; gap:8px; }
.mini-cover { width:42px; height:42px; border-radius:15px; transition:transform .28s ease; }
.mini-cover.playing { animation:cover-pulse 1.9s ease-in-out infinite; }
.mini-title { min-width:0; display:flex; flex-direction:column; gap:3px; }
.mini-title strong, .mini-title span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.mini-title strong { font-size:13px; }
.mini-title span { color:#7d7d7d; font-size:11px; }
.icon-btn { height:32px; min-width:32px; border-radius:16px; background:#f2f2f2; color:#222; font-size:16px; font-weight:800; transition:transform .18s ease, background .18s ease; }
.icon-btn svg, .list-actions svg, .queue-check svg { width:18px; height:18px; display:block; margin:auto; fill:currentColor; }
.play-toggle { height:36px; min-width:36px; border-radius:18px; background:#ff3b30; color:#fff; font-size:15px; box-shadow:0 7px 16px rgba(255,59,48,.25); }
.progress-line { display:grid; grid-template-columns:38px 1fr 38px; align-items:center; gap:8px; margin-top:8px; }
.progress-line time { color:#8c8c8c; font-size:10px; text-align:center; }
.progress-line input { width:100%; accent-color:#ff3b30; }
.modal-mask { position:absolute; inset:0; z-index:14; display:flex; align-items:center; justify-content:center; padding:20px; background:rgba(0,0,0,.38); }
.modal-card { width:100%; max-height:76%; overflow-y:auto; padding:16px; border-radius:24px; background:#fff; color:#171717; box-shadow:0 18px 42px rgba(0,0,0,.24); animation:modal-pop .18s ease both; }
.modal-card header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.modal-card h2 { margin:0; font-size:18px; }
.modal-card header button { width:30px; height:30px; border-radius:50%; background:#f1f1f1; }
.list-actions { display:flex; gap:8px; }
.list-actions button { display:flex; align-items:center; justify-content:center; color:#222; }
.list-actions button:disabled { opacity:.38; }
.role-list, .queue-list { display:flex; flex-direction:column; gap:8px; }
.role-list button { display:grid; grid-template-columns:38px minmax(0,1fr) auto; align-items:center; gap:9px; padding:9px; border-radius:16px; background:#f6f6f6; color:#151515; text-align:left; }
.role-list button.active, .queue-row.active { background:#fff0ef; border:1px solid #ffd0cc; }
.role-list .role-avatar { width:38px; height:38px; border-radius:14px; }
.role-list strong { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:14px; }
.role-list em { color:#ff3b30; font-size:11px; font-style:normal; }
.queue-row { display:grid; grid-template-columns:38px minmax(0,1fr) 42px; align-items:center; gap:9px; padding:9px; border-radius:16px; background:#f6f6f6; color:#151515; text-align:left; transition:background .18s ease, transform .18s ease; }
.queue-row.selecting { grid-template-columns:24px 38px minmax(0,1fr) 42px; }
.queue-row.selected { background:#fff0ef; border:1px solid #ffd0cc; }
.queue-check { width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:#fff; border:1px solid #d8d8d8; color:#ff3b30; }
.queue-cover { width:38px; height:38px; border-radius:14px; }
.queue-row strong { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px; }
.queue-row em { color:#999; font-size:11px; font-style:normal; text-align:right; }
.clear-role { display:block !important; grid-template-columns:1fr !important; text-align:center !important; background:#171717 !important; color:#fff !important; font-weight:800; }
.no-role { padding:22px 16px; border-radius:18px; background:#f6f6f6; color:#777; text-align:center; font-size:13px; line-height:1.5; }
.listen-detail-hero { display:flex; flex-direction:column; align-items:center; gap:8px; padding:18px 12px; border-radius:20px; background:#f7f7f7; text-align:center; }
.detail-avatar { width:58px; height:58px; border-radius:20px; font-size:20px; }
.listen-detail-hero span { color:#777; font-size:12px; }
.listen-detail-hero strong { color:#ff3b30; font-size:28px; line-height:1.1; }
.listen-detail-hero p { margin:0; color:#555; font-size:12px; line-height:1.45; }
.detail-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:12px; }
.detail-actions button { height:38px; border-radius:15px; background:#ff3b30; color:#fff; font-weight:800; }
.detail-actions button + button { background:#171717; }
.share-target-list { display:flex; flex-direction:column; gap:8px; }
.share-target-list button { display:grid; grid-template-columns:38px minmax(0,1fr) auto; align-items:center; gap:9px; padding:9px; border-radius:16px; background:#f6f6f6; color:#151515; text-align:left; }
.share-target-list strong { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:14px; }
.share-target-list em { color:#ff3b30; font-size:11px; font-style:normal; }
.fade-slide-enter-active, .fade-slide-leave-active, .card-rise-enter-active, .card-rise-leave-active, .modal-fade-enter-active, .modal-fade-leave-active { transition:opacity .22s ease, transform .24s cubic-bezier(.2,.9,.2,1); }
.fade-slide-enter-from, .fade-slide-leave-to { opacity:0; transform:translateY(-8px); }
.card-rise-enter-from, .card-rise-leave-to { opacity:0; transform:translateY(16px) scale(.98); }
.modal-fade-enter-from, .modal-fade-leave-to { opacity:0; transform:scale(.985); }
.song-row-enter-active, .song-row-leave-active { transition:opacity .22s ease, transform .24s cubic-bezier(.2,.9,.2,1); }
.song-row-enter-from, .song-row-leave-to { opacity:0; transform:translateY(8px); }
@keyframes music-screen-in { from { opacity:0; transform:translateY(18px) scale(.985); } to { opacity:1; transform:translateY(0) scale(1); } }
@keyframes head-drop { from { opacity:0; transform:translateY(-16px); } to { opacity:1; transform:translateY(0); } }
@keyframes panel-rise { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
@keyframes player-in { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
@keyframes modal-pop { from { opacity:0; transform:scale(.96); } to { opacity:1; transform:scale(1); } }
@keyframes fade-in { from { opacity:0; } to { opacity:1; } }
@keyframes cover-pulse { 0%, 100% { transform:scale(1); } 50% { transform:scale(1.045); } }
</style>
