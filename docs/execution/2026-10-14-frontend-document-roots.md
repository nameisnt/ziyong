# Frontend document root preservation

## Baseline and scope

Preserve complete HTML documents' root attributes and direct child structure. Inject the existing
theme defaults, diagnostics, host bridge and height measurement without adding a body wrapper.
HTML fragments retain the existing wrapper and layout compatibility behavior. Existing safe/trusted/status
permissions remain unchanged. Transparent theater backgrounds remain opt-in; authored backgrounds win.

Reference implementations inspected: installed TavernHelper 4.11.3 render/iframe.ts, render/Iframe.vue,
iframe/adjust_iframe_height.js, and the supplied universal floating-ball script. Their implementations
are references, not copied wholesale. This change preserves a parsed DOM rather than original HTML bytes.

This batch edits src/util/theaterFrontend.ts, its height contract test, and the existing untracked
scripts/frontend-background-check.mjs. Earlier transparency edits in these files are retained.
Preset range, macro and bundle import changes are outside this batch. No live user data is written.

## Implementation

- Full documents are serialized from document.documentElement after existing mode-specific sanitization.
- Root id/class/style/data attributes, language/direction, head attributes, title and viewport are retained.
- Missing charset, viewport and title are supplied without replacing authored values.
- Full-document theme defaults have zero specificity; body inherits authored root text color.
- Full documents do not get pc-frame-content, flow-root markings, or forced root height/margin/padding rules.
- Height measurement uses the existing body and root bounds, accounts for margins, and preserves nested scrolling.
- Existing frame height limits, feedback detection, diagnostics and lifecycle remain active.
- Safe mode still strips authored scripts and event attributes; trusted/status click handlers remain executable.

## Acceptance

| Requirement | Evidence | Status |
| --- | --- | --- |
| Root attributes and styles | Real Vue frame assertions for id/class/data/style/lang/dir/title | Passed |
| No additional body wrapper | Direct-child grid and flex layouts checked | Passed |
| Buttons and fields | Add counter, disabled button, input fill, select change, modal open/close | Passed |
| Scrolling | Mouse wheel on internal content and dialog with scrollTop assertions | Passed |
| Transparent defaults / authored background | Existing fragment checks plus full-document computed colors | Passed |
| Dynamic height and viewport sizing | Expand action and stable 100vh checks | Passed |
| Script failure and recovery | Click throws fixture-click-error, alert appears, content remains, remount clears error | Passed |
| Three rendering modes | trusted/status/safe; status uses a fixture message context | Passed |
| Responsive day/night | 350x700, 390x844, 430x900, 1280x900; screenshots in tmp/frontend-background | Passed |
| Visual inspection | document-350-light-trusted.png; document-390-dark-trusted-dialog.png | Passed |
| Targeted tests | 13 height/status contract and runtime tests | Passed |
| Type check and scoped ESLint | pnpm typecheck; eslint theaterFrontend.ts | Passed |
| UI reuse | check-ui-reuse.ps1 | Passed |
| Build | pnpm build:check, temporary output only | Passed |
| Live Tavern deployment / Android device | Not performed | Not verified |
| Data CRUD, import/export, scope migration | Renderer-only change | Not applicable |

The browser checks use Playwright and the real FrontendFrame Vue component served through isolated Vite.
They are not a claim of testing every AI-generated page. Invalid or intentionally hidden authored HTML
is not automatically repaired in full-document mode; the original fragment compatibility path is unchanged.
