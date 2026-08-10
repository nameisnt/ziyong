<template>
  <section class="pc-prompts-app">
    <section v-if="route.page === 'root'" class="pc-prompts-page">
      <header class="pc-compact-toolbar pc-directory-toolbar pc-prompts-hero">
        <span class="pc-directory-count">{{ activePromptTabLabel }}</span>
        <div class="pc-hero-actions">
          <div ref="promptMenuRoot" class="pc-prompts-menu-anchor">
            <button class="pc-icon-btn" type="button" :title="t`切换分类`" @click="promptMenuOpen = !promptMenuOpen">
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
          <button class="pc-icon-btn" type="button" :title="t`导入或导出`" @click="openTransferCenter">
            <i class="fa-solid fa-arrow-right-arrow-left"></i>
          </button>
          <button class="pc-icon-btn pc-prompts-reset-btn" type="button" :title="t`恢复默认`" @click="resetDefaults">
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
          <button class="pc-icon-btn primary" type="button" :title="t`新增类型`" @click="openCreateTypePrompt">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>

        <EmptyState v-if="!typePrompts.length" :title="t`还没有类型提示词`" />

        <section v-for="domain in typePromptDomainCards" :key="domain.key" class="pc-type-domain-section">
          <header class="pc-type-domain-head">
            <strong>{{ domain.label }}</strong>
            <small>{{ domain.items.length }} {{ t`项` }}</small>
          </header>
          <div class="pc-type-prompt-grid">
            <EmptyState v-if="!domain.items.length" compact :title="domain.emptyLabel" />
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
          <button class="pc-icon-btn primary" type="button" :title="t`新增分组`" @click="openCreateGroup">
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
                @click="prompts.moveQuickPhraseGroup(group.id, -1)"
              >
                <i class="fa-solid fa-arrow-up"></i>
              </button>
              <button
                class="pc-icon-btn"
                type="button"
                :disabled="groupIndex === quickPhraseGroups.length - 1"
                :title="t`下移分组`"
                @click="prompts.moveQuickPhraseGroup(group.id, 1)"
              >
                <i class="fa-solid fa-arrow-down"></i>
              </button>
              <button class="pc-icon-btn" type="button" @click="openRenameGroup(group.id)">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="pc-icon-btn" type="button" @click="openCreatePhrase(group.id)">
                <i class="fa-solid fa-plus"></i>
              </button>
              <button class="pc-icon-btn danger" type="button" @click="removeQuickPhraseGroup(group.id)">
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
                <button class="pc-icon-btn" type="button" @click="copyText(phrase.text, '已复制快速短语')">
                  <i class="fa-solid fa-copy"></i>
                </button>
                <button class="pc-icon-btn" type="button" @click="openEditPhrase(group.id, phrase.id)">
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button class="pc-icon-btn danger" type="button" @click="removeQuickPhrase(group.id, phrase.id)">
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
          <button class="pc-icon-btn primary" type="button" :title="t`新增分组`" @click="openCreateTemplateGroup">
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
                @click="prompts.moveQuickTemplateGroup(group.id, -1)"
              >
                <i class="fa-solid fa-arrow-up"></i>
              </button>
              <button
                class="pc-icon-btn"
                type="button"
                :disabled="groupIndex === quickTemplateGroups.length - 1"
                :title="t`下移分组`"
                @click="prompts.moveQuickTemplateGroup(group.id, 1)"
              >
                <i class="fa-solid fa-arrow-down"></i>
              </button>
              <button class="pc-icon-btn" type="button" @click="openRenameTemplateGroup(group.id)">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="pc-icon-btn" type="button" @click="openCreateTemplate(group.id)">
                <i class="fa-solid fa-plus"></i>
              </button>
              <button class="pc-icon-btn danger" type="button" @click="removeQuickTemplateGroup(group.id)">
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
                <button class="pc-icon-btn" type="button" @click="copyText(template.text, '已复制模板')">
                  <i class="fa-solid fa-copy"></i>
                </button>
                <button class="pc-icon-btn" type="button" @click="openEditTemplate(group.id, template.id)">
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button class="pc-icon-btn danger" type="button" @click="removeQuickTemplate(group.id, template.id)">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </article>
          </div>
        </article>
      </section>
    </section>

    <section v-else-if="route.page === 'app-prompt-editor' && editingAppPrompt" class="pc-prompts-page">
      <div class="pc-prompts-editor">
        <textarea
          ref="appPromptEditorEl"
          v-model="appPromptDraft"
          class="pc-area pc-app-prompt-editor-area"
          :placeholder="editingAppPrompt.placeholder"
        ></textarea>
        <div v-if="editingAppPrompt.kind === 'task' && editingAppPrompt.variables.length" class="pc-field-group">
          <span class="pc-field-label">{{ t`可用占位符` }}</span>
          <div class="pc-chip-row">
            <button
              v-for="variable in editingAppPrompt.variables"
              :key="variable.key"
              class="pc-soft-btn compact"
              type="button"
              :title="variable.label"
              @click="insertTaskVariable(variable.key)"
            >
              {{ formatTaskVariable(variable.key) }}
            </button>
          </div>
        </div>
        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
          <button class="pc-primary-btn" type="button" @click="submitAppPrompt">{{ t`保存` }}</button>
        </div>
      </div>
    </section>

    <section v-else-if="route.page === 'output-editor' && editingOutputDefinition" class="pc-prompts-page">
      <div class="pc-prompts-editor pc-output-editor">
        <label class="pc-field-group">
          <span>{{ t`输出格式` }}</span>
          <textarea v-model="outputDraft.outputFormat" class="pc-area"></textarea>
        </label>

        <label class="pc-output-parser-toggle">
          <input v-model="outputDraft.parserEnabled" type="checkbox" />
          <span>{{ t`使用自定义解析` }}</span>
        </label>

        <template v-if="outputDraft.parserEnabled">
          <div class="pc-output-parser-grid">
            <label class="pc-field-group">
              <span>{{ t`解析类型` }}</span>
              <select v-model="outputDraft.parser.kind" class="pc-select">
                <option value="xml">XML</option>
                <option value="json">JSON</option>
                <option value="labels" :disabled="!canUseLabelParser">{{ t`标签文本` }}</option>
                <option value="text" :disabled="!canUsePlainTextParser">{{ t`纯文本` }}</option>
              </select>
            </label>
            <label v-if="outputDraft.parser.kind !== 'text'" class="pc-field-group">
              <span>{{ outputDraft.parser.kind === 'labels' ? t`外层标签` : t`根路径` }}</span>
              <input v-model="outputDraft.parser.rootPath" class="pc-field" type="text" />
            </label>
          </div>

          <section class="pc-output-field-list">
            <strong>{{ t`字段映射` }}</strong>
            <article v-for="field in outputDraft.parser.fields" :key="field.key" class="pc-output-field">
              <div class="pc-output-field-head">
                <strong>{{ field.label }}</strong>
                <small>{{ field.required ? t`必填` : field.kind === 'object-list' ? t`列表` : t`可选` }}</small>
              </div>
              <input v-model="field.defaultPath" class="pc-field" type="text" :placeholder="t`字段路径`" />
              <div v-if="field.kind === 'text'" class="pc-output-field-options">
                <select v-model="field.extraction" class="pc-select">
                  <option value="text">{{ t`纯文本` }}</option>
                  <option value="markup">{{ t`保留标记` }}</option>
                </select>
              </div>
              <div v-else-if="field.kind === 'text-list'" class="pc-output-field-options">
                <input v-model="field.separator" class="pc-field" type="text" :placeholder="t`分隔正则，可留空`" />
              </div>
              <div v-if="field.kind === 'object-list'" class="pc-output-child-fields">
                <label v-for="child in field.children" :key="child.key" class="pc-field-group">
                  <span>{{ child.label }}</span>
                  <input v-model="child.defaultPath" class="pc-field" type="text" />
                </label>
              </div>
            </article>
          </section>

          <label class="pc-field-group">
            <span>{{ t`测试输出` }}</span>
            <textarea
              v-model="outputDraft.sample"
              class="pc-area compact"
              :placeholder="t`粘贴一段 AI 输出`"
            ></textarea>
          </label>
          <button class="pc-soft-btn" type="button" @click="testOutputParser">
            {{ t`测试解析` }}
          </button>
          <pre v-if="outputDraft.testResult" class="pc-output-test-result">{{ outputDraft.testResult }}</pre>
          <p v-if="outputDraft.testError" class="pc-output-test-error">{{ outputDraft.testError }}</p>
        </template>

        <div class="pc-form-actions">
          <button class="pc-soft-btn danger" type="button" @click="restoreOutputRule">{{ t`恢复默认` }}</button>
          <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
          <button class="pc-primary-btn" type="button" @click="submitOutputRule">{{ t`保存` }}</button>
        </div>
      </div>
    </section>

    <section v-else-if="route.page === 'type-editor'" class="pc-prompts-page">
      <div class="pc-prompts-editor">
        <div class="pc-chip-row">
          <button
            v-for="domain in typePromptDomains"
            :key="domain.key"
            :class="['pc-tab-btn', { active: typeDraft.domain === domain.key }]"
            type="button"
            @click="typeDraft.domain = domain.key"
          >
            {{ domain.label }}
          </button>
        </div>

        <input v-model="typeDraft.name" class="pc-field" type="text" :placeholder="t`类型名称`" />
        <textarea v-model="typeDraft.prompt" class="pc-area" :placeholder="t`类型提示词正文`"></textarea>
        <div v-if="typeDraft.domain === 'theater'" class="pc-field-group">
          <span class="pc-field-label">{{ t`默认渲染方式` }}</span>
          <span class="pc-segment">
            <button
              :class="['pc-segment-btn', { active: typeDraft.renderMode === 'markdown' }]"
              type="button"
              @click="typeDraft.renderMode = 'markdown'"
            >
              Markdown
            </button>
            <button
              :class="['pc-segment-btn', { active: typeDraft.renderMode === 'frontend' }]"
              type="button"
              @click="typeDraft.renderMode = 'frontend'"
            >
              {{ t`网页渲染` }}
            </button>
          </span>
        </div>

        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
          <button class="pc-primary-btn" type="button" @click="submitTypePrompt">{{ t`保存` }}</button>
        </div>
      </div>
    </section>

    <section v-else-if="route.page === 'group-editor'" class="pc-prompts-page">
      <div class="pc-prompts-editor">
        <input v-model="groupDraft.name" class="pc-field" type="text" :placeholder="t`分组名称`" />
        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
          <button class="pc-primary-btn" type="button" @click="submitGroup">{{ t`保存` }}</button>
        </div>
      </div>
    </section>

    <section v-else-if="route.page === 'template-group-editor'" class="pc-prompts-page">
      <div class="pc-prompts-editor">
        <input v-model="groupDraft.name" class="pc-field" type="text" :placeholder="t`分组名称`" />
        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
          <button class="pc-primary-btn" type="button" @click="submitTemplateGroup">{{ t`保存` }}</button>
        </div>
      </div>
    </section>

    <section v-else-if="route.page === 'phrase-editor' && phraseGroup" class="pc-prompts-page">
      <div class="pc-prompts-editor">
        <textarea v-model="phraseDraft.text" class="pc-area compact" :placeholder="t`输入这条快速短语`"></textarea>
        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
          <button class="pc-primary-btn" type="button" @click="submitPhrase">{{ t`保存` }}</button>
        </div>
      </div>
    </section>

    <section v-else-if="route.page === 'template-editor' && templateGroup" class="pc-prompts-page">
      <div class="pc-prompts-editor">
        <textarea v-model="phraseDraft.text" class="pc-area compact" :placeholder="t`输入格式模板`"></textarea>
        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
          <button class="pc-primary-btn" type="button" @click="submitTemplate">{{ t`保存` }}</button>
        </div>
      </div>
    </section>

    <section v-else-if="route.page === 'transfer'" class="pc-prompts-page">
      <div class="pc-prompts-editor">
        <div class="pc-transfer-list">
          <label class="pc-transfer-item">
            <input v-model="transferSelection.appPrompts" type="checkbox" />
            <div>
              <strong>{{ t`App 提示词` }}</strong>
            </div>
          </label>

          <label class="pc-transfer-item">
            <input v-model="transferSelection.taskTemplates" type="checkbox" />
            <div>
              <strong>{{ t`任务模板` }}</strong>
            </div>
          </label>

          <label class="pc-transfer-item">
            <input v-model="transferSelection.outputRules" type="checkbox" />
            <div>
              <strong>{{ t`输出与解析` }}</strong>
            </div>
          </label>

          <label class="pc-transfer-item">
            <input v-model="transferSelection.typePrompts" type="checkbox" />
            <div>
              <strong>{{ t`类型提示词` }}</strong>
            </div>
          </label>

          <label class="pc-transfer-item">
            <input v-model="transferSelection.quickPhraseGroups" type="checkbox" />
            <div>
              <strong>{{ t`快速短语` }}</strong>
            </div>
          </label>
          <label class="pc-transfer-item">
            <input v-model="transferSelection.quickTemplateGroups" type="checkbox" />
            <div>
              <strong>{{ t`模板快捷` }}</strong>
            </div>
          </label>
        </div>

        <div class="pc-form-actions pc-transfer-actions">
          <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`返回` }}</button>
          <button class="pc-soft-btn" type="button" @click="openTransferImport">
            {{ t`导入所选` }}
          </button>
          <button class="pc-primary-btn" type="button" @click="exportSelected">
            {{ t`导出所选` }}
          </button>
        </div>
        <input
          ref="transferInputEl"
          class="pc-hidden-input"
          type="file"
          accept="application/json,.json"
          @change="onTransferSelected"
        />
      </div>
    </section>

    <Teleport to=".pc-phone-shell">
      <div
        v-if="activeAppPromptGroup && activeAppPrompt"
        class="pc-prompt-detail-backdrop"
        role="presentation"
        @click.self="closeAppPromptDetail"
      >
        <section
          class="pc-section-card pc-prompt-detail-dialog"
          role="dialog"
          aria-modal="true"
          :aria-label="activeAppPrompt.label"
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
            <button class="pc-icon-btn" type="button" :title="t`关闭`" @click="closeAppPromptDetail">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </header>
          <div v-if="activeAppPromptGroup.items.length > 1" class="pc-prompt-variant-grid">
            <button
              v-for="item in activeAppPromptGroup.items"
              :key="item.openKey"
              :class="['pc-segment-btn', { active: activeAppPrompt.openKey === item.openKey }]"
              type="button"
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
        class="pc-prompt-detail-backdrop"
        role="presentation"
        @click.self="closeTypePromptDetail"
      >
        <section
          class="pc-section-card pc-prompt-detail-dialog"
          role="dialog"
          aria-modal="true"
          :aria-label="activeTypePrompt.name"
        >
          <header class="pc-prompt-detail-head">
            <div>
              <span class="pc-kicker">{{ activeTypePromptDomainLabel }}</span>
              <h2>{{ activeTypePrompt.name }}</h2>
            </div>
            <button class="pc-icon-btn" type="button" :title="t`关闭`" @click="closeTypePromptDetail">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </header>
          <div class="pc-prompt-detail-body">
            <p v-if="activeTypePrompt.domain === 'theater'" class="pc-prompt-render-mode">
              {{ activeTypePrompt.renderMode === 'frontend' ? t`默认网页渲染` : t`默认 Markdown` }}
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
import {
  getRegisteredPhoneApps,
  type PhoneOutputParserDefinition,
  type PhonePromptDefinition,
  type PhoneTaskTemplateDefinition,
} from '@/core/appRegistry';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore, type PromptTransferSelection, type QuickPhrase } from '@/store/prompts';
import { parseOutputWithConfig } from '@/util/outputParsing';
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
  typePrompts,
} = storeToRefs(prompts);

