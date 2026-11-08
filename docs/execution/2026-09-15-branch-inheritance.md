# Branch Configuration Inheritance

## Current Contract

Only new native/plugin chat branches inherit preset bindings, worldbook switch profiles, world slots, generation aliases and status-display schemes/selections. Workbench, relationship, timekeeper, generated records and tasks are excluded. Copies are independent; preset/worldbook resources remain shared. Slot IDs must be new and worldEntryId must be null until actual synchronization assigns it.

Existing uncommitted macro/audit work belongs to earlier tasks and is preserved. This batch owns the inheritance service, scoped-copy helper, five domain hooks, reader branch integration and focused tests. No publication or Git push. Live branch creation and verification were explicitly requested; retain test branches and restore source chat after tests.

## Implementation Reference

Use existing preset-link inheritBinding, worldbook-link inheritProfiles, chatScoped persistence and status schemeScope selection rules. A chat metadata origin stamp distinguishes newly copied branches from old unstamped chats without intercepting native requests. Run inheritance before existing CHAT_CHANGED listeners, then let existing scope application handle native writes. Failure must remain visible and retryable; do not copy again after completion.

## Acceptance

- Passed live: native branch creation and Reader detail menu creation. Final native Branch #9 and plugin Branch #10; five configurations present in Branch #10 after reload.
- Passed live: source/child alias and slot content isolation, repeated switches, old unstamped Branch #2 remains empty. Ordinary new chat exclusion is unit-tested, not separately created in the live test.
- Passed live: fresh slot identities, worldEntryId reset then assigned by sync; two repeated synchronizations leave one entry. New entry allocation does not reuse IDs removed in the same write.
- Passed live: source chat restored with original aliases, original slot ID, one worldbook entry and no added preset binding. Excluded domain hooks are absent and unit-tested; no excluded data was seeded live.
- No new visual controls; use existing notification/retry actions.

## Findings Resolved During Live Testing

1. Reader-origin branch creation could copy settings while phone/world-slot scope still displayed the parent. The unified service now applies current scope after inheritance persistence.
2. Debounced settings writes alone did not survive the test reload. The service now waits for native saveSettings and SETTINGS_UPDATED acknowledgement before recording completion in chat metadata. A failed save remains retryable and cannot produce a success notice. global.d.ts declares the verified native export.

## Final Evidence

- Unit suite: 760 passed, 0 failed, tmp/branch-unit-final.log. Includes origin matching, five-domain-only copying, partial-failure resume, no repeated copying and failed native-save acknowledgement.
- Typecheck and build: passed. Build output is tmp/build-check; repository dist unchanged.
- Strict UI reuse: passed. No new layout/CSS; live Reader menu button exercised. No new three-size screenshot sweep in this batch.
- ESLint: touched service/domain files passed; ReaderApp retains its pre-existing native-module import warning.
- Real tests created Branch #3 through #10; intermediate test branches are retained, final persisted verification is Branch #10. The test worldbook is retained but removed from enabled global books. Source chat and global book selection restored.
- Original local installation files restored from tmp/branch-live-original-dist and browser reloaded. No commit or push; installed version remains 1.2.4. New inheritance implementation is in source only until publication.
