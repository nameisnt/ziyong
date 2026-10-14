# Preset Range Selection

## Current Requirement

Keep the existing inclusive ordered-range grouping model. Replace the two boundary dropdowns with selecting the start/end entries in the preset directory. Temporarily hide the group manager, confirm or cancel back to its previous position. Preserve single/multiple activation mode and clear-range action. The earlier description of per-entry grouping was incorrect and is not part of this change.

## Scope and Ownership

- `PresetDetailPage.vue`: shared native/plugin preset entry; boundary summary, picker entry, modal/scroll restoration and back/Escape cancellation.
- `PresetRangePicker.vue`: ordered full list, inclusive highlighting, reset/cancel/confirm; reuses `PresetPromptRow` and existing `setPresetPromptGroupRange` validation.
- `PresetPromptRow.vue`: explicit range-selection mode suppresses editing, toggling, copy and drag; disabled and placeholder entries can be selected as boundaries.
- `PresetManagerApp.vue`: save result callback; only leave picker after successful persistence. Failures retain pending boundaries and use existing error feedback.
- Existing macro and transparent-background edits remain separate; no worldbook, schema, release-history, dist deployment or Git push changes in this batch.

## Acceptance

| Requirement | Evidence | Result |
| --- | --- | --- |
| Native and plugin preset paths | Four visual scenarios at 350x700, 390x844, 430x900 | 12 passed |
| First/last inclusive selection, highlight, explicit confirmation | Scenario asserts selected row count, unchanged metadata before confirm, persisted boundaries after confirm | Passed |
| Reverse selection and reset | Error shown, confirm disabled, reset then successful selection | Passed |
| Single-row range | Same row selected twice; exactly one highlighted | Passed |
| Cancel/back keeps original data | Back event closes picker and serialized preset stays identical | Passed |
| Single/multiple modes | Existing single-selection retention flow after range save | Passed |
| Full list and disabled entries | 148-row fixture, four inclusive entries including disabled entries | Passed |
| Scroll and theme | Long-list browser checks and screenshots at three mobile sizes in light/dark | 6 passed |
| Busy/failure recovery | Delayed mocked save fails; controls disabled during save, four selected rows retained, retry succeeds | Passed |
| Return to original group position | Eighteen-group modal scrolled to last group; scrollTop compared after success | Passed |
| Clear range | Stored start boundary empty after clear | Passed |
| No accidental enable/disable | All 148 enabled flags identical before/after | Passed |
| Placeholder boundary | Range-mode code accepts non-editable rows; no dedicated browser fixture | Not independently tested |
| Real Tavern persistence | Test harness uses isolated native API and file storage fixtures | Not tested on real user presets |
| CRUD/import/export | Existing grouping APIs unchanged; no new data format | Not applicable to this UI change |

## Checks and Artifacts

- TypeScript and scoped ESLint checks passed.
- 22 existing preset/group/unit contract tests passed.
- UI reuse check passed.
- `tmp/ui-check/preset-range-click/report.json`: 12 visual results.
- `scripts/preset-range-interaction-check.mjs`: six long-list/failure-recovery combinations.
- `tmp/ui-check/preset-range-interactions/350-light.png`: inspected range-picker layout; footer and highlighted boundaries visible without overlap.
- Visual build passed. Initial baseline-comparison run reported unregistered scenarios (no UI findings); final focused run uses `--no-baseline`, without changing the repository baseline.
