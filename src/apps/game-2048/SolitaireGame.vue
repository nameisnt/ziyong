<template>
  <section class="pc-minigame-panel pc-solitaire-game">
    <section class="pc-minigame-stats">
      <article>
        <span>{{ t`牌库` }}</span
        ><strong>{{ stockCount }}</strong>
      </article>
      <article>
        <span>{{ t`收集` }}</span
        ><strong>{{ foundationCount }}/52</strong>
      </article>
      <article>
        <span>{{ t`步数` }}</span
        ><strong>{{ state.moves }}</strong>
      </article>
    </section>

    <section class="pc-solitaire-top" aria-label="接龙牌库与基础堆">
      <button class="pc-solitaire-card-slot stock" type="button" :disabled="!game.canDrawCard()" @click="drawCard">
        <span v-if="stockCount" class="pc-solitaire-card-back"><i class="fa-solid fa-layer-group"></i></span>
        <i v-else class="fa-solid fa-rotate-right"></i>
        <small>{{ stockCount }}</small>
      </button>
      <button
        class="pc-solitaire-card-slot"
        :class="{ selected: selected?.from === 'waste' }"
        type="button"
        :disabled="!wasteTop"
        @click="selectWaste"
        @dblclick="moveWasteToFoundation"
      >
        <span v-if="wasteTop" class="pc-solitaire-card-face" :data-red="isRed(wasteTop)">
          <strong>{{ rankLabel(wasteTop) }}</strong
          ><i>{{ suitSymbol(wasteTop.getSuit()) }}</i>
        </span>
      </button>
      <span class="pc-solitaire-top-spacer"></span>
      <button
        v-for="foundation in foundations"
        :key="foundation.suit"
        class="pc-solitaire-card-slot foundation"
        :class="{ selected: selected?.from === 'foundation' && selected.suit === foundation.suit }"
        type="button"
        @click="selectOrMoveFoundation(foundation.suit)"
      >
        <span v-if="foundation.card" class="pc-solitaire-card-face" :data-red="isRed(foundation.card)">
          <strong>{{ rankLabel(foundation.card) }}</strong
          ><i>{{ suitSymbol(foundation.suit) }}</i>
        </span>
        <i v-else class="pc-solitaire-empty-suit">{{ suitSymbol(foundation.suit) }}</i>
      </button>
    </section>

    <section class="pc-solitaire-tableau" aria-label="接龙桌面牌堆">
      <div
        v-for="(pile, pileIndex) in tableauPiles"
        :key="pileIndex"
        class="pc-solitaire-pile"
        @click="moveSelectionToTableau(pileIndex)"
      >
        <span v-if="!pile.length" class="pc-solitaire-empty-column"><i class="fa-regular fa-square"></i></span>
        <button
          v-for="(card, cardIndex) in pile"
          :key="`${card.getSuit()}:${card.getRank()}`"
          class="pc-solitaire-tableau-card"
          :class="{ selected: isSelectedTableauCard(pileIndex, cardIndex) }"
          :data-upturned="card.getUpturned()"
          type="button"
          @click.stop="selectOrMoveTableauCard(pileIndex, cardIndex)"
          @dblclick.stop="moveTableauCardToFoundation(pileIndex, cardIndex)"
        >
          <span v-if="card.getUpturned()" class="pc-solitaire-card-face" :data-red="isRed(card)">
            <strong>{{ rankLabel(card) }}</strong
            ><i>{{ suitSymbol(card.getSuit()) }}</i>
          </span>
          <span v-else class="pc-solitaire-card-back"><i class="fa-solid fa-diamond"></i></span>
        </button>
      </div>
    </section>

    <article v-if="state.completed" class="pc-section-card pc-minigame-message">
      <strong>{{ t`接龙完成` }}</strong>
    </article>

    <div class="pc-form-actions pc-minigame-actions">
      <button class="pc-soft-btn" type="button" :disabled="!state.previous" @click="undoMove">
        <i class="fa-solid fa-rotate-left"></i><span>{{ t`撤回` }}</span>
      </button>
      <button class="pc-primary-btn" type="button" @click="newGame">
        <i class="fa-solid fa-shuffle"></i><span>{{ t`新一局` }}</span>
      </button>
      <InfoHint
        :label="t`纸牌接龙说明`"
        :text="
          t`点击牌库抽一张牌；先点击要移动的牌，再点击目标牌堆。桌面按红黑交替、点数递减排列，空列只能放 K；基础堆按同花色从 A 到 K 收集。双击可尝试自动收集。`
        "
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import InfoHint from '@/components/InfoHint.vue';
import { usePhoneStore } from '@/store/phone';
import { KlondikeGame, Move } from '@korziee/klondike';
import type { Card } from '@korziee/klondike/lib/classes/Card';
import type { ISerializedKlondikeGame } from '@korziee/klondike/lib/classes/KlondikeGame';
import type { TSuit } from '@korziee/klondike/lib/types/TSuit';
import { miniGameFields } from './fields';
import { readMiniGameSettings, writeMiniGameSettings } from './miniGameStorage';

