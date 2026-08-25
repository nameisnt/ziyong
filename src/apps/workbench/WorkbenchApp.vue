<template>
  <section class="pc-workbench-app">
    <section class="pc-workbench-page">
      <ConfigurationRecoveryNotice
        v-if="configError"
        :error="configError"
        filename="sillytavern-phone-workbench-corrupted-data.json"
        :raw-data="rawConfig"
        @reset="resetCorruptedSettings"
        @retry="workbench.rehydrateFromSettings"
      />

      <div class="pc-compact-toolbar pc-directory-toolbar pc-workbench-toolbar">
        <span class="pc-directory-count"
          >{{ workflows.length }} {{ t`个工作流` }} · {{ currentAiReplyCount }} AI 层</span
        >
        <button
          class="pc-icon-btn"
          type="button"
          :aria-label="t`新建流程`"
          :title="t`新建流程`"
          @click="createWorkflow"
        >
          <i class="fa-solid fa-plus"></i>
        </button>
      </div>

      <EmptyState v-if="!workflows.length" :title="t`还没有工作流`" />

      <article v-if="insertDrafts.length" class="pc-page-section pc-log-card">
        <button class="pc-log-toggle" type="button" @click="insertDraftsOpen = !insertDraftsOpen">
          <span>
            <strong>{{ t`待插入草稿` }}</strong>
            <small>{{ insertDrafts.length }} {{ t`条` }}</small>
          </span>
          <i :class="insertDraftsOpen ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
        </button>
        <div v-if="insertDraftsOpen" class="pc-log-list">
          <article v-for="draft in insertDrafts" :key="draft.id" class="pc-insert-draft-row">
            <strong>{{ draft.workflowName }}</strong>
            <pre>{{ previewInsertDraft(draft) }}</pre>
            <div class="pc-form-actions pc-workbench-actions">
              <button class="pc-soft-btn danger" type="button" @click="discardInsertDraft(draft.id)">
                <i class="fa-solid fa-xmark"></i>
                <span>{{ t`丢弃` }}</span>
              </button>
              <button class="pc-primary-btn" type="button" @click="confirmInsertDraft(draft)">
                <i class="fa-solid fa-file-circle-plus"></i>
                <span>{{ t`插入` }}</span>
              </button>
            </div>
          </article>
        </div>
      </article>

      <article v-for="workflow in workflows" :key="workflow.id" class="pc-page-section pc-workflow-card">
        <div class="pc-workflow-head">
          <button class="pc-workflow-title" type="button" @click="toggleWorkflow(workflow.id)">
            <span>
              <strong>{{ workflow.name }}</strong>
              <small
                >{{ workflow.enabled ? t`自动触发` : t`已停用` }} ·
                {{ workflow.steps.filter(step => step.enabled).length }} {{ t`步` }}</small
              >
              <small>{{ getWorkflowStatus(workflow) }}</small>
              <small v-if="getWorkflowLastStatus(workflow)">{{ getWorkflowLastStatus(workflow) }}</small>
            </span>
            <i :class="isWorkflowOpen(workflow.id) ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
          </button>
        </div>

        <div v-if="isWorkflowOpen(workflow.id)" class="pc-workflow-body">
          <div class="pc-form-grid">
            <label class="pc-field-group">
              <span>{{ t`名称` }}</span>
              <input
                class="pc-field"
                type="text"
                :value="workflow.name"
                @change="updateWorkflowName(workflow.id, ($event.target as HTMLInputElement).value)"
              />
            </label>
            <label class="pc-field-group">
              <span>{{ t`AI 回复间隔` }}</span>
              <div class="pc-inline-fields">
                <select
                  class="pc-select"
                  :value="getTriggerMode(workflow)"
                  @change="updateTriggerMode(workflow, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="1">{{ t`每 1 层` }}</option>
                  <option value="3">{{ t`每 3 层` }}</option>
                  <option value="5">{{ t`每 5 层` }}</option>
                  <option value="custom">{{ t`自定义` }}</option>
                </select>
                <input
                  v-if="getTriggerMode(workflow) === 'custom'"
                  class="pc-field pc-compact-number"
                  min="1"
                  max="200"
                  type="number"
                  :value="workflow.triggerAiReplies"
                  @change="updateTrigger(workflow.id, ($event.target as HTMLInputElement).value)"
                />
              </div>
            </label>
            <label class="pc-field-group">
              <span>{{ t`延后处理（AI 层）` }}</span>
              <input
                class="pc-field"
                min="0"
                max="20"
                type="number"
                :value="workflow.delayAiReplies"
                @change="updateDelay(workflow.id, ($event.target as HTMLInputElement).value)"
              />
            </label>
            <label class="pc-field-group">
              <span>{{ t`来源` }}</span>
              <select v-model="workflow.sourceMode" class="pc-select">
                <option value="new">{{ t`上次成功后新增` }}</option>
                <option value="recent">{{ t`最近 N 楼` }}</option>
                <option value="all">{{ t`全部楼层` }}</option>
              </select>
            </label>
            <label class="pc-field-group">
              <span>{{ t`全局 RPM 请求限制` }}</span>
              <input v-model.number="settings.generation.rpmLimit" class="pc-field" min="0" max="120" type="number" />
            </label>
          </div>

          <label class="pc-field-group">
            <span>{{ t`工作流默认 API` }}</span>
            <div class="pc-workflow-api-row">
              <SearchableCombobox
                :model-value="getWorkflowProviderValue(workflow)"
                input-label="选择工作流默认 API"
                :options="workflowProviderOptions(workflow)"
                placeholder="跟随全局 API"
                @update:model-value="updateWorkflowProvider(workflow.id, $event)"
              />
              <button
                class="pc-icon-btn"
                type="button"
                :aria-label="t`刷新酒馆预设`"
                :title="t`刷新酒馆预设`"
                @click="refreshTavernPresetNames"
              >
                <i class="fa-solid fa-rotate"></i>
              </button>
            </div>
          </label>

          <label class="pc-field-group">
            <span>{{ t`工作流默认预设` }}</span>
            <SearchableCombobox
              :model-value="workflow.tavernPresetName"
              input-label="选择工作流默认预设"
              :options="tavernPresetOptions(workflow.tavernPresetName)"
              placeholder="跟随全局生成预设"
              @update:model-value="workbench.updateWorkflow(workflow.id, { tavernPresetName: $event })"
            />
          </label>

          <label v-if="workflow.sourceMode === 'recent'" class="pc-field-group">
            <span>{{ t`最近楼层数` }}</span>
            <input v-model.number="workflow.recentCount" class="pc-field" min="1" max="200" type="number" />
          </label>

          <label class="pc-switch-row">
            <input
              type="checkbox"
              :checked="workflow.enabled"
              @change="workbench.updateWorkflow(workflow.id, { enabled: ($event.target as HTMLInputElement).checked })"
            />
            <span>{{ t`启用自动触发` }}</span>
          </label>

          <label class="pc-switch-row">
            <input
              type="checkbox"
              :checked="workflow.insertAfterRun"
              @change="
                workbench.updateWorkflow(workflow.id, { insertAfterRun: ($event.target as HTMLInputElement).checked })
              "
            />
            <span>{{ t`生成后插入聊天末尾` }}</span>
          </label>

          <textarea
            v-if="workflow.insertAfterRun"
            class="pc-area compact"
            :placeholder="t`插入模板，可用 {{content}} 表示本次工作流生成内容`"
            :value="workflow.insertTemplate"
            @input="
              workbench.updateWorkflow(workflow.id, { insertTemplate: ($event.target as HTMLTextAreaElement).value })
            "
          ></textarea>

          <section class="pc-step-picker">
            <SearchableCombobox
              :model-value="selectedActions[workflow.id] || ''"
              :options="workbenchActionOptions"
              :placeholder="t`选择要添加的生成步骤`"
              @update:model-value="selectedActions[workflow.id] = $event"
            />
            <button
              class="pc-icon-btn"
              type="button"
              :aria-label="t`新增步骤`"
              :title="t`新增步骤`"
              @click="addStep(workflow.id)"
            >
              <i class="fa-solid fa-plus"></i>
            </button>
          </section>

          <div class="pc-step-list">
            <article v-for="(step, stepIndex) in workflow.steps" :key="step.id" class="pc-step-card">
              <div class="pc-step-head">
                <label class="pc-step-enable">
                  <input
                    type="checkbox"
                    :checked="step.enabled"
                    @change="
                      workbench.updateStep(workflow.id, step.id, {
                        enabled: ($event.target as HTMLInputElement).checked,
                      })
                    "
                  />
                  <strong>{{ getActionLabel(step.appId, step.actionId) }}</strong>
                </label>
                <div class="pc-step-actions">
                  <button
                    class="pc-icon-btn"
                    type="button"
                    :title="isStepOpen(step.id) ? t`折叠步骤` : t`展开步骤`"
                    :aria-label="isStepOpen(step.id) ? t`折叠步骤` : t`展开步骤`"
                    @click="toggleStep(step.id)"
                  >
                    <i :class="isStepOpen(step.id) ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
                  </button>
                  <button
                    class="pc-icon-btn"
                    type="button"
                    :disabled="stepIndex === 0"
                    :aria-label="t`上移`"
                    :title="t`上移`"
                    @click="workbench.moveStep(workflow.id, step.id, -1)"
                  >
                    <i class="fa-solid fa-arrow-up"></i>
                  </button>
                  <button
                    class="pc-icon-btn"
                    type="button"
                    :disabled="stepIndex === workflow.steps.length - 1"
                    :aria-label="t`下移`"
                    :title="t`下移`"
                    @click="workbench.moveStep(workflow.id, step.id, 1)"
                  >
                    <i class="fa-solid fa-arrow-down"></i>
                  </button>
                  <button
                    class="pc-icon-btn danger"
                    type="button"
                    :aria-label="t`删除`"
                    :title="t`删除`"
                    @click="removeStep(workflow.id, step.id)"
                  >
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </div>
              </div>

              <div v-if="isStepOpen(step.id)" class="pc-step-body">
                <label v-if="stepIndex > 0" class="pc-field-group">
                  <span>{{ t`输入来源` }}</span>
                  <select v-model="step.inputMode" class="pc-select">
                    <option value="chat">{{ t`聊天来源` }}</option>
                    <option value="previous">{{ t`上一步结果` }}</option>
                  </select>
                </label>

                <section class="pc-step-config pc-step-generation-config">
                  <label class="pc-field-group">
                    <span>{{ t`生成配置` }}</span>
                    <select v-model="step.generationMode" class="pc-select">
                      <option value="workflow">{{ t`跟随工作流默认` }}</option>
                      <option value="global">{{ t`跟随全局生成模式` }}</option>
                      <option value="custom">{{ t`本步骤自定义` }}</option>
                    </select>
                  </label>
                  <template v-if="step.generationMode === 'custom'">
                    <label class="pc-field-group">
                      <span>{{ t`本步骤 API` }}</span>
                      <select v-model="step.apiMode" class="pc-select">
                        <option value="tavern">{{ t`酒馆当前 API` }}</option>
                        <option value="external">{{ t`外部 API` }}</option>
                      </select>
                    </label>
                    <label v-if="step.apiMode === 'external'" class="pc-field-group">
                      <span>{{ t`连接配置` }}</span>
                      <SearchableCombobox
                        v-model="step.externalProfileId"
                        input-label="选择外部 API 配置"
                        :options="externalProfileOptions(step.externalProfileId)"
                        placeholder="请选择外部 API 配置"
                      />
                    </label>
                    <label class="pc-field-group">
                      <span>{{ t`本步骤预设` }}</span>
                      <SearchableCombobox
                        v-model="step.tavernPresetName"
                        input-label="选择步骤预设"
                        :options="tavernPresetOptions(step.tavernPresetName)"
                        placeholder="跟随全局生成预设"
                      />
                    </label>
                  </template>
                </section>

                <div v-if="step.appId === 'summary'" class="pc-step-config">
                  <label class="pc-field-group">
                    <span>{{ t`目标总结集` }}</span>
                    <SearchableCombobox
                      v-model="step.config.summaryBookId"
                      input-label="选择目标总结集"
                      :options="
                        resourceOptions(summaryBooks, step.config.summaryBookId, '工作台自动生成', book => book.title)
                      "
                      placeholder="工作台自动生成"
                    />
                  </label>
                </div>

                <div v-else-if="step.appId === 'diary'" class="pc-step-config">
                  <label class="pc-field-group">
                    <span>{{ t`目标日记书架` }}</span>
                    <SearchableCombobox
                      v-model="step.config.diaryBookId"
                      input-label="选择目标日记书架"
                      :options="
                        resourceOptions(diaryBooks, step.config.diaryBookId, '按视角自动创建', book => book.title)
                      "
                      placeholder="按视角自动创建"
                    />
                  </label>
                  <div v-if="!step.config.diaryBookId" class="pc-form-grid">
                    <label class="pc-field-group">
                      <span>{{ t`视角角色` }}</span>
                      <input
                        v-model="step.config.diaryPerspectiveName"
                        class="pc-field"
                        type="text"
                        :placeholder="t`默认当前角色`"
                      />
                    </label>
                    <label class="pc-field-group">
                      <span>{{ t`书架名称` }}</span>
                      <input
                        v-model="step.config.diaryBookTitle"
                        class="pc-field"
                        type="text"
                        :placeholder="t`可留空`"
                      />
                    </label>
                  </div>
                  <label class="pc-field-group">
                    <span>{{ t`发生时间` }}</span>
                    <input
                      v-model="step.config.diaryOccurredAt"
                      class="pc-field"
                      type="text"
                      :placeholder="t`可由模型判断`"
                    />
                  </label>
                </div>

                <div v-else-if="step.appId === 'extras'" class="pc-step-config">
                  <label class="pc-field-group">
                    <span>{{ t`目标番外` }}</span>
                    <SearchableCombobox
                      v-model="step.config.extrasBookId"
                      input-label="选择目标番外"
                      :options="
                        resourceOptions(extrasBooks, step.config.extrasBookId, '工作台自动生成', book => book.title)
                      "
                      placeholder="工作台自动生成"
                    />
                  </label>
                  <div class="pc-form-grid">
                    <label class="pc-field-group">
                      <span>{{ t`生成模式` }}</span>
                      <select v-model="step.config.extrasChapterMode" class="pc-select">
                        <option value="续写上一章">{{ t`续写上一章` }}</option>
                        <option value="新开一本书">{{ t`新开一本书` }}</option>
                        <option value="重写当前章节">{{ t`重写末章` }}</option>
                      </select>
                    </label>
                    <label class="pc-field-group">
                      <span>{{ t`番外类型` }}</span>
                      <SearchableCombobox
                        :model-value="step.config.extrasTypeId"
                        input-label="选择番外类型"
                        :options="
                          resourceOptions(
                            extrasTypePrompts,
                            step.config.extrasTypeId,
                            '自定义或跟随番外',
                            prompt => prompt.name,
                          )
                        "
                        placeholder="自定义或跟随番外"
                        @update:model-value="
                          step.config.extrasTypeId = $event;
                          applyExtrasTypeDefaults(step);
                        "
                      />
                    </label>
                  </div>
                  <input
                    v-if="!step.config.extrasTypeId"
                    v-model="step.config.extrasTypeName"
                    class="pc-field"
                    type="text"
                    :placeholder="t`自定义番外类型，可留空`"
                  />
                </div>

                <div v-else-if="step.appId === 'forum'" class="pc-step-config">
                  <label class="pc-field-group">
                    <span>{{ t`目标板块` }}</span>
                    <SearchableCombobox
                      v-model="step.config.forumBoardId"
                      input-label="选择目标板块"
                      :options="
                        resourceOptions(forumBoards, step.config.forumBoardId, '按名称创建或复用', board => board.name)
                      "
                      placeholder="按名称创建或复用"
                    />
                  </label>
                  <template v-if="!step.config.forumBoardId">
                    <input
                      v-model="step.config.forumBoardName"
                      class="pc-field"
                      type="text"
                      :placeholder="t`板块名称`"
                    />
                    <label class="pc-field-group">
                      <span>{{ t`板块类型` }}</span>
                      <SearchableCombobox
                        :model-value="step.config.forumBoardTypeId"
                        input-label="选择板块类型"
                        :options="
                          resourceOptions(
                            forumBoardTypePrompts,
                            step.config.forumBoardTypeId,
                            '自定义类型',
                            prompt => prompt.name,
                          )
                        "
                        placeholder="自定义类型"
                        @update:model-value="
                          step.config.forumBoardTypeId = $event;
                          applyForumTypeDefaults(step);
                        "
                      />
                    </label>
                    <textarea
                      v-model="step.config.forumBoardTypePrompt"
                      class="pc-area compact"
                      :placeholder="t`板块类型提示词，可编辑`"
                    ></textarea>
                  </template>
                </div>

                <div v-else-if="step.appId === 'theater'" class="pc-step-config">
                  <div class="pc-form-grid">
                    <label class="pc-field-group">
                      <span>{{ t`小剧场类型` }}</span>
                      <SearchableCombobox
                        :model-value="step.config.theaterTypeId"
                        input-label="选择小剧场类型"
                        :options="theaterTypeOptions(step.config.theaterTypeId)"
                        placeholder="自定义类型"
                        @update:model-value="
                          step.config.theaterTypeId = $event;
                          applyTheaterTypeDefaults(step);
                        "
                      />
                    </label>
                  </div>
                  <input
                    v-if="!step.config.theaterTypeId"
                    v-model="step.config.theaterTypeName"
                    class="pc-field"
                    type="text"
                    :placeholder="t`自定义类型名称`"
                  />
                  <input
                    v-model="step.config.theaterParticipants"
                    class="pc-field"
                    type="text"
                    :placeholder="t`参与角色，用逗号分隔`"
                  />
                </div>

                <div v-else-if="step.appId === 'letters'" class="pc-step-config">
                  <label class="pc-field-group">
                    <span>{{ t`目标书信分册` }}</span>
                    <SearchableCombobox
                      v-model="step.config.letterBookId"
                      input-label="选择目标书信分册"
                      :options="
                        resourceOptions(letterBooks, step.config.letterBookId, '按双方自动创建', book => book.title)
                      "
                      placeholder="按双方自动创建"
                    />
                  </label>
                  <div class="pc-form-grid">
                    <label class="pc-field-group">
                      <span>{{ t`发信人` }}</span>
                      <input
                        v-model="step.config.letterSenderName"
                        class="pc-field"
                        type="text"
                        :placeholder="t`默认当前角色`"
                      />
                    </label>
                    <label class="pc-field-group">
                      <span>{{ t`收信人` }}</span>
                      <input
                        v-model="step.config.letterReceiverName"
                        class="pc-field"
                        type="text"
                        :placeholder="t`默认用户`"
                      />
                    </label>
                    <label class="pc-field-group">
                      <span>{{ t`信件格式` }}</span>
                      <select v-model="step.config.letterFormat" class="pc-select">
                        <option value="formal">{{ t`正式信件` }}</option>
                        <option value="sms">{{ t`短信` }}</option>
                        <option value="email">{{ t`邮件` }}</option>
                        <option value="note">{{ t`便签` }}</option>
                      </select>
                    </label>
                    <label class="pc-field-group">
                      <span>{{ t`附带最近书信` }}</span>
                      <input
                        v-model.number="step.config.letterRecentCount"
                        class="pc-field"
                        min="0"
                        max="20"
                        type="number"
                      />
                    </label>
                  </div>
                </div>

                <div v-else-if="step.appId === 'relationship'" class="pc-step-config">
                  <input
                    v-model="step.config.relationshipCharacterNames"
                    class="pc-field"
                    type="text"
                    :placeholder="t`重点人物，可留空并使用关系网现有人物`"
                  />
                </div>

                <div v-else-if="step.appId === 'profiles'" class="pc-step-config">
                  <div class="pc-form-grid">
                    <label class="pc-field-group">
                      <span>{{ t`资料映射` }}</span>
                      <SearchableCombobox
                        v-model="step.config.profileMappingId"
                        input-label="选择外部资料映射"
                        :options="
                          resourceOptions(
                            profileMappings,
                            step.config.profileMappingId,
                            '请选择外部资料映射',
                            mapping => `${mapping.name} · ${mapping.tableName}`,
                          )
                        "
                        placeholder="请选择外部资料映射"
                      />
                    </label>
                    <label class="pc-field-group">
                      <span>{{ t`对象名称` }}</span>
                      <input
                        v-model="step.config.profileTitleHint"
                        class="pc-field"
                        type="text"
                        :placeholder="t`可留空`"
                      />
                    </label>
                  </div>
                  <div
                    v-if="!step.config.profileMappingId && step.config.profileTableId"
                    class="pc-status-card warning"
                  >
                    <strong>{{ t`旧资料目标待重新选择` }}</strong>
                    <p>{{ t`旧目标信息会保留，但不会自动猜成外部资料映射。` }}</p>
                  </div>
                </div>

                <textarea
                  class="pc-area compact"
                  :placeholder="t`本步骤追加要求，可留空`"
                  :value="step.userRequirement"
                  @input="
                    workbench.updateStep(workflow.id, step.id, {
                      userRequirement: ($event.target as HTMLTextAreaElement).value,
                    })
                  "
                ></textarea>
                <label v-if="workflow.insertAfterRun" class="pc-switch-row">
                  <input v-model="step.includeInInsert" type="checkbox" />
                  <span>{{ t`加入待插入草稿` }}</span>
                </label>
                <textarea
                  v-if="workflow.insertAfterRun && step.includeInInsert"
                  class="pc-area compact"
                  :placeholder="t`步骤插入模板，可用 {{content}} 和 {{title}}`"
                  :value="step.formatTemplate"
                  @input="
                    workbench.updateStep(workflow.id, step.id, {
                      formatTemplate: ($event.target as HTMLTextAreaElement).value,
                    })
                  "
                ></textarea>
              </div>
            </article>
          </div>

          <div class="pc-form-actions pc-workbench-actions pc-workflow-actions">
            <button class="pc-soft-btn" type="button" @click="markCheckpoint(workflow.id)">
              <i class="fa-solid fa-flag-checkered"></i>
              <span>{{ t`重置计数` }}</span>
            </button>
            <button class="pc-soft-btn danger" type="button" @click="deleteWorkflow(workflow.id)">
              <i class="fa-solid fa-trash"></i>
              <span>{{ t`删除` }}</span>
            </button>
            <button class="pc-primary-btn" type="button" :disabled="workbench.isRunning" @click="runWorkflow(workflow)">
              <i class="fa-solid fa-play"></i>
              <span>{{ t`运行` }}</span>
            </button>
          </div>
        </div>
      </article>

      <article class="pc-page-section pc-log-card">
        <div class="pc-log-head">
          <button class="pc-log-toggle" type="button" @click="logsOpen = !logsOpen">
            <span>
              <strong>{{ t`运行日志` }}</strong>
              <small>{{ logs.length }} {{ t`条` }}</small>
            </span>
            <i :class="logsOpen ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
          </button>
          <button
            class="pc-soft-btn danger compact"
            type="button"
            :disabled="!logs.length || workbench.isRunning"
            @click="clearRunLogs"
          >
            {{ t`清空` }}
          </button>
        </div>
        <div v-if="logsOpen" class="pc-log-list">
          <EmptyState v-if="!logs.length" compact :title="t`暂无运行记录`" />
          <article v-for="log in logs" :key="log.id" :class="['pc-log-row', log.status]">
            <strong>{{ log.workflowName }}</strong>
            <p>{{ log.message }}</p>
          </article>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import ConfigurationRecoveryNotice from '@/components/ConfigurationRecoveryNotice.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { useExternalProfileMappingsStore } from '@/apps/profiles/profileMappings';
