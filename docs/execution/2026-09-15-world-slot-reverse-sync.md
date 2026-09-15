# World Slot Reverse Synchronization

This supersedes the one-way-only scope in 2026-09-15-world-slot-entry-id.md.

## Implementation

The store reads only bound slot IDs from the fixed worldbook. WORLDINFO_UPDATED
events and App entry trigger a queued read; sync also reads before writing.
Read-back applies supported slot fields without scheduling another write.
Own save events are ignored by object identity. The queue serializes reads and
writes. Ownership checks reject the previous chat's marked entries.

Unsynced local edits retain their pre-edit fields in memory. If the external
fields also differ, the directory displays two explicit actions using existing
form controls. Neither side is overwritten until a choice is made. This is
runtime state, not a persistent conflict history across browser restarts.

## Acceptance

| Item | Evidence |
| --- | --- |
| Native editor read-back | Actual browser filled the native content textarea; slot received test-native-editor-reverse |
| Plugin worldbook-link read-back | Actual editor Save button; slot received test-plugin-link-reverse after the save event |
| Re-entry and sync | Same content in slot and worldbook; exactly one entry remained |
| Marker removal | Helper save removed custom marker; bound UID 0 remained matched |
| Conflict preserves both copies | Injected write failure in browser; external native save left local content intact and displayed both actions |
| Adopt worldbook | Clicked actual button; external content adopted, conflict and error cleared |
| Keep slot | Clicked actual button; local content written to native worldbook, no duplicate |
| Cleanup | Temporary slot and entry deleted; worldbook JSON equals pre-test content; API override removed |
| Unit verification | 16 actual sync-function / lifecycle tests passed |
| Other checks | Typecheck, targeted ESLint, strict UI reuse and build passed |
| Responsive layout | Root and conflict scenarios, 350x700 / 390x844 / 430x900, light and dark passed |
| Actual chat switching | Not tested: host remained on the no-chat scope; ownership isolation covered by unit tests only |
| Import/export and recovery | Unchanged, not retested |

The browser used an actual local SillyTavern and a temporary slot in the empty
no-chat scope. Failure was deliberately injected, not an actual network outage.
Private backups are in tmp/world-slot-live-before-20260915 and are not published.
Local installed plugin contains the test build; no commit or push was performed.
