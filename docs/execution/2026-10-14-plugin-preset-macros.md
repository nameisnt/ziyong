# Plugin Preset Macro Resolution

## Scope

- Resolve native macros in plugin preset custom entries, once per entry and in order, through the host's `substituteParamsExtended` API.
- Preserve existing plugin aliases, custom macros, task variables and selected-floor MVU resolution before native evaluation.
- Leave host placeholders and ordinary Tavern generation unchanged. Do not mutate source presets.
- Shared implementation: `src/util/pluginPresetMacros.ts`; capture and direct generation integration: `src/core/generationService.ts`.
- No UI, release version, published dist or repository push changes.

## Acceptance

| Requirement | Evidence | Result |
| --- | --- | --- |
| Ordered setvar/getvar processing | New unit suite plus actual Tavern native parser | Passed |
| User/character aliases and custom macros | Unit tests and live native parser with test aliases, task input and dice | Passed |
| Random macros execute once before variable reuse | Focused unit test | Passed |
| Selected-floor MVU retained | Focused unit and generation MVU suites | Passed |
| Original preset not overwritten | Unit assertions and live current-preset comparison | Passed |
| Ordinary configuration bypass | Unit test and unchanged ordinary-generation entry | Passed |
| Capture and direct generation integration | Source integration assertions | Passed |
| Current real preset | mengshen_v78: 72 ordered items, 50 variable macro occurrences before processing, 0 after | Passed |
| Current capture UI | Temporary source-module hook at helper entry; captured 65 messages, 13893 tokens, no variable macro residue | Passed with temporary hook |
| Paid model request / generated result save | Backend request blocked during capture test; no result saved | Not tested |
| Full updated plugin installed in browser | Live installation remains unchanged; temporary hook restored | Not tested |
| Responsive UI / CRUD / import-export | No UI or data-management changes in this task | Not applicable |

Live tests restored original local/global variable references and temporary helper/fetch interception. The source preset remained unchanged. Native variable writes in production retain native semantics; test isolation is not a production rollback mechanism.

## Automated Checks

- `pnpm typecheck`: passed.
- `node --test --test-isolation=none scripts/unit/plugin-preset-macros.test.mjs scripts/unit/plugin-preset.test.mjs scripts/unit/plugin-macros.test.mjs scripts/unit/generation-mvu.test.mjs`: 28 passed.
- `pnpm build:check`: passed, existing large-chunk warning retained; output only under `tmp/build-check`.

Native preprocessing covers custom preset entries; built-in host placeholders remain host-owned. This change does not implement a separate native macro engine.

## Follow-up: Installed Build on Tavern 1.19.0

The earlier temporary-hook limitation was superseded by this test. Built current source with `pnpm build:check` and deployed the complete output to the local `ziyong-dist/dist` installation. Previous installed files are backed up at `F:\SillyTavern-update-backup-20261014-201824\plugin-before-macro-test`. Repository dist, version and remotes were not updated. The local test build also includes the separately approved theater transparent-background change.

Browser page 3 used Tavern 1.19.0 release `06bde939f`, the existing current chat and plugin preset `mengshen_v78` through the actual theater generation UI. Request instrumentation observed payload summaries without changing requests or macro parsing.

| Test | Evidence | Result |
| --- | --- | --- |
| Plugin preset + configured external API | Actual 14-message request, HTTP 200, zero set/get/addvar and alias residues; XML parsed preview containing test marker | Passed |
| Plugin preset + Tavern current API: macro expansion | Actual 14-message request, HTTP 200; user/char resolved, custom dice = 7, setvar/addvar/getvar count = 2, zero variable/custom macro residue | Passed at request boundary |
| Tavern current API: completed generation | Output cleanup throws `Cannot read properties of undefined (reading 'includes')` | Failed |
| Failure localization | Six active-preset regex records use `script_name/source/destination` and lack `placement`; native regex engine line 374 calls `script.placement.includes(placement)` | Confirmed |
| Minimal reproduction without model request | Native `cleanUpMessage` invoked with either positional or new object arguments reproduces same regex-engine stack | Confirmed; not a macro parser failure |
| Original preset and chat | Plugin preset serialization unchanged; chat remains two messages; theater saved entries remain zero | Passed |
| Cleanup | Restored fetch instrumentation, removed test-specific local variables and saved metadata; restored external page connection and cleared temporary requirements | Passed |

One successful preview remains an unsaved draft; no theater entry or chat message was saved. Native preset regex records were not edited. Follow-up repair requires agreeing how to convert the incompatible regex records; this test does not claim Tavern-current-API generation is fully working.