import { usePhoneStore } from '@/store/phone';
import { useGenerationTaskStore } from '@/store/generationTasks';
import { useSummaryStore } from '@/store/summary';
import { useDiaryStore } from '@/store/diary';
import { useExtrasStore } from '@/store/extras';
import { useForumStore } from '@/store/forum';
import { useLettersStore } from '@/store/letters';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import { usePluginPresetStore } from '@/store/pluginPresets';
import { getWorkbenchManualRunNotice, runWorkbenchWorkflow, supportedWorkbenchActions } from './runner';
import {
  captureCurrentWorkbenchCheckpoint,
  useWorkbenchStore,
  type WorkbenchInsertDraft,
  type WorkbenchStep,
  type WorkbenchWorkflow,
} from './store';
import { applyChatInsert, formatChatInsertTemplate } from '@/util/chatInsert';
import { getPresetNamesSafe, onTavernEvent } from '@/util/runtime';
import { storeToRefs } from 'pinia';
import { buildPluginPresetSelectionOptions, pluginPresetIdFromSelection } from '@/apps/preset-manager/pluginPreset';

const workbench = useWorkbenchStore();
const phone = usePhoneStore();
const generationTasks = useGenerationTaskStore();
const settingsStore = useSettingsStore();
const pluginPresets = usePluginPresetStore();
const { configError, insertDrafts, logs, rawConfig, workflows } = storeToRefs(workbench);
const { settings } = storeToRefs(settingsStore);
const { items: pluginPresetItems } = storeToRefs(pluginPresets);
const { books: summaryBooks } = storeToRefs(useSummaryStore());
const { books: diaryBooks } = storeToRefs(useDiaryStore());
const { books: extrasBooks } = storeToRefs(useExtrasStore());
const { boards: forumBoards } = storeToRefs(useForumStore());
const { books: letterBooks } = storeToRefs(useLettersStore());
const { mappings: profileMappings } = storeToRefs(useExternalProfileMappingsStore());
const promptStore = usePromptStore();
const { typePromptGroups, typePrompts } = storeToRefs(promptStore);
const extrasTypePrompts = computed(() => typePrompts.value.filter(prompt => prompt.domain === 'extras'));
const forumBoardTypePrompts = computed(() => typePrompts.value.filter(prompt => prompt.domain === 'forum-board'));
const theaterTypePrompts = computed(() => typePrompts.value.filter(prompt => prompt.domain === 'theater'));
const workbenchActionOptions = computed(() =>
  supportedWorkbenchActions.map(action => ({
    label: action.label,
    value: `${action.appId}/${action.actionId}`,
  })),
);
const openWorkflowIds = ref<string[]>([]);
const selectedActions = reactive<Record<string, string>>({});
const customTriggerWorkflowIds = ref<string[]>([]);
const collapsedStepIds = ref<string[]>([]);
const insertDraftsOpen = ref(true);
const logsOpen = ref(true);
const tavernPresetNames = ref<string[]>([]);
const statusRevision = ref(0);
const statusEventStops = ['CHAT_CHANGED', 'GENERATION_ENDED', 'MESSAGE_RECEIVED', 'MESSAGE_SWIPED'].map(eventName =>
  onTavernEvent(eventName, () => {
    statusRevision.value += 1;
  }),
);
const currentAiReplyCount = computed(() => {
  void statusRevision.value;
  return captureCurrentWorkbenchCheckpoint().lastAiReplyCount;
});

