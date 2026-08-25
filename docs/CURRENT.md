# CURRENT

本文件是后续开发的主要当前规则入口。除非用户明确要求考古，`docs/archive/` 只作历史证据，不作为施工依据。

## 当前有效规则

1. 只以 `CURRENT.md`、`DECISIONS.md`、`CODEMAP.md` 作为默认文档上下文；旧方案已归档。
2. 修改前先核对当前代码事实；文档与代码冲突时，以代码事实和最新明确决策为准。
3. 用户要求“分析”或“先分析”时，只读检查，不修改代码。
4. 用户要求只整理文档时，不修改源代码、业务 schema、构建产物或真实数据。
5. 不做顺手优化、顺便重构、临时兼容分支或第二套实现；需要扩大范围时先说明并等待确认。
6. 前端 UI 改动前必须检查全局样式、共享组件和同类页面，优先复用现有实现。
7. 新按钮优先使用 `.pc-primary-btn`、`.pc-soft-btn`、`.pc-icon-btn`、`.pc-segment-btn`。
8. 新输入控件优先使用 `.pc-field`、`.pc-select`、`.pc-area`、`.pc-field-group`、`.pc-field-label`。
9. 新卡片优先使用 `.pc-section-card`、`.pc-editor-card`；表单底部操作区优先使用 `.pc-form-actions`。
10. 空状态优先用 `EmptyState.vue`；生成页优先用 `GenerationPanel.vue` 和 `GenerationPreviewPanel.vue`。
11. 引用选择优先用 `ReferencePicker.vue`；八股检测优先用 `BaguScanPanel.vue`；提示说明优先用 `InfoHint.vue`；详情页底部导航优先用 `DetailFooter.vue`。
12. App 内 scoped style 不得重复定义全局控件基础样式，只能写本 App 独有布局、排列或特殊状态。
13. 新主题颜色必须使用 `--pc-theme-accent`、`--pc-surface`、`--pc-surface-strong`、`--pc-border`、`--pc-text`、`--pc-muted`、`--pc-danger` 等主题变量。
14. UI 改动后运行 `powershell -ExecutionPolicy Bypass -File scripts/check-ui-reuse.ps1`；疑似重复样式优先改为复用。
15. 共享交互或复发缺陷必须先全库搜索同类模式，但修复只覆盖同根因、同共享入口的命中项。
16. 用户可见按钮和点击区必须有真实事件链，覆盖正常、禁用、加载、失败反馈。
17. 数据对象功能需逐项判断新建、查看、编辑、删除/解除、导入、导出、失败恢复和作用域切换；不适用也要在验收中说明。
18. 解析或生成失败时必须保留原始内容、明确错误位置，并允许修改后重新解析。
19. UI 验证至少覆盖 `350x700`、`390x844`、`430x900`，并检查日间与夜间模式。
20. 多轮需求变化后，编码前必须整理唯一当前需求基线，旧要求被替代时要明确失效。
21. 业务 App 默认归入 `src/apps/<domain>/`；跨业务共享 UI 留在 `src/components/`。
22. `src/components/PhoneHome.vue` 仍是首页可写交互协调器；不要因行数继续拆分，除非发现明确单一职责边界。
23. `CardWriterApp.vue`、`PromptsApp.vue`、`ReaderApp.vue` 当前保留根协调职责；继续拆分需先做只读边界审计。
24. App 注册以 `definePhoneApp`/`PhoneAppModule` 为唯一能力声明入口。
25. 内置模块在 `src/apps/builtin.ts` 显式注册；其他 `src/apps/*/index.ts` 由 `import.meta.glob` 自动注册。
26. 新 App id 必须匹配小写字母开头的 `[a-z][a-z0-9-]*`，且不得重复。
27. App 能力通过注册表声明：组件、备份域、生成、提示词、引用、收藏、统计、内容转换、单条迁移、作用域切换等。
28. 聊天作用域数据必须使用 `useChatScopedDomain` 或同等 envelope 结构：`__chatScoped`、`legacyScopeMigrations`、`scopes`。
29. 生成只能在当前酒馆聊天作用域发起；历史聊天作用域只允许浏览已保存内容。
30. 生成统一走 `generationService` 和 `GenerationAdapter`；不得在单个 App 内另写完整生成生命周期。
31. 生成请求需保留来源楼层、引用、任务模板、提示词、输出格式、replay snapshot 和原始输出语义。
32. 生成解析失败或保存失败需要进入失败草稿或明确报错；不能丢弃原始输出。
33. 完整备份、当前聊天备份、内容域迁移和单条迁移必须先 schema 校验，再事务式写入，失败时回滚。
34. JSON 完整备份不迁移 API key、自定义壁纸文件和字体文件本体；v3 处理首页图标，v4 继续携带有内容的聊天楼层备份及关联世界书。
35. 参考资料目录 `可参考拓展/` 是本地资料，不应进入发布候选；已授权退出跟踪的发布仍需显式 `-UntrackIgnoredPath 可参考拓展`。
36. `dist/index.js`、`dist/index.css` 是正式发布产物；正式构建、提交、推送都需要按用户授权边界执行。
37. 根层声明生成物 `auto-imports.d.ts`、`auto-imports.zod.d.ts`、`components.d.ts` 当前仍被跟踪；变更跟踪政策前需单独审计。
38. 常规验证入口见 `package.json`：`verify:static`、`build:check`、`verify:ui`、`verify:full`。
39. 高风险操作，包括真实聊天/API/schema、删除覆盖、Git 提交推送、发布和不可逆动作，必须停止并请求授权。
40. 完成前按用户要求列验收表，记录实现位置和验证证据；未验证只能写“未验证”。
41. 详情页繁体转简体统一使用 `chinese-simple2traditional@2.3.2` 核心；打开另一项内容、目录项或相邻版本时从顶部开始，不复用前一内容的 `scrollTop`；预设条目子页返回按第 46 条处理。
42. 详情页思维链可编辑；“修改句子”入口已移除，不得重新接回问号句批量匹配逻辑。
43. 批量生成先进入逐项预览再保存；失败草稿保留原始输出，可编辑、重新解析或按 replay 重新生成；工作台自动触发按聊天 scope 建立基线，切换聊天后等待宿主加载完成再同步计数。
44. 全局手机顶栏使用紧凑高度；首页生成任务区始终显示、内部滚动且保留清理按钮；文件夹管理不再提供自定义图标选择，移动端首页手势与 Dock 五槽容量按真实布局处理。
45. 重复资料管理目录及 `script-manager` 使用 `BulkSelectionBar`、`BulkSelectionCheckbox` 和 `useBulkSelection` 提供全选及一次确认批量删除；编辑器内部字段删除不另建批量模式。
46. `preset-manager` 只管理酒馆/插件预设及预设共享阅读规则；酒馆当前启用预设在目录置顶，详情分组进入条目再返回时保留展开状态和原滚动位置；`preset-link` 独立管理聊天与酒馆预设的绑定、解除和应用。
47. 世界书槽位根页使用管理菜单承载新增和同步；世界书槽位与联动条目编辑页使用高文本域，并按“激活策略 → 插入位置/插入顺序”排列基础字段；联动条目可复制、写回策略，也可单条或批量复制为小剧场类型。
48. 酒馆备份查重分为完全相同、严格续长和至少 90% 逐楼相同三类，候选均可取消选择且删除前重新复核。
49. `macro-builder` 生成插件私有 `{{phone:...}}` 宏并只在手机生成期间注册；`regex-display` 只管理可分组、可拖拽排序的规则资料，使用绑定由阅读、预设、状态栏等消费界面直接选择；`status-display` 只显示当前聊天绑定方案，`status-display-settings` 负责方案选择与管理。
50. 八股去除句式调整当前明确暂缓；在用户重新确认规则前不得修改现有检测或替换语义。

## 已知冲突

- `AGENTS.md` 仍引用已归档的 `docs/07-当前代码与UI复用审计及设计要求.md` 第九、十一节；本次决策要求 archive 不作为施工依据，因此后续开发应优先按本文件执行，并把该引用视为待处理的文档治理冲突。
- 已归档 `docs/README.md` 宣称旧长期规范和 `execution/current/` 是当前入口；本次归档后该说法失效。
- 已归档 `docs/15-仓库整理与发布收口方案.md` 记录“当前停止在 Git 发布授权点”，但当前工作树已有后续未提交源码、脚本、dist 与文档改动；该状态只能作为历史证据。
- 旧文档中仍出现 `src/components/*App.vue` 时代路径；当前代码已把多数业务 App 迁入 `src/apps/<domain>/`。
