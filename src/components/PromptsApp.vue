<template>
  <section class="pc-prompts-app">
    <section v-if="route.page === 'root'" class="pc-prompts-page">
      <header class="pc-compact-toolbar pc-directory-toolbar pc-prompts-hero">
        <span class="pc-directory-count">{{ activePromptTabLabel }}</span>
        <div class="pc-hero-actions">
          <div ref="promptMenuRoot" class="pc-prompts-menu-anchor">
            <button
              class="pc-icon-btn"
              type="button"
              :title="t`切换分类`"
              :aria-label="t`切换分类`"
              @click="promptMenuOpen = !promptMenuOpen"
            >
              <i class="fa-solid fa-bars"></i>
            </button>
            <div v-if="promptMenuOpen" class="pc-prompts-menu">
              <button
                v-for="item in promptMenuItems"
                :key="item.key"
                :class="{ active: activePromptTab === item.key }"
                :data-prompt-tab="item.key"
                type="button"
                @click="selectPromptTab(item.key)"
              >
                <span>{{ item.label }}</span>
                <i v-if="activePromptTab === item.key" class="fa-solid fa-check"></i>
              </button>
            </div>
          </div>
          <button
            class="pc-icon-btn"
            type="button"
            :title="t`导入或导出`"
            :aria-label="t`导入或导出`"
            @click="openTransferCenter"
          >
            <i class="fa-solid fa-arrow-right-arrow-left"></i>
          </button>
          <button
            class="pc-icon-btn pc-prompts-reset-btn"
            type="button"
            :title="t`恢复默认`"
            :aria-label="t`恢复默认`"
            @click="resetDefaults"
          >
            <i class="fa-solid fa-arrow-rotate-left"></i>
          </button>
        </div>
      </header>

      <section v-if="activePromptTab === 'app'" class="pc-stack">
        <div class="pc-app-prompt-grid">
          <button
            v-for="group in appPromptGroups"
            :key="group.appId"
            class="pc-app-prompt-tile"
            :data-prompt-app-id="group.appId"
            type="button"
            :style="{ '--pc-prompt-accent': group.accent }"
            @click="openAppPromptGroup(group.appId)"
          >
            <span class="pc-app-prompt-icon"><i class="fa-solid" :class="group.icon"></i></span>
            <strong>{{ group.label }}</strong>
            <small>{{ group.items.length }}</small>
          </button>
        </div>
      </section>

      <section v-else-if="activePromptTab === 'task'" class="pc-stack">
        <div class="pc-app-prompt-grid">
          <button
            v-for="group in taskPromptGroups"
            :key="group.appId"
            class="pc-app-prompt-tile"
            :data-task-template-app-id="group.appId"
            type="button"
            :style="{ '--pc-prompt-accent': group.accent }"
            @click="openTaskPromptGroup(group.appId)"
          >
            <span class="pc-app-prompt-icon"><i class="fa-solid" :class="group.icon"></i></span>
            <strong>{{ group.label }}</strong>
            <small>{{ group.items.length }}</small>
          </button>
        </div>
      </section>

      <section v-else-if="activePromptTab === 'output'" class="pc-stack pc-directory-list">
        <article v-for="item in outputRuleCards" :key="item.id" class="pc-list-row pc-output-rule-card">
          <button type="button" @click="openOutputRule(item.id)">
            <span>
              <strong>{{ item.label }}</strong>
              <small>{{ item.status }}</small>
            </span>
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </article>
      </section>

      <section v-else-if="activePromptTab === 'type'" class="pc-stack">
        <div class="pc-compact-toolbar pc-directory-toolbar pc-prompt-section-toolbar">
          <span class="pc-directory-count">{{ typePrompts.length }} {{ t`个类型` }}</span>
          <button
            class="pc-icon-btn primary"
            type="button"
            :title="t`新增类型`"
            :aria-label="t`新增类型`"
            @click="openCreateTypePrompt"
          >
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>

        <EmptyState v-if="!typePrompts.length" :title="t`还没有类型提示词`" />

        <section v-for="domain in typePromptDomainCards" :key="domain.key" class="pc-type-domain-section">
          <header class="pc-type-domain-head">
            <strong>{{ domain.label }}</strong>
            <small>{{ domain.items.length }} {{ t`项` }}</small>
          </header>
          <EmptyState v-if="!domain.items.length" compact :title="domain.emptyLabel" />
          <template v-else-if="domain.key === 'theater'">
            <section v-for="group in domain.groups" :key="group.id" class="pc-type-group-section">
              <header class="pc-type-group-head">
                <strong>{{ group.name }}</strong>
                <div class="pc-inline-actions">
                  <small>{{ group.items.length }} {{ t`项` }}</small>
                  <button
                    v-if="group.id"
                    class="pc-icon-btn"
                    type="button"
                    title="重命名分组"
                    aria-label="重命名分组"
                    @click="renameTypeGroup(group.id, group.name)"
                  >
                    <i class="fa-solid fa-pen"></i>
                  </button>
                  <button
                    v-if="group.id"
                    class="pc-icon-btn danger"
                    type="button"
                    title="删除分组"
                    aria-label="删除分组"
                    @click="removeTypeGroup(group.id, group.name)"
                  >
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              </header>
              <div class="pc-type-prompt-grid">
                <button
                  v-for="item in group.items"
                  :key="item.id"
                  class="pc-type-prompt-tile"
                  type="button"
                  @click="openTypePromptDetail(item.id)"
                >
                  <strong>{{ item.name }}</strong>
                </button>
              </div>
            </section>
          </template>
          <div v-else class="pc-type-prompt-grid">
            <button
              v-for="item in domain.items"
              :key="item.id"
              class="pc-type-prompt-tile"
              type="button"
              @click="openTypePromptDetail(item.id)"
            >
              <strong>{{ item.name }}</strong>
            </button>
          </div>
        </section>
      </section>

      <section v-else-if="activePromptTab === 'phrase'" class="pc-stack">
        <div class="pc-compact-toolbar pc-directory-toolbar pc-prompt-section-toolbar">
          <span class="pc-directory-count">{{ quickPhraseGroups.length }} {{ t`个分组` }}</span>
          <button
            class="pc-icon-btn primary"
            type="button"
            :title="t`新增分组`"
            :aria-label="t`新增分组`"
            @click="openCreateGroup"
          >
            <i class="fa-solid fa-folder-plus"></i>
          </button>
        </div>

        <EmptyState v-if="!quickPhraseGroups.length" :title="t`还没有短语分组`" />

        <article v-for="(group, groupIndex) in quickPhraseGroups" :key="group.id" class="pc-page-section">
          <div class="pc-card-head">
            <button class="pc-accordion-title-button" type="button" @click="togglePhraseGroup(group.id)">
              <strong>{{ group.name }}</strong>
              <i :class="isPhraseGroupOpen(group.id) ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
            </button>
            <div class="pc-inline-actions pc-group-actions">
              <button
                class="pc-icon-btn"
                type="button"
                :disabled="groupIndex === 0"
                :title="t`上移分组`"
                :aria-label="t`上移分组`"
                @click="prompts.moveQuickPhraseGroup(group.id, -1)"
              >
                <i class="fa-solid fa-arrow-up"></i>
              </button>
              <button
                class="pc-icon-btn"
                type="button"
                :disabled="groupIndex === quickPhraseGroups.length - 1"
                :title="t`下移分组`"
                :aria-label="t`下移分组`"
                @click="prompts.moveQuickPhraseGroup(group.id, 1)"
              >
                <i class="fa-solid fa-arrow-down"></i>
              </button>
              <button
                class="pc-icon-btn"
                type="button"
                :title="t`重命名短语分组`"
                :aria-label="t`重命名短语分组`"
                @click="openRenameGroup(group.id)"
              >
                <i class="fa-solid fa-pen"></i>
              </button>
              <button
                class="pc-icon-btn"
                type="button"
                :title="t`新增快速短语`"
                :aria-label="t`新增快速短语`"
                @click="openCreatePhrase(group.id)"
              >
                <i class="fa-solid fa-plus"></i>
              </button>
              <button
                class="pc-icon-btn danger"
                type="button"
                :title="t`删除短语分组`"
                :aria-label="t`删除短语分组`"
                @click="removeQuickPhraseGroup(group.id)"
              >
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>

          <EmptyState
            v-if="isPhraseGroupOpen(group.id) && !group.phrases.length"
            compact
            :title="t`这个分组还没有短语。`"
          />

          <div v-else-if="isPhraseGroupOpen(group.id)" class="pc-directory-list pc-phrase-list">
            <article v-for="phrase in group.phrases" :key="phrase.id" class="pc-list-row pc-phrase-card">
              <p>{{ phrase.text }}</p>
              <div class="pc-inline-actions">
                <button
                  class="pc-icon-btn"
                  type="button"
                  :title="t`复制快速短语`"
                  :aria-label="t`复制快速短语`"
                  @click="copyText(phrase.text, '已复制快速短语')"
                >
                  <i class="fa-solid fa-copy"></i>
                </button>
                <button
                  class="pc-icon-btn"
                  type="button"
                  :title="t`编辑快速短语`"
                  :aria-label="t`编辑快速短语`"
                  @click="openEditPhrase(group.id, phrase.id)"
                >
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button
                  class="pc-icon-btn danger"
                  type="button"
                  :title="t`删除快速短语`"
                  :aria-label="t`删除快速短语`"
                  @click="removeQuickPhrase(group.id, phrase.id)"
                >
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </article>
          </div>
        </article>
      </section>

      <section v-else-if="activePromptTab === 'template'" class="pc-stack">
        <div class="pc-compact-toolbar pc-directory-toolbar pc-prompt-section-toolbar">
          <span class="pc-directory-count">{{ quickTemplateGroups.length }} {{ t`个分组` }}</span>
          <button
            class="pc-icon-btn primary"
            type="button"
            :title="t`新增分组`"
            :aria-label="t`新增分组`"
            @click="openCreateTemplateGroup"
          >
            <i class="fa-solid fa-folder-plus"></i>
          </button>
        </div>

        <EmptyState v-if="!quickTemplateGroups.length" :title="t`还没有模板分组`" />

        <article v-for="(group, groupIndex) in quickTemplateGroups" :key="group.id" class="pc-page-section">
          <div class="pc-card-head">
            <button class="pc-accordion-title-button" type="button" @click="toggleTemplateGroup(group.id)">
              <strong>{{ group.name }}</strong>
              <i :class="isTemplateGroupOpen(group.id) ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
            </button>
            <div class="pc-inline-actions pc-group-actions">
              <button
                class="pc-icon-btn"
                type="button"
                :disabled="groupIndex === 0"
                :title="t`上移分组`"
                :aria-label="t`上移分组`"
                @click="prompts.moveQuickTemplateGroup(group.id, -1)"
              >
                <i class="fa-solid fa-arrow-up"></i>
              </button>
              <button
                class="pc-icon-btn"
                type="button"
                :disabled="groupIndex === quickTemplateGroups.length - 1"
                :title="t`下移分组`"
                :aria-label="t`下移分组`"
                @click="prompts.moveQuickTemplateGroup(group.id, 1)"
              >
                <i class="fa-solid fa-arrow-down"></i>
              </button>
              <button
                class="pc-icon-btn"
                type="button"
                :title="t`重命名模板分组`"
                :aria-label="t`重命名模板分组`"
                @click="openRenameTemplateGroup(group.id)"
              >
                <i class="fa-solid fa-pen"></i>
              </button>
              <button
                class="pc-icon-btn"
                type="button"
                :title="t`新增快捷模板`"
                :aria-label="t`新增快捷模板`"
                @click="openCreateTemplate(group.id)"
              >
                <i class="fa-solid fa-plus"></i>
              </button>
              <button
                class="pc-icon-btn danger"
                type="button"
                :title="t`删除模板分组`"
                :aria-label="t`删除模板分组`"
                @click="removeQuickTemplateGroup(group.id)"
              >
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>

          <EmptyState
            v-if="isTemplateGroupOpen(group.id) && !group.phrases.length"
            compact
            :title="t`这个分组还没有模板。`"
          />

          <div v-else-if="isTemplateGroupOpen(group.id)" class="pc-directory-list pc-phrase-list">
            <article v-for="template in group.phrases" :key="template.id" class="pc-list-row pc-phrase-card">
              <p>{{ template.text }}</p>
              <div class="pc-inline-actions">
                <button
                  class="pc-icon-btn"
                  type="button"
                  :title="t`复制快捷模板`"
                  :aria-label="t`复制快捷模板`"
                  @click="copyText(template.text, '已复制模板')"
                >
                  <i class="fa-solid fa-copy"></i>
                </button>
                <button
                  class="pc-icon-btn"
                  type="button"
                  :title="t`编辑快捷模板`"
                  :aria-label="t`编辑快捷模板`"
                  @click="openEditTemplate(group.id, template.id)"
                >
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button
                  class="pc-icon-btn danger"
                  type="button"
                  :title="t`删除快捷模板`"
                  :aria-label="t`删除快捷模板`"
                  @click="removeQuickTemplate(group.id, template.id)"
                >
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </article>
          </div>
        </article>
      </section>
    </section>

    <PromptAppEditorPage
      v-else-if="route.page === 'app-prompt-editor' && editingAppPrompt"
      :definition="editingAppPrompt"
      @back="phone.goBack()"
    />

    <PromptOutputEditorPage
      v-else-if="route.page === 'output-editor' && editingOutputDefinition"
      :definition="editingOutputDefinition"
      @back="phone.goBack()"
    />

    <PromptTypeEditorPage
      v-else-if="route.page === 'type-editor'"
      :domains="typePromptDomains"
      :prompt="editingTypePrompt"
      @back="phone.goBack()"
    />

    <PromptGroupEditorPage
      v-else-if="route.page === 'group-editor'"
      :group="editingGroup"
      kind="phrase"
      @back="phone.goBack()"
    />

    <PromptGroupEditorPage
      v-else-if="route.page === 'template-group-editor'"
      :group="editingTemplateGroup"
      kind="template"
      @back="phone.goBack()"
    />

    <PromptPhraseEditorPage
      v-else-if="route.page === 'phrase-editor' && phraseGroup"
      :group="phraseGroup"
      :item="editingPhrase"
      kind="phrase"
      @back="phone.goBack()"
    />

    <PromptPhraseEditorPage
      v-else-if="route.page === 'template-editor' && templateGroup"
      :group="templateGroup"
      :item="editingTemplate"
      kind="template"
      @back="phone.goBack()"
    />

    <PromptTransferPage v-else-if="route.page === 'transfer'" />

    <Teleport to=".pc-phone-shell">
      <div
        v-if="activeAppPromptGroup && activeAppPrompt"
        class="pc-modal-backdrop pc-prompt-detail-backdrop"
        role="presentation"
        @click.self="closeAppPromptDetail"
      >
        <section
          ref="appPromptDialogRef"
          class="pc-section-card pc-modal-dialog pc-prompt-detail-dialog"
          role="dialog"
          aria-modal="true"
          :aria-label="activeAppPrompt.label"
          tabindex="-1"
        >
          <header class="pc-prompt-detail-head">
            <div class="pc-app-prompt-dialog-title">
              <span class="pc-app-prompt-icon" :style="{ '--pc-prompt-accent': activeAppPromptGroup.accent }">
                <i class="fa-solid" :class="activeAppPromptGroup.icon"></i>
              </span>
              <div>
                <span class="pc-kicker">{{ activeAppPromptGroup.label }}</span>
                <h2>{{ activeAppPrompt.label }}</h2>
              </div>
            </div>
            <button
              class="pc-icon-btn"
              type="button"
              :title="t`关闭`"
              :aria-label="t`关闭`"
              @click="closeAppPromptDetail"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </header>
          <div
            v-if="activeAppPromptGroup.items.length > 1"
            class="pc-prompt-variant-grid"
            role="group"
            :aria-label="`${activeAppPromptGroup.label}提示词选项`"
          >
            <button
              v-for="item in activeAppPromptGroup.items"
              :key="item.openKey"
              :class="['pc-soft-btn', 'pc-prompt-variant-option', { active: activeAppPrompt.openKey === item.openKey }]"
              type="button"
              :aria-pressed="activeAppPrompt.openKey === item.openKey"
              @click="selectAppPrompt(item.openKey)"
            >
              {{ item.label }}
            </button>
          </div>
          <div class="pc-prompt-detail-body">
            <p class="pc-prewrap">{{ activeAppPrompt.value || activePromptEmptyLabel }}</p>
            <div v-if="activeAppPrompt.kind === 'task' && activeAppPrompt.variables.length" class="pc-chip-row">
              <code v-for="variable in activeAppPrompt.variables" :key="variable.key" :title="variable.label">
                {{ formatTaskVariable(variable.key) }}
              </code>
            </div>
          </div>
          <div class="pc-form-actions pc-prompt-detail-actions">
            <button class="pc-soft-btn" type="button" @click="copyText(activeAppPrompt.value, activePromptCopyMessage)">
              <i class="fa-solid fa-copy"></i>
              <span>{{ t`复制` }}</span>
            </button>
            <button class="pc-soft-btn" type="button" @click="editActiveAppPrompt">
              <i class="fa-solid fa-pen"></i>
              <span>{{ t`编辑` }}</span>
            </button>
            <button class="pc-soft-btn" type="button" @click="restoreActiveAppPrompt">
              <i class="fa-solid fa-arrow-rotate-left"></i>
              <span>{{ t`默认` }}</span>
            </button>
          </div>
        </section>
      </div>

      <div
        v-else-if="activeTypePrompt"
        class="pc-modal-backdrop pc-prompt-detail-backdrop"
        role="presentation"
        @click.self="closeTypePromptDetail"
      >
        <section
          ref="typePromptDialogRef"
          class="pc-section-card pc-modal-dialog pc-prompt-detail-dialog"
          role="dialog"
          aria-modal="true"
          :aria-label="activeTypePrompt.name"
          tabindex="-1"
        >
          <header class="pc-prompt-detail-head">
            <div>
              <span class="pc-kicker">{{ activeTypePromptDomainLabel }}</span>
              <h2>{{ activeTypePrompt.name }}</h2>
            </div>
            <button
              class="pc-icon-btn"
              type="button"
              :title="t`关闭`"
              :aria-label="t`关闭`"
              @click="closeTypePromptDetail"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </header>
          <div class="pc-prompt-detail-body">
            <p v-if="activeTypePrompt.domain === 'theater'" class="pc-prompt-render-mode">
              {{ activeTypePromptGroupName }}
            </p>
            <p class="pc-prewrap">{{ activeTypePrompt.prompt || t`未填写类型提示词正文` }}</p>
          </div>
          <div class="pc-form-actions pc-prompt-detail-actions">
            <button class="pc-soft-btn" type="button" @click="copyText(activeTypePrompt.prompt, '已复制类型提示词')">
              <i class="fa-solid fa-copy"></i>
              <span>{{ t`复制` }}</span>
            </button>
            <button class="pc-soft-btn" type="button" @click="editActiveTypePrompt">
              <i class="fa-solid fa-pen"></i>
              <span>{{ t`编辑` }}</span>
            </button>
            <button class="pc-soft-btn danger" type="button" @click="removeTypePrompt(activeTypePrompt.id)">
              <i class="fa-solid fa-trash"></i>
              <span>{{ t`删除` }}</span>
            </button>
          </div>
        </section>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import { usePhoneModalLifecycle } from '@/composables/usePhoneModalLifecycle';
