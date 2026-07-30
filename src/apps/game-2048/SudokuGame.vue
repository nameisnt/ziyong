<template>
  <section class="pc-minigame-panel">
    <section class="pc-minigame-stats pc-minigame-stats-four">
      <article>
        <span>{{ t`题目` }}</span>
        <strong>{{ state.puzzleNumber }}</strong>
      </article>
      <article>
        <span>{{ t`空格` }}</span>
        <strong>{{ emptyCount }}</strong>
      </article>
      <article>
        <span>{{ t`错误` }}</span>
        <strong>{{ state.mistakes }}</strong>
      </article>
      <article>
        <span>{{ t`提示` }}</span>
        <strong>{{ state.hints }}</strong>
      </article>
    </section>

    <section class="pc-sudoku-board" aria-label="数独棋盘">
      <button
        v-for="(value, index) in state.board"
        :key="index"
        class="pc-sudoku-cell"
        :class="{ active: selected === index, given: givens[index], conflict: conflicts.has(index) }"
        type="button"
        @click="selected = index"
      >
        {{ value || '' }}
      </button>
    </section>

    <div class="pc-sudoku-pad">
      <button v-for="number in 9" :key="number" class="pc-soft-btn" type="button" @click="setNumber(number)">
        {{ number }}
      </button>
      <button class="pc-soft-btn" type="button" :title="t`清除`" @click="setNumber(0)">
        <i class="fa-solid fa-delete-left"></i>
      </button>
    </div>

    <article v-if="state.status === 'done' || conflicts.size" class="pc-section-card pc-minigame-message">
      <strong>{{ statusText }}</strong>
    </article>

    <div class="pc-form-actions pc-minigame-actions">
      <button class="pc-soft-btn" type="button" @click="resetPuzzle">
        <i class="fa-solid fa-rotate-left"></i>
        <span>{{ t`重置` }}</span>
      </button>
      <button class="pc-soft-btn" type="button" @click="fillHint">
        <i class="fa-solid fa-lightbulb"></i>
        <span>{{ t`提示` }}</span>
      </button>
      <button class="pc-primary-btn" type="button" @click="nextPuzzle">
        <i class="fa-solid fa-forward"></i>
        <span>{{ t`换题` }}</span>
      </button>
      <InfoHint :label="t`数独说明`" :text="t`每一行、每一列和每个 3×3 宫都需要填入不重复的 1 至 9。每次换题都会生成一局新的唯一解题目。`" />
    </div>
  </section>
</template>

<script setup lang="ts">
import InfoHint from '@/components/InfoHint.vue';
import { miniGameFields } from './fields';
import { readMiniGameSettings, writeMiniGameSettings } from './miniGameStorage';

type SudokuStatus = 'done' | 'playing';

const BoardSchema = z.array(z.number().int().min(0).max(9)).length(81);
const SudokuSchema = z.object({
  board: BoardSchema,
  hints: z.number().int().nonnegative().default(0),
  mistakes: z.number().int().nonnegative().default(0),
  puzzle: BoardSchema,
  puzzleNumber: z.number().int().positive().default(1),
  solution: BoardSchema,
  status: z.enum(['done', 'playing']).default('playing'),
});

type SudokuState = z.infer<typeof SudokuSchema>;

function shuffled<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function candidatesFor(board: number[], index: number) {
  const row = Math.floor(index / 9);
  const column = index % 9;
  const boxRow = Math.floor(row / 3) * 3;
  const boxColumn = Math.floor(column / 3) * 3;
  const used = new Set<number>();
  for (let offset = 0; offset < 9; offset += 1) {
    used.add(board[row * 9 + offset] ?? 0);
    used.add(board[offset * 9 + column] ?? 0);
    used.add(board[(boxRow + Math.floor(offset / 3)) * 9 + boxColumn + (offset % 3)] ?? 0);
  }
  return Array.from({ length: 9 }, (_, offset) => offset + 1).filter(value => !used.has(value));
}

function nextEmptyCell(board: number[]) {
  let bestIndex = -1;
  let bestCandidates: number[] = [];
  for (let index = 0; index < board.length; index += 1) {
    if (board[index]) continue;
    const candidates = candidatesFor(board, index);
    if (!candidates.length) return { candidates, index };
    if (bestIndex < 0 || candidates.length < bestCandidates.length) {
      bestIndex = index;
      bestCandidates = candidates;
      if (candidates.length === 1) break;
    }
  }
  return { candidates: bestCandidates, index: bestIndex };
}

function fillSolution(board: number[]): boolean {
  const next = nextEmptyCell(board);
  if (next.index < 0) return true;
  for (const value of shuffled(next.candidates)) {
    board[next.index] = value;
    if (fillSolution(board)) return true;
  }
  board[next.index] = 0;
  return false;
}

function countSolutions(board: number[], limit = 2): number {
  const next = nextEmptyCell(board);
  if (next.index < 0) return 1;
  if (!next.candidates.length) return 0;
  let count = 0;
  for (const value of next.candidates) {
    board[next.index] = value;
    count += countSolutions(board, limit - count);
    board[next.index] = 0;
    if (count >= limit) break;
  }
  return count;
}

