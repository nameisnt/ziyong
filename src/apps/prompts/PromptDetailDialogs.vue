<script setup lang="ts">
import { ref } from 'vue';

import AppIcon from '@/components/AppIcon.vue';
import { usePhoneModalLifecycle } from '@/composables/usePhoneModalLifecycle';

interface PromptDialogItem {
  label: string;
  openKey: string;
  kind: string;
  value: string;
  variables: Array<{ key: string; label: string }>;
}

interface PromptDialogGroup {
  accent: string;
  appId: string;
  assetPath: string;
  defaultIcon: string;
  icon: string;
  items: PromptDialogItem[];
  label: string;
}

interface TypePromptDialogItem {
  domain: string;
  id: string;
  name: string;
  prompt: string;
}

const props = defineProps<{
  appGroup: PromptDialogGroup | null;
  appPrompt: PromptDialogItem | null;
  appPromptEmptyLabel: string;
  appPromptCopyMessage: string;
  typePrompt: TypePromptDialogItem | null;
  typePromptDomainLabel: string;
  typePromptGroupName: string;
}>();

const emit = defineEmits<{
  closeApp: [];
  closeType: [];
  copy: [text: string, successMessage: string];
  editApp: [];
  editType: [];
  removeType: [id: string];
  restoreApp: [];
  selectApp: [openKey: string];
}>();

const appPromptDialogRef = ref<HTMLElement | null>(null);
const typePromptDialogRef = ref<HTMLElement | null>(null);

usePhoneModalLifecycle({
  dialogRef: appPromptDialogRef,
  isOpen: () => Boolean(props.appGroup && props.appPrompt),
  onClose: () => emit('closeApp'),
});

usePhoneModalLifecycle({
  dialogRef: typePromptDialogRef,
  isOpen: () => Boolean(props.typePrompt),
  onClose: () => emit('closeType'),
});

function formatTaskVariable(key: string) {
  return `{{${key}}}`;
}
</script>