function resourceOptions<T extends { id: string }>(
  resources: T[],
  selected: string,
  emptyLabel: string,
  getLabel: (resource: T) => string,
) {
  const options = resources.map(resource => ({ label: getLabel(resource), value: resource.id }));
  if (selected && !options.some(option => option.value === selected)) {
    options.unshift({ label: '当前已选项已失效', value: selected });
  }
  return [{ label: emptyLabel, value: '' }, ...options];
}

function theaterTypeOptions(selected: string) {
  const options = theaterTypePrompts.value.map(prompt => ({
    group: typePromptGroups.value.find(group => group.id === prompt.groupId)?.name || '未分组',
    label: prompt.name,
    value: prompt.id,
  }));
  if (selected && !options.some(option => option.value === selected)) {
    options.unshift({ group: '状态', label: '当前已选项已失效', value: selected });
  }
  return [{ group: '范围', label: '自定义类型', value: '' }, ...options];
}

async function resetCorruptedSettings() {
  if (
    !(await phone.confirmNotice('要重置工作台配置吗？这会替换无法读取的原始数据。', {
      confirmLabel: '重置',
      kind: 'warning',
    }))
  )
    return;
  workbench.resetCorruptedSettings();
  toastr.success('已重置工作台配置');
}

function isWorkflowOpen(workflowId: string) {
  return openWorkflowIds.value.includes(workflowId);
}