function generatePuzzle() {
  const solution = Array.from({ length: 81 }, () => 0);
  fillSolution(solution);
  const puzzle = [...solution];
  const targetClues = 32;
  const pairs = shuffled(Array.from({ length: 41 }, (_, index) => [index, 80 - index]));
  let clueCount = 81;
  for (const pair of pairs) {
    const indices = [...new Set(pair)];
    if (clueCount - indices.length < targetClues) continue;
    const previous = indices.map(index => puzzle[index] ?? 0);
    indices.forEach(index => { puzzle[index] = 0; });
    if (countSolutions([...puzzle]) === 1) {
      clueCount -= indices.length;
    } else {
      indices.forEach((index, pairIndex) => { puzzle[index] = previous[pairIndex] ?? 0; });
    }
    if (clueCount <= targetClues) break;
  }
  return { puzzle, solution };
}

function createState(puzzleNumber = 1): SudokuState {
  const generated = generatePuzzle();
  return {
    board: [...generated.puzzle],
    hints: 0,
    mistakes: 0,
    puzzle: generated.puzzle,
    puzzleNumber,
    solution: generated.solution,
    status: 'playing',
  };
}

const state = ref<SudokuState>(readMiniGameSettings(miniGameFields.sudoku, SudokuSchema, () => createState()));
const selected = ref<number | null>(null);

const givens = computed(() => state.value.puzzle.map(Boolean));
const emptyCount = computed(() => state.value.board.filter(value => !value).length);
const statusText = computed(() => {
  if (state.value.status === 'done') return t`完成了`;
  if (conflicts.value.size) return t`有冲突`;
  return t`填写中`;
});

const conflicts = computed(() => {
  const result = new Set<number>();
  const groups: number[][] = [];
  for (let index = 0; index < 9; index += 1) {
    groups.push(Array.from({ length: 9 }, (_, offset) => index * 9 + offset));
    groups.push(Array.from({ length: 9 }, (_, offset) => offset * 9 + index));
  }
  for (let boxY = 0; boxY < 3; boxY += 1) {
    for (let boxX = 0; boxX < 3; boxX += 1) {
      groups.push(Array.from({ length: 9 }, (_, offset) => {
        const x = boxX * 3 + (offset % 3);
        const y = boxY * 3 + Math.floor(offset / 3);
        return y * 9 + x;
      }));
    }
  }
  groups.forEach(group => {
    const seen = new Map<number, number[]>();
    group.forEach(index => {
      const value = state.value.board[index];
      if (!value) return;
      seen.set(value, [...(seen.get(value) ?? []), index]);
    });
    seen.forEach(indices => {
      if (indices.length > 1) indices.forEach(index => result.add(index));
    });
  });
  return result;
});

function save() {
  writeMiniGameSettings(miniGameFields.sudoku, SudokuSchema, state.value);
}

function checkDone() {
  state.value.status = state.value.board.every((value, index) => value === state.value.solution[index]) ? 'done' : 'playing';
}

function setNumber(number: number) {
  if (selected.value === null || givens.value[selected.value]) return;
  if (number && number !== state.value.solution[selected.value]) state.value.mistakes += 1;
  state.value.board[selected.value] = number;
  checkDone();
  save();
}

function fillHint() {
  const index = selected.value !== null && !givens.value[selected.value] && state.value.board[selected.value] !== state.value.solution[selected.value]
    ? selected.value
    : state.value.board.findIndex((value, cellIndex) => !givens.value[cellIndex] && value !== state.value.solution[cellIndex]);
  if (index < 0) return;
  state.value.board[index] = state.value.solution[index] ?? 0;
  selected.value = index;
  state.value.hints += 1;
  checkDone();
  save();
}

function resetPuzzle() {
  state.value = {
    ...state.value,
    board: [...state.value.puzzle],
    hints: 0,
    mistakes: 0,
    status: 'playing',
  };
  selected.value = null;
  save();
}

function nextPuzzle() {
  state.value = createState(state.value.puzzleNumber + 1);
  selected.value = null;
  save();
}
</script>

<style scoped>
.pc-sudoku-board {
  display: grid;
  grid-template-columns: repeat(9, minmax(0, 1fr));
  width: min(100%, 420px);
  aspect-ratio: 1;
  align-self: center;
  border: 2px solid var(--pc-text);
  background: var(--pc-border);
  gap: 1px;
}

.pc-sudoku-cell {
  display: grid;
  min-width: 0;
  min-height: 0;
  place-items: center;
  border: 0;
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  cursor: pointer;
  font-size: clamp(15px, 4cqw, 22px);
  font-weight: 800;
}

.pc-sudoku-cell:nth-child(3n):not(:nth-child(9n)) {
  box-shadow: 2px 0 0 var(--pc-text);
}

.pc-sudoku-cell:nth-child(n + 19):nth-child(-n + 27),
.pc-sudoku-cell:nth-child(n + 46):nth-child(-n + 54) {
  border-bottom: 2px solid var(--pc-text);
}

.pc-sudoku-cell.given {
  background: color-mix(in srgb, var(--pc-theme-accent) 12%, var(--pc-surface-strong) 88%);
}

.pc-sudoku-cell.active {
  outline: 3px solid color-mix(in srgb, var(--pc-theme-accent) 55%, transparent 45%);
  outline-offset: -3px;
}

.pc-sudoku-cell.conflict {
  color: var(--pc-danger);
}

.pc-sudoku-pad {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.pc-sudoku-pad .pc-soft-btn {
  justify-content: center;
  min-width: 0;
  padding-inline: 0;
}
</style>
