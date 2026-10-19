# Type regex and reference text

## Scope and ownership

Baseline: per-match HTML fences for display replacement, theater type bindings
with explicit per-entry overrides, and text-only generation references.
No $0 compatibility, global script-policy change, live chat writes, AI requests,
release notes, deployment or Git publication. Existing unrelated untracked
documents and media remain untouched. The tracked worktree was clean on entry.

## Implementation and acceptance

| Requirement | Location | Evidence |
| --- | --- | --- |
| Fence each HTML replacement, not surrounding text; preserve native replacement tokens | util/regexDisplay.ts | content-regex unit cases, two independent browser frames |
| Existing complete fence and empty deletion unchanged; text mode unchanged | util/regexDisplay.ts | unit assertions |
| Type bindings saved and editable | store/prompts.ts, PromptTypeEditorPage.vue, TheaterApp.vue | browser type editor save, type schema preserves optional IDs |
| Generation preview uses selected rules without rewriting raw content | TheaterApp.vue | typecheck, code inspection; no real generation performed |
| Per-entry empty override and resume following type | ReaderDetailShell.vue, ContentRegexModal.vue | browser clear, reopen, follow type |
| Rules still grouped/searchable; disabled rules cannot be newly selected | existing ContentRegexModal controls | reused controls, typecheck; dedicated disabled-state click not exercised this batch |
| Missing rule feedback | ContentRegexModal.vue, ReaderDetailShell.vue | code inspection; dedicated deletion interaction unverified |
| Raw HTML reference body text; remove scripts/styles/comments/controls and explicit hidden markup | util/referenceText.ts, util/references.ts, ReferencePicker.vue | browser DOMParser assertions, empty script-only page and mixed HTML/text |
| Original theater text unchanged | existing builtin reference providers and new display layer | browser source equality assertion |
| Type create/update/import/export | existing optional schema field | create/update browser; cross-install import/export of rule IDs not exercised |
| Per-entry remove binding | ContentRegexModal.vue | explicit empty override persists; follow action removes override |
| CRUD for generated HTML or extracted reference text | Not applicable | derived display/reference data, not new persisted entities |

References do not execute scripts or load a rendered page to discover text.
Explicit hidden attributes and inline display:none / visibility:hidden are
removed. Stylesheet-only hidden selectors and script-generated text are not
evaluated. Existing historical cleared choices with no stored usage key cannot
be distinguished from never-configured choices; no migration guesses were added.

## Verification

- 807 unit tests passed (`--test-isolation=none`, Git available on PATH).
- 12 browser scenarios: selection and type-binding, day/night, 350x700,
  390x844 and 430x900. Report: tmp/ui-check/type-regex-final/report.json.
- Playwright clicked a button inside both sandboxed role frames successfully.
- Inspected 350px light role cards and 350px dark selector screenshots.
- Typecheck, UI reuse check and build:check passed. Build output only in tmp.
- User's two full character templates, live Tavern and native mobile touch
  remain unverified. Tests used isolated representative fixtures.

## Live Tavern verification

Connected Chrome page 1 at 127.0.0.1:8000, Tavern 1.19.0, no selected chat.
Installed the current tmp/build-check contents after backing up installed dist
to tmp/live-regex-before-20261019-094809. No AI request or existing work edited.

- Created temporary rule/type/two entries through real plugin stores.
- Real theater rendered separate named role frames (Mia/Kaos in Chinese) from
  the raw two-character text using global matching and $& substitution.
- Clicked both script buttons and a details summary through browser tools;
  accessibility snapshot confirmed updated button labels and expanded content.
- UI clear selection removed both frames; follow-type restored both.
- Real type editor clear/reselect/save retained the expected rule ID.
- Real reference picker returned the original role text, not replacement HTML.
- A native HTML entry yielded only two body paragraphs, with script, hidden
  data and action button excluded; script marker remained unset.
- Deleted exactly the test rule, type and two entries. Store ID lists matched
  pre-test lists, and no per-entry usage keys remained.
- Screenshot capture failed (path restriction, then delayed response); no live
  visual screenshot claim. Representative templates were tested, not the two
  original full user templates. Native touch/actual generation remain untested.
- Test build remains installed locally; no release or remote push performed.