function toggleWorkflow(workflowId: string) {
  openWorkflowIds.value = isWorkflowOpen(workflowId)
    ? openWorkflowIds.value.filter(id => id !== workflowId)
    : [...openWorkflowIds.value, workflowId];
}

function isStepOpen(stepId: string) {
  return !collapsedStepIds.value.includes(stepId);
}

function toggleStep(stepId: string) {
  collapsedStepIds.value = isStepOpen(stepId)
    ? [...collapsedStepIds.value, stepId]
    : collapsedStepIds.value.filter(id => id !== stepId);
}

function applyTheaterTypeDefaults(step: WorkbenchStep) {
  const typePrompt = step.config.theaterTypeId ? promptStore.getTypePrompt(step.config.theaterTypeId) : null;
  if (!typePrompt) {
    step.config.theaterTypePrompt = '';
    return;
  }
  step.config.theaterTypeName = typePrompt.name;
  step.config.theaterTypePrompt = typePrompt.prompt;
}

function applyExtrasTypeDefaults(step: WorkbenchStep) {
  const typePrompt = step.config.extrasTypeId ? promptStore.getTypePrompt(step.config.extrasTypeId) : null;
  if (!typePrompt) {
    step.config.extrasTypePrompt = '';
    return;
  }
  step.config.extrasTypeName = typePrompt.name;
  step.config.extrasTypePrompt = typePrompt.prompt;
}

