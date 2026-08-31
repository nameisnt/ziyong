<template>
  <section class="pc-minigame-panel">
    <section class="pc-minigame-stats pc-guess-number-stats">
      <article>
        <span>{{ t`次数` }}</span
        ><strong>{{ state.guesses.length }}</strong>
      </article>
      <article>
        <span>{{ t`最佳` }}</span
        ><strong>{{ currentBest || '-' }}</strong>
      </article>
      <article>
        <span>{{ t`状态` }}</span
        ><strong>{{ state.status === 'won' ? t`猜中` : t`进行中` }}</strong>
      </article>
    </section>

    <div class="pc-minigame-segment pc-minigame-segment-four" role="group" aria-label="猜数字位数">
      <button
        v-for="count in digitOptions"
        :key="count"
        class="pc-segment-btn"
        :class="{ active: state.digitCount === count }"
        type="button"
        @click="setDigitCount(count)"
      >
        {{ count }} 位
      </button>
    </div>

    <form class="pc-guess-form" @submit.prevent="submitGuess">
      <input
        v-model="draft"
        class="pc-field pc-guess-number-input"
        inputmode="numeric"
        :maxlength="state.digitCount"
        :placeholder="`输入 ${state.digitCount} 位不重复数字`"
        :disabled="state.status === 'won'"
        @input="sanitizeDraft"
      />
      <button class="pc-primary-btn" type="submit" :disabled="state.status === 'won'">
        <i class="fa-solid fa-magnifying-glass"></i><span>{{ t`猜` }}</span>
      </button>
    </form>

    <section v-if="state.guesses.length" class="pc-guess-history" aria-label="猜测记录">
      <article v-for="(guess, index) in reversedGuesses" :key="`${guess.value}:${index}`">
        <div>
          <strong>{{ guess.value }}</strong>
          <span>{{ guess.bulls }}A {{ guess.cows }}B</span>
        </div>
        <p>{{ guess.comment }}</p>
      </article>
    </section>

    <article v-if="state.status === 'won'" class="pc-section-card pc-minigame-message">
      <strong>{{ t`答案是` }} {{ state.answer }}</strong>
    </article>

    <div class="pc-form-actions pc-minigame-actions">
      <button class="pc-primary-btn" type="button" @click="newGame">
        <i class="fa-solid fa-rotate-right"></i><span>{{ t`新一局` }}</span>
      </button>
      <MiniGameSoundButton />
      <InfoHint
        :label="t`猜数字说明`"
        :text="`答案由 ${state.digitCount} 个不重复数字组成，首位不会是 0。A 表示数字和位置都正确，B 表示数字正确但位置不对。`"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import InfoHint from '@/components/InfoHint.vue';
import { usePhoneStore } from '@/store/phone';
import MiniGameSoundButton from './MiniGameSoundButton.vue';
import { playMiniGameSound } from './miniGameAudio';
import { miniGameFields } from './fields';
import { readMiniGameSettings, writeMiniGameSettings } from './miniGameStorage';
import { GuessNumberSchema } from './backupSchemas';

type GuessNumberState = z.infer<typeof GuessNumberSchema>;
type DigitCount = GuessNumberState['digitCount'];
type CommentKind = 'close' | 'firstHit' | 'firstMiss' | 'improved' | 'same' | 'won' | 'worse';

const digitOptions: DigitCount[] = [3, 4, 5, 6];
const comments: Record<CommentKind, string[]> = {
  close: [
    '只差临门一脚了，这次别再精准绕开答案。',
    '答案已经站在面前，就看你会不会再次擦肩而过。',
    '很接近。接下来是推理，还是继续靠气氛？',
    '线索都快把答案写出来了，稳住最后一步。',
  ],
  firstHit: [
    '开局还能碰到线索，运气暂时愿意配合你。',
    '至少不是全空，第一步勉强算走对了方向。',
    '有数字肯露面，接下来就看你能不能留住它。',
    '起手有收获，先别急着把它挥霍掉。',
  ],
  firstMiss: [
    '完美避开全部答案，这也是一种稳定发挥。',
    '一个都没碰到，排除法被你演示得很彻底。',
    '答案毫发无伤，你的第一次试探很有礼貌。',
    '零命中。好消息是错误方向已经非常明确。',
  ],
  improved: [
    '终于往前挪了一步，线索没有白白牺牲。',
    '比上一回强，看来记忆功能偶尔也会上线。',
    '方向对了，继续保持这难得的清醒。',
    '有进步。别庆祝太早，答案还没投降。',
  ],
  same: [
    '成绩纹丝不动，你成功换了一种方式原地踏步。',
    '线索没变，只有输入框经历了新的数字。',
    '和上一回一样精准，也一样没有解决问题。',
    '局面保持稳定，稳定得像完全没推进。',
  ],
  won: [
    '猜中了。答案终于等到你赶上来。',
    '正确。过程略显曲折，结局总算没有迷路。',
    '这次全对，可以暂时收起你的试错艺术了。',
    '答案已被拿下，今天的推理能力准时到岗。',
  ],
  worse: [
    '比上一回更远，线索显然被你反向理解了。',
    '刚找到一点方向，又很有主见地走丢了。',
    '这一步成功证明：退步也可以很具体。',
    '命中变少了，你对错误答案的探索倒是更深入。',
  ],
};