const transferInputEl = ref<HTMLInputElement | null>(null);
const appPromptEditorEl = ref<HTMLTextAreaElement | null>(null);
type PromptTab = 'app' | 'output' | 'phrase' | 'task' | 'template' | 'type';
type AppPromptKind = 'app' | 'special' | 'task';
type AppPromptCard = {
  appId: string;
  appLabel: string;
  defaultPrompt: string;
  key: string;
  kind: AppPromptKind;
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
const promptMenuOpen = ref(false);
const promptMenuRoot = ref<HTMLElement | null>(null);
const phraseGroupOpen = reactive<Record<string, boolean>>({});
const templateGroupOpen = reactive<Record<string, boolean>>({});
const appPromptDraft = ref('');
const typeDraft = reactive({
  domain: '',
  name: '',
  prompt: '',
  renderMode: 'markdown' as 'frontend' | 'markdown',
});
const groupDraft = reactive({
  name: '',
});
const phraseDraft = reactive({
  text: '',
});
const outputDraft = reactive<{
  outputFormat: string;
  parser: PhoneOutputParserDefinition;
  parserEnabled: boolean;
  sample: string;
  testError: string;
  testResult: string;
}>({
  outputFormat: '',
  parser: {
    fields: [],
    kind: 'xml',
    rootPath: 'result',
  },
  parserEnabled: false,
  sample: '',
  testError: '',
  testResult: '',
});
const transferSelection = reactive<PromptTransferSelection>({
  appPrompts: true,
  taskTemplates: true,
  outputRules: true,
  typePrompts: true,
  quickPhraseGroups: true,
  quickTemplateGroups: true,
});

function createAppPromptCard(
  appId: string,
  appLabel: string,
  kind: AppPromptKind,
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
const fallbackTypeDomain = computed(() => typePromptDomains.value[0]?.key ?? '');
const typePromptDomainCards = computed(() =>
  typePromptDomains.value.map(domain => ({
    ...domain,
    emptyLabel: domain.emptyLabel || `还没有${domain.label}类型提示词`,
    items: typePrompts.value.filter(item => item.domain === domain.key),
  })),
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
const canUseLabelParser = computed(() => outputDraft.parser.fields.every(field => field.kind === 'text'));
const canUsePlainTextParser = computed(
  () => outputDraft.parser.fields.length === 1 && outputDraft.parser.fields[0]?.kind === 'text',
);

function cloneParser(parser: PhoneOutputParserDefinition) {
  return structuredClone(parser);
}

function loadOutputDraft() {
  const definition = editingOutputDefinition.value;
  if (!definition) return;
  const override = outputRules.value[definition.id];
  outputDraft.outputFormat = prompts.resolveOutputFormat(definition.id);
  outputDraft.parser = cloneParser(override?.parser ?? definition.parser);
  outputDraft.parserEnabled = override?.parserEnabled ?? false;
  outputDraft.sample = '';
  outputDraft.testError = '';
  outputDraft.testResult = '';
}

watch(
  () => route.value,
  current => {
    if (current.appId !== 'prompts' || current.page !== 'root') {
      closeAppPromptDetail();
      closeTypePromptDetail();
    }
    if (current.page === 'app-prompt-editor') {
      appPromptDraft.value = editingAppPrompt.value?.value || '';
    }
    if (current.page === 'type-editor') {
      typeDraft.domain = editingTypePrompt.value?.domain || fallbackTypeDomain.value;
      typeDraft.name = editingTypePrompt.value?.name || '';
      typeDraft.prompt = editingTypePrompt.value?.prompt || '';
      typeDraft.renderMode = editingTypePrompt.value?.renderMode === 'frontend' ? 'frontend' : 'markdown';
    }

    if (current.page === 'group-editor') {
      groupDraft.name = editingGroup.value?.name || '';
    }
    if (current.page === 'template-group-editor') {
      groupDraft.name = editingTemplateGroup.value?.name || '';
    }

    if (current.page === 'phrase-editor') {
      phraseDraft.text = editingPhrase.value?.text || '';
    }
    if (current.page === 'template-editor') {
      phraseDraft.text = editingTemplate.value?.text || '';
    }
    if (current.page === 'output-editor') {
      loadOutputDraft();
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

function updateAppPromptValue(item: Pick<AppPromptCard, 'key' | 'kind'>, value: string) {
  if (item.kind === 'app') {
    prompts.updateAppPrompt(item.key, value);
    return;
  }
  if (item.kind === 'task') {
    prompts.updateTaskTemplate(item.key, value);
    return;
  }
  prompts.updateSpecialPrompt(item.key, value);
}

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

function submitAppPrompt() {
  const item = editingAppPrompt.value;
  if (!item) return;
  updateAppPromptValue(item, appPromptDraft.value);
  toastr.success(item.kind === 'task' ? '已保存任务模板' : '已保存 App 提示词');
  phone.goBack();
}

function insertTaskVariable(key: string) {
  const textarea = appPromptEditorEl.value;
  const placeholder = `{{${key}}}`;
  if (!textarea) {
    appPromptDraft.value += placeholder;
    return;
  }
  const start = textarea.selectionStart ?? appPromptDraft.value.length;
  const end = textarea.selectionEnd ?? start;
  appPromptDraft.value = `${appPromptDraft.value.slice(0, start)}${placeholder}${appPromptDraft.value.slice(end)}`;
  nextTick(() => {
    textarea.focus();
    textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
  });
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
  const shouldRestore = await phone.confirmNotice(`要恢复“${item.label}”的默认提示词吗？`, {
    confirmLabel: '恢复',
    kind: 'warning',
  });
  if (!shouldRestore) return;
  updateAppPromptValue(item, item.defaultPrompt);
  toastr.success('已恢复默认提示词');
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
  typeDraft.domain = fallbackTypeDomain.value;
  typeDraft.name = '';
  typeDraft.prompt = '';
  typeDraft.renderMode = 'markdown';
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

function testOutputParser() {
  outputDraft.testError = '';
  outputDraft.testResult = '';
  if (!outputDraft.sample.trim()) {
    outputDraft.testError = '请先填写测试输出';
    return;
  }
  const result = parseOutputWithConfig(outputDraft.sample, outputDraft.parser);
  if (!result.ok) {
    outputDraft.testError = result.warnings.join('\n');
    return;
  }
  outputDraft.testResult = JSON.stringify(result.data, null, 2);
}

function submitOutputRule() {
  const definition = editingOutputDefinition.value;
  if (!definition || !outputDraft.outputFormat.trim()) return;
  if (outputDraft.parserEnabled) {
    const missingPath = outputDraft.parser.fields.some(
      field => !field.defaultPath.trim() || field.children?.some(child => !child.defaultPath.trim()),
    );
    if (missingPath) {
      toastr.warning('解析字段路径不能为空');
      return;
    }
    if (
      outputDraft.parser.kind === 'text' &&
      outputDraft.parser.fields.filter(field => field.kind === 'text').length !== 1
    ) {
      toastr.warning('纯文本解析只支持一个文本字段');
      return;
    }
  }
  prompts.saveOutputRule(definition.id, {
    outputFormat: outputDraft.outputFormat,
    parser: outputDraft.parser,
    parserEnabled: outputDraft.parserEnabled,
  });
  toastr.success('已保存输出与解析规则');
  phone.goBack();
}

async function restoreOutputRule() {
  const definition = editingOutputDefinition.value;
  if (!definition) return;
  const shouldRestore = await phone.confirmNotice(`要恢复“${definition.label}”的默认输出与解析规则吗？`, {
    confirmLabel: '恢复',
    kind: 'warning',
  });
  if (!shouldRestore) return;
  prompts.resetOutputRule(definition.id);
  loadOutputDraft();
  toastr.success('已恢复默认规则');
}

function openEditTypePrompt(promptId: string) {
  phone.pushPage('type-editor', '编辑类型提示词', { promptId });
}

function submitTypePrompt() {
  if (!typeDraft.prompt.trim()) return;
  if (editingTypePrompt.value) {
    prompts.updateTypePrompt(editingTypePrompt.value.id, typeDraft);
  } else {
    prompts.createTypePrompt(typeDraft);
  }
  phone.goBack();
}

function openCreateGroup() {
  phone.pushPage('group-editor', '新增短语分组');
}

function openRenameGroup(groupId: string) {
  phone.pushPage('group-editor', '重命名短语分组', { groupId });
}

function submitGroup() {
  if (editingGroup.value) {
    prompts.renameQuickPhraseGroup(editingGroup.value.id, groupDraft.name);
  } else {
    prompts.createQuickPhraseGroup(groupDraft.name);
  }
  phone.goBack();
}

function openCreateTemplateGroup() {
  phone.pushPage('template-group-editor', '新增模板分组');
}

function openRenameTemplateGroup(groupId: string) {
  phone.pushPage('template-group-editor', '重命名模板分组', { groupId });
}

function submitTemplateGroup() {
  if (editingTemplateGroup.value) {
    prompts.renameQuickTemplateGroup(editingTemplateGroup.value.id, groupDraft.name);
  } else {
    prompts.createQuickTemplateGroup(groupDraft.name);
  }
  phone.goBack();
}

function openCreatePhrase(groupId: string) {
  phone.pushPage('phrase-editor', '新增快速短语', { groupId });
}

function openEditPhrase(groupId: string, phraseId: string) {
  phone.pushPage('phrase-editor', '编辑快速短语', { groupId, phraseId });
}

function submitPhrase() {
  const groupId = route.value.params?.groupId;
  if (!groupId || !phraseDraft.text.trim()) return;
  if (editingPhrase.value) {
    prompts.updateQuickPhrase(groupId, editingPhrase.value.id, phraseDraft.text);
  } else {
    prompts.createQuickPhrase(groupId, phraseDraft.text);
  }
  phone.goBack();
}

function openCreateTemplate(groupId: string) {
  phone.pushPage('template-editor', '新增模板', { groupId });
}

function openEditTemplate(groupId: string, phraseId: string) {
  phone.pushPage('template-editor', '编辑模板', { groupId, phraseId });
}

function submitTemplate() {
  const groupId = route.value.params?.groupId;
  if (!groupId || !phraseDraft.text.trim()) return;
  if (editingTemplate.value) {
    prompts.updateQuickTemplate(groupId, editingTemplate.value.id, phraseDraft.text);
  } else {
    prompts.createQuickTemplate(groupId, phraseDraft.text);
  }
  phone.goBack();
}

function getTransferSelection() {
  return {
    appPrompts: transferSelection.appPrompts,
    taskTemplates: transferSelection.taskTemplates,
    outputRules: transferSelection.outputRules,
    typePrompts: transferSelection.typePrompts,
    quickPhraseGroups: transferSelection.quickPhraseGroups,
    quickTemplateGroups: transferSelection.quickTemplateGroups,
  };
}

function ensureTransferSelection() {
  const selection = getTransferSelection();
  if (Object.values(selection).some(Boolean)) return selection;
  throw new Error('请至少勾选一类提示词');
}

function exportSelected() {
  try {
    const transfer = prompts.buildTransfer(ensureTransferSelection());
    const blob = new Blob([JSON.stringify(transfer, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `sillytavern-phone-prompts-${Date.now()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    toastr.success('已导出所选提示词配置');
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : '导出提示词失败';
    toastr.error(message);
  }
}

function openTransferImport() {
  try {
    ensureTransferSelection();
    transferInputEl.value?.click();
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : '请选择要导入的区段';
    toastr.error(message);
  }
}

async function onTransferSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  try {
    const selection = ensureTransferSelection();
    const transfer = prompts.parseTransfer(await file.text());
    const shouldImport = await phone.confirmNotice('要用这份文件覆盖当前勾选的提示词区段吗？未勾选的内容会保持不变。', {
      confirmLabel: '导入',
      kind: 'warning',
    });
    if (!shouldImport) return;

    prompts.applyTransfer(transfer, selection);
    toastr.success('已导入所选提示词配置');
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : '导入提示词失败';
    toastr.error(message);
  }
}

async function removeTypePrompt(promptId: string) {
  const item = prompts.getTypePrompt(promptId);
  const shouldDelete = await phone.confirmNotice(`要删除类型提示词“${item?.name || '未命名类型'}”吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!shouldDelete) return;
  prompts.deleteTypePrompt(promptId);
  if (activeTypePromptId.value === promptId) closeTypePromptDetail();
  toastr.success('已删除类型提示词');
}

async function removeQuickPhraseGroup(groupId: string) {
  const group = prompts.getQuickPhraseGroup(groupId);
  const shouldDelete = await phone.confirmNotice(
    `要删除短语分组“${group?.name || '未命名分组'}”吗？组内短语也会一起删除。`,
    {
      confirmLabel: '删除',
      kind: 'warning',
    },
  );
  if (!shouldDelete) return;
  prompts.deleteQuickPhraseGroup(groupId);
  toastr.success('已删除短语分组');
}

async function removeQuickPhrase(groupId: string, phraseId: string) {
  const group = prompts.getQuickPhraseGroup(groupId);
  const phrase = group?.phrases.find(item => item.id === phraseId) ?? null;
  const preview = phrase?.text.trim().slice(0, 18) || '这条短语';
  const shouldDelete = await phone.confirmNotice(
    `要删除短语“${preview}${phrase?.text.length && phrase.text.length > 18 ? '...' : ''}”吗？`,
    {
      confirmLabel: '删除',
      kind: 'warning',
    },
  );
  if (!shouldDelete) return;
  prompts.deleteQuickPhrase(groupId, phraseId);
  toastr.success('已删除快速短语');
}

async function removeQuickTemplateGroup(groupId: string) {
  const group = prompts.getQuickTemplateGroup(groupId);
  const shouldDelete = await phone.confirmNotice(
    `要删除模板分组“${group?.name || '未命名分组'}”吗？组内模板也会一起删除。`,
    {
      confirmLabel: '删除',
      kind: 'warning',
    },
  );
  if (!shouldDelete) return;
  prompts.deleteQuickTemplateGroup(groupId);
  toastr.success('已删除模板分组');
}

async function removeQuickTemplate(groupId: string, phraseId: string) {
  const group = prompts.getQuickTemplateGroup(groupId);
  const template = group?.phrases.find(item => item.id === phraseId) ?? null;
  const preview = template?.text.trim().slice(0, 18) || '这个模板';
  const shouldDelete = await phone.confirmNotice(
    `要删除模板“${preview}${template?.text.length && template.text.length > 18 ? '...' : ''}”吗？`,
    {
      confirmLabel: '删除',
      kind: 'warning',
    },
  );
  if (!shouldDelete) return;
  prompts.deleteQuickTemplate(groupId, phraseId);
  toastr.success('已删除模板');
}

async function resetDefaults() {
  const shouldReset = await phone.confirmNotice(
    '要恢复默认提示词配置吗？当前 App 提示词、任务模板、输出与解析、类型提示词和快速短语都会被默认值覆盖。',
    {
      confirmLabel: '恢复',
      kind: 'warning',
    },
  );
  if (!shouldReset) return;
  prompts.resetDefaults();
  toastr.success('已恢复默认提示词配置');
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

.pc-card-head span,
.pc-transfer-item p {
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
  padding: 10px 14px;
  min-width: 92px;
  height: 40px;
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
  position: absolute;
  z-index: 64;
  inset: 55px 0 0;
  display: grid;
  place-items: center;
  padding: 18px;
  background: color-mix(in srgb, var(--pc-text) 32%, transparent 68%);
}

.pc-prompt-detail-dialog {
  display: flex;
  flex-direction: column;
  width: min(100%, 340px);
  max-height: calc(100% - 36px);
  overflow: hidden;
  background: var(--pc-bg);
  opacity: 1;
  backdrop-filter: none;
  box-shadow: 0 18px 44px color-mix(in srgb, var(--pc-text) 20%, transparent 80%);
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

.pc-prompt-variant-grid .pc-segment-btn {
  min-inline-size: 0;
  min-height: 38px;
  padding-inline: 6px;
  border-radius: calc(var(--pc-control-radius) - 3px);
  line-height: 1.25;
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

.pc-app-prompt-editor-area {
  min-height: 320px;
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

.pc-output-parser-toggle {
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
}

.pc-output-parser-grid,
.pc-output-field-options,
.pc-output-child-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.pc-output-field-list {
  display: grid;
  gap: 0;
  border-block: 1px solid var(--pc-border);
}

.pc-output-field-list > strong {
  padding-block: 12px;
}

.pc-output-field {
  display: grid;
  gap: 10px;
  padding: 12px 0;
  border-top: 1px solid var(--pc-border);
}

.pc-output-field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-output-field-head small {
  color: var(--pc-muted);
}

.pc-output-editor :is(.pc-field, .pc-select, .pc-area) {
  margin-top: 0;
}

.pc-output-editor .pc-form-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.pc-output-editor .pc-form-actions :is(.pc-soft-btn, .pc-primary-btn) {
  min-width: 0;
  padding-inline: 8px;
}

.pc-output-test-result {
  max-height: 220px;
  overflow: auto;
  margin: 0;
  padding: 12px;
  border: 1px solid var(--pc-border);
  border-radius: 8px;
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  white-space: pre-wrap;
}

.pc-output-test-error {
  margin: 0;
  color: var(--pc-danger);
  white-space: pre-wrap;
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

.pc-prompts-app .pc-area {
  min-height: 260px;
  resize: vertical;
}

.pc-prompts-app .pc-area.compact {
  min-height: 180px;
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

.pc-transfer-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.pc-transfer-item {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 12px;
  align-items: flex-start;
  padding: 14px;
  border: 1px solid var(--pc-border);
  border-radius: min(var(--pc-card-radius), 8px);
  background: var(--pc-surface-strong);
}

.pc-transfer-item input {
  margin-top: 3px;
}

.pc-transfer-item strong {
  display: block;
  font-size: 14px;
}

.pc-icon-btn.danger {
  color: var(--pc-danger);
}

.pc-prompts-app .pc-form-actions {
  margin-top: 18px;
  justify-content: flex-end;
}

.pc-transfer-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.pc-transfer-actions .pc-soft-btn,
.pc-transfer-actions .pc-primary-btn {
  width: 100%;
  min-width: 0;
  padding: 0 8px;
}
</style>
