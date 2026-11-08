# Preset Binding Trigger Boundary

## Ownership and Baseline

- User approved implementation of the preceding trigger analysis. Starting HEAD: e761520; worktree already contains the authorized unpublished 1.2.0 native-group/settings work and its dist output. Preserve those changes and unrelated user files.
- Current requirement supersedes automatic reapplication on every scope notification: apply once on the first ready chat in a page session and on actual chat changes, or explicitly via Apply. Save, page navigation, same-chat reload and rename must not reset manual switches.
- Unbound chats and failed automatic attempts also count as visited. Failure remains visible; retry is explicit. Removing a binding retains existing restoration behavior.
- No schema changes, new persistent identity, polling, source-preset writes, real user-data tests, commits or pushes.

## Batch

One root cause: shared scope callbacks confuse a repeat notification with a new chat visit. Change the preset-link store's entry boundary and connect runtime rename identity through the existing App capability registry and shared rename migration. Do not suppress shared notifications needed by other Apps.

References: existing serialized preset mutation queue, latest-request guard, scope equivalence helpers, scope migration and App registry callbacks. Tests execute the store with isolated host APIs and the shared migration with fixtures.

## Acceptance

| Requirement | Location / Evidence | Status |
| --- | --- | --- |
| Same-chat navigation/reload preserves manual switches | preset-link store; unit tests; presetBindingScenarios.ts executes shared synchronization, Apply, save, leave/reopen | Passed |
| Actual chat/card change, first initialization, explicit Apply | store tests; phoneLifecycle.ts initializes once; browser Apply buttons | Passed in isolated fixtures |
| Save-only, unbound visit, remove/rebind, failed auto attempt | preset-binding-switches.test.mjs | Passed |
| Native/plugin rename before and after current identity changes | shared scopeRenameHandler; chat-scope-rename tests; pending/in-flight/unbound/historical rename fixtures | Passed in isolated fixtures; real host rename not executed |
| Duplicate/in-flight/obsolete requests | serialized store tests including explicit Apply superseding auto and regex reload notifications | Passed |
| Release notes and current behavior documentation | releaseInfo.ts, CURRENT.md, CODEMAP.md | Added to unpublished 1.2.0 |
| Static checks and packaging | tmp/preset-binding-triggers-static-final.log; tmp/preset-binding-triggers-build.log | Passed: 685 tests, typecheck, lint/contracts/reuse, production build |
| UI layout / real host persistence / AI generation | No layout changes; no real-data authorization in this batch | Not applicable / Not tested |

CRUD: existing binding creation, viewing, editing, deletion, import/export remain unchanged. No new persistent object. Restore/import alone does not request an automatic application; scope changes and explicit Apply remain the application boundary.

## Final Evidence

- Final browser report: tmp/ui-check/preset-binding-triggers-final/report.json and index.html. Sixteen cases: binding and release pages, light/dark, 350x700, 390x844, 430x900 and 1280x900. Zero findings. Binding checks cover selection, save, explicit apply, refresh, scrolling, disabled states, unsaved navigation confirmation, same-chat synchronization and reopening after save without application.
- The first browser run had zero findings but exited for absent registered legacy screenshots. Reran with --no-baseline; layout/runtime/interaction assertions remain active and passed. No screenshot baselines were added or relaxed.
- Inspected narrow light release and dark binding screenshots. No new controls or CSS overrides. Style limits remain global important 23/23, App-local important zero; UI reuse and contracts pass.
- Production build completed in 35.73s; dist/panel.CBE5JJgm.chunk.js. Existing large-chunk and dependency annotation warnings remain; no new dependency or polling.
- git diff --check passed. No real chats, source presets, worldbooks or AI requests were touched. No commit/push; all test/build sessions completed.
- Runtime rename aliases exist only during the host's old-name/new-name transition, and are retired when the new name is observed or a different chat is entered. They are not persisted or used as a compatibility fallback.
