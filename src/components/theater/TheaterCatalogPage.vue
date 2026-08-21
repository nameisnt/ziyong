<template>
  <section class="pc-theater-catalog-page">
    <div class="pc-toolbar">
      <input v-model="query" class="pc-search" type="text" :placeholder="t`搜索类型或历史内容...`" />
      <button v-if="entryCount" class="pc-soft-btn compact" type="button" @click="$emit('open-history')">
        <i class="fa-solid fa-clock-rotate-left"></i>
        <span>{{ `小剧场记录（${entryCount}）` }}</span>
      </button>
    </div>

    <PreviewDraftNotice
      :draft="previewDraft"
      @discard="$emit('discard-preview', $event)"
      @open="$emit('open-preview')"
      @open-id="$emit('open-preview', $event)"
    />

    <div class="pc-segment pc-theater-type-view" role="group" aria-label="小剧场类型范围">
      <button :class="['pc-segment-btn', { active: typeView === 'recent' }]" type="button" @click="typeView = 'recent'">
        {{ t`最近使用` }}
      </button>
      <button :class="['pc-segment-btn', { active: typeView === 'all' }]" type="button" @click="typeView = 'all'">
        {{ t`全部类型` }}
      </button>
    </div>

    <div class="pc-tag-cloud">
      <CapsuleTag
        :active="customTypeOpen"
        icon="fa-solid fa-plus"
        :label="t`自定义`"
        @click="customTypeOpen = !customTypeOpen"
      />
      <template v-if="typeView === 'all' && !query.trim()">
        <section v-for="group in groupedTypePrompts" :key="group.id" class="pc-theater-type-group">
          <strong>{{ group.name }}</strong>
          <div>
            <CapsuleTag
              v-for="typePrompt in group.items"
              :key="typePrompt.id"
              :count="typeUsageCounts.get(typePrompt.id) || typeUsageCounts.get(typePrompt.name)"
              icon="fa-solid fa-masks-theater"
              :label="typePrompt.name"
              @click="$emit('open-generate', typePrompt.id)"
            />
          </div>
        </section>
      </template>
      <CapsuleTag
        v-for="typePrompt in visibleTypePrompts"
        v-else
        :key="typePrompt.id"
        :active="query.trim() === typePrompt.name"
        :count="typeUsageCounts.get(typePrompt.id) || typeUsageCounts.get(typePrompt.name)"
        icon="fa-solid fa-masks-theater"
        :label="typePrompt.name"
        @click="$emit('open-generate', typePrompt.id)"
      />
    </div>

    <div v-if="customTypeOpen" class="pc-custom-type-row">
      <input
        v-model="customTypeName"
        class="pc-field"
        type="text"
        :placeholder="t`输入新类型名`"
        @keydown.enter="$emit('open-custom-generate')"
      />
      <button
        class="pc-primary-btn compact"
        type="button"
        :disabled="!customTypeName.trim()"
        @click="$emit('open-custom-generate')"
      >
        {{ t`添加` }}
      </button>
    </div>

    <FailedDraftList
      :drafts="failedDrafts"
      :get-context="getFailedDraftContext"
      :get-title="getFailedDraftTitle"
      @open="$emit('open-failed-draft', $event)"
      @remove="$emit('remove-failed-draft', $event)"
    />
  </section>
</template>

<script setup lang="ts">
import CapsuleTag from '@/components/CapsuleTag.vue';
import FailedDraftList from '@/components/FailedDraftList.vue';
import PreviewDraftNotice from '@/components/PreviewDraftNotice.vue';
import type { TypePromptConfig, TypePromptGroup } from '@/store/prompts';
import type { GenerationPreviewDraft } from '@/store/previewDrafts';
import type { FailedGenerationDraft } from '@/type/generation';

const props = defineProps<{
  entryCount: number;
  failedDrafts: FailedGenerationDraft[];
  getFailedDraftContext: (draft: FailedGenerationDraft) => string;
  getFailedDraftTitle: (draft: FailedGenerationDraft) => string;
  previewDraft: GenerationPreviewDraft | null;
  typeUsageCounts: Map<string, number>;
  typePromptGroups: TypePromptGroup[];
  visibleTypePrompts: TypePromptConfig[];
}>();

const customTypeName = defineModel<string>('customTypeName', { required: true });
const customTypeOpen = defineModel<boolean>('customTypeOpen', { required: true });
const query = defineModel<string>('query', { required: true });
const typeView = defineModel<'all' | 'recent'>('typeView', { required: true });
const groupedTypePrompts = computed(() => {
  const groups = props.typePromptGroups
    .map(group => ({ ...group, items: props.visibleTypePrompts.filter(item => item.groupId === group.id) }))
    .filter(group => group.items.length);
  const ungrouped = props.visibleTypePrompts.filter(item => !groups.some(group => group.id === item.groupId));
  if (ungrouped.length) groups.push({ domain: 'theater', id: '', items: ungrouped, name: '未分组' });
  return groups;
});

defineEmits<{
  'discard-preview': [id?: string];
  'open-custom-generate': [];
  'open-failed-draft': [draftId: string];
  'open-generate': [typeId: string];
  'open-history': [];
  'open-preview': [id?: string];
  'remove-failed-draft': [draftId: string];
}>();
</script>

<style scoped>
.pc-theater-catalog-page {
  display: grid;
  min-height: 100%;
  align-content: start;
  gap: 14px;
}

.pc-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
}

.pc-toolbar .pc-soft-btn {
  justify-self: start;
  width: auto;
  margin-bottom: 4px;
}

.pc-search {
  width: 100%;
  height: 40px;
  min-height: 40px;
  padding: 11px 12px;
  border: 0.5px solid var(--pc-border);
  border-radius: 10px;
  outline: none;
  background: var(--pc-bg);
  color: var(--pc-text);
  font-size: 14px;
  line-height: normal;
}

.pc-tag-cloud {
  display: flex;
  max-height: 220px;
  align-items: center;
  align-content: flex-start;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px;
  overflow-y: auto;
  overscroll-behavior: contain;
  border: 0.5px solid var(--pc-border);
  border-radius: 12px;
  background: var(--pc-bg);
}

.pc-theater-type-group {
  display: grid;
  width: 100%;
  gap: 7px;
}

.pc-theater-type-group > strong {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-theater-type-group > div {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pc-custom-type-row {
  display: flex;
  gap: 8px;
}

.pc-custom-type-row .pc-field {
  flex: 1;
}
</style>
