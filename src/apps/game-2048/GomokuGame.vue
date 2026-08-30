<template>
  <section class="pc-minigame-panel">
    <section class="pc-minigame-stats">
      <article>
        <span>{{ t`黑棋` }}</span>
        <strong>{{ state.blackWins }}</strong>
      </article>
      <article>
        <span>{{ t`白棋` }}</span>
        <strong>{{ state.whiteWins }}</strong>
      </article>
      <article>
        <span>{{ t`回合` }}</span>
        <strong>{{ statusText }}</strong>
      </article>
    </section>

    <div class="pc-minigame-segment pc-minigame-segment-three" role="group" aria-label="五子棋棋盘大小">
      <button
        v-for="option in boardSizeOptions"
        :key="option.id"
        class="pc-segment-btn"
        :class="{ active: state.boardSize === option.id }"
        type="button"
        @click="setBoardSize(option.id)"
      >
        <span>{{ option.label }}</span>
      </button>
    </div>

    <div class="pc-gomoku-board-wrap">
      <section class="pc-gomoku-board" :style="boardStyle" aria-label="五子棋棋盘">
        <button
          v-for="(cell, index) in state.board"
          :key="index"
          class="pc-gomoku-cell"
          :data-last="state.lastMove === index"
          :data-stone="cell"
          type="button"
          @click="placeBlack(index)"
        >
          <span v-if="cell" class="pc-gomoku-stone"></span>
        </button>
      </section>
    </div>

    <article v-if="state.status !== 'playing'" class="pc-section-card pc-minigame-message">
      <strong>{{ statusText }}</strong>
    </article>

    <div class="pc-form-actions pc-minigame-actions">
      <button class="pc-soft-btn" type="button" :disabled="!state.previous" @click="undo">
        <i class="fa-solid fa-rotate-left"></i>
        <span>{{ t`悔棋` }}</span>
      </button>
      <button class="pc-primary-btn" type="button" @click="newGame">
        <i class="fa-solid fa-rotate-right"></i>
        <span>{{ t`新一局` }}</span>
      </button>
      <InfoHint
        :label="t`五子棋说明`"
        :text="t`你执黑先行，横、竖或斜线率先连成五子即可获胜。切换棋盘大小会开始新的一局。`"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import InfoHint from '@/components/InfoHint.vue';
import { miniGameFields } from './fields';
import { readMiniGameSettings, writeMiniGameSettings } from './miniGameStorage';
import { GomokuSchema } from './backupSchemas';

type Cell = 0 | 1 | 2;
type BoardSize = 'large' | 'medium' | 'small';
type GomokuStatus = 'blackWin' | 'draw' | 'playing' | 'whiteWin';

const boardSizeOptions: Array<{ dimension: number; id: BoardSize; label: string }> = [
  { dimension: 9, id: 'small', label: '小 9×9' },
  { dimension: 13, id: 'medium', label: '中 13×13' },
  { dimension: 15, id: 'large', label: '大 15×15' },
];
type GomokuState = z.infer<typeof GomokuSchema>;

function createState(blackWins = 0, whiteWins = 0, boardSize: BoardSize = 'medium'): GomokuState {
  const dimension = boardSizeOptions.find(option => option.id === boardSize)?.dimension ?? 13;
  return {
    blackWins,
    board: Array.from({ length: dimension * dimension }, () => 0) as Cell[],
    boardSize,
    lastMove: null,
    previous: null,
    status: 'playing',
    whiteWins,
  };
}

const storedState = readMiniGameSettings(miniGameFields.gomoku, GomokuSchema, () => createState());
const state = ref<GomokuState>(normalizeState(storedState));
const size = computed(() => boardSizeOptions.find(option => option.id === state.value.boardSize)?.dimension ?? 13);
const boardStyle = computed(() => ({
  '--gomoku-board-size': size.value,
}));

function normalizeState(value: GomokuState): GomokuState {
  const dimension = boardSizeOptions.find(option => option.id === value.boardSize)?.dimension ?? 13;
  if (
    value.board.length !== dimension * dimension ||
    (value.previous && value.previous.board.length !== dimension * dimension)
  ) {
    return createState(value.blackWins, value.whiteWins, value.boardSize);
  }
  return value;
}

const statusText = computed(() => {
  if (state.value.status === 'blackWin') return t`你赢了`;
  if (state.value.status === 'whiteWin') return t`白棋赢了`;
  if (state.value.status === 'draw') return t`平局`;
  return t`你下`;
});

function save() {
  writeMiniGameSettings(miniGameFields.gomoku, GomokuSchema, state.value);
}

function newGame() {
  state.value = createState(state.value.blackWins, state.value.whiteWins, state.value.boardSize);
  save();
}

function setBoardSize(boardSize: BoardSize) {
  state.value = createState(state.value.blackWins, state.value.whiteWins, boardSize);
  save();
}

function createSnapshot(): z.infer<typeof GomokuSnapshotSchema> {
  return {
    blackWins: state.value.blackWins,
    board: [...state.value.board] as Cell[],
    lastMove: state.value.lastMove,
    status: state.value.status,
    whiteWins: state.value.whiteWins,
  };
}

