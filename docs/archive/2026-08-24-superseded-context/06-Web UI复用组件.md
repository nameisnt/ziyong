# Web UI 复用组件

本文档只记录组件用途和接口。UI 设计取舍、代码复用现状、问题优先级与验收要求统一以 `07-当前代码与UI复用审计及设计要求.md`
为准。

当前 UI 复用分两层：基础业务组件和生成流程组合组件。新增 App 优先复用这些组件，只有业务形态明显不同才单独实现。

## 生成流程组件

### GenerationPanel

位置：`src/components/GenerationPanel.vue`

用途：生成页通用表单，封装了常见创作 App 的生成前配置。

包含能力：

- 来源楼层选择：`GenerationSourceFields`
- 引用内容选择：`ReferencePicker`
- 追加要求输入
- 酒馆最终提示词捕获：`TavernPromptCapture`
- 错误展示
- 取消、停止、开始生成按钮
- 实时输出/原始输出展示

基础用法：

```vue
<GenerationPanel
  :capture="capturePrompt"
  :capture-reset-key="promptPreview"
  :error="generationState.error"
  :from-start-end="draft.fromStartEnd"
  :range-text="draft.rangeText"
  :raw-output="generationState.rawOutput"
  :recent-count="draft.recentCount"
  :references="selectedReferences"
  :running="generationState.running"
  :single-message-id="draft.singleMessageId"
  :source-mode="settings.generation.sourceMode"
  :user-requirement="draft.userRequirement"
  @cancel="phone.goBack()"
  @generate="runGeneration"
  @stop="stopGeneration"
  @update:from-start-end="draft.fromStartEnd = $event"
  @update:range-text="draft.rangeText = $event"
  @update:recent-count="draft.recentCount = $event"
  @update:references="selectedReferences = $event"
  @update:single-message-id="draft.singleMessageId = $event"
  @update:source-mode="settings.generation.sourceMode = $event"
  @update:user-requirement="draft.userRequirement = $event"
/>
```

扩展插槽：

- `before-fields`：放在来源楼层之前。
- `after-references`：放在引用选择之后。
- `after-requirement`：放在追加要求之后。

适合放入插槽的内容包括：角色选择、类型提示词选择、目标板块选择、渲染模式选择等。

### GenerationPreviewPanel

位置：`src/components/GenerationPreviewPanel.vue`

用途：生成结果预览通用面板。

包含能力：

- 来源标签、标题、文本通道摘要
- Markdown 渲染正文
- 八股扫描：`BaguScanPanel`
- 解析 warning 展示
- 原始输出展示
- 返回调整、保存按钮

基础用法：

```vue
<GenerationPreviewPanel
  :content="generationState.preview.content"
  :raw="generationState.preview.raw"
  save-label="保存为条目"
  :source-label="generationState.preview.source.label"
  :text-provider-summary="textProviderSummary"
  :title="generationState.preview.title"
  :warnings="generationState.preview.warnings"
  @back="returnToGenerate"
  @save="savePreview"
  @update:content="generationState.preview.content = $event"
/>
```

如果某个 App 不需要八股扫描，可以传 `:scan-enabled="false"`。

## 基础业务组件

### BookShelf

位置：`src/components/BookShelf.vue`

用途：书架/分册入口。适合总结集、日记本、番外书本、书信分册等集合型首页。

输入：

- `books`
- `createLabel`
- `createSubtitle`
- `showCreate`
- `variant`

事件：

- `create`
- `select(id)`

### CatalogModal

位置：`src/components/CatalogModal.vue`

用途：详情页目录跳转弹窗。

输入：

- `open`
- `items`
- `activeId`
- `title`

事件：

- `close`
- `select(id)`

### GenerationSourceFields

位置：`src/components/GenerationSourceFields.vue`

用途：选择生成来源楼层模式。通常不需要直接使用，优先用 `GenerationPanel`。如果 App 有高度定制的生成页，可以单独复用。

### ReferencePicker

位置：`src/components/ReferencePicker.vue`

用途：选择其他 App 提供的引用内容。数据来自注册表的 `referenceProvider`。

### TavernPromptCapture

位置：`src/components/TavernPromptCapture.vue`

用途：捕获酒馆最终提示词。通常由 `GenerationPanel` 间接使用。

### BaguScanPanel

位置：`src/components/BaguScanPanel.vue`

用途：扫描和替换生成结果中的常见生成腔表达。通常由 `GenerationPreviewPanel` 间接使用。

### FrontendFrame

位置：`src/components/FrontendFrame.vue`

用途：渲染 HTML/前端片段。小剧场的网页渲染模式正在使用它。需要展示模型生成的 HTML 内容时可以复用。

### DetailFooter

位置：`src/components/DetailFooter.vue`

用途：详情阅读页底部导航。适合日记、书信、番外章节、总结、小剧场、阅读聊天这类“上一篇/目录/置顶/置底/下一篇”结构。

