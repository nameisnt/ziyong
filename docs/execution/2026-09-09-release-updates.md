# Release Updates

## Batch Contract

- User approved version/update settings, a once-per-release local notice on opening, manual native update checks, and public version 1.1.0.
- Base HEAD: 4b42fb8. Existing tracked changes and new files from `2026-09-09-status-scheme-scope.md` belong to the preceding completed batch and remain intact. Other untracked docs, prototypes and private tmp files are not part of this batch.
- Scope: manifest/package version, build version consistency, release metadata/notice helper, phone open entry, existing extension API reuse, settings panel, focused tests and documentation.
- References: SettingsConnectionPanel, global pc-page-section/pc-section-head/pc-form-actions controls, phone.noticeInfo, extension-transfer native version API.
- Runtime version comes from bundled manifest import. Public version does not change CURRENT_PHONE_DATA_VERSION or status schema version.
- No startup network requests, polling, automatic update/reload, generation changes or real-data writes during testing. Manual update installation remains in the existing extension-transfer App.
- First unacknowledged version uses neutral '本版更新' wording, not a claimed upgrade from an unknown version. Seen version is account-global extension metadata, not chat state.
- Build/test output only in tmp; no root dist rewrite, commit or publication in this batch.

## Acceptance

| Requirement | Location | Evidence |
| --- | --- | --- |
| Bundled running version and manifest/package consistency | Release info, Vite config | Unit assertion, settings rendering and production build check pass |
| Once-per-release notice, no per-chat repetition | Release helper, phone.openPhone | Unit tests cover first/repeat/upgrade/downgrade, numeric ordering. Browser fixture opens twice, checks a single notice and zero network calls |
| Manual self-only update check, error/retry | Native extension API | Unit tests cover renamed/encoded folder and global/local scope, missing install, absent Git state, HTTP failure. Browser clicks cover current/unavailable/failure/retry/update-available and disabled pending button |
| Existing update entry, no auto reload | Settings release panel | Actual button navigates to extension transfer and back; selected settings category remains. No installation or page reload performed |
| Shared controls, three sizes and light/dark | Settings release panel | 30/30 visual cases pass, including 18 version/error/notice cases and 12 existing settings/status regression cases. Inspected narrow dark panel/notice and long-error light screenshots |
| AI/data migration isolation | No generation or migration edits | Diff review: public version 1.1.0 only; data version and pending status migration unchanged. Host requests mocked; real generation/installation not tested |
| Create/edit/delete/import/export release metadata | Not applicable | Release notes are shipped read-only; no content management required |

## Verification

- Focused test initially failed because releaseInfo did not yet exist; passed after implementation.
- Initial default-sandbox verification could not spawn esbuild/Node test children (EPERM); rerun with approved local process permissions.
- First UI fixture used a dev source URL although the visual runner bundles modules. Corrected the fixture URL interception to cover its bundled module, without adding production test hooks.
- Initial full unit run: 658/659; the settings directory contract correctly required registration of the new SettingsReleasePanel. Updated the explicit file list without relaxing the contract.
- `pnpm build:check`: passed; output only in `tmp/build-check`. Existing large-chunk and dependency annotation warnings remain.
- `pnpm ui:check -- --no-baseline --scenarios=settings-release,settings-release-dark,settings-release-error,settings-release-error-dark,settings-release-notice,settings-release-notice-dark,settings-connection,settings-advanced,status-scope,status-scope-dark --sizes=350x700,390x844,430x900 --out=tmp/ui-check/release-updates`: 30/30 passed.
- Evidence: `tmp/release-updates-static.log`, `tmp/release-updates-build.log`, `tmp/release-updates-ui.log`, `tmp/ui-check/release-updates/index.html`.
- Final `pnpm verify:static`: passed, 659/659 unit tests, typecheck/contracts/style/UI reuse passed. Existing lint warnings remain 3/3; global important remains 23/23. `git diff --check` passed.
- No root dist update, real-data mutation, commit or push.

Status: implemented and isolated verification complete.