import PromptAppEditorPage from '@/components/prompts/PromptAppEditorPage.vue';
import PromptGroupEditorPage from '@/components/prompts/PromptGroupEditorPage.vue';
import PromptOutputEditorPage from '@/components/prompts/PromptOutputEditorPage.vue';
import PromptPhraseEditorPage from '@/components/prompts/PromptPhraseEditorPage.vue';
import PromptTransferPage from '@/components/prompts/PromptTransferPage.vue';
import PromptTypeEditorPage from '@/components/prompts/PromptTypeEditorPage.vue';
import { usePromptLibraryActions } from '@/components/prompts/usePromptLibraryActions';
import { usePromptDefaultsSession, type PromptValueKind } from '@/components/prompts/usePromptDefaultsSession';
import {
  getRegisteredPhoneApps,
  type PhonePromptDefinition,
  type PhoneTaskTemplateDefinition,
} from '@/core/appRegistry';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore, type QuickPhrase } from '@/store/prompts';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const prompts = usePromptStore();
const { currentRoute: route } = storeToRefs(phone);
const {
  appPromptDefinitions,
  appPrompts,
  outputFormatDefinitions,
  outputRules,
  quickPhraseGroups,
  quickTemplateGroups,
  specialPromptDefinitions,
  specialPrompts,
  taskTemplateDefinitions,
  taskTemplates,
  typePromptDomains,
  typePromptGroups,
  typePrompts,
} = storeToRefs(prompts);

