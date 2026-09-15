# Archive import and bulk operations

## Worktree ownership

Existing archive deletion, world-slot reverse synchronization, scoped-domain and visual harness changes are previous user-approved work and must be preserved. Existing untracked documents, prototypes and media are outside this batch.

## Current batch: backup target identity

Allowed: chatFloorBackup utility, archive import caller, focused tests and this record. Keep character/group matching; remove source chat-name matching only for import. Rebind imported backup to the selected destination, preserving source data and overwrite confirmation. Restore still requires the currently open empty destination. No schema changes, real chat writes, deletion, commits or deployment.

Verification: unit tests, typecheck, targeted lint and diff check. Real browser overwrite/restore requires temporary-data test authorization before execution.

## Subsequent batches

Pending: shared feedback, management entry placement and scope indicator audit; bulk preset/worldbook entry deletion; whole preset/worldbook deletion. Each requires a bounded contract and interface audit. These are not implemented by this batch.

## Batch: preset entry deletion

User continued execution. Scope: preset manager detail/row, preset deletion APIs, plugin preset mutation, preset-link prompt reference cleanup, shared bulk bar busy state, and focused tests. Reference: worldbook detail bulk selection plus archive deletion. Ordinary content entries only; placeholders are not bulk selectable. One persisted mutation per preset; current live-copy failure remains a partial-success warning. Existing single-delete callers use the same multi-item mutation. Test data must be newly created, never existing user presets.

The referenced docs/07 protocol file is absent; follow the supplied AGENTS instructions and existing execution records.

## Batch result

- Implemented `rebindChatFloorBackupForImport` and connected both archive import entry points through their existing shared caller. Source filename/chat name no longer gates import; owner matching still does. Destination key, title and owner are rebound together. The input object and floor data are not rewritten.
- Five new focused tests passed; with archive deletion regression tests, 14 tests passed.
- Typecheck, targeted ESLint and `git diff --check` passed.
- No new visible controls or CSS; existing overwrite confirmation and empty-chat restore guard retained.
- Real browser import/overwrite/restore is not yet verified. No deployment or real data write was performed.
- Read-only follow-up found an existing worldbook detail bulk selection surface and a native preset deletion guard for the current preset. Reuse these rather than adding competing controls or bypassing the guard.

## Preset batch verification

Preset range/plugin format regression: 13 tests; bulk save/partial failure: 3 tests. Typecheck and strict UI reuse passed. Six phone light/dark interactive scenarios passed without findings using --no-baseline (new scenarios have no legacy baseline). Native temporary preset deletion retained the middle group member and unrelated prompt; active preset remained unchanged. Plugin temporary preset bulk deletion removed both items. Both temporary presets were removed afterward.

Worldbook entry batch: five unit tests, six visual/interaction scenarios, typecheck, targeted lint and strict UI reuse passed. Real temporary worldbook retained unselected UID 2 with original content after deleting UIDs 0 and 1. Original book list and global bindings were unchanged; fixture removed.

## Batch: whole preset deletion

Scope: preset catalog selection, parent deletion orchestration and a reusable confirmed batch-delete dialog. Exclude the active native preset and built-in plugin presets. Reuse native/plugin deletion and existing reference cleanup. Execute sequentially with per-item results; require explicit unchecked confirmation. Whole worldbook deletion remains awaiting user decision because native deletion does not clean all historical bindings.

Whole preset batch: six isolated interactive mobile day/night scenarios pass without findings after fixing menu alignment. Real native and plugin tests deleted two temporary presets per source, with the active native preset unchanged. Manual confirmation required and observed. Temporary records removed.

## Batch: scope wording

Read-only audit: preset binding already distinguishes bound preset from loaded preset; extension transfer already requests full-page refresh after successful updates; status already exposes the actual selected floor. Do not duplicate these. Change only ambiguous binding editor heading, status scheme sharing badge and obsolete archive historical-readonly message. Reuse existing global layout/text classes; no data or generation changes.

## 最终验收（覆盖前文阶段性未验证状态）

| 需求 | 实现位置 | 证据与状态 |
| --- | --- | --- |
| 同角色备份不要求聊天同名 | `src/util/chatFloorBackup.ts`、归档共享导入入口 | 真实导入不同聊天名备份成功；目标身份更新，楼层正文和 data 保留；取消覆盖后旧备份不变 |
| 备份恢复到空聊天 | 既有 restore 流程 | 新建空群聊，同组旧聊天名备份导入后恢复两条用户/AI 消息；重新请求酒馆保存文件确认内容一致 |
| 预设条目批量删除 | PresetDetailPage、PresetPromptRow、原生 API 和 pluginPresets store | 原生与插件临时预设均真实删除成功；单次存储写入、分组首尾收缩、失败保留有单元测试 |
| 连续分组保留 | `promptGroups.ts` | 删除首尾后保留中间成员；整组删空后移除；原有单条与批量使用同一规则 |
| 世界书条目批量删除 | WorldbookDetailPage、WorldbookLinkApp、api | 真实删除 0、1 两个 UID 后，UID 2 内容不变；原全局启用列表和原有世界书列表不变 |
| 槽位托管条目保护 | WorldbookLinkApp | 按当前槽位绑定 worldEntryId 禁选/阻止删除；未对用户真实槽位执行删除测试 |
| 整份预设批量删除 | PresetCatalogPage、PresetManagerApp、BulkDeleteDialog | 酒馆与插件分别真实删除两份临时预设；默认未勾选确认时按钮禁用；结果逐项展示；当前原生预设内容未变 |
| 操作反馈与入口 | 以上批量页面、BulkSelectionBar | 管理菜单、逐项/分组/筛选全选、取消保留、执行中禁用、失败结果与部分成功区分；当前原生预设/内置插件预设禁选 |
| 作用域提示 | PresetBindingSwitches、StatusDisplayApp、ChatArchiveApp | 标明绑定配置、方案是否共享、非当前聊天；未改变生成或状态读取逻辑 |
| 整本世界书删除 | 尚未实现 | 等待用户选择历史原生绑定可能失效的处理方式；插件联动引用与酒馆历史绑定是不同的数据 |
| 全部 App 全面审计 | 尚未完成 | 本轮仅核对涉及的共享流程和上述提示，不能视为全插件审计完成 |

### 自动检查

- 相关单元测试合计 48 项通过。
- 最终 typecheck、定向 ESLint、严格 UI 复用检查和 diff check 通过。
- 三组新增批量 UI 各 6 个手机日夜场景，共 18 场景无 findings。
- 状态栏、预设绑定、聊天档案共 15 个提示回归场景无 findings。
- 检查构建成功，最终包仅部署到本机酒馆进行测试；未升级版本、提交或推送。
- UI 证据：`tmp/ui-check/preset-bulk-delete/`、`worldbook-bulk-delete/`、`preset-catalog-delete/`、`scope-labels/`。
- 所有本轮创建的临时原生/插件预设、临时世界书、聊天、群组及插件楼层备份均已清理。酒馆自动产生的原生备份未删除。
- 宿主网络故障和部分成功使用隔离/单元测试；未对真实服务器注入故障。移动端为浏览器尺寸模拟，不是真机测试。

## Batch: worldbook entry deletion

Reuse the current conversion selection mode with an explicit delete mode, one worldbook write for selected IDs, group selection and fixed bottom actions. Preserve current single entry API wrapper. Protect current world-slot bound IDs in the dedicated worldbook, clean worldbook-link and catalog-group references only after successful write. Scope: worldbook API, app/detail UI, focused unit/visual tests. No whole-worldbook deletion in this batch.
