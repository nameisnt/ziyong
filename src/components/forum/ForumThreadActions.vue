<template>
  <div class="pc-detail-footer pc-forum-thread-footer">
    <div class="pc-detail-actions six">
      <button class="pc-soft-btn" type="button" :title="t`八股检测`" @click="$emit('bagu')">
        <i class="fa-solid fa-filter-circle-xmark"></i>
      </button>
      <button class="pc-soft-btn" type="button" :title="t`生成回复`" @click="$emit('generate-replies')">
        <i class="fa-solid fa-wand-magic-sparkles"></i>
      </button>
      <button
        :class="['pc-soft-btn', { active: favorite }]"
        type="button"
        :title="favorite ? t`取消收藏` : t`收藏`"
        @click="$emit('favorite')"
      >
        <i class="fa-solid fa-bookmark"></i>
      </button>
      <button class="pc-soft-btn" type="button" :title="t`编辑主楼`" @click="$emit('edit')">
        <i class="fa-solid fa-pen"></i>
      </button>
      <button class="pc-soft-btn" type="button" :title="t`重新生成主题`" @click="$emit('rewrite')">
        <i class="fa-solid fa-rotate"></i>
      </button>
      <button
        class="pc-soft-btn danger"
        type="button"
        :title="versionCount > 1 ? t`删除当前版本` : t`删除帖子`"
        @click="$emit('remove')"
      >
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  favorite: boolean;
  versionCount: number;
}>();

defineEmits<{
  bagu: [];
  edit: [];
  favorite: [];
  'generate-replies': [];
  remove: [];
  rewrite: [];
}>();
</script>

<style scoped>
.pc-soft-btn.danger {
  color: var(--pc-danger);
}
</style>
