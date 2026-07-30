<template>
  <section class="landlord-app">
    <header class="landlord-top">
      <button class="soft-btn" type="button" @click="requestClose">返回</button>
      <div>
        <h1>斗地主</h1>
        <span>{{ modeLabel }} · {{ difficultyLabel }}</span>
      </div>
      <button class="soft-btn" type="button" @click="showTutorial = true">教程</button>
    </header>

    <main v-if="game.state.phase === 'setup'" class="setup-screen">
      <section class="setup-card hero-card">
        <h2>开一桌牌</h2>
        <p>选择三人经典局或四人刺激局，拉已添加角色上桌，也可以用随机路人补位。</p>
      </section>

      <section class="setup-card">
        <div class="section-title"><strong>人数模式</strong><span>四人局使用两副牌</span></div>
        <div class="seg-row">
          <button type="button" :class="{ active: setupMode === 3 }" @click="setMode(3)">三人局</button>
          <button type="button" :class="{ active: setupMode === 4 }" @click="setMode(4)">四人局</button>
        </div>
      </section>

      <section class="setup-card">
        <div class="section-title"><strong>难度</strong><span>{{ difficultyHelp }}</span></div>
        <div class="difficulty-grid">
          <button v-for="item in difficulties" :key="item.id" type="button" :class="{ active: difficulty === item.id }" @click="difficulty = item.id">{{ item.name }}</button>
        </div>
      </section>

      <section class="setup-card">
        <div class="section-title"><strong>牌友席位</strong><span>你固定坐第一席</span></div>
        <article class="seat-row user-seat">
          <div class="mini-avatar" :style="avatarStyle(userAvatar)"><span v-if="!userAvatar">我</span></div>
          <div><strong>你</strong><span>用户玩家</span></div>
        </article>
        <article v-for="(seat, index) in seats" :key="index" class="seat-row">
          <div class="mini-avatar" :style="avatarStyle(seat.avatar)"><span v-if="!seat.avatar">{{ seat.avatarText }}</span></div>
          <select :value="seat.key" @change="changeSeat(index, $event.target.value)">
            <option value="random">随机路人</option>
            <option v-for="role in roleOptions" :key="role.key" :value="role.key">{{ role.name }}</option>
          </select>
          <button type="button" @click="changeSeat(index, 'random')">路人</button>
        </article>
      </section>

      <button class="start-btn" type="button" @click="startGame">开始游戏</button>
    </main>

    <main v-else class="table-screen">
      <section class="opponents" :class="`count-${opponents.length}`">
        <article v-for="player in opponents" :key="player.id" class="player-seat" :class="{ active: currentPlayer?.id === player.id, landlord: player.isLandlord }">
          <div class="mini-avatar" :style="avatarStyle(player.avatar)"><span v-if="!player.avatar">{{ player.avatarText }}</span></div>
          <strong>{{ player.name }}</strong>
          <span>{{ player.isLandlord ? '地主' : '农民' }} · {{ player.hand.length }} 张</span>
        </article>
      </section>

      <section class="table-center">
        <div class="bottom-cards">
          <span v-for="card in game.state.bottomCards" :key="card.id">{{ card.label }}</span>
        </div>
        <Transition name="card-pop" mode="out-in">
          <div v-if="game.state.currentTrick" :key="game.state.currentTrick.cards.map(card => card.id).join('-')" class="trick-card" :class="{ bomb: game.state.lastAction === 'bomb' }">
            <b>{{ game.state.currentTrick.playerName }}</b>
            <div class="played-cards">
              <span v-for="card in game.state.currentTrick.cards" :key="card.id" :class="cardClass(card)">{{ card.label }}</span>
            </div>
            <em>{{ game.comboName(game.state.currentTrick.combo) }}</em>
          </div>
          <div v-else class="trick-card empty">{{ game.state.message }}</div>
        </Transition>
      </section>

      <section class="message-bar">{{ game.state.message }}</section>

      <article class="user-info" :class="{ active: currentPlayer?.type === 'user', landlord: userPlayer?.isLandlord }">
        <div class="mini-avatar" :style="avatarStyle(userPlayer?.avatar || userAvatar)"><span v-if="!(userPlayer?.avatar || userAvatar)">我</span></div>
        <div><strong>你</strong><span>{{ userPlayer?.isLandlord ? '地主' : '农民' }} · {{ userPlayer?.hand.length || 0 }} 张</span></div>
      </article>

      <section v-if="game.state.phase === 'bidding'" class="action-bar">
        <button v-if="currentPlayer?.type === 'user'" type="button" @click="userBid(false)">不叫</button>
        <button v-if="currentPlayer?.type === 'user'" class="primary" type="button" @click="userBid(true)">叫地主</button>
        <span v-else>{{ currentPlayer?.name }} 正在考虑...</span>
      </section>

      <section v-else-if="game.state.phase === 'playing'" class="action-bar">
        <span v-if="selectedComboText" class="combo-pill" :class="{ invalid: selectedComboText === '不合法' }">{{ selectedComboText }}</span>
        <button type="button" :disabled="!game.canUserPlay.value" @click="doHint">提示</button>
        <button type="button" :disabled="!game.canUserPlay.value || game.canLead.value" @click="doPass">不出</button>
        <button type="button" :disabled="!game.canUserPlay.value" @click="game.clearSelection">重选</button>
        <button class="primary" type="button" :disabled="!game.canUserPlay.value" @click="doPlay">出牌</button>
      </section>

      <section class="user-area" :class="{ active: currentPlayer?.type === 'user' }">
        <div class="hand-cards">
          <button v-for="card in userPlayer?.hand || []" :key="card.id" type="button" class="poker-card" :class="[cardClass(card), { selected: game.state.selectedIds.includes(card.id) }]" @click="selectCard(card)">
            <b>{{ card.label }}</b><small>{{ card.suit }}</small>
          </button>
        </div>
      </section>
    </main>

    <Transition name="modal-fade">
      <section v-if="showTutorial" class="modal-layer">
        <div class="tutorial-card">
          <span>{{ tutorialIndex + 1 }} / {{ tutorials.length }}</span>
          <h2>{{ tutorials[tutorialIndex].title }}</h2>
          <p>{{ tutorials[tutorialIndex].text }}</p>
          <div class="sample-cards">
            <i v-for="sample in tutorials[tutorialIndex].samples" :key="sample">{{ sample }}</i>
          </div>
          <div class="tutorial-actions">
            <button type="button" @click="tutorialIndex = Math.max(0, tutorialIndex - 1)">上一步</button>
            <button type="button" @click="showTutorial = false">跳过</button>
            <button class="primary" type="button" @click="nextTutorial">{{ tutorialIndex === tutorials.length - 1 ? '完成' : '下一步' }}</button>
          </div>
        </div>
      </section>
    </Transition>

    <Transition name="modal-fade">
      <section v-if="confirmExitOpen" class="modal-layer">
        <div class="confirm-card">
          <h2>牌局还在进行</h2>
          <p>现在退出会离开当前斗地主牌局，未完成的对局不会继续保留。</p>
          <div class="confirm-actions">
            <button type="button" @click="confirmExitOpen = false">取消</button>
            <button class="primary" type="button" @click="confirmClose">确认退出</button>
          </div>
        </div>
      </section>
    </Transition>

    <Transition name="modal-fade">
      <section v-if="game.state.phase === 'finished'" class="modal-layer">
        <div class="result-card">
          <h2>{{ game.state.result?.title }}</h2>
          <p>{{ game.state.result?.text }}</p>
          <div class="result-actions">
            <button type="button" @click="shareOpen = true">分享到信息</button>
            <button class="primary" type="button" @click="backSetup">再来一局</button>
          </div>
        </div>
      </section>
    </Transition>

    <Transition name="modal-fade">
      <section v-if="shareOpen" class="modal-layer">
        <div class="share-card">
          <h2>分享战绩</h2>
          <div class="landlord-result-preview" :class="game.state.result?.userWon ? 'win' : 'lose'">
            <span>{{ game.state.result?.mode === 4 ? '四人局' : '三人局' }} · {{ difficultyLabel }}</span>
            <strong>{{ game.state.result?.title }}</strong>
            <p>胜利方：{{ game.state.result?.winnerTeam }} · 最后出完：{{ game.state.result?.winnerName }}</p>
            <p>地主：{{ game.state.result?.landlordName }} · {{ game.state.result?.text }}</p>
          </div>
          <div class="share-target-list">
            <button v-for="conversation in shareTargets" :key="conversation.id" type="button" @click="shareResult(conversation)">
              <div class="share-avatar" :style="avatarStyle(conversation.avatar)"><span v-if="!conversation.avatar">{{ conversation.avatarText || conversation.name.slice(0, 1) }}</span></div>
              <span>{{ conversation.name }}</span>
            </button>
          </div>
          <button type="button" @click="shareOpen = false">取消</button>
        </div>
      </section>
    </Transition>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { createRandomPlayer, useLandlordGame } from '../composables/useLandlordGame.js';
