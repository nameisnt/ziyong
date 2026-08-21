<template>
  <button :class="buttonClass" type="button" :title="label" :aria-label="label" @click="runExport">
    <i class="fa-solid fa-file-export"></i><span v-if="!iconOnly">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
import { downloadItemTransfer } from '@/util/itemTransfer';

const props = withDefaults(
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
    label: '导出本条',
  },
);

function runExport() {
  try {
    downloadItemTransfer(props.appId, props.params);
    toastr.success('已导出单条内容');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '单条内容导出失败');
  }
}
</script>

