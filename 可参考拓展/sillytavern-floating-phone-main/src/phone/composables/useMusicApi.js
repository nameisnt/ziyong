const CLOUD_MUSIC_API = 'https://netease-cloud-music-api-five-roan-88.vercel.app';
const TIMEOUT_MS = 12000;

async function requestJson(path, params = {}) {
  const url = new URL(path, CLOUD_MUSIC_API);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });
  url.searchParams.set('timestamp', Date.now());

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    if (!response.ok) throw new Error(`接口请求失败：${response.status}`);
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('音乐接口响应超时');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeArtist(song) {
  const artists = song.artists || song.ar || [];
  return artists.map(item => item.name).filter(Boolean).join(' / ') || '未知歌手';
}

function normalizeAlbum(song) {
  return song.album?.name || song.al?.name || '未知专辑';
}

function normalizeCover(song) {
  return song.album?.picUrl || song.al?.picUrl || '';
}

function normalizeSong(song) {
  return {
    id: String(song.id),
    name: song.name || '未知歌曲',
    artist: normalizeArtist(song),
    album: normalizeAlbum(song),
    cover: normalizeCover(song),
    duration: Number(song.duration || song.dt) || 0,
  };
}

function pickPlayableUrl(data) {
  const item = Array.isArray(data?.data) ? data.data.find(option => option?.url) : null;
  return item?.url || '';
}

export function useMusicApi() {
  async function searchSongs(keyword) {
    const key = String(keyword || '').trim();
    if (!key) return [];
    const data = await requestJson('/cloudsearch', { keywords: key, limit: 20, type: 1 });
    const songs = data?.result?.songs || [];
    if (!Array.isArray(songs)) return [];
    return songs.map(normalizeSong);
  }

  async function getSongUrl(song) {
    if (!song?.id) return { url: '' };
    const data = await requestJson('/song/url/v1', { id: song.id, level: 'standard' });
    return { url: pickPlayableUrl(data) };
  }

  async function getLyric(song) {
    if (!song?.id) return { lyric: '', translatedLyric: '' };
    const data = await requestJson('/lyric', { id: song.id });
    return {
      lyric: data?.lrc?.lyric || '',
      translatedLyric: data?.tlyric?.lyric || '',
    };
  }

  return { searchSongs, getSongUrl, getLyric };
}
