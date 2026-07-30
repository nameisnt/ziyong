import { ref } from 'vue';

const CACHE_TTL = 10 * 60 * 1000;
const city = ref('定位中…');
const condition = ref('--');
const temp = ref('--');
const high = ref('--');
const low = ref('--');
const error = ref(null);
let lastLoadedAt = 0;
let loadingPromise = null;

const weatherCodeMap = {
  0:'晴',1:'晴',2:'多云',3:'阴',45:'雾',48:'雾',
  51:'小雨',53:'小雨',55:'小雨',61:'雨',63:'中雨',65:'大雨',
  71:'小雪',73:'雪',75:'大雪',80:'阵雨',81:'阵雨',82:'强阵雨',
  95:'雷雨',96:'雷雨',99:'雷雨'
};

async function reverseGeocode(lat, lon) {
  try {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=zh&count=1`);
    const j = await r.json();
    if (j?.results?.[0]) return j.results[0].name || j.results[0].admin1 || '未知';
  } catch (e) {}
  return '未知';
}

function getLocationByGPS() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject('no geo');
    navigator.geolocation.getCurrentPosition(
      async p => {
        const city = await reverseGeocode(p.coords.latitude, p.coords.longitude);
        resolve({ lat: p.coords.latitude, lon: p.coords.longitude, city });
      },
      err => reject(err),
      { timeout: 8000, maximumAge: 600000 }
    );
  });
}

async function getLocationByIP() {
  const apis = [
    { url: 'https://ipapi.co/json/', map: j => ({ lat: j.latitude, lon: j.longitude, city: j.city || j.region }) },
    { url: 'https://ipwho.is/',      map: j => ({ lat: j.latitude, lon: j.longitude, city: j.city || j.region }) },
    { url: 'https://ipinfo.io/json', map: j => { const [lat, lon] = (j.loc || '').split(','); return { lat: +lat, lon: +lon, city: j.city || j.region }; } },
  ];
  for (const api of apis) {
    try {
      const r = await fetch(api.url);
      if (!r.ok) continue;
      const m = api.map(await r.json());
      if (m.lat && m.lon) return m;
    } catch (e) {}
  }
  throw new Error('all ip apis failed');
}

async function fetchWeatherData(lat, lon) {
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto`);
  return await r.json();
}

export function useWeather() {
  async function load() {
    if (loadingPromise) return loadingPromise;
    if (Date.now() - lastLoadedAt < CACHE_TTL && city.value !== '定位中…') return;

    loadingPromise = doLoad().finally(() => { loadingPromise = null; });
    return loadingPromise;
  }

  async function doLoad() {
    let loc;
    try { loc = await getLocationByGPS(); }
    catch { try { loc = await getLocationByIP(); } catch (e) { city.value = '获取失败'; error.value = e; return; } }
    try {
      const w = await fetchWeatherData(loc.lat, loc.lon);
      city.value = loc.city || '未知';
      temp.value = Math.round(w.current_weather.temperature);
      condition.value = weatherCodeMap[w.current_weather.weathercode] || '--';
      high.value = Math.round(w.daily.temperature_2m_max[0]);
      low.value = Math.round(w.daily.temperature_2m_min[0]);
      lastLoadedAt = Date.now();
    } catch (e) {
      city.value = '天气获取失败';
      error.value = e;
    }
  }

  return { city, condition, temp, high, low, error, load };
}
