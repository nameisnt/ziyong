# CODEMAP

本文件描述当前真实代码结构和主要数据流，面向后续开发快速定位。它来自当前源码扫描，不从 archive 旧方案推断。

## 入口与挂载

- `src/index.ts`：扩展入口，设置 build marker，安装原生应急入口，调用 `initPanel()`。
- `src/panel.ts`：薄入口，只调用 `initPhoneLifecycle()`。
- `src/core/phoneLifecycle.ts`：创建或复用 DOM root，注册 App，创建 Vue + Pinia，挂载 `App.vue`，安装 workbench auto
  runner 和 native launcher。
- `src/App.vue`：把设置面板 Teleport 到 `#extensions_settings2`，把菜单入口 Teleport 到 `#extensionsMenu` 下的
  `#pc_reader_wand_container`，把 `PhoneOverlay` 和 `FloatingBall`
  Teleport 到 body；监听聊天切换、聊天改名、楼层备份和生成可见性恢复。
- `src/components/PhoneOverlay.vue`：手机壳、顶栏、通知、路由组件渲染、主题变量、字体、纸张纹理、窗口位置和 App KeepAlive。
- `src/store/phone.ts`：手机打开/关闭、路由栈、返回保护、预览离开确认、通知、当前酒馆 scope、查看 scope 与 scope
  switch。

## App 注册

- `src/core/appRegistry.ts`：`PhoneAppModule`
  类型和注册表；提供 App、组件、备份域、生成动作、提示词、引用、收藏、统计、内容转换、恢复项等聚合查询。
- `src/data/apps.ts`：先注册 `BUILTIN_PHONE_APP_MODULES`，再自动加载 `src/apps/*/index.ts`；最后执行教程目录校验。
- `src/apps/builtin.ts`：显式组合核心内置 App：`summary`、`diary`、`extras`、`forum`、`theater`、`letters`、`workbench`、`favorites`、`prompts`、`stats`、`archive`、`reader`、`recovery`、`bagu`、`settings`。
- `src/apps/*/index.ts`：独立 App 注册入口，例如
  `app-builder`、`card-writer`、`entry-library`、`macro-builder`、`preset-link`、`preset-manager`、`profiles`、`recovery`、`world-slots`、`worldbook-link`
  等。
- `src/core/appLayout.ts`：默认首页文件夹、Dock、排序、文件夹 token、旧小游戏布局迁移和 layout normalization。

## 目录结构

- `src/apps/<domain>/`：业务 App 根组件、专属页面、域内 store/generation/api/composable。
- `src/components/`：跨业务共享 UI、手机壳内部组件、生成/阅读/详情/引用/迁移/弹层控件。
- `src/components/home/`：`PhoneHome` 的已拆分内部模块，包括活动页、只读布局投影和顶部上下文条。
- `src/store/`：跨域 Pinia store 和共享持久化 store。
- `src/core/`：注册、生命周期、生成服务、布局、运行器和跨域核心服务。
- `src/util/`：SillyTavern 运行时包装、备份/迁移、生成辅助、阅读解析、聊天作用域、内容转换等共享工具。
- `src/type/`：Zod schema 和共享类型。
- `src/testing/visual/` 与 `scripts/unit/`：视觉场景、运行夹具和契约测试。
- `dist/`：正式扩展构建产物。

## 状态与持久化

- 全局设置读取/写入 `extension_settings`，字段定义分散在各 store 或类型文件中。
- 聊天作用域数据通过 `src/store/chatScoped.ts` 的 `useChatScopedDomain` 管理，持久化结构为
  `__chatScoped + legacyScopeMigrations + scopes`。
- 当前 scope key 来自 SillyTavern 当前角色/群组和聊天 id，格式近似 `char:<owner>:chat:<chat>` 或
  `group:<owner>:chat:<chat>`。
- 切换聊天时，`phone.syncCurrentTavernScope()` 和各 App 的 `scopeSwitchHandler` 负责切换 store 数据。
- 配置校验失败时，`useChatScopedDomain` 保留 `configError` 与 `rawConfig`，避免错误数据被静默覆盖。
- `src/apps/status-display/store.ts` 在全局设置中保存状态方案和 `activeSchemeByScope`；`status-display` 与
  `status-display-settings` 共享该 store，聊天只保存方案选择关系，不保存渲染结果。

## 生成数据流

1. App 注册 `generationProvider`，每个 action 返回一个 `GenerationAdapter`。
2. UI 页面收集 config、来源楼层、引用、生成默认值和 text provider，调用 `generateContent()`
   或相关 preview/capture 方法。
3. `generationService` 校验当前查看作用域必须是酒馆当前聊天。
4. `adapter.configSchema` 校验 config。
5. `buildSourceSelection()` 读取可见聊天楼层，生成来源 selection。
6. `adapter.buildRequest()` 生成 App 上下文、任务、提示词、类型提示词、用户要求和输出格式。
7. `usePromptStore()` 套用任务模板，`generationAliases` 替换当前聊天称呼。
8. 根据设置选择酒馆通道或外部 OpenAI-compatible API；可选插件预设会构建 ordered prompts。
9. 统一处理 generation id、abort controller、流式输出、RPM 限速、重试和生成事件识别。
10. `generationService` 临时注册 `phoneUserInput`、动作变量和 `src/util/pluginMacros.ts`
    的插件私有随机宏；任务结束统一注销。
