# Preset and Worldbook Alias Integration Test

## Scope and Ownership

- User authorized temporary macro entries in the current preset and enabled global worldbook, checking final assembled prompts.
- Existing alias implementation changes belong to the previous batch. This batch changes no business code, UI or dist files and does not commit or publish.
- Backed up current live/saved preset, selected global book, current chat/metadata and aliases in private local file `tmp/alias-source-before-20260908.json` before mutation.
- Added one identifiable temporary prompt to the live preset (`in_use`) and one constant depth-zero entry to an already-enabled global worldbook. Saved preset source was not edited.
- Ran native ordinary generation dry-run four times, capturing `GENERATE_AFTER_DATA`. No actual API request or new chat floor in this batch.

## Acceptance

| Check | Evidence | Result |
| --- | --- | --- |
| Four base spellings | Curly and angle char/user macros in both real source entries | Pass |
| Adjacency, repetition, punctuation | Independent expected-text comparison against captured blocks | Pass |
| JSON/XML embedding, uppercase, whitespace | Source payload contains resolved names in all corresponding rows | Pass |
| Literal text, escaped entities, closing tags | Unchanged as expected | Pass |
| Toggle off | Both source blocks return to native names | Pass |
| Empty char/user override | Only the filled override applies; empty value retains native identity | Pass |
| Literal dollar characters | `$&` and `$1` in alias values remain literal | Pass |
| No duplicate/missing injection | Exactly one block per source in each of four runs | Pass |
| Restoration | Live preset, saved preset, worldbook, selection, chat, metadata, alias scope and input match backup after temporary entries removed | Pass |
| Standalone CRUD/import/export | Not applicable, this batch tests existing native source injection paths | Not applicable |

- 12 rows x 2 sources x 4 states = 96 row comparisons passed.
- Detailed redacted payload samples/results: `tmp/alias-source-results-20260908.json`.
- `<char>` / `<user>` are macro spellings, not structural XML opening tags; their closing forms `</char>` / `</user>` remain literal. Use other XML tag names when a paired structural element is intended.
- No new functional defect found in the tested paths. This verifies assembled prompts, not model instruction-following behavior.
