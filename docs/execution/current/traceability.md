# 当前需求追踪

更新时间：2026-08-22

| 当前要求 | 缺陷/批次 | 权威证据 | 状态 |
| --- | --- | --- | --- |
| 冻结累计成果并建立检查点 | REPO00、REPO01、REPOCHECKPOINT01 | `dbb4bca`、431/431、155 文件 dry-run | 已完成 |
| 参考资料退出发布树且本地保留 | D-REPO-TRACK-001 / REPO02 | tracked 0；1830 文件、100450225 bytes、blob 差异 0 | 已完成，待后续提交 |
| 当前执行状态与历史证据分离 | D-REPO-DOC-HOT-001 / REPO03 | `current/`、历史切片、旧入口跳转、结构/链接契约 5/5、434/434 | 已完成 |
| 允许发布已授权删除但禁止重新加入本地资料 | D-REPO-PUBLISH-003 / REPO04A | 显式参数、六项隔离 Git 状态、教程、440/440；真实 161D/0A 待 clean local-ahead dry-run | 已完成 |
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
| `archive` | `ChatArchiveApp.vue`；`components/archive/**` 3 个文件 | 无专属 store；消费 phone/generationTasks | 不适用；自身备份导入导出流程 | 3 个域场景 + 根入口 | 酒馆运行时依赖，后置 |
| `bagu` | `apps/bagu/BaguApp.vue`；详情/扫描/命中弹窗继续为多域共享 | `store/bagu.ts` | 不适用 | 4/4；4 个共享扫描场景 + 根入口三尺寸 15/15 | **REPO06I 已完成** |
| `favorites` | `apps/favorites/FavoritesApp.vue`；无专属页面 | `store/favorites.ts` | 不适用；通过 App Registry 聚合既有收藏提供者 | 14/14；根入口三尺寸 3/3 | **REPO06G 已完成** |
| `stats` | `apps/stats/StatsApp.vue`；无专属页面 | `store/stats.ts` | `builtinStats`；通过 App Registry 聚合各业务域统计 | 2/2；根入口三尺寸 3/3 | **REPO06H 已完成** |
| `settings` | `SettingsApp.vue`；`components/settings/**` 6 个文件 | `store/settings.ts`、`phone.ts` | generation/transfer 不适用；注册两项备份域 | settings 契约；12 个域场景 + 根入口 | 核心壳，后置 |
| `reader` | `ReaderApp.vue`；reader 会话及共享阅读组件 | `store/reader.ts` | content source / favorite；transfer 不适用 | reader 契约；9 个域场景 + 根入口 | 方案明确排除首轮 |
| `prompts` | `PromptsApp.vue`；`components/prompts/**` 9 个文件 | `store/prompts.ts` | 提示词注册体系；item transfer 不适用 | prompts 契约；15 个域场景 + 根入口 | 方案明确排除首轮 |

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
