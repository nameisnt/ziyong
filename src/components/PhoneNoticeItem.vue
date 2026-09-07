<template>
  <article
    ref="dialogRef"
    :role="interactive ? 'dialog' : undefined"
    :aria-modal="interactive ? true : undefined"
    :aria-label="interactive ? notice.title : undefined"
    :tabindex="interactive ? -1 : undefined"
    class="pc-phone-notice"
    :data-kind="notice.kind"
    @click="!notice.actions?.length && phone.dismissNotice(notice.id)"
  >
    <strong>{{ notice.title }}</strong>
    <span>{{ notice.message }}</span>
    <input
      v-if="notice.input"
      ref="inputRef"
      class="pc-phone-notice-input"
      :placeholder="notice.input.placeholder"
      type="text"
      :value="notice.inputValue"
      @click.stop
      @input="phone.updateNoticeInput(notice.id, ($event.target as HTMLInputElement).value)"
      @keydown.enter.stop.prevent="phone.chooseNoticeAction(notice.id, 'confirm')"
      @keydown.esc.stop.prevent="phone.dismissNotice(notice.id)"
    />
    <div v-if="notice.actions?.length" class="pc-phone-notice-actions">
      <button
        v-for="action in notice.actions"
        :key="action.id"
        class="pc-phone-notice-action"
        type="button"
        :data-role="action.role || 'soft'"
        @click.stop="phone.chooseNoticeAction(notice.id, action.id)"
      >
        {{ action.label }}
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { usePhoneModalLifecycle } from '@/composables/usePhoneModalLifecycle';
import { usePhoneStore, type PhoneNotice } from '@/store/phone';

const props = defineProps<{ notice: PhoneNotice }>();
const phone = usePhoneStore();
const interactive = computed(() => Boolean(props.notice.input || props.notice.actions?.length));
const dialogRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
usePhoneModalLifecycle({
  dialogRef,
  isOpen: () => phone.isOpen && interactive.value,
  initialFocus: () => inputRef.value,
  onClose: () => phone.dismissNotice(props.notice.id),
});
</script>

<style scoped>
.pc-phone-notice {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-width: 0;
  border: 1px solid var(--pc-border);
  border-radius: 14px;
  padding: 9px 11px;
  background: var(--pc-form-control-bg);
  color: var(--pc-form-control-text);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  line-height: 1.35;
  pointer-events: auto;
  text-align: left;
}

.pc-phone-notice:has(.pc-phone-notice-actions) {
  cursor: default;
}

.pc-phone-notice strong,
.pc-phone-notice span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pc-phone-notice strong {
  white-space: nowrap;
}

.pc-phone-notice span {
  display: -webkit-box;
  color: var(--pc-muted);
  white-space: normal;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.pc-phone-notice strong {
  color: var(--pc-theme-accent);
  font-weight: 850;
}

.pc-phone-notice[data-kind='success'] strong {
  color: #16a34a;
}

.pc-phone-notice[data-kind='warning'] strong {
  color: #d97706;
}

.pc-phone-notice[data-kind='error'] strong {
  color: var(--pc-danger);
}

.pc-phone-notice-input {
  grid-column: 1 / -1;
  width: 100%;
  min-width: 0;
  height: 32px;
  border: 1px solid var(--pc-border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--pc-form-control-text) 7%, var(--pc-form-control-bg) 93%);
  color: var(--pc-form-control-text);
  font: inherit;
  font-size: 12px;
  outline: none;
  padding: 0 10px;
}

.pc-phone-notice-actions {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  margin-top: 2px;
}

.pc-phone-notice-action {
  min-width: 0;
  height: 30px;
  border: 0;
  border-radius: 10px;
  background: color-mix(in srgb, var(--pc-form-control-text) 10%, var(--pc-form-control-bg) 90%);
  color: var(--pc-form-control-text);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
}

.pc-phone-notice-action[data-role='primary'] {
  background: var(--pc-theme-accent);
  color: white;
}

.pc-phone-notice-action[data-role='danger'] {
  background: color-mix(in srgb, var(--pc-danger) 14%, var(--pc-form-control-bg) 86%);
  color: var(--pc-danger);
}
</style>
