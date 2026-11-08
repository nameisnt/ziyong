# Resource bundles / 2026-09-24

## Scope and ownership

Baseline: preset + selected regex/scripts; character PNG + optional selected JSONL chats;
worldbook + selected global regex. ZIP export and previewed import, serial writes,
explicit conflicts and retry of failed items. Existing plain exports remain.
Extension installs become serial; HTTP 409 alone must not prove an installed extension.

Existing dirty dist files, untracked historical docs/media/tools are user-owned and excluded.
Reference UI: CatalogGroupDialog, ItemTransferImportModal, BulkSelectionCheckbox.
Reference host flows: preset-manager/api, script-manager/api, archive catalog, native import endpoints.
No release or git push is requested. The subsequent user request authorized live testing;
native writes were confined to BUNDLE-LIVE-0924 fixtures and cleaned afterward.

## Acceptance

- ZIP selection, preview, dependency validation, conflict modes and retry: implemented in resource-bundle;
  ZIP round-trip and dependency/retry unit cases pass. Browser preset/worldbook export downloads are read back.
- Non-current preset attachments and grouping round trip: host fixture reads the explicitly named preset;
  model round-trip preserves prompt_order, grouping and helper data. Original script state is retained in ZIP,
  selected preset scripts are disabled on import.
- Character/chats identity and metadata handling: host fixtures cover explicit existing target, returned new
  avatar identity, same-name skip/copy, restoring chat names and clearing foreign branch inheritance stamps.
  Chat metadata's missing worldbook is reported and unbound; plugin private app data is not exported.
- Worldbook/global regex: raw worldbook payload preserved; global regexes opt-in on export, default disabled
  on import, regenerated rule IDs, confirmed settings save and memory rollback on failed save.
- Serial extension install and honest conflict errors: installQueue + api, tested one active install and
  HTTP 409 same-repository verification. Conflicts retain the host response and remain selected for retry.
- Type checks, meaningful unit tests, production check build: passed; final full suite 778/778.
- UI 350x700 / 390x844 / 430x900, light/dark: 36 isolated scenarios passed, report
  tmp/ui-check/resource-bundles/index.html. New scenarios use --no-baseline; no existing baseline was relaxed.
- Worldbook cache: tests verify failed server writes retain the old cache and successful writes update it;
  two additional isolated browser scenarios passed with the native world-info module mapping.
- Live host mutation: verified on SillyTavern 1.17.0 using the current browser and temporary local build assets.
  Native API responses were not mocked; the installed dist directory was not replaced.
- Package deletion/edit: not applicable; selected resources are read/exported/imported.

## Live acceptance / 2026-09-24

| Item | Implementation | Evidence |
| --- | --- | --- |
| Preset ZIP export/import | resource-bundle/host.ts, zip.ts | Native and plugin targets saved; native settings readback confirmed persistence. Current native preset unchanged. Regex/scripts and valid contiguous single-select group retained. |
| Worldbook and selected regex | resource-bundle/host.ts | Worldbook API and settings API readback confirmed content and disabled imported regex; exported ZIP contained only the selected test regex. |
| Character and optional chats | resource-bundle/host.ts | New PNG card imported with two messages, swipes and variables. Export ZIP contained exactly one selected chat, excluding the unselected chat. |
| Existing character conflict | ResourceBundleDialog.vue, importQueue.ts | Same-name chat skipped; copy created Chat 2.jsonl under the selected character. |
| Failed-item retry | importQueue.ts | Initial host failure retained successful character; retry imported only the chat without duplicating the character. |
| New-character first import fix | resource-bundle/host.ts | Native /chats/import requires an existing chat directory. Added native /chats/get initialization; a second fresh card then imported its chat successfully on the first attempt. Boolean host errors now have readable text. |
| Serial extension conflicts | extension-transfer/api.ts, installQueue.ts | Two real installed-repository requests returned 409, were verified and skipped; measured maximum active install requests was 1. Fresh extension installation was not tested. |
| Cleanup | Native APIs and exact fixture backup key | Removed 3 test cards/chats, native and private test presets, worldbook, global regex and one auto-created floor backup. Original character/worldbook lists and selected preset restored; checked again after reload. |

Detailed evidence: tmp/resource-bundle-live-results.json. Original installed runtime restored and temporary server stopped.
Full-suite validation also found the release-updates test loader lacked the new installQueue dependency;
the loader now imports the actual transpiled module, and both previously unexecuted update checks pass.
No formal dist build, release-note update, commit or push performed.

## Large bundle and first installation follow-up

User explicitly requested these two remaining live checks. No business code changed in this follow-up.

| Item | Real browser evidence | Result |
| --- | --- | --- |
| Large character/chat ZIP import | Synthetic fixture: 3 chats x 6,000 messages; 81,838,845 bytes of JSONL (78.05 MiB), 57,420,433-byte ZIP (54.76 MiB). Native import and rename requests all returned 200; server catalog showed 6,000 messages in each chat. | Passed, 2.60 seconds from confirmation to success summary. |
| Large ZIP export and content comparison | Exported 57,420,507-byte ZIP through the dialog; decompressed the actual download and compared all 18,000 message bodies, roles, per-message variables, metadata and supplied swipe variants to the generated originals. | Passed, export completed in 3.41 seconds. |
| Responsiveness | Browser Long Tasks observed during real UI operations, excluding synthetic data generation and verification. Maximum stalls: preview 353 ms, import 396 ms, export 434 ms. | No crash or failed operation, but short visible pauses remain; not a claim of smooth mobile operation or unbounded package support. |
| New extension first installation | Extension-Dice absent initially. Imported the official https://github.com/SillyTavern/Extension-Dice main branch through extension migration, local scope. Install returned 200 in 1.60 seconds; commit b4047508a1191ba3b32cb20f64ebc5f7877d689b read back from the host. | Passed; success 1, skipped 0, failed 0, manual-refresh notice visible. |
| Post-refresh loading | Reloaded the actual Tavern page; Dice button/script loaded, function tool remained disabled. `/roll quiet=true 1d6` returned 6 without adding a chat message. | Passed. |
| Cleanup | Deleted both test characters and all three large chats, uninstalled the newly installed local Dice extension, restored its previous settings presence, stopped the temporary asset server and reloaded the original installed runtime. | Exact character/extension list comparisons, current preset and Dice settings all matched the pre-test state. |

Detailed evidence: tmp/resource-bundle-large-first-install-results.json.
Measurements apply to this desktop browser and synthetic payload only; real mobile performance remains unverified.
No formal packaging, release-note update, commit or push performed.
