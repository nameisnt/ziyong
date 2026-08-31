<template>
  <section class="pc-minigame-panel">
    <section class="pc-minigame-stats">
      <article>
        <span>{{ t`棋盘` }}</span
        ><strong>{{ dimension }}×{{ dimension }}</strong>
      </article>
      <article>
        <span>{{ t`步数` }}</span
        ><strong>{{ state.moves }}</strong>
      </article>
      <article>
        <span>{{ t`最佳` }}</span
        ><strong>{{ currentBest || '-' }}</strong>
      </article>
    </section>

    <div class="pc-minigame-segment pc-minigame-segment-three" role="group" aria-label="数字华容道棋盘大小">
      <button
        v-for="option in sizeOptions"
        :key="option.id"
        class="pc-segment-btn"
        :class="{ active: state.size === option.id }"
        type="button"
        @click="setSize(option.id)"
      >
        {{ option.label }}
      </button>
    </div>

    <section class="pc-sliding-board" :style="boardStyle" aria-label="数字华容道棋盘">
      <button
        v-for="(value, index) in state.board"
        :key="value || 'blank'"
        class="pc-sliding-tile"
        :class="{ blank: value === 0, movable: movableIndices.has(index) }"
        type="button"
        :disabled="!value || state.status === 'done' || !movableIndices.has(index)"
        @click="moveTile(index)"
      >
        {{ value || '' }}
      </button>
    </section>

    <article v-if="state.status === 'done'" class="pc-section-card pc-minigame-message">
      <strong>{{ t`排列完成` }}</strong>
    </article>

    <div class="pc-form-actions pc-minigame-actions">
      <button class="pc-soft-btn" type="button" @click="resetPuzzle">
        <i class="fa-solid fa-rotate-left"></i><span>{{ t`重置` }}</span>
      </button>
      <button class="pc-primary-btn" type="button" @click="newPuzzle">
        <i class="fa-solid fa-shuffle"></i><span>{{ t`新一局` }}</span>
      </button>
      <MiniGameSoundButton />
      <InfoHint
        :label="t`数字华容道说明`"
        :text="
          t`点击空格旁的数字移动方块，按从左到右、从上到下的顺序排列全部数字。棋盘通过合法移动洗牌，因此每一局都保证可解。`
        "
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import InfoHint from '@/components/InfoHint.vue';
import MiniGameSoundButton from './MiniGameSoundButton.vue';
import { playMiniGameSound } from './miniGameAudio';
import { miniGameFields } from './fields';
import { readMiniGameSettings, writeMiniGameSettings } from './miniGameStorage';
import { SlidingPuzzleSchema } from './backupSchemas';

type BoardSize = 'large' | 'medium' | 'small';

const sizeOptions: Array<{ dimension: number; id: BoardSize; label: string }> = [
  { dimension: 3, id: 'small', label: '小 3×3' },
  { dimension: 4, id: 'medium', label: '中 4×4' },
  { dimension: 5, id: 'large', label: '大 5×5' },
];
type SlidingPuzzleState = z.infer<typeof SlidingPuzzleSchema>;

function dimensionFor(boardSize: BoardSize) {
  return sizeOptions.find(option => option.id === boardSize)?.dimension ?? 3;
}

function adjacentIndices(blankIndex: number, size: number) {
  const x = blankIndex % size;
  const y = Math.floor(blankIndex / size);
  return [
    x > 0 ? blankIndex - 1 : -1,
    x < size - 1 ? blankIndex + 1 : -1,
    y > 0 ? blankIndex - size : -1,
    y < size - 1 ? blankIndex + size : -1,
  ].filter(index => index >= 0);
}

function shuffledBoard(size: number) {
  const board = Array.from({ length: size * size }, (_, index) => (index + 1) % (size * size));
  let blank = board.length - 1;
  let previousBlank = -1;
  for (let step = 0; step < size * size * 30; step += 1) {
    const candidates = adjacentIndices(blank, size).filter(index => index !== previousBlank);
    const next = candidates[Math.floor(Math.random() * candidates.length)] ?? candidates[0];
    if (next === undefined) continue;
    [board[blank], board[next]] = [board[next], board[blank]];
    previousBlank = blank;
    blank = next;
  }
  if (isSolved(board)) {
    const next = adjacentIndices(blank, size)[0];
    if (next !== undefined) [board[blank], board[next]] = [board[next], board[blank]];
  }
  return board;
}

function createState(boardSize: BoardSize = 'small', best = { large: 0, medium: 0, small: 0 }): SlidingPuzzleState {
  const initial = shuffledBoard(dimensionFor(boardSize));
  return { best, board: [...initial], initial, moves: 0, size: boardSize, status: 'playing' };
}

function normalizeState(value: SlidingPuzzleState) {
  const expected = dimensionFor(value.size) ** 2;
  return value.board.length === expected && value.initial.length === expected
    ? value
    : createState(value.size, value.best);
}

const state = ref<SlidingPuzzleState>(
  normalizeState(readMiniGameSettings(miniGameFields.slidingPuzzle, SlidingPuzzleSchema, () => createState())),
);
const dimension = computed(() => dimensionFor(state.value.size));
const blankIndex = computed(() => state.value.board.indexOf(0));
const movableIndices = computed(() => new Set(adjacentIndices(blankIndex.value, dimension.value)));
const currentBest = computed(() => state.value.best[state.value.size]);
const boardStyle = computed(() => ({ '--sliding-size': dimension.value }));

function save() {
  writeMiniGameSettings(miniGameFields.slidingPuzzle, SlidingPuzzleSchema, state.value);
}

function isSolved(board: number[]) {
  return board.every((value, index) => value === (index + 1) % board.length);
}

function moveTile(index: number) {
  if (state.value.status === 'done' || !movableIndices.value.has(index)) return;
  const blank = blankIndex.value;
  [state.value.board[blank], state.value.board[index]] = [state.value.board[index], state.value.board[blank]];
  state.value.moves += 1;
  if (isSolved(state.value.board)) {
    state.value.status = 'done';
    const best = state.value.best[state.value.size];
    if (!best || state.value.moves < best) state.value.best[state.value.size] = state.value.moves;
  }
  save();
  playMiniGameSound(state.value.status === 'done' ? 'success' : 'move');
}

function resetPuzzle() {
  state.value.board = [...state.value.initial];
  state.value.moves = 0;
  state.value.status = 'playing';
  save();
  playMiniGameSound('reset');
}

function newPuzzle() {
  state.value = createState(state.value.size, state.value.best);
  save();
  playMiniGameSound('reset');
}

function setSize(boardSize: BoardSize) {
  state.value = createState(boardSize, state.value.best);
  save();
  playMiniGameSound('reset');
}
</script>

<style scoped>
.pc-sliding-board {
  display: grid;
  grid-template-columns: repeat(var(--sliding-size), minmax(0, 1fr));
  width: min(100%, 420px);
  aspect-ratio: 1;
  align-self: center;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  background: color-mix(in srgb, var(--pc-text) 6%, var(--pc-surface-strong) 94%);
  gap: 7px;
  padding: 8px;
}

.pc-sliding-tile {
  display: grid;
  min-width: 0;
  min-height: 0;
  place-items: center;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  cursor: default;
  font-size: clamp(18px, 7cqw, 30px);
  font-weight: 800;
  padding: 0;
}

.pc-sliding-tile.movable {
  cursor: pointer;
  color: var(--pc-theme-accent);
}

.pc-sliding-tile.blank {
  border-color: transparent;
  background: transparent;
}
</style>