11. 输出先规范化，再按设置清理思维链，保留 original output 与 reasoning。
12. `adapter.parse()` 解析结构化结果；失败则创建 failed draft。
13. resultMode 为 `save` 时调用 `adapter.save()`；保存失败且 adapter 要求保留时也进入 failed draft。
14. 成功结果保存 hidden generation record、replay snapshot、source selection、raw output semantics。

`src/store/generationTasks.ts` 持久化任务运行记录；`GenerationTaskCenter.vue` 固定显示当前聊天任务并横向滚动。批量清理只删除已完成且没有失败草稿的通知记录，业务保存内容和 `src/store/previewDrafts.ts` 中的预览不受影响。

## 备份、恢复与迁移

- `src/util/backup.ts`：完整备份、当前聊天备份、导入计划、导入执行、生成内容清空。
- `src/type/backup.ts`：备份 schema。完整备份 v1 是设置与域，v2 加插件预设，v3 加首页图标，v4 加聊天楼层备份与关联世界书；当前聊天备份是独立
  `backupKind: current-chat`。
- `src/apps/builtinBackup.ts`：核心内容域和生成任务/预览草稿/称呼替换的备份域工厂。
- `PhoneBackupDomain`：每个域声明 key、scope、category、schemaVersion、schema、export/import、migrate 和 rehydrate。
- 完整导入通过 `executeBackupImportTransaction()`
  同步 settings、domains 和 rehydrate；插件预设、首页图标、聊天楼层备份和世界书由 `executeBackupResourceTransaction()`
  协调替换与回滚。
- `src/util/contentTransfer.ts`：按备份域导出/导入内容，支持 copy/merge/replace，并按 chat/global scope 处理。
- `src/util/itemTransfer.ts` 与
  `src/item-transfer/providers.ts`：单条内容迁移，支持 copy/replace、schema 版本、预览冲突和失败回滚。
- `src/util/chatFloorBackup.ts`：用 IndexedDB 保存当前聊天楼层备份，支持单份导出、删除、身份校验、恢复到当前聊天，以及完整备份资源替换。
- `src/store/fileRepository.ts`：插件文件仓库自动快照与恢复，属于本地版本保护流。

## 共享能力聚合

- 收藏：各 App 的 `favoriteProvider` 汇入 `getRegisteredPhoneFavoriteItems()`，由 Favorites App 展示。
- 引用：各 App 的 `referenceProvider` 汇入引用树；若没有显式 content source，可从引用树展平成内容转换来源。
- 统计：各 App 的 `contentStatsProvider` 汇入统计 store。
- 内容转换：`contentSourceProvider` 提供来源，`contentReceiver` 接收转换结果。
- 恢复项：`generationRecoveryProvider` 提供失败草稿等待处理项，首页活动页聚合展示。
- 提示词：普通、特殊、任务模板和类型提示词由注册表聚合给提示词系统。

## 当前专项流程

- 预设：`src/apps/preset-manager/`
  管理酒馆/插件预设及预设共享阅读规则，目录将当前酒馆预设置顶，并在 App 会话内按预设保留详情分组状态；`src/apps/preset-link/`
  保存聊天 scope 绑定并在聊天切换时应用酒馆预设。
- 批量目录：`BulkSelectionBar.vue`、`BulkSelectionCheckbox.vue` 和 `useBulkSelection.ts`
  提供共享选择状态，业务 App 仍用各自 store 执行实际级联删除。
- 世界书：`src/apps/worldbook-link/`
  读取和编辑真实世界书，现代接口与旧格式接口都写回名称、正文、激活策略和插入位置；目录管理支持批量复制为 Theater 类型提示词，副本编辑保留源配置；`src/apps/world-slots/`
  管理当前聊天槽位并同步固定世界书。
- 正则：`src/apps/regex-display/store.ts` 保存分组、全局执行顺序、规则和各消费目标的绑定；`RegexDisplayApp.vue`
  只提供分组目录、触摸/鼠标拖拽和弹窗编辑预览。Reader、Preset Manager、Status Display
  Settings 等消费界面直接读写各自绑定。
- 工作台：`src/apps/workbench/runner.ts`
  监听生成与聊天事件；聊天切换采用“等待宿主加载 → 核对切换序号 → 同步当前 scope 基线 → 检查到期工作流”的流程。`store.ts`
  保存每个工作流的 scope checkpoint、暂停运行和日志，界面实时投影累计层数与下一次触发。
- 外部资料：`src/apps/profiles/externalBridge.ts` 从 `AutoCardUpdaterAPI` 读取真实表结构；`externalCrud.ts`
  按表键和行号直接增删改，`ProfilesApp.vue`
  按真实列展示横向或竖向资料卡片和详情，显示偏好由全局 settings 持久化。`profileReferences.ts`、`ExternalProfileReferencePicker.vue`
  和 `externalReferenceCatalog.ts` 以 `sheetKey + rowIndex`
  传递引用；`generation.ts`、内容转换、卡片写作和工作台在各自写入界面选择目标表与真实列名。系统不存在资料映射 store 或中间行模型，时间确认只维护插件内人物与日历。