输入：

- `previousDisabled`
- `nextDisabled`
- `previousLabel`
- `nextLabel`
- `catalogLabel`
- `topLabel`
- `bottomLabel`
- `actionsClass`

事件：

- `previous`
- `next`
- `catalog`
- `top`
- `bottom`

插槽：

- `actions`：放置收藏、编辑、删除、续写、回信等当前 App 专属动作。

基础用法：

```vue
<DetailFooter
  :previous-disabled="!previousEntryId"
  :next-disabled="!nextEntryId"
  @previous="openEntry(previousEntryId)"
  @next="openEntry(nextEntryId)"
  @catalog="showCatalogModal = true"
  @top="scrollToTop"
  @bottom="scrollToBottom"
>
  <template #actions>
    <button class="pc-soft-btn" type="button" @click="openEditEntry">
      <i class="fa-solid fa-pen"></i>
    </button>
  </template>
</DetailFooter>
```

配套逻辑优先使用 `src/util/detailScroll.ts` 的 `useDetailScroll`，不要在各 App 里重复写滚动目标查找。

### FailedDraftList

位置：`src/components/FailedDraftList.vue`

用途：统一展示 XML/解析失败草稿列表。适合所有接入 `FailedGenerationDraft` 的生成型 App。

输入：

- `drafts`
- `formatTime`
- `getTitle`
- `getContext`
- `title`
- `showHeader`
- `deleteTitle`
- `emptyWarning`

事件：

- `open(draftId)`
- `remove(draftId)`

基础用法：

```vue
<FailedDraftList
  :drafts="failedDrafts"
  :format-time="formatTime"
  :get-title="draft => (draft.actionId === 'generate-thread' ? '未解析帖子' : '未解析回复')"
  :get-context="draft => failedDraftContextLabel(draft.context)"
  @open="openFailedDraft"
  @remove="removeFailedDraft"
/>
```

组件只负责列表外观和打开/删除事件，不负责重新解析、保存或草稿修复逻辑。

### EmptyState

位置：`src/components/EmptyState.vue`

用途：统一普通空状态和小型空状态。普通模式用于列表、面板、统计区为空；`compact`
模式用于折叠区、内嵌列表、提示词分组等小占位。

输入：

- `title`
- `compact`

基础用法：

```vue
<EmptyState v-if="!items.length" title="还没有内容" />
<EmptyState v-if="!group.items.length" compact title="这个分组还没有条目。" />
```

八股 App 的 `pc-empty-row` 是规则表内部行提示，不属于卡片式空状态，暂时保留专用样式。

### ArchiveContextBar

位置：`src/components/ArchiveContextBar.vue`

用途：聊天档案详情页的快速导航条。只在“查看某个聊天内容详情”时显示，不在聊天记录列表页显示。

输入：

- `ownerName`
- `chatTitle`
- `current`

事件：

- `jump-chat`：跳转到酒馆内对应聊天。
- `open-home`：回到手机首页查看当前选择的聊天内容。
- `back-current`：回到酒馆当前聊天。

说明：该组件必须保持为独立 SFC。不要再用 `defineComponent + h()` 内联实现，否则父组件的 scoped
CSS 无法稳定作用到按钮内部节点。

## 样式约定

全局样式在 `src/global.css` 中提供部分通用类：

- `pc-soft-btn`
- `pc-primary-btn`
- `pc-icon-btn`
- `pc-top-btn`
- `pc-detail-nav`
- `pc-detail-actions`
- `pc-rendered-markdown`

许多页面级样式目前仍在各 App 的 scoped CSS 中。新增 App 可以复用通用组件减少重复；如果需要大量新页面，建议继续抽：

- `EditorCard`
- `EntryRow`
- `StatCard`
- `TypePromptPicker`
- `AppSection`

## 当前接入状态

已接入：

- `GenerationPanel`
- `GenerationPreviewPanel`
- `DetailFooter`
- `FailedDraftList`
- `EmptyState`
- `ArchiveContextBar`

当前接入页面：

- `SummaryApp`
- `LettersApp`
- `TheaterApp`
- `ExtrasApp`
- `ForumApp`
- `DiaryApp`
- `ReaderApp`
- `ChatArchiveApp`
- `PromptsApp`
- `StatsApp`
- `SettingsApp`

番外迁移时保留了“只生成大纲”模式，生成页可选择大纲，预览页会显示“保存大纲”。论坛迁移时保留了帖子预览、回复树和主楼八股扫描，预览正文区域通过
`GenerationPreviewPanel` 的 `content`
插槽承载。日记迁移时复用了普通日记生成、阅读反应生成和预览面板；批量生成仍保留专用面板，因为它包含分组、进度和停止状态。聊天档案导航条已抽成独立组件，避免 scoped
CSS 穿透问题导致按钮退回浏览器默认风格。
