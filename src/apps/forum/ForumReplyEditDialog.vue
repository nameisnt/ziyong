<template>
  <Teleport to="#tavern-phone-root .pc-phone-shell">
    <section class="pc-modal-backdrop" @click.self="close">
      <article
        ref="dialogRef"
        class="pc-section-card pc-modal-dialog pc-forum-reply-edit-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="编辑回复"
        tabindex="-1"
      >
        <header class="pc-section-head">
          <strong>编辑回复</strong>
          <button class="pc-icon-btn" type="button" title="关闭" aria-label="关闭" @click="close">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>
        <div class="pc-field-group">
          <span class="pc-field-label">回复作者</span>
          <input v-model="author" class="pc-field" type="text" aria-label="回复作者" placeholder="回复作者" />
        </div>
        <div class="pc-field-group">
          <span class="pc-field-label">回复内容</span>
          <textarea v-model="content" class="pc-area" aria-label="回复内容" placeholder="回复内容"></textarea>
        </div>
        <label class="pc-setting-row">
          <span>标记为楼主</span>
          <input v-model="isOriginalPoster" type="checkbox" aria-label="标记为楼主" />
        </label>
        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" @click="close">取消</button>
          <button class="pc-primary-btn" type="button" :disabled="!content.trim()" @click="save">保存</button>
        </div>
      </article>
    </section>
  </Teleport>
</template>

<script setup lang="ts">
import { usePhoneModalLifecycle } from '@/composables/usePhoneModalLifecycle';

interface ForumReplyEditable {
  author: string;
  content: string;
  isOriginalPoster: boolean;
}

const props = defineProps<{ reply: ForumReplyEditable }>();
const emit = defineEmits<{
  close: [];
  save: [input: ForumReplyEditable];
}>();

const dialogRef = ref<HTMLElement | null>(null);
const author = ref(props.reply.author);
const content = ref(props.reply.content);
const isOriginalPoster = ref(props.reply.isOriginalPoster);

function close() {
  emit('close');
}

function save() {
  if (!content.value.trim()) return;
  emit('save', {
    author: author.value.trim(),
    content: content.value.trim(),
    isOriginalPoster: isOriginalPoster.value,
  });
}

usePhoneModalLifecycle({ dialogRef, isOpen: () => true, onClose: close });
</script>
