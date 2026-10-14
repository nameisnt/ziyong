# Theater Transparent Background

## Scope

Make only theater HTML rendering opt into a transparent default background. Preserve authored CSS backgrounds and leave other shared frame callers unchanged. No release, deployment, data edits or changes to the pending plugin-preset macro work.

Reference: existing `FrontendFrame.vue` transparent iframe/frameless styling and its shared document builder. No new app-specific controls or theme colors.

## Acceptance

| Item | Implementation / evidence | Result |
| --- | --- | --- |
| Theater entry enabled by default | `TheaterMixedContent.vue` passes `transparent-background`; unit contract | Passed |
| Shell, html, body and content wrapper transparent | `FrontendFrame.vue`, `theaterFrontend.ts`; actual component browser computed styles | Passed |
| Authored page/card backgrounds preserved | Browser fixture with explicit body and card colors | Passed |
| Other callers retain original defaults | Optional prop defaults false; light/dark browser assertions | Passed |
| Dialog opens/closes and stays opaque; inner scrolling works | Real iframe button clicks and scroll assertions | Passed |
| Unmount/remount and overflow | Active toggle and viewport width assertions | Passed |
| Mobile and desktop, day/night | 350x700, 390x844, 430x900, 1280x900; eight browser combinations | Passed |
| Screenshot evidence | `tmp/frontend-background/`; 390-light inspected | Passed |
| Data CRUD/import/export/recovery | Styling-only change; no data operations | Not applicable |
| Live Tavern installation | Isolated component test only; published dist unchanged | Not tested |

Checks: `pnpm typecheck`; UI reuse check; frontend height, status interaction and theater mixed-scroll unit suites; `scripts/frontend-background-check.mjs`.

Test fixture uses synthetic colors/content, not real chats. Existing sanitizer behavior is unchanged; this does not add preservation of previously stripped html/body attributes.
