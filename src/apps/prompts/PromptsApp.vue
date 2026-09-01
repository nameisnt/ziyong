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
            <span class="pc-app-prompt-icon">
              <AppIcon
                :app-id="group.appId"
                :asset-path="group.assetPath"
                :default-icon="group.defaultIcon"
                :icon="group.icon"
              />
            </span>
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
            <span class="pc-app-prompt-icon">
              <AppIcon
                :app-id="group.appId"
                :asset-path="group.assetPath"
                :default-icon="group.defaultIcon"
                :icon="group.icon"
              />
            </span>
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
            v-if="!typeOrganizeMode"
            class="pc-soft-btn compact"
            type="button"
            :disabled="!theaterTypePromptItems.length"
            @click="startTypeOrganize"
          >
            <i class="fa-solid fa-list-check"></i>
            <span>{{ t`整理` }}</span>
          </button>
          <button
            v-if="!typeOrganizeMode"
            class="pc-icon-btn primary"
            type="button"
            :title="t`新增类型`"
            :aria-label="t`新增类型`"
            @click="openCreateTypePrompt"
          >
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>

        <section v-if="typeOrganizeMode" class="pc-section-card pc-stack pc-type-organize-panel">
          <div class="pc-compact-toolbar">
            <strong>批量调整分组</strong>
            <span class="pc-directory-count">已选 {{ selectedTypePromptIds.size }} 项</span>
          </div>
          <div class="pc-inline-actions">
            <button class="pc-soft-btn compact" type="button" @click="selectAllTypePrompts">全选小剧场类型</button>
            <button
              class="pc-soft-btn compact"
              type="button"
              :disabled="!selectedTypePromptIds.size"
              @click="clearTypePromptSelection"
            >
              清空选择
            </button>
          </div>
          <SearchableCombobox
            v-model="typeOrganizeTargetGroupId"
            empty-label="没有匹配的分组"
            input-label="移动到分组"
            :options="theaterTypeGroupOptions"
            placeholder="选择目标分组"
            toggle-title="展开目标分组"
          />
          <div class="pc-form-actions">
            <button class="pc-soft-btn" type="button" @click="cancelTypeOrganize">取消</button>
            <button
              class="pc-soft-btn danger"
              type="button"
              :disabled="!selectedTypePromptIds.size"
              @click="removeSelectedTypePrompts"
            >
              删除所选
            </button>
            <button
              class="pc-primary-btn"
              type="button"
              :disabled="!selectedTypePromptIds.size"
              @click="applyTypeGroupMove"
            >
              移动所选
            </button>
          </div>
        </section>

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
                    v-if="typeOrganizeMode"
                    class="pc-soft-btn compact"
                    type="button"
                    @click="selectTypePromptGroup(group.items.map(item => item.id))"
                  >
                    {{ isTypePromptGroupSelected(group.items.map(item => item.id)) ? '取消本组' : '全选本组' }}
                  </button>
                  <button
                    v-if="group.id && !typeOrganizeMode"
                    class="pc-icon-btn"
                    type="button"
                    title="重命名分组"
                    aria-label="重命名分组"
                    @click="renameTypeGroup(group.id, group.name)"
                  >
                    <i class="fa-solid fa-pen"></i>
                  </button>
                  <button
                    v-if="group.id && !typeOrganizeMode"
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
                  :class="['pc-type-prompt-tile', { selected: selectedTypePromptIds.has(item.id) }]"
                  type="button"
                  :aria-pressed="typeOrganizeMode ? selectedTypePromptIds.has(item.id) : undefined"
                  @click="typeOrganizeMode ? toggleTypePromptSelection(item.id) : openTypePromptDetail(item.id)"
                >
                  <i
                    v-if="typeOrganizeMode"
                    :class="selectedTypePromptIds.has(item.id) ? 'fa-solid fa-square-check' : 'fa-regular fa-square'"
                  ></i>
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
          <ActionMenu icon-only label="批量管理" icon="fa-solid fa-list-check">
            <button type="button" :disabled="!quickPhraseCount" @click="startPromptBulk('phrases')">
              <i class="fa-solid fa-font"></i><span>批量删除短语</span>
            </button>
            <button type="button" :disabled="!quickPhraseGroups.length" @click="startPromptBulk('phrase-groups')">
              <i class="fa-solid fa-folder-minus"></i><span>批量删除分组</span>
            </button>
          </ActionMenu>
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

        <BulkSelectionBar
          v-if="promptBulkMode && promptBulkTarget.startsWith('phrase')"
          :all-selected="allPromptBulkSelected"
          :selected-count="promptBulkSelectedIds.length"
          :total-count="promptBulkIds.length"
          @cancel="cancelPromptBulk"
          @remove="removePromptBulkSelection"
          @toggle-all="toggleAllPromptBulk"
        />

        <EmptyState v-if="!quickPhraseGroups.length" :title="t`还没有短语分组`" />

        <article v-for="(group, groupIndex) in quickPhraseGroups" :key="group.id" class="pc-page-section">
          <div class="pc-card-head">
            <BulkSelectionCheckbox
              v-if="promptBulkMode && promptBulkTarget === 'phrase-groups'"
              :model-value="promptBulkSelectedIdSet.has(group.id)"
              :label="`选择分组 ${group.name}`"
              @update:model-value="setPromptBulkSelected(group.id, $event)"
            />
            <button class="pc-accordion-title-button" type="button" @click="togglePhraseGroup(group.id)">
              <strong>{{ group.name }}</strong>
              <i :class="isPhraseGroupOpen(group.id) ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
            </button>
            <div
              v-if="!(promptBulkMode && promptBulkTarget === 'phrase-groups')"
              class="pc-inline-actions pc-group-actions"
            >
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
            <article
              v-for="phrase in group.phrases"
              :key="phrase.id"
              class="pc-list-row pc-phrase-card"
              :class="{ bulk: promptBulkMode && promptBulkTarget === 'phrases' }"
            >
              <BulkSelectionCheckbox
                v-if="promptBulkMode && promptBulkTarget === 'phrases'"
                :model-value="promptBulkSelectedIdSet.has(phrase.id)"
                :label="`选择短语 ${phrase.text}`"
                @update:model-value="setPromptBulkSelected(phrase.id, $event)"
              />
              <p>{{ phrase.text }}</p>
              <div v-if="!(promptBulkMode && promptBulkTarget === 'phrases')" class="pc-inline-actions">
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
          <ActionMenu icon-only label="批量管理" icon="fa-solid fa-list-check">
            <button type="button" :disabled="!quickTemplateCount" @click="startPromptBulk('templates')">
              <i class="fa-solid fa-file-lines"></i><span>批量删除模板</span>
            </button>
            <button type="button" :disabled="!quickTemplateGroups.length" @click="startPromptBulk('template-groups')">
              <i class="fa-solid fa-folder-minus"></i><span>批量删除分组</span>
            </button>
          </ActionMenu>
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

        <BulkSelectionBar
          v-if="promptBulkMode && promptBulkTarget.startsWith('template')"
          :all-selected="allPromptBulkSelected"
          :selected-count="promptBulkSelectedIds.length"
          :total-count="promptBulkIds.length"
          @cancel="cancelPromptBulk"
          @remove="removePromptBulkSelection"
          @toggle-all="toggleAllPromptBulk"
        />

        <EmptyState v-if="!quickTemplateGroups.length" :title="t`还没有模板分组`" />

        <article v-for="(group, groupIndex) in quickTemplateGroups" :key="group.id" class="pc-page-section">
          <div class="pc-card-head">
            <BulkSelectionCheckbox
              v-if="promptBulkMode && promptBulkTarget === 'template-groups'"
              :model-value="promptBulkSelectedIdSet.has(group.id)"
              :label="`选择分组 ${group.name}`"
              @update:model-value="setPromptBulkSelected(group.id, $event)"
            />
            <button class="pc-accordion-title-button" type="button" @click="toggleTemplateGroup(group.id)">
              <strong>{{ group.name }}</strong>
              <i :class="isTemplateGroupOpen(group.id) ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
            </button>
            <div
              v-if="!(promptBulkMode && promptBulkTarget === 'template-groups')"
              class="pc-inline-actions pc-group-actions"
            >
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
            <article
              v-for="template in group.phrases"
              :key="template.id"
              class="pc-list-row pc-phrase-card"
              :class="{ bulk: promptBulkMode && promptBulkTarget === 'templates' }"
            >
              <BulkSelectionCheckbox
                v-if="promptBulkMode && promptBulkTarget === 'templates'"
                :model-value="promptBulkSelectedIdSet.has(template.id)"
                :label="`选择模板 ${template.text}`"
                @update:model-value="setPromptBulkSelected(template.id, $event)"
              />
              <p>{{ template.text }}</p>
              <div v-if="!(promptBulkMode && promptBulkTarget === 'templates')" class="pc-inline-actions">
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
                <AppIcon
                  :app-id="activeAppPromptGroup.appId"
                  :asset-path="activeAppPromptGroup.assetPath"
                  :default-icon="activeAppPromptGroup.defaultIcon"
                  :icon="activeAppPromptGroup.icon"
                />
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
            <div
              v-if="activeAppPrompt.kind === 'task' && activeAppPrompt.variables.length"
              class="pc-chip-row pc-task-variable-summary"
            >
              <span v-for="variable in activeAppPrompt.variables" :key="variable.key">
                <span>{{ variable.label }}</span>
                <code>{{ formatTaskVariable(variable.key) }}</code>
              </span>
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
import AppIcon from '@/components/AppIcon.vue';
import ActionMenu from '@/components/ActionMenu.vue';
import BulkSelectionBar from '@/components/BulkSelectionBar.vue';
import BulkSelectionCheckbox from '@/components/BulkSelectionCheckbox.vue';
import EmptyState from '@/components/EmptyState.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { useBulkSelection } from '@/composables/useBulkSelection';
import { usePhoneModalLifecycle } from '@/composables/usePhoneModalLifecycle';
import PromptAppEditorPage from '@/apps/prompts/PromptAppEditorPage.vue';
import PromptGroupEditorPage from '@/apps/prompts/PromptGroupEditorPage.vue';
import PromptOutputEditorPage from '@/apps/prompts/PromptOutputEditorPage.vue';
import PromptPhraseEditorPage from '@/apps/prompts/PromptPhraseEditorPage.vue';
import PromptTransferPage from '@/apps/prompts/PromptTransferPage.vue';
import PromptTypeEditorPage from '@/apps/prompts/PromptTypeEditorPage.vue';
import { usePromptLibraryActions } from '@/apps/prompts/usePromptLibraryActions';
import { usePromptDefaultsSession, type PromptValueKind } from '@/apps/prompts/usePromptDefaultsSession';
import {
  getRegisteredPhoneApps,
  type PhonePromptDefinition,
  type PhoneTaskTemplateDefinition,
} from '@/core/appRegistry';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore, type QuickPhrase } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const prompts = usePromptStore();
const settingsStore = useSettingsStore();
const { currentRoute: route } = storeToRefs(phone);
const { settings } = storeToRefs(settingsStore);
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
const typeOrganizeMode = ref(false);
const selectedTypePromptIds = ref(new Set<string>());
const typeOrganizeTargetGroupId = ref('');
type PromptBulkTarget = 'phrase-groups' | 'phrases' | 'template-groups' | 'templates';
const promptBulkTarget = ref<PromptBulkTarget>('phrases');
const quickPhraseCount = computed(() => quickPhraseGroups.value.reduce((sum, group) => sum + group.phrases.length, 0));
const quickTemplateCount = computed(() =>
  quickTemplateGroups.value.reduce((sum, group) => sum + group.phrases.length, 0),
);
const promptBulkIds = computed(() => {
  if (promptBulkTarget.value === 'phrase-groups') return quickPhraseGroups.value.map(group => group.id);
  if (promptBulkTarget.value === 'phrases')
    return quickPhraseGroups.value.flatMap(group => group.phrases.map(item => item.id));
  if (promptBulkTarget.value === 'template-groups') return quickTemplateGroups.value.map(group => group.id);
  return quickTemplateGroups.value.flatMap(group => group.phrases.map(item => item.id));
});
const {
  active: promptBulkMode,
  allSelected: allPromptBulkSelected,
  cancel: cancelPromptBulk,
  selectedIds: promptBulkSelectedIds,
  selectedIdSet: promptBulkSelectedIdSet,
  setSelected: setPromptBulkSelected,
  start: startBulk,
  toggleAll: toggleAllPromptBulk,
} = useBulkSelection(promptBulkIds);

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
      assetPath:
        settings.value.homeIconAssets.find(
          asset => asset.id === (settings.value.visualTheme.appIconAssetIds[app.id] || ''),
        )?.path || '',
      defaultIcon: app.icon,
      icon: settings.value.visualTheme.appIconOverrides[app.id] || app.icon,
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
      assetPath:
        settings.value.homeIconAssets.find(
          asset => asset.id === (settings.value.visualTheme.appIconAssetIds[app.id] || ''),
        )?.path || '',
      defaultIcon: app.icon,
      icon: settings.value.visualTheme.appIconOverrides[app.id] || app.icon,
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
const theaterTypePromptItems = computed(() => typePrompts.value.filter(item => item.domain === 'theater'));
const theaterTypeGroupOptions = computed(() => [
  { label: '未分组', value: '' },
  ...typePromptGroups.value
    .filter(group => group.domain === 'theater')
    .map(group => ({ label: group.name, value: group.id })),
]);
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
  cancelTypeOrganize();
  cancelPromptBulk();
  activePromptTab.value = tab;
  closeAppPromptDetail();
  activeTypePromptId.value = '';
  promptMenuOpen.value = false;
}

