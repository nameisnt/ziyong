import { ref } from 'vue';

const SEARCH_API_KEY = 'phone_search_api_settings';

function readSettings() {
  try { return JSON.parse(localStorage.getItem(SEARCH_API_KEY) || 'null') || {}; }
  catch { return {}; }
}

function writeSettings(value) {
  localStorage.setItem(SEARCH_API_KEY, JSON.stringify(value));
}

function normalizeResult(item = {}) {
  return {
    title: String(item.title || item.name || item.headline || '搜索结果'),
    url: String(item.url || item.link || item.displayUrl || ''),
    snippet: String(item.snippet || item.description || item.summary || item.content || ''),
  };
}

function pickResultList(payload) {
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.webPages?.value)) return payload.webPages.value;
  if (Array.isArray(payload?.RelatedTopics)) return flattenDuckTopics(payload.RelatedTopics);
  return [];
}

function flattenDuckTopics(items = []) {
  return items.flatMap(item => Array.isArray(item.Topics) ? flattenDuckTopics(item.Topics) : [item]).filter(item => item?.Text || item?.FirstURL);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json();
}

function withSource(results, source, fallbackUsed = false) {
  return { results, source, fallbackUsed };
}

function isMissingConfig(error) {
  return /请先在设置 App 配置/.test(error?.message || '');
}

async function configuredSearch({ engine, keyword, settings }) {
  const query = String(keyword || '').trim();
  if (!query) return withSource([], '空搜索');

  if (engine === 'google') {
    if (!settings.googleKey || !settings.googleCx) throw new Error('请先在设置 App 配置 Google API Key 和 CX。');
    const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(settings.googleKey)}&cx=${encodeURIComponent(settings.googleCx)}&q=${encodeURIComponent(query)}`;
    const json = await fetchJson(url);
    return withSource(pickResultList(json).map(normalizeResult), 'Google Custom Search');
  }

  if (engine === 'bing') {
    if (!settings.bingKey) throw new Error('请先在设置 App 配置 Bing Search API Key。');
    const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}`;
    const json = await fetchJson(url, { headers: { 'Ocp-Apim-Subscription-Key': settings.bingKey } });
    return withSource(pickResultList(json).map(normalizeResult), 'Bing Web Search');
  }

  if (engine === 'baidu') {
    if (!settings.baiduEndpoint) throw new Error('请先在设置 App 配置百度搜索 API 端点。');
    const encodedQuery = encodeURIComponent(query);
    const encodedKey = encodeURIComponent(settings.baiduKey || '');
    let url = settings.baiduEndpoint.trim()
      .replace(/\{q\}/g, encodedQuery)
      .replace(/\{query\}/g, encodedQuery)
      .replace(/\{key\}/g, encodedKey);
    if (!/[?&](q|wd|query)=/.test(url) && !settings.baiduEndpoint.includes('{q}') && !settings.baiduEndpoint.includes('{query}')) {
      url += `${url.includes('?') ? '&' : '?'}q=${encodedQuery}`;
    }
    const headers = settings.baiduKey ? { Authorization: `Bearer ${settings.baiduKey}`, 'X-API-Key': settings.baiduKey } : {};
    const json = await fetchJson(url, { headers });
    return withSource(pickResultList(json).map(normalizeResult), '百度搜索 API');
  }

  return withSource([], '真实搜索');
}

async function searchSearxng(query) {
  const endpoints = [
    'https://search.inetol.net/search?q={q}&format=json',
    'https://searx.tiekoetter.com/search?q={q}&format=json',
  ];
  for (const endpoint of endpoints) {
    try {
      const json = await fetchJson(endpoint.replace('{q}', encodeURIComponent(query)));
      const results = pickResultList(json).map(normalizeResult).filter(item => item.title || item.url || item.snippet);
      if (results.length) return withSource(results, '免配置 SearXNG', true);
    } catch {}
  }
  return null;
}

async function searchDuckDuckGo(query) {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const json = await fetchJson(url);
  const instant = json.AbstractText ? [{ title: json.Heading || query, url: json.AbstractURL || '', snippet: json.AbstractText }] : [];
  const topics = flattenDuckTopics(json.RelatedTopics || []).map(item => ({ title: item.Text?.split(' - ')[0] || item.Text || 'DuckDuckGo 结果', url: item.FirstURL || '', snippet: item.Text || '' }));
  return withSource([...instant, ...topics].map(normalizeResult).slice(0, 8), '免配置 DuckDuckGo', true);
}

async function searchWikipedia(query) {
  const url = `https://zh.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
  const json = await fetchJson(url);
  const results = (json.query?.search || []).map(item => normalizeResult({
    title: item.title,
    url: `https://zh.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
    snippet: String(item.snippet || '').replace(/<[^>]+>/g, ''),
  }));
  return withSource(results, '免配置 Wikipedia', true);
}

function linkFallback(query, engine) {
  const map = {
    baidu: `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`,
    bing: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
    google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
  };
  return withSource([normalizeResult({ title: `打开${engine === 'baidu' ? '百度' : engine === 'google' ? '谷歌' : '必应'}搜索`, url: map[engine] || map.bing, snippet: '免配置搜索源暂时不可用，可打开真实搜索页面查看结果。' })], '真实搜索链接', true);
}

export async function searchWeb({ engine, keyword, settings }) {
  const query = String(keyword || '').trim();
  if (!query) return withSource([], '空搜索');

  try {
    return await configuredSearch({ engine, keyword: query, settings });
  } catch (error) {
    if (!isMissingConfig(error)) console.warn('[SearchApi] configured search failed:', error);
  }

  const fallbackSearches = [searchSearxng, searchDuckDuckGo, searchWikipedia];
  for (const search of fallbackSearches) {
    try {
      const result = await search(query);
      if (result?.results?.length) return result;
    } catch (error) {
      console.warn('[SearchApi] fallback failed:', error);
    }
  }

  return linkFallback(query, engine);
}

export function useSearchApiSettings() {
  const googleKey = ref('');
  const googleCx = ref('');
  const bingKey = ref('');
  const baiduEndpoint = ref('');
  const baiduKey = ref('');

  function restore() {
    const saved = readSettings();
    googleKey.value = saved.googleKey || '';
    googleCx.value = saved.googleCx || '';
    bingKey.value = saved.bingKey || '';
    baiduEndpoint.value = saved.baiduEndpoint || '';
    baiduKey.value = saved.baiduKey || '';
  }

  function save() {
    writeSettings({
      googleKey: googleKey.value,
      googleCx: googleCx.value,
      bingKey: bingKey.value,
      baiduEndpoint: baiduEndpoint.value,
      baiduKey: baiduKey.value,
    });
  }

  function snapshot() {
    return {
      googleKey: googleKey.value.trim(),
      googleCx: googleCx.value.trim(),
      bingKey: bingKey.value.trim(),
      baiduEndpoint: baiduEndpoint.value.trim(),
      baiduKey: baiduKey.value.trim(),
    };
  }

  restore();
  return { googleKey, googleCx, bingKey, baiduEndpoint, baiduKey, restore, save, snapshot };
}
