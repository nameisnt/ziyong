<template>
  <section class="pc-minigame-panel">
    <section class="pc-minigame-stats">
      <article>
        <span>{{ t`雷` }}</span>
        <strong>{{ remainingMines }}</strong>
      </article>
      <article>
        <span>{{ t`已开` }}</span>
        <strong>{{ openedCount }}</strong>
      </article>
      <article>
        <span>{{ t`模式` }}</span>
        <strong>{{ mode === 'open' ? t`翻开` : t`插旗` }}</strong>
      </article>
    </section>

    <div class="pc-minigame-segment pc-minigame-segment-three" role="group" aria-label="扫雷难度">
      <button
        v-for="option in difficultyOptions"
        :key="option.id"
        class="pc-segment-btn"
        :class="{ active: state.difficulty === option.id }"
        type="button"
        @click="setDifficulty(option.id)"
      >
        <span>{{ option.label }}</span>
      </button>
    </div>

    <div class="pc-minigame-segment pc-minigame-segment-three" role="group" aria-label="扫雷棋盘大小">
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

    <div class="pc-minigame-segment" role="group" aria-label="扫雷模式">
      <button class="pc-segment-btn" :class="{ active: mode === 'open' }" type="button" @click="mode = 'open'">
        <i class="fa-solid fa-hand-pointer"></i>
        <span>{{ t`翻开` }}</span>
      </button>
      <button class="pc-segment-btn" :class="{ active: mode === 'flag' }" type="button" @click="mode = 'flag'">
        <i class="fa-solid fa-flag"></i>
        <span>{{ t`插旗` }}</span>
      </button>
    </div>

    <div class="pc-mine-board-wrap">
      <section class="pc-mine-board" :style="boardStyle" aria-label="扫雷棋盘">
        <button
          v-for="cell in state.cells"
          :key="cell.id"
          class="pc-mine-cell"
          :data-open="cell.open"
          :data-mine="state.status === 'lost' && cell.mine"
          type="button"
          @click="handleCell(cell.id)"
          @contextmenu.prevent="toggleFlag(cell.id)"
        >
          <i v-if="cell.flag && !cell.open" class="fa-solid fa-flag"></i>
          <i v-else-if="state.status === 'lost' && cell.mine" class="fa-solid fa-bomb"></i>
          <span v-else-if="cell.open && cell.near">{{ cell.near }}</span>
        </button>
      </section>
    </div>

    <article v-if="state.status === 'lost' || state.status === 'won'" class="pc-section-card pc-minigame-message">
      <strong>{{ statusTitle }}</strong>
    </article>

    <div class="pc-form-actions pc-minigame-actions">
      <button class="pc-primary-btn" type="button" @click="newGame">
        <i class="fa-solid fa-rotate-right"></i>
        <span>{{ t`新一局` }}</span>
      </button>
      <InfoHint
        :label="t`扫雷说明`"
        :text="t`翻开所有安全格即可获胜。第一次翻开会保护当前格及相邻格；手机上可切换翻开和插旗模式。`"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import InfoHint from '@/components/InfoHint.vue';
import { miniGameFields } from './fields';
import { readMiniGameSettings, writeMiniGameSettings } from './miniGameStorage';
import { MinesweeperSchema } from './backupSchemas';

type Cell = { flag: boolean; id: number; mine: boolean; near: number; open: boolean };
type BoardSize = 'large' | 'medium' | 'small';
type MineDifficulty = 'easy' | 'hard' | 'normal';
type MineStatus = 'lost' | 'playing' | 'ready' | 'won';

const difficultyOptions: Array<{ density: number; id: MineDifficulty; label: string }> = [
  { density: 0.12, id: 'easy', label: '简' },
  { density: 0.17, id: 'normal', label: '中' },
  { density: 0.22, id: 'hard', label: '难' },
];
const boardSizeOptions: Array<{ dimension: number; id: BoardSize; label: string }> = [
  { dimension: 6, id: 'small', label: '小 6×6' },
  { dimension: 8, id: 'medium', label: '中 8×8' },
  { dimension: 10, id: 'large', label: '大 10×10' },
];

type MinesweeperState = z.infer<typeof MinesweeperSchema>;

const mode = ref<'flag' | 'open'>('open');
const storedState = readMiniGameSettings(miniGameFields.minesweeper, MinesweeperSchema, () => createEmptyState());
const state = ref<MinesweeperState>(normalizeState(storedState));

const boardDimension = computed(
  () => boardSizeOptions.find(option => option.id === state.value.boardSize)?.dimension ?? 8,
);
const cellCount = computed(() => boardDimension.value * boardDimension.value);
const mineCount = computed(() => {
  const density = difficultyOptions.find(option => option.id === state.value.difficulty)?.density ?? 0.17;
  return Math.max(1, Math.round(cellCount.value * density));
});
const boardStyle = computed(() => ({
  '--mine-board-size': boardDimension.value,
}));
const remainingMines = computed(() =>
  Math.max(0, mineCount.value - state.value.cells.filter(cell => cell.flag).length),
);
const openedCount = computed(() => state.value.cells.filter(cell => cell.open).length);
const statusTitle = computed(() => {
  if (state.value.status === 'won') return t`扫清了`;
  if (state.value.status === 'lost') return t`踩雷了`;
  return t`准备扫雷`;
});
function createEmptyState(
  boardSize: BoardSize = 'medium',
  difficulty: MineDifficulty = 'normal',
  wins = 0,
): MinesweeperState {
  const dimension = boardSizeOptions.find(option => option.id === boardSize)?.dimension ?? 8;
  return {
    boardSize,
    cells: Array.from({ length: dimension * dimension }, (_, id) => ({
      flag: false,
      id,
      mine: false,
      near: 0,
      open: false,
    })),
    difficulty,
    status: 'ready',
    wins,
  };
}