function startPromptBulk(target: PromptBulkTarget) {
  promptBulkTarget.value = target;
  startBulk();
}

function startTypeOrganize() {
  selectedTypePromptIds.value = new Set();
  typeOrganizeTargetGroupId.value = '';
  typeOrganizeMode.value = true;
}

function cancelTypeOrganize() {
  typeOrganizeMode.value = false;
  selectedTypePromptIds.value = new Set();
  typeOrganizeTargetGroupId.value = '';
}

function toggleTypePromptSelection(promptId: string) {
  if (!theaterTypePromptItems.value.some(item => item.id === promptId)) return;
  const next = new Set(selectedTypePromptIds.value);
  if (next.has(promptId)) next.delete(promptId);
  else next.add(promptId);
  selectedTypePromptIds.value = next;
}

function selectAllTypePrompts() {
  selectedTypePromptIds.value = new Set(theaterTypePromptItems.value.map(item => item.id));
}

function clearTypePromptSelection() {
  selectedTypePromptIds.value = new Set();
}

function isTypePromptGroupSelected(promptIds: string[]) {
  return Boolean(promptIds.length) && promptIds.every(promptId => selectedTypePromptIds.value.has(promptId));
}

function selectTypePromptGroup(promptIds: string[]) {
  const next = new Set(selectedTypePromptIds.value);
  const remove = isTypePromptGroupSelected(promptIds);
  promptIds.forEach(promptId => {
    if (remove) next.delete(promptId);
    else next.add(promptId);
  });
  selectedTypePromptIds.value = next;
}