type PromptTab = 'app' | 'output' | 'phrase' | 'task' | 'template' | 'type';
type AppPromptCard = {
  appId: string;
  appLabel: string;
  defaultPrompt: string;
  key: string;
  kind: PromptValueKind;
  label: string;
  openKey: string;
  outputFormats: NonNullable<PhonePromptDefinition['outputFormats']>;
  placeholder: string;
  value: string;
  variables: NonNullable<PhoneTaskTemplateDefinition['variables']>;
};
const activePromptTab = ref<PromptTab>('app');
const activeAppPromptGroupId = ref('');
const activeAppPromptOpenKey = ref('');
const activeTypePromptId = ref('');
const appPromptDialogRef = ref<HTMLElement | null>(null);
const typePromptDialogRef = ref<HTMLElement | null>(null);
const { removeQuickPhrase, removeQuickPhraseGroup, removeQuickTemplate, removeQuickTemplateGroup, removeTypePrompt } =
  usePromptLibraryActions({
    confirmNotice: phone.confirmNotice,
    notify: toastr,
    onTypePromptDeleted: promptId => {
      if (activeTypePromptId.value === promptId) closeTypePromptDetail();
    },
  });
const {
  resetDefaults,
  restoreDefaultPrompt,
  updatePromptValue: updateAppPromptValue,
} = usePromptDefaultsSession({
  confirmNotice: phone.confirmNotice,
  notify: toastr,
});
const promptMenuOpen = ref(false);
const promptMenuRoot = ref<HTMLElement | null>(null);
const phraseGroupOpen = reactive<Record<string, boolean>>({});
const templateGroupOpen = reactive<Record<string, boolean>>({});

