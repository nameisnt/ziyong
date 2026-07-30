import { chatCompletion, useApiSettings } from './useApiSettings.js';
import { createInspectId, getInspectOption } from './useInspectStore.js';

function compact(value, limit = 1200) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value.slice(0, limit);
  try { return JSON.stringify(value).slice(0, limit); }
  catch { return ''; }
}

function tryParseJson(text) {
  try { return JSON.parse(text); }
  catch {}
  const match = String(text || '').match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); }
  catch { return null; }
}

function sampleRecords(option, roleName) {
  const now = new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const base = { time: now };
  const map = {
    chat: [
      { target: '置顶联系人', preview: `“${roleName} 现在不在，晚点再说。”`, time: '22:18' },
      { target: '同事', preview: '明天的资料我已经放好了。', time: '19:42' },
      { target: '朋友', preview: '今天有点累，先不出来了。', time: '昨天' },
      { target: '家人', preview: '到家了，别担心。', time: '周三' },
    ],
    memo: [
      { title: '未发送草稿', detail: '有些话打到一半，又删掉了。', time: '22:05' },
      { title: '备忘', detail: '记得把那件事解释清楚。', time: '昨天' },
    ],
    shopping: [
      { name: '生活用品', status: '运输中', detail: '快递正在前往驿站。', time: now },
      { name: '小礼物', status: '待取件', detail: '已到达附近快递柜。', time: '昨天' },
    ],
    takeout: [{ name: '常点店铺', status: '已送达', detail: '一份简单餐食。', time: '12:36' }],
    browser: [
      { title: '搜索', detail: '怎么把话说得自然一点', time: '21:48' },
      { title: '浏览', detail: '天气预报', time: '18:11' },
    ],
    bill: [{ name: '微信支付', status: '支出', detail: '小额生活消费。', time: '18:25' }],
    call: [
      { target: '联系人', status: '未接', duration: '0秒', time: '20:14' },
      { target: '家人', status: '去电', duration: '3分12秒', time: '昨天' },
    ],
    moments: [{ target: '朋友圈', status: '浏览', detail: '只浏览，没有互动。', time: '21:02' }],
    music: [{ name: '循环歌曲', count: '3次', detail: '最近反复播放。', time: '23:10' }],
    media: [{ name: '未命名作品', progress: '看到一半', detail: '最近有继续观看。', ...base }],
    game: [{ name: '游戏', duration: '32分钟', detail: '短暂登录。', ...base }],
    checkin: [{ title: '签到', status: '正常', location: '常用地点', ...base }],
    travel: [{ location: '常去地点', duration: '约20分钟', detail: '短暂停留。', ...base }],
    exercise: [{ title: '步数', count: '4860步', detail: '轻度活动。', ...base }],
    sleep: [{ title: '睡眠', duration: '7小时', status: '尚可', ...base }],
    charge: [{ title: '充电', duration: '1小时12分', status: '已充满', ...base }],
    private_moment: [{ title: '仅谁可见', target: '自己可见', detail: '一条只开放给特定对象的动态。', ...base }],
    pinned: [{ target: '置顶联系人', detail: '置顶列表较稳定。', ...base }],
    blocked: [{ target: '拉黑联系人', detail: '黑名单里保留着一个旧联系人。', ...base }],
    map: [{ location: '地图搜索地址', detail: '与日常行程相符。', ...base }],
  };
  return map[option.id] || [{ title: option.name, detail: option.description, ...base }];
}

function fallbackItem(option, roleName) {
  return {
    title: option.name,
    summary: `${option.name}记录`,
    records: sampleRecords(option, roleName),
  };
}

function normalizeRecordTime(time) {
  if (!time) return time;
  const currentYear = new Date().getFullYear();
  const text = String(time);
  return text.replace(/(^|[^\d])2023(?=年|[-/.]|[^\d]|$)/g, `$1${currentYear}`);
}

function normalizeRecords(records) {
  return records.slice(0, 5).map(record => {
    if (!record || typeof record !== 'object') return record;
    return { ...record, time: normalizeRecordTime(record.time) };
  });
}

function normalizeResult(parsed, { role, selectedIds }) {
  const items = {};
  selectedIds.forEach(id => {
    const option = getInspectOption(id);
    if (!option) return;
    const source = parsed?.items?.[id] || {};
    const records = Array.isArray(source.records) && source.records.length ? source.records : sampleRecords(option, role.name);
    items[id] = {
      title: source.title || option.name,
      summary: source.summary || fallbackItem(option, role.name).summary,
      records: normalizeRecords(records),
    };
  });
  return {
    id: createInspectId(),
    roleId: role.id,
    roleName: role.name,
    roleAvatar: role.avatar || '',
    selectedItemIds: selectedIds,
    createdAt: Date.now(),
    summary: parsed?.summary || `${role.name} 的 ${selectedIds.length} 项查岗记录`,
    mood: parsed?.mood || '',
    items,
  };
}

export function useInspectAi() {
  const api = useApiSettings();
  api.restore();

  async function generateInspect({ role, selectedIds, conversation, messages, roleAppData }) {
    const selectedOptions = selectedIds.map(getInspectOption).filter(Boolean);
    const fallback = normalizeResult(null, { role, selectedIds });
    if (!api.endpoint.value || !api.model.value) return fallback;

    const deviceNow = new Date();
    const currentYear = deviceNow.getFullYear();
    const currentDateText = deviceNow.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

    const system = `你正在生成一个虚构手机查岗结果。只输出合法 JSON，不输出 Markdown、解释或思维链。不要评价、分析或总结是否异常，只生成与查岗选项贴近的原始记录内容。聊天记录就输出聊天记录，购物记录就输出订单/快递记录，通话记录就输出通话日志。查岗结果角色本人默认不知道，不得声称读取真实隐私或真实设备。每个选项 records 最多 5 条。当前用户设备时间是 ${currentDateText}。如果 records.time 需要包含年份，年份必须贴近当前设备年份 ${currentYear}；除非上下文明确说明历史事件，否则禁止默认使用 2023 年。`;
    const prompt = [
      `被查岗角色: ${role.name}`,
      `当前设备时间: ${currentDateText}`,
      `角色设定: ${compact(role.tavern || role.customPersona || role)}`,
      `当前开启角色卡/世界书: ${compact(roleAppData)}`,
      `私聊会话: ${compact(conversation)}`,
      `最近聊天记录(不包含记忆):\n${messages.slice(-80).map(item => `${item.senderName || item.senderId}: ${item.text || item.type}`).join('\n')}`,
      `查岗项目: ${selectedOptions.map(item => `${item.id}=${item.name}(${item.description})`).join('；')}`,
      '输出格式: {"summary":"本次生成了哪些记录","mood":"","items":{"选项id":{"title":"选项标题","summary":"记录标题","records":[{"title":"","name":"","target":"","time":"","status":"","duration":"","count":"","location":"","progress":"","detail":"","preview":""}]}}}',
    ].join('\n\n');

    try {
      const result = await chatCompletion({
        endpoint: api.endpoint.value,
        key: api.apiKey.value,
        model: api.model.value,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        extra: { temperature: 0.82 },
      });
      const content = result?.choices?.[0]?.message?.content || result?.message?.content || result?.content || '';
      return normalizeResult(tryParseJson(content), { role, selectedIds });
    } catch (error) {
      console.warn('[InspectAi] generate failed:', error);
      return fallback;
    }
  }

  return { generateInspect };
}