function applyTypeGroupMove() {
  const movedCount = prompts.moveTypePromptsToGroup(
    'theater',
    [...selectedTypePromptIds.value],
    typeOrganizeTargetGroupId.value,
  );
  toastr.success(movedCount ? `已移动 ${movedCount} 个小剧场类型` : '所选类型已在目标分组');
  cancelTypeOrganize();
}

async function removeSelectedTypePrompts() {
  const promptIds = [...selectedTypePromptIds.value];
  if (!promptIds.length) return;
  const confirmed = await phone.confirmNotice(`要删除所选 ${promptIds.length} 个小剧场类型吗？`, {
    confirmLabel: '删除所选',
    kind: 'warning',
  });
  if (!confirmed) return;
  promptIds.forEach(prompts.deleteTypePrompt);
  cancelTypeOrganize();
  toastr.success(`已删除 ${promptIds.length} 个小剧场类型`);
}

async function removePromptBulkSelection() {
  const ids = [...promptBulkSelectedIds.value];
  if (!ids.length) return;
  const labels: Record<PromptBulkTarget, string> = {
    'phrase-groups': '短语分组',
    phrases: '快速短语',
    'template-groups': '模板分组',
    templates: '快捷模板',
  };
  const label = labels[promptBulkTarget.value];
  const confirmed = await phone.confirmNotice(`要删除所选 ${ids.length} 个${label}吗？`, {
    confirmLabel: '删除所选',
    kind: 'warning',
  });
  if (!confirmed) return;
  if (promptBulkTarget.value === 'phrase-groups') ids.forEach(prompts.deleteQuickPhraseGroup);
  else if (promptBulkTarget.value === 'template-groups') ids.forEach(prompts.deleteQuickTemplateGroup);
  else if (promptBulkTarget.value === 'phrases') {
    quickPhraseGroups.value.forEach(group =>
      group.phrases.filter(item => ids.includes(item.id)).forEach(item => prompts.deleteQuickPhrase(group.id, item.id)),
    );
  } else {
    quickTemplateGroups.value.forEach(group =>
      group.phrases
        .filter(item => ids.includes(item.id))
        .forEach(item => prompts.deleteQuickTemplate(group.id, item.id)),
    );
  }
  cancelPromptBulk();
  toastr.success(`已删除 ${ids.length} 个${label}`);
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

.pc-task-variable-summary > span {
  display: inline-flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 5px 8px;
  border: 1px solid var(--pc-border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--pc-surface) 74%, transparent 26%);
  font-size: 12px;
}

