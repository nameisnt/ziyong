<template>
  <section class="pc-storyline-editor-page">
    <article class="pc-editor-card pc-storyline-editor-card">
      <div class="pc-section-head">
        <strong>编辑{{ itemLabel }}</strong>
        <span>{{ itemMeta }}</span>
      </div>

      <div class="pc-field-group">
        <label class="pc-field-label" for="pc-storyline-editor-title">标题</label>
        <input id="pc-storyline-editor-title" v-model="draft.title" class="pc-field" type="text" />
      </div>

      <template v-if="draft.itemKind === 'line'">
        <div class="pc-storyline-editor-grid">
          <label class="pc-field-group">
            <span class="pc-field-label">类型</span>
            <select v-model="draft.lineKind" class="pc-select">
              <option v-for="option in storylineKindOptions" :key="option.id" :value="option.id">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="pc-field-group">
            <span class="pc-field-label">状态</span>
            <select v-model="draft.lineStatus" class="pc-select">
              <option v-for="option in storylineStatusOptions" :key="option.id" :value="option.id">
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>
        <label class="pc-field-group">
          <span class="pc-field-label">剧情概述</span>
          <textarea v-model="draft.summary" class="pc-area compact"></textarea>
        </label>
        <label class="pc-field-group">
          <span class="pc-field-label">当前目标</span>
          <textarea v-model="draft.goal" class="pc-area compact"></textarea>
        </label>
        <label class="pc-field-group">
          <span class="pc-field-label">风险与代价</span>
          <textarea v-model="draft.stakes" class="pc-area compact"></textarea>
        </label>
      </template>

      <template v-else-if="draft.itemKind === 'beat'">
        <label class="pc-field-group">
          <span class="pc-field-label">所属剧情线</span>
          <SearchableCombobox
            v-model="draft.lineId"
            :empty-label="t`没有匹配的剧情线`"
            :input-label="t`选择所属剧情线`"
            :options="lineOptions"
            :placeholder="t`选择所属剧情线`"
            :toggle-title="t`展开所属剧情线`"
          />
        </label>
        <div class="pc-storyline-editor-grid">
          <label class="pc-field-group">
            <span class="pc-field-label">状态</span>
            <select v-model="draft.beatStatus" class="pc-select">
              <option v-for="option in beatStatusOptions" :key="option.id" :value="option.id">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="pc-field-group">
            <span class="pc-field-label">节点顺序</span>
            <input v-model.number="draft.order" class="pc-field" min="0" step="1" type="number" />
          </label>
        </div>
        <label class="pc-field-group">
          <span class="pc-field-label">节点说明</span>
          <textarea v-model="draft.summary" class="pc-area"></textarea>
        </label>
      </template>

      <template v-else>
        <label class="pc-field-group">
          <span class="pc-field-label">所属剧情线</span>
          <SearchableCombobox
            v-model="draft.lineId"
            :empty-label="t`没有匹配的剧情线`"
            :input-label="t`选择所属剧情线`"
            :options="hookLineOptions"
            :placeholder="t`选择所属剧情线`"
            :toggle-title="t`展开所属剧情线`"
          />
        </label>
        <label class="pc-field-group">
          <span class="pc-field-label">状态</span>
          <select v-model="draft.hookStatus" class="pc-select">
            <option v-for="option in foreshadowStatusOptions" :key="option.id" :value="option.id">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label class="pc-field-group">
          <span class="pc-field-label">埋设内容</span>
          <textarea v-model="draft.seed" class="pc-area compact"></textarea>
        </label>
        <label class="pc-field-group">
          <span class="pc-field-label">回收内容</span>
          <textarea v-model="draft.payoff" class="pc-area compact"></textarea>
        </label>
      </template>

      <label v-if="draft.itemKind !== 'beat'" class="pc-field-group">
        <span class="pc-field-label">标签</span>
        <input v-model="draft.tagsText" class="pc-field" placeholder="使用逗号或顿号分隔" type="text" />
      </label>

      <section v-if="draft.itemKind !== 'beat'" class="pc-storyline-profile-editor">
        <div class="pc-section-head">
          <strong>关联资料</strong>
          <button class="pc-icon-btn" type="button" title="增加关联资料" aria-label="增加关联资料" @click="addRelatedProfile">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
        <p v-if="draft.relatedProfileIds.length" class="pc-storyline-legacy-warning">
          {{ draft.relatedProfileIds.length }} 条旧资料关联待重新选择；旧标识会继续保留。
        </p>
        <div v-if="draft.relatedProfiles.length" class="pc-storyline-profile-list">
          <div v-for="(profile, index) in draft.relatedProfiles" :key="index" class="pc-storyline-profile-row">
            <ExternalProfileReferencePicker
              :disabled-reference-keys="disabledProfileKeys(index)"
              :identity-value="profile.profileIdentityValue"
              :mapping-id="profile.profileMappingId"
              @update:identity-value="profile.profileIdentityValue = $event"
              @update:mapping-id="profile.profileMappingId = $event"
            />
            <button class="pc-icon-btn danger" type="button" title="移除关联" aria-label="移除关联" @click="removeRelatedProfile(index)">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
        <EmptyState v-else compact title="尚未关联资料" />
      </section>

      <div class="pc-form-actions">
        <button class="pc-soft-btn" type="button" @click="$emit('cancel')">取消</button>
        <button class="pc-primary-btn" type="button" @click="$emit('save')">保存</button>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import ExternalProfileReferencePicker from '@/components/ExternalProfileReferencePicker.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { externalProfileReferenceKey } from '@/apps/profiles/profileReferences';
import { beatStatusOptions, foreshadowStatusOptions, storylineKindOptions, storylineStatusOptions } from './store';
import type { StorylineEditorDraft } from './viewTypes';

const props = defineProps<{
  itemMeta: string;
  lineOptions: Array<{ label: string; value: string }>;
}>();

defineEmits<{
  cancel: [];
  save: [];
}>();

const draft = defineModel<StorylineEditorDraft>({ required: true });
const itemLabel = computed(() => ({ beat: '节点', hook: '伏笔', line: '剧情线' })[draft.value.itemKind]);
const hookLineOptions = computed(() => [{ label: '不绑定剧情线', value: '' }, ...props.lineOptions]);

function addRelatedProfile() {
  draft.value.relatedProfiles.push({ profileIdentityValue: '', profileMappingId: '' });
}

function removeRelatedProfile(index: number) {
  draft.value.relatedProfiles.splice(index, 1);
}

function disabledProfileKeys(index: number) {
  return draft.value.relatedProfiles
    .filter(
      (profile, itemIndex) =>
        itemIndex !== index && profile.profileMappingId && profile.profileIdentityValue,
    )
    .map(profile => externalProfileReferenceKey(profile));
}
</script>

<style scoped>
.pc-storyline-editor-page,
.pc-storyline-editor-card,
.pc-storyline-profile-editor,
.pc-storyline-profile-list {
  display: grid;
  gap: 12px;
}

.pc-storyline-editor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.pc-storyline-profile-editor {
  padding-top: 4px;
}

.pc-storyline-legacy-warning {
  margin: 0;
  color: var(--pc-danger);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.45;
}

.pc-storyline-profile-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 40px;
  align-items: center;
  gap: 8px;
}
</style>
