# TT Chat Import Regression

## Scope

- Report: all combination-package chats fail to import on TauriTavern Android.
- Tracked worktree was clean before this fix. Existing untracked references and execution records are unrelated.
- Fix only the incomplete directory-initialization request in resource-bundle/host.ts and its regression test.
- No UI, data schema, release metadata, formal dist, or remote changes.

## Cause and Fix

TT v2.2.0 chat-routes.js rejects /api/chats/get without a file name with HTTP 400
`Invalid chat payload request`. The old plugin sent only avatar_url, preventing the later import request.
Use the already planned, unique destination stem as file_name with allow_not_found=true.
Both hosts use the same request; no host-specific fallback is introduced.

## Verification

| Requirement | Evidence |
| --- | --- |
| Original release browser reproduction | 1.2.8 native host direct Chinese import succeeded; UI new-card plus three chats succeeded 4/4; existing-card import succeeded 3/3. Native host alone cannot reproduce the TT rejection. |
| TT request validation | tmp/check-tt-chat-contract.mjs executes actual local TT v2.2.0 route source with isolated storage dependency: old request 400, corrected request 200. This is not an Android device test. |
| Fixed native-host import | Temporary compiled fixed host imported three Chinese-named chats; same-name skip and numbered copy both worked. All four saved message payloads matched original export on readback. |
| Automated checks | 21 resource-bundle unit tests passed; typecheck, build:check, diff --check passed. |
| Data cleanup | Deleted only recorded temporary cards and their test chats. Original character catalog restored. Browser reloaded without temporary assets; local test servers stopped. |
| UI and independent resource CRUD | Not applicable; no UI changes or resource-editor changes. |
| Actual user's TT Android installation | Not verified; desktop browser is native SillyTavern. |

Earlier desktop test fixtures were also cleaned before the corrected-build tests. No user chat was overwritten.
