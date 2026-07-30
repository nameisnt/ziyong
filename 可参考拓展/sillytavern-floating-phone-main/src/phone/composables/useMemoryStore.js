import { computed, reactive } from 'vue';

const MEMORY_KEY = 'phone_memory_data';

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function defaults() {
  return {
    settings: {
      autoSummaryEnabled: false,
      autoSummaryEveryMessages: 30,
      vectorMemoryEnabled: true,
      maxRecentMessagesForSummary: 80,
    },
    summaries: [],
    vectorMemories: [],
    checkpoints: {},
  };
}

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(MEMORY_KEY) || 'null');
    return {
      ...defaults(),
      ...(saved || {}),
      settings: { ...defaults().settings, ...(saved?.settings || {}) },
      summaries: Array.isArray(saved?.summaries) ? saved.summaries : [],
      vectorMemories: Array.isArray(saved?.vectorMemories) ? saved.vectorMemories : [],
      checkpoints: saved?.checkpoints || {},
    };
  } catch {
    return defaults();
  }
}

const state = reactive(loadData());

function save() {
  try { localStorage.setItem(MEMORY_KEY, JSON.stringify(state)); }
  catch (error) { console.warn('[MemoryStore] save failed:', error); }
}

function normalizeKeywords(value) {
  return Array.isArray(value) ? value.map(item => String(item).trim()).filter(Boolean).slice(0, 10) : [];
}

export function formatMemoryMessage(item) {
  if (item.type === 'text' || item.type === 'system') return item.text || '';
  if (item.type === 'voice') return `[语音] ${item.text || ''}`;
  if (item.type === 'sticker') return `[表情] ${item.sticker?.name || ''}`;
  if (item.type === 'redpacket') return `[红包] ${item.redpacket?.title || ''}`;
  if (item.type === 'gift') return `[礼物] ${item.gift?.name || ''} ${item.gift?.text || ''}`;
  if (item.type === 'weather') return `[天气] ${item.weather?.city || ''} ${item.weather?.condition || ''}`;
  if (item.type === 'shopping_share' || item.type === 'shopping_gift') return `[商品] ${item.shopping?.title || ''} ${item.shopping?.intro || ''}`;
  if (item.type === 'music_listen_share') return `[一起听歌] ${item.music?.songName || ''} ${item.music?.artist || ''}`;
  if (item.type === 'browser_ai_search_share') return `[AI搜索] ${item.browserSearch?.keyword || ''} ${item.browserSearch?.summary || ''}`;
  return `[${item.type}] ${item.text || ''}`;
}

export function useMemoryStore() {
  const summaryCount = computed(() => state.summaries.length);
  const vectorCount = computed(() => state.vectorMemories.length);

  function updateSettings(patch) {
    Object.assign(state.settings, patch);
    state.settings.autoSummaryEveryMessages = Math.max(1, Number(state.settings.autoSummaryEveryMessages) || 30);
    state.settings.maxRecentMessagesForSummary = Math.max(10, Number(state.settings.maxRecentMessagesForSummary) || 80);
    save();
  }

  function addSummary(payload) {
    const summary = {
      id: uid('summary'),
      conversationId: payload.conversationId,
      conversationName: payload.conversationName || '未命名会话',
      mode: payload.mode || 'manual',
      title: payload.title || '聊天总结',
      summary: payload.summary || '',
      keywords: normalizeKeywords(payload.keywords),
      importantFacts: Array.isArray(payload.importantFacts) ? payload.importantFacts.map(String).slice(0, 8) : [],
      relationshipProgress: payload.relationshipProgress || '',
      todo: Array.isArray(payload.todo) ? payload.todo.map(String).slice(0, 8) : [],
      messageCount: Number(payload.messageCount) || 0,
      fromMessageId: payload.fromMessageId || '',
      toMessageId: payload.toMessageId || '',
      createdAt: Date.now(),
    };
    state.summaries.unshift(summary);
    save();
    return summary;
  }

  function addVectorMemories(payload) {
    const list = Array.isArray(payload.memories) ? payload.memories : [];
    const created = list.map(item => ({
      id: uid('memory'),
      conversationId: payload.conversationId,
      conversationName: payload.conversationName || '未命名会话',
      text: String(item?.text || '').trim(),
      keywords: normalizeKeywords(item?.keywords),
      importance: Math.max(1, Math.min(5, Number(item?.importance) || 1)),
      sourceMessageIds: Array.isArray(payload.sourceMessageIds) ? payload.sourceMessageIds : [],
      createdAt: Date.now(),
    })).filter(item => item.text);
    state.vectorMemories.unshift(...created);
    save();
    return created;
  }

  function deleteSummary(id) {
    state.summaries = state.summaries.filter(item => item.id !== id);
    save();
  }

  function deleteVectorMemory(id) {
    state.vectorMemories = state.vectorMemories.filter(item => item.id !== id);
    save();
  }

  function clearConversationMemory(conversationId) {
    if (!conversationId) return;
    state.summaries = state.summaries.filter(item => item.conversationId !== conversationId);
    state.vectorMemories = state.vectorMemories.filter(item => item.conversationId !== conversationId);
    delete state.checkpoints[conversationId];
    save();
  }

  function updateCheckpoint(conversationId, messages = []) {
    state.checkpoints[conversationId] = {
      lastSummarizedMessageId: messages[messages.length - 1]?.id || '',
      lastSummarizedCount: messages.length,
    };
    save();
  }

  function getPendingAutoSummary(conversation) {
    const checkpoint = state.checkpoints[conversation.id] || { lastSummarizedCount: 0 };
    const count = Number(conversation.messageCount) || 0;
    return Math.max(0, count - (Number(checkpoint.lastSummarizedCount) || 0));
  }

  function getConversationSummaries(conversationId, limit = 3) {
    return state.summaries.filter(item => item.conversationId === conversationId).slice(0, limit);
  }

  function getRelevantMemories(conversationId, latestText = '', limit = 5) {
    const text = String(latestText || '').toLowerCase();
    return state.vectorMemories
      .map(item => {
        const sameConversation = item.conversationId === conversationId ? 4 : 0;
        const keywordHit = item.keywords.reduce((score, keyword) => score + (text && text.includes(String(keyword).toLowerCase()) ? 2 : 0), 0);
        return { item, score: sameConversation + keywordHit + Number(item.importance || 1) };
      })
      .filter(row => row.item.conversationId === conversationId || row.score > Number(row.item.importance || 1))
      .sort((a, b) => b.score - a.score || (b.item.createdAt || 0) - (a.item.createdAt || 0))
      .slice(0, limit)
      .map(row => row.item);
  }

  return {
    state,
    summaryCount,
    vectorCount,
    updateSettings,
    addSummary,
    addVectorMemories,
    deleteSummary,
    deleteVectorMemory,
    clearConversationMemory,
    updateCheckpoint,
    getPendingAutoSummary,
    getConversationSummaries,
    getRelevantMemories,
    save,
  };
}
