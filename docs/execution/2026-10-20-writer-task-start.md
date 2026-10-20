# 写卡准备阶段状态修复

## 范围

`CardWriterApp.vue` 在读取世界书前建立既有单次任务，准备阶段纳入 running；catch 仅引用本次任务，不再读取可能指向其他任务的共享引用。素材读取结束后检查任务仍在运行且聊天未切换，再进入 AI 生成。

任务选择、人设模式、世界书素材、目标世界书及刷新按钮跟随 running 禁用。保留前一批番外修复，不修改其他 App。

## 验收

| 项目 | 证据 |
| --- | --- |
| 准备阶段重复点击仅创建一个任务 | single-generation-card-writer-contract.test.mjs 动态执行 runWriter，通过 |
| 素材读取失败仅处理本次任务 | 同测试，替换共享任务引用后仍仅 fail 原任务 |
| 读取期间停止后不请求 AI | 同测试，通过 |
| 运行时生成按钮、任务选择与世界书控件禁用 | visual-harness.ts，card-writer-generation-background 场景通过 |
| 离页后继续生成并保留预览 | 同场景模拟生成通过 |
| 三种手机尺寸、日夜布局 | tmp/ui-check/writer-task-start/report.json，9场景无 findings |
| 静态检查 | typecheck、局部 ESLint、UI reuse 通过 |
| 真实 API、实际酒馆世界书读取 | 未验证；测试使用模拟数据 |
| 删除/导入/导出 | 不适用，本次不更改成品存储能力 |

未打包发布，未提升版本或推送。
