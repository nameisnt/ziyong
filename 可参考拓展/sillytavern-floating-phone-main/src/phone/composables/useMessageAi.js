import { chatCompletion, useApiSettings } from './useApiSettings.js';
import { useMemoryStore } from './useMemoryStore.js';
import { BUILTIN_STICKER_PACKS } from './useMessageStore.js';
import { useScheduleStore } from './useScheduleStore.js';

function compact(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'string') return value.slice(0, 900);
  try { return JSON.stringify(value).slice(0, 900); }
  catch { return fallback; }
}

const CONTEXT_LIMIT = 1000;

function buildStickerGuide() {
  return BUILTIN_STICKER_PACKS.map(pack => `${pack.name}: ${pack.stickers.map(item => item.name).join('、')}`).join('\n');
}

function tryParseJson(text) {
  try { return JSON.parse(text); }
  catch {}
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); }
  catch { return null; }
}

function normalizeAiMessages(parsed, fallbackRole) {
  const source = Array.isArray(parsed?.messages) ? parsed.messages : [];
  return source.slice(0, 6).map(item => ({
    senderId: item.senderId || fallbackRole?.id,
    type: ['text', 'voice', 'sticker', 'redpacket', 'transfer', 'gift'].includes(item.type) ? item.type : 'text',
    text: item.text || '',
    duration: Math.max(1, Math.min(60, Number(item.duration) || 4)),
    sticker: item.sticker || null,
    redpacket: item.redpacket || null,
    transfer: item.transfer || null,
    gift: item.gift || null,
    mood: item.mood || '',
  })).filter(item => item.text || item.sticker || item.redpacket || item.transfer || item.gift);
}

function findSticker(sticker) {
  const packName = sticker?.pack || sticker?.packName;
  const stickerName = sticker?.name || sticker?.text;
  if (!stickerName) return null;
  const packs = packName
    ? BUILTIN_STICKER_PACKS.filter(pack => pack.name === packName || pack.id === packName)
    : BUILTIN_STICKER_PACKS;
  const foundPack = packs.find(pack => pack.stickers.some(item => item.name === stickerName));
  const foundSticker = foundPack?.stickers.find(item => item.name === stickerName);
  return foundSticker ? { pack: foundPack.name, name: foundSticker.name, url: foundSticker.url } : null;
}

function historyMessageText(item) {
  if (item.type === 'text' || item.type === 'system') return item.text || '';
  if (item.type === 'sticker') {
    const sticker = findSticker(item.sticker) || findSticker({ name: item.sticker?.name });
    const pack = sticker?.pack || item.sticker?.pack || '表情包';
    const name = sticker?.name || item.sticker?.name || item.text || '未知表情';
    return `[表情] 套装：${pack}；内容：${name}`;
  }
  if (item.type === 'image') return item.image?.fake
    ? `[图片] 用户发送了一张图片，画面内容：${item.image?.description || item.text || ''}`
    : `[真实图片] ${item.image?.description || item.text || '用户发送了一张真实图片，见随后的图片内容。'}`;
  if (item.type === 'redpacket') return `[红包] 标题：${item.redpacket?.title || ''}；金额：${item.redpacket?.amountText || ''}`;
  if (item.type === 'transfer') return `[转账] 金额：${item.transfer?.amountText || ''}；备注：${item.transfer?.note || '转账'}；状态：${({ accepted: '已收款', rejected: '已拒收', pending: '已收款' })[item.transfer?.status || 'pending']}`;
  if (item.type === 'interaction') return `[互动] ${item.interaction?.text || item.text || item.interaction?.label || ''}`;
  if (item.type === 'mood_card') return `[心情卡片] 用户当前心情：${item.moodCard?.label || ''}；说明：${item.moodCard?.text || item.text || ''}`;
  if (item.type === 'shopping_share') return `[商品分享] 标题：${item.shopping?.title || ''}；价格：${item.shopping?.priceText || ''}；用途：${item.shopping?.usage || ''}；简介：${item.shopping?.intro || ''}`;
  if (item.type === 'shopping_gift') return `[商品赠予] 标题：${item.shopping?.title || ''}；价格：${item.shopping?.priceText || ''}；用途：${item.shopping?.usage || ''}；简介：${item.shopping?.intro || ''}`;
  if (item.type === 'inspect_share') return `[查岗转发] 查岗对象：${item.inspect?.roleName || '角色'}；摘要：${item.inspect?.summary || ''}`;
  return `[${item.type}] ${item.text || ''}`;
}

