# Tavern Chat Aliases

## Baseline and Ownership

- Base: 3991835. Tracked worktree clean; existing untracked docs, prototypes, asset scripts and references belong to previous tasks and remain untouched.
- User approved: reuse plugin char/user aliases in current Tavern chat; settings toggle defaults off per chat. Scope now includes display and other macro consumers, superseding generation-only isolation.
- One batch: generationAliases store, dedicated Tavern macro provider, lifecycle installation, settings/tutorial, targeted unit and visual tests. No commits, push, dist publication or changes to source Tavern files.
- Use the public new-macro-engine envBuilder provider. No legacy fallback, built-in macro overwrite, global name mutation, source prompt rewrite or final-name string replacement.
- Optional applyToTavern boolean defaults false through existing chat-scoped schema. Existing settings and backup envelope retained. An unavailable host capability is shown explicitly; never turn on the experimental engine automatically.
- The provider changes only char/user names. Blank values retain native values; explicit different per-call identities remain untouched. A different/stale chat scope must not use the previous scope's aliases.
- Provider has no removal API: install once for the store lifetime, release its reader on dispose. Do not register on every toggle or poll.
- Real tests authorized by user: use current chat/API with a temporary extension prompt. Run ordinary generation in dry-run mode, then one actual native quiet request so no user/assistant floor is added. Back up affected state first and restore owned test state afterwards. No source chat deletion.

## Acceptance

| Requirement | Implementation | Evidence |
| --- | --- | --- |
| Default off, per-chat save/restore/reset | `src/store/generationAliases.ts`, existing chat-scoped envelope | Visual scenarios exercise default, UI toggle, persistence, rehydration, A/B switch and return |
| Four spellings, names with special characters, blank values | `src/util/tavernChatAliases.ts`, native macro environment | 5 new helper unit tests; real native parser and captured prompts resolve all four spellings |
| Native names, source presets, ordinary fixed text unchanged | Provider changes only `env.names.char/user` | Native parsing restored after disable; fixed text and explicitly supplied other identities preserved; original saved preset unchanged |
| Current/stale scope, explicit other identity, provider disposal | Store scope guard, provider reader cleanup | Unit + visual scenarios; exactly one provider across repeated UI toggles |
| Settings UI + unsupported status, day/night three sizes | `SettingsGenerationPanel.vue`, shared toggle/InfoHint | 9/9 cases at 350x700, 390x844, 430x900; light/dark + unsupported engine; screenshot inspection |
| Real ordinary generation and disable | Native `Generate('normal', {}, true)` | Captured prompt assembly with toggle on/off; aliases/native names match. Actual ordinary send was not performed |
| Real API request | Native `Generate('quiet', ...)`, existing API | HTTP 200, completed response, aliases captured in final settings/payload; no chat floors changed |
| Chat scope switching | Actual store + visual host fixture | A/B isolation and stale-state guard pass; no real cross-chat AI request performed |
| Real owned state restoration | Original alias scope restored, provider disposed, test extension prompt removed | Native parsing restored; no test aliases in settings; normal installed bundle reloaded; original chat reopened and byte-equivalent chat array verified |
| Import/export, delete | Existing settings backup envelope; no standalone alias entity | Rehydration and backup contract checks pass. New standalone CRUD not applicable; real destructive restore/import not performed |
| Publishing | Not applicable | Not requested |

## Verification Evidence

- `pnpm verify:static`: passed, 649/649 unit tests, typecheck and contract/style/UI-reuse checks passed. Existing three lint warnings remain at baseline.
- `pnpm build:check`: passed; existing chunk-size warning only. Root dist untouched.
- `pnpm ui:check -- --no-baseline --scenarios=settings-tavern-aliases,settings-tavern-aliases-dark,settings-tavern-aliases-unsupported --sizes=350x700,390x844,430x900 --out=tmp/ui-check/tavern-aliases`: final-code rerun passed 9/9.
- Logs: `tmp/tavern-alias-static.log`, `tmp/tavern-alias-build.log`, `tmp/tavern-alias-ui.log`; visual report: `tmp/ui-check/tavern-aliases/index.html`; redacted real-test results: `tmp/tavern-alias-real-test.json`.
- Local original-state backup: `tmp/tavern-alias-before-20260908.json` (private, not for publication).
- During the real session, unrelated live preset state, two chat variables and other-chat preset-binding fields differed from the initial snapshot. Their origin is not established; user was asked about another active Tavern tab. These values were not overwritten. The saved source preset and original chat array were unchanged. Do not claim the entire host state was byte-for-byte restored.
- Temporary read-only test server stopped. No tracked files outside this batch were reverted; no commit or push.

Status: implementation and scoped verification complete; unrelated live-state changes retained pending clarification.
