# 新窗口交接：功能性阅读器插件

更新时间：2026-11-06（晚），Asia/Shanghai。

## 1. 工作环境与约束

- 项目：`E:\tavern_extension_template-main`，PowerShell。
- 酒馆：`F:\SillyTavern`；扩展安装目录 `F:\SillyTavern\public\scripts\extensions\third-party\ziyong-dist`，本地当前安装 **1.2.17**。
- 浏览器入口：`http://127.0.0.1:8000/`（真实 SillyTavern）。启动器 `#phone-creative-native-launcher` 在存在 `#pc-menu-entry` 时会隐藏，测手机面板可直接调用 `window.__sillytavernPhoneOpen__()`。第三方插件「柏宝箱」的更新弹窗会挡住点击，按钮选择器 `.popup-button-cancel`。
- Git 不在 PATH，使用 `tmp/mingit/cmd/git.exe`。
- 用户说“分析/先分析”时不得修改代码。
- 先遵守根目录 AGENTS.md；不要撤销其他未跟本任务相关的工作树文件。
- UI 优先复用现有组件及全局样式；修改后运行 UI reuse 检查，并验证 350x700、390x844、430x900 和日夜模式。
- 不要把隔离浏览器测试称为真实酒馆/API测试。近期测试没有调用真实 AI。
- 不擅自添加兼容回退、全局缓存或扩大修复范围。
- 视觉验证注意：项目 Playwright 1.64.1 需要 chromium build 1248，本机 `%LOCALAPPDATA%\ms-playwright` 只有 1243，已建目录 junction `chromium-1248` / `chromium_headless_shell-1248` 指向 1243。网络恢复后应执行 `pnpm exec playwright install chromium` 换成真包；junction 是机器级副作用。

## 2. 已发布状态

最新发布版本 **1.2.17**，已打包并推送，远程提交已核对：

| 仓库 | 地址 | main 提交 |
| --- | --- | --- |
| 完整仓库 | https://github.com/nameisnt/ziyong.git | `c6101684b64ea8fa32bc428259a88b7e77656fdc` |
| 最小安装仓库 | https://github.com/nameisnt/ziyong-dist.git | `dcd96caecd79cb36b03366545a1aead01664bdfe` |

安装仓库本地检出目录：`tmp/publish-1.2.9`，目录名只是历史遗留，不代表当前版本。

完整仓库**也跟踪 `dist/`**：发布时除源码与 manifest 外，必须把 `pnpm build` 生成的 dist 一起提交，否则仓库里的安装产物会落后一个版本（1.2.17 就补过一次 `build: publish 1.2.17 distribution`）。

拉取时远程已有 6 个 dependabot「Bump deps」提交，本次已 `merge origin/main` 合并并重跑 `pnpm install`，构建基于合并后的依赖。

### 1.2.17 已发布内容

- 生成随机宏与手机输入副本保持同源：同一请求内原生输入与 `phoneUserInput` 不再各自抽取随机数，称呼替换先于随机宏解析。
- 生成页「来源楼层模式」改用与「本次连接」「本次预设」相同的共享下拉组件，只读、不唤起手机键盘，打开时不再闪烁或翻转。
- 小剧场标签云高度贴合内容：取消 220px 上限，打开自定义行或存在解析草稿时高度保持不变；最近使用上限由 12 个提升到 20 个。
- 聊天档案「当前聊天」卡片新增「聊天改名」，与详情页共用改名流程并同步迁移楼层备份，群聊聊天按钮置灰。

提交：`d309336` release: 1.2.17 → `c9304f0` merge origin/main → `c610168` build: publish 1.2.17 distribution。

### 1.2.16 已发布内容

- 番外章节生成页误绑旧状态：`ExtrasApp.vue` 改用 `chapterGenerationViewState`，恢复生成中禁用、实时输出和错误反馈。
- 默认摘要规则下允许开启“从章节正文移除匹配到的摘要块”。默认逻辑仅移除唯一完整 summary 标签块；缺失、重复、嵌套或不完整时保留正文并提示，自定义正则保留原路径。
- 番外生成期间锁定摘要开关、类型名称、新建番外标题。
- 写卡任务在异步读取世界书前创建；准备期间防重复点击，错误仅处理本次任务，停止后不继续发起生成；相关控件随 running 锁定。

### 1.2.15 已发布内容（摘要）

