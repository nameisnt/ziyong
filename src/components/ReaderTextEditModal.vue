<template>
  <Teleport to="#tavern-phone-root .pc-phone-shell">
    <div
      v-if="open"
      class="pc-modal-backdrop pc-reader-edit-mask"
      role="presentation"
      @click.self="emit('close')"
    >
      <section
        ref="dialogEl"
        class="pc-section-card pc-modal-dialog pc-reader-edit-modal"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
      >
        <header class="pc-reader-edit-head">
          <div>
            <strong>{{ chosen ? t`编辑整句` : t`选择文字位置` }}</strong>
            <small>{{ occurrences.length > 1 ? `正文中找到 ${occurrences.length} 处` : t`只会覆盖当前内容` }}</small>
          </div>
          <button class="pc-icon-btn" type="button" :aria-label="t`关闭`" :title="t`关闭`" @click="emit('close')">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>

        <div v-if="!chosen" class="pc-reader-edit-candidates">
          <button
            v-for="occurrence in occurrences"
            :key="occurrence.offset"
            class="pc-list-row pc-reader-edit-candidate"
            type="button"
            @click="chooseOccurrence(occurrence.index)"
          >
            <span>
              <strong>第 {{ occurrence.index + 1 }} 处</strong>
              <small>{{ occurrence.sentence.trim() || '（空句）' }}</small>
            </span>
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>

        <div v-else class="pc-reader-edit-body">
          <label class="pc-field-group">
            <span class="pc-field-label">选中文字</span>
            <input class="pc-field" :value="selectedText" readonly />
          </label>
          <label class="pc-field-group">
            <span class="pc-field-label">整句内容</span>
            <textarea ref="textareaEl" v-model="draft" class="pc-area" rows="8"></textarea>
          </label>
        </div>

        <div class="pc-form-actions">
          <button v-if="chosen && occurrences.length > 1" class="pc-soft-btn" type="button" @click="chosenIndex = -1">
            重选位置
          </button>
          <button class="pc-soft-btn" type="button" @click="emit('close')">取消</button>
          <button v-if="chosen" class="pc-primary-btn" type="button" @click="save">保存替换</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { usePhoneModalLifecycle } from '@/composables/usePhoneModalLifecycle';
import type { ReaderTextOccurrence } from '@/util/readerTextEdit';

const props = defineProps<{
  occurrences: ReaderTextOccurrence[];
  open: boolean;
  selectedText: string;
}>();

const emit = defineEmits<{
  close: [];
  save: [payload: { occurrence: ReaderTextOccurrence; replacement: string }];
}>();

const chosenIndex = ref(-1);
const draft = ref('');
const dialogEl = ref<HTMLElement | null>(null);
const textareaEl = ref<HTMLTextAreaElement | null>(null);
const chosen = computed(() => props.occurrences.find(item => item.index === chosenIndex.value) ?? null);

usePhoneModalLifecycle({
  dialogRef: dialogEl,
  isOpen: () => props.open,
  onClose: () => emit('close'),
});

async function chooseOccurrence(index: number) {
  chosenIndex.value = index;
  const occurrence = props.occurrences.find(item => item.index === index);
  draft.value = occurrence?.sentence ?? '';
  await nextTick();
  const textarea = textareaEl.value;
  if (!textarea || !occurrence) return;
  const start = occurrence.offset - occurrence.sentenceStart;
  textarea.focus({ preventScroll: true });
  textarea.setSelectionRange(start, start + props.selectedText.length);
}

function save() {
  if (!chosen.value) return;
  emit('save', { occurrence: chosen.value, replacement: draft.value });
}

watch(
  () => props.open,
  async open => {
    if (!open) return;
    chosenIndex.value = -1;
    draft.value = '';
    await nextTick();
    if (props.occurrences.length === 1) await chooseOccurrence(props.occurrences[0]?.index ?? 0);
  },
);
</script>

<style scoped>
.pc-reader-edit-mask {
  --pc-modal-z: 72;
}

.pc-reader-edit-modal {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: min(100%, 340px);
  max-height: min(82%, 620px);
  min-height: 0;
  padding: 14px;
}

.pc-reader-edit-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pc-reader-edit-head > div {
  display: grid;
  gap: 3px;
}

.pc-reader-edit-head small,
.pc-reader-edit-candidate small {
  color: var(--pc-muted);
}

.pc-reader-edit-candidates,
.pc-reader-edit-body {
  min-height: 0;
  padding-block: 12px;
  overflow: auto;
}

.pc-reader-edit-candidate {
  grid-template-columns: minmax(0, 1fr) auto;
}

.pc-reader-edit-candidate span,
.pc-reader-edit-candidate strong,
.pc-reader-edit-candidate small {
  display: block;
  min-width: 0;
}

.pc-reader-edit-candidate small {
  margin-top: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-reader-edit-body {
  display: grid;
  align-content: start;
  gap: 12px;
}
</style>
