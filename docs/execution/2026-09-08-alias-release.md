# Current-Chat Alias Release

- User requested repository publication after unit, UI and real preset/worldbook prompt tests passed. This authorizes source and minimal-install repository updates and supersedes the earlier no-publication scope for this batch.
- Source baseline: `3991835`; install baseline: `44d1881`. Both fetched main branches match local HEAD before publication.
- Include only the current-chat alias implementation, tutorial, focused unit/visual tests, related acceptance records and the newly built dist output.
- Existing unrelated untracked documents, prototypes, image scripts, PDFs, videos and private tmp backups are excluded.
- Validation inherited from the unchanged implementation: 649 unit tests, static/contracts/style checks, 9 UI cases and 96 real preset/worldbook output comparisons passed. Rebuild production dist before release.
- Install repository retains its existing minimal layout: dist, manifest.json and i18n. Do not publish source code or test/private backups there.
- Use ordinary fast-forward pushes, then verify both remote main hashes and matching dist tree objects. Do not force-push.
