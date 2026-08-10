<template>
  <section class="pc-shared-generation-preview-page pc-generation-preview-page">
    <article class="pc-section-card pc-detail-card pc-generation-preview-card">
      <GenerationPreviewPanel
        :content="content"
        :raw="raw"
        raw-editable
        :reparse-handler="reparseHandler"
        :save-label="saveLabel"
        :scan-enabled="scanEnabled"
        :source-label="sourceLabel"
        :text-provider-summary="textProviderSummary"
        :title="title"
        :warnings="warnings"
        @back="$emit('back')"
        @reparse="$emit('reparse')"
      @save="$emit('save')"
      @update:content="content = $event"
      @update:raw="raw = $event"
      >
        <template v-if="$slots.content" #content="slotProps">
          <slot name="content" v-bind="slotProps"></slot>
        </template>
      </GenerationPreviewPanel>
    </article>
  </section>
</template>

<script setup lang="ts">
import GenerationPreviewPanel from '@/components/GenerationPreviewPanel.vue';

defineProps<{
  reparseHandler: () => boolean | Promise<boolean>;
  saveLabel: string;
  sourceLabel: string;
  scanEnabled?: boolean;
  textProviderSummary: string;
  title: string;
  warnings: string[];
}>();

defineEmits<{ back: []; reparse: []; save: [] }>();
const content = defineModel<string>('content', { required: true });
const raw = defineModel<string>('raw', { required: true });
</script>

<style scoped>
.pc-shared-generation-preview-page {
  min-height: 100%;
}
</style>
