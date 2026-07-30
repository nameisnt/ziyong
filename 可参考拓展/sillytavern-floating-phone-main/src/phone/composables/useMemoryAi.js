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

function buildTranscript(messages) {
  return messages.map(item => {
    const time = item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN') : '';
    return `${time} ${item.senderName || item.senderId || '未知'}：${formatMemoryMessage(item)}`;
  }).join('\n');
}

export function useMemoryAi() {
  const api = useApiSettings();
  api.restore();

  function ensureApi() {
    api.restore();
    if (!api.endpoint.value.trim() || !api.model.value.trim()) throw new Error('请先在设置 App 配置 API 端点和模型');
  }

  async function summarizeConversation({ conversation, messages }) {
    ensureApi();
    const transcript = buildTranscript(messages);
    const response = await chatCompletion({
      endpoint: api.endpoint.value,
      key: api.apiKey.value,
      model: api.model.value,
      messages: [
        { role: 'system', content: '你是聊天记忆整理助手。请把聊天记录整理成稳定、可复用的记忆摘要。不要编造不存在的信息。重点保留：人物关系、称呼、承诺、偏好、重要事件、情绪变化、待办事项。输出 JSON，不要 Markdown。' },
        { role: 'user', content: `会话名：${conversation.name}\n请总结以下聊天记录，输出格式：{"title":"简短标题","summary":"300字以内的总结","keywords":["关键词1","关键词2"],"importantFacts":["事实1","事实2"],"relationshipProgress":"关系变化","todo":["待办1"]}\n\n聊天记录：\n${transcript}` },
      ],
      extra: { temperature: 0.45 },
    });
    const content = response?.choices?.[0]?.message?.content || response?.content || '';
    const parsed = parseJson(content);
    if (!parsed) return { title: '聊天总结', summary: String(content || '').trim(), keywords: [], importantFacts: [], relationshipProgress: '', todo: [] };
    return {
      title: String(parsed.title || '聊天总结'),
      summary: String(parsed.summary || content || ''),
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      importantFacts: Array.isArray(parsed.importantFacts) ? parsed.importantFacts : [],
      relationshipProgress: String(parsed.relationshipProgress || ''),
      todo: Array.isArray(parsed.todo) ? parsed.todo : [],
    };
  }

  async function extractVectorMemories({ conversation, messages, summaries = [] }) {
    ensureApi();
    const transcript = buildTranscript(messages);
    const summaryBlock = summaries.map(item => `- ${item.title}: ${item.summary}`).join('\n');
    const response = await chatCompletion({
      endpoint: api.endpoint.value,
      key: api.apiKey.value,
      model: api.model.value,
      messages: [
        { role: 'system', content: '你是长期记忆提取器。请从聊天记录中提取未来对话真正需要记住的信息。只保留稳定事实、偏好、关系、约定、重要事件。不要保存临时寒暄。输出 JSON，不要 Markdown。' },
        { role: 'user', content: `会话名：${conversation.name}\n已有总结：\n${summaryBlock || '无'}\n\n请从以下聊天记录提取长期记忆，输出格式：{"memories":[{"text":"一条完整、明确的长期记忆","keywords":["关键词1","关键词2"],"importance":1}]}\nimportance 范围 1-5，5 最重要。\n聊天记录：\n${transcript}` },
      ],
      extra: { temperature: 0.35 },
    });
    const content = response?.choices?.[0]?.message?.content || response?.content || '';
    const parsed = parseJson(content);
    if (!parsed) return { memories: [{ text: String(content || '').trim(), keywords: [], importance: 1 }].filter(item => item.text) };
    return { memories: Array.isArray(parsed.memories) ? parsed.memories : [] };
  }

  return { summarizeConversation, extractVectorMemories };
}