function applyForumTypeDefaults(step: WorkbenchStep) {
  const typePrompt = step.config.forumBoardTypeId ? promptStore.getTypePrompt(step.config.forumBoardTypeId) : null;
  if (!typePrompt) {
    step.config.forumBoardTypeName = '';
    step.config.forumBoardTypePrompt = '';
    return;
  }
  step.config.forumBoardTypeName = typePrompt.name;
  step.config.forumBoardTypePrompt = typePrompt.prompt;
}

function createWorkflow() {
  const workflow = workbench.createWorkflow();
  openWorkflowIds.value = [workflow.id, ...openWorkflowIds.value];
  selectedActions[workflow.id] = '';
}

function updateWorkflowName(workflowId: string, name: string) {
  workbench.updateWorkflow(workflowId, { name });
}

function updateTrigger(workflowId: string, value: string) {
  workbench.updateWorkflow(workflowId, { triggerAiReplies: Number(value) || 1 });
}

function getTriggerMode(workflow: WorkbenchWorkflow) {
  if (customTriggerWorkflowIds.value.includes(workflow.id)) return 'custom';
  return [1, 3, 5].includes(workflow.triggerAiReplies) ? String(workflow.triggerAiReplies) : 'custom';
}

function updateTriggerMode(workflow: WorkbenchWorkflow, value: string) {
  if (value === 'custom') {
    customTriggerWorkflowIds.value = [...new Set([...customTriggerWorkflowIds.value, workflow.id])];
    return;
  }
  customTriggerWorkflowIds.value = customTriggerWorkflowIds.value.filter(id => id !== workflow.id);
  updateTrigger(workflow.id, value);
}