function undo() {
  const previous = state.value.previous;
  if (!previous) return;
  state.value = {
    ...state.value,
    blackWins: previous.blackWins,
    board: [...previous.board] as Cell[],
    lastMove: previous.lastMove,
    previous: null,
    status: previous.status,
    whiteWins: previous.whiteWins,
  };
  save();
}

function xy(index: number) {
  return { x: index % size.value, y: Math.floor(index / size.value) };
}

function indexOf(x: number, y: number) {
  return y * size.value + x;
}

function inBoard(x: number, y: number) {
  return x >= 0 && y >= 0 && x < size.value && y < size.value;
}

function countLine(board: Cell[], index: number, color: Cell, dx: number, dy: number) {
  const start = xy(index);
  let total = 1;
  for (const sign of [-1, 1]) {
    let x = start.x + dx * sign;
    let y = start.y + dy * sign;
    while (inBoard(x, y) && board[indexOf(x, y)] === color) {
      total += 1;
      x += dx * sign;
      y += dy * sign;
    }
  }
  return total;
}

function hasFive(board: Cell[], index: number, color: Cell) {
  return [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ].some(([dx, dy]) => countLine(board, index, color, dx, dy) >= 5);
}

function emptyCells(board: Cell[]) {
  return board.map((cell, index) => (cell ? -1 : index)).filter(index => index >= 0);
}

function tryWinningMove(board: Cell[], color: Cell) {
  return emptyCells(board).find(index => {
    const next = [...board] as Cell[];
    next[index] = color;
    return hasFive(next, index, color);
  });
}

function hasNeighbor(board: Cell[], index: number) {
  const point = xy(index);
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (!dx && !dy) continue;
      const nx = point.x + dx;
      const ny = point.y + dy;
      if (inBoard(nx, ny) && board[indexOf(nx, ny)]) return true;
    }
  }
  return false;
}

function pickAiMove(board: Cell[]) {
  const win = tryWinningMove(board, 2);
  if (win !== undefined) return win;
  const block = tryWinningMove(board, 1);
  if (block !== undefined) return block;
  const adjacent = emptyCells(board).filter(index => hasNeighbor(board, index));
  const source = adjacent.length ? adjacent : emptyCells(board);
  const center = Math.floor(size.value / 2) * size.value + Math.floor(size.value / 2);
  if (board[center] === 0) return center;
  return source[Math.floor(Math.random() * source.length)];
}

function finishIfNeeded(board: Cell[], index: number, color: Cell): GomokuStatus {
  if (hasFive(board, index, color)) return color === 1 ? 'blackWin' : 'whiteWin';
  return emptyCells(board).length ? 'playing' : 'draw';
}

function placeBlack(index: number) {
  if (state.value.status !== 'playing' || state.value.board[index]) return;
  const previous = createSnapshot();
  const board = [...state.value.board] as Cell[];
  board[index] = 1;
  let lastMove = index;
  let status = finishIfNeeded(board, index, 1);
  if (status === 'playing') {
    const aiIndex = pickAiMove(board);
    if (aiIndex !== undefined) {
      board[aiIndex] = 2;
      lastMove = aiIndex;
      status = finishIfNeeded(board, aiIndex, 2);
    }
  }
  state.value = {
    ...state.value,
    blackWins: state.value.blackWins + (status === 'blackWin' ? 1 : 0),
    board,
    lastMove,
    previous,
    status,
    whiteWins: state.value.whiteWins + (status === 'whiteWin' ? 1 : 0),
  };
  save();
}
</script>

<style scoped>
.pc-gomoku-board-wrap {
  max-width: 100%;
  padding-bottom: 2px;
}

.pc-gomoku-board {
  display: grid;
  grid-template-columns: repeat(var(--gomoku-board-size), minmax(0, 1fr));
  grid-template-rows: repeat(var(--gomoku-board-size), minmax(0, 1fr));
  gap: 1px;
  width: min(100%, 440px);
  aspect-ratio: 1;
  margin: 0 auto;
  border: 1px solid var(--pc-border);
  background: color-mix(in srgb, var(--pc-text) 8%, var(--pc-surface-strong) 92%);
  padding: 6px;
}

.pc-gomoku-cell {
  display: grid;
  min-width: 0;
  min-height: 0;
  place-items: center;
  border: 0;
  border-radius: 4px;
  background:
    linear-gradient(var(--pc-border), var(--pc-border)) center / 100% 1px no-repeat,
    linear-gradient(90deg, var(--pc-border), var(--pc-border)) center / 1px 100% no-repeat;
  cursor: pointer;
  line-height: 1;
  overflow: hidden;
  padding: 0;
}

.pc-gomoku-stone {
  display: block;
  width: 78%;
  aspect-ratio: 1;
  border-radius: 999px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.18);
}

.pc-gomoku-cell[data-stone='1'] .pc-gomoku-stone {
  /* Stone colors represent players and must not invert with the paper theme. */
  background: #171717;
}

.pc-gomoku-cell[data-stone='2'] .pc-gomoku-stone {
  background: #f7f7f5;
  box-shadow:
    inset 0 0 0 1px #8a8a86,
    0 2px 5px rgba(0, 0, 0, 0.14);
}

.pc-gomoku-cell[data-last='true'] .pc-gomoku-stone {
  outline: 2px solid var(--pc-theme-accent);
  outline-offset: 2px;
}
</style>
