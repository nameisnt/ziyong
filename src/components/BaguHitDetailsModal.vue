<template>
  <Teleport to="#tavern-phone-root .pc-phone-shell">
    <div v-if="open" class="pc-modal-backdrop pc-bagu-hit-modal-mask" role="presentation" @click.self="emit('close')">
      <section
        ref="dialogEl"
        class="pc-section-card pc-modal-dialog pc-bagu-hit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pc-bagu-hit-modal-title"
        tabindex="-1"
      >
        <header class="pc-bagu-hit-modal-head">
          <div>
            <strong id="pc-bagu-hit-modal-title">{{ t`本句命中详情` }}</strong>
            <small>{{ `${hits.length} 处 · ${typeLabel}` }}</small>
          </div>
          <button class="pc-icon-btn" type="button" :title="t`关闭`" :aria-label="t`关闭`" @click="emit('close')">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>

        <div class="pc-bagu-hit-modal-body">
          <p class="pc-bagu-hit-modal-sentence">
            <template v-for="(segment, index) in sentenceSegments" :key="index">
              <mark v-if="segment.highlighted">{{ segment.text }}</mark>
              <span v-else>{{ segment.text }}</span>
            </template>
          </p>

          <div class="pc-bagu-hit-modal-list">
            <article v-for="hit in hits" :key="hit.id" class="pc-bagu-hit-modal-item">
              <div class="pc-bagu-hit-modal-change">
                <span class="pc-type-pill" :data-type="hit.type">{{
                  hit.type === 'replacement' ? t`词汇` : t`句式`
                }}</span>
                <strong>{{ hit.match }}</strong>
                <i class="fa-solid fa-arrow-right"></i>
                <em>{{ hit.replacement || t`删除` }}</em>
              </div>
              <div class="pc-bagu-hit-modal-rule">
                <span>{{ hit.ruleTitle }}</span>
                <button
                  class="pc-soft-btn compact danger"
                  type="button"
                  :disabled="writing"
                  @click="emit('disable-rule', hit)"
                >
                  {{ t`停用规则` }}
                </button>
              </div>
            </article>
          </div>
        </div>

        <div class="pc-form-actions">
          <button class="pc-primary-btn" type="button" @click="emit('close')">{{ t`关闭` }}</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { usePhoneModalLifecycle } from '@/composables/usePhoneModalLifecycle';
import type { BaguHit } from '@/util/bagu';

const props = defineProps<{
  hits: BaguHit[];
  open: boolean;
  sentence: string;
  sentenceStart: number;
  typeLabel: string;
  writing?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  'disable-rule': [hit: BaguHit];
}>();

const dialogEl = ref<HTMLElement | null>(null);

usePhoneModalLifecycle({
  dialogRef: dialogEl,
  isOpen: () => props.open,
  onClose: () => emit('close'),
});

const sentenceSegments = computed(() => {
  const segments: Array<{ highlighted: boolean; text: string }> = [];
  let cursor = 0;
  [...props.hits]
    .sort((left, right) => left.start - right.start || right.end - left.end)
    .forEach(hit => {
      const start = hit.start - props.sentenceStart;
      const end = hit.end - props.sentenceStart;
      if (start < cursor || start < 0 || end > props.sentence.length) return;
      if (start > cursor) segments.push({ highlighted: false, text: props.sentence.slice(cursor, start) });
      segments.push({ highlighted: true, text: props.sentence.slice(start, end) });
      cursor = end;
    });
  if (cursor < props.sentence.length) {
    segments.push({ highlighted: false, text: props.sentence.slice(cursor) });
  }
  return segments;
});
</script>

<style scoped>
.pc-bagu-hit-modal-mask {
  --pc-modal-z: 70;
}

.pc-bagu-hit-modal {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: min(100%, 330px);
  max-height: min(78%, 560px);
  min-height: 0;
  padding: 14px;
}

.pc-bagu-hit-modal-head,
.pc-bagu-hit-modal-rule,
.pc-bagu-hit-modal-change {
  display: flex;
  align-items: center;
}

.pc-bagu-hit-modal-head {
  justify-content: space-between;
  gap: 12px;
}

.pc-bagu-hit-modal-head > div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.pc-bagu-hit-modal-head small,
.pc-bagu-hit-modal-rule span {
  color: var(--pc-muted);
}

.pc-bagu-hit-modal-body {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-block: 12px;
}

.pc-bagu-hit-modal-sentence {
  margin: 0;
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--pc-form-control-bg);
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.pc-bagu-hit-modal-sentence mark {
  border-radius: 5px;
  padding-inline: 2px;
  background: color-mix(in srgb, var(--pc-danger) 22%, var(--pc-surface-strong) 78%);
  color: var(--pc-text);
}

.pc-bagu-hit-modal-list {
  display: grid;
  gap: 0;
  margin-top: 10px;
  border-top: 1px solid var(--pc-border);
}

.pc-bagu-hit-modal-item {
  display: grid;
  gap: 8px;
  border-bottom: 1px solid var(--pc-border);
  padding: 10px 0;
  background: transparent;
}

.pc-bagu-hit-modal-change {
  gap: 6px;
  min-width: 0;
  font-size: 12px;
}

.pc-bagu-hit-modal-change :is(strong, em) {
  min-width: 0;
  overflow-wrap: anywhere;
}

.pc-bagu-hit-modal-change em,
.pc-bagu-hit-modal-change i {
  color: var(--pc-muted);
  font-style: normal;
}

.pc-bagu-hit-modal-change i {
  flex: 0 0 auto;
  font-size: 10px;
}

.pc-bagu-hit-modal-rule {
  justify-content: space-between;
  gap: 8px;
}

.pc-bagu-hit-modal-rule span {
  min-width: 0;
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-type-pill {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 4px 8px;
  background: var(--pc-surface);
  font-size: 11px;
}

.pc-type-pill[data-type='replacement'] {
  color: var(--pc-danger);
}

.pc-type-pill[data-type='template'] {
  color: var(--pc-hint);
}

.pc-bagu-hit-modal .pc-form-actions {
  margin-top: 0;
}
</style>
