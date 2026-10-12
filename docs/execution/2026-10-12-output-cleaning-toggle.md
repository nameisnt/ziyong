# Output Cleaning Toggle Fix

## Cause and Scope

The setting row was an implicit label containing an InfoHint button before the checkbox. Clicking the visible switch forwarded activation to the first labelable descendant, the help button.

SettingsGenerationPanel.vue now follows the adjacent chat-alias setting pattern: a non-label row with an independent label around the checkbox and switch track. The generation cleaning implementation, persisted model and tag values are unchanged.

## Acceptance

| Requirement | Evidence |
| --- | --- |
| Visible switch enables and disables cleaning without showing help | settings-generation and settings-generation-dark Playwright scenarios click the track |
| Help opens without changing the setting | The same scenarios click InfoHint and assert checkbox state |
| Tag editor opens and closes with the setting | Conditional textarea assertions in both scenarios |
| Shared-root-cause audit | Vue AST scan of all src components; no remaining labels contain both InfoHint and an input |
| Accessible checkbox and unchanged model binding | Two tests in scripts/unit/output-cleaning-toggle.test.mjs pass |
| Responsive rendering | 350x700, 390x844, 430x900 in both modes; six cases, zero findings |
| Type and UI reuse checks | pnpm typecheck and scripts/check-ui-reuse.ps1 pass |
| Data migration, CRUD, import/export, chat switching | Not applicable; only label structure changes |
| Live user Tavern and actual AI generation | Not tested; browser tests use the isolated harness |
| Release/build publication | Not performed |

Report: tmp/ui-check/output-cleaning-toggle/index.html.

Environment note: Git is not on this session's PATH; no Git operations were performed.
