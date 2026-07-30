import { chatCompletion, useApiSettings } from './useApiSettings.js';

const ROLE_APP_STORAGE_KEY = 'phone_role_app_selection_v1';
const PET_REPLY_LIMIT = 6;

function compact(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'string') return value.slice(0, 900);
  try { return JSON.stringify(value).slice(0, 900); }
  catch { return fallback; }
}

function tryParseJson(text) {
  try { return JSON.parse(text); }
  catch {}
  const match = String(text || '').match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); }
  catch { return null; }
}

function normalizeMood(mood) {
  return ['idle', 'walk', 'happy', 'angry', 'shy', 'sad', 'thinking'].includes(mood) ? mood : 'idle';
}

function normalizeReplies(parsed, fallbackText = '') {
  const source = Array.isArray(parsed?.messages) ? parsed.messages : [];
  const replies = source.slice(0, PET_REPLY_LIMIT).map(item => ({
    text: String(item?.text || '').trim(),
    mood: normalizeMood(item?.mood),
  })).filter(item => item.text);
  if (replies.length) return replies;
  return fallbackText ? [{ text: String(fallbackText).trim() || '……', mood: 'idle' }] : [{ text: '……', mood: 'idle' }];
}

function loadRoleAppSelection() {
  try {
    const saved = JSON.parse(localStorage.getItem(ROLE_APP_STORAGE_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return { user: null, worldBooks: [], worldBookEntries: [] };
    const worldBooks = Array.isArray(saved.worldBooks) ? saved.worldBooks : [];
    const activeWorldBookIds = Array.isArray(saved.activeWorldBookIds) ? saved.activeWorldBookIds : [];
    const activeWorldBookEntryIds = Array.isArray(saved.activeWorldBookEntryIds) ? saved.activeWorldBookEntryIds : [];
    const activeBooks = worldBooks
      .filter(book => activeWorldBookIds.includes(book.id))
      .map(book => ({ ...book, entries: (book.entries || []).filter(entry => activeWorldBookEntryIds.includes(entry.id)) }))
      .filter(book => book.entries.length);
    const user = saved.userPersona && (saved.userPersona.name || saved.userPersona.description)
      ? { name: saved.userPersona.name || 'user', description: saved.userPersona.description || '' }
      : null;
    return {
      user,
      worldBooks: activeBooks,
      worldBookEntries: activeBooks.flatMap(book => (book.entries || []).map(entry => ({ ...entry, bookName: book.name }))),
    };
  } catch (error) {
    console.warn('[PetAi] role app selection load failed:', error);
    return { user: null, worldBooks: [], worldBookEntries: [] };
  }
}

function formatWorldBookEntries(entries = []) {
  const list = Array.isArray(entries) ? entries.filter(item => item?.content) : [];
  if (!list.length) return '无已启用条目';
  return list.slice(0, 30).map((entry, index) => [
    `#${index + 1} ${entry.bookName || '世界书'} / ${entry.name || '未命名条目'}`,
    entry.keys?.length ? `关键词: ${entry.keys.join('、')}` : '',
    `内容: ${String(entry.content || '').slice(0, 1200)}`,
  ].filter(Boolean).join('\n')).join('\n\n');
}

function formatHistory(messages = []) {
  return messages.slice(-40).map(item => `${item.senderType === 'pet' ? '桌宠' : '用户'}：${item.text || ''}`).join('\n') || '暂无';
}

export function usePetAi() {
  const api = useApiSettings();
  api.restore();

  async function requestReply({ role, history, latestText, signal }) {
    api.restore();
    if (!api.endpoint.value.trim() || !api.model.value.trim()) throw new Error('请先在设置 App 填写 API 端点并选择模型');
    if (!role) throw new Error('请先选择一个信息 App 里的角色作为桌宠');

    const roleApp = loadRoleAppSelection();
    const system = `你不是 AI 助手，你正在扮演一个桌面宠物。桌宠身份来自用户在信息 App 中创建的角色。你需要用该角色的人设、说话习惯、关系设定回应用户。回复要短、自然、有陪伴感，像桌宠在屏幕上对用户说话。不要提到“信息 App”“记忆 App”“系统提示”等实现细节。不要输出 Markdown。不要输出思维链。只输出合法 JSON。输出格式：{"messages":[{"text":"桌宠说的话","mood":"idle | happy | angry | shy | sad | thinking | walk"}]}。规则：messages 最多 ${PET_REPLY_LIMIT} 条；text 不要太长，每条适合放进小气泡；mood 应根据语气选择。`;
    const roleBlock = [
      `id: ${role.id}`,
      `姓名: ${role.name}`,
      `来源: ${role.source}`,
      `酒馆设定: ${compact(role.tavern)}`,
      role.enableCustomPersona ? `追加人设: ${role.customPersona}` : '追加人设: 未开启',
      `当前心声: ${role.mood || '无'}`,
    ].join('\n');
    const userPrompt = [
      `User 设定:\n${compact(roleApp.user, '无')}`,
      `桌宠角色:\n${roleBlock}`,
      `已启用世界书条目（必须作为当前设定参考，未列出的条目视为未启用）:\n${formatWorldBookEntries(roleApp.worldBookEntries)}`,
      `最近桌宠聊天（独立历史，不属于任何 App）:\n${formatHistory(history)}`,
      `用户刚刚对桌宠说:\n${latestText}`,
    ].join('\n\n');

    const result = await chatCompletion({
      endpoint: api.endpoint.value,
      key: api.apiKey.value,
      model: api.model.value,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
      extra: { temperature: 0.85 },
      signal,
    });

    const content = result?.choices?.[0]?.message?.content || result?.message?.content || result?.content || '';
    const parsed = tryParseJson(content);
    return normalizeReplies(parsed, content);
  }

  return { requestReply };
}
