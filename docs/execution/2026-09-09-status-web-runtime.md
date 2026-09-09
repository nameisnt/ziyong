# Status Web Runtime

## Batch Contract

- User approved unrestricted loading for manually saved status HTML and completion of existing MVU/floor/event bridging. Other generated content remains unchanged.
- Base HEAD 4b42fb8. Preserve pending status-scheme-scope and release-updates batches (including their docs/tests); unrelated untracked files remain untouched.
- Reproduced evidence from the previous read-only browser inspection: the current card imports a data: JavaScript module blocked by the trusted CSP; its adapter requires ST, getCurrentMessageId and event APIs missing from the existing bridge.
- References: current MVU runtime resolver, onRuntimeEvent, existing FrontendFrame, status floor selection and shared diagnostics. No new store/schema or second variable source.
- Scope: saved MVU templates only get a dedicated status execution mode, no injected CSP/sandbox or node stripping. Existing safe/trusted generated and regex output modes remain unchanged. Browser restrictions and frame height/lifecycle handling remain.
- Pass immutable current-chat/floor context to each status frame; latest keeps its native meaning. Editor preview uses latest. Do not rewrite pasted source or intercept explicit latest reads/writes.
- Host event subscriptions made through the new bridge are owned and disposed by that frame. Frame destruction cancels its native timers; do not monkey-patch third-party timers or parent globals.
- Compatibility ST and iframe event names match the inspected card/host convention; they exist only in the status frame. No changes to user card or floating script.
- Tests use synthetic HTML with data modules and isolated host fixtures; no live data writes, real API generation, root dist build, commit or push.

## Acceptance

| Requirement | Location | Evidence |
| --- | --- | --- |
| data module and HTML preservation only for saved status | Frontend document + frame mode | Browser fixture executes a base64 data module from fenced full HTML; checks no injected CSP/sandbox and status-only node preservation |
| MVU/floor/event/ST APIs reuse host runtime | Status frame host and script | Unit checks runtime identity. Browser checks ST, getCurrentMessageId/getLastMessageId, getVariables receiver, MVU read and event delivery |
| Floor/chat changes and latest preview | Viewer/settings frame props | Actual floor selection 2 -> 0 retains latest=2; A -> B chat switch displays B:2; editor preview B:2. Close/reopen and editor cancel/reopen pass in smoke |
| Event disposal on switch/close, late init | Frame lifecycle | Unit tests verify frame ownership, disposed callback suppression and late init rejection; browser checks exactly one listener while active and zero after close/leave/cancel |
| Generated/regex content unchanged | Existing safe/trusted modes | Browser compares generated CSP/node/script policies; old MVU/regex/scroll scenarios included in regression |
| Three sizes, light/dark, scrolling and controls | Isolated visual scenarios | 33/33 pass across 350x700, 390x844, 430x900: status-web viewer/editor day/night, previous MVU/regex status day/night, scope editor day/night, theater frontend footer. Inspected dark viewer 350 and editor 390 screenshots; inner button and independent scroll assertions pass |
| Scheme create/delete/import/export | Not applicable | No store/schema changes |

## Verification

- Focused tests first failed before runtime implementation existed; runtime tests pass after implementation.
- The source contract for sandbox ternary required whitespace-tolerant matching after formatting; the semantic check remains.
- Initial static run identified a missing explicit undefined default on the optional frame context prop. Fixed declaration; no warning baseline increase.
- `pnpm typecheck`: passed.
- Smoke `status-web,status-web-editor` at 350x700: 2/2 passed.
- `pnpm build:check`: passed; only tmp/build-check changed. Existing bundle size and dependency annotation warnings remain.
- Final `pnpm verify:static`: passed, 662/662 tests; typecheck/contracts/style/UI reuse pass. Lint baseline remains 3/3; global important remains 23/23.
- `pnpm ui:check -- --no-baseline --scenarios=status-web,status-web-dark,status-web-editor,status-web-editor-dark,status-display-mvu,status-display-mvu-dark,status-display-regex,status-display-regex-dark,status-scope-editor,status-scope-editor-dark,theater-frontend-footer --sizes=350x700,390x844,430x900 --out=tmp/ui-check/status-web`: 33/33 passed.
- Final production build rerun: passed in 28.87s, tmp output only; existing warnings unchanged. `git diff --check` passed.
- Evidence: `tmp/status-web-static.log`, `tmp/status-web-build.log`, `tmp/status-web-smoke.log`, `tmp/status-web-ui.log`, `tmp/ui-check/status-web/`.
- Current browser was only queried read-only to confirm native Mvu/event availability. The user's actual card program was not executed with changed permissions in their real chat; synthetic isolated data-module fixtures verify the integration without editing their card/settings.
- No root dist rewrite, API generation, real-data mutation, commit or push.

Status: implemented and isolated verification complete.

## Release Note Follow-up

- User requested adding this fix to the unreleased 1.1.0 notes. Added one entry to `src/core/releaseInfo.ts` covering saved MVU HTML/data modules, MVU/floor/event bridging, listener cleanup and unchanged generated-page restrictions.
- Copy-only change; version, notice frequency, layout and runtime behavior unchanged. No dist update or publication.
