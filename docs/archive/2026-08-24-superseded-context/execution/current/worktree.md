# 当前工作树与保护边界

更新时间：2026-08-24

## Git 基线

- 当前分支：`main`
- 当前 HEAD：`05f1869ee8d7816487675b2586d0d8aa42bc377a`
- 缓存的 `origin/main`：`05f1869ee8d7816487675b2586d0d8aa42bc377a`
- 本地与远端：ahead 0 / behind 0；累计整理提交已推送
- 最新完整静态门禁：466/466

## 当前改动归属

| 范围 | 状态 | 归属 | 保护边界 |
| --- | --- | --- | --- |
| `可参考拓展/**` | HEAD 跟踪 161 项；当前 index 跟踪 0、暂存删除 161；本地有 1830 个文件 | REPO02B 已验证 | 本地 100450225 bytes、缺失 0、blob 差异 0；本批未提交、未推送 |
| `docs/execution/**` | 文档迁移 | REPO03 | 只做 current/archive 分层；历史正文不得删减 |
| `scripts/safe-push-dist.ps1`、REPO04A/04B 契约 | 共享发布政策 | REPO04B / REPOPOST01 已完成 | `05f1869` 以 `dbb4bca` 为父创建并推送成功；隔离契约 14/14、完整静态 455/455 |
| `src/testing/visual-harness.ts`、`src/testing/visual-bootstrap.ts`、bootstrap 结构契约 | 视觉测试运行时夹具 | REPO05B 已完成 | harness 6012→5684；完整 mock 已归并到既有 bootstrap；结构、三尺寸与完整静态门禁通过 |
| `src/testing/visual/forumGenerationScenarios.ts`、`scripts/ui-visual-check.mjs` | 论坛预览视觉契约 | REPO05C 已完成 | 两处选择器已同步为“原文”；定向三尺寸 3/3、静态 445/445；其后 19 个新增场景已由 REPO05D 登记并完成全量验证 |
| `scripts/baselines/ui-visual.json`、视觉拆分计数契约 | 视觉警告基线 | REPO05D/COUNT 已完成 | 候选与正式基线 303/909；新增 19、退役 4、既有 findings 变化 0；视觉 909/909、外观 15/15、静态 445/445 |
| `src/testing/visual/context.ts`、reader navigation、结构契约 | 视觉工具内部结构 | REPO05A 已完成 | 等待与阅读导航已提取；场景、断言、入口和基线不变 |
| `src/apps/letters/**`、书信注册与路径契约 | 书信 App 目录归属 | REPO06A 已完成 | 根组件 + 9 个专属页面纯迁移；页面 blob 变化 0，根组件仅 import 路径变化；24/24、30/30、静态 446/446 |
| `src/apps/diary/**`、日记注册与路径契约 | 日记 App 目录归属 | REPO06B 已完成 | 根组件 + 11 个专属文件纯迁移；文件 blob 变化 0，根组件仅 import 路径变化；24/24、36/36、静态 447/447 |
| `src/apps/summary/**`、总结注册、结构与路径契约 | 总结 App 目录归属 | REPO06C 已完成 | 根组件 + 15 个专属文件纯迁移；文件 blob 变化 0，根组件仅 import 路径变化；24/24、42/42、静态 448/448 |
| `src/apps/theater/**`、小剧场注册与路径契约 | 小剧场 App 目录归属 | REPO06D 已完成 | 根组件 + 6 个专属文件纯迁移；仅根组件/详情页 import 路径变化；41/41、42/42、外观 3/3、静态 449/449 |
| `src/apps/forum/**`、论坛注册、结构与路径契约 | 论坛 App 目录归属 | REPO06E 已完成 | 根组件 + 15 个专属文件纯迁移；外部 composable 仅 type import 变化；30/30、48/48、静态 450/450，警告仍 3/3 |
| `src/apps/extras/**`、番外注册、结构与路径契约 | 番外 App 目录归属 | REPO06F 已完成 | 根组件 + 18 个专属文件纯迁移；专属文件 blob 变化 0，根组件仅 18 条 import 路径变化；33/33、45/45、静态 451/451 |
| `src/apps/favorites/FavoritesApp.vue`、收藏注册与目录契约 | 收藏 App 目录归属 | REPO06G 已完成 | 单根组件纯迁移，blob 变化 0；store/registry 变化 0；14/14、三尺寸 3/3、静态 452/452 |
| `src/apps/stats/StatsApp.vue`、统计注册、图标与目录契约 | 统计 App 目录归属 | REPO06H 已完成 | 单根组件纯迁移，blob 变化 0；store/registry 变化 0；2/2、三尺寸 3/3、静态 453/453 |
| `src/apps/bagu/BaguApp.vue`、八股注册与目录契约 | 八股规则管理 App 目录归属 | REPO06I 已完成 | 单根组件纯迁移，blob 变化 0；共享扫描/store 变化 0；4/4、三尺寸 15/15、静态 454/454 |
| `src/apps/archive/**`、聊天档案注册与目录契约 | 聊天档案 App 目录归属 | REPO06J 已完成 | 根组件 + 3 个专属文件纯迁移；正文只变 import 路径；10/10、三尺寸 12/12、静态 456/456 |
| `src/apps/prompts/**`、共享类型分组字段、提示词注册与路径契约 | 提示词 App 目录归属 | REPO06K 已完成 | 根组件 + 8 个专属文件纯迁移；共享字段留在 `components/prompts/`；28/28、三尺寸 48/48、静态 457/457 |
| `src/apps/reader/**`、共享阅读壳、阅读器注册与警告基线 | 阅读器 App 目录归属 | REPO06L 已完成 | 根组件 + 2 个专属会话纯迁移；共享阅读组件原位保留；22/22、三尺寸 30/30、外观 3/3、静态 458/458 |
| `src/apps/settings/**`、设置注册与路径契约 | 设置 App 目录归属 | REPO06M 已完成 | 根组件 + 6 个专属面板纯迁移；备份/恢复/重置与外部副作用服务原位冻结；21/21、三尺寸 39/39、外观 3/3、静态 459/459 |
| `src/components/**` 45 个文件、共享所有权守卫 | REPO07O 已完成 | 两个孤立组件已删除 | `ProfileEntryPicker.vue`、`ReasoningModal.vue` 与旧专属测试移除；现行外部资料/思维链入口保持；23/23、三尺寸 15/15、静态 459/459 |
| `src/components/PhoneHome.vue`、`components/home/HomeActivityPage.vue`、首页活动页契约 | REPO07A 已完成 | 活动状态单一归属 | PhoneHome 1696→1640 行；活动页 75 行并独占异步聚合/竞态/监听；22/22、三尺寸 18/18、外观 6/6、静态 460/460 |
| `src/components/PhoneHome.vue`、`components/home/useHomeLayoutProjection.ts`、首页投影契约 | REPO07B 已完成 | 只读布局投影单一归属 | composable 109 行，独占布局规范化、App/文件夹解析、Dock/分页/当前页及文件夹成员派生值；根组件继续独占 page index、手势、DOM、计时器、布局写入、弹层和聊天上下文；25/25、三尺寸 18/18、外观 6/6、静态 463/463 |
| `src/components/PhoneHome.vue`、`components/home/HomeContextBar.vue`、状态条所有权契约 | REPO07C 已完成 | 顶部聊天状态条单一归属 | 状态条 154 行并独占既有 ActionMenu、聊天显示、插件数据刷新和历史聊天跳转；PhoneHome 当前 1533 行，只通过三个单向事件连接；28/28、三尺寸 18/18、外观 6/6、静态 466/466 |
| `src/apps/theme/ThemeApp.vue`、`src/apps/theme/themeCatalog.ts`、目录所有权契约 | REPO07D 已完成 | 纯静态主题目录单一归属 | ThemeApp 1794→1321 行；目录 493 行并独占主题包、图标包、字体/图标/颜色/圆角选项及类型；模板与 CSS 无差异；3/3、相关 2/2、三尺寸 9/9、静态 469/469、构建 903 模块 |
| `src/apps/card-writer/**`、`src/apps/prompts/**`、`src/apps/reader/**` | REPO07E-DISC 已完成 | 核心业务壳停止继续拆分 | CardWriter 剩余多阶段生成/草稿/资料写入事务；Prompts 剩余目录/modal/选中态/CRUD；Reader 剩余正则/swipe/分支/写回/酒馆事件，均无不产生大参数袋或第二状态入口的安全大块 |
| 其他生产源码、UI、schema、dist | 无本批修改 | 已验证检查点 | 未经新一轮只读发现和独立授权不得触碰 |

## 参考资料证据

- 删除前 Git 树：`ee8970328f1fd96368f6912a0d97a965a0da8a49`
- 当前 HEAD 跟踪数：161
- 当前 index 跟踪数：0；暂存删除：161
- 原 161 个跟踪路径缺失：0
- 本地文件总数：1830
- 本地总字节：100450225
- 本地内容与 HEAD blob 不一致：0
- `.gitignore` 继续保护 `可参考拓展/`

## 当前停止条件

`05f1869` 已推送并与 `origin/main` 同步；REPOPOST01、REPO02B、REPO06J—REPO06M、REPO07O、REPO07A—REPO07E-DISC 与 REPO08 已验证。正式 `dist` 已从 903 模块构建，JS/CSS 与临时候选逐文件哈希一致；构建后类型通过，显式 `-UntrackIgnoredPath 可参考拓展` 的最终 DryRun 为 250 文件、1713+/54411-。参考资料仍为本地 1830 文件、100450225 bytes，index 暂存删除 161；当前停止在 Git 提交/推送授权点。

完整迁移前历史见 [工作树归属归档](../archive/2026-pre-repository-cleanup/00-工作树归属.md)。
