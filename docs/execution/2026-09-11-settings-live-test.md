# Settings Snapshot Live Verification

## Scope

Version 1.2.2: snapshot similarity scanning, single retained file per group,
confirmation and deletion through the native server API. Snapshot count limits
were explicitly declined and are not implemented.

## Evidence

| Check | Result |
| --- | --- |
| Actual browser scan, 50 snapshots at 100% | No rejected files; no duplicate groups |
| Actual browser scan at 99% | 7 groups, 40 deletion candidates; confirmation canceled |
| Two temporary copies of an existing snapshot | 100% scan identified the original and both copies in one group |
| Retention and confirmation | Original selected as the sole keeper; cancel preserved selection |
| Actual deletion | Native report 200, delete 204, finalize 204; both copies removed, original retained |
| Original data verification | All 50 original files present with unchanged hashes after restoration described below |
| Responsive UI | 350x700, 390x844, 430x900; light and dark scenarios passed |
| Focused regression tests | 12 passed; includes Vue proxy transfer regression |
| Typecheck, targeted ESLint, strict UI reuse, build | Passed |

## Fix

`settingsComparisonClient.ts` now transfers only scalar snapshot summary fields
to the Worker. Passing a reactive Vue proxy previously caused DataCloneError.
`RecoverySettingsFlow.vue` exposes rejected-file reasons through an expandable
list. The new client unit test exercises structuredClone with a real Vue proxy.

## Native Retention Side Effect

The host generated a new automatic snapshot during testing and its native
50-file cap removed the oldest original. That original was restored from the
pre-test local backup; its hash matched. Final verification counted 51 files:
50 unchanged originals plus the new automatic snapshot, with no test copies.
Private settings backups remain local and are not part of the release.

## Residual UI Issue

After deletion, the candidate panel retains its previous count and members.
The deletion button is disabled and the result reports success. This stale
display was observed, not fixed in this test batch.
