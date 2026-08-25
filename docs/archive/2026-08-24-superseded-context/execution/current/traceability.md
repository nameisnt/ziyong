# 当前需求追踪

更新时间：2026-08-24

| 当前要求 | 缺陷/批次 | 权威证据 | 状态 |
| --- | --- | --- | --- |
| 冻结累计成果并建立检查点 | REPO00、REPO01、REPOCHECKPOINT01 | `dbb4bca`、431/431、155 文件 dry-run | 已完成 |
| 参考资料退出发布树且本地保留 | D-REPO-TRACK-001、D-REPO-TRACK-002 / REPO02、REPO02B | index tracked 0、暂存删除 161；本地 1830 文件、100450225 bytes、缺失/差异 0；显式 DryRun 通过 | 当前工作树已完成；远端等待独立发布授权 |
| 当前执行状态与历史证据分离 | D-REPO-DOC-HOT-001 / REPO03 | `current/`、历史切片、旧入口跳转、结构/链接契约 5/5、434/434 | 已完成 |
| 允许发布已授权删除但禁止重新加入本地资料 | D-REPO-PUBLISH-003 / REPO04A | 显式参数、六项隔离 Git 状态、教程、440/440；默认推送不会承载 ignored 路径删除 | 能力已完成；真实退出跟踪转 REPO02B |
| 修复本地领先且有后续改动时的一键推送 | D-REPO-PUBLISH-004 / REPO04B、REPOPOST01 | `05f1869` 的父提交为 `dbb4bca`，本地与 `origin/main` 均为 `05f1869`；隔离 14/14、静态 455/455 | 已完成 |
| 完成结构整理、构建和候选复核 | REPO05—REPO08 | 方案 15 验收表 | 待执行 |
| 拆分视觉工具且场景语义不变 | D-REPO-VISUAL-001 / REPO05A—REPO05B | harness 6045→5684；结构与直接消费者验证、完整视觉和静态门禁通过 | 已完成 |
| 恢复论坛预览视觉契约 | D-REPO-VISUAL-002 / REPO05C | 标签契约 3/3；`forum-preview` 三尺寸 3/3；静态 445/445；350x700 全目录 303/303 越过原失败点 | 已完成 |
| 补齐当前视觉目录的基线登记 | D-REPO-VISUAL-003 / REPO05D | 候选与正式基线 303/909；新增 19、退役 4、既有 findings 变化 0；视觉 909/909、外观 15/15、计数契约 4/4、静态 445/445 | 已完成 |
| 统一业务 App 文件归属 | REPO06-DISC / REPO06A—REPO06F | 书信、日记、总结、小剧场、论坛与番外已归入各自 `src/apps/` 单域目录；最新番外 33/33、三尺寸 45/45、静态 451/451 | 传统生成内容域已完成 |

## REPO06 App 所有权清单

| 注册 ID | 根组件与专属页面 | store | generation / transfer | 测试与视觉 | 迁移判断 |
| --- | --- | --- | --- | --- | --- |
| `summary` | `apps/summary/SummaryApp.vue`；同目录 15 个专属文件 | `store/summary.ts` | `builtinGeneration`；`summaryItemTransferProvider` | 24/24；13 个域场景 + 根入口三尺寸 42/42 | **REPO06C 已完成** |
| `diary` | `apps/diary/DiaryApp.vue`；同目录 11 个专属文件 | `store/diary.ts` | `builtinGeneration`；`diaryItemTransferProvider` | 24/24；11 个域场景 + 根入口三尺寸 36/36 | **REPO06B 已完成** |
| `extras` | `apps/extras/ExtrasApp.vue`；同目录 18 个专属文件 | `store/extras.ts` | `builtinGeneration`；`extrasItemTransferProvider` | 33/33；14 个域场景 + 根入口三尺寸 45/45 | **REPO06F 已完成** |
| `forum` | `apps/forum/ForumApp.vue`；同目录 15 个专属文件 | `store/forum.ts` | `builtinGeneration`；`forumItemTransferProvider` | 30/30；15 个域场景 + 根入口三尺寸 48/48 | **REPO06E 已完成** |
| `theater` | `apps/theater/TheaterApp.vue`；同目录 6 个专属文件 | `store/theater.ts`、`generationAliases.ts` | `builtinGeneration`；`theaterItemTransferProvider` | 41/41；13 个域场景 + 根入口三尺寸 42/42；外观 3/3 | **REPO06D 已完成** |
| `letters` | `LettersApp.vue`；`components/letters/**` 9 个专属页面 | `store/letters.ts` | `builtinGeneration`；`lettersItemTransferProvider` | 书信路径与生命周期契约；9 个域场景 + 根入口 | **REPO06A 样板** |
| `archive` | `apps/archive/ChatArchiveApp.vue`；同目录 3 个专属文件 | 无专属 store；消费 phone/generationTasks | 不适用；自身备份导入导出流程 | 10/10；3 个域场景 + 根入口三尺寸 12/12 | **REPO06J 已完成** |
| `bagu` | `apps/bagu/BaguApp.vue`；详情/扫描/命中弹窗继续为多域共享 | `store/bagu.ts` | 不适用 | 4/4；4 个共享扫描场景 + 根入口三尺寸 15/15 | **REPO06I 已完成** |
| `favorites` | `apps/favorites/FavoritesApp.vue`；无专属页面 | `store/favorites.ts` | 不适用；通过 App Registry 聚合既有收藏提供者 | 14/14；根入口三尺寸 3/3 | **REPO06G 已完成** |
| `stats` | `apps/stats/StatsApp.vue`；无专属页面 | `store/stats.ts` | `builtinStats`；通过 App Registry 聚合各业务域统计 | 2/2；根入口三尺寸 3/3 | **REPO06H 已完成** |
| `settings` | `apps/settings/SettingsApp.vue`；同目录 6 个专属面板 | `store/settings.ts`、`phone.ts` | generation/transfer 不适用；注册两项备份域 | 21/21；12 个域/共享场景 + 根入口三尺寸 39/39；外观 3/3 | **REPO06M 已完成** |
| `reader` | `apps/reader/ReaderApp.vue`；同目录 2 个专属会话；共享阅读组件留在 `components/` | `store/reader.ts` | content source / favorite；transfer 不适用 | 22/22；9 个域/共享场景 + 根入口三尺寸 30/30；外观 3/3 | **REPO06L 已完成** |
| `prompts` | `apps/prompts/PromptsApp.vue`；同目录 8 个专属文件；共享字段留在 `components/prompts/` | `store/prompts.ts` | 提示词注册体系；item transfer 不适用 | 28/28；15 个域场景 + 根入口三尺寸 48/48 | **REPO06K 已完成** |

