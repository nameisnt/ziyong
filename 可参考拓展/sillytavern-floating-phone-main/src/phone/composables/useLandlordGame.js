import { computed, reactive } from 'vue';

const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2', '小王', '大王'];
const SUITS = ['♠', '♥', '♣', '♦'];
const PASS_NAMES = ['冷静一下', '要不起', '先让一手', '这牌不好接'];
const RANDOM_NAMES = ['老张', '小陈', '阿强', '牌桌浪子', '隔壁小王', '幸运星', '不服就炸', '冷静玩家', '今天必胜', '摸鱼高手'];
const DIFFICULTY_LEVEL = { friendly: 0, easy: 1, normal: 2, hard: 3, hell: 4 };

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function cardValue(rank) {
  return RANKS.indexOf(rank) + 3;
}

function createDeck(mode) {
  const decks = mode === 4 ? 2 : 1;
  const cards = [];
  for (let deck = 0; deck < decks; deck += 1) {
    SUITS.forEach(suit => RANKS.slice(0, 13).forEach(rank => {
      cards.push({ id: `${deck}_${suit}_${rank}`, suit, rank, value: cardValue(rank), label: rank });
    }));
    cards.push({ id: `${deck}_joker_small`, suit: '', rank: '小王', value: cardValue('小王'), label: '小王', joker: true });
    cards.push({ id: `${deck}_joker_big`, suit: '', rank: '大王', value: cardValue('大王'), label: '大王', joker: true });
  }
  return shuffle(cards);
}

function sortHand(hand) {
  hand.sort((a, b) => a.value - b.value || a.suit.localeCompare(b.suit));
}

function byRank(cards) {
  return cards.reduce((map, card) => {
    if (!map[card.rank]) map[card.rank] = [];
    map[card.rank].push(card);
    return map;
  }, {});
}

function isConsecutive(values) {
  return values.every((value, index) => index === 0 || value === values[index - 1] + 1);
}

export function analyzeCards(cards) {
  const list = [...cards].sort((a, b) => a.value - b.value);
  const total = list.length;
  if (!total) return null;
  const groups = Object.values(byRank(list)).sort((a, b) => a[0].value - b[0].value);
  const counts = groups.map(group => group.length);
  const values = groups.map(group => group[0].value);
  const noHigh = values.every(value => value < cardValue('2'));
  const combo = (type, value, extra = {}) => ({ type, value, total, ...extra });

  if (total === 2 && values.includes(cardValue('小王')) && values.includes(cardValue('大王'))) return combo('rocket', cardValue('大王'));
  if (groups.length === 1 && total >= 4) return combo('bomb', values[0], { bombSize: total });
  if (total === 1) return combo('single', values[0]);
  if (total === 2 && counts[0] === 2) return combo('pair', values[0]);
  if (total === 3 && counts[0] === 3) return combo('triple', values[0]);
  if (total === 4 && counts.includes(3)) return combo('triple_single', groups.find(group => group.length === 3)[0].value);
  if (total === 5 && counts.includes(3) && counts.includes(2)) return combo('triple_pair', groups.find(group => group.length === 3)[0].value);
  if (total >= 5 && groups.length === total && noHigh && isConsecutive(values)) return combo('straight', values.at(-1), { chain: total });
  if (total >= 6 && total % 2 === 0 && counts.every(count => count === 2) && noHigh && isConsecutive(values)) return combo('pair_chain', values.at(-1), { chain: groups.length });
  if ((total === 6 || total === 8) && counts.includes(4)) return combo('four_two', groups.find(group => group.length === 4)[0].value);

  const triples = groups.filter(group => group.length >= 3 && group[0].value < cardValue('2'));
  if (triples.length >= 2) {
    const tripleValues = triples.map(group => group[0].value);
    for (let len = triples.length; len >= 2; len -= 1) {
      for (let start = 0; start <= tripleValues.length - len; start += 1) {
        const seq = tripleValues.slice(start, start + len);
        if (!isConsecutive(seq)) continue;
        if (total === len * 3 || total === len * 4 || total === len * 5) return combo('plane', seq.at(-1), { chain: len });
      }
    }
  }

  return null;
}