type Selection =
  | { from: 'foundation'; suit: TSuit }
  | { from: 'tableau'; pile: number; start: number }
  | { from: 'waste' };

const CardSchema = z.object({
  rank: z.enum(['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Ace', 'King', 'Queen', 'Jack']),
  suit: z.enum(['Spades', 'Hearts', 'Clubs', 'Diamonds']),
  upturned: z.boolean(),
});
const PileSchema = z.object({ cards: z.array(CardSchema).max(52) });
const SerializedGameSchema = z.object({
  foundation: z.object({ clubs: PileSchema, diamonds: PileSchema, hearts: PileSchema, spades: PileSchema }),
  history: z.array(z.unknown()).default([]),
  stock: PileSchema,
  tableau: z.object({ piles: z.array(PileSchema).length(7) }),
  waste: PileSchema,
});
const SolitaireSchema = z.object({
  completed: z.boolean().default(false),
  game: SerializedGameSchema,
  moves: z.number().int().nonnegative().default(0),
  previous: SerializedGameSchema.nullable().default(null),
  wins: z.number().int().nonnegative().default(0),
});
type SolitaireState = z.infer<typeof SolitaireSchema>;

function stripHistory(serialized: ISerializedKlondikeGame): ISerializedKlondikeGame {
  return { ...serialized, history: [] };
}

function dealtGame() {
  const next = new KlondikeGame();
  next.deal();
  return next;
}

function createState(wins = 0): SolitaireState {
  const next = dealtGame();
  return { completed: false, game: stripHistory(next.serialize()), moves: 0, previous: null, wins };
}

const phone = usePhoneStore();
const state = ref<SolitaireState>(readMiniGameSettings(miniGameFields.solitaire, SolitaireSchema, () => createState()));
const game = shallowRef(KlondikeGame.unserialize(state.value.game as ISerializedKlondikeGame));
const revision = ref(0);
const selected = ref<Selection | null>(null);
const foundationSuits: TSuit[] = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];

function trackRevision() {
  return revision.value;
}

const tableauPiles = computed(() => {
  trackRevision();
  return game.value.tableau.getPiles().map(pile => pile.getCards());
});
const wasteTop = computed(() => {
  trackRevision();
  return game.value.waste.getTopCard();
});
const stockCount = computed(() => {
  trackRevision();
  return game.value.stock.getCards().length;
});
const foundations = computed(() => {
  trackRevision();
  return foundationSuits.map(suit => ({ card: game.value.foundation.getPileForSuit(suit).getTopCard(), suit }));
});
const foundationCount = computed(() => {
  trackRevision();
  return game.value.foundation.getPiles().reduce((sum, pile) => sum + pile.getCards().length, 0);
});

function save() {
  state.value.game = stripHistory(game.value.serialize()) as SolitaireState['game'];
  writeMiniGameSettings(miniGameFields.solitaire, SolitaireSchema, state.value);
}