## REPO06J-DISC 四个核心 App 审计

| App | 当前专属范围 | 跨域/运行时边界 | 现有证据 | 判断 |
| --- | --- | --- | --- | --- |
| `archive` | 根组件 877 行；3 个专属文件，共 1576 行 | 专属子文件没有域外生产消费者；根组件直接使用酒馆跳转、改名、scope 迁移和生成任务 store | 6 个静态测试文件；3 个域场景 + 根入口；范围内 HEAD diff 0 | **REPO06J 首选**：只搬目录和路径，运行时语义冻结 |
| `prompts` | 根组件 + 9 个文件，共 2508 行 | 8 个文件无域外生产消费者；`TheaterTypeGroupField.vue` 同时被 TheaterApp 消费；提示词 store 是多生成域共享配置 | 13 个静态测试文件；15 个域场景 + 根入口；范围内 HEAD diff 0 | **REPO06K 候选**：迁移根组件与 8 个专属文件，共享字段留原位 |
| `reader` | 根组件 + 2 个专属会话，共 1677 行 | 三个文件无域外消费者；根组件直接读取酒馆角色/历史聊天；ReaderDetailShell 等共享组件有 2—13 个多域消费者 | 6 个静态测试文件；9 个域/共享场景 + 根入口；范围内 HEAD diff 0 | **REPO06L 候选**：只迁移三个专属文件，共享阅读壳原位保留 |
| `settings` | `apps/settings/` 根组件 + 6 个专属面板，共 1960 行 | 7 个文件无域外生产消费者；数据管理页执行完整/范围恢复，高级页执行快照、重置、持久化和补偿事务 | 21/21；12 个域/共享场景 + 根入口三尺寸 39/39；外观 3/3；静态 459/459 | **REPO06M 已完成**：副作用调用链原位冻结 |

REPO06J 候选契约：只把 `ChatArchiveApp.vue` 与 `components/archive/**` 3 个专属文件迁入 `src/apps/archive/`，同步 `apps/builtin.ts`、内部 import 与测试静态路径；不修改组件正文、酒馆跳转/改名、scope 迁移、备份读写、generationTasks/phone store、schema、公共 API、真实聊天、dist 或 Git 发布状态。验收覆盖 6 个既有静态测试文件、根入口与 3 个 archive 场景三尺寸 12/12，以及完整静态门禁。

REPO06J 已按该契约完成：4 个文件归入 `src/apps/archive/`，旧生产路径消费者为 0；根组件与聊天列表除 import 路径外内容一致，楼层备份页和目录会话 blob 完全不变。新增目录所有权契约后 archive 定向 10/10，根入口与 3 个域场景三尺寸 12/12，完整静态 456/456，ESLint 警告仍为既有 3/3。未修改运行时操作、store、schema、公共 API、真实聊天、dist 或 Git 发布状态。

REPO06K-DISC 只读发现确认：`PromptsApp.vue` 与 `components/prompts/**` 当前相对 HEAD diff 为 0；除 `TheaterTypeGroupField.vue` 外，其余 8 个子文件没有域外生产消费者。共享字段同时由 `PromptTypeEditorPage.vue` 和 `apps/theater/TheaterApp.vue` 使用，必须继续留在共享 `components/prompts/`，不得为了目录整齐复制、转发或改写第二套实现。

