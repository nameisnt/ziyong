<template>
  <Teleport to="#tavern-phone-root .pc-phone-shell">
    <section class="pc-modal-backdrop" @click.self="emit('close')">
      <article
        ref="dialogRef"
        class="pc-section-card pc-modal-dialog pc-content-regex-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        tabindex="-1"
      >
        <header class="pc-section-head">
          <strong>{{ title }}</strong>
          <button class="pc-icon-btn" type="button" title="关闭" aria-label="关闭" @click="emit('close')">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>
        <input v-model="search" class="pc-field" type="search" aria-label="搜索替换规则" placeholder="搜索规则或分组" />
        <div class="pc-content-regex-list">
          <section v-for="group in sections" :key="group.id">
            <button
              class="pc-soft-btn pc-content-regex-group-toggle"
              type="button"
              :aria-expanded="!collapsed.has(group.id)"
              :aria-label="`${group.name}分组`"
              @click="toggleGroup(group.id)"
            >
              <i :class="collapsed.has(group.id) ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-down'"></i>
              <span>{{ group.name }}</span>
              <small
                >{{ group.rules.filter(rule => selected.includes(rule.id)).length }}/{{ group.rules.length }}</small
              >
            </button>
            <div v-show="!collapsed.has(group.id)">
              <div v-for="rule in group.rules" :key="rule.id" class="pc-setting-row">
                <span class="pc-setting-label">{{ rule.name }}{{ rule.enabled ? '' : '（已停用）' }}</span>
                <BulkSelectionCheckbox
                  :label="`选择 ${rule.name}`"
                  :model-value="selected.includes(rule.id)"
                  :disabled="!rule.enabled && !selected.includes(rule.id)"
                  @update:model-value="selectRule(rule.id, $event)"
                />
              </div>
            </div>
          </section>
          <EmptyState v-if="!sections.length" compact title="没有匹配的替换规则" />
        </div>
        <RegexErrorDisclosure :errors="result.errors" />
        <p v-if="missingCount" role="status">{{ missingCount }} 条关联规则已不存在</p>
        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" :disabled="!selected.length" @click="setSelection([])">
            清除选择
          </button>
          <button
            v-if="inheritedIds !== undefined"
            class="pc-soft-btn"
            type="button"
            @click="store.deleteUsage(usageKey)"
          >
            跟随类型
          </button>
          <button class="pc-primary-btn" type="button" @click="emit('close')">完成</button>
        </div>
      </article>
    </section>
  </Teleport>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import RegexErrorDisclosure from '@/components/RegexErrorDisclosure.vue';
import BulkSelectionCheckbox from '@/components/BulkSelectionCheckbox.vue';
import { useRegexDisplayStore } from '@/apps/regex-display/store';
import { usePhoneModalLifecycle } from '@/composables/usePhoneModalLifecycle';
import { applyRegexDisplayRules, getRegexRulesByIds } from '@/util/regexDisplay';

const props = withDefaults(
  defineProps<{
    usageKey?: string;
    content?: string;
    modelValue?: string[];
    inheritedIds?: string[];
    title?: string;
  }>(),
  { usageKey: '', content: '', title: '本条正则替换', modelValue: undefined, inheritedIds: undefined },
);
const emit = defineEmits<{ close: []; 'update:modelValue': [value: string[]] }>();
const store = useRegexDisplayStore();
const search = ref('');
const collapsed = ref(new Set<string>());
function toggleGroup(id: string) {
  const next = new Set(collapsed.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  collapsed.value = next;
}
watch(search, () => {
  collapsed.value = new Set();
});
const dialogRef = ref<HTMLElement | null>(null);
const selected = computed(
  () => props.modelValue ?? store.settings.usages[props.usageKey]?.displayRuleIds ?? props.inheritedIds ?? [],
);
const missingCount = computed(() => selected.value.filter(id => !store.rules.some(rule => rule.id === id)).length);
function setSelection(ids: string[]) {
  if (props.modelValue !== undefined) emit('update:modelValue', ids);
  else store.getUsage(props.usageKey).displayRuleIds = ids;
}
function selectRule(id: string, enabled: boolean) {
  setSelection(enabled ? [...new Set([...selected.value, id])] : selected.value.filter(value => value !== id));
}
const result = computed(() =>
  applyRegexDisplayRules(props.content, getRegexRulesByIds(store.rules, selected.value, 'replace')),
);
const sections = computed(() => {
  const query = search.value.trim().toLocaleLowerCase();
  return [{ id: '', name: '未分组' }, ...store.groups]
    .map(group => ({
      ...group,
      rules: store.rules.filter(
        rule =>
          rule.operation === 'replace' &&
          rule.groupId === group.id &&
          `${group.name} ${rule.name}`.toLocaleLowerCase().includes(query),
      ),
    }))
    .filter(group => group.rules.length);
});
usePhoneModalLifecycle({ dialogRef, isOpen: () => true, onClose: () => emit('close') });
</script>

<style scoped>
.pc-content-regex-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(480px, 100%);
  min-height: 0;
  max-height: 90%;
}
.pc-content-regex-list {
  min-height: 0;
  overflow: auto;
  overflow-wrap: anywhere;
}
.pc-content-regex-group-toggle {
  width: 100%;
  justify-content: flex-start;
  margin: 8px 0;
}
.pc-content-regex-group-toggle span {
  min-width: 0;
  overflow-wrap: anywhere;
  text-align: left;
}
.pc-content-regex-group-toggle small {
  margin-left: auto;
  flex-shrink: 0;
}
</style>
