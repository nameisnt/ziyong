<template>
  <GenerationPreviewPage
    v-model:content="content"
    v-model:raw="raw"
    :reparse-handler="reparseHandler"
    :save-label="mode === 'rewrite' ? '保存新版本' : '保存信件'"
    :source-label="bookTitle"
    :text-provider-summary="metaLabel"
    :title="title"
    :warnings="warnings"
    @back="$emit('back')"
    @reparse="$emit('reparse')"
    @save="$emit('save')"
  />
</template>

<script setup lang="ts">
import GenerationPreviewPage from '@/components/GenerationPreviewPage.vue';

defineProps<{
  bookTitle: string;
  metaLabel: string;
  mode: 'create' | 'rewrite';
  reparseHandler: () => boolean | Promise<boolean>;
  title: string;
  warnings: string[];
}>();

defineEmits<{ back: []; reparse: []; save: [] }>();
const content = defineModel<string>('content', { required: true });
const raw = defineModel<string>('raw', { required: true });
</script>
