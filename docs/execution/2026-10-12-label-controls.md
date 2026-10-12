# Label Control Follow-up

## Current Scope

Fix the confirmed entry-library insertion and card-writer help misactivation. Remove nested selection labels while retaining native checkbox activation. Do not change generation, persistence, deletion services, CSS, release history or published dist files.

Reference: SettingsGenerationPanel uses a non-label row with a separate control label. SearchableCombobox already supplies an accessible input label. BulkSelectionCheckbox already supplies an accessible checkbox name and a full-size native input hit target.

## Implementation

- EntryLibraryBindingsPage: use a non-label container, an explicit textarea label and a Vue useId value; keep the insertion button independent.
- CardWriterApp: render help captions as non-label containers; existing combobox accessible names remain unchanged.
- BulkSelectionCheckbox: use a span wrapper so containing field labels can associate with the native checkbox without nesting labels. Preserve native change, disabled and click propagation behavior.
- TimekeeperApp: use a non-label person row and give the name input an accessible name; clicking or editing a name cannot select the checkbox through label activation.

## Acceptance

| Requirement | Evidence / status |
| --- | --- |
| Binding title focuses textarea without inserting | Playwright entry-library-bindings, day/night; actual title click and value/focus assertions |
| Insertion button still inserts at the caret | Existing fixture assertion plus Playwright insertion check |
| Card-writer captions do not open help; help buttons still do | Playwright card-writer-labels, day/night |
| Person name edits do not toggle selection | Playwright timekeeper-labels, day/night; name edit, checkbox click and keyboard Space |
| Chat-delete option text still selects the correct checkbox | Playwright archive-delete-confirm, day/night; independent options and cancel |
| Bulk-delete confirmation text still enables confirmation | Playwright preset-catalog-delete, day/night; fixture-only deletion |
| Standalone selection and disabled placeholder controls | Existing preset-bulk-delete day/night scenarios |
| Original output-cleaning toggle | Existing settings-generation day/night scenarios |
| Responsive sizes | 350x700, 390x844, 430x900 in both modes; final no-baseline run passed, 42 cases and zero findings |
| Static checks | 13 focused unit tests, typecheck, modified production file ESLint and UI reuse check passed |
| Loading / backend failure recovery | Not re-executed; service code unchanged |
| New objects, import/export, migration, scope switching | Not applicable to this markup-only change |
| Live Tavern / actual AI generation | Not tested; all browser operations use isolated fixtures |
| Release, build for distribution and push | Not performed |

Report: tmp/ui-check/label-controls/index.html. The first run produced zero findings in 42 cases but exited for missing screenshot baseline registrations. The rerun uses --no-baseline rather than altering baseline allowances.

Git was unavailable on PATH and common installation paths in this session. Existing changes were retained; no Git operations were performed.

## Release Validation

The subsequent release request authorizes notes, a production build and both repository pushes. Official portable Git was placed under ignored tmp/mingit. Remote dependency-only commits through 3b56f85 were fast-forwarded without changing the fixes.

- release:notes dry-run and write created 1.2.13 with three notes; published history was preserved.
- All 11 release tests and 13 focused regression tests passed; typecheck and UI reuse passed.
- Production build passed with the existing large-chunk warning.
- Final browser validation with the updated dependencies passed all 42 cases, with zero findings: tmp/ui-check/release-1.2.13/index.html.
- The source and installation repositories have identical staged dist content (645 files).
- Only the named fix files, tests, these two October 12 acceptance records, version files and dist are included; unrelated untracked files remain excluded.
