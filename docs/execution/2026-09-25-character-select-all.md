# Character Select-All

## Scope

- Character category select-all includes chats of collapsed/unloaded cards.
- Category deselection clears cached child selections without reading directories.
- Individual card checkbox semantics and search-filter scope remain unchanged.
- Previous uncommitted TT chat import fix and unrelated untracked files are preserved.
- Reuse existing planExport, selectChats, busy/progress/error controls and global buttons. No CSS changes.

## Acceptance

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Select unloaded chats | ResourceBundleApp selectGroup | Export ZIP contained all six chats of two cards, including collapsed second card. |
| Clear child selections | selectGroup plus selectChats | After category deselection and selecting one child, ZIP contained exactly one chat. |
| Failure and retry | Existing error/busy handling | Missing character produced error, controls unlocked, retry after restoring fixture succeeded. |
| Other groups and export-all | Existing category scope/exportFile | Preset attachments and regex association checks retained; cancelling export-all preserved manual selection. |
| Mobile and themes | Existing UI components | Six browser scenarios at 350x700, 390x844, 430x900 in light/dark; zero findings. Screenshots inspected. |
| Create/edit/delete/import resources | Not applicable | Selection-only change. Existing import flow unchanged. |
| Real user data writes | Not applicable | Isolated browser fixtures; no real exports/imports or deletions. |

Evidence: tmp/ui-check/character-select-all/index.html and report.json.
Typecheck, UI reuse check and diff --check passed. Targeted visual scenarios run with
--no-baseline because these scenario names have no registered visual baseline; no baseline files changed.
No release metadata, formal dist, commit or push in this task.