function beginMove() {
  state.value.previous = stripHistory(game.value.serialize()) as SolitaireState['previous'];
}

function finishMove() {
  game.value.history = [];
  state.value.moves += 1;
  selected.value = null;
  revision.value += 1;
  if (foundationCount.value === 52 && !state.value.completed) {
    state.value.completed = true;
    state.value.wins += 1;
  }
  save();
}

function selectedCards() {
  const current = selected.value;
  if (!current) return [];
  if (current.from === 'waste') {
    const card = game.value.waste.getTopCard();
    return card ? [card] : [];
  }
  if (current.from === 'foundation') {
    const card = game.value.foundation.getPileForSuit(current.suit).getTopCard();
    return card ? [card] : [];
  }
  return game.value.tableau.getTableauPile(current.pile).getCards().slice(current.start);
}

function moveFromSelection(to: 'foundation' | 'tableau', toPile?: number) {
  const current = selected.value;
  const cards = selectedCards();
  if (!current || !cards.length) return false;
  const move = new Move({
    cards,
    from: current.from,
    meta: {
      ...(current.from === 'tableau' ? { fromPile: current.pile } : {}),
      ...(to === 'tableau' ? { toPile } : {}),
    },
    to,
  });
  const validation = game.value.validateMove(move);
  if (!validation.valid) {
    phone.noticeWarning(t`这组牌不能放到这里`, { timeoutMs: 1800 });
    return false;
  }
  beginMove();
  game.value.makeMove(move);
  finishMove();
  return true;
}

function drawCard() {
  if (!game.value.canDrawCard()) return;
  beginMove();
  if (game.value.draw()) finishMove();
}

function selectWaste() {
  if (!wasteTop.value) return;
  selected.value = selected.value?.from === 'waste' ? null : { from: 'waste' };
}

function moveWasteToFoundation() {
  if (!wasteTop.value) return;
  selected.value = { from: 'waste' };
  moveFromSelection('foundation');
}

function selectOrMoveFoundation(suit: TSuit) {
  if (selected.value) {
    if (selected.value.from === 'foundation' && selected.value.suit === suit) selected.value = null;
    else {
      const [card] = selectedCards();
      if (!card || card.getSuit() !== suit) {
        phone.noticeWarning(t`请放到对应花色的基础堆`, { timeoutMs: 1800 });
        return;
      }
      moveFromSelection('foundation');
    }
    return;
  }
  if (game.value.foundation.getPileForSuit(suit).getTopCard()) selected.value = { from: 'foundation', suit };
}

function selectOrMoveTableauCard(pileIndex: number, cardIndex: number) {
  const pile = game.value.tableau.getTableauPile(pileIndex + 1).getCards();
  const card = pile[cardIndex];
  if (!card) return;
  if (selected.value && !(selected.value.from === 'tableau' && selected.value.pile === pileIndex + 1)) {
    moveFromSelection('tableau', pileIndex + 1);
    return;
  }
  if (!card.getUpturned()) return;
  const next: Selection = { from: 'tableau', pile: pileIndex + 1, start: cardIndex };
  selected.value =
    selected.value?.from === 'tableau' && selected.value.pile === next.pile && selected.value.start === next.start
      ? null
      : next;
}

function moveSelectionToTableau(pileIndex: number) {
  if (selected.value) moveFromSelection('tableau', pileIndex + 1);
}

function moveTableauCardToFoundation(pileIndex: number, cardIndex: number) {
  const pile = game.value.tableau.getTableauPile(pileIndex + 1).getCards();
  if (cardIndex !== pile.length - 1 || !pile[cardIndex]?.getUpturned()) return;
  selected.value = { from: 'tableau', pile: pileIndex + 1, start: cardIndex };
  moveFromSelection('foundation');
}

