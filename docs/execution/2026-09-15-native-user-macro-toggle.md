# 原生用户名宏开关验收

## 当前需求

- 最终需求：联动开关全局、默认关闭。此前“仅当前聊天”宏开关方案失效；char/user 替换依旧是聊天级。
- 开关位于设置中的 char/user 替换输入框下方，复用 pc-setting-row、pc-toggle、InfoHint。
- 开启时保存压缩脚本原前缀并写入 {{pc_native_user}}:；关闭恢复原前缀，两次均明确提示刷新。只修改全局脚本配置，不修改脚本代码。
- 脚本缓存前缀直至刷新，因此关闭后宏保持至页面重载，避免旧脚本在刷新前引用未注册宏。
- 不打包、不部署、不推送，不包含其他未完成修复。

## 范围

本次修改 generationAliases store、SettingsGenerationPanel、全局 Settings schema、nativeUserPrefixLink 工具、对应测试以及发布脚本生成的版本信息。工作树中原有其他 App 修复保留原样。

## 验收

| 要求 | 实现位置 | 证据 |
| --- | --- | --- |
| 默认关闭、全局联动，关闭并刷新后注销 | src/store/generationAliases.ts | tavern-chat-aliases.test.mjs 通过 |
| 开关跨聊天保持、称呼仍聊天隔离 | 同上 | 单测及隔离浏览器聊天切换通过 |
| 保存与恢复准确的原前缀 | src/util/nativeUserPrefixLink.ts | native-user-prefix-link.test.mjs 通过；异常目标不覆盖 |
| 实时读取酒馆姓名 | src/util/tavernChatAliases.ts 既有实现 | 更名后读取测试通过 |
| 输入框下方独立开关 | src/apps/settings/SettingsGenerationPanel.vue | 类型检查、ESLint、UI 复用检查通过 |
| 前缀配置说明 | src/core/releaseInfo.ts，1.2.5 | release:notes dry-run 后执行；11 项发布测试通过 |
| 三种手机尺寸、日夜模式和真实点击 | SettingsGenerationPanel + tavernAliasScenarios | tmp/ui-check/native-prefix-link/index.html：9 场景无 findings，覆盖取消/开启/关闭/失败/切换聊天 |
| 真实 API 前缀结果 | 前一轮真实浏览器测试 | 修改配置未刷新仍为米娅；刷新后前缀核验0915-C 为 user，已恢复原配置；本轮新 UI 只在隔离环境测试 |

独立新建、删除宏对象不适用。开关及恢复原值随全局设置持久化和备份；不新建独立导入导出入口。关闭恢复前缀，不改变聊天正文。不自动修改预设级或角色卡级脚本；多个启用的全局候选明确拒绝写入。