function createAppPromptCard(
  appId: string,
  appLabel: string,
  kind: PromptValueKind,
  definition: PhonePromptDefinition,
): AppPromptCard {
  return {
    appId,
    appLabel,
    defaultPrompt: definition.defaultPrompt,
    key: definition.key,
    kind,
    label: definition.label,
    openKey: `${kind}:${definition.key}`,
    outputFormats: definition.outputFormats ?? [],
    placeholder: `填写${definition.label}的默认提示词`,
    value: kind === 'app' ? (appPrompts.value[definition.key] ?? '') : (specialPrompts.value[definition.key] ?? ''),
    variables: [],
  };
}

function createTaskPromptCard(
  appId: string,
  appLabel: string,
  definition: (typeof taskTemplateDefinitions.value)[number],
): AppPromptCard {
  return {
    appId,
    appLabel,
    defaultPrompt: definition.defaultTemplate,
    key: definition.key,
    kind: 'task',
    label: definition.label,
    openKey: `task:${definition.key}`,
    outputFormats: [],
    placeholder: `填写${definition.label}的任务模板`,
    value: taskTemplates.value[definition.key] ?? definition.defaultTemplate,
    variables: definition.variables ?? [],
  };
}

const appPromptGroups = computed(() =>
  getRegisteredPhoneApps()
    .map(app => ({
      accent: app.accent,
      appId: app.id,
      icon: app.icon,
      items: [
        ...(app.promptDefinitions ?? []).map(definition => createAppPromptCard(app.id, app.name, 'app', definition)),
        ...(app.specialPromptDefinitions ?? []).map(definition =>
          createAppPromptCard(app.id, app.name, 'special', definition),
        ),
      ],
      label: app.name,
    }))
    .filter(group => group.items.length),
);
const appPromptCards = computed(() => appPromptGroups.value.flatMap(group => group.items));
const taskPromptGroups = computed(() =>
  getRegisteredPhoneApps()
    .map(app => ({
      accent: app.accent,
      appId: app.id,
      icon: app.icon,
      items: taskTemplateDefinitions.value
        .filter(definition => definition.appId === app.id)
        .map(definition => createTaskPromptCard(app.id, app.name, definition)),
      label: app.name,
    }))
    .filter(group => group.items.length),
);
const allPromptCards = computed(() => [
  ...appPromptCards.value,
  ...taskPromptGroups.value.flatMap(group => group.items),
]);
const promptMenuItems: Array<{ key: PromptTab; label: string }> = [
  { key: 'app', label: 'App 提示词' },
  { key: 'task', label: '任务模板' },
  { key: 'type', label: '类型提示词' },
  { key: 'output', label: '输出与解析' },
  { key: 'phrase', label: '快捷短语' },
  { key: 'template', label: '模板快捷' },
];
const activePromptTabLabel = computed(
  () => promptMenuItems.find(item => item.key === activePromptTab.value)?.label || '提示词',
);
const outputRuleCards = computed(() => {
  const owners = new Map<string, string>();
  [...appPromptDefinitions.value, ...specialPromptDefinitions.value].forEach(definition => {
    definition.outputFormats?.forEach(format => {
      if (!owners.has(format.id)) owners.set(format.id, definition.label);
    });
  });
  return outputFormatDefinitions.value.map(definition => {
    const override = outputRules.value[definition.id];
    const formatCustomized = Boolean(override?.outputFormat);
    const parserCustomized = Boolean(override?.parserEnabled);
    const status =
      formatCustomized && parserCustomized
        ? '格式与解析已自定义'
        : formatCustomized
          ? '格式已修改 · 默认解析'
          : parserCustomized
            ? '解析已自定义'
            : '默认规则';
    const owner = owners.get(definition.id) || '';
    return {
      ...definition,
      label: owner && owner !== definition.label ? `${owner} · ${definition.label}` : definition.label,
      status,
    };
  });
});
const typePromptDomainCards = computed(() =>
  typePromptDomains.value.map(domain => {
    const items = typePrompts.value.filter(item => item.domain === domain.key);
    const groups = typePromptGroups.value
      .filter(group => group.domain === domain.key)
      .map(group => ({
        ...group,
        builtIn: group.id.startsWith(`${domain.key}_group_`),
        items: items.filter(item => item.groupId === group.id),
      }))
      .filter(group => group.items.length);
    const ungrouped = items.filter(item => !groups.some(group => group.id === item.groupId));
    if (ungrouped.length) groups.push({ builtIn: true, domain: domain.key, id: '', items: ungrouped, name: '未分组' });
    return {
      ...domain,
      emptyLabel: domain.emptyLabel || `还没有${domain.label}类型提示词`,
      groups,
      items,
    };
  }),
);
const activeTypePrompt = computed(() =>
  activeTypePromptId.value ? prompts.getTypePrompt(activeTypePromptId.value) : null,
);
const activeAppPromptGroup = computed(
  () =>
    (activePromptTab.value === 'task' ? taskPromptGroups.value : appPromptGroups.value).find(
      group => group.appId === activeAppPromptGroupId.value,
    ) ?? null,
);
const activeAppPrompt = computed(
  () =>
    activeAppPromptGroup.value?.items.find(item => item.openKey === activeAppPromptOpenKey.value) ??
    activeAppPromptGroup.value?.items[0] ??
    null,
);
const activeTypePromptDomainLabel = computed(
  () => typePromptDomains.value.find(domain => domain.key === activeTypePrompt.value?.domain)?.label || '类型提示词',
);
const activeTypePromptGroupName = computed(() => {
  const groupId = activeTypePrompt.value?.groupId || '';
  return typePromptGroups.value.find(group => group.id === groupId)?.name || '未分组';
});