REPO06K 候选契约：只把 `PromptsApp.vue` 与上述 8 个专属文件迁入 `src/apps/prompts/`，同步 `apps/builtin.ts`、根组件内部 import、结构检查、UI 基线静态路径和既有测试路径；`TheaterTypeGroupField.vue` 及 TheaterApp import 保持原位。冻结 prompts store、提示词正文与默认值、任务变量、分组/导入导出行为、modal 生命周期、schema、公共 API、UI、真实数据、dist 与 Git 发布状态。验收覆盖既有提示词定向契约、根入口与 15 个场景三尺寸 48/48、完整静态门禁。

REPO06K 已按契约完成：Prompts 根组件与 8 个专属文件归入 `src/apps/prompts/`，旧专属生产路径消费者为 0；根组件除 8 条域内 import 路径外内容一致，8 个子文件 blob 变化 0。共享 `TheaterTypeGroupField.vue` blob 不变，仍只由 PromptTypeEditor 与 TheaterApp 两处生产代码消费。提示词定向 28/28、根入口与 15 个场景三尺寸 48/48、完整静态 457/457；未修改 store、提示词内容、schema、公共 API、UI、真实数据、dist 或 Git 发布状态。

REPO06L-DISC 只读发现确认：`ReaderApp.vue`、`components/reader/useReaderChatSession.ts` 与 `useReaderTextEditSession.ts` 当前相对 HEAD diff 为 0，生产侧根组件只由 `apps/builtin.ts` 注册，两个会话只由根组件消费。ReaderDetailShell 有 13 个生产消费者，CatalogModal 有 7 个，BaguScanPanel 有 4 个，ReaderTextEditModal 也被共享详情壳消费；这些都必须继续留在共享 `components/`。

REPO06L 候选契约：只把 Reader 根组件与两个专属会话迁入 `src/apps/reader/`，同步 `apps/builtin.ts`、两个域内 import、ESLint 既有警告基线路径和 6 个静态测试路径；不移动或改写 ReaderDetailShell、ReaderTextEditModal、ReaderContent、CatalogModal、BaguScanPanel、SearchableCombobox。冻结酒馆角色/历史聊天读取、楼层正文写回、swipe 与思维链显示、正则应用、reader/phone/settings store、世界书/预设联动、schema、公共 API、UI、真实聊天、dist 与 Git 发布状态。验收覆盖既有 reader 定向契约、根入口与 9 个场景三尺寸 30/30、完整静态门禁；既有 ESLint 警告数量必须仍为 3/3。

REPO06L 已按契约完成：Reader 根组件与两个专属会话归入 `src/apps/reader/`，旧生产路径消费者为 0；根组件除两个域内 import 路径外内容一致，两个会话 blob 变化 0。ReaderDetailShell、ReaderTextEditModal、ReaderContent、CatalogModal、BaguScanPanel、SearchableCombobox 均无变化。Reader 定向 22/22、根入口与 9 个场景三尺寸 30/30、外观证据 3/3、完整静态 458/458；ESLint 仅同步警告路径，仍为既有 3/3。未修改运行时读取/写回、store、schema、公共 API、UI、真实聊天、dist 或 Git 发布状态。

REPO06M-DISC 只读发现确认：`SettingsApp.vue` 与 `components/settings/` 6 个面板当前相对 HEAD diff 为 0；生产侧根组件只由 `apps/builtin.ts` 注册，6 个面板只由根组件消费。数据管理页直接调用完整备份、聊天范围导入和多 store rehydrate；高级页直接调用共享重置事务、`extension_settings` 快照、持久化与反向补偿。相关共享注册表、backup util、reset transaction、store 和外部接口均不得随目录迁移改写。

REPO06M 候选契约：只把 Settings 根组件与 6 个专属面板迁入 `src/apps/settings/`，同步 `apps/builtin.ts`、根组件 6 条相对 import、备份/结构检查、UI 基线与既有测试静态路径。冻结完整/范围备份恢复、重置事务、外部资源操作、连接配置、壁纸/字体、reader/phone/settings/prompts/recovery 等 store、schema、公共 API、UI、真实数据、外部 API、dist 与 Git 发布状态。验收必须覆盖 settings 定向契约以及备份/配置/恢复结构门禁，根入口与 12 个 settings/主题场景三尺寸 39/39，完整静态门禁；所有副作用只用现有 fixture/mock，不操作真实酒馆设置或文件。

REPO06M 已按契约完成：Settings 根组件与 6 个专属面板归入 `src/apps/settings/`，旧生产路径消费者为 0；6 个面板内容与迁移前一致，根组件只改变 6 条面板相对 import。新增目录契约明确 `backup.ts` 与 `settingsResetTransaction.ts` 继续属于共享层。Settings 及相关备份/恢复定向 21/21，备份、配置恢复、聊天恢复与结构门禁通过，根入口与 12 个场景三尺寸 39/39，外观证据 3/3，完整静态 459/459。未修改备份/恢复/重置行为、store、schema、公共 API、UI、真实数据、外部 API、dist 或 Git 发布状态。

REPO07-DISC 只读审计确认：`src/components/` 当前剩余 47 个文件。45 个存在生产消费者，其中包括跨业务 UI、生成/阅读共享壳，以及由 PhoneOverlay、ReaderDetailShell 等核心壳唯一消费但仍有明确传递职责的内部组件；这些继续留在共享层。只有 `ProfileEntryPicker.vue` 与 `ReasoningModal.vue` 的生产消费者为 0。前者已被显式外部资料映射选择器替代，后者已被 `ReasoningDisclosure` 替代；旧声明和静态测试继续读取死文件，因此分别登记 D-REPO-COMPONENT-001/002，等待 REPO07O 删除授权。

