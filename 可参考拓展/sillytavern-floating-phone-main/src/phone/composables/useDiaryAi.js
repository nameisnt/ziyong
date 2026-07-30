import { chatCompletion, useApiSettings } from './useApiSettings.js';
import { formatMemoryMessage } from './useMemoryStore.js';

function parseJson(content) {
  const raw = String(content || '').trim();
  const block = raw.match(/```json\s*([\s\S]*?)```/i) || raw.match(/```\s*([\s\S]*?)```/);
  const candidates = [block?.[1], raw, raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)].filter(Boolean);
  for (const item of candidates) {
    try { return JSON.parse(item); }
    catch {}
  }
  return null;
}

function compact(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'string') return value.slice(0, 1200);
  try { return JSON.stringify(value).slice(0, 1200); }
  catch { return fallback; }
}

function formatTranscript(messages) {
  return messages.map(item => {
    const time = item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN') : '';
    return `${time} ${item.senderName || item.senderId || '未知'}：${formatMemoryMessage(item)}`;
  }).join('\n');
}

function normalizeDraft(parsed, fallbackContent = '') {
  return {
    title: String(parsed?.title || parsed?.suggestedTitle || '今天的小事'),
    content: String(parsed?.content || parsed?.summary || fallbackContent || ''),
    mood: String(parsed?.mood || '平静'),
    tags: Array.isArray(parsed?.tags) ? parsed.tags.map(String).slice(0, 8) : [],
    happenedToday: String(parsed?.happenedToday || parsed?.summary || ''),
  };
}

export function useDiaryAi() {
  const api = useApiSettings();
  api.restore();

  function ensureApi() {
    api.restore();
    if (!api.endpoint.value.trim() || !api.model.value.trim()) throw new Error('请先在设置 App 配置 API 端点和模型');
  }

  async function generateDraftFromConversation({ conversation, messages }) {
    ensureApi();
    const transcript = formatTranscript(messages);
    const response = await chatCompletion({
      endpoint: api.endpoint.value,
      key: api.apiKey.value,
      model: api.model.value,
      messages: [
        { role: 'system', content: '你是一个温柔细腻的日记代写助手。你要根据聊天记录生成一篇“用户第一人称”的日记草稿。不要编造聊天中没有发生的重要事实，可以把情绪、氛围、关系变化写得自然一点。语气像私人日记，不像总结报告。输出合法 JSON，不要 Markdown，不要解释。JSON 格式：{"title":"日记标题","content":"第一人称日记正文","mood":"心情词","tags":["标签1","标签2"],"happenedToday":"今天我们发生了什么的简短摘要"}' },
        { role: 'user', content: `会话名：${conversation?.name || '未命名会话'}\n聊天记录：\n${transcript}` },
      ],
      extra: { temperature: 0.65 },
    });
    const content = response?.choices?.[0]?.message?.content || response?.content || '';
    return normalizeDraft(parseJson(content), content);
  }

  async function generateTodaySummary({ conversations, messagesByConversation }) {
    ensureApi();
    const today = new Date().toDateString();
    const blocks = conversations.map(conversation => {
      const list = (messagesByConversation[conversation.id] || []).filter(item => new Date(item.createdAt || 0).toDateString() === today);
      if (!list.length) return '';
      return `# ${conversation.name}\n${formatTranscript(list)}`;
    }).filter(Boolean).join('\n\n');
    if (!blocks) return { summary: '今天还没有可以写进日记的聊天。', suggestedTitle: '安静的一天', mood: '平静', tags: ['日常'] };
    const response = await chatCompletion({
      endpoint: api.endpoint.value,
      key: api.apiKey.value,
      model: api.model.value,
      messages: [
        { role: 'system', content: '你是一个擅长整理日常回忆的日记助手。请根据今天的聊天记录，写一段温柔的“今天我们发生了什么”。用第一人称或“我们”的视角，像日记里的回忆，不像会议纪要。保留重要事件、情绪波动、关系互动。不要编造没有出现的事实。输出合法 JSON，不要 Markdown。格式：{"summary":"今天我们发生了什么","suggestedTitle":"适合作为日记标题的短标题","mood":"心情词","tags":["标签1","标签2"]}' },
        { role: 'user', content: `今天的聊天记录：\n${blocks}` },
      ],
      extra: { temperature: 0.6 },
    });
    const content = response?.choices?.[0]?.message?.content || response?.content || '';
    const parsed = parseJson(content);
    return {
      summary: String(parsed?.summary || content || ''),
      suggestedTitle: String(parsed?.suggestedTitle || parsed?.title || '今天我们发生了什么'),
      mood: String(parsed?.mood || '温柔'),
      tags: Array.isArray(parsed?.tags) ? parsed.tags.map(String).slice(0, 8) : [],
    };
  }

  async function generateRoleComment({ role, entry }) {
    ensureApi();
    const response = await chatCompletion({
      endpoint: api.endpoint.value,
      key: api.apiKey.value,
      model: api.model.value,
      messages: [
        { role: 'system', content: '你不是 AI 助手。你正在扮演指定角色，读完用户的一篇私人日记后，在日记下方留下一条短评论。评论要符合角色人设、语气、关系和说话习惯。不要总结全文，不要像老师批改作文。像真实亲近的人留下的小纸条。可以温柔、吐槽、心疼、撒娇或认真，但必须符合角色。不要输出 Markdown。只输出评论正文。' },
        { role: 'user', content: [`角色姓名：${role?.name || '角色'}`, `来源：${role?.source || 'custom'}`, `酒馆设定：${compact(role?.tavern, '无')}`, `追加人设：${role?.enableCustomPersona ? role.customPersona : '未开启'}`, `当前心声：${role?.mood || '无'}`, `日记日期：${entry.date}`, `日记标题：${entry.title}`, `心情：${entry.mood || '无'}`, `正文：${entry.content}`].join('\n') },
      ],
      extra: { temperature: 0.85 },
    });
    return String(response?.choices?.[0]?.message?.content || response?.content || '').trim();
  }

  return { generateDraftFromConversation, generateTodaySummary, generateRoleComment };
}