function updateDelay(workflowId: string, value: string) {
  workbench.updateWorkflow(workflowId, { delayAiReplies: Number(value) || 0 });
}

function getWorkflowProviderValue(workflow: WorkbenchWorkflow) {
  if (workflow.apiMode === 'tavern') return 'tavern';
  if (workflow.apiMode === 'external') return `external:${workflow.externalProfileId}`;
  return '';
}

function updateWorkflowProvider(workflowId: string, value: string) {
  if (value === 'tavern') {
    workbench.updateWorkflow(workflowId, {
      apiMode: 'tavern',
      externalProfileId: '',
    });
    return;
  }
  if (value.startsWith('external:')) {
    workbench.updateWorkflow(workflowId, {
      apiMode: 'external',
      externalProfileId: value.slice('external:'.length),
    });
    return;
  }
  workbench.updateWorkflow(workflowId, {
    apiMode: 'inherit',
    externalProfileId: '',
  });
}

function externalProfileOptions(selected: string) {
  const profiles = settings.value.textProvider.externalProfiles;
  const hasSelected = selected && profiles.some(profile => profile.id === selected);
  return [
    { label: '请选择外部 API 配置', value: '' },
    ...(selected && !hasSelected ? [{ label: '连接配置已失效', value: selected }] : []),
    ...profiles.map(profile => ({ label: profile.name, value: profile.id })),
  ];
}

