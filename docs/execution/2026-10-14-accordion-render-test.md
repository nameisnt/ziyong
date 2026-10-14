# Accordion rendering verification

Scope: test only; no production rendering changes, deployment or real chat writes.

Implementation: `scripts/frontend-background-check.mjs` mounts the actual
`FrontendFrame.vue` through the existing isolated Vite fixture.

Matrix: 350x700, 390x844, 430x900, 1280x900; light and dark;
HTML fragment and complete document; natural and 180px scrolling content.
Each case toggles twice. The accordion shell retains `overflow:hidden`.

| Requirement | Evidence | Result |
| --- | --- | --- |
| Natural expansion | 20 rows, content height >=960px, accordion bottom within iframe viewport | Passed |
| Limited expansion | 180px content area, accordion bottom within iframe viewport | Passed |
| Internal scrolling | Browser mouse wheel changes scrollTop | Passed |
| Bottom interaction | Last button clicked and text changes to Done | Passed |
| Collapse and reopen | Native details.open toggles twice in all 32 cases | Passed |
| Collapsed iframe height consistency | Fragment/limited case starts at 1036px and closes at 232px in all 8 viewport/theme combinations | Failed; diagnosis pending |
| Visual inspection | 350px light complete-document scrolling screenshot inspected | Passed for inspected image only |
| Native mobile touch and user's actual generated HTML | Not exercised | Unverified |
| CRUD, scope changes, imports and exports | Renderer test without persistent data | Not applicable |

Screenshots: `tmp/frontend-background/accordion-*.png`.
The initial strict run failed the collapsed-height assertion. A diagnostic run
completed all cases while logging the mismatches. The final script accumulates
these mismatches and asserts at the end so future runs cannot silently pass.
That final assertion-only revision has not been rerun.

The observed height discrepancy does not prove overflow:hidden causes the
original user's issue. Fragment visual-height estimation and initial measurement
timing need further investigation. No global overflow override was added.

## Follow-up fix

User authorized repair. `src/util/theaterFrontend.ts` now excludes descendants
hidden by closed details elements from visual height and visible-text checks.
Native details roots are not forced into the fragment flow-root layout override.
Existing compatibility repair is not triggered when text is already visible.
This preserves the accordion's own clipping and internal scrolling rules.

Verification after repair:

- Full browser matrix above passed, including the final strict height assertion:
  32 accordion cases, two toggle cycles each, no height mismatch.
- 390px dark fragment scrolling screenshot inspected: content and final action
  visible, no overlap.
- 14 related unit/contract tests passed.
- Typecheck, scoped ESLint, UI reuse check and build:check passed.
- Native mobile touch and the user's original generated page remain unverified.
- No deployment, release-note/version change or push; build output is only in
  tmp/build-check, not the published dist directory.
