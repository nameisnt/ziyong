# Target and Async Fixes

## Ownership and Current Contract

User approved the three-batch plan. Tracked worktree was clean at entry. Existing untracked media, prototypes, generation tools and earlier audit documents are not part of this change. The referenced docs/07 execution protocol file is absent; use the supplied AGENTS rules and this explicit contract.

1. Fix snapshot confirmation identity, workbench/chat insertion identity, and MVU latest-message field mutations. The earlier selectable MVU floor proposal is superseded: message mode always targets the latest floor; chat/character/global modes remain.
2. Reject stale entry-library and snapshot-detail loads. Store source identity with the loaded collection.
3. Move scripts using current source-tree content; report errors. Report extension update partial success and require reload after any successful update. Clarify workbench draft wording.

References: status-display refreshRevision, native preset bulk-delete result feedback, global controls and existing MVU tree helpers. No new themes, persistence schemas, compatibility fallbacks or unrelated refactors.

## Verification Boundary

Unit tests exercise stale completion, fixed target IDs, scope changes, field-preserving MVU writes and undo conflicts, current script content and partial update results. Browser uses temporary API substitutes only: no actual snapshot restore/delete, script writes, extension updates, AI requests or real chat mutations. Check affected UI at 350x700, 390x844, 430x900 in light/dark mode. Creation/import/export not changed and therefore not applicable to this batch.

Run typecheck, focused tests, targeted lint and strict UI reuse. Record evidence before release notes/build. No Git commit or push without a new user instruction.

## Progress

- Read-only baseline and ownership: complete.
- Batch 1: verified within scope.
- Batch 2: verified within scope; activation request duplication corrected on resume.
- Batch 3: verified within scope.
- Verification and release notes: complete for this batch; four pre-existing full-suite failures remain outside scope.

## Resume Ownership

The user resumed this audit after the native-user macro work. Existing macro-link changes, global settings schema, release metadata, macro tests and their UI scenarios belong to that separate task and must be preserved. This resumed batch owns only the seven audited Apps, shared chatInsert helper, MVU patches, target-async tests and focused visual scenarios. Builds for verification go to tmp, not the published dist. No real chat/API/script/snapshot mutations are authorized by this resumed audit contract.

## Acceptance Evidence

| Defect / requirement | Implementation | Verification |
| --- | --- | --- |
| Snapshot confirmation target must not follow navigation | FileRepositoryApp removeActive/restoreActive | Deferred confirmation tests preserve ID A after navigating to B |
| Snapshot late reads must not overwrite current payload/loading/error | FileRepositoryApp loadDetail and lifecycle | Out-of-order result unit tests; file-repository-operations light/dark UI |
| Entry collection must preserve loaded source identity | EntryLibraryApp loadSourceEntries/collectSelected | Out-of-order A/B tests; source-change collection rejected; worldbook collection UI |
| Insert targets and content fixed before confirmation | ChatInsertApp, WorkbenchApp, util/chatInsert | Deferred confirmation tests, four-mode insert UI; mismatched chat prevents host call |
| Chat changes after host write must not be reported as cancelled | util/chatInsert | Post-write scope test; no save call against the new chat |
| MVU message mode uses latest concrete floor | MvuModifierApp persistSnapshot | Writes target floor 8 at execution, no floor selector; CRUD UI |
| MVU field merge, undo conflict, actual old value | patches.ts and MvuModifierApp | Latest unrelated fields retained; undo target/floor conflicts blocked; write-before value returned for history |
| No abandoned full-snapshot mutation wrapper | mvu-modifier/api.ts | Removed only the two newly unused wrappers after repository-wide consumer search; production build passes |
| Script move preserves current content | script-manager/api.ts, ScriptManagerApp | NEW external content retained instead of OLD list snapshot; missing script rejected |
| Partial extension update feedback | ExtensionTransferApp updateSelected | A/C succeed after B fails; one refresh and reload notice; failure names retained |

Focused tests: 30 passed. Visual regression: 42 runs at 350x700, 390x844, 430x900; light/dark coverage for all seven Apps; no findings. Report: tmp/ui-check/target-async-fixes/index.html. UI uses simulated host writes only, not live SillyTavern data. Actual current-chat writes/restores/AI generation are not verified in this batch.

Typecheck, targeted ESLint, strict UI reuse, git diff --check and production build to tmp/build-check passed. Publication dist unchanged. Update notes appended by release:notes to uncommitted 1.2.5; the 11 release tests passed. No commit, deployment or push.

## Full-Suite Baseline Findings

Final full suite: 757 tests, 753 passed, 4 failed (tmp/target-async-unit-final.log). These same four failures were reproduced against files extracted from HEAD 3060504 into tmp/target-async-baseline, with no business edits:

- archive-app-directory-contract: exact directory file list assertion.
- archive-floor-backup-scenario: old inline scenario source assertion.
- chat-archive-current-browser-contract: exact single-line component invocation assertion.
- external-content-sync-contract: exact world-slot storeToRefs destructuring assertion.

These are separately tracked test-contract failures, not evidence that all plugin functions pass. Their behavioral implications remain outside this batch and require a separate review. The extension update loop's old structural assertion was within scope and updated; its behavioral test verifies continuation and partial-success feedback.

Creation/import/export outside the specific operations above are unchanged and not applicable to this change. New editing/deletion schemas are not introduced; errors retain targets and drafts for inspection/retry.