function tavernPresetOptions(selected: string) {
  const names = new Set(tavernPresetNames.value);
  if (selected && !pluginPresetIdFromSelection(selected)) names.add(selected);
  return [
    { label: '跟随全局生成预设', value: '' },
    ...buildPluginPresetSelectionOptions(pluginPresetItems.value, selected),
    ...[...names].filter(Boolean).map(name => ({ group: '酒馆预设', label: name, value: name })),
  ];
}

function workflowProviderOptions(workflow: WorkbenchWorkflow) {
  const selected = getWorkflowProviderValue(workflow);
  const externalProfileId = workflow.externalProfileId;
  const profiles = settings.value.textProvider.externalProfiles;
  const hasSelectedProfile = externalProfileId && profiles.some(profile => profile.id === externalProfileId);
  return [
    { label: '跟随全局 API', value: '' },
    { label: '酒馆当前 API', value: 'tavern' },
    ...(selected.startsWith('external:') && !hasSelectedProfile
      ? [{ label: '外部 API 配置已失效', value: selected }]
      : []),
    ...profiles.map(profile => ({ group: '外部 API', label: profile.name, value: `external:${profile.id}` })),
  ];
}

function refreshTavernPresetNames() {
  const names = getPresetNamesSafe();
  workflows.value.forEach(workflow => {
    if (
      workflow.tavernPresetName &&
      !pluginPresetIdFromSelection(workflow.tavernPresetName) &&
      !names.includes(workflow.tavernPresetName)
    ) {
      names.push(workflow.tavernPresetName);
    }
    workflow.steps.forEach(step => {
      if (
        step.tavernPresetName &&
        !pluginPresetIdFromSelection(step.tavernPresetName) &&
        !names.includes(step.tavernPresetName)
      )
        names.push(step.tavernPresetName);
    });
  });
  tavernPresetNames.value = names;
}

function addStep(workflowId: string) {
  const value = selectedActions[workflowId] || '';
  const [appId, actionId] = value.split('/');
  if (!appId || !actionId) {
    toastr.warning('请先选择生成步骤');
    return;
  }
  const step = workbench.addStep(workflowId, { actionId, appId });
  collapsedStepIds.value = collapsedStepIds.value.filter(id => id !== step?.id);
  selectedActions[workflowId] = '';
}

