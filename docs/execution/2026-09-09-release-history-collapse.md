# Collapsible Past Releases

User requested collapsible historical release records. Existing unpublished 1.2.0 changes remain owned by prior authorized work; no revert, commit/push or user-data changes.

Current baseline: current release always visible; each historical version independently collapsed by default. Native details/summary follows existing PresetOwnershipPanel semantics, using global pc-soft-btn and pc-section-head controls. No persisted UI state or new component abstraction. Previous all-expanded history display is superseded; published notes remain unchanged.

| Requirement | Evidence | Status |
| --- | --- | --- |
| Default collapsed history, expand/re-collapse, current always visible | SettingsReleasePanel.vue; releaseScenarios.ts | Passed |
| Old notes retained, ordering and release checks unchanged | release-updates.test.mjs; releaseScenarios.ts | Passed |
| Four sizes, light/dark, scroll and return | tmp/ui-check/release-collapse/report.json | Passed: 16 cases, zero findings |
| Static/reuse checks and build | tmp/release-collapse-static.log; tmp/release-collapse-build.log | Passed: full static verification and production build |

CRUD/schema/import/export and generation are not applicable. Collapse is a synchronous native interaction without loading, failure or disabled states; existing update-check loading/error/retry tests remain active.

Browser evidence: settings-release and error scenarios in light/dark at 350x700, 390x844, 430x900 and 1280x900. Native summary clicks execute expand/re-collapse, notes visibility is asserted, and historical records return collapsed after leaving/reentering settings. Inspected narrow light/dark screenshots. No screenshot baselines changed.

Production build: tmp/release-collapse-build.log, 51.68s, dist/panel.DpV-sJry.chunk.js. Existing large-chunk warnings remain. No source preset, chat, AI, commit or push operations.

Final verification includes typecheck, unit/data contracts, strict UI reuse and style guard (important 23/23 unchanged). git diff --check passed; all test/build sessions completed.
