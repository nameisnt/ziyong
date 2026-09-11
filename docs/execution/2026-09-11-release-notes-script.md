# 更新说明录入脚本

## 范围与归属

本批仅新增 `scripts/release-notes.mjs`、对应测试、`release:notes` 命令及 AGENTS/CURRENT 使用规则。保留此前未提交的设置快照查重、1.2.2 说明及其他工作树文件。本次不实际录入新说明，不升版本，不打包或推送。

## 使用

```powershell
pnpm release:notes --note "第一条说明" --note "第二条说明" --dry-run
pnpm release:notes --append --note "补充当前未提交版本的说明" --dry-run
```

确认预览后去掉 `--dry-run` 执行。默认新版本递增 patch，可用 `--version 1.3.0` 指定版本。不传 `--note` 时读取 UTF-8 标准输入，每个非空行一条说明；PowerShell 中优先使用 `--note`，避免旧版 PowerShell 管道编码影响中文。

追加仅限当前版本，且不得出现在 HEAD 已提交历史中。已提交版本按冻结处理，不假定未发布；离线无法读取 Git 时拒绝追加。脚本使用 TypeScript AST 定位历史记录、JSON 解析同步版本，格式化时保留源文件换行风格，不执行用户输入的代码。

## 验收

| 要求 | 实现/证据 | 结果 |
| --- | --- | --- |
| 默认递增、指定版本 | updateReleaseNotes，新建与指定版本单测 | 通过 |
| 保留历史、文本转义 | AST 编辑与引号/反斜杠/换行单测 | 通过 |
| 未提交版本追加不升号 | 临时 Git 仓库测试 | 通过 |
| 已提交版本冻结 | 临时 Git 仓库拒绝追加测试 | 通过 |
| 空说明、重复、版本冲突拒绝 | 写入前验证及无文件变化断言 | 通过 |
| 预览不写入 | 单测及当前仓库 `--append --dry-run`，显示 1.2.2 | 通过 |
| 未来统一使用脚本 | AGENTS.md、docs/CURRENT.md | 已记录 |

相关测试 11 项通过，新增脚本 ESLint 无错误或警告，`git diff --check` 通过（AGENTS 有 Git 行尾规范化提示）。当前仓库只读预览需要允许沙箱启动 Git 子进程；提高执行权限后正常，未改写说明。测试中的提交仅发生在临时仓库，实际项目无 Git 写操作。UI、数据 schema、真实聊天/API、导入导出不适用。
