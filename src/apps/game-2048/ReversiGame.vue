<template>
  <section class="pc-minigame-panel">
    <section class="pc-minigame-stats">
      <article>
        <span>{{ t`黑棋` }}</span
        ><strong>{{ blackCount }}</strong>
      </article>
      <article>
        <span>{{ t`白棋` }}</span
        ><strong>{{ whiteCount }}</strong>
      </article>
      <article>
        <span>{{ t`回合` }}</span
        ><strong>{{ turnText }}</strong>
      </article>
    </section>

    <section class="pc-reversi-board" aria-label="黑白棋棋盘">
      <button
        v-for="(cell, index) in state.board"
        :key="index"
        class="pc-reversi-cell"
        :class="{ legal: humanLegalMoves.has(index) }"
        :data-piece="cell"
        type="button"
        :disabled="state.status !== 'playing' || state.turn !== 1 || !humanLegalMoves.has(index)"
        @click="playHuman(index)"
      >
        <span v-if="cell" class="pc-reversi-piece"></span>
        <i v-else-if="humanLegalMoves.has(index)"></i>
      </button>
    </section>

    <article v-if="state.status === 'done'" class="pc-section-card pc-minigame-message">
      <strong>{{ resultText }}</strong>
    </article>

    <div class="pc-form-actions pc-minigame-actions">
      <button class="pc-soft-btn" type="button" :disabled="!state.previous" @click="undoTurn">
        <i class="fa-solid fa-rotate-left"></i><span>{{ t`悔棋` }}</span>
      </button>
      <button class="pc-primary-btn" type="button" @click="newGame">
        <i class="fa-solid fa-rotate-right"></i><span>{{ t`新一局` }}</span>
      </button>
      <InfoHint
        :label="t`黑白棋说明`"
        :text="t`你执黑先行。落子时必须夹住至少一枚白棋，被夹住的棋子会翻为黑色；双方都无法落子时，棋子较多者获胜。`"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import InfoHint from '@/components/InfoHint.vue';
import { miniGameFields } from './fields';
import { readMiniGameSettings, writeMiniGameSettings } from './miniGameStorage';
import { ReversiSchema } from './backupSchemas';

type Cell = 0 | 1 | 2;
type Player = 1 | 2;

type ReversiState = z.infer<typeof ReversiSchema>;

const directions = [-1, 0, 1].flatMap(dx => [-1, 0, 1].map(dy => ({ dx, dy }))).filter(item => item.dx || item.dy);

function createBoard() {
  const board = Array.from({ length: 64 }, () => 0) as Cell[];
  board[27] = 2;
  board[28] = 1;
  board[35] = 1;
  board[36] = 2;
  return board;
}

function createState(wins = 0, losses = 0, draws = 0): ReversiState {
  return { board: createBoard(), draws, losses, moves: 0, previous: null, status: 'playing', turn: 1, wins };
}

const state = ref<ReversiState>(readMiniGameSettings(miniGameFields.reversi, ReversiSchema, () => createState()));
let aiTimer: ReturnType<typeof window.setTimeout> | null = null;

function xy(index: number) {
  return { x: index % 8, y: Math.floor(index / 8) };
}

function indexOf(x: number, y: number) {
  return y * 8 + x;
}

function flipsFor(board: Cell[], index: number, player: Player) {
  if (board[index]) return [];
  const opponent: Player = player === 1 ? 2 : 1;
  const start = xy(index);
  const flips: number[] = [];
  directions.forEach(({ dx, dy }) => {
    const line: number[] = [];
    let x = start.x + dx;
    let y = start.y + dy;
    while (x >= 0 && y >= 0 && x < 8 && y < 8 && board[indexOf(x, y)] === opponent) {
      line.push(indexOf(x, y));
      x += dx;
      y += dy;
    }
    if (line.length && x >= 0 && y >= 0 && x < 8 && y < 8 && board[indexOf(x, y)] === player) flips.push(...line);
  });
  return flips;
}

function legalMoves(board: Cell[], player: Player) {
  return new Map(
    Array.from({ length: 64 }, (_, index) => [index, flipsFor(board, index, player)] as const).filter(
      ([, flips]) => flips.length,
    ),
  );
}

const blackCount = computed(() => state.value.board.filter(cell => cell === 1).length);
const whiteCount = computed(() => state.value.board.filter(cell => cell === 2).length);
const humanLegalMoves = computed(() =>
  state.value.status === 'playing' && state.value.turn === 1
    ? new Set(legalMoves(state.value.board, 1).keys())
    : new Set<number>(),
);
const turnText = computed(() => (state.value.status === 'done' ? t`结束` : state.value.turn === 1 ? t`你` : t`电脑`));
const resultText = computed(() =>
  blackCount.value === whiteCount.value ? t`平局` : blackCount.value > whiteCount.value ? t`你赢了` : t`电脑获胜`,
);