function normalizeReply(reply) {
  if (reply.type !== 'sticker') return reply;
  const sticker = findSticker(reply.sticker) || findSticker({ name: reply.sticker?.name }) || findSticker({ name: reply.text });
  if (!sticker) return { ...reply, type: 'text', text: reply.text || reply.sticker?.name || '……', sticker: null };
  return { ...reply, text: '', sticker };
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

function formatScheduleLine(item) {
  const priority = ({ normal: '普通', important: '重要', urgent: '紧急' })[item.priority] || '普通';
  const type = ({ task: '任务', ddl: 'DDL', anniversary: '纪念日', reminder: '提醒', custom: '其他' })[item.type] || '日程';
  return `- ${item.date}${item.time ? ` ${item.time}` : ''} ${item.title}${item.detail ? `：${item.detail}` : ''}；类型：${type}；优先级：${priority}；状态：${item.done ? '已完成' : '未完成'}`;
}

function formatSchedulePrompt(schedule) {
  const data = schedule.schedulesForPrompt();
  const today = data.today.length ? data.today.map(formatScheduleLine).join('\n') : '无';
  const upcoming = data.upcoming.length ? data.upcoming.map(formatScheduleLine).join('\n') : '无';
  return `用户日程只作为背景信息，不要每次强行提醒。只有当对话自然相关、用户焦虑、时间临近、或角色关心用户时再提。\n今日日程：\n${today}\n近期日程：\n${upcoming}`;
}

export function useMessageAi() {
  const api = useApiSettings();
  const memory = useMemoryStore();
  const schedule = useScheduleStore();
  api.restore();

  async function requestReply({ conversation, roles, user, worldBooks, worldBookEntries, history, signal }) {
    api.restore();
    if (!api.endpoint.value.trim() || !api.model.value.trim()) throw new Error('请先在设置 App 填写 API 端点并选择模型');
    if (conversation.type === 'group' && conversation.speechMode === 'silent') return [];
    const groupRoles = roles.filter(role => conversation.memberIds.includes(role.id));
    const activeRoles = conversation.type === 'private'
      ? roles.slice(0, 1)
      : conversation.speechMode === 'selected'
        ? groupRoles.filter(role => role.id === conversation.selectedSpeakerId).slice(0, 1)
        : groupRoles;
    const fallbackRole = activeRoles[0];

    const groupRule = conversation.type === 'group'
      ? `群聊发言模式：${conversation.speechMode || 'random'}。random=自然选择1-3人；selected=只允许指定角色发言；all=所有可用角色尽量都发言；silent=不发言。成员发言频率参考：${compact(conversation.memberFrequency || {})}`
      : '私聊只允许当前聊天对象回复。';
    const system = `你不是 AI 助手，你正在扮演聊天软件里的角色。只输出合法 JSON，不输出思维链、解释、Markdown。不要复述用户刚说过的话，不要客服腔。对话时禁止输出 emoji。像真实手机聊天一样，可以短句、停顿、分多条消息。可选类型：text、voice、sticker、redpacket、transfer、gift。sticker 必须从内置表情包选择，不得编造 URL。voice 必须有 text 和 1-60 秒 duration。transfer 必须包含 transfer 字段，金额要合理且 amountText 用 ¥x.xx 展示。${groupRule} 角色不能伪造用户当前天气。当用户发送互动卡片或心情卡片时，说明这是强情感触发信号，角色应优先按人设自然回应、陪伴、安抚、撒娇、关心或调侃，不要机械解释卡片含义。输出格式：{"messages":[{"senderId":"角色id","type":"text | voice | sticker | redpacket | transfer | gift","text":"","duration":3,"sticker":{"pack":"套装名","name":"表情名","url":"表情URL"},"redpacket":{"title":"红包标题","amountText":"金额展示文本"},"transfer":{"amountText":"¥1.00","note":"转账备注","status":"pending"},"gift":{"name":"礼物名","text":"附言"},"mood":"当前心声/状态"}]}`;
    const roleBlock = activeRoles.map(role => [
      `id: ${role.id}`,
      `姓名: ${role.name}`,
      `来源: ${role.source}`,
      `酒馆设定: ${compact(role.tavern)}`,
      role.enableCustomPersona ? `追加人设: ${role.customPersona}` : '追加人设: 未开启',
      `当前心声: ${role.mood || '无'}`,
    ].join('\n')).join('\n\n');
    const latestText = history.slice(-8).map(historyMessageText).join('\n');
    const relevantMemories = memory.getRelevantMemories(conversation.id, latestText, 5);
    const recentSummaries = memory.getConversationSummaries(conversation.id, 3);
    const memoryBlock = [
      relevantMemories.length ? `长期记忆:\n${relevantMemories.map(item => `- ${item.text}`).join('\n')}` : '',
      recentSummaries.length ? `历史总结:\n${recentSummaries.map(item => `- ${item.title}: ${item.summary}`).join('\n')}` : '',
    ].filter(Boolean).join('\n');
    const worldBookBlock = formatWorldBookEntries(worldBookEntries?.length ? worldBookEntries : worldBooks?.flatMap(book => (book.entries || []).map(entry => ({ ...entry, bookName: book.name }))));

    const userPrompt = [
      `会话类型: ${conversation.type}`,
      `会话名: ${conversation.name}`,
      `群简介: ${conversation.description || '无'}`,
      `是否包含 user 成员: ${conversation.includeUser ? '是' : '否'}`,
      `User 设定: ${compact(user)}`,
      `已启用世界书条目（必须作为当前设定参考，未列出的条目视为未启用）:\n${worldBookBlock}`,
      `可用角色:\n${roleBlock}`,
      memoryBlock ? `可参考记忆，不要硬塞进回复:\n${memoryBlock}` : '',
      formatSchedulePrompt(schedule),
      `可用表情包:\n${buildStickerGuide()}`,
      `最近聊天，最多 ${CONTEXT_LIMIT} 条，按时间从旧到新排列:\n${history.slice(-CONTEXT_LIMIT).map(item => `${item.senderName || item.senderId}: ${historyMessageText(item)}`).join('\n')}`,
    ].join('\n\n');
    const recentRealImages = history
      .slice(-20)
      .filter(item => item.type === 'image' && !item.image?.fake && item.image?.url)
      .slice(-4);
    const visibleImageContent = recentRealImages.length
      ? [{ type: 'text', text: '下面是真实图片消息，请直接观察图片内容，并结合文字说明理解后回复。' }, ...recentRealImages.flatMap(item => [
        { type: 'text', text: `${item.senderName || '用户'} 发送图片：${item.image?.description || item.text || '无说明'}` },
        { type: 'image_url', image_url: { url: item.image.url } },
      ])]
      : null;

    const result = await chatCompletion({
      endpoint: api.endpoint.value,
      key: api.apiKey.value,
      model: api.model.value,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
        ...(visibleImageContent ? [{ role: 'user', content: visibleImageContent }] : []),
      ],
      extra: { temperature: 0.9 },
      signal,
    });

    const content = result?.choices?.[0]?.message?.content || result?.message?.content || result?.content || '';
    const parsed = tryParseJson(content);
    if (!parsed) return [{ senderId: fallbackRole?.id, type: 'text', text: content || '……', duration: 3, mood: '' }];
    return normalizeAiMessages(parsed, fallbackRole).map(normalizeReply);
  }

  return { requestReply };
}
