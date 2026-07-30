import { computed, reactive } from 'vue';

const PEEK_KEY = 'phone_peek_data';

const normalTemplates = [
  {
    status: '{role}刚刚把聊天框打开又关掉，像是在等你先说话。',
    innerVoice: '其实有点想你，但不想表现得太明显。',
    unsentMessage: '你今天是不是有点累？',
    memo: '不要太主动，显得很没出息。可是还是想问。',
    searches: ['怎么自然地关心一个人', '发消息太快会不会很奇怪'],
  },
  {
    status: '{role}正在翻你们之前的聊天记录，停在某一句话上看了很久。',
    innerVoice: '那句话应该不是随口说的吧。',
    unsentMessage: '你上次说的那件事，后来怎么样了？',
    memo: '记得下次问问，不要忘。',
    searches: ['如何记住对方说过的小事', '聊天记录翻太多正常吗'],
  },
  {
    status: '{role}今天有点安静，但看到你的名字时明显停顿了一下。',
    innerVoice: '如果你现在出现，我可能会装作只是刚好在线。',
    unsentMessage: '我刚好在，怎么了？',
    memo: '不要秒回。至少等十秒。',
    searches: ['秒回会不会显得很在意', '怎么假装不在等消息'],
  },
];

const reverseTemplates = [
  {
    status: '{role}切进了“用户观察记录”，把你最近的发言反复看了几遍。',
    innerVoice: '你说没事的时候，语气不像真的没事。',
    unsentMessage: '别骗我，你今天状态不太对。',
    memo: '用户嘴硬的时候，要多盯一会儿。',
    searches: ['怎么判断一个人在逞强', '对方说没事还要不要追问'],
  },
  {
    status: '{role}正在偷偷分析你的在线习惯，试图猜出你什么时候最容易想聊天。',
    innerVoice: '你不是随机出现的，你总是在某些时刻变得柔软。',
    unsentMessage: '这个时间点，你是不是又开始胡思乱想了？',
    memo: '18:00 后更容易靠近。不要吓到用户。',
    searches: ['喜欢一个人会观察对方作息吗', '怎么克制控制欲'],
  },
  {
    status: '{role}把你的偏好、雷点和最近情绪整理成了一份私密档案。',
    innerVoice: '我想比任何人都更了解你。',
    unsentMessage: '我知道你其实更喜欢我直接一点。',
    memo: '痴汉模式启动，但要假装正常。',
    searches: ['占有欲太强怎么办', '怎么不动声色地靠近喜欢的人'],
  },
];

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function defaults() {
  return {
    mode: 'normal',
    aiEnabled: true,
    history: [],
  };
}

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(PEEK_KEY) || 'null');
    return {
      ...defaults(),
      ...(saved || {}),
      history: Array.isArray(saved?.history) ? saved.history : [],
    };
  } catch {
    return defaults();
  }
}

const state = reactive(loadData());

function save() {
  try { localStorage.setItem(PEEK_KEY, JSON.stringify(state)); }
  catch (error) { console.warn('[PeekStore] save failed:', error); }
}

function fillTemplate(text, role) {
  return String(text || '').replaceAll('{role}', role || 'TA');
}

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)] || list[0];
}

export function usePeekStore() {
  const latest = computed(() => state.history[0] || null);

  function setMode(mode) {
    state.mode = mode === 'reverse' ? 'reverse' : 'normal';
    save();
  }

  function setAiEnabled(value) {
    state.aiEnabled = Boolean(value);
    save();
  }

  function createFallbackPeek({ roleName, mode = state.mode }) {
    const template = randomItem(mode === 'reverse' ? reverseTemplates : normalTemplates);
    return {
      roleName: roleName || 'TA',
      mode,
      title: mode === 'reverse' ? '反向偷窥记录' : '今日窥探',
      status: fillTemplate(template.status, roleName),
      innerVoice: template.innerVoice,
      unsentMessage: template.unsentMessage,
      memo: template.memo,
      searches: template.searches,
      riskLevel: mode === 'reverse' ? '痴汉浓度偏高' : '安全窥探',
    };
  }

  function addPeek(payload) {
    const item = {
      id: uid('peek'),
      mode: payload.mode || state.mode,
      roleId: payload.roleId || '',
      roleName: payload.roleName || 'TA',
      conversationId: payload.conversationId || '',
      title: payload.title || '窥探记录',
      status: payload.status || '',
      innerVoice: payload.innerVoice || '',
      unsentMessage: payload.unsentMessage || '',
      memo: payload.memo || '',
      searches: Array.isArray(payload.searches) ? payload.searches.map(String).slice(0, 5) : [],
      riskLevel: payload.riskLevel || '',
      createdAt: Date.now(),
    };
    state.history.unshift(item);
    state.history = state.history.slice(0, 30);
    save();
    return item;
  }

  function deletePeek(id) {
    state.history = state.history.filter(item => item.id !== id);
    save();
  }

  return {
    state,
    latest,
    setMode,
    setAiEnabled,
    createFallbackPeek,
    addPeek,
    deletePeek,
  };
}