function save() {
  writeMiniGameSettings(miniGameFields.reversi, ReversiSchema, state.value);
}

function snapshot() {
  return {
    board: [...state.value.board] as Cell[],
    draws: state.value.draws,
    losses: state.value.losses,
    moves: state.value.moves,
    status: state.value.status,
    turn: state.value.turn,
    wins: state.value.wins,
  };
}

function applyMove(index: number, player: Player) {
  const flips = flipsFor(state.value.board, index, player);
  if (!flips.length) return false;
  state.value.board[index] = player;
  flips.forEach(cellIndex => {
    state.value.board[cellIndex] = player;
  });
  state.value.moves += 1;
  return true;
}

function finishGame() {
  if (state.value.status === 'done') return;
  state.value.status = 'done';
  const black = state.value.board.filter(cell => cell === 1).length;
  const white = state.value.board.filter(cell => cell === 2).length;
  if (black > white) state.value.wins += 1;
  else if (white > black) state.value.losses += 1;
  else state.value.draws += 1;
}

function continueAfter(player: Player) {
  const next: Player = player === 1 ? 2 : 1;
  if (legalMoves(state.value.board, next).size) {
    state.value.turn = next;
    return;
  }
  if (legalMoves(state.value.board, player).size) {
    state.value.turn = player;
    return;
  }
  finishGame();
}

function playHuman(index: number) {
  if (state.value.status !== 'playing' || state.value.turn !== 1) return;
  state.value.previous = snapshot();
  if (!applyMove(index, 1)) return;
  continueAfter(1);
  save();
  scheduleAi();
}

function aiScore(index: number, flips: number[]) {
  const corners = new Set([0, 7, 56, 63]);
  const risky = new Set([9, 14, 49, 54]);
  const point = xy(index);
  return (
    flips.length +
    (corners.has(index) ? 100 : 0) +
    (point.x === 0 || point.x === 7 || point.y === 0 || point.y === 7 ? 12 : 0) -
    (risky.has(index) ? 18 : 0)
  );
}

function scheduleAi() {
  if (aiTimer) window.clearTimeout(aiTimer);
  if (state.value.status !== 'playing' || state.value.turn !== 2) return;
  aiTimer = window.setTimeout(() => {
    const moves = [...legalMoves(state.value.board, 2).entries()];
    const choice = moves.sort((left, right) => aiScore(right[0], right[1]) - aiScore(left[0], left[1]))[0];
    if (choice) applyMove(choice[0], 2);
    continueAfter(2);
    save();
    if (state.value.turn === 2) scheduleAi();
  }, 320);
}

function undoTurn() {
  const previous = state.value.previous;
  if (!previous) return;
  if (aiTimer) window.clearTimeout(aiTimer);
  state.value = {
    ...state.value,
    board: [...previous.board] as Cell[],
    draws: previous.draws,
    losses: previous.losses,
    moves: previous.moves,
    previous: null,
    status: previous.status,
    turn: previous.turn,
    wins: previous.wins,
  };
  save();
}

function newGame() {
  if (aiTimer) window.clearTimeout(aiTimer);
  state.value = createState(state.value.wins, state.value.losses, state.value.draws);
  save();
}

onMounted(scheduleAi);
onUnmounted(() => {
  if (aiTimer) window.clearTimeout(aiTimer);
});
</script>

<style scoped>
.pc-reversi-board {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  grid-template-rows: repeat(8, minmax(0, 1fr));
  box-sizing: border-box;
  width: min(100%, 420px);
  aspect-ratio: 1;
  align-self: center;
  border: 2px solid color-mix(in srgb, var(--pc-text) 72%, var(--pc-border) 28%);
  background: color-mix(in srgb, var(--pc-text) 28%, var(--pc-border) 72%);
  gap: 0;
  padding: 5px;
}

.pc-reversi-cell {
  display: grid;
  min-width: 0;
  min-height: 0;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--pc-text) 24%, var(--pc-border) 76%);
  background: color-mix(in srgb, var(--pc-theme-accent) 18%, var(--pc-surface-strong) 82%);
  cursor: pointer;
  padding: 0;
}

.pc-reversi-cell:disabled {
  cursor: default;
}

.pc-reversi-piece {
  width: 72%;
  aspect-ratio: 1;
  border-radius: 999px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.18);
}

.pc-reversi-cell[data-piece='1'] .pc-reversi-piece {
  background: var(--pc-text);
}

.pc-reversi-cell[data-piece='2'] .pc-reversi-piece {
  background: var(--pc-surface);
  box-shadow:
    inset 0 0 0 1px var(--pc-border),
    0 2px 5px rgba(0, 0, 0, 0.14);
}

.pc-reversi-cell > i {
  width: 18%;
  aspect-ratio: 1;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pc-theme-accent) 56%, var(--pc-text) 44%);
}
</style>
