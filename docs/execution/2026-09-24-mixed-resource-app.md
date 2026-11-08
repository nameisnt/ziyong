# Mixed Resource App

## Current Baseline

- One standalone resource-bundle App; supersedes single-root export dialogs in archive/preset/worldbook pages.
- Multi-select characters, presets, worldbooks and global regex. Character rows expand to optional chats.
- Preset regex and scripts are automatic attachments, not separately selectable.
- Export-selected creates one mixed ZIP. Export-all includes every character chat and confirms counts.
- Shared regex payloads retain separate ownership records. Import uses per-character targets and retries failed items.
- Ordinary single-resource import/export remains unchanged.

## Ownership and Scope

- Tracked tree was clean at start. Existing untracked media, prototypes and execution records are unrelated and untouched.
- Scope: resource-bundle core/UI, three old entry removals, app registration/layout, tutorial, dedicated tests and CODEMAP.
- Reference implementations: extension-transfer list/footer, BulkSelectionCheckbox, existing ZIP/host importer and modal lifecycle.
- No real data writes, dependency changes, release metadata edits, formal dist build or Git publication in this task.

## Acceptance

| Requirement | Implementation | Evidence |
| --- | --- | --- |
| Standalone App and multi-select | apps/resource-bundle, appLayout | 12 isolated browser scenarios passed |
| Character chat selection and all-export | ResourceBundleApp, exportSelection | Unit tests and ZIP readback passed; selected=1 chat, all=6 chats |
| Automatic preset attachments | host, exportSelection | Unit tests passed |
| Mixed ZIP and regex payload sharing | model, zip | Three associations shared one regex payload; browser ZIP readback passed |
| Separate chat import ownership and retry | importQueue, ResourceBundleDialog | Two cards each received six chats; failed worldbook retry did not duplicate cards/chats |
| Existing ordinary operations retained | Three App entry-only removals | Diff inspection |
| Create/edit/delete resources in this App | Not applicable | Transfer-only App; native resource editors retained |
| Chat scope switching | Not applicable | Global host resource catalog; does not change active chat |
| Real host multi-resource round trip | Actual SillyTavern with temporary current build | Passed in user-authorized live follow-up below |

Initial tests used isolated fixtures. The separately authorized actual-host follow-up is recorded below.

## Final Verification

- `pnpm verify:static`: passed, 785 unit tests, typecheck, lint baseline, contract checks, style guard and strict UI reuse.
- `pnpm build:check`: passed, output only in tmp/build-check; existing large-chunk warnings remain.
- Browser: export/import, light/dark, 350x700 / 390x844 / 430x900. All 12 passed, zero findings.
- Browser interactions include search/reset, catalog refresh, chat selection, export-all cancellation retaining choices,
  corrupt ZIP error followed by valid file selection, per-card target selection, import failure and retry.
- Screenshots inspected for export-dark 430x900 and import-light 390x844, plus first-pass 350x700 views.
- Evidence: tmp/ui-check/mixed-bundles-final/index.html and report.json;
  tmp/mixed-bundles-static.log, tmp/mixed-bundles-ui.log, tmp/mixed-bundles-build.log.
- Ordinary single-resource entry points were retained. Previous combination entry component has no remaining references.
- Release notes, formal dist, real user data and Git remotes were not changed.

## Actual-host Follow-up

User explicitly requested real testing. Loaded tmp/build-check through a localhost asset server without replacing installed dist.
All host reads/writes below used actual SillyTavern APIs, except the explicitly simulated single transport interruption.

| Test | Result |
| --- | --- |
| Mixed selected export | Two cards with one selected chat each, two presets with automatic attachments, one worldbook and one global regex. ZIP 129,705 bytes; twelve association records; three regex associations shared one payload. Unselected chats and second worldbook excluded. |
| Mixed import into plugin presets | Character chats retained their own parent, messages, metadata variables and swipes. Preset prompts/order/groups/regex/script content retained; imported scripts disabled. Global regex imported disabled. Worldbook content read back from host. |
| Failure and retry | Injected one one-shot TypeError before the worldbook transport request; no fabricated host response. Other resources used real APIs and succeeded. Retry issued exactly one worldbook import, no duplicate card/chat import. Final success 12, failure 0. |
| Native preset target | Imported two selected presets into native storage; /api/settings/get readback confirmed prompts, order, groups, regex and disabled scripts. Current active preset unchanged. |
| Existing character targets | Same-name chats skipped without import writes; explicit copy created numbered chat files under each separately selected test card, retaining correct content. |
| Export all | Real catalog contained 85 roots: 15 cards, 22 presets, 35 worldbooks, 13 global regex. ZIP 9,719,801 bytes, 424 total records with attachments, 44 chats. Every chat payload compared byte-for-byte against a fresh actual host export: all equal. Search filter did not limit export-all. Full package stayed in local browser memory, not Downloads. |
| Cleanup and restoration | Deleted only recorded test IDs: four cards and their chats, three native presets, three plugin presets, three worldbooks, two global regex. After reload, original card/preset/worldbook/regex catalogs matched baseline; current chat and active preset unchanged; pending test preset files zero. |
| Runtime cleanup | Restored browser fetch/download hooks, reloaded original installed plugin, closed temporary server and removed temporary sessionStorage records. No temporary assets loaded after reload. |

Evidence: tmp/mixed-bundles-live-results.json. No business code fixes were needed during this follow-up.
No release-note changes, formal dist build, commit or push performed.
