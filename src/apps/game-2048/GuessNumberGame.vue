<template>
  <section class="pc-minigame-panel">
    <section class="pc-minigame-stats">
      <article>
        <span>{{ t`次数` }}</span
        ><strong>{{ state.guesses.length }}</strong>
      </article>
      <article>
        <span>{{ t`最佳` }}</span
        ><strong>{{ state.best || '-' }}</strong>
      </article>
      <article>
        <span>{{ t`状态` }}</span
        ><strong>{{ state.status === 'won' ? t`猜中` : t`进行中` }}</strong>
      </article>
    </section>

    <form class="pc-guess-form" @submit.prevent="submitGuess">
      <input
        v-model="draft"
        class="pc-field"
        inputmode="numeric"
        maxlength="4"
        :placeholder="t`输入四位不重复数字`"
        :disabled="state.status === 'won'"
        @input="sanitizeDraft"
      />
      <button class="pc-primary-btn" type="submit" :disabled="state.status === 'won'">
        <i class="fa-solid fa-magnifying-glass"></i><span>{{ t`猜` }}</span>
      </button>
    </form>

    <section v-if="state.guesses.length" class="pc-guess-history" aria-label="猜测记录">
      <article v-for="(guess, index) in reversedGuesses" :key="`${guess.value}:${index}`">
        <strong>{{ guess.value }}</strong>
        <span>{{ guess.bulls }}A {{ guess.cows }}B</span>
      </article>
    </section>

    <article v-if="state.status === 'won'" class="pc-section-card pc-minigame-message">
      <strong>{{ t`答案是` }} {{ state.answer }}</strong>
    </article>

    <div class="pc-form-actions pc-minigame-actions">
      <button class="pc-primary-btn" type="button" @click="newGame">
        <i class="fa-solid fa-rotate-right"></i><span>{{ t`新一局` }}</span>
      </button>
      <InfoHint
        :label="t`猜数字说明`"
        :text="t`答案由四个不重复数字组成，首位不会是 0。A 表示数字和位置都正确，B 表示数字正确但位置不对。`"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import InfoHint from '@/components/InfoHint.vue';
import { usePhoneStore } from '@/store/phone';
import { miniGameFields } from './fields';
import { readMiniGameSettings, writeMiniGameSettings } from './miniGameStorage';
import { GuessNumberSchema } from './backupSchemas';

type GuessNumberState = z.infer<typeof GuessNumberSchema>;

function createAnswer() {
  const first = String(1 + Math.floor(Math.random() * 9));
  const remaining = Array.from({ length: 10 }, (_, index) => String(index)).filter(value => value !== first);
  for (let index = remaining.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [remaining[index], remaining[swapIndex]] = [remaining[swapIndex], remaining[index]];
  }
  return first + remaining.slice(0, 3).join('');
}

function createState(best = 0): GuessNumberState {
  return { answer: createAnswer(), best, guesses: [], status: 'playing' };
}

const phone = usePhoneStore();
const state = ref<GuessNumberState>(
  readMiniGameSettings(miniGameFields.guessNumber, GuessNumberSchema, () => createState()),
);
const draft = ref('');
const reversedGuesses = computed(() => [...state.value.guesses].reverse());

function save() {
  writeMiniGameSettings(miniGameFields.guessNumber, GuessNumberSchema, state.value);
}

function sanitizeDraft() {
  draft.value = draft.value.replace(/\D/g, '').slice(0, 4);
}

function submitGuess() {
  const guess = draft.value;
  if (!/^\d{4}$/.test(guess) || new Set(guess).size !== 4) {
    phone.noticeWarning(t`请输入四个不重复数字`);
    return;
  }
  if (state.value.guesses.some(item => item.value === guess)) {
    phone.noticeWarning(t`这个数字已经猜过了`);
    return;
  }
  const bulls = [...guess].filter((value, index) => state.value.answer[index] === value).length;
  const cows = [...guess].filter(value => state.value.answer.includes(value)).length - bulls;
  state.value.guesses.push({ bulls, cows, value: guess });
  draft.value = '';
  if (bulls === 4) {
    state.value.status = 'won';
    const attempts = state.value.guesses.length;
    if (!state.value.best || attempts < state.value.best) state.value.best = attempts;
  }
  save();
}

function newGame() {
  state.value = createState(state.value.best);
  draft.value = '';
  save();
}
</script>

<style scoped>
.pc-guess-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.pc-guess-form .pc-field {
  letter-spacing: 0;
  text-align: center;
  font-size: 22px;
  font-weight: 800;
}

.pc-guess-form .pc-primary-btn {
  min-inline-size: 76px;
}

.pc-guess-history {
  display: grid;
  gap: 8px;
}

.pc-guess-history article {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid var(--pc-border);
  padding: 8px 4px;
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
