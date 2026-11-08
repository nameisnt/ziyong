# Catalog Groups and Archive Delete Entrances

## Current Contract

User approved empty catalog groups, separate bulk grouping for presets/worldbooks, current-chat delete button and direct detail delete button. Preserve entry grouping semantics, enable states, source content and chat bindings. Do not publish, bump versions or delete live user data in this batch.

Tracked worktree was clean at start. Existing untracked documents, media, prototypes and asset scripts are not owned by this batch. Scope: catalog pages and their group stores, shared group picker/section builder, archive delete entrances, focused tests and this record.

References: BulkSelectionBar, BulkSelectionCheckbox, BulkDeleteDialog modal lifecycle, global controls, existing ChatDeleteModal. Group creation/edit of membership and removal from a group are applicable; group rename/delete/import/export are not requested. Existing backup paths remain unchanged. Switching source/category cancels bulk selections and the group picker.

## Acceptance

| Requirement | Status | Evidence |
| --- | --- | --- |
| Empty groups and group-name search; new group feedback/location | Passed | catalogGroups.ts builds saved empty groups; both catalogs create through real notice UI, reveal saved empty sections, find members by group name |
| Preset bulk grouping separate from delete, includes current preset | Passed | PresetCatalogPage.vue plus store.assignMany; native/private preset scenarios verify current preset selection, cancel, new/existing destination and move back to ungrouped; native bulk deletion regression also passed |
| Worldbook bulk grouping without activation/source changes | Passed | WorldbookCatalogPage.vue plus store.assignBooks; isolated runtime activation list unchanged; unit tests preserve entry assignments/modes and verify one persistence call per batch |
| Current-chat delete and detail direct button retain two confirmations | Passed for entrance/cancel | ChatArchiveApp.vue passes explicit current owner, removes detail menu; ChatDeleteModal.vue now adds the missing final confirmation. Both entrances reach final confirmation and return without executing deletion when cancelled |
| Three phone sizes, light/dark, cancellation and invalid input | Passed | 30 Playwright runs at 350x700, 390x844, 430x900, light/dark; source/category switch clears picker and selection; blank/duplicate new names rejected. tmp/ui-check/catalog-groups/index.html |

## Final Checks and Limits

- 764 unit tests passed: tmp/catalog-groups-unit-final.log. Two icon-count assertions increased by one for the two intentional new icon buttons; accessible-name checks were retained.
- Typecheck, focused ESLint, lint baseline (three existing warnings), UI reuse check, contracts and diff whitespace check passed.
- Build verification uses tmp/build-check only. New component declaration in components.d.ts is generated and part of this batch.
- Runtime audit found the old delete dialog had two cleanup options but no second confirmation. The approved two-confirmation behavior is now explicit before deletion calls.
- No real chat was deleted. No version bump, release note, installed-plugin deployment, commit or push performed. Original entry grouping semantics and backup operations were not changed.
