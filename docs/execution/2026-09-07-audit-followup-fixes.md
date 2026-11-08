# 审计遗留修复批次

## 当前需求与边界

用户授权修复四项已确认问题；柏宝箱 404 明确排除。不操作真实聊天、API、世界书、预设，不清扫已有存档，不提交推送或覆盖正式 dist。

## 工作树归属

- 已修改：usePhoneModalLifecycle.ts、regex-display/store.ts、util/regexDisplay.ts、store/theater.ts、extras.ts、letters.ts、forum.ts，以及相关正则和焦点测试。保留前批改动，仅追加本批同根因修改。
- 干净：PhoneOverlay.vue、StatusDisplayApp.vue、tsconfig.json、global.d.ts，以及其余内容删除 store。
- world-slots/store.ts 是上一批前缀修复，本批不改。
- AF04 另涉及原本干净的 vite.config.ts、auto-imports.d.ts：只停用重复 toastr 类型生成，运行时导入不变。global.d.ts 补充明确 i18n 签名。
- components.d.ts 保留前批两个声明，构建新增 PhoneNoticeItem 声明；其余源码、dist 和未跟踪文件保持原状。

## 批次契约

| 批次 | 根因与允许范围 | 参考实现 | 状态 |
| --- | --- | --- | --- |
| AF01 | 状态栏刷新提前退出未清 loading；StatusDisplayApp.vue 及测试 | 当前 revision 过期结果保护 | 4/4 单测通过，日夜三尺寸原有场景通过 |
| AF02 | 交互通知没有焦点作用域；通知组件、PhoneOverlay、共享生命周期及测试 | usePhoneModalLifecycle 的嵌套弹窗 | 7/7 焦点及契约测试通过，最终三尺寸日夜验收通过 |
| AF03 | 内容删除未清对应正则使用键；regexDisplay 工具/store 和已接入内容正则的删除入口及测试 | 现有结构化 content key 和 deleteUsage | 工具 13/13、store 删除行为 11/11 通过 |
| AF04 | tsconfig 外部 JS 全盘 include；tsconfig、明确宿主声明和测试 | global.d.ts 既有宿主模块声明 | 完整 typecheck 和 2/2 配置测试通过 |

各批次先运行针对性测试，通过后继续。仅处理上述同根因；新增无关缺陷只记录。所有数据验证使用内存或隔离浏览器夹具。UI 复用全局样式，不改变通知配色和布局。

## 验收证据

| 要求 | 实现位置 | 验证 |
| --- | --- | --- |
| 无方案、历史聊天不再卡加载 | StatusDisplayApp.vue / refreshStatus | 延迟 MVU 请求后切空方案或切历史聊天；旧请求不得写结果、清新请求 loading；失败后可重试 |
| 交互通知成为顶层焦点范围 | PhoneNoticeItem.vue + usePhoneModalLifecycle.ts | 初始焦点、Tab/Shift+Tab 循环、Enter 提交、Escape 取消、phone-before-back、确认删除、父弹窗保留 |
| 普通通知不抢焦点 | PhoneNoticeItem.vue / interactive | 提交后成功提示出现，焦点仍在父弹窗；普通通知不入栈 |
| 保存禁用按钮后不丢焦点 | usePhoneModalLifecycle.ts / deactivate | 实际 Enter 创建分组触发保存时禁用原按钮；改在下一帧恢复到可用原按钮或父弹窗，不增加定时重试 |
| 删除条目、版本、整本清理选择 | util/regexDisplay.ts、regex-display/store.ts、八类内容 store | 小剧场、番外、书信、论坛、日记、总结、摘要、自制 App；确认拒绝删除最后版本时不清选择；保留同名其他对象与 App 级规则 |
| 论坛回复和拆分版本 | forum.ts、theater.ts | 只删除对应版本/回复使用键；拆分后源版本无残留，不改变新条目独立选择的既有行为 |
| 删除自制 App | app-builder/store.ts / deleteDefinition | 清理该 App 的 content 键，其他 App 不变 |
| 类型检查不扫描外部 JS | tsconfig.json、global.d.ts | 根文件全部位于项目内，移除外部 path alias；完整 tsc 通过，未启用 skipLibCheck |
| 类型生成不复发冲突 | vite.config.ts / ignoreDts | 只跳过 toastr 重复声明，保留运行时自动导入；构建后再跑 typecheck 通过 |

### 验证过程记录

- 最终 `pnpm test:unit`：635/635 通过。
- 最终独立 UI 验收：12 场景 x 350x700、390x844、430x900，共 36/36 通过，日夜都有覆盖，命令退出 0；报告 `tmp/ui-check/audit-followup-verified/index.html`，逐项结果与截图同目录保存。
- 已查看日间 350x700 和夜间 390x844 通知截图，控件及父弹窗均可见；其余尺寸由 DOM/交互检查验证，不声称全部截图逐张人工评审。
- 初始 30 项 UI 中 24 项无缺陷，6 项通知测试失败。截图工具会主动 blur，先修正为截图后通过真实按钮重新打开；未以此修改业务实现。
- 随后定位 Enter 保存后焦点先回按钮、按钮再被异步状态禁用的问题；使用浏览器焦点事件记录确认。共享恢复安排在下一帧，取消仍回原按钮，保存中按钮不可用则回父弹窗。
- 之后 30 项中通知、状态栏、分组全部通过；3 项旧正则测试在帧前检查焦点。改为等待焦点实际返回，不放宽目标范围。
- `tmp/ui-check/audit-focus-final/report.json` 的 18 项 findings 均为空；命令因旧基线未登记新场景而非交互失败退出 1。最终合并验收使用 `--no-baseline`，仍执行全部真实交互、DOM 溢出、截图检查，不改写旧基线。
- `pnpm lint:baseline`：0 错误、3 条既有警告，无新增。严格 UI 复用、样式守卫、备份/配置/恢复/结构契约通过。
- `pnpm build:check` 通过，输出仅为 tmp/build-check，保留既有大 chunk 提示。最后一次构建主块为 panel.B_nko8ms.chunk.js。

### 范围限制

- 不执行历史孤儿配置全量扫描或存档迁移；清理仅发生在后续对应删除操作中。
- 资料表没有条目级 displayIdentity；阅读聊天使用宿主聊天/楼层身份，不属于本轮插件内容 store 删除入口，未新增宿主删除联动。
- 本次 UI 用隔离夹具而非真实酒馆数据。全库所有 App 的业务组合、整库恢复和完整生成链未重测；未部署或推送。
- 类型检查脚本为现有 tsc，不声称替代 vue-tsc 的完整 SFC 模板类型验证。UI 无配色或尺寸设计变更，原通知样式搬入组件保留。
- 相关测试进程和隔离服务器均已结束；四项源码修复完成，正式 dist 与已安装版本未变。