REPO07A 候选契约：只从 1696 行 `PhoneHome.vue` 提取第一页活动模块。新模块拥有 `activityItems`、异步 recovery provider 聚合、竞态序号、generationTasks/previewDrafts 监听和活动列表渲染；根组件保留 homePageIndex、页面滑动、来源路由及最终打开动作，通过单向事件连接，不复制状态。允许修改 `PhoneHome.vue`、新增一个 `components/home/` 活动页文件、同步 `home-activity-page-contract` 与必要目录契约。排除桌面/Dock 拖拽、文件夹创建/编辑/解散、网格打包、分页语义、store/schema/公共 API/UI、真实数据、外部 API、dist 与 Git。验收覆盖全部 home 定向契约，`home`、`home-five-columns`、`home-layout-drag`、`home-layout-drag-dark`、`home-tasks`、`home-tasks-dark` 三尺寸 18/18，以及完整静态门禁。

REPO07O 已按授权完成：删除 `ProfileEntryPicker.vue`、`ReasoningModal.vue` 和只检查旧资料选择器的专属测试；从共享 reader 图标、简单弹窗和 modal 外观契约中移除死组件条目并同步消费者计数；自动组件声明删除两项旧入口。新增所有权守卫要求两个旧文件保持不存在，同时固定 `ReasoningDisclosure` 的三个共享消费者和 `ExternalProfileReferencePicker` 的两个业务消费者。定向 23/23，思维链、关系网和剧情线替代入口三尺寸 15/15，完整静态 459/459。未修改产品 UI、资料/思维链语义、store、schema、公共 API、真实数据、外部 API、dist 或 Git 发布状态。

REPO07A 已按契约完成：新增 `components/home/HomeActivityPage.vue`，组件在未显示时仍保持挂载，独占 `activityItems`、recovery provider 异步聚合、请求序号竞态保护及 generationTasks/previewDrafts 监听；显示时渲染原 GenerationTaskCenter 与待处理列表，并以单向 `open` 事件交回目标。PhoneHome 继续独占 homePageIndex、滑动、来源记录和最终路由打开，五项活动状态/依赖在根组件中的命中均为 0。原三组活动样式数值原样迁移到子组件。PhoneHome 1696→1640 行，活动页 75 行。Home 定向 22/22，六个首页场景三尺寸 18/18，外观证据 6/6，完整静态 460/460。未修改拖拽、文件夹、Dock、分页/路由语义、UI、store、schema、公共 API、真实数据、外部 API、dist 或 Git 发布状态。

REPO07B-DISC 只读审计确认：剩余职责不能整体再拆。桌面/Dock 拖拽同时依赖 DOM 命中、长按和跨页计时器、点击抑制、分页和 `settingsStore.setHomeLayout`；文件夹弹层与内部拖拽共享 `resetHomeInteractionState`、当前页插入位置和同一布局事务；聊天上下文刷新横跨 phone、settings、prompts、bagu、recovery、reader、generationTasks、stats 及酒馆跳转。强行提取任一项都会形成大参数袋、重复状态或跨模块可写协调器。

REPO07B 候选契约：只新增内部 `components/home/useHomeLayoutProjection.ts`，接收根组件持有的 `homePageIndex` 与 `activeHomeFolderId` 引用，独占 `HomeDisplayItem`/`HomeGridDisplayItem` 类型、布局规范化、已注册 App 映射、桌面/Dock 项、网格打包页、当前页、当前页起点/末项、当前文件夹与成员、建夹候选及文件夹成员切片等纯只读投影。`PhoneHome` 继续独占两个输入引用及其赋值、页面切换、全部 pointer/DOM/计时器状态、点击抑制、布局写入、文件夹创建/改名/图标/移出/解散、modal 生命周期、来源路由、聊天刷新和酒馆跳转；`appLayout.ts`、`homeGridLayout.ts` 不改。允许修改 `PhoneHome.vue`、新增该 composable、同步/新增首页结构契约和执行文档。冻结 UI/CSS、store、schema、公共 API、产品行为、真实数据、外部 API、dist 与 Git。验收要求根组件不保留第二套投影，全量 home 定向契约，六个首页场景三尺寸 18/18、外观 6/6、完整静态门禁；若需要改变 store/API 或拖拽、文件夹、分页语义则立即停止。

REPO07B 已按契约完成：新增 109 行 `useHomeLayoutProjection.ts`，只读消费既有 settings store，并独占布局规范化、App 映射、桌面/Dock 项、网格页、当前页位置、文件夹与成员投影；PhoneHome 只传入仍由自己持有和赋值的 `homePageIndex`、`activeHomeFolderId`，不传整份父状态。根组件中 `homeLayout`、`phoneAppById`、`gridItems`、`dockItems`、`homePages`、`currentHomePageItems`、`activeHomeFolder` 和 `resolveHomeDisplayItem` 的定义命中均为 0；全部 pointer/DOM/计时器、点击抑制、`settingsStore.setHomeLayout`、文件夹事务、路由与聊天刷新继续留在根组件。`appLayout.ts`、`homeGridLayout.ts`、模板和 CSS 未改。