- 备份查重：`src/apps/recovery/model.ts` 生成完全相同、严格续长和 90% 相似分组，`store.ts`
  在删除前重新下载复核，`RecoveryMaintenanceFlow.vue` 管理选择和确认。
- 前端网页：`src/util/theaterFrontend.ts`
  清理 HTML、保留完整页面或片段中的 head/style，并构造 iframe 文档；`FrontendFrame.vue` 根据子文档回报高度调整容器。
- 状态栏：`src/apps/status-display/StatusDisplayApp.vue`
  是纯展示入口，读取当前聊天绑定并在聊天事件后刷新；`StatusDisplaySettingsApp.vue` 由
  `src/apps/status-display-settings/index.ts`
  注册为独立设置 App，负责方案绑定、增删改复制、正则配置、MVU 编辑预览和备份。正则链为“可见 AI 原文倒序扫描 → 方案提取规则 → 方案显示规则 →
  safe iframe”；MVU 链为“`Mvu.getMvuData()` → `stat_data` → `{{mvu:路径}}` 模板替换 → `FrontendFrame`
  在用户脚本前转发酒馆助手宿主接口 → 仅状态栏启用的同源 trusted iframe”。
- 中文转换：`src/util/chineseConversion.ts` 动态加载与酒馆助手繁简脚本相同的转换核心，详情壳统一提供转换操作。
- 插件宏：`src/apps/macro-builder/` 生成参数化宏；`src/util/pluginMacros.ts`
  保留普通 Unicode 文本，仅转义宏参数分隔符和换行，并用 `URLSearchParams` 同时解析新旧宏；`generationService`
  只在手机生成期间注册。
- 助手脚本：`src/apps/script-manager/`
  读取三类 TavernHelper 脚本树，展平根脚本与文件夹脚本；导出读取当前脚本树，删除按作用域调用 `updateScriptTreesWith()`
  并保留文件夹节点。
- 扩展迁移：`src/apps/extension-transfer/` 调用 SillyTavern
  `/api/extensions/discover`、`/version`、`/install`；导入清单先经 Zod 解析并进入预览，安装范围逐项选择，结果留在页面并由用户决定是否刷新。

## UI 与主题

- `src/global.css` 定义全局 `pc-*` 控件、卡片、表单、阅读、生成和详情基础样式。
- `PhoneOverlay.vue` 的 `.pc-screen`
  统一提供普通 App 页面外边距；业务 App 根页面只负责布局，状态栏展示页通过专用零边距屏幕承载网页。
- `PhoneOverlay.vue` 根据 settings 注入主题 CSS 变量、字体、阅读器尺寸、内置纸张纹理和 App 图标样式。
- `src/data/paperTextures.ts` 注册 A4 白纸、宣纸、羊皮纸和黑色卡纸纹理；`src/apps/theme/themeCatalog.ts` 独占主题预设、主题包、字体、图标、颜色和圆角静态目录。
- `src/core/appLayout.ts` 维护首页八个默认分组、独立聊天档案和四项 Dock，并将旧默认布局迁移到 layout v3；用户自建文件夹继续保留。
- `ReaderDetailShell.vue` 固定显示详情上下文栏，`VersionNavigator.vue` 在栏内切换版本；可拖动工具菜单只承载正文操作，底部 `DetailFooter` 负责上条/目录/下条和置顶置底。
- `src/apps/settings/*` 使用可横向滚动的平面分类栏和纸面列表，管理界面尺寸与图标密度、阅读、生成连接、数据管理和高级设置；界面页不再暴露旧分页主页的行数/每页容量。
- 共享组件包括
  `GenerationPanel`、`GenerationPreviewPanel`、`BatchGenerationPreviewPage`、`ReferencePicker`、`BaguScanPanel`、`ReaderDetailShell`、`BulkSelectionBar`、`DetailFooter`、`EmptyState`、`ActionMenu`
  等。

## 测试与构建

- `pnpm verify:static`：ESLint baseline、typecheck、unit tests、backup/config/recovery/structure contracts、style
  guard、严格 UI 复用。
- `pnpm build:check`：构建到 `tmp/build-check`，用于验证不改正式 dist。
- `pnpm verify:ui`：三尺寸交互和外观视觉检查。
- `pnpm verify:full`：静态、临时构建、三尺寸完整视觉。
- `pnpm build`：正式生成 `dist/index.js`、`dist/index.css`，属于发布产物更新。

## 当前文档归档

- 旧根层文档和执行记录已移动到 `docs/archive/2026-08-24-superseded-context/`。
- 既有 `docs/archive/` 中更早的方案和历史记录继续保留为 archive。
- archive 可以用于追溯事实来源，但后续施工不得直接执行其中的“下一步”“待办”“当前方案”等文字。
