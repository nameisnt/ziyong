<template>
  <Teleport to="#tavern-phone-root .pc-phone-shell">
    <section class="pc-modal-backdrop" @click.self="emit('close')">
      <article
        ref="dialogRef"
        class="pc-section-card pc-modal-dialog pc-content-regex-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="本条正则替换"
        tabindex="-1"
      >
        <header class="pc-section-head">
          <strong>本条正则替换</strong>
          <button class="pc-icon-btn" type="button" title="关闭" aria-label="关闭" @click="emit('close')">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>
        <input v-model="search" class="pc-field" type="search" aria-label="搜索替换规则" placeholder="搜索规则或分组" />
        <div class="pc-content-regex-list">
          <section v-for="group in sections" :key="group.id">
            <h4>{{ group.name }}</h4>
            <div v-for="rule in group.rules" :key="rule.id" class="pc-setting-row">
              <span class="pc-setting-label">{{ rule.name }}{{ rule.enabled ? '' : '（已停用）' }}</span>
              <BulkSelectionCheckbox
                :label="`选择 ${rule.name}`"
                :model-value="selected.includes(rule.id)"
                :disabled="!rule.enabled && !selected.includes(rule.id)"
                @update:model-value="store.setDisplayRuleEnabled(usageKey, rule.id, $event)"
              />
            </div>
          </section>
          <EmptyState v-if="!sections.length" compact title="没有匹配的替换规则" />
        </div>
        <RegexErrorDisclosure :errors="result.errors" />
        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" :disabled="!selected.length" @click="store.deleteUsage(usageKey)">
            清除选择
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

const props = defineProps<{ usageKey: string; content: string }>();
const emit = defineEmits<{ close: [] }>();
const store = useRegexDisplayStore();
const search = ref('');
const dialogRef = ref<HTMLElement | null>(null);
const selected = computed(() => store.settings.usages[props.usageKey]?.displayRuleIds ?? []);
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
.pc-content-regex-list h4 {
  margin: 8px 0;
}
</style>