- 网页正则按每次匹配包装 HTML 代码围栏；小剧场类型提示词可关联正则；引用网页提取静态正文。
- 共用 `ContentRegexModal.vue` 支持分组折叠；更新说明每 5 版本一组、最多 8 组。

对应记录：`docs/execution/2026-10-19-*`、`docs/execution/2026-10-20-*`、`docs/execution/2026-11-06-random-macro-consistency.md`。

## 3. 本轮已解决的四项问题

### A. 移动端楼层模式下拉闪烁 — 已修复并实测

原链路：`GenerationSourceFields.vue` 用原生 `<select>`，`SearchableSelectOverlay.vue` 全局接管后调用 `focusAndOpen(true)` → 手机键盘唤起 → 视口收缩 → scroll/resize → `updatePosition()` 翻转或改高，表现为闪烁。

最终实现（用户选定“与本次连接/预设一致”的方案）：
- `src/components/GenerationSourceFields.vue` 不再渲染 `<select>`，改为
  `<SearchableCombobox :model-value="mode" :options="modeOptions" :searchable="false" … @update:model-value="onModeChange" />`，`modeOptions` 为 7 项中文标签，`onModeChange(value: string)` emit `update:mode`。
- `src/components/SearchableCombobox.vue` 保留 `searchable?: boolean`（默认 `true`）：只读时不渲染过滤、`:readonly="!searchable"`、`aria-autocomplete` 置空、`.pc-combobox-plain` 用 `cursor: pointer`，方向键/Enter/Escape/点外关闭照常。
- `src/components/SearchableSelectOverlay.vue` 删除了 plain 专用管道（`searchable` ref、`isPlainSelect`、`focusAndOpen(false, true)` 分支），恢复 `focusAndOpen(true)`；保留 `visualViewport` 可视区夹紧与 `menuPlacement` 翻转。
- `scripts/unit/searchable-select-plain-mode.test.mjs` 为对应契约测试（3 用例）。

真实酒馆实测（iPhone 13 模拟视口 390x844）：字段 36px、输入框 `readonly=true`、`aria-autocomplete=null`、7 个选项；点开后连采 6 帧零位移（anchor top 431.203px、菜单 y=472 h=178）；滚动 80px 菜单跟随并夹紧（395→475，高度 220→175）；选「指定单层」后 `select.value='single'`、摘要行同步。搜索型下拉（番外类型）回归正常。

已知副作用：菜单是该组件内部的绝对定位菜单，字段贴近屏幕底部时可能被裁切（与本次连接/预设相同）。字段在折叠 `details` 内时需要先 `scrollIntoView` 才能点击。

### B. 随机宏与 phoneUserInput 不一致 — 已修复并发布

- `src/util/pluginMacros.ts`：`readInteger` 对缺失/空白参数用 fallback，显式 0 保留；新增 `resolveGenerationRandomMacros`，分别解析 appPrompt/taskInstruction/typePrompt/userRequirement/outputFormat；不全局缓存、不合并独立位置。
- `src/core/generationService.ts`：公共请求准备阶段先称呼替换再解析随机宏；原生输入与 `phoneUserInput` 由同一份已解析 request 组装；追加要求用 `request.userRequirement`。
- `scripts/unit/plugin-macros.test.mjs`、`scripts/unit/plugin-preset-macros.test.mjs` 覆盖跨副本一致、重复复制不增加抽取、独立位置独立抽取、新请求再抽取。

边界：手动捕获与之后生成属两次请求；重放已解析请求不重新抽取；预设中独立书写的随机宏仍按原路径解析；未改写卡专用 `generateOrderedPromptContent`。

### C. 小剧场标签高度与最近使用上限 — 已完成

- `src/apps/theater/TheaterCatalogPage.vue`：`.pc-tag-cloud` 基础规则仍保留 `max-height: 220px`，由更高优先级的 `.pc-theater-catalog-page.pc-page-grid > .pc-tag-cloud { flex: 0 1 auto; min-height: 120px; max-height: none }` 覆盖；页面改为 flex 列布局；`.pc-custom-type-row` 与 `<FailedDraftList>` 包进 `.pc-theater-reserved`（`flex: 0 0 auto; min-height: 170px`），保证自定义行与解析失败草稿常驻、打开时不跳。
- 选择器必须带 `.pc-theater-catalog-page.pc-page-grid` 前缀，否则通配 `> *`（0,3,0）会压过 `#id .class`。
- `src/apps/theater/TheaterApp.vue`：`recentTypePrompts` 的 `.slice(0, 12)` 改为 `.slice(0, 20)`（两处，含 fallback）。
- 记录页 `.pc-history-tag-list` 的 160px 上限未改（用户明确不动）。

