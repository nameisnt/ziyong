# Native Preset Groups and Settings Discovery

## Ownership and Authorization

- Starting HEAD: e761520. Tracked worktree is clean.
- Existing untracked execution notes, prototypes, asset scripts, PDF and videos belong to prior work/user; excluded.
- User approved native preset single-selection integration and the related binding restoration fix, then requested implementation and release notes with updates first in settings.
- No real chat, preset, worldbook, API configuration or generation request may be changed without separate authorization. No commit/push.
- The AGENTS audit document is archived under docs/archive/2026-08-24-superseded-context; its execution protocol was read there.

## Current Baseline

- One opt-in flag in existing preset group metadata, disabled when absent. No new group format or migration.
- Native preset list clicks reuse contiguous ID-based single/multiple rules. Allow all off. Closing the panel does not disable integration.
- Native clicks retain native live-settings save semantics, not source preset file writes. Other extensions' direct writes are outside scope.
- Binding snapshots must restore complete affected single groups. Native edits do not rewrite saved chat binding choices.
- Settings update section is first/default; user explicitly chose two-row visible tabs, replacing the hidden category dropdown.
- Release version and notes must describe this change. Previous hidden category dropdown requirement is superseded.

## Batches

| Batch | Root Cause / Goal | Allowed Changes | Reference | Verification |
| --- | --- | --- | --- | --- |
| N01 | Native clicks bypass shared group rules; partial binding restore breaks group invariants | preset-manager grouping/native adapter/settings component, preset-link switch/store helpers, phoneLifecycle, targeted unit/visual fixtures | promptGroups.ts, PresetDetailPage, presetBindingScenarios | normal/off/multiple/switch/failure/disposal; complete group restoration; light/dark at 350x700, 390x844, 430x900 and desktop |
| S01 | Updates hidden in settings selector | SettingsApp, settings/release fixtures and contracts, manifest/package version, releaseInfo and related docs | global segment controls, existing release panel | all category clicks, return/route preservation, update first/default, release check states, same viewport matrix |

The persisted boolean is the configuration authorized in the approved design. No fallback branches or unrelated schema migrations are included. Stop for unavailable host APIs, incompatible native handlers or required real-data changes; report unverified host behavior.

## Acceptance

| Requirement | Implementation / Evidence | Status |
| --- | --- | --- |
| Native single/multiple behavior and cleanup | nativeToggle.ts; native-preset-groups.test.mjs; tmp/native-preset-host-result.json | Passed isolated native host-handler browser clicks; no actual host persistence |
| Opt-in, conflict choice, off/cancel/failure | PresetNativeGrouping.vue/nativeConfiguration.ts; native visual scenarios | Passed |
| Complete binding restore, unchanged source/binding | promptSwitches.ts/store.ts; preset-binding-switches.test.mjs, including in-flight guard and affected-only restore validation | Passed |
| Settings navigation, update first | SettingsApp.vue; settings-tabs light/dark, including route return and keyboard navigation | Passed |
| Release notes/version | releaseInfo.ts, manifest/package 1.2.0, phone notice copy | Implemented; publication not requested |
| Build/static/UI | tmp/native-groups-static-final.log: 670/670 tests, typecheck/contracts/reuse passed, lint 3/3, important 23/23; tmp/ui-check/native-groups-final/report.json: 64 cases, zero findings; tmp/native-groups-build.log: production build passed in 25.85s | Passed |
| Real host writes/generation | Requires isolated host or explicit authorization | Not tested |

CRUD matrix: existing group creation/edit/delete/import/export remains; opt-in flag follows group metadata. No new independent data objects. Recovery is visible errors/retry, not silent normalization. Generation parsing is not applicable.

Infrastructure ownership includes global.d.ts, vite.config.ts, ESLint external-module registration and the isolated openai mock. The native host import stays dynamically loaded and cannot prevent the launcher from mounting. The in-flight binding guard prevents a captured native selection from being overwritten by a pending binding update. It adds no background scan or additional persistence store.

Current host handler check fetched only /scripts/PromptManager.js from localhost:8000, extracted its real handleToggle function and executed actual Playwright pointer clicks in an isolated blank page. The render/save functions were counters. Current user chat, presets and API configuration were not changed; real persistence and AI output remain unverified.

## Final Evidence

- UI coverage: native opt-in/conflict/cancel/all-off/save-failure/retry/closed-panel flow; settings seven tabs, keyboard navigation and return; release check current/unavailable/HTTP failure/update available; existing binding and private preset range editors. Four dimensions: 350x700, 390x844, 430x900, 1280x900, light and dark.
- Inspected screenshots: narrow light settings, narrow dark native conflict picker, desktop dark settings. No text overlaps or new style overrides were found in these views.
- Production output: dist/panel.BsTvspQz.chunk.js, including the dynamically resolved native openai module. Dist is rebuilt with manifest/package 1.2.0; it is not published.
- git diff --check passed. Existing untracked user materials remain untouched. All test/build processes were completed; no real generation or live preset persistence test was performed.
- Status: local implementation, automated verification and packaging complete. Git commit/push was not requested for this turn and was not performed.
