<template>
  <GenerationPreviewPage
    v-model:content="content"
    v-model:raw="raw"
    :reparse-handler="reparseHandler"
    save-label="保存条目"
    :source-label="sourceLabel"
    :text-provider-summary="textProviderSummary"
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
  reparseHandler: () => boolean | Promise<boolean>;
  sourceLabel: string;
  textProviderSummary: string;
  title: string;
  warnings: string[];
}>();

defineEmits<{
  back: [];
  reparse: [];
  save: [];
}>();

const content = defineModel<string>('content', { required: true });
const raw = defineModel<string>('raw', { required: true });
</script>