export function canBeat(candidate, previous) {
  if (!candidate) return false;
  if (!previous) return true;
  if (candidate.type === 'rocket') return previous.type !== 'rocket';
  if (previous.type === 'rocket') return false;
  if (candidate.type === 'bomb' && previous.type !== 'bomb') return true;
  if (candidate.type !== previous.type) return false;
  if (candidate.total !== previous.total) return false;
  return candidate.value > previous.value;
}

function cardsOfRank(hand, rank, count) {
  const group = hand.filter(card => card.rank === rank);
  return group.length >= count ? group.slice(0, count) : null;
}

function lowestCombo(hand) {
  const groups = Object.values(byRank(hand)).sort((a, b) => a[0].value - b[0].value);
  const triple = groups.find(group => group.length === 3);
  const pair = groups.find(group => group.length === 2);
  if (triple && Math.random() > 0.45) return triple.slice(0, 3);
  if (pair && Math.random() > 0.35) return pair.slice(0, 2);
  return [hand[0]];
}

function findResponse(hand, previous, difficulty) {
  const sorted = [...hand].sort((a, b) => a.value - b.value);
  const groups = Object.values(byRank(sorted)).sort((a, b) => a[0].value - b[0].value);
  const level = DIFFICULTY_LEVEL[difficulty] ?? 2;
  if (!previous) return level <= 1 && Math.random() < 0.28 ? [sorted[Math.floor(Math.random() * Math.min(5, sorted.length))]] : lowestCombo(sorted);

  if (previous.type === 'rocket') return [];
  if (previous.type === 'bomb') {
    const biggerBomb = groups.find(group => group.length >= 4 && group[0].value > previous.value);
    if (biggerBomb) return biggerBomb.slice(0, Math.max(4, previous.bombSize || 4));
    const smallJoker = sorted.find(card => card.rank === '小王');
    const bigJoker = sorted.find(card => card.rank === '大王');
    return smallJoker && bigJoker ? [smallJoker, bigJoker] : [];
  }

  const tryGroups = groups.filter(group => group[0].value > previous.value);
  for (const group of tryGroups) {
    let cards = null;
    if (previous.type === 'single') cards = group.slice(0, 1);
    if (previous.type === 'pair' && group.length >= 2) cards = group.slice(0, 2);
    if (previous.type === 'triple' && group.length >= 3) cards = group.slice(0, 3);
    if (previous.type === 'triple_single' && group.length >= 3) cards = [...group.slice(0, 3), sorted.find(card => card.rank !== group[0].rank)].filter(Boolean);
    if (previous.type === 'triple_pair' && group.length >= 3) {
      const pair = groups.find(item => item[0].rank !== group[0].rank && item.length >= 2);
      if (pair) cards = [...group.slice(0, 3), ...pair.slice(0, 2)];
    }
    if (cards && canBeat(analyzeCards(cards), previous)) return cards;
  }

  if (level >= 2 || Math.random() < 0.18) {
    const bomb = groups.find(group => group.length >= 4);
    if (bomb) return bomb.slice(0, Math.min(4, bomb.length));
    const smallJoker = sorted.find(card => card.rank === '小王');
    const bigJoker = sorted.find(card => card.rank === '大王');
    if (smallJoker && bigJoker) return [smallJoker, bigJoker];
  }
  return [];
}

function nextIndex(index, players) {
  return (index + 1) % players.length;
}

export function createRandomPlayer(index) {
  const name = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
  return { id: `random_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 5)}`, name, type: 'random', avatar: '', avatarText: name.slice(0, 1) };
}