首页定向契约由 22 增至 25 项并全部通过，新增所有权守卫明确投影不得调用布局写入、PointerEvent、document、计时器或路由；六个首页场景在 350x700、390x844、430x900 下 18/18，外观证据 6/6；完整静态 463/463，临时生产构建 899 modules 通过。`dist` 变化 0，HEAD 与 `origin/main` 仍为 `05f1869`。未修改 UI、拖拽/分页/文件夹语义、store、schema、公共 API、真实数据、外部 API、dist 或 Git 发布状态。

REPO07C-DISC 只读审计确认：桌面/Dock 拖拽仍同时依赖 `homeGridEl`/`homeDockEl`、长按/悬停/跨页三个计时器、分页、点击抑制、布局事务和 notice；文件夹创建、内部拖拽、移出及解散继续共享 `resetHomeInteractionState`、当前页插入位置、modal 生命周期和相同布局写入。二者若此时拆分会形成大参数袋或跨模块可写协调器，因此继续冻结。

顶部聊天状态条形成独立边界。候选 `HomeContextBar.vue` 可原样拥有当前 `.pc-home-context` DOM 与专属样式、`ActionMenu`、`refreshingPhoneData`、`isViewingCurrentChat`/`viewingScopeMeta` 展示、回到当前聊天、历史聊天 `jumpToTavernChat`，以及 settings/prompts/bagu/recovery/reader/generationTasks/registered backup handlers/stats 的既有刷新序列。它只接收 `isOrganizing`，只发出 `toggle-organizing`、`open-folder-creator`、`refreshed` 三个单向事件；父级继续拥有整理状态、建夹弹层和 `refreshHomeArchiveDomains`，因此内容角标刷新语义保持原样。

REPO07C 候选契约：允许修改 `PhoneHome.vue`，新增 `components/home/HomeContextBar.vue`，同步首页状态条、PhoneHome 所有权与必要目录契约及执行文档。状态条模板和 CSS 数值必须逐项原样迁移；刷新 store 顺序、运行任务禁用、requestAnimationFrame、rehydrate handlers、`stats.refresh`、nextTick、成功/失败 notice、酒馆跳转参数、关闭手机和延时同步均不得改变。禁止修改拖拽、分页、文件夹事务、archive 角标算法、store、schema、公共 API、真实数据、外部 API 实现、dist 与 Git。验证只用现有 fixture/mock，不触发真实刷新或酒馆跳转；覆盖全部 home 定向契约、六个首页场景三尺寸 18/18、外观 6/6、完整静态与临时生产构建。若需要增加回退、改变副作用顺序或传递更多可写父状态则停止。

REPO07C 已按契约完成：新增 154 行 `HomeContextBar.vue`，原样拥有 `.pc-home-context` DOM、ActionMenu 和全部专属 CSS；状态条直接读取 phone store，只接收 `isOrganizing`，向父级发出 `toggle-organizing`、`open-folder-creator`、`refreshed` 三个事件。PhoneHome 以 `refreshed` 调用既有 `refreshHomeArchiveDomains`，继续唯一拥有整理状态、建夹弹层和内容角标；未向子组件传入拖拽、文件夹或其他可写父状态。

settings、prompts、bagu、recovery、reader、generationTasks、注册 rehydrate handlers、stats 的刷新次序保持不变；运行任务禁用、requestAnimationFrame、nextTick、notice 与 finally 解锁保持不变。酒馆跳转的 chatFile/characterId/ownerName 参数、关闭手机、2400ms 后同步和 toastr 保持不变。上述依赖及两个异步函数在 PhoneHome 中定义命中为 0；`components.d.ts` 只同步新内部组件声明。

首页定向契约由 25 增至 28 项并全部通过；六个首页场景三尺寸 18/18，外观证据 6/6；完整静态 466/466，临时生产构建 902 modules 通过。PhoneHome 当前 1533 行，状态条 154 行；`dist` 变化 0，HEAD 与 `origin/main` 仍为 `05f1869`。未触发真实刷新或酒馆跳转，未修改拖拽、分页、文件夹事务、archive 角标算法、store、schema、公共 API、真实数据、外部 API 实现、dist 或 Git 发布状态。

REPO07D-DISC 只读复查确认：PhoneHome 当前剩余 `appDrag`、`folderDrag`、`homeSwipe`、两个 DOM ref、三个计时器、点击抑制、page index、整理状态、两组 modal 状态和统一 `resetHomeInteractionState`。桌面拖拽会写入文件夹目标和分页位置，文件夹事务依赖当前页插入位置并与相同重置链互锁；继续拆分只能产生跨模块可写协调器，因此 PhoneHome 在 1533 行处达到本阶段停止点，行数不再作为继续拆分理由。