### D. 聊天档案当前聊天改名 — 已完成

- `src/apps/archive/ChatArchiveApp.vue`：根页「当前聊天」卡片在「删除聊天」前新增「聊天改名」按钮，`canRenameCurrentChat` 要求 `currentChatRow.exists && currentOwner.kind === 'char' && characterId !== null`，群聊置灰。
- 原 `renameSelectedChat` 主体抽成共享的 `async function renameChat(owner, chat)`（返回新名或 null），详情页与根页复用；内部完成 promptNotice → confirmNotice → `renameTavernCharacterChat` → 当前聊天时 `phone.syncCurrentTavernScope(true)` → 刷新楼层备份与聊天列表。
- `src/util/tavernChatRename.ts` 的 `POST /api/chats/rename` 固定 `is_group: false`，只支持角色卡聊天。

## 4. 当前工作树状态

- 已跟踪文件干净，与 `origin/main` 一致（`c610168`）。
- 仍有大量历史未跟踪文档、图片、视频、原型（`docs/execution/*`、根目录 PDF 等），不属于任何一次发布，不要删除或打包。
- `tmp/live-probe/`、`tmp/overlay-probe/` 为探针脚本与截图，可复用。

## 5. 尚未验证 / 已知遗留

- 真机 iOS 行为：readonly 不弹键盘的路径已由浏览器只读属性保证，但真实软键盘下是否仍有边缘抖动只能设备验证；若出现，备选方案是把触发器换成共享按钮字段、菜单继续复用只读 combobox。
- 夜间菜单配色未验证（点手机顶栏月亮按钮在真实酒馆里没切到深色）。
- 改名弹窗的面板背景半透明，后面页签文字会透出——既有全局通知层配色，非本轮引入。
- `SearchableSelectOverlay` 在字段超出 `.pc-phone-shell` 时会 `close(false)`，窗口高度骤减会立即关闭菜单；真机 readonly 路径走不到。
- 大分块与 zod 注释的构建警告为既有问题。

## 6. 验证与发布命令

```powershell
$env:PATH="$PWD\tmp\mingit\cmd;$env:PATH"
pnpm verify:static
node --test --test-isolation=none scripts/unit/*.test.mjs
pnpm typecheck
pnpm build:check
powershell -ExecutionPolicy Bypass -File scripts/check-ui-reuse.ps1
```

隔离浏览器（需要上面的 chromium junction 或真实 1248）：

```powershell
pnpm ui:check -- --no-baseline "--scenarios=theater-source-range,theater-mvu-source-dark,generation-connection-override" "--sizes=350x700,390x844,430x900" --out=tmp/ui-check/verify
```

真实酒馆手机面板冒烟：`tmp/live-probe/*.mjs`（playwright + `devices['iPhone 13']`，`PROBE_HEADLESS=0` 可看界面）。

更新说明必须使用 `pnpm release:notes`：先 `--dry-run --note "..."`，核对后移除 dry-run 执行。默认 patch+1；已提交版本冻结，不用 `--append` 修改已发布版本。执行后至少运行 `release-updates.test.mjs` 和 `release-notes-script.test.mjs`。

发布流程（1.2.18 起用脚本，默认 dry-run）：
1. `git fetch origin`，检查远程新提交；如有则先合并，再 `pnpm install`。
2. `pnpm release -- --note "..." --note "..."` 先看计划与版本说明预览（不写文件）。
3. 确认后 `pnpm release -- --note "..." --apply`：写入 manifest/package/releaseInfo → `pnpm build` → 提交主仓库（含 `dist/`）→ 推送（pre-push 会跑 `pnpm verify:static`）→ 同步 `tmp/publish-1.2.9` 安装仓库并推送 → 校验两处 `dist/index.js` 哈希。
4. 手动流程仍然有效：`pnpm release:notes --version x.y.z --note ...`、`pnpm build`、精确暂存（禁止 `git add .`）、分别提交两仓库。
5. 可选：把新构建拷到本地酒馆安装目录，保持与发布产物一致。

push 前唯一闸门：`git config core.hooksPath .githooks`（新克隆后跑一次 `pnpm hooks:install`），`.githooks/pre-push` 会执行 `pnpm verify:static`，失败即中止推送。`.github/workflows/bundle.yaml` 已删除，dist 只由本地构建产生，CI 不再提交 `[bot] Bundle`。
