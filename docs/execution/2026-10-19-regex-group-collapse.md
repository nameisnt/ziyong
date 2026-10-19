# 正则选择分组折叠验收

## 范围

共用 `src/components/ContentRegexModal.vue`：分组标题可折叠，默认展开，显示已选数/当前筛选规则数，搜索变化时展开匹配组。仅改变显示，不改变规则启用或选择数据；重新打开不保存折叠状态。

## 验收

| 项目 | 证据 |
| --- | --- |
| 点击折叠、展开，保留勾选 | `src/testing/visual/contentRegexScenarios.ts` selection 场景通过 |
| 搜索展开匹配分组 | 同上 |
| 弹窗滚动、Escape 关闭及重新打开 | 同上 |
| 类型关联、清空选择及跟随类型 | type-binding 场景通过 |
| 350x700、390x844、430x900，日间及夜间 | `tmp/ui-check/regex-fold/report.json`，12 项 findings 均为空 |
| 截图人工查看 | `content-regex-selection-350x700.png`；列表及底部操作可见，顶部有测试环境更新通知覆盖 |
| 静态检查 | typecheck、两文件 ESLint、UI reuse 检查通过 |
| 实际酒馆部署及各 App 逐页点击 | 未验证，本次未部署 |
| 新建/编辑/删除规则、导入导出、聊天作用域 | 不适用，本次不改变这些行为 |

未打包发布，未改版本或推送。
