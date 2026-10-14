# Character-first bundle import

## Current requirements and ownership

- Import characters before standalone worldbooks, then chats.
- Preserve the original character PNG, including its embedded worldbook.
- Refresh the host worldbook directory before deciding whether to skip a standalone worldbook.
- Existing skip/copy/replace choices remain unchanged. Do not delete or rename existing duplicate books.
- Superseded: worldbook-first import, stripping embedded books, and a new content-conflict dialog.
- This batch changes only resource-bundle/host.ts, resource-bundle/importQueue.ts and their unit/visual fixtures.
- Pre-existing preset range selection, generation macros and transparent rendering changes are outside this batch.
- No release notes, production dist deployment, commits or pushes requested.

## Evidence and scope

The locally available TT source implements character embedded-world import in
tmp/tt-canary-chat-check/src-tauri/crates/tt-application/src/services/character_service.rs.
Its resolve_available_world_name compares serialized entries and can allocate an indexed name.
This does not prove that the user's authored content differs. Importing the standalone book first
can put a differently converted representation in the way of the character import.

The fix changes ordering and refreshes updateWorldInfoList before importResource reads names.
The character payload and original host binding are not rewritten. Existing suffixed bindings and
previously created duplicates are not repaired automatically.

## Acceptance

| Requirement | Implementation / evidence | Result |
| --- | --- | --- |
| Cards before books, chats last | importQueue.ts; reordered-manifest and dependency unit tests | Passed |
| Embedded card bytes retained | host.ts still submits the original bytes; exact payload assertion | Passed |
| Host-created same-name book skipped | directory refresh fixture models server list changing before frontend list | Passed |
| Refresh failure must not write from stale names | failing refresh test verifies zero writes before retry | Passed |
| Retry does not duplicate successful resources | queue unit cases and browser scenario retry | Passed |
| Chats retain per-character ownership | multi-card fixtures and browser assertions for 12 chats | Passed |
| Import UI, buttons, retry, close/reopen | resource-bundle-import and dark, 350x700 / 390x844 / 430x900 | Passed |
| TypeScript, focused ESLint | pnpm typecheck; scoped eslint | Passed |
| Scoped unit suite | 26/26 resource-bundle tests | Passed |
| Production check build | pnpm build:check, tmp/build-check only; existing chunk size warnings | Passed |
| UI reuse | check-ui-reuse.ps1; no production UI markup or styling changes retained | Passed |
| Real Android TT import, reload and role switching | Not available in the isolated harness | Not verified |
| Delete/edit existing books, binding repair, schema migration | Outside current request | Not applicable |

Browser report: tmp/ui-check/character-first-import/index.html. Browser host endpoints are fixtures,
not the user's live Tavern. Earlier tmp/ui-check/character-worldbook results belong to the superseded
implementation and are not acceptance evidence for this change.