import { useLandlordSounds } from '../composables/useLandlordSounds.js';
import { useMessageStore } from '../composables/useMessageStore.js';

const emit = defineEmits(['close']);

const difficulties = [
  { id: 'friendly', name: '友好', help: 'AI 会放水，适合刚学。' },
  { id: 'easy', name: '简单', help: 'AI 会正常出牌，但不太会配合。' },
  { id: 'normal', name: '普通', help: 'AI 会基本压牌和保留炸弹。' },
  { id: 'hard', name: '困难', help: 'AI 会更重视剩余牌和关键回合。' },
  { id: 'hell', name: '地狱', help: 'AI 会主动控牌，压迫感更强。' },
];
const tutorials = [
  { title: '游戏目标', text: '地主一个人一队，农民一起一队。谁先出完手牌，谁所在阵营获胜。', samples: ['地主', '农民', '先出完'] },
  { title: '牌的大小', text: '从小到大是 3、4、5、6、7、8、9、10、J、Q、K、A、2、小王、大王。2 和王不能进顺子。', samples: ['3', 'A', '2', '王'] },
  { title: '常见牌型', text: '可以出单张、对子、三张、三带一、三带二、顺子、连对、飞机、炸弹和王炸。', samples: ['7', '99', 'JJJ', '炸'] },
  { title: '叫地主', text: '开局先叫地主。地主拿走底牌，牌更多，但要一个人对抗其他玩家。', samples: ['叫', '不叫', '底牌'] },
  { title: '怎么出牌', text: '点击手牌选择，再点出牌。后手必须用同牌型且更大的牌压过上家，压不了可以不出。', samples: ['选择', '出牌', '不出'] },
  { title: '难度区别', text: '友好会放水，普通会基本思考，困难和地狱会更会控牌、记牌和使用炸弹。', samples: ['友好', '普通', '地狱'] },
];