async function deleteWorkflow(workflowId: string) {
  const workflow = workbench.getWorkflow(workflowId);
  if (!workflow) return;
  const shouldDelete = await phone.confirmNotice(`要删除工作流“${workflow.name}”吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!shouldDelete) return;
  const generationTask = generationTasks.getWorkbenchTask(workflowId);
  if (generationTask) generationTasks.removeTask(generationTask.id);
  workbench.deleteWorkflow(workflowId);
  openWorkflowIds.value = openWorkflowIds.value.filter(id => id !== workflowId);
}

function markCheckpoint(workflowId: string) {
  const generationTask = generationTasks.getWorkbenchTask(workflowId);
  if (generationTask) generationTasks.removeTask(generationTask.id);
  workbench.markCurrentCheckpoint(workflowId);
  toastr.success('已从当前 AI 回复数开始计数');
}

async function runWorkflow(workflow: WorkbenchWorkflow) {
  const notice = getWorkbenchManualRunNotice(workflow);
  if (notice) {
    const shouldRun = await phone.confirmNotice(notice, {
      cancelLabel: '取消',
      confirmLabel: '继续生成',
      kind: 'warning',
      title: '批量处理已有剧情？',
    });
    if (!shouldRun) return;
  }
  await runWorkbenchWorkflow(workflow);
}

async function clearRunLogs() {
  if (!logs.value.length || workbench.isRunning) return;
  const shouldClear = await phone.confirmNotice('要清空所有工作台运行日志吗？', {
    confirmLabel: '清空',
    kind: 'warning',
  });
  if (!shouldClear) return;
  workbench.clearLogs();
  toastr.success('已清空运行日志');
}

async function removeStep(workflowId: string, stepId: string) {
  const workflow = workbench.getWorkflow(workflowId);
  const step = workflow?.steps.find(item => item.id === stepId);
  if (!workflow || !step) return;
  const confirmed = await phone.confirmNotice(
    `要从工作流“${workflow.name}”中删除步骤“${getActionLabel(step.appId, step.actionId)}”吗？`,
    { confirmLabel: '删除', kind: 'warning', title: '删除工作流步骤？' },
  );
  if (!confirmed) return;
  workbench.deleteStep(workflowId, stepId);
}

async function discardInsertDraft(draftId: string) {
  const draft = insertDrafts.value.find(item => item.id === draftId);
  if (!draft) return;
  const confirmed = await phone.confirmNotice(`要丢弃“${draft.workflowName}”生成的待插入内容吗？`, {
    confirmLabel: '丢弃',
    kind: 'warning',
    title: '丢弃待插入草稿？',
  });
  if (!confirmed) return;
  workbench.deleteInsertDraft(draftId);
}

function previewInsertDraft(draft: WorkbenchInsertDraft) {
  return formatChatInsertTemplate(draft.template, {
    content: draft.content,
    title: draft.workflowName,
  });
}

async function confirmInsertDraft(draft: WorkbenchInsertDraft) {
  const preview = previewInsertDraft(draft);
  if (!preview.trim()) {
    toastr.warning('待插入内容为空');
    return;
  }
  const shouldInsert = await phone.confirmNotice(`确认把“${draft.workflowName}”插入当前聊天末尾吗？`, {
    confirmLabel: '插入',
    kind: 'warning',
  });
  if (!shouldInsert) return;
  try {
    await applyChatInsert({
      content: draft.content,
      hidden: false,
      mode: 'new-end',
      role: 'assistant',
      template: draft.template,
      title: draft.workflowName,
    });
    workbench.deleteInsertDraft(draft.id);
    toastr.success('已插入聊天末尾');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '插入失败');
  }
}

function getActionLabel(appId: string, actionId: string) {
  return (
    supportedWorkbenchActions.find(action => action.appId === appId && action.actionId === actionId)?.label ||
    `${appId}/${actionId}`
  );
}

function getWorkflowStatus(workflow: WorkbenchWorkflow) {
  void statusRevision.value;
  const progress = workbench.getWorkflowProgress(workflow, phone.currentTavernScopeKey);
  if (progress.pending) return '有暂停任务，等待继续';
  const delayLabel = workflow.delayAiReplies ? ` · 延后 ${workflow.delayAiReplies} 层` : '';
  return `已累计 ${progress.accumulatedAiReplies}/${workflow.triggerAiReplies} · 还差 ${progress.nextInAiReplies} 层${delayLabel}`;
}

function getWorkflowLastStatus(workflow: WorkbenchWorkflow) {
  void statusRevision.value;
  const progress = workbench.getWorkflowProgress(workflow, phone.currentTavernScopeKey);
  const latestLog = logs.value.find(
    log => log.workflowId === workflow.id && log.scopeKey === phone.currentTavernScopeKey,
  );
  if (latestLog?.status === 'failed') return `上次失败 · ${latestLog.message}`;
  if (latestLog?.status === 'paused') return `上次暂停 · ${latestLog.message}`;
  if (!progress.lastRunAt) return '从当前聊天位置开始计数';
  return `上次成功 ${new Date(progress.lastRunAt).toLocaleString()}`;
}

onMounted(refreshTavernPresetNames);
onBeforeUnmount(() => statusEventStops.forEach(stop => stop.stop()));
</script>

<style scoped>
.pc-workbench-app,
.pc-workbench-page {
  min-height: 100%;
}

.pc-workbench-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pc-workflow-card,
.pc-log-card {
  overflow: hidden;
  padding-inline: 0;
}

.pc-workflow-title,
.pc-log-toggle {
  width: 100%;
  min-height: 58px;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 0 10px;
  text-align: left;
}

.pc-log-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

.pc-log-head .pc-log-toggle {
  min-width: 0;
}

.pc-workflow-title span,
.pc-log-toggle span {
  min-width: 0;
}

.pc-workflow-title strong,
.pc-workflow-title small,
.pc-log-toggle strong,
.pc-log-toggle small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-workflow-title small,
.pc-log-toggle small,
.pc-log-row small {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-workflow-body,
.pc-log-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
}

.pc-form-grid,
.pc-step-picker {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
}

.pc-inline-fields,
.pc-workflow-api-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}

.pc-compact-number {
  width: 78px;
}

.pc-step-picker {
  grid-template-columns: minmax(0, 1fr) auto;
}

.pc-field-group span {
  display: block;
  margin-bottom: 8px;
}

.pc-switch-row,
.pc-step-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pc-switch-row,
.pc-step-enable {
  color: var(--pc-text);
  font-weight: 700;
}

.pc-step-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pc-step-body {
  display: grid;
  gap: 10px;
}

.pc-step-card,
.pc-log-row,
.pc-insert-draft-row {
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
  padding: 12px;
}

.pc-log-row {
  border-width: 0 0 1px;
  border-radius: 0;
  background: transparent;
}

.pc-step-config {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}

.pc-step-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 6px;
}

.pc-step-actions .pc-icon-btn {
  width: 34px;
  height: 34px;
}

.pc-insert-draft-row {
  display: grid;
  gap: 10px;
}

.pc-insert-draft-row pre {
  max-height: 220px;
  overflow: auto;
  border: 1px solid var(--pc-border);
  border-radius: 14px;
  background: var(--pc-surface);
  color: var(--pc-text);
  margin: 0;
  padding: 10px 12px;
  white-space: pre-wrap;
  word-break: break-word;
}

.pc-step-head {
  justify-content: space-between;
}

.pc-step-enable {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.pc-step-enable strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-workbench-actions {
  justify-content: flex-end;
}

.pc-workflow-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.pc-workflow-actions > button {
  width: 100%;
  min-width: 0;
  gap: 5px;
  padding-inline: 6px;
  font-size: 13px;
  white-space: nowrap;
}

.pc-log-row p {
  margin: 6px 0;
  color: var(--pc-text);
  line-height: 1.45;
  white-space: pre-wrap;
}

.pc-log-row.success {
  border: 1px solid color-mix(in srgb, var(--pc-theme-accent) 34%, transparent 66%);
}

.pc-log-row.failed {
  border: 1px solid color-mix(in srgb, var(--pc-danger) 34%, transparent 66%);
}

.pc-log-row.paused {
  border: 1px solid color-mix(in srgb, var(--pc-muted) 38%, transparent 62%);
}

@media (max-width: 420px) {
  .pc-form-grid {
    grid-template-columns: 1fr;
  }

  .pc-workbench-actions {
    justify-content: stretch;
  }
}
</style>