function digitKey(count: DigitCount) {
  return String(count) as '3' | '4' | '5' | '6';
}

function createAnswer(digitCount: DigitCount) {
  const first = String(1 + Math.floor(Math.random() * 9));
  const remaining = Array.from({ length: 10 }, (_, index) => String(index)).filter(value => value !== first);
  for (let index = remaining.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [remaining[index], remaining[swapIndex]] = [remaining[swapIndex], remaining[index]];
  }
  return first + remaining.slice(0, digitCount - 1).join('');
}

function createState(
  digitCount: DigitCount = 4,
  bestByDigits: GuessNumberState['bestByDigits'] = { 3: 0, 4: 0, 5: 0, 6: 0 },
): GuessNumberState {
  return { answer: createAnswer(digitCount), bestByDigits, digitCount, guesses: [], status: 'playing' };
}

const phone = usePhoneStore();
const state = ref<GuessNumberState>(
  readMiniGameSettings(miniGameFields.guessNumber, GuessNumberSchema, () => createState()),
);
const draft = ref('');
const reversedGuesses = computed(() => [...state.value.guesses].reverse());
const currentBest = computed(() => state.value.bestByDigits[digitKey(state.value.digitCount)]);

function save() {
  writeMiniGameSettings(miniGameFields.guessNumber, GuessNumberSchema, state.value);
}

function sanitizeDraft() {
  draft.value = draft.value.replace(/\D/g, '').slice(0, state.value.digitCount);
}

function clueScore(guess: GuessNumberState['guesses'][number]) {
  return guess.bulls * (state.value.digitCount + 1) + guess.cows;
}

function pickComment(kind: CommentKind) {
  const previous = state.value.guesses.at(-1)?.comment;
  const pool = comments[kind];
  const candidates = pool.filter(comment => comment !== previous);
  return candidates[Math.floor(Math.random() * candidates.length)] ?? pool[0] ?? '';
}

function commentKind(bulls: number, cows: number): CommentKind {
  if (bulls === state.value.digitCount) return 'won';
  if (bulls === state.value.digitCount - 1) return 'close';
  const previous = state.value.guesses.at(-1);
  if (!previous) return bulls + cows ? 'firstHit' : 'firstMiss';
  const currentScore = bulls * (state.value.digitCount + 1) + cows;
  const previousScore = clueScore(previous);
  if (currentScore > previousScore) return 'improved';
  if (currentScore === previousScore) return 'same';
  return 'worse';
}

function submitGuess() {
  const guess = draft.value;
  if (
    guess.length !== state.value.digitCount ||
    !/^\d+$/.test(guess) ||
    new Set(guess).size !== state.value.digitCount
  ) {
    phone.noticeWarning(`请输入 ${state.value.digitCount} 个不重复数字`);
    playMiniGameSound('fail');
    return;
  }
  if (state.value.guesses.some(item => item.value === guess)) {
    phone.noticeWarning(t`这个数字已经猜过了`);
    playMiniGameSound('fail');
    return;
  }
  const bulls = [...guess].filter((value, index) => state.value.answer[index] === value).length;
  const cows = [...guess].filter(value => state.value.answer.includes(value)).length - bulls;
  const comment = pickComment(commentKind(bulls, cows));
  state.value.guesses.push({ bulls, comment, cows, value: guess });
  draft.value = '';
  if (bulls === state.value.digitCount) {
    state.value.status = 'won';
    const attempts = state.value.guesses.length;
    const key = digitKey(state.value.digitCount);
    if (!state.value.bestByDigits[key] || attempts < state.value.bestByDigits[key]) {
      state.value.bestByDigits[key] = attempts;
    }
  }
  save();
  playMiniGameSound(state.value.status === 'won' ? 'success' : 'move');
}

function newGame() {
  state.value = createState(state.value.digitCount, state.value.bestByDigits);
  draft.value = '';
  save();
  playMiniGameSound('reset');
}

function setDigitCount(digitCount: DigitCount) {
  if (digitCount === state.value.digitCount) return;
  state.value = createState(digitCount, state.value.bestByDigits);
  draft.value = '';
  save();
  playMiniGameSound('reset');
}
</script>

<style scoped>
.pc-guess-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.pc-guess-number-stats {
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 0.8fr) minmax(0, 1.4fr);
}

.pc-guess-form .pc-primary-btn {
  min-inline-size: 76px;
}

.pc-minigame-segment-four {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.pc-guess-history {
  display: grid;
  gap: 8px;
}

.pc-guess-history article {
  display: grid;
  gap: 5px;
  border-bottom: 1px solid var(--pc-border);
  padding: 8px 4px;
}

.pc-guess-history article > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-guess-history p {
  margin: 0;
  color: var(--pc-muted);
  font-size: 13px;
  line-height: 1.45;
}

.pc-guess-history strong {
  font-size: 20px;
  letter-spacing: 0;
}

.pc-guess-history span {
  color: var(--pc-theme-accent);
  font-weight: 800;
}
</style>