const game = useLandlordGame();
const sounds = useLandlordSounds();
const messageStore = useMessageStore();
const USER_PROFILE_KEY = 'phone_message_user_profile';

const setupMode = ref(3);
const difficulty = ref('normal');
const seats = ref([]);
const roleOptions = ref([]);
const showTutorial = ref(false);
const confirmExitOpen = ref(false);
const shareOpen = ref(false);
const tutorialIndex = ref(0);
const userAvatar = ref(loadUserAvatar());

const currentPlayer = computed(() => game.currentPlayer.value);
const userPlayer = computed(() => game.userPlayer.value);
const opponents = computed(() => game.state.players.filter(player => player.type !== 'user'));
const modeLabel = computed(() => setupMode.value === 4 || game.state.mode === 4 ? '四人局' : '三人局');
const difficultyLabel = computed(() => difficulties.find(item => item.id === difficulty.value)?.name || '普通');
const difficultyHelp = computed(() => difficulties.find(item => item.id === difficulty.value)?.help || '');
const shareTargets = computed(() => messageStore.sortedConversations.value.filter(conversation => conversation.type === 'private' || conversation.includeUser));
const selectedComboText = computed(() => {
  if (!game.canUserPlay.value || !game.selectedCards.value.length) return '';
  return game.selectedCombo.value ? game.comboName(game.selectedCombo.value) : '不合法';
});