重新统计核心壳：CardWriter 1900 行，Theme 1794 行，Prompts 1750 行，Reader 1528 行。CardWriter 同时拥有多阶段生成、预览草稿、世界书与外部资料写入；Prompts 仍以多域 CRUD 和 modal 状态为主；Reader 仍绑定酒馆聊天读取、正则、swipe、分支和正文写回。ThemeApp 中从主题类型、9 个主题预设/4 个主题包，到字体、图标、原生包加 3 个风格包（合计 4 个内置图标包）、颜色与圆角控制，约 500 行均为纯静态目录；ThemeApp 当前相对 HEAD diff 为 0，且这些符号只有本文件消费者，因此是下一低风险切口。

REPO07D 候选契约：新增 `src/apps/theme/themeCatalog.ts`，迁移并导出 `VisualTheme`、`RadiusKey`、`ColorKey`、`IconStyleId`、`ThemePreset`、`ThemePack`、`BuiltinIconPack` 类型，以及 `themePacks`、`fontOptions`、`iconOptions`、`iconStyleOptions`、`builtinIconPacks`、`colorControls`、`radiusControls`。`themePresets`、ID 映射和 `getThemePreset` 可作为目录内部实现，不为其他域建立公共入口。所有数组顺序、ID、名称、颜色、数值、图标映射和预览图标必须逐字等价；ThemeApp 只改 import 和删除原地定义。

REPO07D 已按登记边界完成。新增 `src/apps/theme/themeCatalog.ts`，ThemeApp 从 1794 行降至 1321 行；主题预设与包、字体与图标选项、原生加 3 个风格图标包、颜色/圆角控制和相关类型均只有目录单一所有者。`themePresets`、ID 映射和 getter 保持目录内部；运行数据 SHA-256 守卫固定全部值与数组顺序。ThemeApp 模板与 CSS 相对迁移前无差异，store、主题应用、上传删除、字体壁纸、重置和导入导出调用链均未修改。

目录所有权和值/顺序契约 3/3，Theme 图标与持久化既有契约 2/2；`app:theme`、`settings-theme-persistence`、`theme-home-icon-assets` 在 350x700、390x844、430x900 下共 9/9；完整静态 469/469，ESLint 警告仍为既有 3/3，临时生产构建 903 个模块通过。`dist`、真实数据、外部 API 和 Git 发布状态均未变化。REPO07D 到此关闭；下一步为 REPO07E-DISC 只读重新比较剩余核心壳。

REPO07E-DISC 只读比较确认：CardWriter 1900 行，但 preset、资料导入、引用和 store 已有专属模块，根组件剩余配置、阶段生成、预览草稿、世界书与外部资料写入是一条互相回写的事务；可独立的纯 helper 体积很小，不足以建立新所有权。Prompts 1750 行，已有 6 个编辑/传输页和 2 个 composable，根组件剩余目录投影、modal、选中态与 CRUD 共用 15 组 store ref；继续拆会制造大参数袋或第二套 store 消费。Reader 1528 行，已有聊天会话与文本编辑两个 session，剩余正则选择、swipe、分支、收藏、正文写回和酒馆事件为双向链。

三者均不存在 Theme 静态目录那样不含状态与副作用的大块。依据方案 07 的“明确所有权优先于减行数”规则，REPO07 不再创建生产拆分批次；CardWriter、Prompts、Reader 和 PhoneHome 的现有根协调职责保留。REPO07E-DISC 到此完成，未修改生产代码；下一步转入 REPO08 本地候选门禁，正式 `dist`、提交和推送仍分别需要授权。

REPO08 本地门禁已执行：`git diff --check` 无错误；完整静态 469/469、既有 ESLint 警告 3/3；临时生产构建 903 个模块通过。Theme 相关场景三尺寸 9/9；全局代表交互与外观门禁三尺寸 75/75，外观证据 15/15。因本轮模板与 CSS 无差异，未重复生成全目录 909 次视觉基线。

安全推送使用 `-DryRun -SkipBuild -UntrackIgnoredPath 可参考拓展` 通过，候选为 248 个文件、1696 行新增、54406 行删除；35 个未跟踪正式文件全部进入允许清单，参考资料 161 项以删除进入候选。脚本未 fetch、build、弹确认、创建提交、更新普通 index 或推送。随后复核本地参考资料仍为 1830 文件、100450225 bytes，Git 跟踪数 0、index 暂存删除 161；HEAD 与 `origin/main` 同为 `05f1869`，`dist` 差异为 0。REPO08 当前停止在正式 `dist` 构建授权点，提交与推送不随该授权开放。

REPO08-DIST 获独立授权后执行正式 `pnpm build`，903 个模块构建通过。`dist/index.js` 为 2634531 bytes，SHA-256 `F4F3F3AE67D3535DE52259A5972765C13DBED88AFAADE74B3F943D574842B93F`；`dist/index.css` 为 290500 bytes，SHA-256 `A71BDC0F5AB26F8C64F8E8599720D002D572268FEF335636823B30EE48B3CEB2`。两者分别与先前通过门禁的 `tmp/build-check` 哈希一致；构建后 `pnpm typecheck` 通过。

