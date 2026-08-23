# 当前缺陷

更新时间：2026-08-23

这里只保留未完成项与最近关闭的仓库整理缺陷；完整历史见 [缺陷台账归档](../archive/2026-pre-repository-cleanup/01-缺陷台账.md)。

## 未完成

| 缺陷 | 优先级 | 当前事实 | 目标批次 | 状态 |
| --- | --- | --- | --- | --- |
| D-REPO-PUBLISH-004 | 高 | `main` 领先 `origin/main` 1 个检查点且工作区有后续改动时，safe-push DryRun 在提交候选生成前错误拒绝 | REPO04B | 已实现，待隔离行为门禁 |

REPO04B 只修复“远端是本地 HEAD 祖先且存在后续工作区改动”的合法拓扑：临时候选必须以本地 HEAD 为父。分叉检测、普通 index 隔离、允许的新文件边界、ignored 路径保护、构建、确认和推送后校验保持不变；本批不执行真实提交或推送。主仓库 DryRun 已越过原拒绝分支并选择当前 HEAD 为候选父提交，随后因沙箱禁止写 `.git/objects` 停止；HEAD、普通 index 和临时 index 未被改变。新增的隔离 Git 行为测试因执行额度限制尚未运行。

## 最近关闭

| 缺陷 | 结果 | 证据 |
| --- | --- | --- |
| D-REPO-PUBLISH-001 | 根层正式 Markdown 进入安全发布边界 | 定向契约与 dry-run 通过 |
| D-REPO-PUBLISH-002 | 根层 Markdown 数组显式展开 | 155 文件 dry-run 通过 |
| D-REPO-DOC-001 | 建立唯一文档生命周期入口 | `docs/README.md` 与方案归档完成 |
| D-REPO-TRACK-001 | 参考资料退出 index | tracked 161→0，本地数量、字节与 blob 不变 |
| D-REPO-DOC-HOT-001 | 执行文档 current/archive 分层 | 六份完整历史归档；四份 current；旧入口跳转；结构与链接契约 5/5 |
| D-REPO-PUBLISH-003 | safe-push 显式承载已授权 ignored 路径删除 | 六项隔离 Git 状态、PowerShell 解析、教程、完整静态 440/440 |
| D-REPO-VISUAL-002 | 论坛预览测试选择器与产品短标签“原文”统一 | 标签契约 3/3；`forum-preview` 三尺寸 3/3；350x700 全目录越过该场景并完成 303/303 |
| D-REPO-VISUAL-001 | 视觉 bootstrap 单一归属且 harness 降至 5684 行 | 结构 7/7、直接消费者 42/42、完整视觉与静态门禁通过 |
| D-REPO-VISUAL-003 | 当前视觉目录与警告基线同步 | 新增 19、退役 4、既有 findings 变化 0；视觉 909/909、外观 15/15、计数契约 4/4、静态 445/445 |

## D-REPO-PUBLISH-003 已验证契约

新增显式多值参数 `-UntrackIgnoredPath`，默认不传时保持现有排除行为。每个目标必须同时满足：来自 `.gitignore` 的无通配符精确目录、远端父提交仍跟踪文件、普通 index 已完整暂存同一批删除、父提交与本地 HEAD 在该目录没有分叉、本地原文件全部存在且 blob 未变。随后只在临时发布 index 中执行 `git rm --cached`；其他 ignored 路径继续恢复为父提交。

参数缺失、路径非精确忽略项、删除不完整、出现内容差异、文件缺失或远端分叉时一律停止。隔离仓库已验证默认排除、已暂存删除、已提交删除、内容篡改拒绝、未删除拒绝和非精确忽略项拒绝；真实 161 项候选留到本轮提交后以 clean local-ahead dry-run 复核。
