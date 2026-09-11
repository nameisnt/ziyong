# 设置快照相似查重

## 当前需求与归属

- 用户授权：实现可选百分比查重，每组默认保留最新，只能单选一份保留。
- 旧的“固定保留最新、复选删除副本”方案失效。不会自动删除真实快照。
- 开始时 tracked 工作树干净；原有未跟踪文件、执行记录及原型保留，不纳入本次修改。
- 范围：recovery 设置快照 API、模型、store、设置快照页面；对应教程、测试与视觉场景。聊天备份查重不变。
- 参考：RecoveryMaintenanceFlow 的全局字段控件、现有 settings 删除确认与内容复核流程。无全局 CSS 变更。

## 实现与验收

| 要求 | 实现位置 | 证据 |
| --- | --- | --- |
| 百分比阈值，默认 100 | RecoverySettingsFlow.vue、settingsComparison.ts | 阈值边界及无效输入单测；更改输入清除旧结果的浏览器测试 |
| 每组默认最新，可单选旧份 | settingsComparison.ts、RecoverySettingsFlow.vue | 单选互斥、跨组独立、旧份保留的 store 测试 |
| 相似分组不发生链式扩散 | settingsComparison.ts | 组内两两达标单测；差异按 JSON Pointer 展示，最多 8 项 |
| 避免同时加载多份大文件 | settingsComparisonClient.ts、settingsComparison.worker.ts、store.ts | 顺序读取单测；3 份 84MiB 合成文件真实 Worker 浏览器测试 |
| 取消扫描、离开页面释放线程 | 同上及 RecoverySettingsFlow.vue | 取消不发布部分结果、不删除文件；Worker AbortError 验证 |
| 删除确认与逐文件复核 | store.ts、RecoverySettingsFlow.vue | 保留项变化整组跳过，候选变化排除，JSON 排版不同也能保留旧份 |
| 日夜主题与内部滚动 | recoveryScenarios.ts、ui-visual-check.mjs | 350x700、390x844、430x900、1280x900，两主题共 8 场景；滚动、选择、差异展开、取消确认 |

一致率为相同 JSON 字段/结构路径数除以路径并集数，不是文本字符相似度，也不代表删除风险比例。对象键序及排版忽略，数组顺序、类型和空结构保留。每个文件的原始 SHA-256 仅用于沿用删除前内容变化复核；长字符串摘要不会把所有快照正文留在内存中。

## 验证产物

- 静态：`tmp/settings-similarity-static.log`，703 项测试通过；类型检查、契约、样式与 UI 复用检查通过，未提高基线。
- 临时构建：`tmp/settings-similarity-build.log`，不覆盖正式 dist。
- UI：`tmp/ui-check/settings-similarity/report.json` 与截图，8 场景通过；包括小屏删除按钮留在视口内、列表内部滚动。截图中的版本更新通知为既有行为，本次未修改。
- Worker：`tmp/settings-similarity/worker-browser.json`；本机三份合成文件约 1.9 秒，主线程计时继续，取消成功。不是移动设备或真实 50 份文件性能承诺，单份大 JSON 仍需要解析内存。

## 范围限制

- 已测试的删除为内存模拟接口；未删除、恢复或改写真实快照。
- 创建/恢复/单份删除沿用现有流程，本次未做真实接口验收。
- 快照导入导出、schema、聊天切换：本次新增能力不适用。
- 未打包到正式 dist，未提交推送、未改版本号。
