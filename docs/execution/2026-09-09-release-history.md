# Versioned Release Notes

## Scope

- User requested retaining each version's distinct release notes. Existing unpublished 1.2.0 worktree and dist changes are preserved; no commit/push or real-data changes.
- Replace the single current-note array with ordered version records. Restore 1.1.0 verbatim from e761520:src/core/releaseInfo.ts. Do not invent earlier releases or add user-data storage/network requests.
- Reuse SettingsReleasePanel's pc-page-section/pc-section-head and existing scrolling. No new CSS or interactive controls.

## Acceptance

| Requirement | Evidence | Status |
| --- | --- | --- |
| Distinct notes retained, newest first, manifest alignment | releaseInfo.ts; release-updates.test.mjs | Passed |
| Original 1.1.0 notes preserved | git show e761520:src/core/releaseInfo.ts; exact-text test | Passed |
| Current/history sections, scrolling, existing update checks and navigation | releaseScenarios.ts; four sizes, light/dark | Passed: 16 cases, zero findings |
| Typecheck, tests, reuse, packaging | tmp/release-history-static.log; tmp/release-history-build.log | Passed: 686 tests; production build 23.77s |

This changes bundled editorial content only. Runtime CRUD/import/export/schema and AI generation are not applicable. Historical contents are not reclassified as current notifications; existing once-per-version notice behavior remains.

Final UI evidence: tmp/ui-check/release-history-verified/report.json and index.html, with settings-release and error states in light/dark at 350x700, 390x844, 430x900 and 1280x900. Tests assert every version and note count, scroll historical content when needed, loading/disabled/error/retry and navigation/back. Initial runs exposed test assumptions (wrong scroll-container selector and unconditional desktop scroll); corrected the assertions without changing production layout. Inspected 390x844 screenshot: current and historical version labels are distinct and text wraps normally.

No screenshot baseline changes. Global important remains 23/23; strict reuse and UI contracts pass. git diff --check passed. Built locally as unpublished 1.2.0; no commit/push, real user-data edits or AI requests. All test/build sessions completed.
