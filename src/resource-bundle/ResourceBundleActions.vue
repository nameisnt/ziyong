<template>
  <button v-if="source" class="pc-soft-btn" type="button" :disabled="disabled" @click="mode = 'export'">
    <i class="fa-solid fa-file-zipper"></i>组合导出
  </button>
  <button v-if="allowImport" class="pc-soft-btn" type="button" :disabled="disabled" @click="mode = 'import'">
    <i class="fa-solid fa-file-import"></i>组合导入
  </button>
  <ResourceBundleDialog
    v-if="mode"
    :kind="kind"
    :source="mode === 'export' ? source : undefined"
    @close="mode = null"
    @imported="$emit('imported')"
  />
</template>
<script setup lang="ts">
import type { BundleKind, BundleSource } from './model';
const props = defineProps<{ kind: BundleKind; source?: BundleSource; disabled?: boolean; allowImport?: boolean }>();
defineEmits<{ imported: [] }>();
const mode = ref<'export' | 'import' | null>(null);
const ResourceBundleDialog = defineAsyncComponent(() => import('./ResourceBundleDialog.vue'));
watch([() => props.source?.kind, () => props.source?.name, () => props.allowImport], () => {
  mode.value = null;
});
onDeactivated(() => {
  mode.value = null;
});
</script>
