# UI Theme Bundle Acceptance

## Scope

- Add saved native Tavern UI theme JSON to the existing resource bundle app.
- Reuse the serial import queue, selection controls, conflict choices and confirmation dialog.
- Keep current appearance unchanged; ask the user to refresh Tavern after import.
- External files are not collected. Theme JSON fields, including custom CSS, are preserved.
- No chat changes, icon integration, release notes, production dist updates or Git publishing in this batch.

## Verification

| Requirement | Implementation | Evidence |
| --- | --- | --- |
| List saved themes, select individually/all | host.ts, ResourceBundleApp.vue | Catalog unit test; export UI scenarios |
| Export selected/all in mixed ZIP | model.ts, host.ts, existing exportSelection.ts | ZIP export UI checks include theme payload |
| Export single native JSON | zip.ts, ResourceBundleApp.vue | Actual icon-button event and downloaded JSON checked in isolated browser |
| Import native JSON or bundle | zip.ts, ResourceBundleDialog.vue | Unit tests and native JSON/mixed ZIP UI scenarios |
| Sequential import, skip/copy/replace | Existing importQueue.ts, host.ts | Queue regression tests; theme conflict unit test |
| Verify persisted theme; retry read-back without duplicate writes | ImportRow.themeWrite, host.ts | Failed read-back, failed save, copy and replacement unit cases |
| External CSS warning, no automatic activation | ResourceBundleDialog.vue, host.ts | Confirmation checks and refresh notice in UI scenarios; no theme-apply API call |
| Close, reopen, disabled/loading states, scroll | Existing shared dialog and controls | UI scenarios at 350x700, 390x844, 430x900, light/dark |
| Create/edit/delete native themes | Not applicable | Native Tavern remains the theme editor; only import/export is added |
| Chat scope switch | Not applicable | UI themes are global host resources |
| Android TT live persistence and refresh | Not verified | No Android live test performed |

Commands completed:

- `pnpm verify:static`: passed; 788 unit tests, existing lint baseline, contracts and UI reuse checks.
- `pnpm build:check`: passed; temporary output only.
- `pnpm ui:check -- --no-baseline --scenarios=resource-bundle-export,resource-bundle-export-dark,resource-bundle-import,resource-bundle-import-dark --sizes=350x700,390x844,430x900 --out=tmp/ui-check/resource-bundle-themes`: 12 scenarios, zero findings.

UI report: `tmp/ui-check/resource-bundle-themes/index.html`.
Tests use isolated host responses and do not modify real user themes.

## Native Browser Verification

2026-09-26: verified against the open native SillyTavern at `http://127.0.0.1:8000/`, using the temporary production build.

- Imported a temporary theme through the production import function; read-back passed.
- Same-name skip made no new theme; copy created a numbered theme; replacement changed only the temporary theme.
- Clicked the actual native-JSON export and selected-bundle export buttons. Captured download blobs and verified the theme name and CSS in both formats.
- Refreshed Tavern and confirmed the imported themes appeared in the native UI theme selector.
- Opened the plugin import dialog, supplied native theme JSON through its file input, confirmed import, and verified persisted content and success feedback.
- Refreshed again and confirmed the UI-imported theme appeared in the native selector.
- Deleted exactly the three recorded temporary themes, verified all six original theme objects were unchanged, and refreshed again to confirm the original selector count and active theme.
- Stopped the temporary asset server and removed test session storage. The page now uses its original installed plugin.

No existing theme was overwritten or activated. No real chat was modified. Android TT remains unverified. Browser testing covered ZIP export, not ZIP import; mixed ZIP import remains covered by isolated Playwright tests above.