usePhoneModalLifecycle({
  dialogRef: appPromptDialogRef,
  isOpen: () => Boolean(activeAppPromptGroup.value && activeAppPrompt.value),
  onClose: closeAppPromptDetail,
});

usePhoneModalLifecycle({
  dialogRef: typePromptDialogRef,
  isOpen: () => Boolean(activeTypePrompt.value),
  onClose: closeTypePromptDetail,
});

const editingAppPrompt = computed(() =>
  route.value.params?.openKey
    ? (allPromptCards.value.find(item => item.openKey === route.value.params?.openKey) ?? null)
    : null,
);
const editingTypePrompt = computed(() =>
  route.value.params?.promptId ? prompts.getTypePrompt(route.value.params.promptId) : null,
);
const editingGroup = computed(() =>
  route.value.params?.groupId ? prompts.getQuickPhraseGroup(route.value.params.groupId) : null,
);
const phraseGroup = computed(() =>
  route.value.params?.groupId ? prompts.getQuickPhraseGroup(route.value.params.groupId) : null,
);
const editingPhrase = computed<QuickPhrase | null>(
  () => phraseGroup.value?.phrases.find(item => item.id === route.value.params?.phraseId) ?? null,
);
const editingTemplateGroup = computed(() =>
  route.value.params?.groupId ? prompts.getQuickTemplateGroup(route.value.params.groupId) : null,
);
const templateGroup = computed(() =>
  route.value.params?.groupId ? prompts.getQuickTemplateGroup(route.value.params.groupId) : null,
);
const editingTemplate = computed<QuickPhrase | null>(
  () => templateGroup.value?.phrases.find(item => item.id === route.value.params?.phraseId) ?? null,
);
const editingOutputDefinition = computed(() =>
  route.value.params?.outputId ? prompts.getOutputFormatDefinition(route.value.params.outputId) : null,
);
watch(
  () => route.value,
  current => {
    if (current.appId !== 'prompts' || current.page !== 'root') {
      closeAppPromptDetail();
      closeTypePromptDetail();
    }
  },
  { deep: true, immediate: true },
);