function undoMove() {
  const previous = state.value.previous;
  if (!previous) return;
  game.value = KlondikeGame.unserialize(previous as ISerializedKlondikeGame);
  state.value.previous = null;
  state.value.moves = Math.max(0, state.value.moves - 1);
  if (state.value.completed) {
    state.value.completed = false;
    state.value.wins = Math.max(0, state.value.wins - 1);
  }
  selected.value = null;
  revision.value += 1;
  save();
}

function newGame() {
  const next = dealtGame();
  game.value = next;
  state.value = {
    completed: false,
    game: stripHistory(next.serialize()) as SolitaireState['game'],
    moves: 0,
    previous: null,
    wins: state.value.wins,
  };
  selected.value = null;
  revision.value += 1;
  save();
}

function isSelectedTableauCard(pileIndex: number, cardIndex: number) {
  return (
    selected.value?.from === 'tableau' && selected.value.pile === pileIndex + 1 && cardIndex >= selected.value.start
  );
}

function isRed(card: Card) {
  return card.getSuit() === 'Hearts' || card.getSuit() === 'Diamonds';
}

function suitSymbol(suit: TSuit) {
  return ({ Clubs: '♣', Diamonds: '♦', Hearts: '♥', Spades: '♠' } as const)[suit];
}

function rankLabel(card: Card) {
  return ({ Ace: 'A', Jack: 'J', King: 'K', Queen: 'Q' } as Record<string, string>)[card.getRank()] ?? card.getRank();
}
</script>

<style scoped>
.pc-solitaire-game {
  container-type: inline-size;
}

.pc-solitaire-top,
.pc-solitaire-tableau {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 5px;
}

.pc-solitaire-card-slot,
.pc-solitaire-tableau-card {
  position: relative;
  display: grid;
  min-width: 0;
  aspect-ratio: 0.7;
  place-items: center;
  border: 1px solid var(--pc-border);
  border-radius: 6px;
  background: var(--pc-surface-strong);
  color: var(--pc-muted);
  cursor: pointer;
  overflow: hidden;
  padding: 0;
}

.pc-solitaire-card-slot.selected,
.pc-solitaire-tableau-card.selected {
  outline: 2px solid var(--pc-theme-accent);
  outline-offset: -2px;
}

.pc-solitaire-card-slot small {
  position: absolute;
  right: 3px;
  bottom: 2px;
  font-size: 9px;
}

.pc-solitaire-card-face,
.pc-solitaire-card-back {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  padding: 4px;
}

.pc-solitaire-card-face {
  background: var(--pc-surface-strong);
  color: var(--pc-text);
}

.pc-solitaire-card-face[data-red='true'] {
  color: var(--pc-danger);
}

.pc-solitaire-card-face strong {
  font-size: clamp(10px, 4cqw, 17px);
  line-height: 1;
}

.pc-solitaire-card-face i {
  font-size: clamp(11px, 4.5cqw, 19px);
  font-style: normal;
  line-height: 1;
}

.pc-solitaire-card-back {
  align-items: center;
  justify-content: center;
  border: 3px solid var(--pc-surface-strong);
  background: color-mix(in srgb, var(--pc-theme-accent) 68%, var(--pc-text) 32%);
  color: var(--pc-primary-text);
}

.pc-solitaire-top-spacer {
  min-width: 0;
}

.pc-solitaire-empty-suit {
  opacity: 0.3;
  font-size: clamp(18px, 7cqw, 28px);
  font-style: normal;
}

.pc-solitaire-tableau {
  min-height: 330px;
  align-items: start;
}

.pc-solitaire-pile {
  min-width: 0;
  min-height: 92px;
}

.pc-solitaire-tableau-card {
  width: 100%;
}

.pc-solitaire-tableau-card + .pc-solitaire-tableau-card {
  margin-top: -42px;
}

.pc-solitaire-empty-column {
  display: grid;
  width: 100%;
  aspect-ratio: 0.7;
  place-items: center;
  border: 1px dashed var(--pc-border);
  border-radius: 6px;
  color: var(--pc-muted);
}
</style>
