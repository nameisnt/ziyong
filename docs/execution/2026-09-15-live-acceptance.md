# Live Acceptance Follow-up

## Current Contract and Ownership

User explicitly requested real verification of the remaining items. This batch owns only this evidence record and temporary test artifacts. Preserve all existing uncommitted source changes. Do not publish or push. Any newly discovered business defect is reported separately unless correcting it is explicitly authorized.

Temporarily deploy the current test build, retain an installation backup, and restore the original installed files afterward. Verify macro enable/disable through the UI with actual native generation, new test-group/status inheritance, test-only snapshot restore/delete, test-message insertion/MVU edits and a disabled test script move. Use test objects only; do not restore an old snapshot, delete user files/scripts or update arbitrary existing extensions to induce failures. Restore original chat, native prefix, alias/link settings and global worldbooks afterward. No simulated result is counted as live verification.

## Acceptance Ledger

| Item | Status | Evidence |
| --- | --- | --- |
| Global macro switch, native generation, restore | Passed with UI defect | Branch #11 actual native rawPrompt: enabled prefix `user:`, disabled prefix `米娅:`. Both generations completed. Original compressor disabled state and `{{user}}: ` prefix restored. Enabling without an enabled compression script rejects correctly but leaves checkbox visually checked. |
| Shared/regex status schemes and group branches | Pending | |
| Snapshot creation/read/restore/delete | Pending | |
| Latest-message MVU update and undo | Passed | Actual MVU runtime in 定制xp系统, new Branch #1, floor 4. UI Apply 10 -> 15, Undo -> 10, Redo -> 15; direct runtime readback confirmed each. Other data matched original. External change to 17 was not overwritten by Undo. Test field removed afterward. |
| Workbench/chat insertion | Pending | Test chat only |
| Script move preserves changed content | Pending | Disabled test script only |
| Extension partial update failure | Pending | Do not mutate unrelated extension repositories |
| Restore original installation and context | Restored | Original dist backup copied back. Compression script disabled, original prefix restored; automatic snapshots true, retention 10, original 10 snapshot IDs retained. Returned to the user-selected 定制xp系统 source chat. Test branches retained. |

## Limits and Incident

Only the macro and MVU rows above gained real verification in this batch. Other pending rows are not passes. No business code was changed.

An initial macro generation was mistakenly sent in the source chat after navigation changed. The helper-only removal did not persist. Cleanup was repeated only after verifying the exact source chat, five-message count, exact user marker and exact assistant reply. Explicit native saveChat was then awaited before reload. Subsequent test mutations were restricted to explicitly checked test branches.

## Authorized Macro UI Fix Follow-up

Scope: preserve existing uncommitted work; only fix the two reported macro UI defects and their regression coverage. No deployment, release notes, user-script writes or publication in this follow-up.

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Saved switch state during confirmation, cancellation and failure | SettingsGenerationPanel.vue resets the event target to stored state before awaiting confirmation and again on completion | Real notice components in the isolated Playwright harness; enable/disable cancellation, enable/disable write failure, busy state and successful switching |
| Persistent reload reminder | SettingsGenerationPanel.vue uses timeoutMs: 0 | Both enable and disable reminders remain after 3400 ms and can be dismissed |
| Regression environment | tavernAliasScenarios.ts no longer replaces confirmation/notification handlers; sillytavern-script.ts exports the missing test-only saveSettings stub | Stub enables the harness build; this is not proof of native persistence or branch inheritance |

Typecheck, focused ESLint, UI reuse checks and 11 related unit tests passed. Nine scenario runs at 350x700, 390x844 and 430x900 (light, dark, unsupported engine) produced no findings. The initial visual baseline comparison reported missing registrations, not interaction failures; no baseline was changed. Screenshots/report: tmp/ui-check/native-link-fix. Live installed-plugin retesting is not part of this follow-up.

## Tutorial Update

User requested tutorial updates, not release notes or publication. Existing business changes were preserved; only article content and its contract test were edited.

| Topic | Location | Acceptance |
| --- | --- | --- |
| Global native username prefix link | tutorial/articles/macro.ts, generation.ts | New searchable guide explains defaults, chat/global scope, prerequisites, refresh on both transitions, failure and actual-prompt verification |
| MVU latest-message editing | tutorial/articles/dependency.ts, apps.ts | Removed obsolete historical-floor selection and corrected the button label to Apply; documents field merge and undo conflict handling |
| Branch inheritance boundaries | tutorial/articles/apps.ts | Lists the five inherited domains, excluded apps, new slot association, private/shared distinction and retry limits |
| Tutorial structure and navigation | scripts/unit/tutorial-current-content-contract.test.mjs | 8 tutorial tests, typecheck, focused ESLint, diff whitespace check and UI reuse check passed |
| Existing tutorial rendering | tmp/ui-check/tutorial-update/index.html | 9 isolated browser runs: article/search/scroll-return at 350x700, 390x844, 430x900; no findings. No dedicated new-article screenshot or night-mode run in this content-only follow-up |

No record creation/deletion/import/export behavior changed; those operations are not applicable to this tutorial-only update. Installed extension, dist and version history were not updated.