function onDocumentPointerDown(event: PointerEvent) {
  if (!promptMenuOpen.value || promptMenuRoot.value?.contains(event.target as Node)) return;
  promptMenuOpen.value = false;
}

onMounted(() => document.addEventListener('pointerdown', onDocumentPointerDown));
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerDown));

function openAppPromptGroup(appId: string) {
  const group = appPromptGroups.value.find(item => item.appId === appId);
  if (!group?.items.length) return;
  activeAppPromptGroupId.value = group.appId;
  activeAppPromptOpenKey.value = group.items[0]!.openKey;
}

function openTaskPromptGroup(appId: string) {
  const group = taskPromptGroups.value.find(item => item.appId === appId);
  if (!group?.items.length) return;
  activeAppPromptGroupId.value = group.appId;
  activeAppPromptOpenKey.value = group.items[0]!.openKey;
}

function closeAppPromptDetail() {
  activeAppPromptGroupId.value = '';
  activeAppPromptOpenKey.value = '';
}

function selectAppPrompt(openKey: string) {
  if (!activeAppPromptGroup.value?.items.some(item => item.openKey === openKey)) return;
  activeAppPromptOpenKey.value = openKey;
}

function editActiveAppPrompt() {
  const item = activeAppPrompt.value;
  if (!item) return;
  closeAppPromptDetail();
  phone.pushPage('app-prompt-editor', `编辑${item.label}`, { openKey: item.openKey });
}

