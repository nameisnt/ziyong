# 世界书槽位名称前缀修复

## 范围与归属

- 当前需求：名称只显示槽位标题，隐藏字段识别归属，旧前缀条目原位更新。
- 开始时 `src/apps/world-slots/store.ts` 无未提交修改；工作树其余源码、测试和 dist 已有修改，保持不动。
- 本轮修改：该 store、新增 `scripts/unit/world-slots-entry-name.test.mjs`、本记录。
- 不新增 schema、兼容分支或同步流程；保留已有旧前缀读取能力，删除不再使用的前缀生成函数。
- 不写真实聊天、世界书或预设，不调用生成 API，不更新 dist，不提交或推送。

## 验收

| 要求 | 实现位置 | 验证证据 |
| --- | --- | --- |
| 新条目名称无前缀 | store.ts / createWorldEntry | 新增行为测试通过 |
| 隐藏 ID 保留 | createWorldEntry / sillytavernPhoneSlotId | 浏览器直接读取服务器 `/api/worldinfo/get`，当前已保存条目包含 ID；宿主 saveWorldInfo/_save 原样序列化数据 |
| 旧条目原位更新 | getEntrySlotId + performSync | 仅前缀、顶层字段、extensions 字段三种情况通过；保留 UID，不新建副本 |
| 重复同步不重复保存 | performSync | JSON 保存回读后再次同步，保存次数仍为 1 |
| 改名与启停 | performSync | 去前缀后仍使用相同 UID，名称与 disable 更新正确 |
| 删除及作用域清理 | performSync | 清空槽位后清理自有条目，同名非槽位条目保留 |
| 导入导出、失败恢复 | 本轮不变 | 未验证完整业务流程；只验证旧标记及 JSON 持久化识别 |
| UI 尺寸及主题 | 不适用 | 无模板、样式或控件修改；未进行视觉回归 |
| 新版真实世界书写入 | 未执行 | 本轮浏览器只读，未对真实数据应用修复 |

## 执行结果

- 修复前新增测试：5 项因名称含前缀失败，1 项清理测试通过。
- 修复后新增 6 项、既有相关 5 项，总计 11/11 通过。
- 测试命令：`node --test --experimental-test-isolation=none scripts/unit/world-slots-entry-name.test.mjs scripts/unit/world-slots-auto-sync-contract.test.mjs scripts/unit/external-content-sync-contract.test.mjs`。默认隔离模式被环境阻止创建子进程，因此使用无进程隔离模式。
- 两个代码文件 ESLint 通过。新增测试已格式化；store 的整体格式检查仍有提示，未扩大修改做整文件格式化。
- `pnpm build:check` 通过，输出 `tmp/build-check`；保留既有大 chunk 警告。首次沙箱构建无法启动 esbuild，授权后构建成功。
- 安装新版后，下一次槽位同步会按当前槽位标题覆盖旧前缀名称。浏览器现有安装版未更换，真实条目本轮未修改。