onMounted(async () => {
  setMode(3);
  await loadRoles();
});

watch(() => [game.state.phase, game.state.currentPlayerIndex], () => {
  if (game.state.phase === 'bidding' && currentPlayer.value?.type !== 'user') setTimeout(() => { game.aiBid(); sounds.playClick(); }, 650);
  if (game.state.phase === 'playing' && currentPlayer.value?.type !== 'user') setTimeout(() => { game.aiPlay(); playActionSound(); }, 800);
});

watch(() => game.state.lastAction, action => {
  if (action === 'deal') sounds.playDeal();
  if (action === 'bomb') sounds.playBomb();
  if (action === 'win') sounds.playWin();
  if (action === 'lose') sounds.playLose();
});

async function loadRoles() {
  roleOptions.value = messageStore.roles.value
    .filter(role => role.source !== 'tavern')
    .map(role => normalizeRole(`msg:${role.id}`, role));
}

function normalizeRole(key, role) {
  const name = role.name || role.name2 || '角色';
  return { key, id: key, name, type: 'role', avatar: role.avatar || '', avatarText: role.avatarText || name.slice(0, 1) };
}

function setMode(mode) {
  setupMode.value = mode;
  seats.value = Array.from({ length: mode - 1 }, (_, index) => seats.value[index] || createSeat(index));
}

function createSeat(index) {
  const player = createRandomPlayer(index);
  return { key: 'random', ...player };
}

function changeSeat(index, key) {
  sounds.playClick();
  if (key === 'random') seats.value[index] = createSeat(index);
  else seats.value[index] = { ...roleOptions.value.find(role => role.key === key), key };
}

function startGame() {
  sounds.unlock();
  sounds.playDeal();
  const normalizedSeats = seats.value.map((seat, index) => seat.key === 'random' ? createRandomPlayer(index) : { ...seat, id: `${seat.key}_${index}` });
  userAvatar.value = loadUserAvatar();
  game.startGame({ mode: setupMode.value, difficulty: difficulty.value, seats: normalizedSeats, userAvatar: userAvatar.value });
}

function loadUserAvatar() {
  try { return JSON.parse(localStorage.getItem(USER_PROFILE_KEY) || 'null')?.avatar || ''; }
  catch { return ''; }
}

function userBid(want) {
  sounds.playClick();
  game.bid(want);
}

function selectCard(card) {
  if (!game.canUserPlay.value) return;
  sounds.playSelect();
  game.toggleCard(card.id);
}

function doPlay() {
  const ok = game.playSelected();
  if (ok) playActionSound();
  else sounds.playPass();
}

function doPass() {
  game.pass();
  sounds.playPass();
}

function doHint() {
  game.hint();
  sounds.playSelect();
}

function playActionSound() {
  if (game.state.lastAction === 'bomb') sounds.playBomb();
  else if (game.state.lastAction === 'pass') sounds.playPass();
  else sounds.playPlayCards();
}

function nextTutorial() {
  if (tutorialIndex.value >= tutorials.length - 1) showTutorial.value = false;
  else tutorialIndex.value += 1;
}

function requestClose() {
  if (game.state.phase === 'bidding' || game.state.phase === 'playing') {
    confirmExitOpen.value = true;
    sounds.playPass();
    return;
  }
  emit('close');
}

function confirmClose() {
  confirmExitOpen.value = false;
  emit('close');
}

function backSetup() {
  sounds.playClick();
  shareOpen.value = false;
  game.state.phase = 'setup';
  game.state.message = '选择模式和牌友后开始游戏';
  game.state.result = null;
}

function shareResult(conversation) {
  if (!game.state.result) return;
  const payload = {
    ...game.state.result,
    difficultyName: difficultyLabel.value,
    sharedAt: Date.now(),
  };
  messageStore.addMessage(conversation.id, {
    senderType: 'system',
    senderId: 'landlord_result',
    senderName: '斗地主',
    type: 'landlord_result_share',
    text: `斗地主战绩：${payload.title}，${payload.mode === 4 ? '四人局' : '三人局'}，${payload.difficultyName}`,
    landlord: payload,
    status: '',
  });
  shareOpen.value = false;
  sounds.playWin();
}

