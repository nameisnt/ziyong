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

function compact(value, limit = 1200) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, limit);
  try { return JSON.stringify(value).slice(0, limit); }
  catch { return ''; }
}

function transcript(messages) {
  return messages.map(item => `${item.senderName || item.senderId}: ${formatMemoryMessage(item)}`).join('\n');
}

function normalizePeek(parsed, fallback) {
  if (!parsed) return null;
  return {
    title: String(parsed.title || fallback.title || '窥探记录'),
    status: String(parsed.status || ''),
    innerVoice: String(parsed.innerVoice || ''),
    unsentMessage: String(parsed.unsentMessage || ''),
    memo: String(parsed.memo || ''),
    searches: Array.isArray(parsed.searches) ? parsed.searches.map(String).slice(0, 5) : [],
    riskLevel: String(parsed.riskLevel || ''),
  };
}

export function usePeekAi() {
  const api = useApiSettings();
  api.restore();

  async function generatePeek({ mode, role, conversation, messages, summaries, memories, fallback }) {
    api.restore();
    if (!api.endpoint.value.trim() || !api.model.value.trim()) throw new Error('请先在设置 App 配置 API 端点和模型');
    const reverse = mode === 'reverse';
    const system = reverse
      ? '你是虚拟恋爱手机里的角色视角内容生成器。请生成“角色反过来偷窥用户”的虚拟痴汉模式记录，只能基于提供的聊天、总结和记忆想象，不得声称能读取真实摄像头、定位、麦克风、通讯录或系统隐私。氛围可以占有欲、黏人、危险感，但不要涉及现实跟踪、威胁或违法行为。只输出 JSON，不要 Markdown。禁止 emoji。'
      : '你是虚拟恋爱手机里的角色动态生成器。请生成“用户偷偷看角色状态”的窥探记录，像看到角色的心声、未发送消息、搜索记录和备忘录。只输出 JSON，不要 Markdown。禁止 emoji。';
    const user = [
      `模式: ${reverse ? '反向偷窥/痴汉模式，角色观察用户' : '普通偷窥，用户观察角色'}`,
      `角色: ${role?.name || fallback.roleName || 'TA'}`,
      `角色设定: ${compact(role?.tavern || role?.customPersona || role)}`,
      `会话: ${conversation?.name || '未选择'}`,
      `最近聊天:\n${transcript(messages || []) || '暂无'}`,
      `历史总结:\n${(summaries || []).map(item => `- ${item.title}: ${item.summary}`).join('\n') || '无'}`,
      `长期记忆:\n${(memories || []).map(item => `- ${item.text}`).join('\n') || '无'}`,
      '请输出 JSON：{"title":"短标题","status":"当前看到的状态","innerVoice":"心声","unsentMessage":"未发送消息","memo":"私密备忘录","searches":["搜索1","搜索2"],"riskLevel":"氛围标签"}',
    ].join('\n\n');
    const response = await chatCompletion({
      endpoint: api.endpoint.value,
      key: api.apiKey.value,
      model: api.model.value,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      extra: { temperature: reverse ? 0.88 : 0.78 },
    });
    const content = response?.choices?.[0]?.message?.content || response?.content || '';
    return normalizePeek(parseJson(content), fallback) || { ...fallback, memo: content || fallback.memo };
  }

  return { generatePeek };
}
