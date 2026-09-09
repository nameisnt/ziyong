# Status Scheme Scope

## Batch Contract

- Base: 4b42fb8; tracked tree clean. Previous untracked docs, prototypes, assets and private tmp data remain untouched.
- User approved private-by-default schemes with an explicit shared toggle. Shared availability never means automatic activation.
- User approved legacy migration: preserve explicit bindings, clone multiply-bound schemes into private copies, assign unbound schemes to the current chat, defer migration without a real chat.
- Scope: status store and scope helper, viewer/settings consumers, related tutorial/docs, focused unit and visual scenarios. Existing global controls, confirmation notice and chat-rename mechanism are references.
- Copy regex usage selections when splitting schemes; do not duplicate or modify the global regex rule library.
- No changes to AI requests, host data, global CSS or unrelated Apps. No real-data migration test, dist build publication, commits or push in this batch.
- Returning a shared scheme to private requires confirmation when other chats use it. Keep the scheme in the editing chat and remove other bindings only after confirmation.

## Acceptance

| Requirement | Location | Evidence |
| --- | --- | --- |
| Default private, shared availability, no implicit activation | `store.ts`, `schemeScope.ts`, viewer/settings | Pure helper tests and actual store/UI A/B fixture pass |
| Legacy binding migration, orphan/deferred handling, idempotence | `migrateLegacySchemes`, store init/chat event/rehydration | Unit tests cover orphan/current-chat ownership and no-chat deferral; UI covers multi-chat copies, deferral and repeated rehydration |
| Private copy regex selections, persistence and import rehydration | Store migration + schema fields | UI fixture imports a legacy settings envelope, verifies copied regex usage, independent arrays, subsequent regex rehydration and persisted ownership. Real destructive backup restore not performed |
| Share/restrict confirmation and cancellation | `StatusDisplaySettingsApp.vue` | Actual clicks cover share, B opt-in, cancel restriction, confirm restriction, disabled save while waiting, and local regex draft cancellation |
| Create/view/edit/copy/delete and chat switch | Existing controls with scoped scheme list | New/copy private ownership, hidden A scheme in B, blocked unavailable activation, deletion, failed-save draft retention and A/B return pass; existing status viewer/history scenarios pass |
| Rename ownership | Existing generic scope reference rewrite | Added test in `chat-scope-rename.test.mjs` verifies owner and selection keys move, while scheme and regex target IDs stay stable |
| UI day/night at 350x700, 390x844, 430x900 | Shared toggle/InfoHint/form/notice; no CSS changes | 36/36 cases pass. Inspected editor 350 light, confirmation 350 dark and root 430 light screenshots |
| Real host data, API and publication | Not applicable | Not authorized for this batch |

## Verification

- Initial focused test failed with missing `schemeScope.ts`; implementation then passed 5/5 scope tests. Sandbox Node test spawning required `--test-isolation=none` for the initial focused run.
- First UI smoke failure was a test locator expecting a deletion button named Confirm instead of Delete; corrected to the existing Delete command. Smoke rerun passed.
- Initial static run found an unused visual wait helper while the scenario was under construction; final scenario uses it for persistence verification, no suppression added.
- Final `pnpm verify:static`: passed, 655/655 tests, typecheck/contracts/style/reuse passed. Existing lint baseline remains 3 warnings; global important baseline remains 23/23.
- Final `pnpm build:check`: passed, output only in tmp/build-check; existing bundle-size and dependency annotation warnings remain.
- `pnpm ui:check -- --no-baseline --scenarios=status-scope,status-scope-dark,status-scope-editor,status-scope-editor-dark,status-scope-confirm,status-scope-confirm-dark,status-display-settings,status-display-settings-dark,status-display-regex,status-display-regex-dark,status-display-mvu,status-display-mvu-dark --sizes=350x700,390x844,430x900 --out=tmp/ui-check/status-scope`: 36/36 passed.
- Evidence: `tmp/status-scope-static.log`, `tmp/status-scope-build.log`, `tmp/status-scope-ui.log`, `tmp/ui-check/status-scope/index.html`.
- Related current requirements and code map updated. `git diff --check` passed. No real host data was accessed or migrated during implementation; no API calls, dist publication, commit or push.

Status: implemented and isolated verification complete.
