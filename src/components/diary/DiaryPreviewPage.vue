<template>
  <GenerationPreviewPage
    v-model:content="content"
    v-model:raw="raw"
    :reparse-handler="reparseHandler"
    :save-label="saveLabel"
    :source-label="sourceLabel"
    :text-provider-summary="perspectiveName"
    :title="displayTitle"
    :warnings="warnings"
    @back="$emit('back')"
    @reparse="$emit('reparse')"
    @save="$emit('save')"
  />
</template>

<script setup lang="ts">
import GenerationPreviewPage from '@/components/GenerationPreviewPage.vue';

const props = defineProps<{
  action: 'generate' | 'read-reaction';
  occurredAt: string;
  perspectiveName: string;
  reparseHandler: () => boolean | Promise<boolean>;
  title: string;
  warnings: string[];
}>();

defineEmits<{ back: []; reparse: []; save: [] }>();

const content = defineModel<string>('content', { required: true });
const raw = defineModel<string>('raw', { required: true });
const displayTitle = computed(() => (props.action === 'read-reaction' ? `📖 ${props.title}` : props.title));
const saveLabel = computed(() => (props.action === 'read-reaction' ? '保存阅读反应' : '保存日记'));
const sourceLabel = computed(
  () => props.occurredAt || (props.action === 'read-reaction' ? '阅读反应预览' : '日记预览'),
);
</script>
