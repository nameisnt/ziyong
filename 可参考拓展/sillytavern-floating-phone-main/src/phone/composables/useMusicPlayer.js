import { computed, ref } from 'vue';
import { useMusicApi } from './useMusicApi.js';

const STATE_KEY = 'phone_music_state';
const modes = ['order', 'single', 'random'];
const modeNames = { order: '顺序播放', single: '单曲循环', random: '随机播放' };

const musicApi = useMusicApi();
const audio = typeof Audio !== 'undefined' ? new Audio() : null;

const keyword = ref('');
const results = ref([]);
const playList = ref([]);
const currentSong = ref(null);
const audioUrl = ref('');
const lyricText = ref('');
const searching = ref(false);
const loadingSong = ref(false);
const playing = ref(false);
const searched = ref(false);
const message = ref('');
const mode = ref('order');
const selectedRoleId = ref('');
const listenStartedAt = ref(0);
const listenElapsedSeconds = ref(0);
const currentTime = ref(0);
const duration = ref(0);

let restored = false;
let listenTimer = null;

if (audio) {
  audio.preload = 'metadata';
  audio.addEventListener('timeupdate', () => { currentTime.value = audio.currentTime || 0; });
  audio.addEventListener('loadedmetadata', () => { duration.value = audio.duration || currentSong.value?.duration / 1000 || 0; });
  audio.addEventListener('play', () => { playing.value = true; });
  audio.addEventListener('pause', () => { playing.value = false; });
  audio.addEventListener('ended', onEnded);
  audio.addEventListener('error', () => {
    playing.value = false;
    message.value = '音频加载失败，当前资源暂时不可播放。';
  });
}

const modeLabel = computed(() => modeNames[mode.value] || modeNames.order);
const hasPlayableSong = computed(() => Boolean(currentSong.value && audioUrl.value));
const islandTitle = computed(() => currentSong.value?.name || '网抑云');
const islandStatus = computed(() => playing.value ? '正在播放' : (currentSong.value ? '已暂停' : '待机'));

function loadState() {
  try { return JSON.parse(localStorage.getItem(STATE_KEY) || 'null') || {}; }
  catch { return {}; }
}

function saveState() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify({
      mode: mode.value,
      currentSong: currentSong.value,
      selectedRoleId: selectedRoleId.value,
      listenStartedAt: listenStartedAt.value,
      listenElapsedSeconds: listenElapsedSeconds.value,
      keyword: keyword.value,
      playList: playList.value.slice(0, 80),
    }));
  } catch (error) {
    console.warn('[MusicPlayer] state save failed:', error);
  }
}

function restore() {
  if (restored) return;
  restored = true;
  const state = loadState();
  if (modes.includes(state.mode)) mode.value = state.mode;
  if (state.keyword) keyword.value = state.keyword;
  if (state.selectedRoleId) selectedRoleId.value = state.selectedRoleId;
  if (state.listenStartedAt && state.selectedRoleId) {
    listenStartedAt.value = Number(state.listenStartedAt) || Date.now();
    listenElapsedSeconds.value = Number(state.listenElapsedSeconds) || 0;
    ensureListenTimer();
  }
  if (Array.isArray(state.playList)) playList.value = state.playList.filter(song => song?.id).slice(0, 80);
  if (state.currentSong?.id) {
    currentSong.value = state.currentSong;
    results.value = [state.currentSong];
    if (!playList.value.some(song => song.id === state.currentSong.id)) playList.value.unshift(state.currentSong);
    loadSongAssets(state.currentSong, false);
  }
}

async function search() {
  const key = keyword.value.trim();
  if (!key || searching.value) return;
  searching.value = true;
  searched.value = true;
  message.value = '';
  try {
    results.value = await musicApi.searchSongs(key);
    if (!results.value.length) message.value = '没有搜到歌曲资源。';
    saveState();
  } catch (error) {
    results.value = [];
    message.value = error.message || '搜索失败，请稍后再试。';
  } finally {
    searching.value = false;
  }
}

async function selectSong(song, autoplay = true) {
  if (!song?.id || loadingSong.value) return;
  currentSong.value = song;
  currentTime.value = 0;
  duration.value = song.duration ? song.duration / 1000 : 0;
  addToList(song, false);
  await loadSongAssets(song, autoplay);
  saveState();
}