.pc-task-variable-summary > span > span {
  flex: 1 1 auto;
  min-width: 0;
  overflow-wrap: anywhere;
}

.pc-task-variable-summary {
  display: grid;
  width: 100%;
}

.pc-task-variable-summary code {
  flex: 0 1 46%;
  min-width: 0;
  max-width: 46%;
  color: var(--pc-theme-accent);
  font-size: 11px;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.pc-group-actions {
  flex: 0 0 auto;
  gap: 6px;
}

.pc-group-actions .pc-icon-btn {
  width: 34px;
  height: 34px;
}

.pc-accordion-title-button {
  border: 0;
  cursor: pointer;
  color: var(--pc-text);
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
  border: 0;
  border-radius: var(--pc-control-radius);
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
  text-align: center;
  transition:
    background 0.16s ease,
    transform 0.16s ease;
}

@media (hover: hover) {
  .pc-app-prompt-tile:hover {
    background: color-mix(in srgb, var(--pc-theme-accent) 7%, transparent 93%);
  }
}

.pc-app-prompt-tile:focus-visible {
  outline: 2px solid var(--pc-theme-accent);
  outline-offset: -2px;
}

.pc-app-prompt-tile:active {
  transform: scale(0.98);
}

.pc-app-prompt-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: var(--pc-icon-radius);
  border: 1px solid color-mix(in srgb, var(--pc-prompt-accent) 28%, var(--pc-border) 72%);
  background: var(--pc-surface-strong);
  color: var(--pc-prompt-accent);
}

.pc-app-prompt-icon :deep(img) {
  width: 90%;
  height: 90%;
  object-fit: contain;
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
  position: relative;
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

.pc-type-prompt-tile.selected {
  border-color: var(--pc-theme-accent);
  background: color-mix(in srgb, var(--pc-theme-accent) 12%, var(--pc-surface-strong) 88%);
}

.pc-type-prompt-tile > i {
  position: absolute;
  top: 6px;
  right: 6px;
  color: var(--pc-theme-accent);
  font-size: 13px;
}

.pc-type-organize-panel .pc-form-actions {
  margin-top: 0;
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
  width: 220px;
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

.pc-phrase-card.bulk {
  grid-template-columns: auto minmax(0, 1fr);
}

.pc-prompts-app .pc-form-actions {
  margin-top: 18px;
  justify-content: flex-end;
}
</style>