<template>
  <Teleport to=".pc-phone-shell">
    <div
      v-if="appGroup && appPrompt"
      class="pc-modal-backdrop pc-prompt-detail-backdrop"
      role="presentation"
      @click.self="emit('closeApp')"
    >
      <section
        ref="appPromptDialogRef"
        class="pc-section-card pc-modal-dialog pc-prompt-detail-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="appPrompt.label"
        tabindex="-1"
      >
        <header class="pc-prompt-detail-head">
          <div class="pc-app-prompt-dialog-title">
            <span class="pc-app-prompt-icon" :style="{ '--pc-prompt-accent': appGroup.accent }">
              <AppIcon
                :app-id="appGroup.appId"
                :asset-path="appGroup.assetPath"
                :default-icon="appGroup.defaultIcon"
                :icon="appGroup.icon"
              />
            </span>
            <div>
              <span class="pc-kicker">{{ appGroup.label }}</span>
              <h2>{{ appPrompt.label }}</h2>
            </div>
          </div>
          <button
            class="pc-icon-btn"
            type="button"
            :title="t`关闭`"
            :aria-label="t`关闭`"
            @click="emit('closeApp')"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>
        <div
          v-if="appGroup.items.length > 1"
          class="pc-prompt-variant-grid"
          role="group"
          :aria-label="`${appGroup.label}提示词选项`"
        >
          <button
            v-for="item in appGroup.items"
            :key="item.openKey"
            :class="['pc-soft-btn', 'pc-prompt-variant-option', { active: appPrompt.openKey === item.openKey }]"
            type="button"
            :aria-pressed="appPrompt.openKey === item.openKey"
            @click="emit('selectApp', item.openKey)"
          >
            {{ item.label }}
          </button>
        </div>
        <div class="pc-prompt-detail-body">
          <p class="pc-prewrap">{{ appPrompt.value || appPromptEmptyLabel }}</p>
          <div v-if="appPrompt.kind === 'task' && appPrompt.variables.length" class="pc-chip-row pc-task-variable-summary">
            <span v-for="variable in appPrompt.variables" :key="variable.key">
              <span>{{ variable.label }}</span>
              <code>{{ formatTaskVariable(variable.key) }}</code>
            </span>
          </div>
        </div>
        <div class="pc-form-actions pc-prompt-detail-actions">
          <button class="pc-soft-btn" type="button" @click="emit('copy', appPrompt.value, appPromptCopyMessage)">
            <i class="fa-solid fa-copy"></i>
            <span>{{ t`复制` }}</span>
          </button>
          <button class="pc-soft-btn" type="button" @click="emit('editApp')">
            <i class="fa-solid fa-pen"></i>
            <span>{{ t`编辑` }}</span>
          </button>
          <button class="pc-soft-btn" type="button" @click="emit('restoreApp')">
            <i class="fa-solid fa-arrow-rotate-left"></i>
            <span>{{ t`默认` }}</span>
          </button>
        </div>
      </section>
    </div>

    <div
      v-else-if="typePrompt"
      class="pc-modal-backdrop pc-prompt-detail-backdrop"
      role="presentation"
      @click.self="emit('closeType')"
    >
      <section
        ref="typePromptDialogRef"
        class="pc-section-card pc-modal-dialog pc-prompt-detail-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="typePrompt.name"
        tabindex="-1"
      >
        <header class="pc-prompt-detail-head">
          <div>
            <span class="pc-kicker">{{ typePromptDomainLabel }}</span>
            <h2>{{ typePrompt.name }}</h2>
          </div>
          <button
            class="pc-icon-btn"
            type="button"
            :title="t`关闭`"
            :aria-label="t`关闭`"
            @click="emit('closeType')"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>
        <div class="pc-prompt-detail-body">
          <p v-if="typePrompt.domain === 'theater'" class="pc-prompt-render-mode">
            {{ typePromptGroupName }}
          </p>
          <p class="pc-prewrap">{{ typePrompt.prompt || t`未填写类型提示词正文` }}</p>
        </div>
        <div class="pc-form-actions pc-prompt-detail-actions">
          <button class="pc-soft-btn" type="button" @click="emit('copy', typePrompt.prompt, '已复制类型提示词')">
            <i class="fa-solid fa-copy"></i>
            <span>{{ t`复制` }}</span>
          </button>
          <button class="pc-soft-btn" type="button" @click="emit('editType')">
            <i class="fa-solid fa-pen"></i>
            <span>{{ t`编辑` }}</span>
          </button>
          <button class="pc-soft-btn danger" type="button" @click="emit('removeType', typePrompt.id)">
            <i class="fa-solid fa-trash"></i>
            <span>{{ t`删除` }}</span>
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.pc-prompt-detail-backdrop {
  --pc-modal-inset: 55px 0 0;
  --pc-modal-z: 64;
}

.pc-prompt-detail-dialog {
  display: flex;
  flex-direction: column;
  width: min(100%, 340px);
  max-height: calc(100% - 36px);
  overflow: hidden;
}

.pc-prompt-detail-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 40px;
  align-items: start;
  gap: 12px;
}

.pc-prompt-detail-head h2 {
  margin: 4px 0 0;
  overflow-wrap: anywhere;
  font-size: 20px;
  line-height: 1.35;
}

.pc-app-prompt-dialog-title {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.pc-prompt-variant-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  padding: 4px;
  border-radius: var(--pc-control-radius);
  background: color-mix(in srgb, var(--pc-text) 8%, transparent);
}

.pc-prompt-variant-option {
  width: 100%;
  min-inline-size: 0;
  white-space: normal;
}

.pc-prompt-detail-body {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.pc-prompt-detail-body p {
  margin: 0;
  color: var(--pc-text);
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.pc-prompt-detail-body .pc-prompt-render-mode {
  width: fit-content;
  margin-bottom: 10px;
  padding: 4px 8px;
  border-radius: var(--pc-control-radius);
  background: color-mix(in srgb, var(--pc-theme-accent) 14%, var(--pc-surface) 86%);
  color: var(--pc-theme-accent);
  font-size: 12px;
  font-weight: 800;
}

.pc-prompt-detail-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

/* ui-reuse-allow: UI-PROMPT-DETAIL-001 detail actions share three equal narrow columns. */
.pc-prompt-detail-actions :is(.pc-soft-btn, .pc-primary-btn) {
  min-inline-size: 0;
}
</style>