正式产物进入候选后，显式退出参考资料的最终 DryRun 再次通过：250 个文件、1713 行新增、54411 行删除；35 个未跟踪正式文件仍全部命中允许清单。脚本未 fetch、build、弹确认、创建提交、更新普通 index 或推送。REPO08 到此完成；当前停止在 Git 发布授权点，任何提交或推送均未执行。

允许修改 ThemeApp、新目录模块、主题目录所有权契约与执行文档。禁止修改模板、CSS、settings/phone store、主题应用/判活、图标覆盖、上传删除、颜色圆角输入、字体壁纸、重置、导入导出、schema、公共 API、真实数据、外部 API、dist 与 Git。验收要求根组件零重复目录定义，目录 ID/数量/顺序守卫，主题定向契约，`app:theme`、`settings-theme-persistence`、`theme-home-icon-assets` 三尺寸 9/9、完整静态和临时生产构建。若迁移需要改变任何目录值或主题行为则停止。

REPO06A 已按上述边界完成：9 个页面与迁移前 blob 完全一致，根组件除 9 条专属页面 import 外内容一致；旧生产路径消费者为 0。目录/生成/编辑/导入导出定向契约 24/24，根入口与 9 个域场景三尺寸 30/30，完整静态门禁 446/446。

REPO06B 只读发现确认：`diary` 根组件和 11 个专属文件当前均无未归属修改，生产侧只有 `apps/builtin.ts` 注册根组件，10 个实际页面只由根组件消费；`DiaryCreationModePage.vue` 当前无消费者，但仍按专属文件原样迁移，不删除、不接线。若获授权，本批只迁入 `src/apps/diary/` 并同步注册、根组件 import 和测试静态路径；store、generation、backup、prompt、reference、item-transfer、schema、公共 API 和产品行为全部冻结。验收为目录归属与既有定向契约、根入口加 11 个域场景三尺寸共 36 次运行、完整静态门禁。

REPO06B 已按该边界完成：11 个专属文件与迁移前 blob 完全一致，根组件除 10 条实际页面 import 外内容一致；未使用的 `DiaryCreationModePage.vue` 未删除、未接线，旧生产路径消费者为 0。定向契约 24/24，根入口与 11 个域场景三尺寸 36/36，完整静态门禁 447/447。

REPO06C 只读发现确认：`summary` 为 1 个根组件、12 个专属页面和 3 个专属会话模块，当前均无未归属修改；生产侧只有 `apps/builtin.ts` 注册根组件，实际页面/会话只由根组件消费。`SummaryCreationModePage.vue` 当前无消费者，仍原样迁移，不删除、不接线。若获授权，本批只迁入 `src/apps/summary/`，同步注册、根组件 import、结构检查与测试静态路径；store、generation registry、backup、prompt、reference、item-transfer、schema、公共 API 和产品行为冻结。验收包括目录与既有定向契约、根入口加 13 个域场景三尺寸共 42 次运行、完整静态门禁。

REPO06C 已按该边界完成：15 个专属文件与迁移前 blob 完全一致，根组件除 14 条专属 import 外内容一致；未使用的 `SummaryCreationModePage.vue` 未删除、未接线，旧生产路径消费者为 0。定向契约 24/24，根入口与 13 个域场景三尺寸 42/42，完整静态门禁 448/448。

REPO06D 只读发现确认：`theater` 为 1 个根组件、5 个专属 Vue 文件和 1 个随机类型模块，当前均无未归属修改、无跨域生产消费者，6 个专属文件均有现存消费者。若获授权，本批只迁入 `src/apps/theater/`，同步注册、根组件/详情页 import 与测试静态路径；store、generation aliases、generation registry、backup、prompt/type prompt、reference、item-transfer、schema、公共 API 和产品行为冻结。验收包括目录与既有定向契约、根入口加 13 个域场景三尺寸共 42 次运行、完整静态门禁。

REPO06D 已按该边界完成：根组件和详情页仅改变专属 import 路径，其余文件内容与迁移前一致；旧生产路径消费者为 0。目录、生成、编辑、类型、随机选择与导入导出定向契约 41/41，根入口与 13 个域场景三尺寸 42/42，外观证据 3/3，完整静态门禁 449/449。

REPO06E 只读发现确认：`forum` 为 1 个根组件、9 个专属 Vue 文件和 6 个专属会话模块，当前均无未归属修改。唯一外部生产消费者 `composables/useForumFailedDraftRepair.ts` 只引用 `useForumPreviewSession` 类型，本批只同步该 type import，不搬 composable、不改变其 API。若获授权，其余文件迁入 `src/apps/forum/`，同步注册、内部 import、结构检查与测试静态路径；store、generation registry、backup、prompt/type prompt、reference、item-transfer、schema、公共 API 和产品行为冻结。验收包括目录与既有定向契约、根入口加 15 个域场景三尺寸共 48 次运行、完整静态门禁。

REPO06E 已按该边界完成：15 个专属文件与迁移前 blob 完全一致，根组件仅改变 14 条专属 import，外部失败草稿 composable 仅改变一个 type import；旧生产路径消费者为 0。既有 `vue/no-v-html` 警告只同步基线路径，警告仍为 3/3。目录、结构、生成、预览、编辑、导入导出与失败恢复定向契约 30/30，根入口与 15 个域场景三尺寸 48/48，完整静态门禁 450/450。

