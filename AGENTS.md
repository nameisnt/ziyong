当用户输入`先分析`时，不要修改任何代码。

## UI 复用优先硬规则

制作或修改任何前端 UI 前，必须先检查现有全局样式、组件和文档，优先复用，不要在 App 内重新造一套相同控件。

- 新增按钮优先使用全局类：`.pc-primary-btn`、`.pc-soft-btn`、`.pc-icon-btn`、`.pc-segment-btn`。
- 新增输入控件优先使用全局类：`.pc-field`、`.pc-select`、`.pc-area`、`.pc-field-group`、`.pc-field-label`。
- 新增卡片优先使用全局类：`.pc-section-card`、`.pc-editor-card`。
- 新增表单底部操作区优先使用全局类：`.pc-form-actions`。
- 新增空状态优先使用 `EmptyState.vue`。
- 新增生成页优先使用 `GenerationPanel.vue`，生成预览优先使用 `GenerationPreviewPanel.vue`。
- 新增引用选择优先使用 `ReferencePicker.vue`。
- 新增八股检测优先使用 `BaguScanPanel.vue`。
- 新增提示说明优先使用 `InfoHint.vue`。
- 新增详情页底部导航优先使用 `DetailFooter.vue`。

禁止在单个 App 的 scoped style 中重复定义全局控件基础样式，例如 `.pc-primary-btn`、`.pc-soft-btn`、`.pc-icon-btn`、`.pc-field`、`.pc-select`、`.pc-area`、`.pc-form-actions`。只有该 App 独有布局、局部排列或特殊状态可以写局部 CSS。

新增主题相关颜色必须使用全局主题变量，例如 `--pc-theme-accent`、`--pc-surface`、`--pc-surface-strong`、`--pc-border`、`--pc-text`、`--pc-muted`、`--pc-danger`。不要新增绕过主题系统的变量或硬编码主题色，除非是明确的业务状态色并有注释说明。

每次 UI 改动后，运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-ui-reuse.ps1
```

该脚本默认只提醒不阻塞；如果需要把疑似重复样式作为失败处理，可追加 `-Strict`。

如果脚本提示疑似重复全局样式，需要优先改成复用；确实需要保留时，在代码旁添加简短注释说明原因。
