# 拓展小手机

面向 SillyTavern 的手机式创作与管理插件。插件提供聊天档案、日记、小剧场、番外、论坛、书信、阅读、八股去除、提示词、预设管理、世界书联动等 App，并支持按聊天保存内容。

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

构建产物为 `dist/index.js` 和 `dist/index.css`。发布脚本只提交这两个文件：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/safe-push-dist.ps1
```

## 文档

功能说明与维护方案位于 [`docs`](docs)；新增 App 前请先阅读 [`src/apps/README.md`](src/apps/README.md) 和仓库根目录的 `AGENTS.md`。

## 许可证

[Aladdin](LICENSE)