function avatarStyle(avatar) {
  return avatar ? { backgroundImage: `url('${avatar}')` } : {};
}

function cardClass(card) {
  return { red: card.suit === '♥' || card.suit === '♦', joker: card.joker };
}
</script>

<style scoped>
.landlord-app { position:absolute; inset:0; z-index:20; overflow:hidden; border-radius:40px; background:#145238; color:#fff; animation:landlord-in .32s cubic-bezier(.2,.9,.2,1) both; }
button, select { font-family:inherit; }
button { border:none; cursor:pointer; transition:transform .18s ease, background-color .22s ease, color .22s ease, box-shadow .22s ease, opacity .22s ease; }
button:active { transform:scale(.96); }
button:disabled { opacity:.45; cursor:not-allowed; }
.landlord-top { display:grid; grid-template-columns:62px minmax(0,1fr) 62px; align-items:center; gap:10px; padding:54px 16px 10px; background:#b82420; box-shadow:0 8px 22px rgba(0,0,0,.22); }
.landlord-top div { text-align:center; min-width:0; }
.landlord-top h1 { margin:0; font-size:24px; line-height:1.1; }
.landlord-top span { color:rgba(255,235,174,.86); font-size:11px; }
.soft-btn { height:32px; border-radius:16px; background:#8f1714; color:#ffe9a6; font-size:12px; box-shadow:inset 0 0 0 1px rgba(255,226,143,.18); }
.soft-btn:hover { background:#76120f; }
.setup-screen { position:absolute; inset:116px 0 0; overflow-y:auto; padding:12px 14px 34px; }
.setup-screen::-webkit-scrollbar { width:0; }
.setup-card { margin-bottom:12px; padding:14px; border:1px solid rgba(255,220,124,.22); border-radius:24px; background:#1b6a46; box-shadow:0 16px 34px rgba(0,0,0,.22); transition:transform .24s ease, box-shadow .24s ease; }
.setup-card:active { transform:translateY(1px); }
.hero-card h2 { margin:0 0 6px; font-size:24px; }
.hero-card p { margin:0; color:rgba(255,244,205,.72); font-size:12px; line-height:1.55; }
.section-title { display:flex; align-items:flex-end; justify-content:space-between; gap:12px; margin-bottom:10px; }
.section-title strong { font-size:16px; }
.section-title span { color:rgba(255,244,205,.62); font-size:11px; text-align:right; }
.seg-row, .difficulty-grid { display:grid; gap:8px; }
.seg-row { grid-template-columns:1fr 1fr; }
.difficulty-grid { grid-template-columns:repeat(5,1fr); }
.seg-row button, .difficulty-grid button, .seat-row button, .action-bar button, .tutorial-actions button, .result-card button, .confirm-actions button { height:36px; border-radius:15px; background:#0f4c33; color:#fff4cd; font-size:12px; font-weight:800; box-shadow:inset 0 0 0 1px rgba(255,220,124,.12); }
.seg-row .active, .difficulty-grid .active, .primary { background:#f4c35a !important; color:#2a2110 !important; box-shadow:0 6px 14px rgba(0,0,0,.18) !important; }
.seat-row { display:grid; grid-template-columns:42px minmax(0,1fr) 48px; align-items:center; gap:9px; margin-top:8px; }
.user-seat { grid-template-columns:42px 1fr; }
.mini-avatar { width:42px; height:42px; border-radius:16px; display:grid; place-items:center; background:#b82420; background-size:cover; background-position:center; color:#ffe9a6; font-weight:900; box-shadow:inset 0 0 0 1px rgba(255,220,124,.22), 0 6px 12px rgba(0,0,0,.18); transition:transform .2s ease, box-shadow .2s ease; }
.seat-row strong { display:block; font-size:13px; }
.seat-row span { color:rgba(255,244,205,.62); font-size:11px; }
.seat-row select { height:38px; min-width:0; border:none; outline:none; border-radius:15px; padding:0 10px; background:#0f4c33; color:#fff4cd; transition:background-color .22s ease, box-shadow .22s ease; }
.seat-row select:focus { box-shadow:0 0 0 2px rgba(244,195,90,.35); }
.seat-row option { color:#202020; }
.start-btn { width:100%; height:48px; border-radius:22px; background:#f4c35a; color:#2a2110; font-size:16px; font-weight:900; box-shadow:0 12px 24px rgba(0,0,0,.22); }
.start-btn:hover { background:#ffd978; }
.table-screen { position:absolute; inset:116px 0 0; overflow:hidden; background:#145238; }
.opponents { position:absolute; left:12px; right:12px; top:9px; display:grid; gap:8px; z-index:2; }
.opponents.count-2 { grid-template-columns:1fr 1fr; }
.opponents.count-3 { grid-template-columns:1fr 1fr 1fr; }
.player-seat, .user-info { padding:8px; border-radius:18px; background:#0f4c33; border:1px solid rgba(255,220,124,.16); text-align:center; transition:transform .22s ease, box-shadow .22s ease, background-color .22s ease; }
.player-seat.active, .user-info.active { transform:translateY(-2px); box-shadow:0 0 0 2px rgba(244,195,90,.8), 0 10px 20px rgba(0,0,0,.22); }
.player-seat.landlord, .user-info.landlord { background:#8f1714; }
.player-seat .mini-avatar { margin:0 auto 5px; width:38px; height:38px; border-radius:14px; }
.player-seat strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; }
.player-seat span { color:rgba(255,244,205,.66); font-size:10px; }
.table-center { position:absolute; left:18px; right:18px; top:112px; bottom:224px; display:grid; place-items:center; }
.bottom-cards { position:absolute; top:0; display:flex; gap:5px; }
.bottom-cards span { min-width:24px; padding:4px 5px; border-radius:8px; background:#8f1714; color:#ffe9a6; font-size:10px; text-align:center; box-shadow:0 4px 8px rgba(0,0,0,.18); }
.trick-card { min-width:190px; max-width:290px; padding:13px; border-radius:22px; background:#0f4c33; border:1px solid rgba(255,220,124,.18); text-align:center; box-shadow:0 14px 28px rgba(0,0,0,.22); transition:transform .22s ease, box-shadow .22s ease; }
.trick-card.empty { color:rgba(255,244,205,.78); font-size:13px; }
.trick-card.bomb { box-shadow:0 0 32px rgba(244,195,90,.42); }
.played-cards { display:flex; flex-wrap:wrap; justify-content:center; gap:4px; margin:8px 0; }
.played-cards span { min-width:26px; padding:5px 6px; border-radius:8px; background:#fff; color:#151515; font-size:12px; font-weight:900; }
.played-cards span.red { color:#d33b45; }
.played-cards span.joker { color:#7b4ce2; }
.trick-card em { color:rgba(255,244,205,.64); font-size:11px; font-style:normal; }
.message-bar { position:absolute; left:18px; right:18px; bottom:192px; padding:8px 10px; border-radius:14px; background:#0f4c33; color:rgba(255,244,205,.86); text-align:center; font-size:12px; box-shadow:inset 0 0 0 1px rgba(255,220,124,.12); transition:opacity .22s ease, transform .22s ease; }
.action-bar { position:absolute; left:12px; right:12px; bottom:146px; z-index:5; display:flex; align-items:center; justify-content:center; gap:8px; min-height:38px; }
.action-bar span { color:rgba(255,244,205,.82); font-size:12px; }
.action-bar button { min-width:62px; }
.combo-pill { min-width:auto; padding:8px 10px; border-radius:999px; background:#f4c35a; color:#2a2110 !important; font-weight:900; box-shadow:0 6px 14px rgba(0,0,0,.16); }
.combo-pill.invalid { background:#7b1714; color:#ffe9a6 !important; }
.user-area { position:absolute; left:0; right:0; bottom:0; height:142px; padding:0 10px 8px; background:#b82420; box-shadow:0 -10px 24px rgba(0,0,0,.22); transition:background-color .24s ease; }
.user-info { position:absolute; left:18px; bottom:230px; z-index:4; display:grid; grid-template-columns:32px 1fr; align-items:center; gap:7px; width:128px; padding:5px 7px; text-align:left; }
.user-info .mini-avatar { width:32px; height:32px; border-radius:12px; }
.user-info strong { font-size:12px; }
.user-info span { color:rgba(255,244,205,.66); font-size:10px; }
.hand-cards { position:absolute; left:10px; right:10px; bottom:8px; height:132px; display:flex; flex-wrap:wrap; align-content:flex-end; align-items:flex-end; overflow:visible; padding:24px 8px 0 0; row-gap:6px; }
.hand-cards::-webkit-scrollbar { height:0; }
.poker-card { flex:0 0 34px; height:54px; margin-right:-12px; border-radius:9px; background:#fffdf5; color:#161616; box-shadow:0 5px 10px rgba(0,0,0,.24); transition:transform .18s ease, box-shadow .18s ease, margin-right .18s ease; }
.poker-card:hover { transform:translateY(-4px); }
.poker-card.selected { transform:translateY(-14px); box-shadow:0 12px 18px rgba(244,195,90,.32); }
.poker-card b { display:block; font-size:12px; }
.poker-card small { display:block; margin-top:2px; font-size:11px; }
.poker-card.red { color:#d33b45; }
.poker-card.joker { color:#7b4ce2; }
.modal-layer { position:absolute; inset:0; z-index:40; display:grid; place-items:center; padding:22px; background:rgba(0,0,0,.48); backdrop-filter:blur(10px); }
.tutorial-card, .result-card, .confirm-card, .share-card { width:100%; padding:20px; border-radius:28px; background:#fbf6e9; color:#2b2518; box-shadow:0 24px 50px rgba(0,0,0,.36); }
.tutorial-card span { color:#9d7a32; font-size:12px; font-weight:900; }
.tutorial-card h2, .result-card h2, .confirm-card h2, .share-card h2 { margin:8px 0 8px; font-size:25px; }
.tutorial-card p, .result-card p, .confirm-card p, .share-card p { margin:0; color:#6d6045; font-size:13px; line-height:1.6; }
.sample-cards { display:flex; gap:7px; margin:16px 0; }
.sample-cards i { padding:8px 10px; border-radius:10px; background:#fff; color:#202020; font-style:normal; font-weight:900; box-shadow:0 4px 12px rgba(0,0,0,.08); }
.tutorial-actions { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; }
.confirm-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:18px; }
.result-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:18px; }
.tutorial-actions button, .result-card button { color:#2b2518; background:#eadfc2; }
.confirm-actions button { color:#2b2518; background:#eadfc2; }
.result-card button { width:100%; }
.landlord-result-preview { margin:12px 0; padding:14px; border-radius:20px; background:#145238; color:#fff4cd; }
.landlord-result-preview.win { background:#b82420; }
.landlord-result-preview span { color:#ffe39a; font-size:11px; font-weight:900; letter-spacing:.6px; }
.landlord-result-preview strong { display:block; margin:5px 0; font-size:24px; }
.landlord-result-preview p { color:rgba(255,244,205,.75); }
.share-target-list { display:grid; gap:8px; max-height:210px; overflow-y:auto; margin:12px 0; }
.share-target-list button { display:grid; grid-template-columns:38px 1fr; align-items:center; gap:10px; min-height:46px; border-radius:16px; background:#eadfc2; color:#2b2518; text-align:left; font-weight:900; }
.share-avatar { width:38px; height:38px; display:grid; place-items:center; border-radius:14px; background:#b82420; background-size:cover; background-position:center; color:#ffe9a6; }
.card-pop-enter-active, .card-pop-leave-active, .modal-fade-enter-active, .modal-fade-leave-active { transition:opacity .22s ease, transform .26s cubic-bezier(.2,.9,.2,1); }
.card-pop-enter-from, .card-pop-leave-to { opacity:0; transform:translateY(12px) scale(.96); }
.modal-fade-enter-from, .modal-fade-leave-to { opacity:0; transform:scale(.98); }
@keyframes landlord-in { from { opacity:0; transform:translateY(28px) scale(.96); } to { opacity:1; transform:none; } }
</style>
