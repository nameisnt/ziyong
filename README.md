# 功能性阅读器

面向 SillyTavern 的聊天阅读、内容整理与创作管理扩展。插件以聊天书库为阅读入口，将聊天档案、内容生成、预设与世界书管理、资料整理和酒馆工具集中在一个可分组的 App 面板中。

## 安装与更新

在 SillyTavern 的扩展管理器中选择“安装扩展”，填入本仓库地址：

```text
https://github.com/nameisnt/ziyong
```

安装或更新完成后刷新 SillyTavern 页面。部分预设、世界书和自定义宏功能需要酒馆助手提供对应接口；接口不可用时不影响其余独立功能。

## 主要功能

- **聊天阅读与记录**：聊天书库按角色卡和聊天组织书架；聊天档案可查看历史聊天快照；支持总结、日记、番外、小剧场、论坛、书信和收藏。
- **内容生成与整理**：统一生成设置、预览、重新解析和失败草稿；支持批量生成、工作台流程、内容转换、条目库、正则规则和八股检测。
- **预设与世界书**：管理酒馆预设与插件预设、连续条目分组和聊天绑定；支持世界书联动、条目分组及当前聊天槽位。
- **资料与创作工具**：提供资料表、关系网、时间确认、写卡工坊、宏生成器、MVU 修改器、自制 App 与提示词管理。
- **插件工具**：提供主题与界面设置、文件仓库、扩展迁移、脚本管理、数据统计、备份恢复和内置教程。

具体操作以插件内“教程”为准。

## 数据范围

- 总结、日记、番外、小剧场等聊天内容按聊天保存，并随酒馆当前聊天切换。
- 提示词、主题、界面设置等通用配置按全局保存。
- 从聊天档案进入历史聊天时仅查看插件数据；生成、酒馆楼层写回、预设切换和世界书写入只对酒馆当前打开的聊天执行。
- 设置中的备份与恢复可导出当前聊天或完整插件数据。执行导入、完整恢复或大量写入前，建议先导出完整备份。

## 开发

需要 Node.js 22+ 与 pnpm。

```powershell
pnpm install
pnpm build
```

常用检查：

```powershell
pnpm lint
pnpm exec tsc --noEmit
powershell -ExecutionPolicy Bypass -File scripts/check-ui-reuse.ps1
pnpm ui:check
```

构建产物为完整的 `dist/` 目录，包括 `index.js`、`index.css`、按需页面 chunk 和静态资源。发布脚本会构建项目并安全提交当前所有已跟踪改动，并纳入新生成的 `dist/` 文件；其他未跟踪文件不会进入提交：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/safe-push-dist.ps1
```

## 文档

功能说明与维护方案位于 [`docs`](docs)；新增 App 前请先阅读 [`src/apps/README.md`](src/apps/README.md) 和仓库根目录的 `AGENTS.md`。

## 许可证

[Aladdin](LICENSE)