function normalizeState(value: MinesweeperState): MinesweeperState {
  const dimension = boardSizeOptions.find(option => option.id === value.boardSize)?.dimension ?? 8;
  const expectedCount = dimension * dimension;
  if (value.cells.length !== expectedCount || value.cells.some((cell, index) => cell.id !== index)) {
    return createEmptyState(value.boardSize, value.difficulty, value.wins);
  }
  return value;
}

function save() {
  writeMiniGameSettings(miniGameFields.minesweeper, MinesweeperSchema, state.value);
}

function neighbors(id: number) {
  const dimension = boardDimension.value;
  const x = id % dimension;
  const y = Math.floor(id / dimension);
  const result: number[] = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (!dx && !dy) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < dimension && ny < dimension) result.push(ny * dimension + nx);
    }
  }
  return result;
}

function createMinedBoard(firstId: number) {
  const cells = createEmptyState(state.value.boardSize, state.value.difficulty, state.value.wins).cells;
  const safe = new Set([firstId, ...neighbors(firstId)]);
  const candidates = cells.map(cell => cell.id).filter(id => !safe.has(id));
  for (let count = 0; count < mineCount.value && candidates.length; count += 1) {
    const pick = Math.floor(Math.random() * candidates.length);
    const id = candidates.splice(pick, 1)[0];
    if (id !== undefined) cells[id].mine = true;
  }
  cells.forEach(cell => {
    cell.near = neighbors(cell.id).filter(id => cells[id]?.mine).length;
  });
  return cells;
}

function newGame() {
  state.value = createEmptyState(state.value.boardSize, state.value.difficulty, state.value.wins);
  save();
}

function setDifficulty(difficulty: MineDifficulty) {
  state.value = createEmptyState(state.value.boardSize, difficulty, state.value.wins);
  save();
}

function setBoardSize(boardSize: BoardSize) {
  state.value = createEmptyState(boardSize, state.value.difficulty, state.value.wins);
  save();
}

function toggleFlag(id: number) {
  const cell = state.value.cells[id];
  if (!cell || cell.open || state.value.status === 'lost' || state.value.status === 'won') return;
  cell.flag = !cell.flag;
  save();
}

function floodOpen(cells: Cell[], startId: number) {
  const queue = [startId];
  const seen = new Set<number>();
  while (queue.length) {
    const id = queue.shift();
    if (id === undefined || seen.has(id)) continue;
    seen.add(id);
    const cell = cells[id];
    if (!cell || cell.flag || cell.open) continue;
    cell.open = true;
    if (!cell.mine && cell.near === 0) {
      neighbors(id).forEach(nextId => queue.push(nextId));
    }
  }
}

function checkWin(cells: Cell[]) {
  return cells.every(cell => cell.mine || cell.open);
}

function openCell(id: number) {
  if (state.value.status === 'lost' || state.value.status === 'won') return;
  if (state.value.status === 'ready') {
    state.value.cells = createMinedBoard(id);
    state.value.status = 'playing';
  }
  const cell = state.value.cells[id];
  if (!cell || cell.flag || cell.open) return;
  if (cell.mine) {
    state.value.status = 'lost';
    save();
    return;
  }
  floodOpen(state.value.cells, id);
  if (checkWin(state.value.cells)) {
    state.value.status = 'won';
    state.value.wins += 1;
  }
  save();
}

function handleCell(id: number) {
  if (mode.value === 'flag') toggleFlag(id);
  else openCell(id);
}
</script>

<style scoped>
.pc-mine-board-wrap {
  max-width: 100%;
  padding-bottom: 2px;
}

.pc-mine-board {
  display: grid;
  grid-template-columns: repeat(var(--mine-board-size), minmax(0, 1fr));
  grid-template-rows: repeat(var(--mine-board-size), minmax(0, 1fr));
  gap: 2px;
  width: min(100%, 420px);
  aspect-ratio: 1;
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  background: color-mix(in srgb, var(--pc-text) 6%, var(--pc-surface-strong) 94%);
  padding: 4px;
}

.pc-mine-cell {
  display: grid;
  min-width: 0;
  min-height: 0;
  place-items: center;
  border: 1px solid var(--pc-border);
  border-radius: calc(var(--pc-control-radius) - 3px);
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  cursor: pointer;
  font-size: 15px;
  font-weight: 800;
  line-height: 1;
  overflow: hidden;
  padding: 0;
}

.pc-mine-cell[data-open='true'] {
  background: color-mix(in srgb, var(--pc-text) 4%, var(--pc-surface) 96%);
  color: var(--pc-theme-accent);
}

.pc-mine-cell[data-mine='true'] {
  background: color-mix(in srgb, var(--pc-danger) 18%, var(--pc-surface) 82%);
  color: var(--pc-danger);
}
</style>