async function loadSongAssets(song, autoplay) {
  loadingSong.value = true;
  message.value = '正在获取播放资源...';
  audioUrl.value = '';
  lyricText.value = '';
  if (audio) {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }
  playing.value = false;
  try {
    const [urlResult, lyricResult] = await Promise.allSettled([
      musicApi.getSongUrl(song),
      musicApi.getLyric(song),
    ]);
    if (urlResult.status === 'fulfilled') audioUrl.value = urlResult.value.url || '';
    if (lyricResult.status === 'fulfilled') lyricText.value = lyricResult.value.lyric || lyricResult.value.translatedLyric || '';
    if (!audioUrl.value) {
      message.value = '这首歌暂时无法播放，可能是资源限制或接口不可用。';
      return;
    }
    if (audio) audio.src = audioUrl.value;
    message.value = '';
    if (autoplay) await playAudio();
  } catch (error) {
    message.value = error.message || '获取歌曲资源失败。';
  } finally {
    loadingSong.value = false;
  }
}

async function playAudio() {
  if (!audio || !audioUrl.value) return;
  try {
    await audio.play();
    playing.value = true;
  } catch (error) {
    playing.value = false;
    message.value = '浏览器阻止自动播放，请手动点击播放。';
  }
}

function togglePlay() {
  if (!audio || !audioUrl.value) return;
  if (playing.value) {
    audio.pause();
    playing.value = false;
  } else {
    playAudio();
  }
}

function seek(value) {
  const nextTime = Number(value) || 0;
  if (!audio) return;
  audio.currentTime = nextTime;
  currentTime.value = nextTime;
}

function onEnded() {
  playing.value = false;
  if (mode.value === 'single') {
    if (audio) audio.currentTime = 0;
    playAudio();
    return;
  }
  playNext();
}

function getActiveQueue() {
  return playList.value.length ? playList.value : results.value;
}

function playNext() {
  const queue = getActiveQueue();
  if (!queue.length || !currentSong.value) return;
  const currentIndex = queue.findIndex(song => song.id === currentSong.value.id);
  let nextIndex = currentIndex + 1;
  if (mode.value === 'random') nextIndex = Math.floor(Math.random() * queue.length);
  if (nextIndex >= queue.length || nextIndex < 0) nextIndex = 0;
  selectSong(queue[nextIndex], true);
}

function cycleMode() {
  const index = modes.indexOf(mode.value);
  mode.value = modes[(index + 1) % modes.length];
  saveState();
}

function addToList(song, persist = true) {
  if (!song?.id) return;
  if (!playList.value.some(item => item.id === song.id)) playList.value.push(song);
  if (persist) saveState();
}

function clearList() {
  playList.value = [];
  saveState();
}

function removeFromList(songIds = []) {
  const selected = new Set(songIds);
  if (!selected.size) return;
  playList.value = playList.value.filter(song => !selected.has(song.id));
  saveState();
}

function setSelectedRole(roleId) {
  const nextRoleId = roleId || '';
  if (nextRoleId && nextRoleId === selectedRoleId.value && listenStartedAt.value) return;
  selectedRoleId.value = nextRoleId;
  if (nextRoleId) {
    listenStartedAt.value = Date.now();
    listenElapsedSeconds.value = 0;
    ensureListenTimer();
  } else {
    listenStartedAt.value = 0;
    listenElapsedSeconds.value = 0;
    stopListenTimer();
  }
  saveState();
}

function clearInvalidRole(validIds = []) {
  if (selectedRoleId.value && !validIds.includes(selectedRoleId.value)) setSelectedRole('');
}

function updateListenElapsed() {
  if (!selectedRoleId.value || !playing.value) return;
  listenElapsedSeconds.value += 1;
  saveState();
}

function ensureListenTimer() {
  if (listenTimer || !selectedRoleId.value) return;
  listenTimer = setInterval(updateListenElapsed, 1000);
}

function stopListenTimer() {
  if (!listenTimer) return;
  clearInterval(listenTimer);
  listenTimer = null;
}

export function useMusicPlayer() {
  restore();
  return {
    keyword,
    results,
    playList,
    currentSong,
    audioUrl,
    lyricText,
    searching,
    loadingSong,
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
    islandTitle,
    islandStatus,
    search,
    selectSong,
    togglePlay,
    seek,
    cycleMode,
    addToList,
    clearList,
    removeFromList,
    setSelectedRole,
    clearInvalidRole,
    saveState,
  };
}
