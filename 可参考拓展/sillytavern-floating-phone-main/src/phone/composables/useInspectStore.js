import { reactive } from 'vue';

const INSPECT_KEY = 'phone_inspect_result_v1';

export const INSPECT_OPTIONS = [
  { id: 'chat', name: '聊天记录', group: '社交关系', description: '角色和其他人的聊天记录' },
  { id: 'memo', name: '备忘录', group: '社交关系', description: '草稿箱和未发送内容记录' },
  { id: 'shopping', name: '网购记录', group: '消费生活', description: '快递在途中、签收、待取件记录' },
  { id: 'takeout', name: '外卖记录', group: '消费生活', description: '外卖下单和配送记录' },
  { id: 'browser', name: '浏览器记录', group: '内容娱乐', description: '搜索、浏览、收藏网页' },
  { id: 'bill', name: '微信账单流水', group: '消费生活', description: '账单流水和亲属卡情况' },
  { id: 'call', name: '通话记录', group: '社交关系', description: '来电、去电、未接、拒接和时长' },
  { id: 'moments', name: '朋友圈互动', group: '社交关系', description: '看过谁的朋友圈以及互动' },
  { id: 'music', name: '听歌记录', group: '内容娱乐', description: '歌曲、循环次数和最近播放' },
  { id: 'media', name: '追剧观影记录', group: '内容娱乐', description: '剧集、电影、小说进度' },
  { id: 'game', name: '游戏登录记录', group: '内容娱乐', description: '游戏名称和登录时间' },
  { id: 'checkin', name: '打卡记录', group: '行为轨迹', description: '上班或上课签到' },
  { id: 'travel', name: '行程记录', group: '行为轨迹', description: '去过哪里和停留时间' },
  { id: 'exercise', name: '步数运动记录', group: '行为轨迹', description: '步数、运动和消耗' },
  { id: 'sleep', name: '睡眠记录', group: '行为轨迹', description: '入睡、醒来和睡眠状态' },
  { id: 'charge', name: '充电记录', group: '行为轨迹', description: '充电时间始末' },
  { id: 'private_moment', name: '仅谁可见', group: '社交关系', description: '哪条朋友圈仅谁可见' },
  { id: 'pinned', name: '置顶联系人', group: '社交关系', description: '置顶联系人列表' },
  { id: 'blocked', name: '拉黑联系人', group: '社交关系', description: '拉黑联系人列表' },
  { id: 'map', name: '地图搜索', group: '行为轨迹', description: '地图搜索过的地址' },
];

function loadResult() {
  try { return JSON.parse(localStorage.getItem(INSPECT_KEY) || 'null'); }
  catch { return null; }
}

function saveResult(result) {
  try { localStorage.setItem(INSPECT_KEY, JSON.stringify(result)); }
  catch (error) { console.warn('[InspectStore] save failed:', error); }
}

const state = reactive({ result: loadResult() });

export function createInspectId() {
  return `inspect_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getInspectOption(id) {
  return INSPECT_OPTIONS.find(option => option.id === id) || null;
}

export function useInspectStore() {
  function setResult(result) {
    state.result = result;
    saveResult(result);
  }

  function clearResult() {
    state.result = null;
    try { localStorage.removeItem(INSPECT_KEY); }
    catch {}
  }

  return { state, options: INSPECT_OPTIONS, setResult, clearResult };
}
