# World Slot Entry ID Matching

Scope: use the existing worldEntryId when an editor removes the custom slot
marker. No reverse synchronization, schema changes or duplicate cleanup added.
The slot remains the source of content written during synchronization.

| Acceptance | Evidence |
| --- | --- |
| Edited entry with missing marker updates in place | Actual performSync fixture tests, IDs 0 and 7; zero creations |
| Repeated sync remains stable | Second sync causes no additional save |
| Explicit ownership overrides stale ID | Existing marked entry wins; unrelated entry preserved |
| No two slots claim the same existing entry | Claimed ID set; two-slot tests with and without marker |
| Missing entry follows existing creation behavior | New ID persisted and reused on next sync |
| Scope lifecycle | Existing auto-sync and stale-request contract tests passed |
| Validation | 13 tests passed; typecheck, targeted ESLint and diff check passed |
| UI, live host edits and real worldbook writes | Not tested; no UI change or real-data writes |
| Import/export, deletion, recovery | Unchanged; not retested |

Implementation: src/apps/world-slots/store.ts, performSync.
Tests: scripts/unit/world-slots-entry-name.test.mjs.
