<template>
  <section class="pc-entry-library-page">
    <article class="pc-editor-card pc-entry-binding-editor">
      <label class="pc-field-group"><span>目标预设</span><select v-model="presetName" class="pc-select" @change="$emit('load-prompts')"><option value="">请选择预设</option><option v-for="name in presetNames" :key="name" :value="name">{{ name }}</option></select></label>
      <label class="pc-field-group"><span>目标预设条目</span><select v-model="promptKey" class="pc-select" @change="$emit('load-content')"><option value="">请选择条目</option><option v-for="prompt in prompts" :key="prompt.key" :value="prompt.key" :disabled="prompt.bound">{{ prompt.title }}</option></select></label>
      <label class="pc-field-group"><span>收藏分组</span><select v-model="groupId" class="pc-select"><option value="">请选择分组</option><option v-for="group in groups" :key="group.id" :value="group.id">{{ group.name }}</option></select></label>
      <label class="pc-field-group pc-entry-binding-template"><span><span>绑定内容</span><button class="pc-soft-btn compact" type="button" @click.prevent="insertPlaceholder">插入占位符</button></span><textarea ref="templateField" v-model="contentTemplate" class="pc-area compact" rows="5" :placeholder="`<a>${placeholder}</a>`"></textarea></label>
      <div class="pc-form-actions"><button class="pc-primary-btn" type="button" :disabled="saving || !presetName || !promptKey || !groupId || !contentTemplate.includes(placeholder)" @click="$emit('create')">{{ saving ? '同步中' : '创建绑定' }}</button></div>
    </article>
    <div class="pc-entry-binding-list">
      <article v-for="binding in bindings" :key="binding.id" class="pc-section-card pc-entry-binding-row"><div><strong>{{ binding.targetPromptName }}</strong><small>{{ binding.presetName }} · {{ groupNames[binding.groupId] || '分组已删除' }}</small><small>{{ compact(binding.contentTemplate) }}</small></div><button class="pc-icon-btn" type="button" :disabled="syncingIds.includes(binding.id)" title="立即同步" @click="$emit('sync', binding.id)"><i class="fa-solid fa-rotate"></i></button><button class="pc-icon-btn danger" type="button" title="删除绑定" @click="$emit('delete-binding', binding.id)"><i class="fa-solid fa-xmark"></i></button></article>
      <EmptyState v-if="!bindings.length" compact title="还没有分组绑定" />
    </div>
  </section>
</template>
<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import type { EntryLibraryBinding, EntryLibraryGroup } from '../store';
import type { EntryLibraryBindingPromptOption } from '../types';
const props = defineProps<{ bindings: EntryLibraryBinding[]; groupNames: Record<string, string>; groups: EntryLibraryGroup[]; placeholder: string; presetNames: string[]; prompts: EntryLibraryBindingPromptOption[]; saving: boolean; syncingIds: string[] }>();
const contentTemplate = defineModel<string>('contentTemplate', { required: true });
const groupId = defineModel<string>('groupId', { required: true });
const presetName = defineModel<string>('presetName', { required: true });
const promptKey = defineModel<string>('promptKey', { required: true });
defineEmits<{ create: []; 'delete-binding': [bindingId: string]; 'load-content': []; 'load-prompts': []; sync: [bindingId: string] }>();
const templateField = ref<HTMLTextAreaElement | null>(null);
function insertPlaceholder() { const field = templateField.value; const value = contentTemplate.value; const cursor = field?.selectionEnd ?? value.length; contentTemplate.value = `${value.slice(0, cursor)}${props.placeholder}${value.slice(cursor)}`; nextTick(() => { const caret = cursor + props.placeholder.length; field?.focus(); field?.setSelectionRange(caret, caret); }); }
function compact(content: string) { const text = content.replace(/\s+/g, ' ').trim(); return text.length > 80 ? `${text.slice(0, 80)}...` : text; }
</script>
<style scoped>
.pc-entry-library-page,
.pc-entry-binding-list { display: grid; min-height: 100%; align-content: start; gap: 12px; }
.pc-entry-binding-editor { display: grid; gap: 12px; }
.pc-entry-binding-template > span { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.pc-entry-binding-template .pc-area { min-height: 120px; }
.pc-entry-binding-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 8px; padding: 10px 12px; }
.pc-entry-binding-row > div { display: grid; min-width: 0; gap: 3px; }
.pc-entry-binding-row strong,
.pc-entry-binding-row small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pc-entry-binding-row small { color: var(--pc-muted); font-size: 11px; }
</style>