export function useLandlordGame() {
  const state = reactive({
    mode: 3,
    difficulty: 'normal',
    phase: 'setup',
    players: [],
    bottomCards: [],
    selectedIds: [],
    currentPlayerIndex: 0,
    landlordIndex: -1,
    currentTrick: null,
    passCount: 0,
    bidLog: [],
    message: '选择模式和牌友后开始游戏',
    result: null,
    lastAction: '',
  });

  const currentPlayer = computed(() => state.players[state.currentPlayerIndex] || null);
  const userPlayer = computed(() => state.players.find(player => player.type === 'user'));
  const selectedCards = computed(() => userPlayer.value?.hand.filter(card => state.selectedIds.includes(card.id)) || []);
  const selectedCombo = computed(() => analyzeCards(selectedCards.value));
  const canUserPlay = computed(() => state.phase === 'playing' && currentPlayer.value?.type === 'user');
  const canLead = computed(() => !state.currentTrick || state.currentTrick.playerId === currentPlayer.value?.id);

  function startGame(options) {
    const mode = Number(options.mode) === 4 ? 4 : 3;
    const deck = createDeck(mode);
    const playerCount = mode;
    const bottomCount = mode === 4 ? 8 : 3;
    const handCount = Math.floor((deck.length - bottomCount) / playerCount);
    const seatPlayers = [
      { id: 'user', name: '你', type: 'user', avatar: options.userAvatar || '', avatarText: '我' },
      ...options.seats.slice(0, playerCount - 1),
    ];

    state.mode = mode;
    state.difficulty = options.difficulty || 'normal';
    state.phase = 'bidding';
    state.players = seatPlayers.map((player, index) => ({ ...player, hand: deck.slice(index * handCount, (index + 1) * handCount), isLandlord: false, team: 'farmer' }));
    state.players.forEach(player => sortHand(player.hand));
    state.bottomCards = deck.slice(handCount * playerCount);
    state.currentPlayerIndex = Math.floor(Math.random() * playerCount);
    state.landlordIndex = -1;
    state.currentTrick = null;
    state.passCount = 0;
    state.selectedIds = [];
    state.bidLog = [];
    state.result = null;
    state.lastAction = 'deal';
    state.message = `${state.players[state.currentPlayerIndex].name} 先叫地主`;
  }

  function bid(want) {
    if (state.phase !== 'bidding') return;
    const player = currentPlayer.value;
    state.bidLog.push({ playerId: player.id, want });
    state.message = `${player.name}${want ? '叫地主' : '不叫'}`;
    if (want || state.bidLog.length >= state.players.length) {
      const lastBid = [...state.bidLog].reverse().find(item => item.want);
      const targetId = lastBid?.playerId || state.players[Math.floor(Math.random() * state.players.length)].id;
      setLandlord(state.players.findIndex(item => item.id === targetId));
      return;
    }
    state.currentPlayerIndex = nextIndex(state.currentPlayerIndex, state.players);
  }

  function aiBid() {
    const player = currentPlayer.value;
    const highCards = player.hand.filter(card => card.value >= cardValue('2')).length;
    const bombs = Object.values(byRank(player.hand)).filter(group => group.length >= 4).length;
    const level = DIFFICULTY_LEVEL[state.difficulty] ?? 2;
    bid(highCards + bombs * 2 + Math.random() * 2 > 3.7 - level * 0.28);
  }

  function setLandlord(index) {
    state.landlordIndex = index;
    state.players.forEach((player, playerIndex) => {
      player.isLandlord = playerIndex === index;
      player.team = playerIndex === index ? 'landlord' : 'farmer';
    });
    state.players[index].hand.push(...state.bottomCards);
    sortHand(state.players[index].hand);
    state.currentPlayerIndex = index;
    state.phase = 'playing';
    state.message = `${state.players[index].name} 成为地主，先出牌`;
    state.lastAction = 'bid';
  }

  function toggleCard(cardId) {
    const index = state.selectedIds.indexOf(cardId);
    if (index >= 0) state.selectedIds.splice(index, 1);
    else state.selectedIds.push(cardId);
  }

  function clearSelection() {
    state.selectedIds = [];
  }

  function playSelected() {
    if (!canUserPlay.value) return false;
    return playCards(currentPlayer.value, selectedCards.value);
  }

  function playCards(player, cards) {
    const combo = analyzeCards(cards);
    const previous = state.currentTrick?.playerId === player.id ? null : state.currentTrick?.combo;
    if (!combo) {
      state.message = '这个牌型还不能出';
      return false;
    }
    if (!canBeat(combo, previous)) {
      state.message = '需要同牌型更大的牌，或者使用炸弹';
      return false;
    }
    player.hand = player.hand.filter(card => !cards.some(item => item.id === card.id));
    state.currentTrick = { playerId: player.id, playerName: player.name, cards: [...cards], combo };
    state.selectedIds = [];
    state.passCount = 0;
    state.message = `${player.name} 出了 ${comboName(combo)}`;
    state.lastAction = combo.type === 'bomb' || combo.type === 'rocket' ? 'bomb' : 'play';
    if (!player.hand.length) finish(player.team, player);
    else state.currentPlayerIndex = nextIndex(state.currentPlayerIndex, state.players);
    return true;
  }

  function pass() {
    if (!canUserPlay.value || canLead.value) return;
    doPass(currentPlayer.value);
  }

  function doPass(player) {
    state.passCount += 1;
    state.message = `${player.name}：${PASS_NAMES[Math.floor(Math.random() * PASS_NAMES.length)]}`;
    state.lastAction = 'pass';
    if (state.passCount >= state.players.length - 1) {
      state.currentTrick = null;
      state.passCount = 0;
      state.message = `${player.name} 不出，下一家重新领牌`;
    }
    state.currentPlayerIndex = nextIndex(state.currentPlayerIndex, state.players);
  }

  function hint() {
    if (!canUserPlay.value) return;
    const cards = findResponse(userPlayer.value.hand, canLead.value ? null : state.currentTrick?.combo, state.difficulty);
    state.selectedIds = cards.map(card => card.id);
    state.message = cards.length ? '已帮你选出一组可出的牌' : '当前没有合适的牌，可以不出';
  }

  function aiPlay() {
    if (state.phase !== 'playing' || currentPlayer.value?.type === 'user') return;
    const player = currentPlayer.value;
    const cards = findResponse(player.hand, state.currentTrick?.playerId === player.id ? null : state.currentTrick?.combo, state.difficulty);
    if (!cards.length || !playCards(player, cards)) doPass(player);
  }

  function finish(team, winner = null) {
    state.phase = 'finished';
    const userWon = userPlayer.value?.team === team;
    const landlord = state.players[state.landlordIndex];
    state.result = {
      team,
      userWon,
      title: userWon ? '你赢了' : '你输了',
      text: team === 'landlord' ? '地主阵营率先出完了手牌。' : '农民阵营成功拦住了地主。',
      mode: state.mode,
      difficulty: state.difficulty,
      landlordName: landlord?.name || '地主',
      winnerName: winner?.name || (team === 'landlord' ? landlord?.name : '农民阵营'),
      winnerTeam: team === 'landlord' ? '地主' : '农民',
      userTeam: userPlayer.value?.team || 'farmer',
      remaining: state.players.map(player => ({ name: player.name, team: player.team, count: player.hand.length })),
    };
    state.message = state.result.title;
    state.lastAction = userWon ? 'win' : 'lose';
  }

  function comboName(combo) {
    const names = { single: '单张', pair: '对子', triple: '三张', triple_single: '三带一', triple_pair: '三带二', straight: '顺子', pair_chain: '连对', plane: '飞机', four_two: '四带二', bomb: '炸弹', rocket: '王炸' };
    return names[combo?.type] || '牌';
  }

  return { state, currentPlayer, userPlayer, selectedCards, selectedCombo, canUserPlay, canLead, startGame, bid, aiBid, toggleCard, clearSelection, playSelected, pass, hint, aiPlay, comboName };
}
