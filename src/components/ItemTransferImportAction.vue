<template>
  <button
    :class="buttonClass"
    type="button"
    :title="label"
    :aria-label="label"
    @click="open = true"
  >
    <i class="fa-solid fa-file-import"></i><span v-if="!iconOnly">{{ label }}</span>
  </button>
  <ItemTransferImportModal :app-id="appId" :open="open" :params="params" @close="open = false" @imported="$emit('imported', $event)" />
</template>

<script setup lang="ts">
import ItemTransferImportModal from '@/components/ItemTransferImportModal.vue';

withDefaults(
  defineProps<{
    appId: string;
    buttonClass?: string;
    iconOnly?: boolean;
    label?: string;
    params: Record<string, string>;
  }>(),
  {
    buttonClass: '',
    iconOnly: false,
    label: '导入单条内容',
  },
);
defineEmits<{ imported: [itemId: string] }>();
const open = ref(false);
</script>