function formatTaskVariable(key: string) {
  return `{{${key}}}`;
}

const activePromptEmptyLabel = computed(() =>
  activeAppPrompt.value?.kind === 'task' ? t`任务模板为空，本次不发送任务层` : t`未填写 App 提示词正文`,
);
const activePromptCopyMessage = computed(() =>
  activeAppPrompt.value?.kind === 'task' ? '已复制任务模板' : '已复制 App 提示词',
);

async function restoreActiveAppPrompt() {
  const item = activeAppPrompt.value;
  if (!item) return;
  await restoreDefaultPrompt(item);
}

function selectPromptTab(tab: PromptTab) {
  activePromptTab.value = tab;
  closeAppPromptDetail();
  activeTypePromptId.value = '';
  promptMenuOpen.value = false;
}

function isPhraseGroupOpen(groupId: string) {
  return phraseGroupOpen[groupId] ?? quickPhraseGroups.value[0]?.id === groupId;
}

function togglePhraseGroup(groupId: string) {
  phraseGroupOpen[groupId] = !isPhraseGroupOpen(groupId);
}

function isTemplateGroupOpen(groupId: string) {
  return templateGroupOpen[groupId] ?? quickTemplateGroups.value[0]?.id === groupId;
}

function toggleTemplateGroup(groupId: string) {
  templateGroupOpen[groupId] = !isTemplateGroupOpen(groupId);
}

function openCreateTypePrompt() {
  phone.pushPage('type-editor', '新增类型提示词');
}

function openTypePromptDetail(promptId: string) {
  activeTypePromptId.value = promptId;
}

function closeTypePromptDetail() {
  activeTypePromptId.value = '';
}

function editActiveTypePrompt() {
  const promptId = activeTypePromptId.value;
  if (!promptId) return;
  closeTypePromptDetail();
  openEditTypePrompt(promptId);
}

function openTransferCenter() {
  phone.pushPage('transfer', '导入 / 导出提示词');
}

function openOutputRule(outputId: string) {
  phone.pushPage('output-editor', '输出与解析', { outputId });
}

function openEditTypePrompt(promptId: string) {
  phone.pushPage('type-editor', '编辑类型提示词', { promptId });
}

async function renameTypeGroup(groupId: string, currentName: string) {
  const name = await phone.promptNotice('输入新的小剧场类型分组名称。', {
    confirmLabel: '保存',
    initialValue: currentName,
    title: '重命名分组',
  });
  if (!name?.trim()) return;
  prompts.renameTypePromptGroup(groupId, name);
}

async function removeTypeGroup(groupId: string, name: string) {
  const confirmed = await phone.confirmNotice(`删除分组“${name}”后，其中的提示词会移入“未分组”。`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!confirmed) return;
  prompts.deleteTypePromptGroup(groupId);
}

function openCreateGroup() {
  phone.pushPage('group-editor', '新增短语分组');
}

function openRenameGroup(groupId: string) {
  phone.pushPage('group-editor', '重命名短语分组', { groupId });
}

function openCreateTemplateGroup() {
  phone.pushPage('template-group-editor', '新增模板分组');
}

function openRenameTemplateGroup(groupId: string) {
  phone.pushPage('template-group-editor', '重命名模板分组', { groupId });
}

function openCreatePhrase(groupId: string) {
  phone.pushPage('phrase-editor', '新增快速短语', { groupId });
}

function openEditPhrase(groupId: string, phraseId: string) {
  phone.pushPage('phrase-editor', '编辑快速短语', { groupId, phraseId });
}

function openCreateTemplate(groupId: string) {
  phone.pushPage('template-editor', '新增模板', { groupId });
}

function openEditTemplate(groupId: string, phraseId: string) {
  phone.pushPage('template-editor', '编辑模板', { groupId, phraseId });
}
async function copyText(text: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(text);
    toastr.success(successMessage);
  } catch {
    toastr.warning('复制失败，请手动复制');
  }
}
</script>

<style scoped>
.pc-prompts-app,
.pc-prompts-page {
  min-height: 100%;
}

.pc-prompts-page,
.pc-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pc-prompts-hero {
  position: relative;
  z-index: 10;
  overflow: visible;
}

.pc-prompts-editor {
  display: grid;
  gap: 14px;
}

.pc-stack {
  position: relative;
  z-index: 1;
}

.pc-card-head span {
  color: var(--pc-muted);
}

.pc-hero-actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: flex-end;
}

.pc-chip-row,
.pc-inline-actions,
.pc-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-chip-row {
  flex-wrap: wrap;
  justify-content: flex-start;
}

.pc-group-actions {
  flex: 0 0 auto;
  gap: 6px;
}

.pc-group-actions .pc-icon-btn {
  width: 34px;
  height: 34px;
}

.pc-tab-btn,
.pc-accordion-head,
.pc-accordion-title-button {
  border: 0;
  cursor: pointer;
  color: var(--pc-text);
}

.pc-tab-btn {
  border-radius: 999px;
  padding: 7px 10px;
  min-width: 72px;
  height: 34px;
  font-size: 13px;
  white-space: nowrap;
}

.pc-tab-btn,
.pc-type-pill {
  background: var(--pc-surface-strong);
}

