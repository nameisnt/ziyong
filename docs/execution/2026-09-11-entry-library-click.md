# Entry Library Click Repair

## Scope and Cause

Entry titles already route to the item editor and load content by item ID.
The row captured the pointer during pointerdown, redirecting the subsequent
click away from its nested title button. Capture now begins only when the drag
distance threshold is crossed, following useHorizontalDragScroll's existing
pattern. No schema, storage, save, delete or external write behavior changed.

## Acceptance

| Requirement | Implementation / evidence |
| --- | --- |
| Click title to see corresponding content | EntryLibraryApp.vue deferred capture; Playwright clicks first and second items and checks textarea values |
| Return to directory | Editor cancel button exercised after each open |
| Preserve ordering | Real mouse drag moves first row to last; subsequent title opens the correct item |
| Disabled entries remain viewable | Existing ordering fixture disables the group before these interactions |
| Light and dark, responsive layouts | entry-library-ordering and entry-library-ordering-dark at 350x700, 390x844, 430x900 and 1280x900 |
| Validation | Typecheck, targeted ESLint, strict UI reuse and diff whitespace check passed |
| Create, save, delete, import/export, recovery, scope switching | Not changed by this repair; not retested in this batch |
| Native touchscreen and actual host data | Not tested; browser scenarios use isolated fixtures and mouse events |

Local browser report: tmp/ui-check/entry-click-final/index.html.
No live data was modified, no installed build was replaced, and no push was made.