REPO06F 只读发现确认：`extras` 为 1 个根组件、8 个专属 Vue 文件和 10 个专属会话模块，当前均无未归属修改；18 个专属文件只在域内消费。`composables/useExtrasFailedDraftRepair.ts` 不引用旧 components 路径，本批不修改、不搬迁。若获授权，迁移范围只进入 `src/apps/extras/`，同步注册、内部 import、结构检查与测试静态路径；store、generation registry、backup、prompt/type prompt、reference、item-transfer、schema、公共 API 和产品行为冻结。验收包括目录与既有定向契约、根入口加 14 个域场景三尺寸共 45 次运行、完整静态门禁。

REPO06F 已按该边界完成：18 个专属文件与迁移前 blob 完全一致，根组件仅改变 18 条专属 import，外部失败草稿 composable 未修改；旧生产路径消费者为 0。目录、结构、生成、预览、编辑、版本、引用与失败恢复相关定向契约 33/33，根入口与 14 个域场景三尺寸 45/45，完整静态门禁 451/451，ESLint 警告仍为 3/3。

REPO06G 只读发现确认：`favorites` 只有 `components/FavoritesApp.vue` 一个 201 行根组件，没有专属子页面，文件当前无未归属修改；生产侧唯一静态消费者是 `apps/builtin.ts`。它读取 `store/favorites.ts` 并通过 `core/appRegistry.ts` 动态取得跨域名称、图标和打开动作，但不拥有或静态引用各业务域组件。若获授权，本批只迁入 `src/apps/favorites/FavoritesApp.vue`，同步注册路径并新增目录契约；favorites store、App Registry、收藏提供者、schema、公共 API、UI 和产品行为全部冻结。验收包括目录/注册定向契约、`app:favorites` 在三个手机尺寸共 3 次运行和完整静态门禁。

REPO06G 已按该边界完成：根组件与迁移前 blob 完全一致，旧生产路径消费者为 0，favorites store 与 App Registry 变化为 0；注册改为新路径，旧自动组件声明已删除且未为新目录建立第二入口。目录与注册定向契约 14/14，`app:favorites` 三尺寸 3/3，完整静态门禁 452/452，ESLint 警告仍为 3/3。

REPO06H 只读发现确认：`stats` 只有 `components/StatsApp.vue` 一个 378 行根组件，没有专属子页面，文件当前无未归属修改；生产侧唯一静态消费者是 `apps/builtin.ts`，另有一个图标可访问性契约读取其静态路径。根组件只消费 `store/stats.ts`；跨域内容统计由 store 经 `core/appRegistry.ts` 聚合，当前聊天统计也由 store 的既有运行时读取负责。若获授权，本批只迁入 `src/apps/stats/StatsApp.vue`，同步注册路径、图标契约路径并新增目录契约；stats store、App Registry、各业务域统计提供者、运行时聊天读取、schema、公共 API、UI 和产品行为全部冻结。验收包括目录/注册/图标定向契约、`app:stats` 在三个手机尺寸共 3 次运行和完整静态门禁。

REPO06H 已按该边界完成：根组件与迁移前 blob 完全一致，旧生产路径消费者为 0，stats store 与 App Registry 变化为 0；注册和图标契约改为新路径，旧自动组件声明已删除且未为新目录建立第二入口。目录、注册与图标定向契约 2/2，`app:stats` 三尺寸 3/3，完整静态门禁 453/453，ESLint 警告仍为 3/3。

REPO06I 只读发现确认：`bagu` 的 `components/BaguApp.vue` 是 522 行规则管理根组件，当前无未归属修改，生产侧唯一静态消费者是 `apps/builtin.ts`；图标可访问性与持久删除确认两个契约读取其静态路径。`BaguScanPanel.vue`、`BaguHitDetailsModal.vue` 和 `BaguDetailPage.vue` 分别被阅读器、生成预览、剧情梳理等多个域消费，属于共享 UI，不随根组件搬迁。若获授权，本批只迁入 `src/apps/bagu/BaguApp.vue`，同步注册、两个既有测试路径并新增目录契约；共享扫描组件、bagu/phone store、规则 CRUD、确认流程、schema、公共 API、UI 和产品行为全部冻结。验收包括预计 4 项目录/图标/删除确认定向契约、根入口加 4 个共享扫描场景在三个手机尺寸共 15 次运行和完整静态门禁。

REPO06I 已按该边界完成：根组件与迁移前 blob 完全一致，旧生产路径消费者为 0；三个共享扫描文件和 bagu/phone store 变化均为 0。注册、图标与删除确认契约同步到新路径，旧自动组件声明已删除且未为新目录建立第二入口。目录、图标与删除确认定向契约 4/4，根入口加 4 个共享扫描场景三尺寸 15/15，完整静态门禁 454/454，ESLint 警告仍为 3/3。

当前权威方案是 [15-仓库整理与发布收口方案](../../15-仓库整理与发布收口方案.md)。完整需求与能力历史见 [追踪矩阵归档](../archive/2026-pre-repository-cleanup/03-需求追踪与能力矩阵.md)。