.pc-tab-btn.active {
  background: color-mix(in srgb, var(--pc-theme-accent) 18%, var(--pc-surface-strong) 82%);
}

.pc-app-prompt-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.pc-app-prompt-tile {
  position: relative;
  display: grid;
  grid-template-rows: 34px minmax(30px, auto);
  place-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
  min-height: 78px;
  padding: 8px 4px 7px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  background: color-mix(in srgb, var(--pc-prompt-accent) 8%, var(--pc-surface-strong) 92%);
  color: var(--pc-text);
  cursor: pointer;
  text-align: center;
}

.pc-app-prompt-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: var(--pc-icon-radius);
  background: color-mix(in srgb, var(--pc-prompt-accent) 18%, var(--pc-surface-strong) 82%);
  color: var(--pc-prompt-accent);
}

.pc-app-prompt-tile strong {
  display: -webkit-box;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.25;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.pc-app-prompt-tile small {
  position: absolute;
  top: 5px;
  right: 6px;
  min-width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--pc-surface-strong);
  color: var(--pc-muted);
  font-size: 10px;
  font-weight: 800;
}

.pc-type-domain-section {
  display: grid;
  gap: 9px;
  padding-top: 2px;
}

.pc-type-domain-section + .pc-type-domain-section {
  padding-top: 13px;
  border-top: 1px solid var(--pc-border);
}

.pc-type-domain-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding-inline: 2px;
}

.pc-type-domain-head small {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-type-prompt-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.pc-type-group-section {
  display: grid;
  gap: 7px;
}

.pc-type-group-head {
  display: flex;
  min-height: 32px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pc-type-group-head > strong {
  font-size: 13px;
}

.pc-type-prompt-grid > .pc-empty-state {
  grid-column: 1 / -1;
}

.pc-type-prompt-tile {
  width: 100%;
  min-width: 0;
  min-height: 50px;
  padding: 8px 6px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  cursor: pointer;
  text-align: center;
}

.pc-type-prompt-tile strong {
  display: -webkit-box;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.3;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

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

.pc-prompt-detail-actions :is(.pc-soft-btn, .pc-primary-btn) {
  min-inline-size: 0;
  padding-inline: 10px;
}

.pc-card-head strong,
.pc-accordion-head,
.pc-accordion-title-button {
  width: 100%;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0;
  text-align: left;
}

.pc-accordion-head i,
.pc-accordion-title-button i {
  flex: 0 0 auto;
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-accordion-title {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.pc-accordion-title small {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-accordion-title-button {
  min-width: 0;
  justify-content: flex-start;
}

.pc-card-head .pc-accordion-title-button {
  flex: 1 1 auto;
}

.pc-nested-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.pc-prompts-menu-anchor {
  position: relative;
  display: flex;
  align-items: center;
}

.pc-prompts-menu {
  position: absolute;
  z-index: 30;
  top: calc(100% + 8px);
  left: 0;
  width: min(220px, calc(100vw - 96px));
  padding: 6px;
  border: 1px solid var(--pc-border);
  border-radius: 8px;
  background: linear-gradient(var(--pc-surface-strong), var(--pc-surface-strong)), var(--pc-bg);
  box-shadow: 0 14px 34px color-mix(in srgb, var(--pc-text) 16%, transparent 84%);
}

.pc-prompts-reset-btn {
  border-radius: 8px;
}

.pc-prompts-menu button {
  width: 100%;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
  text-align: left;
}

.pc-prompts-menu button.active {
  background: color-mix(in srgb, var(--pc-theme-accent) 16%, var(--pc-surface-strong) 84%);
  color: var(--pc-theme-accent);
}

.pc-output-rule-card {
  padding: 0;
}

.pc-output-rule-card > button {
  width: 100%;
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
  text-align: left;
}

.pc-output-rule-card span {
  min-width: 0;
  display: grid;
  gap: 5px;
}

.pc-output-rule-card small,
.pc-output-rule-card > button > i {
  color: var(--pc-muted);
}

.pc-output-panel {
  margin-top: 12px;
  border-radius: min(var(--pc-card-radius), 8px);
  background: var(--pc-surface-strong);
  overflow: hidden;
}

.pc-output-toggle {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
}

.pc-output-toggle i {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-output-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 12px 12px;
}

.pc-output-card {
  border: 1px solid var(--pc-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--pc-surface) 72%, transparent 28%);
  padding: 12px;
}

.pc-output-card strong {
  display: block;
  margin-bottom: 8px;
}

.pc-output-card pre {
  overflow: auto;
  margin: 0;
  white-space: pre-wrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.55;
}

.pc-prompts-app :is(.pc-area, .pc-field) {
  margin-top: 14px;
}

.pc-type-pill {
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 11px;
}

.pc-type-pill[data-domain='extras'] {
  color: var(--pc-theme-accent);
}

.pc-type-pill[data-domain='theater'] {
  color: var(--pc-theme-accent);
}

.pc-prewrap,
.pc-phrase-card p {
  white-space: pre-wrap;
}

.pc-phrase-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 12px;
}

.pc-phrase-card {
  grid-template-columns: minmax(0, 1fr) auto;
}

.pc-icon-btn.danger {
  color: var(--pc-danger);
}

.pc-prompts-app .pc-form-actions {
  margin-top: 18px;
  justify-content: flex-end;
}
</style>
