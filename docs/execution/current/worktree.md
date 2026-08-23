# 当前工作树与保护边界

更新时间：2026-08-23

## Git 基线

- 当前分支：`main`
- 当前 HEAD：`dbb4bca205f09d6c8234a25a0ffe7dd184ccce5c`
- 缓存的 `origin/main`：`e09548081890c3988b548b68eb093a5c2365dcfa`
- 本地领先：1 个检查点提交；尚未推送
- 最新完整静态门禁：454/454

## 当前改动归属

| 范围 | 状态 | 归属 | 保护边界 |
| --- | --- | --- | --- |
| `可参考拓展/**` | index 中 161 项删除 | REPO02 已验证 | 本地 1830 个文件、100450225 bytes 必须保留；不移动、不改写、不删除 |
| `docs/execution/**` | 文档迁移 | REPO03 | 只做 current/archive 分层；历史正文不得删减 |
| `scripts/safe-push-dist.ps1`、REPO04A/04B 契约 | 共享发布政策 | REPO04B 已实现、待行为门禁 | local-ahead + dirty 已改用本地 HEAD 为候选父提交；显式退出跟踪、分叉拒绝与确认语义冻结 |
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
| 其他生产源码、UI、schema、dist | 无本批修改 | 已验证检查点 | 未经新一轮只读发现和独立授权不得触碰 |

## 参考资料证据

- 删除前 Git 树：`ee8970328f1fd96368f6912a0d97a965a0da8a49`
- index 跟踪数：0
- 原 161 个跟踪路径缺失：0
- 本地内容与删除前 HEAD blob 不一致：0
- `.gitignore` 继续保护 `可参考拓展/`

## 当前停止条件

REPO06A—REPO06I 已按授权完成六个传统生成内容域及收藏、统计、八股规则管理根组件迁移。下一业务域必须重新执行只读依赖发现并登记独立契约；未获新单域授权前不得继续移动生产文件。仍禁止 push、真实数据操作和参考资料清理。

完整迁移前历史见 [工作树归属归档](../archive/2026-pre-repository-cleanup/00-工作树归属.md)。
